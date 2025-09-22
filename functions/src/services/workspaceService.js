const admin = require('firebase-admin');
const redisCache = require('../config/redis');

class WorkspaceService {
  constructor() {
    // In-memory cache for frequently accessed workspaces
    this.workspaceCache = new Map();
    this.userWorkspacesCache = new Map();
    
    // Initialize Redis
    this.initializeRedis();
  }
  
  async initializeRedis() {
    try {
      await redisCache.connect();
      console.log('✅ Redis connected for Workspace Service');
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
    }
  }
  
  // Get workspace with caching
  async getWorkspace(workspaceId) {
    // Check memory cache
    if (this.workspaceCache.has(workspaceId)) {
      return this.workspaceCache.get(workspaceId);
    }
    
    // Check Redis cache
    if (redisCache.isConnected) {
      const cached = await redisCache.getCachedWorkspace(workspaceId);
      if (cached) {
        this.workspaceCache.set(workspaceId, cached);
        return cached;
      }
    }
    
    // Query Firestore
    const db = admin.firestore();
    const doc = await db.collection('workspaces').doc(workspaceId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    const workspace = { id: doc.id, ...doc.data() };
    
    // Update caches
    this.workspaceCache.set(workspaceId, workspace);
    if (redisCache.isConnected) {
      await redisCache.cacheWorkspace(workspaceId, workspace, 7200); // 2 hours TTL
    }
    
    return workspace;
  }
  
  // Get user's workspaces with caching
  async getUserWorkspaces(userId) {
    // Check memory cache
    if (this.userWorkspacesCache.has(userId)) {
      return this.userWorkspacesCache.get(userId);
    }
    
    // Check Redis cache
    if (redisCache.isConnected) {
      const cacheKey = `user:${userId}:workspaces`;
      const cached = await redisCache.getAsync(cacheKey);
      if (cached) {
        const workspaces = JSON.parse(cached);
        this.userWorkspacesCache.set(userId, workspaces);
        return workspaces;
      }
    }
    
    // Query Firestore
    const db = admin.firestore();
    const snapshot = await db.collection('workspaces')
      .where('members', 'array-contains', userId)
      .get();
    
    const workspaces = [];
    snapshot.forEach(doc => {
      workspaces.push({ id: doc.id, ...doc.data() });
    });
    
    // Update caches
    this.userWorkspacesCache.set(userId, workspaces);
    if (redisCache.isConnected) {
      const cacheKey = `user:${userId}:workspaces`;
      await redisCache.setAsync(cacheKey, JSON.stringify(workspaces));
      await redisCache.expireAsync(cacheKey, 3600); // 1 hour TTL
    }
    
    return workspaces;
  }
  
  // Invalidate workspace cache
  async invalidateWorkspaceCache(workspaceId) {
    this.workspaceCache.delete(workspaceId);
    
    if (redisCache.isConnected) {
      await redisCache.delAsync(`workspace:${workspaceId}`);
    }
    
    // Also invalidate user workspace caches for all members
    const workspace = await this.getWorkspace(workspaceId);
    if (workspace && workspace.members) {
      for (const userId of workspace.members) {
        this.userWorkspacesCache.delete(userId);
        if (redisCache.isConnected) {
          await redisCache.delAsync(`user:${userId}:workspaces`);
        }
      }
    }
  }
  
  // Get workspace channels with caching
  async getWorkspaceChannels(workspaceId) {
    const cacheKey = `workspace:${workspaceId}:channels`;
    
    // Check Redis cache
    if (redisCache.isConnected) {
      const cached = await redisCache.getAsync(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }
    
    // Query Firestore
    const db = admin.firestore();
    const snapshot = await db.collection('chat_channels')
      .where('workspace_id', '==', workspaceId)
      .get();
    
    const channels = [];
    snapshot.forEach(doc => {
      channels.push({ id: doc.id, ...doc.data() });
    });
    
    // Update Redis cache
    if (redisCache.isConnected) {
      await redisCache.setAsync(cacheKey, JSON.stringify(channels));
      await redisCache.expireAsync(cacheKey, 600); // 10 minutes TTL
    }
    
    return channels;
  }
  
  // Get workspace members with caching
  async getWorkspaceMembers(workspaceId) {
    const workspace = await this.getWorkspace(workspaceId);
    if (!workspace || !workspace.members) {
      return [];
    }
    
    const cacheKey = `workspace:${workspaceId}:members:details`;
    
    // Check Redis cache
    if (redisCache.isConnected) {
      const cached = await redisCache.getAsync(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }
    
    // Query Firestore for member details
    const db = admin.firestore();
    const members = [];
    
    // Batch get member details
    const memberPromises = workspace.members.map(async (userId) => {
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
    
    // Update Redis cache
    if (redisCache.isConnected) {
      await redisCache.setAsync(cacheKey, JSON.stringify(validMembers));
      await redisCache.expireAsync(cacheKey, 1800); // 30 minutes TTL
    }
    
    return validMembers;
  }
  
  // Update workspace with cache invalidation
  async updateWorkspace(workspaceId, updates) {
    const db = admin.firestore();
    await db.collection('workspaces').doc(workspaceId).update(updates);
    
    // Invalidate caches
    await this.invalidateWorkspaceCache(workspaceId);
  }
  
  // Add member to workspace
  async addMember(workspaceId, userId) {
    const db = admin.firestore();
    await db.collection('workspaces').doc(workspaceId).update({
      members: admin.firestore.FieldValue.arrayUnion(userId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Invalidate caches
    await this.invalidateWorkspaceCache(workspaceId);
    this.userWorkspacesCache.delete(userId);
    if (redisCache.isConnected) {
      await redisCache.delAsync(`user:${userId}:workspaces`);
    }
  }
  
  // Remove member from workspace
  async removeMember(workspaceId, userId) {
    const db = admin.firestore();
    await db.collection('workspaces').doc(workspaceId).update({
      members: admin.firestore.FieldValue.arrayRemove(userId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Invalidate caches
    await this.invalidateWorkspaceCache(workspaceId);
    this.userWorkspacesCache.delete(userId);
    if (redisCache.isConnected) {
      await redisCache.delAsync(`user:${userId}:workspaces`);
    }
  }
}

module.exports = new WorkspaceService();