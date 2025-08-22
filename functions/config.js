const functions = require('firebase-functions');

// Get config from Firebase Functions config or environment variables
const config = functions.config();

module.exports = {
  openai: {
    key1: config.openai?.key1 || process.env.OPENAI_API_KEY1,
    key2: config.openai?.key2 || process.env.OPENAI_API_KEY2,
    key3: config.openai?.key3 || process.env.OPENAI_API_KEY3
  },
  anthropic: {
    key1: config.anthropic?.key1 || process.env.ANTHROPIC_API_KEY1,
    key2: config.anthropic?.key2 || process.env.ANTHROPIC_API_KEY2,
    key3: config.anthropic?.key3 || process.env.ANTHROPIC_API_KEY3
  },
  jwt: {
    secret: config.jwt?.secret || process.env.JWT_SECRET || 'your-very-secure-jwt-secret-key-here'
  }
};