// API 가격 정보 (2025년 기준, USD per 10K tokens)
const OPENAI_PRICING = {
  'gpt-5': {
    input: 0.375,
    output: 3.00,
    name: 'GPT-5'
  },
  'gpt-5-mini': {
    input: 0.075,
    output: 0.60,
    name: 'GPT-5 Mini'
  },
  'gpt-4o': {
    input: 0.75,
    output: 3.00,
    name: 'GPT-4o Vision'
  },
  'gpt-4o-mini': {
    input: 0.045,
    output: 0.18,
    name: 'GPT-4o Mini'
  },
  'gpt-4-turbo': {
    input: 3.00,
    output: 6.00,
    name: 'GPT-4 Turbo'
  },
  'gpt-3.5-turbo': {
    input: 0.15,
    output: 0.45,
    name: 'GPT-3.5 Turbo'
  },
  'o3': {
    input: 4.50,
    output: 18.00,
    name: 'o3'
  },
  'o3-mini': {
    input: 0.33,
    output: 1.32,
    name: 'o3 Mini'
  }
};

const ANTHROPIC_PRICING = {
  'claude-opus-4-1-20250805': {
    input: 4.50,
    output: 22.50,
    cacheWrite: 5.625,
    cacheRead: 0.45,
    name: 'Claude Opus 4.1'
  },
  'claude-sonnet-4-20250514': {
    input: 0.90,
    output: 4.50,
    cacheWrite: 1.125,
    cacheRead: 0.09,
    name: 'Claude Sonnet 4'
  },
  'claude-3-5-sonnet-20241022': {
    input: 0.90,
    output: 4.50,
    cacheWrite: 1.125,
    cacheRead: 0.09,
    name: 'Claude 3.5 Sonnet'
  },
  'claude-3-5-haiku-20241022': {
    input: 0.24,
    output: 1.20,
    cacheWrite: 0.30,
    cacheRead: 0.024,
    name: 'Claude 3.5 Haiku'
  }
};

// 가격 계산 함수들
function calculateOpenAICost(model, inputTokens, outputTokens) {
  const pricing = OPENAI_PRICING[model];
  if (!pricing) {
    console.warn(`Unknown OpenAI model: ${model}`);
    // Default to GPT-4o pricing as fallback
    const defaultPricing = OPENAI_PRICING['gpt-4o'];
    const inputCost = (inputTokens / 10000) * defaultPricing.input;
    const outputCost = (outputTokens / 10000) * defaultPricing.output;
    return inputCost + outputCost;
  }

  // Convert from per 10K tokens to actual token count
  const inputCost = (inputTokens / 10000) * pricing.input;
  const outputCost = (outputTokens / 10000) * pricing.output;
  
  return inputCost + outputCost;
}

function calculateAnthropicCost(model, inputTokens, outputTokens, cacheCreationTokens = 0, cacheReadTokens = 0) {
  const pricing = ANTHROPIC_PRICING[model];
  if (!pricing) {
    console.warn(`Unknown Anthropic model: ${model}`);
    // Default to Claude 3.5 Sonnet pricing as fallback
    const defaultPricing = ANTHROPIC_PRICING['claude-3-5-sonnet-20241022'];
    const inputCost = (inputTokens / 10000) * defaultPricing.input;
    const outputCost = (outputTokens / 10000) * defaultPricing.output;
    return inputCost + outputCost;
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

module.exports = {
  OPENAI_PRICING,
  ANTHROPIC_PRICING,
  calculateOpenAICost,
  calculateAnthropicCost
};