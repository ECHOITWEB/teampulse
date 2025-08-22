const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize OpenAI and Anthropic clients
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

class AIService {
  constructor() {
    // Get API keys from Firebase Functions config
    const config = functions.config();
    
    // Initialize API key pools from environment config
    this.openaiKeys = [
      config.openai?.key1,
      config.openai?.key2,
      config.openai?.key3
    ].filter(key => key && key !== 'undefined');

    this.anthropicKeys = [
      config.anthropic?.key1,
      config.anthropic?.key2,
      config.anthropic?.key3
    ].filter(key => key && key !== 'undefined');

    // Track current key index per workspace
    this.workspaceKeyIndex = new Map();
    
    // Track rate limit status per key
    this.keyStatus = new Map();
    
    // Initialize key status
    this.openaiKeys.forEach((key, index) => {
      this.keyStatus.set(`openai_${index}`, { 
        available: true, 
        lastError: null,
        errorCount: 0,
        lastUsed: null
      });
    });
    
    this.anthropicKeys.forEach((key, index) => {
      this.keyStatus.set(`anthropic_${index}`, { 
        available: true, 
        lastError: null,
        errorCount: 0,
        lastUsed: null
      });
    });

    // Initialize clients map per workspace
    this.openaiClients = new Map();
    this.anthropicClients = new Map();

    console.log(`✅ AI Service initialized with ${this.openaiKeys.length} OpenAI keys and ${this.anthropicKeys.length} Anthropic keys`);
  }

  // Get or create OpenAI client for workspace
  getOpenAIClient(workspaceId) {
    if (!this.openaiClients.has(workspaceId)) {
      const keyIndex = this.getNextAvailableKeyIndex(workspaceId, 'openai');
      if (keyIndex === -1) {
        throw new Error('All OpenAI API keys are rate limited. Please try again later.');
      }
      
      const apiKey = this.openaiKeys[keyIndex];
      this.openaiClients.set(workspaceId, {
        client: new OpenAI({ apiKey }),
        keyIndex
      });
      
      console.log(`🔑 Workspace ${workspaceId} assigned OpenAI key index: ${keyIndex}`);
    }
    
    return this.openaiClients.get(workspaceId);
  }

  // Get or create Anthropic client for workspace
  getAnthropicClient(workspaceId) {
    if (!this.anthropicClients.has(workspaceId)) {
      const keyIndex = this.getNextAvailableKeyIndex(workspaceId, 'anthropic');
      if (keyIndex === -1) {
        throw new Error('All Anthropic API keys are rate limited. Please try again later.');
      }
      
      const apiKey = this.anthropicKeys[keyIndex];
      this.anthropicClients.set(workspaceId, {
        client: new Anthropic({ apiKey }),
        keyIndex
      });
      
      console.log(`🔑 Workspace ${workspaceId} assigned Anthropic key index: ${keyIndex}`);
    }
    
    return this.anthropicClients.get(workspaceId);
  }

  // Get next available key index with round-robin and rate limit awareness
  getNextAvailableKeyIndex(workspaceId, provider) {
    const keys = provider === 'openai' ? this.openaiKeys : this.anthropicKeys;
    const baseIndex = this.workspaceKeyIndex.get(`${workspaceId}_${provider}`) || 0;
    
    // Try to find an available key starting from the last used index
    for (let i = 0; i < keys.length; i++) {
      const keyIndex = (baseIndex + i) % keys.length;
      const statusKey = `${provider}_${keyIndex}`;
      const status = this.keyStatus.get(statusKey);
      
      if (status.available) {
        this.workspaceKeyIndex.set(`${workspaceId}_${provider}`, (keyIndex + 1) % keys.length);
        return keyIndex;
      }
    }
    
    // Check if any keys have recovered
    this.checkKeyRecovery(provider);
    
    // Try once more after recovery check
    for (let i = 0; i < keys.length; i++) {
      const keyIndex = (baseIndex + i) % keys.length;
      const statusKey = `${provider}_${keyIndex}`;
      const status = this.keyStatus.get(statusKey);
      
      if (status.available) {
        this.workspaceKeyIndex.set(`${workspaceId}_${provider}`, (keyIndex + 1) % keys.length);
        return keyIndex;
      }
    }
    
    return -1; // All keys are rate limited
  }

  // Check if rate-limited keys have recovered
  checkKeyRecovery(provider) {
    const now = Date.now();
    const recoveryTime = 60000; // 1 minute recovery time
    
    this.keyStatus.forEach((status, key) => {
      if (key.startsWith(provider) && !status.available) {
        if (status.lastError && (now - status.lastError) > recoveryTime) {
          status.available = true;
          status.errorCount = 0;
          console.log(`✅ Key ${key} recovered and is now available`);
        }
      }
    });
  }

  // Handle rate limit error and switch to next key
  handleRateLimit(workspaceId, provider, keyIndex, error) {
    const statusKey = `${provider}_${keyIndex}`;
    const status = this.keyStatus.get(statusKey);
    
    status.available = false;
    status.lastError = Date.now();
    status.errorCount++;
    
    console.error(`⚠️ Rate limit hit for ${provider} key ${keyIndex}: ${error.message}`);
    
    // Remove the client so it will be recreated with a new key
    if (provider === 'openai') {
      this.openaiClients.delete(workspaceId);
    } else {
      this.anthropicClients.delete(workspaceId);
    }
  }

  // Map custom model names to actual API model names
  getActualModelName(provider, model) {
    const modelMap = {
      openai: {
        'gpt-5-mini': 'gpt-4o-mini',
        'gpt-5': 'gpt-4o',
        'gpt-4-turbo': 'gpt-4-turbo'
      },
      claude: {
        // Claude models use actual names, no mapping needed
      }
    };
    
    return modelMap[provider]?.[model] || model;
  }

  // Get display name for model
  getModelDisplayName(provider, model) {
    const modelNames = {
      openai: {
        'gpt-5-mini': 'GPT-5-mini',
        'gpt-5': 'GPT-5',
        'gpt-4-turbo': 'GPT-4 Turbo',
        'gpt-4o': 'GPT-4 Optimized',
        'gpt-4o-mini': 'GPT-4 Mini',
        'gpt-3.5-turbo': 'GPT-3.5 Turbo'
      },
      claude: {
        'claude-3-haiku-20240307': 'Claude Haiku 3',
        'claude-3-5-haiku-20241022': 'Claude Haiku 3.5',
        'claude-3-7-sonnet-20250219': 'Claude Sonnet 3.7',
        'claude-sonnet-4-20250514': 'Claude Sonnet 4',
        'claude-opus-4-20250514': 'Claude Opus 4',
        'claude-opus-4-1-20250805': 'Claude Opus 4.1',
        'claude-3-opus-20240229': 'Claude 3 Opus',
        'claude-3-sonnet-20240229': 'Claude 3 Sonnet',
        'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet'
      }
    };
    
    return modelNames[provider]?.[model] || model;
  }

  // Process message with OpenAI
  async processOpenAIMessage(workspaceId, model, messages, userId) {
    const clientData = this.getOpenAIClient(workspaceId);
    const actualModel = this.getActualModelName('openai', model);
    
    try {
      const startTime = Date.now();
      
      const completion = await clientData.client.chat.completions.create({
        model: actualModel,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const response = completion.choices[0].message;
      const usage = completion.usage;

      // Log successful usage
      await this.logUsage({
        workspaceId,
        userId,
        provider: 'openai',
        model,
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        responseTime,
        status: 'success'
      });

      return {
        content: response.content,
        usage: {
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          cost: this.calculateCost('openai', model, usage.prompt_tokens, usage.completion_tokens)
        }
      };
    } catch (error) {
      // Check if it's a rate limit error
      if (error.status === 429 || error.message?.includes('rate limit')) {
        this.handleRateLimit(workspaceId, 'openai', clientData.keyIndex, error);
        // Retry with new key
        return this.processOpenAIMessage(workspaceId, model, messages, userId);
      }
      
      throw error;
    }
  }

  // Process message with Anthropic  
  async processAnthropicMessage(workspaceId, model, messages, userId) {
    const clientData = this.getAnthropicClient(workspaceId);
    const actualModel = this.getActualModelName('claude', model);
    
    try {
      const startTime = Date.now();
      
      // Convert messages format for Anthropic
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      const userMessages = messages.filter(m => m.role !== 'system');
      
      const completion = await clientData.client.messages.create({
        model: actualModel,
        max_tokens: 2000,
        temperature: 0.7,
        system: systemMessage,
        messages: userMessages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }))
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const usage = completion.usage || {};
      const inputTokens = usage.input_tokens || 0;
      const outputTokens = usage.output_tokens || 0;

      // Log successful usage
      await this.logUsage({
        workspaceId,
        userId,
        provider: 'anthropic',
        model,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        responseTime,
        status: 'success'
      });

      return {
        content: completion.content[0].text,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          cost: this.calculateCost('anthropic', model, inputTokens, outputTokens)
        }
      };
    } catch (error) {
      // Check if it's a rate limit error
      if (error.status === 429 || error.message?.includes('rate limit')) {
        this.handleRateLimit(workspaceId, 'anthropic', clientData.keyIndex, error);
        // Retry with new key
        return this.processAnthropicMessage(workspaceId, model, messages, userId);
      }
      
      throw error;
    }
  }

  // Calculate cost based on model and tokens
  calculateCost(provider, model, inputTokens, outputTokens) {
    const pricing = {
      openai: {
        'gpt-5-mini': { input: 1.1, output: 8.4 },
        'gpt-5': { input: 5.3, output: 42 },
        'gpt-4-turbo': { input: 42, output: 84 },
        'gpt-4o': { input: 5, output: 15 },
        'gpt-4o-mini': { input: 0.15, output: 0.6 }
      },
      claude: {
        'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
        'claude-3-5-haiku-20241022': { input: 1, output: 5 },
        'claude-3-7-sonnet-20250219': { input: 3, output: 15 },
        'claude-sonnet-4-20250514': { input: 3, output: 15 },
        'claude-opus-4-20250514': { input: 15, output: 75 },
        'claude-opus-4-1-20250805': { input: 15, output: 75 },
        'claude-3-opus-20240229': { input: 15, output: 75 },
        'claude-3-sonnet-20240229': { input: 3, output: 15 },
        'claude-3-5-sonnet-20241022': { input: 3, output: 15 }
      }
    };

    const modelPricing = pricing[provider]?.[model] || { input: 1, output: 1 };
    
    const inputCost = (inputTokens / 1000) * modelPricing.input;
    const outputCost = (outputTokens / 1000) * modelPricing.output;
    
    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
      currency: 'USD'
    };
  }

  // Log AI usage to Firestore
  async logUsage(data) {
    try {
      const db = admin.firestore();
      await db.collection('ai_usage').add({
        ...data,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        keyIndex: data.provider === 'openai' 
          ? this.openaiClients.get(data.workspaceId)?.keyIndex 
          : this.anthropicClients.get(data.workspaceId)?.keyIndex
      });
    } catch (error) {
      console.error('Failed to log AI usage:', error);
    }
  }

  // Process a chat message
  async processChatMessage(workspaceId, userId, channelId, content, aiBot) {
    const { provider, model } = aiBot;
    
    // Prepare messages for AI
    const messages = [
      {
        role: 'system',
        content: 'You are Pulse AI, a helpful AI assistant in a team collaboration platform. Be concise, professional, and helpful. Respond in the same language as the user\'s message.'
      },
      {
        role: 'user',
        content: content
      }
    ];

    try {
      let response;
      
      if (provider === 'openai') {
        response = await this.processOpenAIMessage(workspaceId, model, messages, userId);
      } else if (provider === 'claude') {
        response = await this.processAnthropicMessage(workspaceId, model, messages, userId);
      } else {
        throw new Error(`Unsupported AI provider: ${provider}`);
      }

      // Get display name for the model
      const modelDisplayName = this.getModelDisplayName(provider, model);

      // Save AI response to messages
      const db = admin.firestore();
      await db.collection('messages').add({
        channelId,
        content: response.content,
        author: 'ai_bot',
        authorName: `Pulse AI (${modelDisplayName})`,
        isAI: true,
        aiModel: model,
        aiProvider: provider,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        usage: response.usage
      });

      return response;
    } catch (error) {
      console.error('Error processing AI message:', error);
      
      // Save error message
      const db = admin.firestore();
      await db.collection('messages').add({
        channelId,
        content: `죄송합니다. AI 응답 생성 중 오류가 발생했습니다: ${error.message}`,
        author: 'system',
        authorName: 'System',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        isError: true
      });
      
      throw error;
    }
  }
}

// Create singleton instance
let aiServiceInstance = null;

function getAIService() {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
}

module.exports = { getAIService };