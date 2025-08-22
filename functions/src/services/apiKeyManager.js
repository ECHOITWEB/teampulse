const functions = require('firebase-functions');

/**
 * API Key Manager with intelligent caching and rotation
 * Reduces overhead by caching key selections and tracking availability
 */
class APIKeyManager {
  constructor() {
    // Initialize key pools from Firebase config
    const config = functions.config();
    
    this.keys = {
      openai: this._initializeKeys(config?.openai, [
        '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',
        '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',
        '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'
      ]),
      anthropic: this._initializeKeys(config?.anthropic, [
        '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',
        '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',
        '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'
      ])
    };
    
    // Key status tracking with TTL cache
    this.keyStatus = new Map();
    this.keyAssignments = new Map(); // workspace -> {provider -> keyIndex}
    this.lastRotation = new Map(); // provider -> timestamp
    
    // Initialize key status
    this._initializeKeyStatus();
    
    // Cache TTL settings
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    this.ERROR_COOLDOWN = 60 * 1000; // 1 minute cooldown after error
    this.MAX_ERROR_COUNT = 3; // Max errors before key is marked unavailable
  }
  
  _initializeKeys(configKeys, defaultKeys) {
    const keys = [];
    if (configKeys) {
      for (let i = 1; i <= 3; i++) {
        if (configKeys[`key${i}`] && configKeys[`key${i}`] !== 'undefined') {
          keys.push(configKeys[`key${i}`]);
        }
      }
    }
    return keys.length > 0 ? keys : defaultKeys.filter(key => key && key !== 'undefined');
  }
  
  _initializeKeyStatus() {
    Object.entries(this.keys).forEach(([provider, keys]) => {
      keys.forEach((key, index) => {
        const statusKey = `${provider}_${index}`;
        this.keyStatus.set(statusKey, {
          available: true,
          lastError: null,
          errorCount: 0,
          lastUsed: null,
          successCount: 0,
          avgResponseTime: 0
        });
      });
    });
  }
  
  /**
   * Get API key for workspace with intelligent caching
   */
  getKey(workspaceId, provider) {
    // Check cached assignment first
    const cacheKey = `${workspaceId}_${provider}`;
    const cached = this.keyAssignments.get(cacheKey);
    
    if (cached && this._isCacheValid(cached)) {
      const statusKey = `${provider}_${cached.keyIndex}`;
      const status = this.keyStatus.get(statusKey);
      
      // Return cached key if still available
      if (status.available && status.errorCount < this.MAX_ERROR_COUNT) {
        return {
          key: this.keys[provider][cached.keyIndex],
          index: cached.keyIndex
        };
      }
    }
    
    // Find best available key
    const keyIndex = this._selectBestKey(provider);
    if (keyIndex === -1) {
      throw new Error(`All ${provider} API keys are currently unavailable`);
    }
    
    // Cache the assignment
    this.keyAssignments.set(cacheKey, {
      keyIndex,
      timestamp: Date.now()
    });
    
    // Update key usage
    const statusKey = `${provider}_${keyIndex}`;
    const status = this.keyStatus.get(statusKey);
    status.lastUsed = Date.now();
    
    return {
      key: this.keys[provider][keyIndex],
      index: keyIndex
    };
  }
  
  /**
   * Select best key based on availability and performance
   */
  _selectBestKey(provider) {
    const keys = this.keys[provider];
    let bestKey = -1;
    let bestScore = -1;
    
    keys.forEach((key, index) => {
      const statusKey = `${provider}_${index}`;
      const status = this.keyStatus.get(statusKey);
      
      // Skip unavailable keys
      if (!status.available || status.errorCount >= this.MAX_ERROR_COUNT) {
        return;
      }
      
      // Check error cooldown
      if (status.lastError && Date.now() - status.lastError < this.ERROR_COOLDOWN) {
        return;
      }
      
      // Calculate score based on:
      // - Error rate (lower is better)
      // - Success count (higher is better)
      // - Last used time (older is better for load distribution)
      const errorRate = status.errorCount / Math.max(1, status.successCount + status.errorCount);
      const idleTime = status.lastUsed ? Date.now() - status.lastUsed : Infinity;
      const score = (1 - errorRate) * 1000 + Math.min(idleTime / 1000, 100);
      
      if (score > bestScore) {
        bestScore = score;
        bestKey = index;
      }
    });
    
    return bestKey;
  }
  
  /**
   * Check if cached assignment is still valid
   */
  _isCacheValid(cached) {
    return cached && (Date.now() - cached.timestamp) < this.CACHE_TTL;
  }
  
  /**
   * Report API call result for adaptive key management
   */
  reportResult(provider, keyIndex, success, responseTime = null, error = null) {
    const statusKey = `${provider}_${keyIndex}`;
    const status = this.keyStatus.get(statusKey);
    
    if (!status) return;
    
    if (success) {
      status.successCount++;
      status.errorCount = Math.max(0, status.errorCount - 1); // Decay error count on success
      
      // Update average response time
      if (responseTime) {
        const alpha = 0.3; // Exponential moving average factor
        status.avgResponseTime = status.avgResponseTime 
          ? alpha * responseTime + (1 - alpha) * status.avgResponseTime
          : responseTime;
      }
    } else {
      status.errorCount++;
      status.lastError = Date.now();
      
      // Mark as unavailable if too many errors
      if (status.errorCount >= this.MAX_ERROR_COUNT) {
        status.available = false;
        console.error(`⚠️ API key ${statusKey} marked as unavailable after ${this.MAX_ERROR_COUNT} errors`);
        
        // Schedule re-enablement after cooldown
        setTimeout(() => {
          status.available = true;
          status.errorCount = Math.floor(this.MAX_ERROR_COUNT / 2); // Partial reset
          console.log(`✅ API key ${statusKey} re-enabled after cooldown`);
        }, this.ERROR_COOLDOWN * 5);
      }
      
      // Handle specific error types
      if (error) {
        if (error.message?.includes('rate limit')) {
          status.available = false;
          setTimeout(() => {
            status.available = true;
          }, 60000); // 1 minute rate limit cooldown
        } else if (error.message?.includes('authentication') || error.message?.includes('invalid')) {
          status.available = false; // Permanently disable invalid keys
          console.error(`❌ API key ${statusKey} permanently disabled: ${error.message}`);
        }
      }
    }
  }
  
  /**
   * Invalidate cache for workspace
   */
  invalidateCache(workspaceId = null, provider = null) {
    if (workspaceId && provider) {
      this.keyAssignments.delete(`${workspaceId}_${provider}`);
    } else if (workspaceId) {
      // Invalidate all providers for workspace
      ['openai', 'anthropic'].forEach(p => {
        this.keyAssignments.delete(`${workspaceId}_${p}`);
      });
    } else {
      // Clear all cache
      this.keyAssignments.clear();
    }
  }
  
  /**
   * Get current status report
   */
  getStatus() {
    const report = {
      openai: [],
      anthropic: []
    };
    
    Object.entries(this.keys).forEach(([provider, keys]) => {
      keys.forEach((key, index) => {
        const statusKey = `${provider}_${index}`;
        const status = this.keyStatus.get(statusKey);
        report[provider].push({
          index,
          available: status.available,
          errorCount: status.errorCount,
          successCount: status.successCount,
          avgResponseTime: Math.round(status.avgResponseTime),
          lastUsed: status.lastUsed ? new Date(status.lastUsed).toISOString() : null
        });
      });
    });
    
    return report;
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new APIKeyManager();
    }
    return instance;
  }
};