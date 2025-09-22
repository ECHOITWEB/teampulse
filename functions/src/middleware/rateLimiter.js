const rateLimit = require('express-rate-limit');

// Create rate limiter for API endpoints
const createRateLimiter = (options = {}) => {
  const defaults = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  };

  return rateLimit({ ...defaults, ...options });
};

// Strict rate limiter for AI endpoints
const aiRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit to 10 AI requests per minute
  message: 'AI request rate limit exceeded. Please wait before sending more messages.',
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use IP
    return req.user?.uid || req.ip;
  }
});

// General API rate limiter
const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per 15 minutes
});

module.exports = {
  createRateLimiter,
  aiRateLimiter,
  apiRateLimiter
};