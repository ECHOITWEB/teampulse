// Token Pricing Utility based on token_pricing_guide.md

export interface TokenPricing {
  input: number;  // per 10K tokens in cents
  output: number; // per 10K tokens in cents
}

export interface ModelPricing {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic';
  pricing: TokenPricing;
  contextWindow: number;
  maxOutput: number;
  features?: string[];
}

// OpenAI Models Pricing (2025 pricing - 3x adjusted)
export const OPENAI_MODELS: Record<string, ModelPricing> = {
  'gpt-5': {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'openai',
    pricing: { input: 37.5, output: 300 }, // $0.0375 / $0.30 per 10K
    contextWindow: 272000,
    maxOutput: 128000,
    features: ['최고 성능', '코딩 특화', '멀티모달']
  },
  'gpt-5-mini': {
    id: 'gpt-5-mini',
    name: 'GPT-5-mini',
    provider: 'openai',
    pricing: { input: 7.5, output: 60 }, // $0.0075 / $0.06 per 10K
    contextWindow: 272000,
    maxOutput: 128000,
    features: ['균형잡힌 성능/비용', '멀티모달']
  },
  'gpt-5-nano': {
    id: 'gpt-5-nano',
    name: 'GPT-5-nano',
    provider: 'openai',
    pricing: { input: 1.5, output: 12 }, // $0.0015 / $0.012 per 10K
    contextWindow: 272000,
    maxOutput: 128000,
    features: ['가장 경제적', '빠른 응답']
  },
  'gpt-4.1': {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    provider: 'openai',
    pricing: { input: 30, output: 60 }, // GPT-4 Turbo pricing
    contextWindow: 128000,
    maxOutput: 4096,
    features: ['고급 추론', '멀티모달']
  },
  'gpt-4.1-mini': {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1-mini',
    provider: 'openai',
    pricing: { input: 4.5, output: 18 }, // GPT-4o-mini pricing
    contextWindow: 128000,
    maxOutput: 4096,
    features: ['경제적', '빠른 응답']
  },
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    pricing: { input: 7.5, output: 30 }, // $0.075 / $0.30 per 10K
    contextWindow: 128000,
    maxOutput: 4096,
    features: ['멀티모달', '빠른 속도', '웹 검색']
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4o-mini',
    provider: 'openai',
    pricing: { input: 0.45, output: 1.8 }, // $0.0045 / $0.018 per 10K
    contextWindow: 128000,
    maxOutput: 4096,
    features: ['최고 비용 효율성', '빠른 응답']
  }
};

// Anthropic Claude Models Pricing
export const CLAUDE_MODELS: Record<string, ModelPricing> = {
  'claude-opus-4-1-20250805': {
    id: 'claude-opus-4-1-20250805',
    name: 'Claude Opus 4.1',
    provider: 'anthropic',
    pricing: { input: 45, output: 225 }, // $0.45 / $2.25 per 10K
    contextWindow: 200000,
    maxOutput: 4096,
    features: ['최고 지능', '복잡한 작업', 'Artifacts', 'PDF 지원']
  },
  'claude-opus-4-20250514': {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    provider: 'anthropic',
    pricing: { input: 45, output: 225 },
    contextWindow: 200000,
    maxOutput: 4096,
    features: ['고급 추론', 'Artifacts', 'PDF 지원']
  },
  'claude-sonnet-4-20250514': {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    pricing: { input: 9, output: 45 }, // $0.09 / $0.45 per 10K
    contextWindow: 200000,
    maxOutput: 4096,
    features: ['균형잡힌 성능', 'Artifacts']
  },
  'claude-3-7-sonnet-20250219': {
    id: 'claude-3-7-sonnet-20250219',
    name: 'Claude Sonnet 3.7',
    provider: 'anthropic',
    pricing: { input: 9, output: 45 },
    contextWindow: 200000,
    maxOutput: 4096,
    features: ['균형잡힌 성능', 'Artifacts']
  },
  'claude-3-5-haiku-20241022': {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude Haiku 3.5',
    provider: 'anthropic',
    pricing: { input: 2.4, output: 12 }, // $0.024 / $0.12 per 10K
    contextWindow: 200000,
    maxOutput: 4096,
    features: ['빠르고 경제적', '기본 작업']
  }
};

export const ALL_MODELS = { ...OPENAI_MODELS, ...CLAUDE_MODELS };

// Calculate token cost
export function calculateTokenCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): { inputCost: number; outputCost: number; totalCost: number; costString: string } {
  const model = ALL_MODELS[modelId];
  if (!model) {
    return { inputCost: 0, outputCost: 0, totalCost: 0, costString: '$0.00' };
  }

  const inputCost = (inputTokens / 10000) * model.pricing.input;
  const outputCost = (outputTokens / 10000) * model.pricing.output;
  const totalCost = inputCost + outputCost;

  // Format cost string in cents or dollars
  let costString: string;
  if (totalCost < 1) {
    costString = `${totalCost.toFixed(2)}¢`;
  } else {
    costString = `$${(totalCost / 100).toFixed(2)}`;
  }

  return {
    inputCost,
    outputCost,
    totalCost,
    costString
  };
}

// Estimate tokens for text (approximate)
export function estimateTokens(text: string): number {
  // Korean: ~1 token per 2.5 characters
  // English: ~1 token per 4 characters
  const koreanChars = (text.match(/[가-힣]/g) || []).length;
  const otherChars = text.length - koreanChars;
  
  const koreanTokens = Math.ceil(koreanChars / 2.5);
  const otherTokens = Math.ceil(otherChars / 4);
  
  return koreanTokens + otherTokens;
}

// Get model recommendations based on use case
export function getModelRecommendation(useCase: string): string[] {
  const recommendations: Record<string, string[]> = {
    'general': ['gpt-4o-mini', 'claude-3-5-haiku-20241022'],
    'coding': ['gpt-5', 'claude-opus-4-1-20250805', 'gpt-4o'],
    'complex': ['claude-opus-4-1-20250805', 'gpt-5'],
    'economic': ['gpt-5-nano', 'gpt-4o-mini', 'claude-3-5-haiku-20241022'],
    'multimodal': ['gpt-5', 'gpt-4o', 'claude-opus-4-1-20250805'],
    'artifacts': ['claude-opus-4-1-20250805', 'claude-sonnet-4-20250514']
  };
  
  return recommendations[useCase] || recommendations['general'];
}

// Format model info for display
export function formatModelInfo(modelId: string): string {
  const model = ALL_MODELS[modelId];
  if (!model) return 'Unknown Model';
  
  const inputPrice = model.pricing.input >= 100 
    ? `$${(model.pricing.input / 100).toFixed(2)}`
    : `${model.pricing.input.toFixed(1)}¢`;
    
  const outputPrice = model.pricing.output >= 100
    ? `$${(model.pricing.output / 100).toFixed(2)}`
    : `${model.pricing.output.toFixed(1)}¢`;
  
  return `${model.name} (입력: ${inputPrice}/출력: ${outputPrice} per 10K 토큰)`;
}

// Get cost indicator color
export function getCostIndicatorColor(modelId: string): string {
  const model = ALL_MODELS[modelId];
  if (!model) return 'gray';
  
  const avgCost = (model.pricing.input + model.pricing.output) / 2;
  
  if (avgCost < 10) return 'green';  // Very cheap
  if (avgCost < 50) return 'yellow'; // Moderate
  if (avgCost < 100) return 'orange'; // Expensive
  return 'red'; // Very expensive
}

// Monthly cost estimation
export function estimateMonthlyCost(
  modelId: string,
  dailyMessages: number,
  avgTokensPerMessage: number = 200
): { daily: number; monthly: number; formatted: string } {
  const model = ALL_MODELS[modelId];
  if (!model) return { daily: 0, monthly: 0, formatted: '$0.00' };
  
  // Assume 50/50 split between input and output
  const dailyTokens = dailyMessages * avgTokensPerMessage;
  const inputTokens = dailyTokens / 2;
  const outputTokens = dailyTokens / 2;
  
  const { totalCost } = calculateTokenCost(modelId, inputTokens, outputTokens);
  const dailyCost = totalCost;
  const monthlyCost = dailyCost * 30;
  
  const formatted = monthlyCost >= 100 
    ? `$${(monthlyCost / 100).toFixed(2)}/월`
    : `${monthlyCost.toFixed(1)}¢/월`;
  
  return {
    daily: dailyCost,
    monthly: monthlyCost,
    formatted
  };
}