/**
 * TeamPulse 과금 체계 설정
 * 모든 금액은 한국 원화(KRW) 기준
 */

export const PRICING = {
  // 기본 구독료
  subscription: {
    monthly_per_user: 4000, // 월 4,000원/1인
    annual_discount: 0.2, // 연간 결제 시 20% 할인
  },
  
  // AI 모델별 토큰 과금 (원/10,000토큰)
  // 달러→원화 환율: $1 = 1,400원 적용
  ai_tokens: {
    gpt: {
      // GPT-5 시리즈
      'GPT-5': {
        input: 53,      // $0.0375/10K tokens × 1400 = ₩52.5/10K tokens
        output: 420,    // $0.30/10K tokens × 1400 = ₩420/10K tokens
      },
      'GPT-5-mini': {
        input: 11,      // $0.0075/10K tokens × 1400 = ₩10.5/10K tokens
        output: 84,     // $0.06/10K tokens × 1400 = ₩84/10K tokens
      },
      'GPT-5-nano': {
        input: 2,       // $0.0015/10K tokens × 1400 = ₩2.1/10K tokens
        output: 17,     // $0.012/10K tokens × 1400 = ₩16.8/10K tokens
      },
      // GPT-4 시리즈
      'GPT-4 Turbo': {
        input: 420,     // $0.30/10K tokens × 1400 = ₩420/10K tokens
        output: 840,    // $0.60/10K tokens × 1400 = ₩840/10K tokens
      },
      'GPT-4o': {
        input: 105,     // $0.075/10K tokens × 1400 = ₩105/10K tokens
        output: 420,    // $0.30/10K tokens × 1400 = ₩420/10K tokens
      },
      'GPT-4o-mini': {
        input: 6,       // $0.0045/10K tokens × 1400 = ₩6.3/10K tokens
        output: 25,     // $0.018/10K tokens × 1400 = ₩25.2/10K tokens
      },
      // GPT-3.5 시리즈
      'GPT-3.5-turbo': {
        input: 21,      // $0.015/10K tokens × 1400 = ₩21/10K tokens
        output: 63,     // $0.045/10K tokens × 1400 = ₩63/10K tokens
      },
      'GPT-3.5-turbo-instruct': {
        input: 63,      // $0.045/10K tokens × 1400 = ₩63/10K tokens
        output: 84,     // $0.06/10K tokens × 1400 = ₩84/10K tokens
      },
      // 추론 모델
      'o3': {
        input: 630,     // $0.45/10K tokens × 1400 = ₩630/10K tokens
        output: 2520,   // $1.80/10K tokens × 1400 = ₩2520/10K tokens
      },
      'o3-mini': {
        input: 46,      // $0.033/10K tokens × 1400 = ₩46.2/10K tokens
        output: 185,    // $0.132/10K tokens × 1400 = ₩184.8/10K tokens
      },
      'o1': {
        input: 630,     // $0.45/10K tokens × 1400 = ₩630/10K tokens
        output: 2520,   // $1.80/10K tokens × 1400 = ₩2520/10K tokens
      },
      'o1-mini': {
        input: 126,     // $0.09/10K tokens × 1400 = ₩126/10K tokens
        output: 504,    // $0.36/10K tokens × 1400 = ₩504/10K tokens
      }
    },
    claude: {
      // Claude 4 시리즈
      'Claude Opus 4.1': {
        input: 630,     // $0.45/10K tokens × 1400 = ₩630/10K tokens
        output: 3150,   // $2.25/10K tokens × 1400 = ₩3150/10K tokens
      },
      'Claude Opus 4': {
        input: 630,     // $0.45/10K tokens × 1400 = ₩630/10K tokens
        output: 3150,   // $2.25/10K tokens × 1400 = ₩3150/10K tokens
      },
      'Claude Sonnet 4': {
        input: 126,     // $0.09/10K tokens × 1400 = ₩126/10K tokens
        output: 630,    // $0.45/10K tokens × 1400 = ₩630/10K tokens
      },
      'Claude Haiku 3.5': {
        input: 34,      // $0.024/10K tokens × 1400 = ₩33.6/10K tokens
        output: 168,    // $0.12/10K tokens × 1400 = ₩168/10K tokens
      },
      // Claude 3 시리즈 (레거시)
      'Claude Opus 3': {
        input: 630,     // $0.45/10K tokens × 1400 = ₩630/10K tokens
        output: 3150,   // $2.25/10K tokens × 1400 = ₩3150/10K tokens
      },
      'Claude Sonnet 3.7': {
        input: 126,     // $0.09/10K tokens × 1400 = ₩126/10K tokens
        output: 630,    // $0.45/10K tokens × 1400 = ₩630/10K tokens
      },
      'Claude Haiku 3': {
        input: 11,      // $0.0075/10K tokens × 1400 = ₩10.5/10K tokens
        output: 53,     // $0.0375/10K tokens × 1400 = ₩52.5/10K tokens
      }
    }
  },
  
  // 플랜별 포함 토큰 및 할인율
  plans: {
    free: {
      name: 'Free',
      price_per_user: 0,
      included_tokens: 10000,    // 월 10,000 토큰 포함
      token_discount: 0,         // 추가 토큰 할인 없음
      max_users: 5,
      features: [
        '기본 채팅 기능',
        '프로젝트 관리',
        '월 10,000 AI 토큰',
        '커뮤니티 지원'
      ]
    },
    starter: {
      name: 'Starter',
      price_per_user: 4000,      // 월 4,000원/1인
      included_tokens: 50000,    // 월 50,000 토큰 포함
      token_discount: 0.1,       // 추가 토큰 10% 할인
      max_users: 20,
      features: [
        '모든 Free 기능',
        '월 50,000 AI 토큰',
        '우선 지원',
        'API 액세스',
        '커스텀 통합'
      ]
    },
    pro: {
      name: 'Pro',
      price_per_user: 12000,     // 월 12,000원/1인
      included_tokens: 200000,   // 월 200,000 토큰 포함
      token_discount: 0.2,       // 추가 토큰 20% 할인
      max_users: 100,
      features: [
        '모든 Starter 기능',
        '월 200,000 AI 토큰',
        '전담 매니저',
        '고급 분석',
        'SSO 지원',
        '99.9% SLA'
      ]
    },
    enterprise: {
      name: 'Enterprise',
      price_per_user: 30000,     // 월 30,000원/1인 (협의 가능)
      included_tokens: 1000000,  // 월 1,000,000 토큰 포함
      token_discount: 0.3,       // 추가 토큰 30% 할인
      max_users: -1,             // 무제한
      features: [
        '모든 Pro 기능',
        '월 1,000,000 AI 토큰',
        '전담 기술 지원',
        '커스텀 AI 모델',
        '온프레미스 옵션',
        '맞춤형 계약',
        '24/7 지원'
      ]
    }
  },
  
  // 추가 서비스
  addons: {
    extra_storage: {
      name: '추가 저장공간',
      price_per_gb: 1000,       // GB당 월 1,000원
    },
    custom_domain: {
      name: '커스텀 도메인',
      price: 10000,             // 월 10,000원
    },
    advanced_analytics: {
      name: '고급 분석',
      price: 20000,             // 월 20,000원
    },
    priority_support: {
      name: '우선 지원',
      price: 50000,             // 월 50,000원
    }
  },
  
  // 결제 방법별 수수료
  payment_methods: {
    credit_card: {
      name: '신용카드',
      fee_percentage: 0,        // 수수료 없음
    },
    bank_transfer: {
      name: '계좌이체',
      fee_percentage: 0,        // 수수료 없음
    },
    corporate_billing: {
      name: '세금계산서',
      fee_percentage: 0,        // 수수료 없음
      minimum_amount: 100000,   // 최소 10만원
    }
  }
};

/**
 * 토큰 사용량을 원화로 계산
 */
export function calculateTokenCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  plan: keyof typeof PRICING.plans = 'free'
): number {
  let inputCost = 0;
  let outputCost = 0;
  const modelLower = model.toLowerCase();
  
  // GPT-5 시리즈
  if (modelLower.includes('gpt-5-nano')) {
    inputCost = (inputTokens / 10000) * PRICING.ai_tokens.gpt['GPT-5-nano'].input;
    outputCost = (outputTokens / 10000) * PRICING.ai_tokens.gpt['GPT-5-nano'].output;
  } else if (modelLower.includes('gpt-5-mini')) {
    inputCost = (inputTokens / 10000) * PRICING.ai_tokens.gpt['GPT-5-mini'].input;
    outputCost = (outputTokens / 10000) * PRICING.ai_tokens.gpt['GPT-5-mini'].output;
  } else if (modelLower.includes('gpt-5')) {
    inputCost = (inputTokens / 10000) * PRICING.ai_tokens.gpt['GPT-5'].input;
    outputCost = (outputTokens / 10000) * PRICING.ai_tokens.gpt['GPT-5'].output;
  }
  // GPT-4 시리즈
  else if (modelLower.includes('gpt-4o-mini')) {
    inputCost = (inputTokens / 10000) * PRICING.ai_tokens.gpt['GPT-4o-mini'].input;
    outputCost = (outputTokens / 10000) * PRICING.ai_tokens.gpt['GPT-4o-mini'].output;
  } else if (modelLower.includes('gpt-4o')) {
    inputCost = (inputTokens / 10000) * PRICING.ai_tokens.gpt['GPT-4o'].input;
    outputCost = (outputTokens / 10000) * PRICING.ai_tokens.gpt['GPT-4o'].output;
  } else if (modelLower.includes('gpt-4 turbo') || modelLower.includes('gpt-4-turbo')) {
    inputCost = (inputTokens / 10000) * PRICING.ai_tokens.gpt['GPT-4 Turbo'].input;
    outputCost = (outputTokens / 10000) * PRICING.ai_tokens.gpt['GPT-4 Turbo'].output;
  }
  // GPT-3.5 시리즈
  else if (modelLower.includes('gpt-3.5-turbo-instruct')) {
    inputCost = (inputTokens / 10000) * PRICING.ai_tokens.gpt['GPT-3.5-turbo-instruct'].input;
    outputCost = (outputTokens / 10000) * PRICING.ai_tokens.gpt['GPT-3.5-turbo-instruct'].output;
  } else if (modelLower.includes('gpt-3.5')) {
    inputCost = (inputTokens / 10000) * PRICING.ai_tokens.gpt['GPT-3.5-turbo'].input;
    outputCost = (outputTokens / 10000) * PRICING.ai_tokens.gpt['GPT-3.5-turbo'].output;
  }
  // 추론 모델
  else if (modelLower.includes('o3-mini')) {
    inputCost = (inputTokens / 10000) * PRICING.ai_tokens.gpt['o3-mini'].input;
    outputCost = (outputTokens / 10000) * PRICING.ai_tokens.gpt['o3-mini'].output;
  } else if (modelLower.includes('o3')) {
    inputCost = (inputTokens / 10000) * PRICING.ai_tokens.gpt['o3'].input;
    outputCost = (outputTokens / 10000) * PRICING.ai_tokens.gpt['o3'].output;
  } else if (modelLower.includes('o1-mini')) {
    inputCost = (inputTokens / 10000) * PRICING.ai_tokens.gpt['o1-mini'].input;
    outputCost = (outputTokens / 10000) * PRICING.ai_tokens.gpt['o1-mini'].output;
  } else if (modelLower.includes('o1')) {
    inputCost = (inputTokens / 10000) * PRICING.ai_tokens.gpt['o1'].input;
    outputCost = (outputTokens / 10000) * PRICING.ai_tokens.gpt['o1'].output;
  }
  // Claude 모델
  else if (modelLower.includes('haiku 3.5')) {
    inputCost = (inputTokens / 10000) * PRICING.ai_tokens.claude['Claude Haiku 3.5'].input;
    outputCost = (outputTokens / 10000) * PRICING.ai_tokens.claude['Claude Haiku 3.5'].output;
  } else if (modelLower.includes('haiku 3')) {
    inputCost = (inputTokens / 10000) * PRICING.ai_tokens.claude['Claude Haiku 3'].input;
    outputCost = (outputTokens / 10000) * PRICING.ai_tokens.claude['Claude Haiku 3'].output;
  } else if (modelLower.includes('sonnet 4')) {
    inputCost = (inputTokens / 10000) * PRICING.ai_tokens.claude['Claude Sonnet 4'].input;
    outputCost = (outputTokens / 10000) * PRICING.ai_tokens.claude['Claude Sonnet 4'].output;
  } else if (modelLower.includes('sonnet 3.7')) {
    inputCost = (inputTokens / 10000) * PRICING.ai_tokens.claude['Claude Sonnet 3.7'].input;
    outputCost = (outputTokens / 10000) * PRICING.ai_tokens.claude['Claude Sonnet 3.7'].output;
  } else if (modelLower.includes('opus 4.1')) {
    inputCost = (inputTokens / 10000) * PRICING.ai_tokens.claude['Claude Opus 4.1'].input;
    outputCost = (outputTokens / 10000) * PRICING.ai_tokens.claude['Claude Opus 4.1'].output;
  } else if (modelLower.includes('opus 4')) {
    inputCost = (inputTokens / 10000) * PRICING.ai_tokens.claude['Claude Opus 4'].input;
    outputCost = (outputTokens / 10000) * PRICING.ai_tokens.claude['Claude Opus 4'].output;
  } else if (modelLower.includes('opus 3')) {
    inputCost = (inputTokens / 10000) * PRICING.ai_tokens.claude['Claude Opus 3'].input;
    outputCost = (outputTokens / 10000) * PRICING.ai_tokens.claude['Claude Opus 3'].output;
  }
  
  const totalCost = inputCost + outputCost;
  const discount = PRICING.plans[plan].token_discount;
  
  return totalCost * (1 - discount);
}

/**
 * 월별 구독료 계산
 */
export function calculateMonthlySubscription(
  plan: keyof typeof PRICING.plans,
  userCount: number,
  isAnnual: boolean = false
): number {
  const pricePerUser = PRICING.plans[plan].price_per_user;
  const basePrice = pricePerUser * userCount;
  
  if (isAnnual) {
    return basePrice * (1 - PRICING.subscription.annual_discount);
  }
  
  return basePrice;
}

/**
 * 포맷된 가격 표시
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
}

/**
 * 토큰 수 포맷
 */
export function formatTokens(tokens: number): string {
  return new Intl.NumberFormat('ko-KR').format(tokens);
}