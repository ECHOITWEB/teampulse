// ChatInterface.ts - Common interface for all chat models
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string | MessageContent[];
  attachments?: Attachment[];
  timestamp: Date;
  model?: string;
  usage?: TokenUsage;
  isError?: boolean;
  isStreaming?: boolean;
}

export interface MessageContent {
  type: 'text' | 'image' | 'code' | 'canvas' | 'artifact';
  text?: string;
  url?: string;
  language?: string;
  title?: string;
  data?: any;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  data?: string; // base64 encoded data for images
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost?: number;
}

export interface ChatConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stream?: boolean;
  // GPT-5 specific parameters
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
  textVerbosity?: 'low' | 'medium' | 'high';
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic';
  contextWindow: number;
  maxOutput: number;
  supportedFeatures: string[];
  pricing: {
    input: number;  // per 10K tokens
    output: number; // per 10K tokens
  };
}

export interface ChatComponentProps {
  workspaceId: string;
  channelId: string;
  userId: string;
  model: string;
  onMessage?: (message: Message) => void;
  onError?: (error: Error) => void;
  onTokenUsage?: (usage: TokenUsage) => void;
}

export abstract class ChatComponent {
  abstract sendMessage(
    content: string,
    attachments?: Attachment[],
    config?: ChatConfig
  ): Promise<Message>;
  
  abstract streamMessage(
    content: string,
    attachments?: Attachment[],
    config?: ChatConfig,
    onChunk?: (chunk: string) => void
  ): Promise<Message>;
  
  abstract formatResponse(response: any): Message;
  
  abstract estimateTokens(content: string, attachments?: Attachment[]): number;
  
  abstract calculateCost(usage: TokenUsage): number;
  
  abstract getModelInfo(): ModelInfo;
  
  abstract supportsFeature(feature: string): boolean;
}