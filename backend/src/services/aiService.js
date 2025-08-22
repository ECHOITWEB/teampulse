const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

// Use Firebase cache service instead of Redis for Firebase deployment
const cacheService = require('./firebaseCacheService');

class AIService {
  constructor() {
    // Initialize API key pools
    this.openaiKeys = [
      process.env.OPENAI_API_KEY1,
      process.env.OPENAI_API_KEY2,
      process.env.OPENAI_API_KEY3
    ].filter(key => key && key !== 'undefined');

    this.anthropicKeys = [
      process.env.ANTHROPIC_API_KEY1,
      process.env.ANTHROPIC_API_KEY2,
      process.env.ANTHROPIC_API_KEY3
    ].filter(key => key && key !== 'undefined');

    // Conversation memory cache (workspace -> channel -> messages)
    this.conversationMemory = new Map();
    
    // Max messages to keep in memory
    this.MAX_CONTEXT_MESSAGES = 12;

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
    
    // Try to get a new client with a different key
    const newKeyIndex = this.getNextAvailableKeyIndex(workspaceId, provider);
    if (newKeyIndex === -1) {
      throw new Error(`All ${provider} API keys are rate limited. Please try again later.`);
    }
    
    console.log(`🔄 Switching workspace ${workspaceId} from ${provider} key ${keyIndex} to ${newKeyIndex}`);
    
    // Create new client with the new key
    if (provider === 'openai') {
      const apiKey = this.openaiKeys[newKeyIndex];
      this.openaiClients.set(workspaceId, {
        client: new OpenAI({ apiKey }),
        keyIndex: newKeyIndex
      });
    } else {
      const apiKey = this.anthropicKeys[newKeyIndex];
      this.anthropicClients.set(workspaceId, {
        client: new Anthropic({ apiKey }),
        keyIndex: newKeyIndex
      });
    }
  }

  // Map custom model names to actual API model names (if needed)
  getActualModelName(provider, model) {
    const modelMap = {
      openai: {
        'gpt-5-mini': 'gpt-4o-mini', // GPT-5-mini uses gpt-4o-mini API
        'gpt-5': 'gpt-4o', // GPT-5 uses gpt-4o API
        'gpt-5-nano': 'gpt-4o-mini', // GPT-5-nano uses gpt-4o-mini API
        'gpt-4.1': 'gpt-4-turbo', // GPT-4.1 uses gpt-4-turbo API
        'gpt-4.1-mini': 'gpt-4o-mini', // GPT-4.1-mini uses gpt-4o-mini API
        'gpt-4o': 'gpt-4o' // GPT-4o native
      },
      claude: {
        // No mapping needed - use exact model names
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
        'gpt-5-nano': 'GPT-5-nano',
        'gpt-4.1': 'GPT-4.1',
        'gpt-4.1-mini': 'GPT-4.1-mini',
        'gpt-4o': 'GPT-4o'
      },
      claude: {
        'claude-opus-4-1-20250805': 'Claude Opus 4.1',
        'claude-opus-4-20250514': 'Claude Opus 4',
        'claude-sonnet-4-20250514': 'Claude Sonnet 4',
        'claude-3-7-sonnet-20250219': 'Claude Sonnet 3.7',
        'claude-3-5-haiku-20241022': 'Claude Haiku 3.5'
      }
    };
    
    return modelNames[provider]?.[model] || model;
  }
  
  // Count tokens in a message (approximate)
  countTokens(text) {
    // Rough approximation: 1 token ≈ 4 characters for English
    // For Korean, it's roughly 1 token ≈ 2-3 characters
    const koreanChars = (text.match(/[가-힣]/g) || []).length;
    const otherChars = text.length - koreanChars;
    
    const koreanTokens = Math.ceil(koreanChars / 2.5);
    const otherTokens = Math.ceil(otherChars / 4);
    
    return koreanTokens + otherTokens;
  }
  
  // Estimate tokens for messages
  estimateTokensForMessages(messages) {
    let totalTokens = 0;
    
    for (const message of messages) {
      if (typeof message.content === 'string') {
        totalTokens += this.countTokens(message.content);
      } else if (Array.isArray(message.content)) {
        for (const part of message.content) {
          if (part.type === 'text') {
            totalTokens += this.countTokens(part.text || part.content || '');
          } else if (part.type === 'image_url' || part.type === 'image') {
            // Images typically use ~85 tokens for metadata + base64 size
            totalTokens += 85 + Math.ceil(1000); // Rough estimate for image
          }
        }
      }
      // Add overhead for message structure
      totalTokens += 4;
    }
    
    return totalTokens;
  }

  // Process message with OpenAI
  async processOpenAIMessage(workspaceId, model, messages, userId, options = {}) {
    const clientData = this.getOpenAIClient(workspaceId);
    const actualModel = this.getActualModelName('openai', model);
    
    try {
      const startTime = Date.now();
      
      // Check if we have multimodal content
      const hasImages = messages.some(msg => 
        Array.isArray(msg.content) && 
        msg.content.some(c => c.type === 'image_url')
      );
      
      // Use appropriate model for vision if needed
      let finalModel = actualModel;
      if (hasImages && !actualModel.includes('vision') && !actualModel.includes('4o')) {
        finalModel = 'gpt-4-turbo'; // GPT-4 Turbo supports vision
      }
      
      // Prepare tools if requested
      const tools = [];
      if (options.enableWebSearch) {
        tools.push({
          type: 'web_search'
        });
      }
      if (options.enableCodeInterpreter) {
        tools.push({
          type: 'code_interpreter'
        });
      }
      
      const completionOptions = {
        model: finalModel,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000
      };
      
      if (tools.length > 0) {
        completionOptions.tools = tools;
      }
      
      if (options.stream) {
        completionOptions.stream = true;
      }
      
      const completion = await clientData.client.chat.completions.create(completionOptions);

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
      
      // Log failed usage
      await this.logUsage({
        workspaceId,
        userId,
        provider: 'openai',
        model,
        status: 'failed',
        error: error.message
      });
      
      throw error;
    }
  }

  // Process message with Anthropic
  async processAnthropicMessage(workspaceId, model, messages, userId, options = {}) {
    const clientData = this.getAnthropicClient(workspaceId);
    const actualModel = this.getActualModelName('claude', model);
    
    try {
      const startTime = Date.now();
      
      // Convert messages format for Anthropic
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      const userMessages = messages.filter(m => m.role !== 'system');
      
      // Process messages for Claude format
      const formattedMessages = userMessages.map(m => {
        // Handle multimodal content
        if (Array.isArray(m.content)) {
          return {
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
          };
        } else {
          return {
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
          };
        }
      });
      
      const completionOptions = {
        model: actualModel,
        max_tokens: 2000,
        temperature: 0.7,
        system: systemMessage,
        messages: formattedMessages
      };
      
      // Add tools if requested
      if (options.enableTools) {
        completionOptions.tools = [
          {
            name: 'str_replace_editor',
            description: 'Edit text files by replacing strings',
            input_schema: {
              type: 'object',
              properties: {
                file_path: { type: 'string' },
                old_str: { type: 'string' },
                new_str: { type: 'string' }
              },
              required: ['file_path', 'old_str', 'new_str']
            }
          }
        ];
      }
      
      if (options.stream) {
        completionOptions.stream = true;
      }
      
      const completion = await clientData.client.messages.create(completionOptions);

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
      
      // Log failed usage
      await this.logUsage({
        workspaceId,
        userId,
        provider: 'anthropic',
        model,
        status: 'failed',
        error: error.message
      });
      
      throw error;
    }
  }

  // Calculate cost based on model and tokens
  calculateCost(provider, model, inputTokens, outputTokens) {
    // Map custom names to pricing
    const customPricing = {
      openai: {
        'gpt-5-mini': { input: 1.1, output: 8.4 },
        'gpt-5': { input: 5.3, output: 42 },
        'gpt-4-turbo': { input: 42, output: 84 }
      },
      claude: {
        'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
        'claude-3-5-haiku-20241022': { input: 1, output: 5 },
        'claude-3-7-sonnet-20250219': { input: 3, output: 15 },
        'claude-sonnet-4-20250514': { input: 3, output: 15 },
        'claude-opus-4-20250514': { input: 15, output: 75 },
        'claude-opus-4-1-20250805': { input: 15, output: 75 }
      }
    };
    
    // Actual API pricing (fallback)
    const actualPricing = {
      openai: {
        'gpt-4-turbo': { input: 10, output: 30 },
        'gpt-4': { input: 30, output: 60 },
        'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
        'gpt-4o': { input: 5, output: 15 },
        'gpt-4o-mini': { input: 0.15, output: 0.6 }
      },
      anthropic: {
        'claude-3-opus-20240229': { input: 15, output: 75 },
        'claude-3-sonnet-20240229': { input: 3, output: 15 },
        'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
        'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
        'claude-3-5-haiku-20241022': { input: 1, output: 5 }
      }
    };

    // First try custom pricing, then fallback to actual pricing
    const modelPricing = customPricing[provider]?.[model] || 
                        actualPricing[provider]?.[model] || 
                        { input: 1, output: 1 };
    
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

  // Get conversation context from memory, Redis, and Firestore
  async getConversationContext(workspaceId, channelId) {
    const memoryKey = `${workspaceId}_${channelId}`;
    
    // Check memory cache first
    if (this.conversationMemory.has(memoryKey)) {
      return this.conversationMemory.get(memoryKey);
    }
    
    // Check Firebase cache
    const cachedMessages = await cacheService.getCachedChannelMessages(channelId);
    if (cachedMessages) {
      this.conversationMemory.set(memoryKey, cachedMessages);
      return cachedMessages;
    }
    
    // Load recent messages from Firestore
    const db = admin.firestore();
    const messagesSnapshot = await db.collection('messages')
      .where('channelId', '==', channelId)
      .orderBy('timestamp', 'desc')
      .limit(this.MAX_CONTEXT_MESSAGES * 2) // Get more to filter out system messages
      .get();
    
    const messages = [];
    messagesSnapshot.forEach(doc => {
      const data = doc.data();
      if (!data.isError && data.content) {
        messages.push({
          role: data.isAI ? 'assistant' : 'user',
          content: data.content,
          attachments: data.attachments || [],
          timestamp: data.timestamp
        });
      }
    });
    
    // Reverse to get chronological order and limit
    const contextMessages = messages.reverse().slice(-this.MAX_CONTEXT_MESSAGES);
    
    // Update memory cache
    this.conversationMemory.set(memoryKey, contextMessages);
    
    // Update Firebase cache
    await cacheService.setInMemory(`channel:${channelId}:messages`, contextMessages, 300); // 5 minutes TTL
    
    return contextMessages;
  }

  // Update conversation memory
  updateConversationMemory(workspaceId, channelId, message) {
    const memoryKey = `${workspaceId}_${channelId}`;
    const context = this.conversationMemory.get(memoryKey) || [];
    
    context.push(message);
    
    // Keep only recent messages
    if (context.length > this.MAX_CONTEXT_MESSAGES) {
      context.shift();
    }
    
    this.conversationMemory.set(memoryKey, context);
  }

  // Process file attachments for vision models
  async processAttachmentsForVision(attachments, provider) {
    const processedAttachments = [];
    
    for (const attachment of attachments) {
      if (attachment.type && attachment.type.startsWith('image/')) {
        try {
          // Download image and convert to base64
          const response = await fetch(attachment.url);
          const buffer = await response.buffer();
          const base64 = buffer.toString('base64');
          const mimeType = attachment.type;
          
          if (provider === 'openai') {
            processedAttachments.push({
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: 'high'
              }
            });
          } else if (provider === 'claude') {
            processedAttachments.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: base64
              }
            });
          }
        } catch (error) {
          console.error(`Failed to process image attachment: ${error.message}`);
        }
      } else if (attachment.type && attachment.type.includes('pdf')) {
        // Special handling for PDFs
        try {
          if (provider === 'claude') {
            // Claude has native PDF support
            const response = await fetch(attachment.url);
            const buffer = await response.buffer();
            const base64 = buffer.toString('base64');
            
            processedAttachments.push({
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64
              }
            });
          } else {
            // For OpenAI, extract text from PDF
            const response = await fetch(attachment.url);
            const text = await response.text();
            processedAttachments.push({
              type: 'text',
              content: `PDF: ${attachment.name}\n\n${text.substring(0, 10000)}` // Increased limit for PDFs
            });
          }
        } catch (error) {
          console.error(`Failed to process PDF attachment: ${error.message}`);
        }
      } else if (attachment.type && attachment.type.includes('text')) {
        // For text files, fetch content
        try {
          const response = await fetch(attachment.url);
          const text = await response.text();
          processedAttachments.push({
            type: 'text',
            content: `File: ${attachment.name}\n\n${text.substring(0, 5000)}` // Limit text size
          });
        } catch (error) {
          console.error(`Failed to process text attachment: ${error.message}`);
        }
      }
    }
    
    return processedAttachments;
  }

  // Process a chat message with context and attachments
  async processChatMessage(workspaceId, userId, channelId, content, aiBot, attachments = [], options = {}) {
    const { provider, model } = aiBot;
    
    // Get conversation context
    const contextMessages = await this.getConversationContext(workspaceId, channelId);
    
    // Process attachments if present
    const processedAttachments = await this.processAttachmentsForVision(attachments, provider);
    
    // Prepare messages for AI with context
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant in a team collaboration platform. Be concise, professional, and helpful. You can analyze images and documents when provided.'
      }
    ];
    
    // Add context messages
    for (const contextMsg of contextMessages) {
      if (contextMsg.role === 'user' || contextMsg.role === 'assistant') {
        messages.push({
          role: contextMsg.role,
          content: contextMsg.content
        });
      }
    }
    
    // Add current message with attachments
    if (provider === 'openai' && processedAttachments.length > 0) {
      // For OpenAI, combine text and images in content array
      const contentArray = [{ type: 'text', text: content }];
      for (const attachment of processedAttachments) {
        if (attachment.type === 'image_url') {
          contentArray.push(attachment);
        } else if (attachment.type === 'text') {
          contentArray.push({ type: 'text', text: attachment.content });
        }
      }
      messages.push({
        role: 'user',
        content: contentArray
      });
    } else if (provider === 'claude' && processedAttachments.length > 0) {
      // For Claude, combine text and images in content array
      const contentArray = [{ type: 'text', text: content }];
      for (const attachment of processedAttachments) {
        if (attachment.type === 'image') {
          contentArray.push(attachment);
        } else if (attachment.type === 'text') {
          contentArray.push({ type: 'text', text: attachment.content });
        }
      }
      messages.push({
        role: 'user',
        content: contentArray
      });
    } else {
      // No attachments or text-only model
      messages.push({
        role: 'user',
        content: content
      });
    }
    
    // Update memory with user message
    this.updateConversationMemory(workspaceId, channelId, {
      role: 'user',
      content: content,
      attachments: attachments,
      timestamp: new Date()
    });

    try {
      let response;
      
      // Determine if we need vision model
      const needsVision = processedAttachments.some(a => a.type === 'image_url' || a.type === 'image');
      let actualModel = model;
      
      if (needsVision) {
        if (provider === 'openai' && !model.includes('vision') && !model.includes('4o')) {
          actualModel = 'gpt-4-vision';
        }
      }
      
      // Check for special commands in content
      const enableWebSearch = content.includes('[웹검색]') || content.includes('[web]');
      const enableCodeInterpreter = content.includes('[코드실행]') || content.includes('[code]');
      const enableTools = content.includes('[도구]') || content.includes('[tools]');
      const enableStream = options.stream || false;
      
      if (provider === 'openai') {
        response = await this.processOpenAIMessage(workspaceId, actualModel, messages, userId, {
          enableWebSearch,
          enableCodeInterpreter,
          stream: enableStream
        });
      } else if (provider === 'claude') {
        response = await this.processAnthropicMessage(workspaceId, actualModel, messages, userId, {
          enableTools,
          stream: enableStream
        });
      } else {
        throw new Error(`Unsupported AI provider: ${provider}`);
      }

      // Update memory with AI response
      this.updateConversationMemory(workspaceId, channelId, {
        role: 'assistant',
        content: response.content,
        timestamp: new Date()
      });
      
      // Save AI response to messages
      const db = admin.firestore();
      
      // Get display name for the model
      const modelDisplayName = this.getModelDisplayName(provider, actualModel);
      
      await db.collection('messages').add({
        channelId,
        content: response.content,
        author: 'ai_bot',
        authorName: `Pulse AI (${modelDisplayName})`,
        isAI: true,
        aiModel: actualModel,
        aiProvider: provider,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        usage: response.usage,
        contextUsed: contextMessages.length,
        attachmentsProcessed: processedAttachments.length
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

  // Process direct message for API endpoint
  async processDirectMessage(workspaceId, messages, model, provider, options = {}) {
    try {
      const actualModel = model;
      
      if (provider === 'openai') {
        const response = await this.processOpenAIMessage(
          workspaceId,
          actualModel,
          messages,
          'api_user',
          options
        );
        return response;
      } else if (provider === 'anthropic') {
        const response = await this.processAnthropicMessage(
          workspaceId,
          actualModel,
          messages,
          'api_user',
          options
        );
        return response;
      } else {
        throw new Error(`Unsupported AI provider: ${provider}`);
      }
    } catch (error) {
      console.error('Error in processDirectMessage:', error);
      throw error;
    }
  }

  // Get usage statistics for a workspace
  async getUsageStats(workspaceId, startDate, endDate) {
    const db = admin.firestore();
    
    let query = db.collection('ai_usage')
      .where('workspaceId', '==', workspaceId)
      .where('status', '==', 'success');
    
    if (startDate) {
      query = query.where('timestamp', '>=', startDate);
    }
    
    if (endDate) {
      query = query.where('timestamp', '<=', endDate);
    }
    
    const snapshot = await query.get();
    
    const stats = {
      totalMessages: 0,
      totalTokens: 0,
      totalCost: 0,
      byProvider: {},
      byModel: {},
      byUser: {}
    };
    
    snapshot.forEach(doc => {
      const data = doc.data();
      
      stats.totalMessages++;
      stats.totalTokens += data.totalTokens || 0;
      
      // Calculate cost for this usage
      const cost = this.calculateCost(
        data.provider,
        data.model,
        data.inputTokens || 0,
        data.outputTokens || 0
      );
      stats.totalCost += cost.totalCost;
      
      // Group by provider
      if (!stats.byProvider[data.provider]) {
        stats.byProvider[data.provider] = {
          messages: 0,
          tokens: 0,
          cost: 0
        };
      }
      stats.byProvider[data.provider].messages++;
      stats.byProvider[data.provider].tokens += data.totalTokens || 0;
      stats.byProvider[data.provider].cost += cost.totalCost;
      
      // Group by model
      if (!stats.byModel[data.model]) {
        stats.byModel[data.model] = {
          messages: 0,
          tokens: 0,
          cost: 0
        };
      }
      stats.byModel[data.model].messages++;
      stats.byModel[data.model].tokens += data.totalTokens || 0;
      stats.byModel[data.model].cost += cost.totalCost;
      
      // Group by user
      if (!stats.byUser[data.userId]) {
        stats.byUser[data.userId] = {
          messages: 0,
          tokens: 0,
          cost: 0
        };
      }
      stats.byUser[data.userId].messages++;
      stats.byUser[data.userId].tokens += data.totalTokens || 0;
      stats.byUser[data.userId].cost += cost.totalCost;
    });
    
    return stats;
  }

  // Health check for API keys
  async healthCheck() {
    const results = {
      openai: [],
      anthropic: []
    };
    
    // Check OpenAI keys
    for (let i = 0; i < this.openaiKeys.length; i++) {
      const status = this.keyStatus.get(`openai_${i}`);
      results.openai.push({
        index: i,
        available: status.available,
        lastError: status.lastError,
        errorCount: status.errorCount
      });
    }
    
    // Check Anthropic keys
    for (let i = 0; i < this.anthropicKeys.length; i++) {
      const status = this.keyStatus.get(`anthropic_${i}`);
      results.anthropic.push({
        index: i,
        available: status.available,
        lastError: status.lastError,
        errorCount: status.errorCount
      });
    }
    
    return results;
  }
}

module.exports = new AIService();