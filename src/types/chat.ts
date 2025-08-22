// 채팅 관련 타입 정의

export interface Channel {
  id: string;
  name: string;
  displayName?: string;
  type: 'public' | 'private' | 'secret' | 'dm';
  workspaceId: string;
  createdBy: string;
  createdAt: Date;
  members?: string[]; // User IDs (optional for public channels)
  admins: string[]; // User IDs who can manage channel
  description?: string;
  lastActivity?: Date;
  isDefault?: boolean;
  aiBot?: {
    provider: 'openai' | 'claude';
    model: string;
    invitedBy: string;
    invitedAt: Date;
  };
}

export interface Message {
  id: string;
  channelId: string;
  content: string;
  author: string; // User ID
  authorName: string;
  authorAvatar?: string;
  isAI?: boolean;
  aiModel?: string;
  timestamp: Date;
  edited?: boolean;
  editedAt?: Date;
  attachments?: Attachment[];
  reactions?: Reaction[];
  replyTo?: string; // Message ID
  status?: 'sending' | 'sent' | 'failed';
  mentions?: string[]; // User IDs mentioned
  isLoading?: boolean; // Loading indicator for AI responses
  isStreaming?: boolean; // Streaming indicator for real-time AI responses
  isTemporary?: boolean; // Temporary message (e.g., loading messages to be replaced)
  isError?: boolean; // Error message indicator
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    cost?: {
      inputCost?: number;
      outputCost?: number;
      totalCost?: number;
      currency?: string;
    };
  };
}

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'file' | 'code';
  name: string;
  url: string;
  size: number; // bytes
  mimeType?: string;
  preview?: string; // For images/videos
  language?: string; // For code files
  content?: string; // For code display
  base64Data?: string; // For AI multimodal processing
}

export interface Reaction {
  emoji: string;
  users: string[]; // User IDs
  count: number;
}

export interface DirectMessage {
  id: string;
  participants: string[]; // Two user IDs
  lastMessage?: string;
  lastActivity?: Date;
  unreadCount: Record<string, number>; // userId -> unread count
}

export interface WorkspaceStorage {
  workspaceId: string;
  usedBytes: number;
  maxBytes: number; // Default 5GB per workspace
  fileCount: number;
}

// AI Model configurations
export interface AIModel {
  provider: 'openai' | 'claude';
  model: string;
  displayName: string;
  description: string;
  inputPrice: number; // per 1K tokens in KRW
  outputPrice: number; // per 1K tokens in KRW
  recommended?: boolean;
  category?: 'fast' | 'balanced' | 'powerful';
}

export const AI_MODELS: AIModel[] = [
  // OpenAI Models - GPT-5 Series
  {
    provider: 'openai',
    model: 'gpt-5-nano',
    displayName: 'GPT-5-nano',
    description: '초경량 초고속 모델, 간단한 작업에 최적',
    inputPrice: 0.15,
    outputPrice: 1.2,
    category: 'fast'
  },
  {
    provider: 'openai',
    model: 'gpt-5-mini',
    displayName: 'GPT-5-mini',
    description: '빠르고 효율적인 모델, 일상 대화에 적합',
    inputPrice: 0.75,
    outputPrice: 6,
    recommended: true,
    category: 'fast'
  },
  {
    provider: 'openai',
    model: 'gpt-5',
    displayName: 'GPT-5',
    description: '최신 AI, 복잡한 추론과 코딩에 최적',
    inputPrice: 3.75,
    outputPrice: 30,
    recommended: true,
    category: 'powerful'
  },
  // OpenAI Models - GPT-4 Series
  {
    provider: 'openai',
    model: 'gpt-4.1',
    displayName: 'GPT-4.1',
    description: '안정적이고 강력한 범용 모델',
    inputPrice: 10,
    outputPrice: 30,
    category: 'balanced'
  },
  {
    provider: 'openai',
    model: 'gpt-4.1-mini',
    displayName: 'GPT-4.1-mini',
    description: '경제적인 GPT-4 버전',
    inputPrice: 0.15,
    outputPrice: 0.6,
    category: 'fast'
  },
  {
    provider: 'openai',
    model: 'gpt-4o',
    displayName: 'GPT-4o',
    description: '멀티모달 지원, 이미지 분석 가능',
    inputPrice: 5,
    outputPrice: 15,
    category: 'balanced'
  },
  // Claude Models - Haiku Series
  {
    provider: 'claude',
    model: 'claude-3-5-haiku-20241022',
    displayName: 'Claude Haiku 3.5',
    description: '빠르고 경제적, 간단한 작업에 적합',
    inputPrice: 2.4,
    outputPrice: 12,
    category: 'fast'
  },
  // Claude Models - Sonnet Series
  {
    provider: 'claude',
    model: 'claude-3-7-sonnet-20250219',
    displayName: 'Claude Sonnet 3.7',
    description: '균형잡힌 성능, 대부분의 작업에 적합',
    inputPrice: 9,
    outputPrice: 45,
    category: 'balanced'
  },
  {
    provider: 'claude',
    model: 'claude-sonnet-4-20250514',
    displayName: 'Claude Sonnet 4',
    description: '향상된 추론 능력, 복잡한 대화 가능',
    inputPrice: 9,
    outputPrice: 45,
    recommended: true,
    category: 'balanced'
  },
  // Claude Models - Opus Series
  {
    provider: 'claude',
    model: 'claude-opus-4-20250514',
    displayName: 'Claude Opus 4',
    description: '최고 성능, 전문적인 분석과 창작',
    inputPrice: 45,
    outputPrice: 225,
    category: 'powerful'
  },
  {
    provider: 'claude',
    model: 'claude-opus-4-1-20250805',
    displayName: 'Claude Opus 4.1',
    description: '최신 최강 AI, 논문 수준의 분석 가능',
    inputPrice: 45,
    outputPrice: 225,
    recommended: true,
    category: 'powerful'
  }
];