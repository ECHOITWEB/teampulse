// API 가격 정보 (2025년 기준, USD per 10K tokens)
// 가격 가이드: /docs/guide/token_pricing_guide.md

export const OPENAI_PRICING = {
  // GPT-5 시리즈 (2025년 최신)
  'gpt-5': {
    input: 0.375,    // $0.0375 per 10K tokens
    output: 3.00,    // $0.30 per 10K tokens
    name: 'GPT-5'
  },
  'gpt-5-mini': {
    input: 0.075,    // $0.0075 per 10K tokens
    output: 0.60,    // $0.06 per 10K tokens
    name: 'GPT-5 Mini'
  },
  'gpt-5-nano': {
    input: 0.015,    // $0.0015 per 10K tokens
    output: 0.12,    // $0.012 per 10K tokens
    name: 'GPT-5 Nano'
  },
  'gpt-5-chat-latest': {
    input: 0.375,
    output: 3.00,
    name: 'GPT-5 Chat'
  },
  
  // GPT-4 시리즈
  'gpt-4-turbo': {
    input: 3.00,     // $0.30 per 10K tokens
    output: 6.00,    // $0.60 per 10K tokens
    name: 'GPT-4 Turbo'
  },
  'gpt-4-turbo-preview': {
    input: 3.00,
    output: 6.00,
    name: 'GPT-4 Turbo Preview'
  },
  'gpt-4o': {
    input: 0.75,     // $0.075 per 10K tokens
    output: 3.00,    // $0.30 per 10K tokens
    name: 'GPT-4o Vision'
  },
  'gpt-4o-mini': {
    input: 0.045,    // $0.0045 per 10K tokens
    output: 0.18,    // $0.018 per 10K tokens
    name: 'GPT-4o Mini'
  },
  'gpt-4': {
    input: 3.00,
    output: 6.00,
    name: 'GPT-4'
  },
  
  // GPT-3.5 시리즈
  'gpt-3.5-turbo': {
    input: 0.15,     // $0.015 per 10K tokens
    output: 0.45,    // $0.045 per 10K tokens
    name: 'GPT-3.5 Turbo'
  },
  'gpt-3.5-turbo-instruct': {
    input: 0.45,     // $0.045 per 10K tokens
    output: 0.60,    // $0.06 per 10K tokens
    name: 'GPT-3.5 Turbo Instruct'
  },
  
  // 추론 모델 (Reasoning Models)
  'o3': {
    input: 4.50,     // $0.45 per 10K tokens
    output: 18.00,   // $1.80 per 10K tokens
    name: 'o3'
  },
  'o3-mini': {
    input: 0.33,     // $0.033 per 10K tokens
    output: 1.32,    // $0.132 per 10K tokens
    name: 'o3 Mini'
  },
  'o1': {
    input: 4.50,
    output: 18.00,
    name: 'o1'
  },
  'o1-mini': {
    input: 0.90,     // $0.09 per 10K tokens
    output: 3.60,    // $0.36 per 10K tokens
    name: 'o1 Mini'
  },
  
  // DALL-E (이미지 생성)
  'dall-e-3': {
    input: 0,
    output: 0,
    name: 'DALL-E 3',
    perImage: {
      '1024x1024': { standard: 0.12, hd: 0.24 },
      '1024x1792': { standard: 0.12, hd: 0.24 },
      '1792x1024': { standard: 0.12, hd: 0.24 }
    }
  },
  'dall-e-2': {
    input: 0,
    output: 0,
    name: 'DALL-E 2',
    perImage: {
      '1024x1024': 0.06,
      '512x512': 0.054,
      '256x256': 0.048
    }
  },
  
  // 임베딩 모델
  'text-embedding-3-large': {
    input: 0.039,    // $0.0039 per 10K tokens
    output: 0,
    name: 'Text Embedding 3 Large'
  },
  'text-embedding-3-small': {
    input: 0.006,    // $0.0006 per 10K tokens
    output: 0,
    name: 'Text Embedding 3 Small'
  },
  'text-embedding-ada-002': {
    input: 0.03,     // $0.003 per 10K tokens
    output: 0,
    name: 'Text Embedding Ada'
  }
};

export const ANTHROPIC_PRICING = {
  // Claude Opus 4 시리즈 (2025년 최신)
  'claude-opus-4-1-20250805': {
    input: 4.50,     // $0.45 per 10K tokens
    output: 22.50,   // $2.25 per 10K tokens
    cacheWrite: 5.625,  // $0.5625 per 10K tokens
    cacheRead: 0.45,    // $0.045 per 10K tokens
    name: 'Claude Opus 4.1'
  },
  'claude-opus-4-20250514': {
    input: 4.50,
    output: 22.50,
    cacheWrite: 5.625,
    cacheRead: 0.45,
    name: 'Claude Opus 4'
  },
  
  // Claude Sonnet 4 시리즈
  'claude-sonnet-4-20250514': {
    input: 0.90,     // $0.09 per 10K tokens
    output: 4.50,    // $0.45 per 10K tokens
    cacheWrite: 1.125,  // $0.1125 per 10K tokens
    cacheRead: 0.09,    // $0.009 per 10K tokens
    name: 'Claude Sonnet 4'
  },
  
  // Claude 3.7 시리즈
  'claude-3-7-sonnet-20250219': {
    input: 0.90,
    output: 4.50,
    cacheWrite: 1.125,
    cacheRead: 0.09,
    name: 'Claude Sonnet 3.7'
  },
  
  // Claude 3.5 시리즈
  'claude-3-5-sonnet-20241022': {
    input: 0.90,
    output: 4.50,
    cacheWrite: 1.125,
    cacheRead: 0.09,
    name: 'Claude 3.5 Sonnet'
  },
  'claude-3-5-haiku-20241022': {
    input: 0.24,     // $0.024 per 10K tokens
    output: 1.20,    // $0.12 per 10K tokens
    cacheWrite: 0.30,   // $0.03 per 10K tokens
    cacheRead: 0.024,   // $0.0024 per 10K tokens
    name: 'Claude 3.5 Haiku'
  },
  
  // Claude 3 시리즈 (레거시)
  'claude-3-opus-20240229': {
    input: 4.50,
    output: 22.50,
    cacheWrite: 5.625,
    cacheRead: 0.45,
    name: 'Claude 3 Opus'
  },
  'claude-3-sonnet-20240229': {
    input: 0.90,
    output: 4.50,
    cacheWrite: 1.125,
    cacheRead: 0.09,
    name: 'Claude 3 Sonnet'
  },
  'claude-3-haiku-20240307': {
    input: 0.075,    // $0.0075 per 10K tokens
    output: 0.375,   // $0.0375 per 10K tokens
    cacheWrite: 0.09,   // $0.009 per 10K tokens
    cacheRead: 0.009,   // $0.0009 per 10K tokens
    name: 'Claude 3 Haiku'
  }
};

// 특수 기능 가격 (OpenAI)
export const OPENAI_FEATURES = {
  webSearch: 75,        // $75 per 1,000 calls
  codeInterpreter: 0.09, // $0.09 per session
  fileSearch: 0.30,     // $0.30 per GB per day
  fileStorage: 0.60     // $0.60 per GB per day
};

// 특수 기능 가격 (Anthropic)
export const ANTHROPIC_FEATURES = {
  webSearch: 30,        // $30 per 1,000 searches
  codeExecution: 0.15   // $0.15 per hour per container (after 50 free hours)
};

// KRW 환율 (실시간으로 업데이트하거나 고정값 사용)
export const USD_TO_KRW = 1300; // 1 USD = 1,300 KRW

// 가격 계산 헬퍼 함수
export function calculateOpenAICost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = OPENAI_PRICING[model as keyof typeof OPENAI_PRICING];
  if (!pricing) {
    console.warn(`Unknown OpenAI model: ${model}`);
    return 0;
  }

  // Convert from per 10K tokens to actual token count
  const inputCost = (inputTokens / 10000) * pricing.input;
  const outputCost = (outputTokens / 10000) * pricing.output;
  
  return inputCost + outputCost;
}

export function calculateAnthropicCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheCreationTokens: number = 0,
  cacheReadTokens: number = 0
): number {
  const pricing = ANTHROPIC_PRICING[model as keyof typeof ANTHROPIC_PRICING];
  if (!pricing) {
    console.warn(`Unknown Anthropic model: ${model}`);
    return 0;
  }

  let totalCost = 0;
  
  // 기본 입력/출력 토큰 비용 (per 10K tokens)
  totalCost += (inputTokens / 10000) * pricing.input;
  totalCost += (outputTokens / 10000) * pricing.output;
  
  // 캐시 관련 비용
  if (cacheCreationTokens && pricing.cacheWrite) {
    totalCost += (cacheCreationTokens / 10000) * pricing.cacheWrite;
  }
  if (cacheReadTokens && pricing.cacheRead) {
    totalCost += (cacheReadTokens / 10000) * pricing.cacheRead;
  }
  
  return totalCost;
}

// USD를 KRW로 변환
export function usdToKrw(usd: number): number {
  return Math.round(usd * USD_TO_KRW);
}

// Pulse 변환 함수들 (10원 = 1 Pulse)
export const PULSE_RATE = 10; // 10 KRW = 1 Pulse
export const DEFAULT_WORKSPACE_PULSE = 10000; // 워크스페이스당 기본 10,000 Pulse

// KRW를 Pulse로 변환 (소수점 제거)
export function krwToPulse(krw: number): number {
  return Math.floor(krw / PULSE_RATE);
}

// Pulse를 KRW로 변환
export function pulseToKrw(pulse: number): number {
  return pulse * PULSE_RATE;
}

// USD를 Pulse로 변환 (USD -> KRW -> Pulse)
export function usdToPulse(usd: number): number {
  const krw = usdToKrw(usd);
  return krwToPulse(krw);
}

// 비용을 Pulse 단위로 계산 (OpenAI)
export function calculateOpenAICostInPulse(model: string, inputTokens: number, outputTokens: number): number {
  const costUsd = calculateOpenAICost(model, inputTokens, outputTokens);
  return usdToPulse(costUsd);
}

// 비용을 Pulse 단위로 계산 (Anthropic)
export function calculateAnthropicCostInPulse(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheCreationTokens: number = 0,
  cacheReadTokens: number = 0
): number {
  const costUsd = calculateAnthropicCost(model, inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens);
  return usdToPulse(costUsd);
}

// 모델 이름으로 제공자 판별
export function getProviderFromModel(model: string): 'openai' | 'anthropic' | 'unknown' {
  const lowerModel = model.toLowerCase();
  
  if (lowerModel.includes('gpt') || 
      lowerModel.includes('dall-e') || 
      lowerModel.includes('o1') || 
      lowerModel.includes('o3') ||
      lowerModel.includes('embedding') ||
      lowerModel.includes('whisper') ||
      lowerModel.includes('tts')) {
    return 'openai';
  }
  
  if (lowerModel.includes('claude')) {
    return 'anthropic';
  }
  
  return 'unknown';
}

// 모델 표시 이름 가져오기
export function getModelDisplayName(model: string): string {
  const openaiModel = OPENAI_PRICING[model as keyof typeof OPENAI_PRICING];
  if (openaiModel) return openaiModel.name;
  
  const anthropicModel = ANTHROPIC_PRICING[model as keyof typeof ANTHROPIC_PRICING];
  if (anthropicModel) return anthropicModel.name;
  
  return model;
}

// 모델 선택 가이드
export const MODEL_RECOMMENDATIONS = {
  generalChat: 'gpt-4o-mini',        // 일반 대화 - 비용 효율적
  professionalCoding: 'gpt-5',       // 전문 코딩 - 최고 성능
  complexReasoning: 'o3',            // 복잡한 추론
  bulkProcessing: 'gpt-3.5-turbo',   // 대량 처리 - 최저 비용
  contentGeneration: 'claude-3-5-sonnet-20241022', // 콘텐츠 생성
  quickResponse: 'claude-3-5-haiku-20241022',      // 빠른 응답
  imageGeneration: 'dall-e-3',       // 이미지 생성
  economicalImage: 'dall-e-2'        // 경제적 이미지 생성
};