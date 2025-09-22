// Enhanced LangChain Service with Streaming, Rate Limiting, Caching, and Structured Output
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { StringOutputParser, StructuredOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables';
import { z } from 'zod';
import usageTrackerService, { TokenUsage } from './usageTrackerService';
import { auth } from '../config/firebase';

// Simple in-memory cache implementation
class SimpleCache<T> {
  private cache: Map<string, { value: T; expiry: number }> = new Map();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = 100, ttlMs: number = 30 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttlMs;
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.value;
  }

  set(key: string, value: T): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttl
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Rate limiting configuration
interface RateLimitConfig {
  maxTokensPerMinute: number;
  maxRequestsPerMinute: number;
  windowMs: number;
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxTokensPerMinute: 100000,
  maxRequestsPerMinute: 100,
  windowMs: 60000, // 1 minute
};

// Streaming options
export interface StreamingOptions {
  onToken?: (token: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

// Structured output schemas
export const MeetingNotesSchema = z.object({
  title: z.string().describe('Meeting title'),
  date: z.string().describe('Meeting date in ISO format'),
  participants: z.array(z.string()).describe('List of participant names'),
  agenda: z.array(z.string()).describe('Meeting agenda items'),
  keyPoints: z.array(z.string()).describe('Key discussion points'),
  actionItems: z.array(z.object({
    task: z.string().describe('Task description'),
    assignee: z.string().describe('Person responsible'),
    deadline: z.string().optional().describe('Due date in ISO format'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  })).describe('Action items with assignees'),
  decisions: z.array(z.string()).describe('Decisions made during the meeting'),
  nextSteps: z.array(z.string()).describe('Next steps to be taken'),
});

export const TaskExtractionSchema = z.array(z.object({
  title: z.string().describe('Task title'),
  description: z.string().describe('Detailed task description'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).describe('Task priority'),
  estimatedTime: z.string().optional().describe('Estimated time to complete (e.g., "2 hours", "1 day")'),
  dependencies: z.array(z.string()).optional().describe('List of dependent tasks'),
  tags: z.array(z.string()).optional().describe('Task tags or categories'),
  assignee: z.string().optional().describe('Person assigned to the task'),
}));

export const GoalSchema = z.object({
  objective: z.string().describe('Main objective'),
  keyResults: z.array(z.object({
    description: z.string(),
    metric: z.string(),
    target: z.string(),
    current: z.string().optional(),
  })).describe('Measurable key results'),
  timeframe: z.string().describe('Goal timeframe (e.g., "Q1 2025", "6 months")'),
  owner: z.string().describe('Goal owner'),
  status: z.enum(['not_started', 'in_progress', 'at_risk', 'on_track', 'completed']),
});

class LangChainEnhancedService {
  private openaiApiKey: string = '';
  private anthropicApiKey: string = '';
  private queryCache: SimpleCache<string>;
  private rateLimitTracker: Map<string, { tokens: number; requests: number; resetTime: number }> = new Map();
  private conversations: Map<string, BaseMessage[]> = new Map();

  constructor() {
    this.openaiApiKey = process.env.REACT_APP_OPENAI_API_KEY || '';
    this.anthropicApiKey = process.env.REACT_APP_ANTHROPIC_API_KEY || '';
    this.queryCache = new SimpleCache<string>(100, 30 * 60 * 1000); // 100 items, 30 min TTL
    
    // Log API key status for debugging
    if (!this.openaiApiKey) {
      console.warn('OpenAI API key not found in environment variables');
    }
    if (!this.anthropicApiKey) {
      console.warn('Anthropic API key not found in environment variables');
    }
  }

  // Check rate limits
  private async checkRateLimit(provider: string, estimatedTokens: number = 1000): Promise<void> {
    const now = Date.now();
    const tracker = this.rateLimitTracker.get(provider) || { 
      tokens: 0, 
      requests: 0, 
      resetTime: now + DEFAULT_RATE_LIMIT.windowMs 
    };

    // Reset if window expired
    if (now > tracker.resetTime) {
      tracker.tokens = 0;
      tracker.requests = 0;
      tracker.resetTime = now + DEFAULT_RATE_LIMIT.windowMs;
    }

    // Check limits
    if (tracker.tokens + estimatedTokens > DEFAULT_RATE_LIMIT.maxTokensPerMinute) {
      const waitTime = tracker.resetTime - now;
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }
    if (tracker.requests + 1 > DEFAULT_RATE_LIMIT.maxRequestsPerMinute) {
      const waitTime = tracker.resetTime - now;
      throw new Error(`Request limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    // Update tracker
    tracker.tokens += estimatedTokens;
    tracker.requests += 1;
    this.rateLimitTracker.set(provider, tracker);
  }

  // Get or create model
  private getModel(provider: 'openai' | 'anthropic', streaming: boolean = false) {
    if (provider === 'openai') {
      if (!this.openaiApiKey) {
        throw new Error('OpenAI API key not configured. Please check REACT_APP_OPENAI_API_KEY environment variable.');
      }
      return new ChatOpenAI({
        openAIApiKey: this.openaiApiKey,
        modelName: 'gpt-4o',
        temperature: 0.7,
        streaming,
        maxRetries: 2,
      });
    } else {
      if (!this.anthropicApiKey) {
        throw new Error('Anthropic API key not configured. Please check REACT_APP_ANTHROPIC_API_KEY environment variable.');
      }
      return new ChatAnthropic({
        apiKey: this.anthropicApiKey,
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.7,
        streaming,
        maxRetries: 2,
      });
    }
  }

  // Stream chat response
  async streamChat(
    message: string,
    provider: 'openai' | 'anthropic' = 'openai',
    systemPrompt?: string,
    sessionId?: string,
    options?: StreamingOptions
  ): Promise<string> {
    try {
      await this.checkRateLimit(provider);
      
      const model = this.getModel(provider, true);
      
      // Get conversation history
      const history = sessionId ? (this.conversations.get(sessionId) || []) : [];
      
      // Build messages
      const messages: BaseMessage[] = [
        new SystemMessage(systemPrompt || 'You are a helpful AI assistant for TeamPulse.'),
        ...history,
        new HumanMessage(message),
      ];

      // Stream response
      let fullResponse = '';
      const stream = await model.stream(messages);
      
      for await (const chunk of stream) {
        const text = chunk.content.toString();
        fullResponse += text;
        options?.onToken?.(text);
      }
      
      // Save to conversation history
      if (sessionId) {
        const updatedHistory = [...history, new HumanMessage(message), new AIMessage(fullResponse)];
        // Keep only last 20 messages to prevent context overflow
        if (updatedHistory.length > 20) {
          updatedHistory.splice(0, updatedHistory.length - 20);
        }
        this.conversations.set(sessionId, updatedHistory);
      }
      
      options?.onComplete?.(fullResponse);
      
      // Track usage (estimate)
      await this.trackUsage(provider, message.length, fullResponse.length);
      
      return fullResponse;
    } catch (error) {
      options?.onError?.(error as Error);
      throw error;
    }
  }

  // Chat with caching
  async chatWithCache(
    message: string,
    provider: 'openai' | 'anthropic' = 'openai',
    systemPrompt?: string,
    useCache: boolean = true
  ): Promise<string> {
    // Create cache key
    const cacheKey = `${provider}:${message}:${systemPrompt || 'default'}`;
    
    // Check cache
    if (useCache) {
      const cached = this.queryCache.get(cacheKey);
      if (cached) {
        console.log('Returning cached response');
        return cached;
      }
    }
    
    // Check rate limit
    await this.checkRateLimit(provider);
    
    // Get response
    const model = this.getModel(provider);
    const messages = [
      new SystemMessage(systemPrompt || 'You are a helpful AI assistant for TeamPulse.'),
      new HumanMessage(message),
    ];
    
    const response = await model.invoke(messages);
    const content = response.content.toString();
    
    // Cache response
    if (useCache) {
      this.queryCache.set(cacheKey, content);
    }
    
    // Track usage
    await this.trackUsage(provider, message.length, content.length);
    
    return content;
  }

  // Generate structured meeting notes
  async generateMeetingNotes(
    transcript: string,
    provider: 'openai' | 'anthropic' = 'openai'
  ): Promise<z.infer<typeof MeetingNotesSchema>> {
    await this.checkRateLimit(provider, 2000);
    
    const parser = StructuredOutputParser.fromZodSchema(MeetingNotesSchema);
    const formatInstructions = parser.getFormatInstructions();
    
    const prompt = ChatPromptTemplate.fromTemplate(
      `You are an expert meeting note taker. Analyze the following meeting transcript and extract structured information.
      
      {format_instructions}
      
      Meeting Transcript:
      {transcript}
      
      Provide a comprehensive structured summary. Ensure all dates are in ISO format (YYYY-MM-DD).`
    );
    
    const model = this.getModel(provider);
    const chain = prompt.pipe(model).pipe(parser);
    
    const result = await chain.invoke({
      transcript,
      format_instructions: formatInstructions,
    });
    
    // Track usage
    await this.trackUsage(provider, transcript.length, JSON.stringify(result).length);
    
    return result;
  }

  // Extract tasks from text
  async extractTasks(
    text: string,
    provider: 'openai' | 'anthropic' = 'openai'
  ): Promise<z.infer<typeof TaskExtractionSchema>> {
    await this.checkRateLimit(provider, 1500);
    
    const parser = StructuredOutputParser.fromZodSchema(TaskExtractionSchema);
    const formatInstructions = parser.getFormatInstructions();
    
    const prompt = ChatPromptTemplate.fromTemplate(
      `You are a task extraction expert. Extract all actionable tasks from the following text.
      
      {format_instructions}
      
      Text:
      {text}
      
      Extract and structure all tasks. Be thorough and include implicit tasks.`
    );
    
    const model = this.getModel(provider);
    const chain = prompt.pipe(model).pipe(parser);
    
    const result = await chain.invoke({
      text,
      format_instructions: formatInstructions,
    });
    
    // Track usage
    await this.trackUsage(provider, text.length, JSON.stringify(result).length);
    
    return result;
  }

  // Generate OKR from description
  async generateOKR(
    description: string,
    provider: 'openai' | 'anthropic' = 'openai'
  ): Promise<z.infer<typeof GoalSchema>> {
    await this.checkRateLimit(provider, 1000);
    
    const parser = StructuredOutputParser.fromZodSchema(GoalSchema);
    const formatInstructions = parser.getFormatInstructions();
    
    const prompt = ChatPromptTemplate.fromTemplate(
      `You are an OKR (Objectives and Key Results) expert. Create a structured OKR from the following description.
      
      {format_instructions}
      
      Description:
      {description}
      
      Generate a SMART goal with measurable key results.`
    );
    
    const model = this.getModel(provider);
    const chain = prompt.pipe(model).pipe(parser);
    
    const result = await chain.invoke({
      description,
      format_instructions: formatInstructions,
    });
    
    // Track usage
    await this.trackUsage(provider, description.length, JSON.stringify(result).length);
    
    return result;
  }

  // Smart summarization with different strategies
  async summarize(
    text: string,
    strategy: 'brief' | 'detailed' | 'bullets' | 'executive' = 'brief',
    provider: 'openai' | 'anthropic' = 'openai'
  ): Promise<string> {
    const cacheKey = `summarize:${provider}:${strategy}:${text.substring(0, 100)}`;
    const cached = this.queryCache.get(cacheKey);
    if (cached) return cached;
    
    await this.checkRateLimit(provider, 1000);
    
    const prompts = {
      brief: 'Provide a brief 2-3 sentence summary of the following text:',
      detailed: 'Provide a comprehensive summary preserving all key information from the following text:',
      bullets: 'Summarize the following text as bullet points:',
      executive: 'Provide an executive summary suitable for leadership, focusing on key decisions and outcomes:',
    };
    
    const model = this.getModel(provider);
    const messages = [
      new SystemMessage(prompts[strategy]),
      new HumanMessage(text),
    ];
    
    const response = await model.invoke(messages);
    const summary = response.content.toString();
    
    this.queryCache.set(cacheKey, summary);
    await this.trackUsage(provider, text.length, summary.length);
    
    return summary;
  }

  // Track usage for billing
  private async trackUsage(provider: string, inputChars: number, outputChars: number) {
    const user = auth.currentUser;
    if (!user) return;
    
    // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
    const inputTokens = Math.ceil(inputChars / 4);
    const outputTokens = Math.ceil(outputChars / 4);
    
    const usage: TokenUsage = {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
    };
    
    const model = provider === 'openai' ? 'gpt-4o' : 'claude-3-5-sonnet-20241022';
    
    try {
      await usageTrackerService.recordUsage({
        userId: user.uid,
        userName: user.displayName || user.email || 'Unknown',
        workspaceId: 'default', // Should be passed from context
        model,
        usage,
        metadata: {
          messageType: 'enhanced_chat',
        },
      });
    } catch (error) {
      console.error('Failed to track usage:', error);
    }
  }

  // Clear cache
  clearCache(): void {
    this.queryCache.clear();
  }

  // Clear conversation history
  clearConversation(sessionId: string): void {
    this.conversations.delete(sessionId);
  }
}

export default new LangChainEnhancedService();