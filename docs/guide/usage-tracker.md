## Anthropic Usage Tracker (가격은 2024년 기준이므로 현재 가격을 참고해야함)
// types/usage.ts
interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

interface UsageRecord {
  userId: string;
  workspaceId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  timestamp: Date;
  metadata?: {
    cacheCreationTokens?: number;
    cacheReadTokens?: number;
    conversationId?: string;
  };
}

// config/pricing.ts
// 2024년 기준 Anthropic API 가격 (USD per 1M tokens)
const ANTHROPIC_PRICING = {
  'claude-3-5-sonnet-20241022': {
    input: 3.00,    // $3 per 1M input tokens
    output: 15.00,  // $15 per 1M output tokens
    cacheWrite: 3.75,  // $3.75 per 1M tokens (cache write)
    cacheRead: 0.30,   // $0.30 per 1M tokens (cache read)
  },
  'claude-3-5-haiku-20241022': {
    input: 1.00,
    output: 5.00,
    cacheWrite: 1.25,
    cacheRead: 0.10,
  },
  'claude-3-opus-20240229': {
    input: 15.00,
    output: 75.00,
    cacheWrite: 18.75,
    cacheRead: 1.50,
  },
  'claude-3-sonnet-20240229': {
    input: 3.00,
    output: 15.00,
    cacheWrite: 3.75,
    cacheRead: 0.30,
  },
  'claude-3-haiku-20240307': {
    input: 0.25,
    output: 1.25,
    cacheWrite: 0.30,
    cacheRead: 0.03,
  },
};

// services/anthropicService.ts
import Anthropic from '@anthropic-ai/sdk';
import { db } from './firebase'; // Firebase 설정
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';

class AnthropicUsageTracker {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
  }

  // 토큰 수를 비용으로 변환
  private calculateCost(
    model: string,
    usage: TokenUsage
  ): number {
    const pricing = ANTHROPIC_PRICING[model as keyof typeof ANTHROPIC_PRICING];
    if (!pricing) {
      console.warn(`Unknown model: ${model}, using default pricing`);
      return 0;
    }

    let totalCost = 0;

    // 기본 입력/출력 토큰 비용
    totalCost += (usage.input_tokens / 1_000_000) * pricing.input;
    totalCost += (usage.output_tokens / 1_000_000) * pricing.output;

    // 캐시 관련 비용 (있는 경우)
    if (usage.cache_creation_input_tokens) {
      totalCost += (usage.cache_creation_input_tokens / 1_000_000) * pricing.cacheWrite;
    }
    if (usage.cache_read_input_tokens) {
      totalCost += (usage.cache_read_input_tokens / 1_000_000) * pricing.cacheRead;
    }

    return totalCost;
  }

  // API 호출 및 사용량 추적
  async createMessage(
    userId: string,
    workspaceId: string,
    params: Anthropic.MessageCreateParams,
    conversationId?: string
  ): Promise<Anthropic.Message> {
    try {
      // Anthropic API 호출
      const message = await this.anthropic.messages.create(params);

      // 사용량 정보 추출
      const usage = message.usage;
      const model = params.model;

      // 비용 계산
      const totalCost = this.calculateCost(model, usage);

      // Firebase에 사용량 기록 저장
      const usageRecord: UsageRecord = {
        userId,
        workspaceId,
        model,
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        totalCost,
        timestamp: new Date(),
        metadata: {
          cacheCreationTokens: usage.cache_creation_input_tokens,
          cacheReadTokens: usage.cache_read_input_tokens,
          conversationId,
        },
      };

      await this.saveUsageRecord(usageRecord);

      return message;
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }

  // Firebase에 사용량 저장
  private async saveUsageRecord(record: UsageRecord): Promise<void> {
    try {
      await addDoc(collection(db, 'usage_records'), {
        ...record,
        timestamp: Timestamp.fromDate(record.timestamp),
      });
    } catch (error) {
      console.error('Error saving usage record:', error);
      throw error;
    }
  }

  // 사용자별 사용량 조회
  async getUserUsage(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
    byModel: Record<string, {
      inputTokens: number;
      outputTokens: number;
      cost: number;
    }>;
  }> {
    const q = query(
      collection(db, 'usage_records'),
      where('userId', '==', userId),
      ...(startDate ? [where('timestamp', '>=', Timestamp.fromDate(startDate))] : []),
      ...(endDate ? [where('timestamp', '<=', Timestamp.fromDate(endDate))] : [])
    );

    const snapshot = await getDocs(q);
    
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCost = 0;
    const byModel: Record<string, any> = {};

    snapshot.forEach((doc) => {
      const data = doc.data() as UsageRecord;
      
      totalInputTokens += data.inputTokens;
      totalOutputTokens += data.outputTokens;
      totalCost += data.totalCost;

      if (!byModel[data.model]) {
        byModel[data.model] = {
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
        };
      }

      byModel[data.model].inputTokens += data.inputTokens;
      byModel[data.model].outputTokens += data.outputTokens;
      byModel[data.model].cost += data.totalCost;
    });

    return {
      totalInputTokens,
      totalOutputTokens,
      totalCost,
      byModel,
    };
  }

  // 워크스페이스별 사용량 조회
  async getWorkspaceUsage(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
    byUser: Record<string, {
      inputTokens: number;
      outputTokens: number;
      cost: number;
    }>;
    byModel: Record<string, {
      inputTokens: number;
      outputTokens: number;
      cost: number;
    }>;
  }> {
    const q = query(
      collection(db, 'usage_records'),
      where('workspaceId', '==', workspaceId),
      ...(startDate ? [where('timestamp', '>=', Timestamp.fromDate(startDate))] : []),
      ...(endDate ? [where('timestamp', '<=', Timestamp.fromDate(endDate))] : [])
    );

    const snapshot = await getDocs(q);
    
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCost = 0;
    const byUser: Record<string, any> = {};
    const byModel: Record<string, any> = {};

    snapshot.forEach((doc) => {
      const data = doc.data() as UsageRecord;
      
      totalInputTokens += data.inputTokens;
      totalOutputTokens += data.outputTokens;
      totalCost += data.totalCost;

      // 사용자별 집계
      if (!byUser[data.userId]) {
        byUser[data.userId] = {
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
        };
      }
      byUser[data.userId].inputTokens += data.inputTokens;
      byUser[data.userId].outputTokens += data.outputTokens;
      byUser[data.userId].cost += data.totalCost;

      // 모델별 집계
      if (!byModel[data.model]) {
        byModel[data.model] = {
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
        };
      }
      byModel[data.model].inputTokens += data.inputTokens;
      byModel[data.model].outputTokens += data.outputTokens;
      byModel[data.model].cost += data.totalCost;
    });

    return {
      totalInputTokens,
      totalOutputTokens,
      totalCost,
      byUser,
      byModel,
    };
  }

  // 스트리밍 응답 처리 (SSE)
  async createStreamingMessage(
    userId: string,
    workspaceId: string,
    params: Anthropic.MessageCreateParams,
    conversationId?: string
  ): Promise<AsyncIterable<Anthropic.MessageStreamEvent>> {
    const stream = await this.anthropic.messages.create({
      ...params,
      stream: true,
    });

    // 스트리밍이 완료된 후 사용량 추적
    let finalMessage: Anthropic.Message | null = null;

    // 스트리밍 이벤트를 수집하고 마지막에 사용량 저장
    const trackedStream = async function* (this: AnthropicUsageTracker) {
      for await (const event of stream) {
        yield event;
        
        // message_stop 이벤트에서 최종 사용량 정보 수집
        if (event.type === 'message_stop') {
          // 스트리밍 완료 후 usage 정보가 포함됨
          const usage = (event as any).usage;
          if (usage) {
            const totalCost = this.calculateCost(params.model, usage);
            
            const usageRecord: UsageRecord = {
              userId,
              workspaceId,
              model: params.model,
              inputTokens: usage.input_tokens,
              outputTokens: usage.output_tokens,
              totalCost,
              timestamp: new Date(),
              metadata: {
                cacheCreationTokens: usage.cache_creation_input_tokens,
                cacheReadTokens: usage.cache_read_input_tokens,
                conversationId,
              },
            };

            await this.saveUsageRecord(usageRecord);
          }
        }
      }
    }.bind(this);

    return trackedStream();
  }
}

// 사용 예시
export async function exampleUsage() {
  // 초기화
  const tracker = new AnthropicUsageTracker(process.env.ANTHROPIC_API_KEY!);

  // 일반 메시지 생성 (사용량 자동 추적)
  const response = await tracker.createMessage(
    'user123',  // Google 로그인 사용자 ID
    'workspace456',  // 워크스페이스 ID
    {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [
        { role: 'user', content: 'Hello, Claude!' }
      ],
    },
    'conversation789'  // 선택적: 대화 ID
  );

  // 사용자별 사용량 조회
  const userUsage = await tracker.getUserUsage(
    'user123',
    new Date('2024-01-01'),
    new Date('2024-12-31')
  );
  console.log('User usage:', userUsage);

  // 워크스페이스별 사용량 조회
  const workspaceUsage = await tracker.getWorkspaceUsage(
    'workspace456',
    new Date('2024-01-01'),
    new Date('2024-12-31')
  );
  console.log('Workspace usage:', workspaceUsage);

  // 스트리밍 응답 처리
  const stream = await tracker.createStreamingMessage(
    'user123',
    'workspace456',
    {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [
        { role: 'user', content: 'Tell me a story' }
      ],
    }
  );

  for await (const event of stream) {
    if (event.type === 'content_block_delta') {
      process.stdout.write(event.delta.text);
    }
  }
}

export default AnthropicUsageTracker;


##openai api usage tracker(가격은 2024년 기준이므로 최신자료를 체크해야함)

좋아요! “유저 단위”와 “워크스페이스 단위”로 \*\*모델별 사용량(입력/출력 토큰)\*\*을 계산·집계하는 실전용 TypeScript 샘플을 바로 드릴게요. 아래 코드는 **OpenAI Responses API + Firebase Admin SDK** 기준이며, **비-스트리밍/스트리밍** 모두에서 `response.usage`를 안전하게 읽어 **Firestore**에 사용자/워크스페이스/모델 단위로 기록하고, **일/월 단위 집계**까지 누적합니다.

> 참고: OpenAI Responses API의 응답에는 사용 토큰이 포함된 `usage` 필드가 내려옵니다(비-스트리밍은 응답 본문, 스트리밍은 마지막 완료 이벤트에서 제공). 공식 레퍼런스: Responses API 문서 및 API 개요. ([OpenAI][1])

---

# 1) 설치

```bash
npm i openai firebase-admin
```

# 2) 환경변수(.env)

```bash
OPENAI_API_KEY=sk-...
# Firebase Admin은 서비스 계정 JSON을 쓰거나, 환경 변수 기반 런타임 인증을 사용
GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
```

# 3) Firestore 스키마(권장)

* `usage_events/{autoId}`: 원시 사용 이벤트(정규화 레코드)
* `usage_daily_user/{userId_YYYYMMDD}`: 유저×일 집계
* `usage_daily_workspace/{workspaceId_YYYYMMDD}`: 워크스페이스×일 집계
* `usage_monthly_user/{userId_YYYYMM}` / `usage_monthly_workspace/{workspaceId_YYYYMM}`: 월 집계

각 문서 공통 필드 예시:

```ts
type UsageEvent = {
  userId: string;              // Firebase Auth UID
  workspaceId: string;         // 소속 워크스페이스 ID
  model: string;               // 호출한 모델명
  requestId: string;           // OpenAI 응답 id
  inputTokens: number;         // usage.input_tokens
  outputTokens: number;        // usage.output_tokens
  totalTokens: number;         // usage.total_tokens
  createdAt: FirebaseFirestore.FieldValue; // serverTimestamp
  meta?: Record<string, any>;  // (옵션) 프롬프트 유형 등
};
```

# 4) 공통 유틸 (날짜 키, 집계 업데이트)

```ts
// utils/usage.ts
import { firestore } from "firebase-admin";
const db = firestore();

export function dayKey(date = new Date()) {
  const tz = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const y = tz.getFullYear();
  const m = String(tz.getMonth() + 1).padStart(2, "0");
  const d = String(tz.getDate()).padStart(2, "0");
  return `${y}${m}${d}`; // YYYYMMDD
}
export function monthKey(date = new Date()) {
  const tz = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const y = tz.getFullYear();
  const m = String(tz.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`; // YYYYMM
}

export async function recordUsageAndAggregate(args: {
  userId: string;
  workspaceId: string;
  model: string;
  requestId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  meta?: Record<string, any>;
}) {
  const { userId, workspaceId, model, requestId, inputTokens, outputTokens, totalTokens, meta } = args;
  const batch = db.batch();

  // 1) 원시 이벤트 적재
  const evRef = db.collection("usage_events").doc();
  batch.set(evRef, {
    userId, workspaceId, model, requestId,
    inputTokens, outputTokens, totalTokens,
    createdAt: firestore.FieldValue.serverTimestamp(),
    meta: meta ?? {},
  });

  // 2) 일 집계 (유저/워크스페이스)
  const dKey = dayKey();
  for (const [col, key] of [
    ["usage_daily_user", `${userId}_${dKey}`],
    ["usage_daily_workspace", `${workspaceId}_${dKey}`],
  ] as const) {
    const ref = db.collection(col).doc(key);
    batch.set(ref, {
      inputTokens: firestore.FieldValue.increment(inputTokens),
      outputTokens: firestore.FieldValue.increment(outputTokens),
      totalTokens: firestore.FieldValue.increment(totalTokens),
      lastModel: model,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  // 3) 월 집계 (유저/워크스페이스)
  const mKey = monthKey();
  for (const [col, key] of [
    ["usage_monthly_user", `${userId}_${mKey}`],
    ["usage_monthly_workspace", `${workspaceId}_${mKey}`],
  ] as const) {
    const ref = db.collection(col).doc(key);
    batch.set(ref, {
      inputTokens: firestore.FieldValue.increment(inputTokens),
      outputTokens: firestore.FieldValue.increment(outputTokens),
      totalTokens: firestore.FieldValue.increment(totalTokens),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  await batch.commit();
}
```

# 5) 비-스트리밍 호출 예시 (Responses API)

```ts
// openai/nonStreaming.ts
import OpenAI from "openai";
import { recordUsageAndAggregate } from "../utils/usage";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function runOnceNonStreaming(params: {
  userId: string; workspaceId: string; model: string; prompt: string;
}) {
  const { userId, workspaceId, model, prompt } = params;

  const res = await client.responses.create({
    model,
    input: prompt,
  });

  // usage 안전 추출
  const usage = (res as any)?.usage ?? {};
  const inputTokens  = Number(usage.input_tokens  ?? 0);
  const outputTokens = Number(usage.output_tokens ?? 0);
  const totalTokens  = Number(usage.total_tokens  ?? (inputTokens + outputTokens));
  const requestId    = (res as any)?.id ?? "";

  await recordUsageAndAggregate({
    userId, workspaceId, model, requestId,
    inputTokens, outputTokens, totalTokens,
    meta: { mode: "non-stream", source: "chat" },
  });

  // 최종 텍스트 반환(Responses API helper)
  const outputText = (res as any)?.output_text ?? "";
  return { outputText, usage: { inputTokens, outputTokens, totalTokens } };
}
```

# 6) 스트리밍 호출 예시 (Responses API)

```ts
// openai/streaming.ts
import OpenAI from "openai";
import { recordUsageAndAggregate } from "../utils/usage";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function* runStreaming(params: {
  userId: string; workspaceId: string; model: string; prompt: string;
}) {
  const { userId, workspaceId, model, prompt } = params;

  const stream = await client.responses.stream({
    model,
    input: prompt,
  });

  let finalUsage: { input_tokens?: number; output_tokens?: number; total_tokens?: number } = {};
  let requestId = "";

  for await (const event of stream) {
    // 청크 전달(필요 시 event.delta 등 뽑아 UI에 push)
    yield event;

    // 완료 시점의 usage를 안전하게 읽고 저장
    if (event.type === "response.completed") {
      const res = event.response as any;
      requestId = res?.id ?? "";
      const usage = res?.usage ?? {};
      finalUsage = {
        input_tokens:  Number(usage.input_tokens  ?? 0),
        output_tokens: Number(usage.output_tokens ?? 0),
        total_tokens:  Number(usage.total_tokens  ?? 0),
      };
    }
  }

  await recordUsageAndAggregate({
    userId,
    workspaceId,
    model,
    requestId,
    inputTokens:  Number(finalUsage.input_tokens  ?? 0),
    outputTokens: Number(finalUsage.output_tokens ?? 0),
    totalTokens:  Number(finalUsage.total_tokens  ?? 0),
    meta: { mode: "stream", source: "chat" },
  });
}
```

> 비-스트리밍은 `res.usage`, 스트리밍은 **마지막 완료 이벤트**(여기서는 `response.completed`)에 포함된 `response.usage`를 사용합니다. Responses API 개요 및 스트리밍 레퍼런스 참고. ([OpenAI Platform][2])

# 7) 미들웨어/서비스 레벨에서 공통 래퍼

```ts
// services/llm.ts
type Caller = { userId: string; workspaceId: string; model?: string };
const DEFAULT_MODEL = "gpt-5-mini"; // 예시

export async function askOnce(caller: Caller, prompt: string) {
  const model = caller.model ?? DEFAULT_MODEL;
  // 비-스트리밍 예시 사용
  return runOnceNonStreaming({ userId: caller.userId, workspaceId: caller.workspaceId, model, prompt });
}

// 스트리밍을 쓰는 경우
export function askStream(caller: Caller, prompt: string) {
  const model = caller.model ?? DEFAULT_MODEL;
  return runStreaming({ userId: caller.userId, workspaceId: caller.workspaceId, model, prompt });
}
```

# 8) (선택) 모델별/조직별 비용 계산

* 보통 **가격은 수시로 변동**하므로, **가격 상수**는 별도 컬렉션(`pricing_models/{model}` or Feature Flag)에서 관리하세요.
* 결제 금액은 `inputTokens/1e6 * price.input + outputTokens/1e6 * price.output`로 계산(백만 토큰 단가 기준).
* 가격 테이블 업데이트 자동화를 붙이면 더 안전합니다.

# 9) Firebase Auth & 멀티 워크스페이스 팁

* 클라이언트는 Google 로그인(Firebase Auth)으로 `idToken`을 서버에 전달 → 서버에서 `verifyIdToken`으로 UID 복호화 → `userId`로 사용.
* 워크스페이스 권한은 서버에서 `workspaceId`를 헤더/파라미터로 받고 **ACL** 검증 후 위 함수를 호출.
* 모든 사용 기록은 **서버에서만** 적재(클라에서 토큰/비용 계산 금지).

---

필요하면 위 코드를 **Next.js Route Handler/Express**에 바로 붙일 수 있도록 라우팅 샘플도 만들어 드릴게요.
또, \*\*모델별 일/월 사용량 대시보드(차트)\*\*와 **초과 한도(Quota) 차단 미들웨어**까지 확장해 드릴 수 있어요.

[1]: https://openai.com/api/?utm_source=chatgpt.com "API Platform"
[2]: https://platform.openai.com/docs/api-reference/responses-streaming/response/reasoning_text/done?utm_source=chatgpt.com "API Reference"
