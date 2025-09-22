import { 
  collection, doc, updateDoc, increment, addDoc, 
  serverTimestamp, query, where, getDocs, getDoc,
  runTransaction, Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Model pricing in Pulses per 1K tokens
export const MODEL_PULSE_RATES = {
  // OpenAI Models
  'gpt-4-turbo': { input: 10, output: 30 },      // Premium model
  'gpt-4': { input: 30, output: 60 },            // Most expensive
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },  // Budget model
  'gpt-3.5-turbo-16k': { input: 3, output: 4 },  // Extended context
  
  // Anthropic Models
  'claude-3-opus': { input: 15, output: 75 },    // Most capable
  'claude-3-sonnet': { input: 3, output: 15 },   // Balanced
  'claude-3-haiku': { input: 0.25, output: 1.25 }, // Fast & cheap
  'claude-2.1': { input: 8, output: 24 },        // Previous gen
  'claude-instant': { input: 0.8, output: 2.4 }, // Budget option
};

// Model tiers for restrictions
export const MODEL_TIERS = {
  premium: ['gpt-4', 'gpt-4-turbo', 'claude-3-opus'],
  standard: ['claude-3-sonnet', 'claude-2.1', 'gpt-3.5-turbo-16k'],
  basic: ['gpt-3.5-turbo', 'claude-3-haiku', 'claude-instant']
};

interface PulseUsageRecord {
  workspace_id: string;
  user_id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  pulses_used: number;
  operation_type: string;
  timestamp: any;
}

interface WorkspacePulseConfig {
  workspace_id: string;
  allocated_pulses: number;        // Total allocated Pulses
  used_pulses: number;              // Used Pulses this period
  pulse_limit: number;              // Max Pulses per period
  allowed_models: string[];         // List of allowed models
  model_tier: 'premium' | 'standard' | 'basic';
  reset_period: 'daily' | 'weekly' | 'monthly';
  last_reset: Timestamp;
}

class PulseService {
  /**
   * Calculate Pulses needed for a request
   */
  calculatePulses(model: string, inputTokens: number, outputTokens: number): number {
    const rates = MODEL_PULSE_RATES[model as keyof typeof MODEL_PULSE_RATES];
    if (!rates) {
      // Default rate if model not found
      return Math.ceil((inputTokens + outputTokens) / 100); // 1 Pulse per 100 tokens
    }
    
    // Calculate Pulses (rates are per 1K tokens)
    const inputPulses = (inputTokens / 1000) * rates.input;
    const outputPulses = (outputTokens / 1000) * rates.output;
    
    return Math.ceil(inputPulses + outputPulses);
  }

  /**
   * Check if workspace has enough Pulses for a request
   */
  async checkPulseAvailability(
    workspaceId: string, 
    model: string, 
    estimatedInputTokens: number,
    estimatedOutputTokens: number
  ): Promise<{ 
    hasEnoughPulses: boolean; 
    requiredPulses: number; 
    availablePulses: number;
    modelAllowed: boolean;
  }> {
    try {
      // Get workspace Pulse configuration
      const configDoc = await getDoc(doc(db, 'workspace_pulse_config', workspaceId));
      
      if (!configDoc.exists()) {
        // Create default config if not exists
        await this.createDefaultPulseConfig(workspaceId);
        return {
          hasEnoughPulses: true,
          requiredPulses: 0,
          availablePulses: 10000, // Default allocation
          modelAllowed: true
        };
      }

      const config = configDoc.data() as WorkspacePulseConfig;
      
      // Check if model is allowed
      const modelAllowed = this.isModelAllowed(model, config);
      
      // Calculate required Pulses
      const requiredPulses = this.calculatePulses(model, estimatedInputTokens, estimatedOutputTokens);
      const availablePulses = config.allocated_pulses - config.used_pulses;
      
      return {
        hasEnoughPulses: availablePulses >= requiredPulses,
        requiredPulses,
        availablePulses,
        modelAllowed
      };
    } catch (error) {
      console.error('Error checking Pulse availability:', error);
      return {
        hasEnoughPulses: false,
        requiredPulses: 0,
        availablePulses: 0,
        modelAllowed: false
      };
    }
  }

  /**
   * Track Pulse usage for a completed request
   */
  async trackPulseUsage(
    workspaceId: string,
    userId: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    operationType: string
  ): Promise<void> {
    try {
      const pulsesUsed = this.calculatePulses(model, inputTokens, outputTokens);

      await runTransaction(db, async (transaction) => {
        // Update workspace Pulse config
        const configRef = doc(db, 'workspace_pulse_config', workspaceId);
        const configDoc = await transaction.get(configRef);
        
        if (!configDoc.exists()) {
          throw new Error('Workspace Pulse config not found');
        }

        const config = configDoc.data() as WorkspacePulseConfig;
        const newUsedPulses = config.used_pulses + pulsesUsed;
        
        // Check if limit would be exceeded
        if (newUsedPulses > config.pulse_limit) {
          throw new Error('Pulse limit exceeded for this workspace');
        }

        // Update config
        transaction.update(configRef, {
          used_pulses: increment(pulsesUsed),
          last_usage: serverTimestamp()
        });

        // Update workspace document for backward compatibility
        const workspaceRef = doc(db, 'workspaces', workspaceId);
        transaction.update(workspaceRef, {
          pulse_usage_this_month: increment(pulsesUsed),
          ai_usage_this_month: increment(inputTokens + outputTokens), // Keep token tracking
          last_ai_usage: serverTimestamp()
        });

        // Update user usage within workspace
        const userWorkspaceUsageRef = doc(
          db, 
          'members',
          `${workspaceId}_${userId}`
        );
        
        transaction.update(userWorkspaceUsageRef, {
          pulse_usage_this_month: increment(pulsesUsed),
          ai_usage_this_month: increment(inputTokens + outputTokens),
          last_ai_usage: serverTimestamp()
        });

        // Create usage record
        const usageRecord: PulseUsageRecord = {
          workspace_id: workspaceId,
          user_id: userId,
          model,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          pulses_used: pulsesUsed,
          operation_type: operationType,
          timestamp: serverTimestamp()
        };

        // Add to pulse_usage collection
        const usageRef = collection(db, 'pulse_usage');
        transaction.set(doc(usageRef), usageRecord);
      });

      console.log(`Tracked Pulse usage: ${pulsesUsed} Pulses for workspace ${workspaceId}`);
    } catch (error) {
      console.error('Error tracking Pulse usage:', error);
      throw error;
    }
  }

  /**
   * Allocate Pulses to a workspace (HQ Admin function)
   */
  async allocatePulses(
    workspaceId: string,
    pulseAmount: number,
    modelTier: 'premium' | 'standard' | 'basic' = 'standard'
  ): Promise<void> {
    try {
      const configRef = doc(db, 'workspace_pulse_config', workspaceId);
      const configDoc = await getDoc(configRef);
      
      if (!configDoc.exists()) {
        // Create new config
        await this.createPulseConfig(workspaceId, pulseAmount, modelTier);
      } else {
        // Update existing config
        await updateDoc(configRef, {
          allocated_pulses: increment(pulseAmount),
          model_tier: modelTier,
          allowed_models: this.getModelsForTier(modelTier),
          updated_at: serverTimestamp()
        });
      }
      
      // Also update workspace document
      await updateDoc(doc(db, 'workspaces', workspaceId), {
        pulse_balance: increment(pulseAmount),
        model_tier: modelTier,
        pulse_allocated_at: serverTimestamp()
      });
      
      console.log(`Allocated ${pulseAmount} Pulses to workspace ${workspaceId}`);
    } catch (error) {
      console.error('Error allocating Pulses:', error);
      throw error;
    }
  }

  /**
   * Set model restrictions for a workspace
   */
  async setModelRestrictions(
    workspaceId: string,
    modelTier: 'premium' | 'standard' | 'basic',
    customAllowedModels?: string[]
  ): Promise<void> {
    try {
      const configRef = doc(db, 'workspace_pulse_config', workspaceId);
      const allowedModels = customAllowedModels || this.getModelsForTier(modelTier);
      
      await updateDoc(configRef, {
        model_tier: modelTier,
        allowed_models: allowedModels,
        updated_at: serverTimestamp()
      });
      
      console.log(`Updated model restrictions for workspace ${workspaceId}`);
    } catch (error) {
      console.error('Error setting model restrictions:', error);
      throw error;
    }
  }

  /**
   * Get workspace Pulse summary
   */
  async getWorkspacePulseSummary(workspaceId: string): Promise<{
    allocated: number;
    used: number;
    available: number;
    modelTier: string;
    allowedModels: string[];
    usagePercentage: number;
  }> {
    try {
      const configDoc = await getDoc(doc(db, 'workspace_pulse_config', workspaceId));
      
      if (!configDoc.exists()) {
        await this.createDefaultPulseConfig(workspaceId);
        return {
          allocated: 10000,
          used: 0,
          available: 10000,
          modelTier: 'standard',
          allowedModels: this.getModelsForTier('standard'),
          usagePercentage: 0
        };
      }
      
      const config = configDoc.data() as WorkspacePulseConfig;
      const available = config.allocated_pulses - config.used_pulses;
      const usagePercentage = (config.used_pulses / config.allocated_pulses) * 100;
      
      return {
        allocated: config.allocated_pulses,
        used: config.used_pulses,
        available,
        modelTier: config.model_tier,
        allowedModels: config.allowed_models,
        usagePercentage
      };
    } catch (error) {
      console.error('Error getting Pulse summary:', error);
      return {
        allocated: 0,
        used: 0,
        available: 0,
        modelTier: 'basic',
        allowedModels: [],
        usagePercentage: 0
      };
    }
  }

  /**
   * Reset Pulse usage (scheduled function)
   */
  async resetPulseUsage(period: 'daily' | 'weekly' | 'monthly' = 'monthly'): Promise<void> {
    try {
      const configsQuery = query(
        collection(db, 'workspace_pulse_config'),
        where('reset_period', '==', period)
      );
      
      const configsSnapshot = await getDocs(configsQuery);
      const batch = [];
      
      for (const configDoc of configsSnapshot.docs) {
        batch.push(
          updateDoc(doc(db, 'workspace_pulse_config', configDoc.id), {
            used_pulses: 0,
            last_reset: serverTimestamp(),
            previous_used_pulses: configDoc.data().used_pulses
          })
        );
      }
      
      await Promise.all(batch);
      console.log(`Reset Pulse usage for ${period} workspaces`);
    } catch (error) {
      console.error('Error resetting Pulse usage:', error);
      throw error;
    }
  }

  // Helper functions
  private isModelAllowed(model: string, config: WorkspacePulseConfig): boolean {
    if (!config.allowed_models || config.allowed_models.length === 0) {
      // If no restrictions, check tier
      const tierModels = this.getModelsForTier(config.model_tier);
      return tierModels.includes(model);
    }
    return config.allowed_models.includes(model);
  }

  private getModelsForTier(tier: 'premium' | 'standard' | 'basic'): string[] {
    switch (tier) {
      case 'premium':
        return [...MODEL_TIERS.premium, ...MODEL_TIERS.standard, ...MODEL_TIERS.basic];
      case 'standard':
        return [...MODEL_TIERS.standard, ...MODEL_TIERS.basic];
      case 'basic':
        return MODEL_TIERS.basic;
      default:
        return MODEL_TIERS.basic;
    }
  }

  private async createDefaultPulseConfig(workspaceId: string): Promise<void> {
    await this.createPulseConfig(workspaceId, 10000, 'standard');
  }

  private async createPulseConfig(
    workspaceId: string,
    initialPulses: number,
    modelTier: 'premium' | 'standard' | 'basic'
  ): Promise<void> {
    const config: WorkspacePulseConfig = {
      workspace_id: workspaceId,
      allocated_pulses: initialPulses,
      used_pulses: 0,
      pulse_limit: initialPulses,
      allowed_models: this.getModelsForTier(modelTier),
      model_tier: modelTier,
      reset_period: 'monthly',
      last_reset: Timestamp.now()
    };
    
    await addDoc(collection(db, 'workspace_pulse_config'), config);
  }
}

export default new PulseService();