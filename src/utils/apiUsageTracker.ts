import { collection, doc, setDoc, getDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../config/firebase';

interface ApiUsageData {
  user_id: string;
  workspace_id: string;
  company_name: string;
  endpoint: string;
  method: string;
  tokens_used: number;
  cost: number;
  timestamp: any;
}

class ApiUsageTracker {
  private static instance: ApiUsageTracker;
  
  private constructor() {}
  
  static getInstance(): ApiUsageTracker {
    if (!ApiUsageTracker.instance) {
      ApiUsageTracker.instance = new ApiUsageTracker();
    }
    return ApiUsageTracker.instance;
  }
  
  /**
   * Track API usage for chatbot and AI features
   */
  async trackApiUsage(
    userId: string,
    workspaceId: string,
    companyName: string,
    endpoint: string,
    tokensUsed: number = 1,
    model: string = 'gpt-3.5-turbo',
    inputTokens: number = 0,
    outputTokens: number = 0
  ): Promise<void> {
    try {
      // Import pricing config
      const { calculateTokenCost } = await import('../config/pricing');
      
      // Get workspace plan
      const workspaceDoc = await getDoc(doc(db, 'workspaces', workspaceId));
      const plan = workspaceDoc.data()?.plan || 'free';
      
      // Calculate cost based on actual pricing
      const cost = calculateTokenCost(model, inputTokens || tokensUsed, outputTokens || 0, plan);
      
      // Create usage record
      const usageData: ApiUsageData = {
        user_id: userId,
        workspace_id: workspaceId,
        company_name: companyName,
        endpoint,
        method: 'POST',
        tokens_used: tokensUsed,
        cost,
        timestamp: serverTimestamp()
      };
      
      // Add to api_usage collection
      await setDoc(doc(collection(db, 'api_usage')), usageData);
      
      // Update daily aggregates
      await this.updateDailyAggregates(userId, workspaceId, companyName, tokensUsed, cost);
      
      // Update monthly aggregates
      await this.updateMonthlyAggregates(userId, workspaceId, companyName, tokensUsed, cost);
      
      // Update workspace totals
      await this.updateWorkspaceTotals(workspaceId, tokensUsed, cost);
      
    } catch (error) {
      console.error('Error tracking API usage:', error);
    }
  }
  
  /**
   * Update daily usage aggregates
   */
  private async updateDailyAggregates(
    userId: string,
    workspaceId: string,
    companyName: string,
    tokens: number,
    cost: number
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const dailyDocId = `${workspaceId}_${today}`;
    
    const dailyRef = doc(db, 'api_usage_daily', dailyDocId);
    const dailyDoc = await getDoc(dailyRef);
    
    if (dailyDoc.exists()) {
      await updateDoc(dailyRef, {
        total_tokens: increment(tokens),
        total_cost: increment(cost),
        total_requests: increment(1),
        [`users.${userId}.tokens`]: increment(tokens),
        [`users.${userId}.cost`]: increment(cost),
        [`users.${userId}.requests`]: increment(1),
        updated_at: serverTimestamp()
      });
    } else {
      await setDoc(dailyRef, {
        workspace_id: workspaceId,
        company_name: companyName,
        date: today,
        total_tokens: tokens,
        total_cost: cost,
        total_requests: 1,
        users: {
          [userId]: {
            tokens,
            cost,
            requests: 1
          }
        },
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
    }
  }
  
  /**
   * Update monthly usage aggregates
   */
  private async updateMonthlyAggregates(
    userId: string,
    workspaceId: string,
    companyName: string,
    tokens: number,
    cost: number
  ): Promise<void> {
    const yearMonth = new Date().toISOString().slice(0, 7);
    const monthlyDocId = `${workspaceId}_${yearMonth}`;
    
    const monthlyRef = doc(db, 'api_usage_monthly', monthlyDocId);
    const monthlyDoc = await getDoc(monthlyRef);
    
    if (monthlyDoc.exists()) {
      await updateDoc(monthlyRef, {
        total_tokens: increment(tokens),
        total_cost: increment(cost),
        total_requests: increment(1),
        [`users.${userId}.tokens`]: increment(tokens),
        [`users.${userId}.cost`]: increment(cost),
        [`users.${userId}.requests`]: increment(1),
        updated_at: serverTimestamp()
      });
    } else {
      await setDoc(monthlyRef, {
        workspace_id: workspaceId,
        company_name: companyName,
        year_month: yearMonth,
        total_tokens: tokens,
        total_cost: cost,
        total_requests: 1,
        users: {
          [userId]: {
            tokens,
            cost,
            requests: 1
          }
        },
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
    }
  }
  
  /**
   * Update workspace total usage
   */
  private async updateWorkspaceTotals(
    workspaceId: string,
    tokens: number,
    cost: number
  ): Promise<void> {
    const workspaceRef = doc(db, 'workspaces', workspaceId);
    
    await updateDoc(workspaceRef, {
      ai_usage_total: increment(tokens),
      ai_usage_this_month: increment(tokens),
      ai_cost_total: increment(cost),
      ai_cost_this_month: increment(cost),
      updated_at: serverTimestamp()
    });
  }
  
  /**
   * Get user's usage for current month
   */
  async getUserMonthlyUsage(userId: string, workspaceId: string): Promise<{
    tokens: number;
    cost: number;
    requests: number;
  }> {
    const yearMonth = new Date().toISOString().slice(0, 7);
    const monthlyDocId = `${workspaceId}_${yearMonth}`;
    
    const monthlyRef = doc(db, 'api_usage_monthly', monthlyDocId);
    const monthlyDoc = await getDoc(monthlyRef);
    
    if (monthlyDoc.exists()) {
      const data = monthlyDoc.data();
      const userUsage = data.users?.[userId];
      
      return {
        tokens: userUsage?.tokens || 0,
        cost: userUsage?.cost || 0,
        requests: userUsage?.requests || 0
      };
    }
    
    return { tokens: 0, cost: 0, requests: 0 };
  }
  
  /**
   * Get workspace's usage for current month
   */
  async getWorkspaceMonthlyUsage(workspaceId: string): Promise<{
    tokens: number;
    cost: number;
    requests: number;
    userCount: number;
  }> {
    const yearMonth = new Date().toISOString().slice(0, 7);
    const monthlyDocId = `${workspaceId}_${yearMonth}`;
    
    const monthlyRef = doc(db, 'api_usage_monthly', monthlyDocId);
    const monthlyDoc = await getDoc(monthlyRef);
    
    if (monthlyDoc.exists()) {
      const data = monthlyDoc.data();
      
      return {
        tokens: data.total_tokens || 0,
        cost: data.total_cost || 0,
        requests: data.total_requests || 0,
        userCount: Object.keys(data.users || {}).length
      };
    }
    
    return { tokens: 0, cost: 0, requests: 0, userCount: 0 };
  }
  
  /**
   * Check if user has exceeded their limit
   */
  async checkUsageLimit(workspaceId: string): Promise<{
    allowed: boolean;
    usage: number;
    limit: number;
  }> {
    const workspaceRef = doc(db, 'workspaces', workspaceId);
    const workspaceDoc = await getDoc(workspaceRef);
    
    if (workspaceDoc.exists()) {
      const data = workspaceDoc.data();
      const usage = data.ai_usage_this_month || 0;
      const limit = data.ai_usage_limit || 10000;
      
      return {
        allowed: usage < limit,
        usage,
        limit
      };
    }
    
    return {
      allowed: true,
      usage: 0,
      limit: 10000
    };
  }
}

export default ApiUsageTracker.getInstance();