// Wrapper for AI Service to use Firebase Functions config
const config = require('./config');

// Set environment variables from Firebase config
process.env.OPENAI_API_KEY1 = config.openai.key1;
process.env.OPENAI_API_KEY2 = config.openai.key2;
process.env.OPENAI_API_KEY3 = config.openai.key3;
process.env.ANTHROPIC_API_KEY1 = config.anthropic.key1;
process.env.ANTHROPIC_API_KEY2 = config.anthropic.key2;
process.env.ANTHROPIC_API_KEY3 = config.anthropic.key3;
process.env.JWT_SECRET = config.jwt.secret;

// Now require the actual AI service
module.exports = require('./src/services/aiService');