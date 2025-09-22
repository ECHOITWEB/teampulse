import { 
  collection, doc, updateDoc, increment, addDoc, 
  serverTimestamp, query, where, getDocs, getDoc,
  runTransaction 
} from 'firebase/firestore';
import { db } from '../config/firebase';

interface AIUsageRecord {
  workspace_id: string;
  user_id: string;
  model: string;
  tokens_used: number;
  cost: number;
  operation_type: string;
  timestamp: any;
}

interface WorkspaceUsageSummary {
  total_tokens: number;
  total_cost: number;
  user_count: number;
  operations_count: number;
  top_users: Array<{
    user_id: string;
    email: string;
    tokens_used: number;
    cost: number;
  }>;
}

class AIUsageService {
  // Token costs per model (example rates)
  private readonly tokenCosts = {
    'gpt-4': 0.03 / 1000,      // $0.03 per 1K tokens
    'gpt-3.5-turbo': 0.002 / 1000, // $0.002 per 1K tokens
    'claude-2': 0.008 / 1000,   // $0.008 per 1K tokens
    'claude-instant': 0.0008 / 1000 // $0.0008 per 1K tokens
  };

  /**
   * Track AI usage for a specific operation
   */
  async trackUsage(
    workspaceId: string,
    userId: string,
    model: string,
    tokensUsed: number,
    operationType: string
  ): Promise<void> {
    try {
      // Calculate cost
      const cost = this.calculateCost(model, tokensUsed);

      // Start a transaction to update multiple documents atomically
      await runTransaction(db, async (transaction) => {
        // Update workspace usage
        const workspaceRef = doc(db, 'workspaces', workspaceId);
        const workspaceDoc = await transaction.get(workspaceRef);
        
        if (!workspaceDoc.exists()) {
          throw new Error('Workspace not found');
        }

        const workspaceData = workspaceDoc.data();
        const currentUsage = workspaceData.ai_usage_this_month || 0;
        const usageLimit = workspaceData.ai_usage_limit || 10000;

        // Check if usage would exceed limit
        if (currentUsage + tokensUsed > usageLimit) {
          throw new Error('AI usage limit exceeded for this workspace');
        }

        // Update workspace usage
        transaction.update(workspaceRef, {
          ai_usage_this_month: increment(tokensUsed),
          ai_cost_this_month: increment(cost),
          last_ai_usage: serverTimestamp()
        });

        // Update user usage within workspace
        const userWorkspaceUsageRef = doc(
          db, 
          'members',
          `${workspaceId}_${userId}`
        );
        
        transaction.update(userWorkspaceUsageRef, {
          ai_usage_this_month: increment(tokensUsed),
          ai_cost_this_month: increment(cost),
          last_ai_usage: serverTimestamp()
        });

        // Create usage record
        const usageRecord: AIUsageRecord = {
          workspace_id: workspaceId,
          user_id: userId,
          model,
          tokens_used: tokensUsed,
          cost,
          operation_type: operationType,
          timestamp: serverTimestamp()
        };

        // Add to ai_usage collection
        const usageRef = collection(db, 'ai_usage');
        transaction.set(doc(usageRef), usageRecord);
      });

      console.log(`Tracked AI usage: ${tokensUsed} tokens for workspace ${workspaceId}`);
    } catch (error) {
      console.error('Error tracking AI usage:', error);
      throw error;
    }
  }

  /**
   * Calculate cost based on model and tokens
   */
  private calculateCost(model: string, tokens: number): number {
    const rate = this.tokenCosts[model as keyof typeof this.tokenCosts] || 0.001 / 1000;
    return tokens * rate;
  }

  /**
   * Get workspace usage summary for the current month
   */
  async getWorkspaceUsageSummary(workspaceId: string): Promise<WorkspaceUsageSummary> {
    try {
      // Get workspace data
      const workspaceDoc = await getDoc(doc(db, 'workspaces', workspaceId));
      if (!workspaceDoc.exists()) {
        throw new Error('Workspace not found');
      }

      const workspaceData = workspaceDoc.data();

      // Get all members and their usage
      const membersQuery = query(
        collection(db, 'members'),
        where('workspace_id', '==', workspaceId),
        where('status', '==', 'active')
      );

      const membersSnapshot = await getDocs(membersQuery);
      const topUsers: WorkspaceUsageSummary['top_users'] = [];

      for (const memberDoc of membersSnapshot.docs) {
        const memberData = memberDoc.data();
        if (memberData.ai_usage_this_month > 0) {
          // Get user details
          const userDoc = await getDoc(doc(db, 'users', memberData.user_id));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            topUsers.push({
              user_id: memberData.user_id,
              email: userData.email,
              tokens_used: memberData.ai_usage_this_month || 0,
              cost: memberData.ai_cost_this_month || 0
            });
          }
        }
      }

      // Sort by usage
      topUsers.sort((a, b) => b.tokens_used - a.tokens_used);

      // Get operation count for this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const usageQuery = query(
        collection(db, 'ai_usage'),
        where('workspace_id', '==', workspaceId),
        where('timestamp', '>=', startOfMonth)
      );

      const usageSnapshot = await getDocs(usageQuery);

      return {
        total_tokens: workspaceData.ai_usage_this_month || 0,
        total_cost: workspaceData.ai_cost_this_month || 0,
        user_count: topUsers.length,
        operations_count: usageSnapshot.size,
        top_users: topUsers.slice(0, 10) // Top 10 users
      };
    } catch (error) {
      console.error('Error getting workspace usage summary:', error);
      throw error;
    }
  }

  /**
   * Reset monthly usage (to be called by a scheduled function)
   */
  async resetMonthlyUsage(): Promise<void> {
    try {
      // Reset workspace usage
      const workspacesSnapshot = await getDocs(collection(db, 'workspaces'));
      const batch = [];

      for (const workspaceDoc of workspacesSnapshot.docs) {
        batch.push(
          updateDoc(doc(db, 'workspaces', workspaceDoc.id), {
            ai_usage_this_month: 0,
            ai_cost_this_month: 0,
            ai_usage_last_month: workspaceDoc.data().ai_usage_this_month || 0,
            ai_cost_last_month: workspaceDoc.data().ai_cost_this_month || 0,
            usage_reset_at: serverTimestamp()
          })
        );
      }

      // Reset member usage
      const membersSnapshot = await getDocs(collection(db, 'members'));
      for (const memberDoc of membersSnapshot.docs) {
        batch.push(
          updateDoc(doc(db, 'members', memberDoc.id), {
            ai_usage_this_month: 0,
            ai_cost_this_month: 0,
            ai_usage_last_month: memberDoc.data().ai_usage_this_month || 0,
            ai_cost_last_month: memberDoc.data().ai_cost_this_month || 0
          })
        );
      }

      await Promise.all(batch);
      console.log('Monthly usage reset completed');
    } catch (error) {
      console.error('Error resetting monthly usage:', error);
      throw error;
    }
  }

  /**
   * Check if workspace has remaining AI tokens
   */
  async checkUsageLimit(workspaceId: string, requiredTokens: number): Promise<boolean> {
    try {
      const workspaceDoc = await getDoc(doc(db, 'workspaces', workspaceId));
      if (!workspaceDoc.exists()) {
        throw new Error('Workspace not found');
      }

      const workspaceData = workspaceDoc.data();
      const currentUsage = workspaceData.ai_usage_this_month || 0;
      const usageLimit = workspaceData.ai_usage_limit || 10000;

      return (currentUsage + requiredTokens) <= usageLimit;
    } catch (error) {
      console.error('Error checking usage limit:', error);
      return false;
    }
  }

  /**
   * Get user's usage within a workspace
   */
  async getUserUsageInWorkspace(workspaceId: string, userId: string): Promise<{
    tokens_used: number;
    cost: number;
    last_used?: Date;
  }> {
    try {
      const memberQuery = query(
        collection(db, 'members'),
        where('workspace_id', '==', workspaceId),
        where('user_id', '==', userId)
      );

      const memberSnapshot = await getDocs(memberQuery);
      if (memberSnapshot.empty) {
        return { tokens_used: 0, cost: 0 };
      }

      const memberData = memberSnapshot.docs[0].data();
      return {
        tokens_used: memberData.ai_usage_this_month || 0,
        cost: memberData.ai_cost_this_month || 0,
        last_used: memberData.last_ai_usage?.toDate()
      };
    } catch (error) {
      console.error('Error getting user usage:', error);
      return { tokens_used: 0, cost: 0 };
    }
  }
}

export default new AIUsageService();