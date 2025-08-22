const admin = require('firebase-admin');

/**
 * Performance monitoring system for Firebase Functions
 */
class PerformanceMonitor {
  constructor() {
    // Performance metrics storage
    this.metrics = new Map();
    this.MAX_METRICS_SIZE = 1000;
    this.METRIC_TTL = 60 * 60 * 1000; // 1 hour
    
    // Thresholds for alerts
    this.thresholds = {
      responseTime: 3000, // 3 seconds
      errorRate: 0.05, // 5% error rate
      memoryUsage: 0.9, // 90% memory usage
      cpuUsage: 0.8 // 80% CPU usage
    };
    
    // Start monitoring
    this.startMonitoring();
  }
  
  /**
   * Track API request performance
   */
  trackRequest(endpoint, method, responseTime, success = true) {
    const metricKey = `${method}_${endpoint}`;
    
    if (!this.metrics.has(metricKey)) {
      this.metrics.set(metricKey, {
        endpoint,
        method,
        requests: 0,
        errors: 0,
        totalTime: 0,
        avgTime: 0,
        maxTime: 0,
        minTime: Infinity,
        lastUpdated: Date.now()
      });
    }
    
    const metric = this.metrics.get(metricKey);
    
    // Update metrics
    metric.requests++;
    if (!success) metric.errors++;
    metric.totalTime += responseTime;
    metric.avgTime = metric.totalTime / metric.requests;
    metric.maxTime = Math.max(metric.maxTime, responseTime);
    metric.minTime = Math.min(metric.minTime, responseTime);
    metric.lastUpdated = Date.now();
    
    // Check thresholds
    this.checkThresholds(metric);
    
    // Clean up old metrics
    if (this.metrics.size > this.MAX_METRICS_SIZE) {
      this.cleanupOldMetrics();
    }
  }
  
  /**
   * Track memory usage
   */
  trackMemoryUsage() {
    const used = process.memoryUsage();
    const metric = {
      rss: used.rss / 1024 / 1024, // MB
      heapTotal: used.heapTotal / 1024 / 1024, // MB
      heapUsed: used.heapUsed / 1024 / 1024, // MB
      external: used.external / 1024 / 1024, // MB
      timestamp: Date.now()
    };
    
    // Check if memory usage is too high
    const heapUsagePercent = used.heapUsed / used.heapTotal;
    if (heapUsagePercent > this.thresholds.memoryUsage) {
      this.logAlert('MEMORY_WARNING', {
        usage: heapUsagePercent,
        threshold: this.thresholds.memoryUsage,
        metric
      });
    }
    
    return metric;
  }
  
  /**
   * Check performance thresholds
   */
  checkThresholds(metric) {
    // Check response time
    if (metric.avgTime > this.thresholds.responseTime) {
      this.logAlert('SLOW_RESPONSE', {
        endpoint: metric.endpoint,
        avgTime: metric.avgTime,
        threshold: this.thresholds.responseTime
      });
    }
    
    // Check error rate
    const errorRate = metric.errors / metric.requests;
    if (errorRate > this.thresholds.errorRate) {
      this.logAlert('HIGH_ERROR_RATE', {
        endpoint: metric.endpoint,
        errorRate,
        threshold: this.thresholds.errorRate
      });
    }
  }
  
  /**
   * Log performance alert
   */
  async logAlert(type, data) {
    console.warn(`⚠️ Performance Alert [${type}]:`, data);
    
    try {
      const db = admin.firestore();
      await db.collection('performance_alerts').add({
        type,
        data,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to log performance alert:', error);
    }
  }
  
  /**
   * Clean up old metrics
   */
  cleanupOldMetrics() {
    const now = Date.now();
    const cutoff = now - this.METRIC_TTL;
    
    for (const [key, metric] of this.metrics.entries()) {
      if (metric.lastUpdated < cutoff) {
        this.metrics.delete(key);
      }
    }
  }
  
  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const summary = {
      totalEndpoints: this.metrics.size,
      totalRequests: 0,
      totalErrors: 0,
      avgResponseTime: 0,
      slowestEndpoints: [],
      errorProne: [],
      memory: this.trackMemoryUsage()
    };
    
    let totalTime = 0;
    
    // Calculate summary metrics
    for (const metric of this.metrics.values()) {
      summary.totalRequests += metric.requests;
      summary.totalErrors += metric.errors;
      totalTime += metric.totalTime;
      
      // Track slowest endpoints
      if (metric.avgTime > this.thresholds.responseTime) {
        summary.slowestEndpoints.push({
          endpoint: metric.endpoint,
          method: metric.method,
          avgTime: metric.avgTime
        });
      }
      
      // Track error-prone endpoints
      const errorRate = metric.errors / metric.requests;
      if (errorRate > this.thresholds.errorRate) {
        summary.errorProne.push({
          endpoint: metric.endpoint,
          method: metric.method,
          errorRate
        });
      }
    }
    
    summary.avgResponseTime = summary.totalRequests > 0 
      ? totalTime / summary.totalRequests 
      : 0;
    
    // Sort by severity
    summary.slowestEndpoints.sort((a, b) => b.avgTime - a.avgTime);
    summary.errorProne.sort((a, b) => b.errorRate - a.errorRate);
    
    // Limit to top 5
    summary.slowestEndpoints = summary.slowestEndpoints.slice(0, 5);
    summary.errorProne = summary.errorProne.slice(0, 5);
    
    return summary;
  }
  
  /**
   * Express middleware for automatic performance tracking
   */
  expressMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Override res.end to track response time
      const originalEnd = res.end;
      res.end = (...args) => {
        const responseTime = Date.now() - startTime;
        const success = res.statusCode < 400;
        
        // Track the request
        this.trackRequest(
          req.path,
          req.method,
          responseTime,
          success
        );
        
        // Log slow requests
        if (responseTime > this.thresholds.responseTime) {
          console.warn(`⚠️ Slow request: ${req.method} ${req.path} took ${responseTime}ms`);
        }
        
        // Call original end
        originalEnd.apply(res, args);
      };
      
      next();
    };
  }
  
  /**
   * Start periodic monitoring
   */
  startMonitoring() {
    // Monitor memory every minute
    setInterval(() => {
      const memory = this.trackMemoryUsage();
      
      // Force garbage collection if memory is high
      if (memory.heapUsed / memory.heapTotal > 0.8) {
        if (global.gc) {
          console.log('🧹 Running garbage collection...');
          global.gc();
        }
      }
    }, 60000);
    
    // Clean up old metrics every 10 minutes
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 10 * 60000);
  }
  
  /**
   * Get endpoint statistics
   */
  getEndpointStats(endpoint, method) {
    const metricKey = `${method}_${endpoint}`;
    return this.metrics.get(metricKey) || null;
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new PerformanceMonitor();
    }
    return instance;
  }
};