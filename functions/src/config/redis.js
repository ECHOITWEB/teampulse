const redis = require('redis');
const { promisify } = require('util');

class RedisCache {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) return;

    this.client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('Redis: Too many reconnection attempts');
            return new Error('Too many reconnection attempts');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      console.log('✅ Redis connected successfully');
      this.isConnected = true;
    });

    await this.client.connect();

    // Promisify Redis methods
    this.getAsync = promisify(this.client.get).bind(this.client);
    this.setAsync = promisify(this.client.set).bind(this.client);
    this.delAsync = promisify(this.client.del).bind(this.client);
    this.existsAsync = promisify(this.client.exists).bind(this.client);
    this.expireAsync = promisify(this.client.expire).bind(this.client);
    this.ttlAsync = promisify(this.client.ttl).bind(this.client);
    this.incrAsync = promisify(this.client.incr).bind(this.client);
    this.decrAsync = promisify(this.client.decr).bind(this.client);
    this.hgetAsync = promisify(this.client.hget).bind(this.client);
    this.hsetAsync = promisify(this.client.hset).bind(this.client);
    this.hgetallAsync = promisify(this.client.hgetall).bind(this.client);
    this.zaddAsync = promisify(this.client.zadd).bind(this.client);
    this.zrangeAsync = promisify(this.client.zrange).bind(this.client);
  }

  // Cache patterns for different data types
  async cacheUser(userId, userData, ttl = 3600) {
    const key = `user:${userId}`;
    await this.setAsync(key, JSON.stringify(userData));
    await this.expireAsync(key, ttl);
  }

  async getCachedUser(userId) {
    const key = `user:${userId}`;
    const data = await this.getAsync(key);
    return data ? JSON.parse(data) : null;
  }

  async cacheWorkspace(workspaceId, workspaceData, ttl = 7200) {
    const key = `workspace:${workspaceId}`;
    await this.setAsync(key, JSON.stringify(workspaceData));
    await this.expireAsync(key, ttl);
  }

  async getCachedWorkspace(workspaceId) {
    const key = `workspace:${workspaceId}`;
    const data = await this.getAsync(key);
    return data ? JSON.parse(data) : null;
  }

  async cacheChannelMessages(channelId, messages, ttl = 300) {
    const key = `channel:${channelId}:messages`;
    await this.setAsync(key, JSON.stringify(messages));
    await this.expireAsync(key, ttl);
  }

  async getCachedChannelMessages(channelId) {
    const key = `channel:${channelId}:messages`;
    const data = await this.getAsync(key);
    return data ? JSON.parse(data) : null;
  }

  async invalidateCache(pattern) {
    // Pattern-based cache invalidation
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  async cacheWithTags(key, data, tags = [], ttl = 3600) {
    // Store data
    await this.setAsync(key, JSON.stringify(data));
    await this.expireAsync(key, ttl);
    
    // Store tags for easy invalidation
    for (const tag of tags) {
      await this.client.sadd(`tag:${tag}`, key);
      await this.expireAsync(`tag:${tag}`, ttl);
    }
  }

  async invalidateByTag(tag) {
    const keys = await this.client.smembers(`tag:${tag}`);
    if (keys.length > 0) {
      await this.client.del(keys);
      await this.client.del(`tag:${tag}`);
    }
  }

  // Rate limiting
  async checkRateLimit(identifier, limit = 100, window = 60) {
    const key = `rate:${identifier}`;
    const current = await this.incrAsync(key);
    
    if (current === 1) {
      await this.expireAsync(key, window);
    }
    
    return current <= limit;
  }

  // Session management
  async setSession(sessionId, userData, ttl = 86400) {
    const key = `session:${sessionId}`;
    await this.setAsync(key, JSON.stringify(userData));
    await this.expireAsync(key, ttl);
  }

  async getSession(sessionId) {
    const key = `session:${sessionId}`;
    const data = await this.getAsync(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(sessionId) {
    const key = `session:${sessionId}`;
    await this.delAsync(key);
  }

  // Leaderboard for analytics
  async updateLeaderboard(boardName, userId, score) {
    const key = `leaderboard:${boardName}`;
    await this.zaddAsync(key, score, userId);
  }

  async getLeaderboard(boardName, limit = 10) {
    const key = `leaderboard:${boardName}`;
    return await this.zrangeAsync(key, 0, limit - 1, 'WITHSCORES');
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
}

module.exports = new RedisCache();