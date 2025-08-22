const admin = require('firebase-admin');

/**
 * Enhanced error handler with memory leak prevention
 */
class ErrorHandler {
  constructor() {
    // Error tracking with automatic cleanup
    this.errorLog = new Map();
    this.MAX_ERROR_LOG_SIZE = 100;
    this.ERROR_LOG_TTL = 60 * 60 * 1000; // 1 hour
    
    // Set up periodic cleanup
    this.startCleanupInterval();
  }
  
  /**
   * Handle API errors with proper logging and recovery
   */
  handleApiError(error, context = {}) {
    const errorId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const errorData = {
      id: errorId,
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      context,
      type: this.categorizeError(error)
    };
    
    // Store error with automatic size limit
    this.storeError(errorData);
    
    // Log to Firebase Analytics if critical
    if (this.isCriticalError(error)) {
      this.logToAnalytics(errorData);
    }
    
    // Return sanitized error for client
    return this.sanitizeError(error);
  }
  
  /**
   * Categorize error type for better handling
   */
  categorizeError(error) {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('rate limit') || message.includes('429')) {
      return 'RATE_LIMIT';
    } else if (message.includes('authentication') || message.includes('401')) {
      return 'AUTH_ERROR';
    } else if (message.includes('network') || message.includes('timeout')) {
      return 'NETWORK_ERROR';
    } else if (message.includes('memory') || message.includes('heap')) {
      return 'MEMORY_ERROR';
    } else if (message.includes('database') || message.includes('firestore')) {
      return 'DATABASE_ERROR';
    }
    
    return 'UNKNOWN_ERROR';
  }
  
  /**
   * Check if error is critical and needs immediate attention
   */
  isCriticalError(error) {
    const type = this.categorizeError(error);
    return ['MEMORY_ERROR', 'DATABASE_ERROR', 'AUTH_ERROR'].includes(type);
  }
  
  /**
   * Store error with size limit enforcement
   */
  storeError(errorData) {
    // Clean up old errors if limit reached
    if (this.errorLog.size >= this.MAX_ERROR_LOG_SIZE) {
      const oldestKey = this.errorLog.keys().next().value;
      this.errorLog.delete(oldestKey);
    }
    
    this.errorLog.set(errorData.id, errorData);
  }
  
  /**
   * Sanitize error for client response
   */
  sanitizeError(error) {
    const type = this.categorizeError(error);
    
    const sanitizedErrors = {
      'RATE_LIMIT': {
        message: 'Service temporarily unavailable due to high demand. Please try again in a moment.',
        code: 'RATE_LIMITED',
        retry: true,
        retryAfter: 60
      },
      'AUTH_ERROR': {
        message: 'Authentication failed. Please check your credentials.',
        code: 'AUTH_FAILED',
        retry: false
      },
      'NETWORK_ERROR': {
        message: 'Network error occurred. Please check your connection.',
        code: 'NETWORK_ERROR',
        retry: true,
        retryAfter: 5
      },
      'MEMORY_ERROR': {
        message: 'System resources temporarily limited. Please try again.',
        code: 'RESOURCE_ERROR',
        retry: true,
        retryAfter: 30
      },
      'DATABASE_ERROR': {
        message: 'Database operation failed. Please try again.',
        code: 'DATABASE_ERROR',
        retry: true,
        retryAfter: 10
      },
      'UNKNOWN_ERROR': {
        message: 'An unexpected error occurred. Please try again.',
        code: 'UNKNOWN_ERROR',
        retry: true,
        retryAfter: 5
      }
    };
    
    return sanitizedErrors[type] || sanitizedErrors['UNKNOWN_ERROR'];
  }
  
  /**
   * Log critical errors to Firebase Analytics
   */
  async logToAnalytics(errorData) {
    try {
      const db = admin.firestore();
      await db.collection('error_logs').add({
        ...errorData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (logError) {
      console.error('Failed to log error to analytics:', logError);
    }
  }
  
  /**
   * Start periodic cleanup interval
   */
  startCleanupInterval() {
    setInterval(() => {
      this.cleanupOldErrors();
    }, 10 * 60 * 1000); // Run every 10 minutes
  }
  
  /**
   * Clean up old errors from memory
   */
  cleanupOldErrors() {
    const now = Date.now();
    const cutoff = now - this.ERROR_LOG_TTL;
    
    for (const [id, errorData] of this.errorLog.entries()) {
      const errorTime = new Date(errorData.timestamp).getTime();
      if (errorTime < cutoff) {
        this.errorLog.delete(id);
      }
    }
  }
  
  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats = {
      total: this.errorLog.size,
      byType: {}
    };
    
    for (const errorData of this.errorLog.values()) {
      const type = errorData.type;
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    }
    
    return stats;
  }
  
  /**
   * Middleware for Express error handling
   */
  expressMiddleware() {
    return (err, req, res, next) => {
      const context = {
        method: req.method,
        url: req.url,
        userId: req.user?.id,
        workspaceId: req.workspace?.id
      };
      
      const sanitizedError = this.handleApiError(err, context);
      
      res.status(err.status || 500).json({
        error: sanitizedError,
        timestamp: new Date().toISOString()
      });
    };
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new ErrorHandler();
    }
    return instance;
  }
};