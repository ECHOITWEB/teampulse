const redis = require('redis');

class CacheService {
  constructor() {
    this.client = null;
    this.defaultTTL = 3600; // 1 hour
    this.isConnected = false;
    this.init();
  }

  async init() {
    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('Redis: Max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
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
        console.log('Redis Client Connected');
        this.isConnected = true;
      });

      await this.client.connect();
    } catch (error) {
      console.error('Redis initialization error:', error);
      // Continue without cache if Redis is not available
    }
  }

  // Generic cache methods
  async get(key) {
    if (!this.isConnected) return null;
    
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    if (!this.isConnected) return false;
    
    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected) return false;
    
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async delPattern(pattern) {
    if (!this.isConnected) return false;
    
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      console.error(`Cache delete pattern error for ${pattern}:`, error);
      return false;
    }
  }

  // Specific cache methods for different entities
  async getUserCache(userId) {
    return this.get(`user:${userId}`);
  }

  async setUserCache(userId, userData, ttl = 1800) {
    return this.set(`user:${userId}`, userData, ttl);
  }

  async getTeamCache(teamId) {
    return this.get(`team:${teamId}`);
  }

  async setTeamCache(teamId, teamData, ttl = 1800) {
    return this.set(`team:${teamId}`, teamData, ttl);
  }

  async getObjectiveCache(objectiveId) {
    return this.get(`objective:${objectiveId}`);
  }

  async setObjectiveCache(objectiveId, objectiveData, ttl = 900) {
    return this.set(`objective:${objectiveId}`, objectiveData, ttl);
  }

  async getTaskCache(taskId) {
    return this.get(`task:${taskId}`);
  }

  async setTaskCache(taskId, taskData, ttl = 600) {
    return this.set(`task:${taskId}`, taskData, ttl);
  }

  async getUserTasksCache(userId, filters = {}) {
    const filterKey = Object.keys(filters).sort().map(k => `${k}:${filters[k]}`).join(':');
    return this.get(`user:${userId}:tasks:${filterKey}`);
  }

  async setUserTasksCache(userId, filters, tasks, ttl = 300) {
    const filterKey = Object.keys(filters).sort().map(k => `${k}:${filters[k]}`).join(':');
    return this.set(`user:${userId}:tasks:${filterKey}`, tasks, ttl);
  }

  async getAnalyticsCache(key) {
    return this.get(`analytics:${key}`);
  }

  async setAnalyticsCache(key, data, ttl = 1800) {
    return this.set(`analytics:${key}`, data, ttl);
  }

  // Invalidation methods
  async invalidateUserCache(userId) {
    await this.del(`user:${userId}`);
    await this.delPattern(`user:${userId}:*`);
  }

  async invalidateTeamCache(teamId) {
    await this.del(`team:${teamId}`);
    await this.delPattern(`team:${teamId}:*`);
  }

  async invalidateObjectiveCache(objectiveId) {
    await this.del(`objective:${objectiveId}`);
    // Also invalidate related caches
    const objective = await this.get(`objective:${objectiveId}`);
    if (objective?.owner_id) {
      await this.delPattern(`user:${objective.owner_id}:objectives:*`);
    }
    if (objective?.team_id) {
      await this.delPattern(`team:${objective.team_id}:objectives:*`);
    }
  }

  async invalidateTaskCache(taskId) {
    await this.del(`task:${taskId}`);
    // Also invalidate related caches
    const task = await this.get(`task:${taskId}`);
    if (task?.assignee_id) {
      await this.delPattern(`user:${task.assignee_id}:tasks:*`);
    }
    if (task?.team_id) {
      await this.delPattern(`team:${task.team_id}:tasks:*`);
    }
  }

  // Session management
  async setSession(sessionId, sessionData, ttl = 86400) {
    return this.set(`session:${sessionId}`, sessionData, ttl);
  }

  async getSession(sessionId) {
    return this.get(`session:${sessionId}`);
  }

  async deleteSession(sessionId) {
    return this.del(`session:${sessionId}`);
  }

  // Rate limiting
  async checkRateLimit(key, limit = 100, window = 3600) {
    if (!this.isConnected) return { allowed: true, remaining: limit };
    
    try {
      const current = await this.client.incr(`ratelimit:${key}`);
      
      if (current === 1) {
        await this.client.expire(`ratelimit:${key}`, window);
      }
      
      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        resetIn: await this.client.ttl(`ratelimit:${key}`)
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      return { allowed: true, remaining: limit };
    }
  }

  // Distributed locking
  async acquireLock(resource, ttl = 30) {
    if (!this.isConnected) return true;
    
    const lockKey = `lock:${resource}`;
    const lockValue = Date.now().toString();
    
    try {
      const result = await this.client.set(lockKey, lockValue, {
        NX: true,
        EX: ttl
      });
      
      return result === 'OK' ? lockValue : false;
    } catch (error) {
      console.error('Lock acquisition error:', error);
      return false;
    }
  }

  async releaseLock(resource, lockValue) {
    if (!this.isConnected) return true;
    
    const lockKey = `lock:${resource}`;
    
    try {
      const currentValue = await this.client.get(lockKey);
      if (currentValue === lockValue) {
        await this.client.del(lockKey);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Lock release error:', error);
      return false;
    }
  }

  // Cache warming
  async warmCache(type, ids) {
    // This method can be used to pre-populate cache
    // Implementation depends on specific needs
    console.log(`Warming cache for ${type} with ${ids.length} items`);
  }

  // Cleanup
  async close() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
}

// Export singleton instance
module.exports = new CacheService();