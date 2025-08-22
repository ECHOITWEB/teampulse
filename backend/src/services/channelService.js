const admin = require('firebase-admin');
const redisCache = require('../config/redis');

class ChannelService {
  constructor() {
    // In-memory cache for frequently accessed channels
    this.channelCache = new Map();
    
    // Initialize Redis
    this.initializeRedis();
  }
  
  async initializeRedis() {
    try {
      await redisCache.connect();
      console.log('✅ Redis connected for Channel Service');
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
    }
  }
  
  // Get channel with caching
  async getChannel(channelId) {
    // Check memory cache
    if (this.channelCache.has(channelId)) {
      return this.channelCache.get(channelId);
    }
    
    // Check Redis cache
    const cacheKey = `channel:${channelId}`;
    if (redisCache.isConnected) {
      const cached = await redisCache.getAsync(cacheKey);
      if (cached) {
        const channel = JSON.parse(cached);
        this.channelCache.set(channelId, channel);
        return channel;
      }
    }
    
    // Query Firestore
    const db = admin.firestore();
    const doc = await db.collection('channels').doc(channelId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    const channel = { id: doc.id, ...doc.data() };
    
    // Update caches
    this.channelCache.set(channelId, channel);
    if (redisCache.isConnected) {
      await redisCache.setAsync(cacheKey, JSON.stringify(channel));
      await redisCache.expireAsync(cacheKey, 3600); // 1 hour TTL
    }
    
    return channel;
  }
  
  // Get channel messages with pagination and caching
  async getChannelMessages(channelId, limit = 50, startAfter = null) {
    const cacheKey = `channel:${channelId}:messages:${limit}:${startAfter || 'latest'}`;
    
    // Check Redis cache for recent messages
    if (!startAfter && redisCache.isConnected) {
      const cached = await redisCache.getCachedChannelMessages(channelId);
      if (cached && cached.length >= limit) {
        return cached.slice(0, limit);
      }
    }
    
    // Query Firestore
    const db = admin.firestore();
    let query = db.collection('messages')
      .where('channelId', '==', channelId)
      .orderBy('timestamp', 'desc')
      .limit(limit);
    
    if (startAfter) {
      query = query.startAfter(startAfter);
    }
    
    const snapshot = await query.get();
    
    const messages = [];
    snapshot.forEach(doc => {
      messages.push({ id: doc.id, ...doc.data() });
    });
    
    // Cache recent messages
    if (!startAfter && redisCache.isConnected) {
      await redisCache.cacheChannelMessages(channelId, messages, 300); // 5 minutes TTL
    }
    
    return messages;
  }
  
  // Send message to channel
  async sendMessage(channelId, messageData) {
    const db = admin.firestore();
    
    // Add message to Firestore
    const messageRef = await db.collection('messages').add({
      ...messageData,
      channelId,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Update channel last activity
    await db.collection('channels').doc(channelId).update({
      lastActivity: admin.firestore.FieldValue.serverTimestamp(),
      lastMessage: messageData.content?.substring(0, 100) || ''
    });
    
    // Invalidate message cache
    if (redisCache.isConnected) {
      await redisCache.invalidateCache(`channel:${channelId}:messages*`);
    }
    
    return messageRef.id;
  }
  
  // Get channel members with details
  async getChannelMembers(channelId) {
    const channel = await this.getChannel(channelId);
    if (!channel) {
      return [];
    }
    
    const cacheKey = `channel:${channelId}:members:details`;
    
    // Check Redis cache
    if (redisCache.isConnected) {
      const cached = await redisCache.getAsync(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }
    
    // For public channels, get workspace members
    if (channel.type === 'public') {
      const workspaceService = require('./workspaceService');
      const members = await workspaceService.getWorkspaceMembers(channel.workspaceId);
      
      // Cache the result
      if (redisCache.isConnected) {
        await redisCache.setAsync(cacheKey, JSON.stringify(members));
        await redisCache.expireAsync(cacheKey, 1800); // 30 minutes TTL
      }
      
      return members;
    }
    
    // For private/secret channels, get specific members
    if (!channel.members || channel.members.length === 0) {
      return [];
    }
    
    const db = admin.firestore();
    const members = [];
    
    // Batch get member details
    const memberPromises = channel.members.map(async (userId) => {
      // Try to get from Redis first
      if (redisCache.isConnected) {
        const cachedUser = await redisCache.getCachedUser(userId);
        if (cachedUser) {
          return cachedUser;
        }
      }
      
      // Get from Firestore
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = { id: userDoc.id, ...userDoc.data() };
        
        // Cache user data
        if (redisCache.isConnected) {
          await redisCache.cacheUser(userId, userData, 3600);
        }
        
        return userData;
      }
      return null;
    });
    
    const memberData = await Promise.all(memberPromises);
    const validMembers = memberData.filter(m => m !== null);
    
    // Cache the result
    if (redisCache.isConnected) {
      await redisCache.setAsync(cacheKey, JSON.stringify(validMembers));
      await redisCache.expireAsync(cacheKey, 1800); // 30 minutes TTL
    }
    
    return validMembers;
  }
  
  // Update channel with cache invalidation
  async updateChannel(channelId, updates) {
    const db = admin.firestore();
    await db.collection('channels').doc(channelId).update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Invalidate caches
    this.channelCache.delete(channelId);
    if (redisCache.isConnected) {
      await redisCache.delAsync(`channel:${channelId}`);
      await redisCache.invalidateCache(`channel:${channelId}:*`);
    }
  }
  
  // Add member to channel
  async addMember(channelId, userId) {
    const db = admin.firestore();
    await db.collection('channels').doc(channelId).update({
      members: admin.firestore.FieldValue.arrayUnion(userId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Invalidate caches
    this.channelCache.delete(channelId);
    if (redisCache.isConnected) {
      await redisCache.delAsync(`channel:${channelId}`);
      await redisCache.delAsync(`channel:${channelId}:members:details`);
    }
  }
  
  // Remove member from channel
  async removeMember(channelId, userId) {
    const db = admin.firestore();
    await db.collection('channels').doc(channelId).update({
      members: admin.firestore.FieldValue.arrayRemove(userId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Invalidate caches
    this.channelCache.delete(channelId);
    if (redisCache.isConnected) {
      await redisCache.delAsync(`channel:${channelId}`);
      await redisCache.delAsync(`channel:${channelId}:members:details`);
    }
  }
  
  // Mark channel as read for user
  async markAsRead(channelId, userId) {
    const db = admin.firestore();
    const readStatusRef = db.collection('readStatus').doc(`${userId}_${channelId}`);
    
    await readStatusRef.set({
      userId,
      channelId,
      lastRead: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    // Update cache
    if (redisCache.isConnected) {
      const cacheKey = `user:${userId}:channel:${channelId}:lastRead`;
      await redisCache.setAsync(cacheKey, new Date().toISOString());
      await redisCache.expireAsync(cacheKey, 86400); // 1 day TTL
    }
  }
  
  // Get unread count for user in channel
  async getUnreadCount(channelId, userId) {
    const cacheKey = `user:${userId}:channel:${channelId}:unread`;
    
    // Check Redis cache
    if (redisCache.isConnected) {
      const cached = await redisCache.getAsync(cacheKey);
      if (cached !== null) {
        return parseInt(cached);
      }
    }
    
    const db = admin.firestore();
    
    // Get last read timestamp
    const readStatusDoc = await db.collection('readStatus')
      .doc(`${userId}_${channelId}`)
      .get();
    
    const lastRead = readStatusDoc.exists 
      ? readStatusDoc.data().lastRead?.toDate() 
      : new Date(0);
    
    // Count unread messages
    const unreadSnapshot = await db.collection('messages')
      .where('channelId', '==', channelId)
      .where('timestamp', '>', lastRead)
      .where('author', '!=', userId)
      .count()
      .get();
    
    const unreadCount = unreadSnapshot.data().count;
    
    // Cache the result
    if (redisCache.isConnected) {
      await redisCache.setAsync(cacheKey, unreadCount.toString());
      await redisCache.expireAsync(cacheKey, 300); // 5 minutes TTL
    }
    
    return unreadCount;
  }
}

module.exports = new ChannelService();