import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  Timestamp,
  doc,
  setDoc,
  increment,
  serverTimestamp,
  getDoc,
  limit as firestoreLimit
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  calculateOpenAICost, 
  calculateAnthropicCost,
  getProviderFromModel,
  getModelDisplayName,
  usdToKrw,
  usdToPulse,
  krwToPulse,
  DEFAULT_WORKSPACE_PULSE,
  calculateOpenAICostInPulse,
  calculateAnthropicCostInPulse
} from '../config/apiPricing';

// Types
export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  total_tokens?: number;
}

export interface UsageRecord {
  id?: string;
  userId: string;
  userName?: string;
  workspaceId: string;
  model: string;
  provider: 'openai' | 'anthropic';
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUSD: number;
  costKRW: number;
  costPulse: number;
  timestamp: Timestamp;
  metadata?: {
    cacheCreationTokens?: number;
    cacheReadTokens?: number;
    conversationId?: string;
    channelId?: string;
    messageType?: string;
  };
}

export interface AggregatedUsage {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUSD: number;
  totalCostKRW: number;
  totalCostPulse: number;
  count: number;
  byModel: Record<string, {
    inputTokens: number;
    outputTokens: number;
    costUSD: number;
    costKRW: number;
    costPulse: number;
    count: number;
    displayName: string;
  }>;
  byUser?: Record<string, {
    userName?: string;
    inputTokens: number;
    outputTokens: number;
    costUSD: number;
    costKRW: number;
    costPulse: number;
    count: number;
  }>;
}

class UsageTrackerService {
  // 날짜 키 생성 (한국 시간 기준)
  private getDayKey(date = new Date()): string {
    const koreanTime = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const year = koreanTime.getFullYear();
    const month = String(koreanTime.getMonth() + 1).padStart(2, '0');
    const day = String(koreanTime.getDate()).padStart(2, '0');
    return `${year}${month}${day}`; // YYYYMMDD
  }

  private getMonthKey(date = new Date()): string {
    const koreanTime = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const year = koreanTime.getFullYear();
    const month = String(koreanTime.getMonth() + 1).padStart(2, '0');
    return `${year}${month}`; // YYYYMM
  }

  // API 사용량 기록
  async recordUsage(params: {
    userId: string;
    userName?: string;
    workspaceId: string;
    model: string;
    usage: TokenUsage;
    metadata?: UsageRecord['metadata'];
  }): Promise<void> {
    const { userId, userName, workspaceId, model, usage, metadata } = params;
    
    // 제공자 판별
    const provider = getProviderFromModel(model);
    if (provider === 'unknown') {
      console.warn(`Unknown model provider for model: ${model}`);
      return;
    }

    // 토큰 수 추출
    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;
    const totalTokens = usage.total_tokens || (inputTokens + outputTokens);
    
    // 비용 계산
    let costUSD = 0;
    let costPulse = 0;
    if (provider === 'openai') {
      costUSD = calculateOpenAICost(model, inputTokens, outputTokens);
      costPulse = calculateOpenAICostInPulse(model, inputTokens, outputTokens);
    } else if (provider === 'anthropic') {
      costUSD = calculateAnthropicCost(
        model,
        inputTokens,
        outputTokens,
        usage.cache_creation_input_tokens || 0,
        usage.cache_read_input_tokens || 0
      );
      costPulse = calculateAnthropicCostInPulse(
        model,
        inputTokens,
        outputTokens,
        usage.cache_creation_input_tokens || 0,
        usage.cache_read_input_tokens || 0
      );
    }
    
    const costKRW = usdToKrw(costUSD);

    // 1. 원시 사용량 기록 저장
    const usageRecord: Omit<UsageRecord, 'id'> = {
      userId,
      userName,
      workspaceId,
      model,
      provider,
      inputTokens,
      outputTokens,
      totalTokens,
      costUSD,
      costKRW,
      costPulse,
      timestamp: Timestamp.now(),
      metadata: {
        ...metadata,
        cacheCreationTokens: usage.cache_creation_input_tokens,
        cacheReadTokens: usage.cache_read_input_tokens,
      }
    };

    await addDoc(collection(db, 'api_usage_records'), usageRecord);

    // 2. 일별 집계 업데이트
    await this.updateDailyAggregates(userId, workspaceId, model, inputTokens, outputTokens, costUSD, costKRW, costPulse);
    
    // 3. 월별 집계 업데이트
    await this.updateMonthlyAggregates(userId, workspaceId, model, inputTokens, outputTokens, costUSD, costKRW, costPulse);
  }

  // 일별 집계 업데이트
  private async updateDailyAggregates(
    userId: string,
    workspaceId: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    costUSD: number,
    costKRW: number,
    costPulse: number
  ): Promise<void> {
    const dayKey = this.getDayKey();
    
    // 사용자 일별 집계
    const userDayRef = doc(db, 'api_usage_daily_user', `${userId}_${dayKey}`);
    await setDoc(userDayRef, {
      userId,
      dayKey,
      totalInputTokens: increment(inputTokens),
      totalOutputTokens: increment(outputTokens),
      totalCostUSD: increment(costUSD),
      totalCostKRW: increment(costKRW),
      totalCostPulse: increment(costPulse),
      count: increment(1),
      [`models.${model}.inputTokens`]: increment(inputTokens),
      [`models.${model}.outputTokens`]: increment(outputTokens),
      [`models.${model}.costUSD`]: increment(costUSD),
      [`models.${model}.costKRW`]: increment(costKRW),
      [`models.${model}.costPulse`]: increment(costPulse),
      [`models.${model}.count`]: increment(1),
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    // 워크스페이스 일별 집계
    const workspaceDayRef = doc(db, 'api_usage_daily_workspace', `${workspaceId}_${dayKey}`);
    await setDoc(workspaceDayRef, {
      workspaceId,
      dayKey,
      totalInputTokens: increment(inputTokens),
      totalOutputTokens: increment(outputTokens),
      totalCostUSD: increment(costUSD),
      totalCostKRW: increment(costKRW),
      totalCostPulse: increment(costPulse),
      count: increment(1),
      [`models.${model}.inputTokens`]: increment(inputTokens),
      [`models.${model}.outputTokens`]: increment(outputTokens),
      [`models.${model}.costUSD`]: increment(costUSD),
      [`models.${model}.costKRW`]: increment(costKRW),
      [`models.${model}.costPulse`]: increment(costPulse),
      [`models.${model}.count`]: increment(1),
      [`users.${userId}.inputTokens`]: increment(inputTokens),
      [`users.${userId}.outputTokens`]: increment(outputTokens),
      [`users.${userId}.costUSD`]: increment(costUSD),
      [`users.${userId}.costKRW`]: increment(costKRW),
      [`users.${userId}.costPulse`]: increment(costPulse),
      [`users.${userId}.count`]: increment(1),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  // 월별 집계 업데이트
  private async updateMonthlyAggregates(
    userId: string,
    workspaceId: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    costUSD: number,
    costKRW: number,
    costPulse: number
  ): Promise<void> {
    const monthKey = this.getMonthKey();
    
    // 사용자 월별 집계
    const userMonthRef = doc(db, 'api_usage_monthly_user', `${userId}_${monthKey}`);
    await setDoc(userMonthRef, {
      userId,
      monthKey,
      totalInputTokens: increment(inputTokens),
      totalOutputTokens: increment(outputTokens),
      totalCostUSD: increment(costUSD),
      totalCostKRW: increment(costKRW),
      totalCostPulse: increment(costPulse),
      count: increment(1),
      [`models.${model}.inputTokens`]: increment(inputTokens),
      [`models.${model}.outputTokens`]: increment(outputTokens),
      [`models.${model}.costUSD`]: increment(costUSD),
      [`models.${model}.costKRW`]: increment(costKRW),
      [`models.${model}.costPulse`]: increment(costPulse),
      [`models.${model}.count`]: increment(1),
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    // 워크스페이스 월별 집계
    const workspaceMonthRef = doc(db, 'api_usage_monthly_workspace', `${workspaceId}_${monthKey}`);
    await setDoc(workspaceMonthRef, {
      workspaceId,
      monthKey,
      totalInputTokens: increment(inputTokens),
      totalOutputTokens: increment(outputTokens),
      totalCostUSD: increment(costUSD),
      totalCostKRW: increment(costKRW),
      totalCostPulse: increment(costPulse),
      count: increment(1),
      [`models.${model}.inputTokens`]: increment(inputTokens),
      [`models.${model}.outputTokens`]: increment(outputTokens),
      [`models.${model}.costUSD`]: increment(costUSD),
      [`models.${model}.costKRW`]: increment(costKRW),
      [`models.${model}.costPulse`]: increment(costPulse),
      [`models.${model}.count`]: increment(1),
      [`users.${userId}.inputTokens`]: increment(inputTokens),
      [`users.${userId}.outputTokens`]: increment(outputTokens),
      [`users.${userId}.costUSD`]: increment(costUSD),
      [`users.${userId}.costKRW`]: increment(costKRW),
      [`users.${userId}.costPulse`]: increment(costPulse),
      [`users.${userId}.count`]: increment(1),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  // 사용자별 사용량 조회
  async getUserUsage(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AggregatedUsage> {
    const constraints = [where('userId', '==', userId)];
    
    if (startDate) {
      constraints.push(where('timestamp', '>=', Timestamp.fromDate(startDate)));
    }
    if (endDate) {
      constraints.push(where('timestamp', '<=', Timestamp.fromDate(endDate)));
    }
    
    const q = query(collection(db, 'api_usage_records'), ...constraints);
    const snapshot = await getDocs(q);
    
    return this.aggregateUsageRecords(snapshot);
  }

  // 워크스페이스별 사용량 조회
  async getWorkspaceUsage(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AggregatedUsage> {
    const constraints = [where('workspaceId', '==', workspaceId)];
    
    if (startDate) {
      constraints.push(where('timestamp', '>=', Timestamp.fromDate(startDate)));
    }
    if (endDate) {
      constraints.push(where('timestamp', '<=', Timestamp.fromDate(endDate)));
    }
    
    const q = query(collection(db, 'api_usage_records'), ...constraints);
    const snapshot = await getDocs(q);
    
    return this.aggregateUsageRecords(snapshot, true);
  }

  // 사용자 월별 사용량 조회 (빠른 조회)
  async getUserMonthlyUsage(userId: string, monthKey?: string): Promise<any> {
    const key = monthKey || this.getMonthKey();
    const docRef = doc(db, 'api_usage_monthly_user', `${userId}_${key}`);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        totalInputTokens: data.totalInputTokens || 0,
        totalOutputTokens: data.totalOutputTokens || 0,
        totalCostUSD: data.totalCostUSD || 0,
        totalCostKRW: data.totalCostKRW || 0,
        totalCostPulse: data.totalCostPulse || 0,
        count: data.count || 0,
        models: data.models || {},
        monthKey: key
      };
    }
    
    return {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUSD: 0,
      totalCostKRW: 0,
      totalCostPulse: 0,
      count: 0,
      models: {},
      monthKey: key
    };
  }

  // 워크스페이스 월별 사용량 조회 (빠른 조회)
  async getWorkspaceMonthlyUsage(workspaceId: string, monthKey?: string): Promise<any> {
    const key = monthKey || this.getMonthKey();
    const docRef = doc(db, 'api_usage_monthly_workspace', `${workspaceId}_${key}`);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        totalInputTokens: data.totalInputTokens || 0,
        totalOutputTokens: data.totalOutputTokens || 0,
        totalCostUSD: data.totalCostUSD || 0,
        totalCostKRW: data.totalCostKRW || 0,
        totalCostPulse: data.totalCostPulse || 0,
        remainingPulse: DEFAULT_WORKSPACE_PULSE - (data.totalCostPulse || 0),
        count: data.count || 0,
        models: data.models || {},
        users: data.users || {},
        monthKey: key
      };
    }
    
    return {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUSD: 0,
      totalCostKRW: 0,
      totalCostPulse: 0,
      remainingPulse: DEFAULT_WORKSPACE_PULSE,
      count: 0,
      models: {},
      users: {},
      monthKey: key
    };
  }

  // 사용량 기록 집계
  private aggregateUsageRecords(snapshot: any, includeUsers = false): AggregatedUsage {
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCostUSD = 0;
    let totalCostKRW = 0;
    let totalCostPulse = 0;
    let count = 0;
    const byModel: AggregatedUsage['byModel'] = {};
    const byUser: AggregatedUsage['byUser'] = {};

    snapshot.forEach((doc: any) => {
      const data = doc.data() as UsageRecord;
      
      totalInputTokens += data.inputTokens;
      totalOutputTokens += data.outputTokens;
      totalCostUSD += data.costUSD;
      totalCostKRW += data.costKRW;
      totalCostPulse += (data.costPulse || 0);
      count++;

      // 모델별 집계
      if (!byModel[data.model]) {
        byModel[data.model] = {
          inputTokens: 0,
          outputTokens: 0,
          costUSD: 0,
          costKRW: 0,
          costPulse: 0,
          count: 0,
          displayName: getModelDisplayName(data.model)
        };
      }
      byModel[data.model].inputTokens += data.inputTokens;
      byModel[data.model].outputTokens += data.outputTokens;
      byModel[data.model].costUSD += data.costUSD;
      byModel[data.model].costKRW += data.costKRW;
      byModel[data.model].costPulse += (data.costPulse || 0);
      byModel[data.model].count++;

      // 사용자별 집계 (워크스페이스 조회 시)
      if (includeUsers) {
        if (!byUser[data.userId]) {
          byUser[data.userId] = {
            userName: data.userName,
            inputTokens: 0,
            outputTokens: 0,
            costUSD: 0,
            costKRW: 0,
            costPulse: 0,
            count: 0
          };
        }
        byUser[data.userId].inputTokens += data.inputTokens;
        byUser[data.userId].outputTokens += data.outputTokens;
        byUser[data.userId].costUSD += data.costUSD;
        byUser[data.userId].costKRW += data.costKRW;
        byUser[data.userId].costPulse += (data.costPulse || 0);
        byUser[data.userId].count++;
      }
    });

    const result: AggregatedUsage = {
      totalInputTokens,
      totalOutputTokens,
      totalCostUSD,
      totalCostKRW,
      totalCostPulse,
      count,
      byModel
    };

    if (includeUsers) {
      result.byUser = byUser;
    }

    return result;
  }

  // 최근 사용 내역 조회
  async getRecentUsageRecords(
    workspaceId: string,
    limit: number = 50
  ): Promise<UsageRecord[]> {
    const q = query(
      collection(db, 'api_usage_records'),
      where('workspaceId', '==', workspaceId),
      firestoreLimit(limit)
    );
    
    const snapshot = await getDocs(q);
    const records: UsageRecord[] = [];
    
    snapshot.forEach((doc) => {
      records.push({
        id: doc.id,
        ...doc.data()
      } as UsageRecord);
    });
    
    // 시간 역순 정렬
    records.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
    
    return records;
  }
}

export default new UsageTrackerService();