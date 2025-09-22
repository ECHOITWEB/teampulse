import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  serverTimestamp,
  Timestamp,
  addDoc,
  deleteDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export interface HQMember {
  id?: string;
  company_id: string;
  user_id: string;
  role: 'super_admin' | 'admin' | 'billing_manager' | 'viewer';
  permissions: {
    manage_workspaces: boolean;
    manage_billing: boolean;
    manage_members: boolean;
    manage_company_objectives: boolean;
    view_all_objectives: boolean;
    approve_workspace_creation: boolean;
  };
  joined_at: Timestamp;
  added_by: string;
}

export interface CompanyHQ {
  id?: string;
  company_id: string;
  company_name: string;
  established_at: Timestamp;
  
  // Billing Information
  billing: {
    plan: 'free' | 'starter' | 'professional' | 'enterprise';
    billing_cycle: 'monthly' | 'yearly';
    payment_method?: string;
    billing_email: string;
    next_billing_date?: Timestamp;
    total_monthly_cost: number;
  };
  
  // Limits and Usage
  limits: {
    max_workspaces: number;
    max_members_per_workspace: number;
    max_total_members: number;
    max_storage_gb: number;
  };
  
  usage: {
    current_workspaces: number;
    current_total_members: number;
    current_storage_gb: number;
    active_objectives: number;
  };
  
  // Settings
  settings: {
    require_workspace_approval: boolean;
    require_member_approval: boolean;
    allow_workspace_creation: boolean;
    enforce_2fa: boolean;
    data_retention_days: number;
  };
  
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface WorkspaceJoinRequest {
  id?: string;
  workspace_id: string;
  workspace_name: string;
  user_id: string;
  user_email: string;
  user_name: string;
  requested_at: Timestamp;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: Timestamp;
  rejection_reason?: string;
  invitation_code?: string;
}

export interface CompanyObjective {
  id?: string;
  company_id: string;
  hq_id: string;
  title: string;
  description: string;
  category: 'strategic' | 'financial' | 'operational' | 'cultural';
  year: number;
  quarter?: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  progress: number;
  
  // Cascading to workspaces
  cascaded_to: string[]; // workspace IDs
  require_alignment: boolean;
  
  owner_id: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

class HQService {
  private hqCollection = collection(db, 'company_hq');
  private hqMembersCollection = collection(db, 'hq_members');
  private joinRequestsCollection = collection(db, 'workspace_join_requests');
  private companyObjectivesCollection = collection(db, 'company_objectives');

  // Initialize HQ for a company
  async initializeHQ(companyId: string, companyName: string, founderId: string): Promise<string> {
    try {
      // Check if HQ already exists
      const existingHQ = await this.getCompanyHQ(companyId);
      if (existingHQ) {
        return existingHQ.id!;
      }

      // Create HQ
      const hqData: CompanyHQ = {
        company_id: companyId,
        company_name: companyName,
        established_at: serverTimestamp() as Timestamp,
        billing: {
          plan: 'free',
          billing_cycle: 'monthly',
          billing_email: '',
          total_monthly_cost: 0
        },
        limits: {
          max_workspaces: 3, // Free plan limits
          max_members_per_workspace: 10,
          max_total_members: 25,
          max_storage_gb: 5
        },
        usage: {
          current_workspaces: 1,
          current_total_members: 1,
          current_storage_gb: 0,
          active_objectives: 0
        },
        settings: {
          require_workspace_approval: true,
          require_member_approval: true,
          allow_workspace_creation: true,
          enforce_2fa: false,
          data_retention_days: 90
        },
        created_at: serverTimestamp() as Timestamp,
        updated_at: serverTimestamp() as Timestamp
      };

      const hqRef = await addDoc(this.hqCollection, hqData);

      // Add founder as super admin
      await this.addHQMember({
        company_id: companyId,
        user_id: founderId,
        role: 'super_admin',
        permissions: {
          manage_workspaces: true,
          manage_billing: true,
          manage_members: true,
          manage_company_objectives: true,
          view_all_objectives: true,
          approve_workspace_creation: true
        },
        joined_at: serverTimestamp() as Timestamp,
        added_by: 'system'
      });

      return hqRef.id;
    } catch (error) {
      console.error('Error initializing HQ:', error);
      throw error;
    }
  }

  // Get Company HQ
  async getCompanyHQ(companyId: string): Promise<CompanyHQ | null> {
    try {
      const q = query(
        this.hqCollection,
        where('company_id', '==', companyId),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return null;
      }

      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as CompanyHQ;
    } catch (error) {
      console.error('Error getting company HQ:', error);
      return null;
    }
  }

  // Add HQ Member (auto-add workspace admins)
  async addHQMember(member: HQMember): Promise<string> {
    try {
      const docRef = await addDoc(this.hqMembersCollection, member);
      return docRef.id;
    } catch (error) {
      console.error('Error adding HQ member:', error);
      throw error;
    }
  }

  // Get HQ Members
  async getHQMembers(companyId: string): Promise<HQMember[]> {
    try {
      const q = query(
        this.hqMembersCollection,
        where('company_id', '==', companyId)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as HQMember[];
    } catch (error) {
      console.error('Error getting HQ members:', error);
      return [];
    }
  }

  // Get single HQ member by user ID
  async getHQMember(companyId: string, userId: string): Promise<HQMember | null> {
    try {
      const q = query(
        this.hqMembersCollection,
        where('company_id', '==', companyId),
        where('user_id', '==', userId),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        } as HQMember;
      }
      return null;
    } catch (error) {
      console.error('Error getting HQ member:', error);
      return null;
    }
  }

  // Check if user is HQ member or workspace owner/admin
  async isHQMember(userId: string, companyId: string): Promise<boolean> {
    try {
      // First check if user is explicitly an HQ member
      const hqMemberQuery = query(
        this.hqMembersCollection,
        where('company_id', '==', companyId),
        where('user_id', '==', userId),
        limit(1)
      );
      
      const hqSnapshot = await getDocs(hqMemberQuery);
      if (!hqSnapshot.empty) {
        return true;
      }

      // Check if user is owner or admin of any workspace in this company
      const workspacesQuery = query(
        collection(db, 'workspaces'),
        where('company_id', '==', companyId)
      );
      
      const workspacesSnapshot = await getDocs(workspacesQuery);
      
      for (const workspaceDoc of workspacesSnapshot.docs) {
        const memberQuery = query(
          collection(db, 'members'),
          where('workspace_id', '==', workspaceDoc.id),
          where('user_id', '==', userId),
          where('workspace_role', 'in', ['owner', 'admin']),
          where('status', '==', 'active'),
          limit(1)
        );
        
        const memberSnapshot = await getDocs(memberQuery);
        if (!memberSnapshot.empty) {
          // User is owner or admin of at least one workspace in this company
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking HQ membership:', error);
      return false;
    }
  }

  // Create workspace join request
  async createJoinRequest(data: {
    workspace_id: string;
    workspace_name: string;
    user_email: string;
    user_name: string;
    invitation_code?: string;
  }): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const requestData: WorkspaceJoinRequest = {
      ...data,
      user_id: user.uid,
      requested_at: serverTimestamp() as Timestamp,
      status: 'pending'
    };

    const docRef = await addDoc(this.joinRequestsCollection, requestData);
    return docRef.id;
  }

  // Get pending join requests for a workspace
  async getPendingJoinRequests(workspaceId: string): Promise<WorkspaceJoinRequest[]> {
    try {
      const q = query(
        this.joinRequestsCollection,
        where('workspace_id', '==', workspaceId),
        where('status', '==', 'pending'),
        orderBy('requested_at', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WorkspaceJoinRequest[];
    } catch (error) {
      console.error('Error getting join requests:', error);
      return [];
    }
  }

  // Approve/Reject join request
  async reviewJoinRequest(
    requestId: string, 
    decision: 'approved' | 'rejected',
    reviewerId: string,
    rejectionReason?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status: decision,
        reviewed_by: reviewerId,
        reviewed_at: serverTimestamp()
      };

      if (decision === 'rejected' && rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }

      await updateDoc(doc(db, 'workspace_join_requests', requestId), updateData);

      // If approved, add member to workspace
      if (decision === 'approved') {
        const request = await getDoc(doc(db, 'workspace_join_requests', requestId));
        const requestData = request.data() as WorkspaceJoinRequest;
        
        // Add member logic here (integrate with memberService)
        // await memberService.createMember({...})
      }
    } catch (error) {
      console.error('Error reviewing join request:', error);
      throw error;
    }
  }

  // Create company-level objective
  async createCompanyObjective(data: {
    company_id: string;
    hq_id: string;
    title: string;
    description: string;
    category: 'strategic' | 'financial' | 'operational' | 'cultural';
    year: number;
    quarter?: number;
    priority: 'critical' | 'high' | 'medium' | 'low';
    cascaded_to?: string[];
    require_alignment?: boolean;
  }): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const objectiveData: CompanyObjective = {
      ...data,
      status: 'active',
      progress: 0,
      cascaded_to: data.cascaded_to || [],
      require_alignment: data.require_alignment || false,
      owner_id: user.uid,
      created_at: serverTimestamp() as Timestamp,
      updated_at: serverTimestamp() as Timestamp
    };

    const docRef = await addDoc(this.companyObjectivesCollection, objectiveData);
    return docRef.id;
  }

  // Get company objectives
  async getCompanyObjectives(companyId: string, year?: number): Promise<CompanyObjective[]> {
    try {
      let q = query(
        this.companyObjectivesCollection,
        where('company_id', '==', companyId),
        where('status', '==', 'active')
      );

      if (year) {
        q = query(
          this.companyObjectivesCollection,
          where('company_id', '==', companyId),
          where('year', '==', year),
          where('status', '==', 'active')
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CompanyObjective[];
    } catch (error) {
      console.error('Error getting company objectives:', error);
      return [];
    }
  }

  // Update HQ settings
  async updateHQSettings(hqId: string, settings: Partial<CompanyHQ['settings']>): Promise<void> {
    try {
      await updateDoc(doc(db, 'company_hq', hqId), {
        settings,
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating HQ settings:', error);
      throw error;
    }
  }

  // Update billing plan
  async updateBillingPlan(
    hqId: string, 
    plan: 'free' | 'starter' | 'professional' | 'enterprise',
    billingCycle: 'monthly' | 'yearly'
  ): Promise<void> {
    try {
      const limits = this.getPlanLimits(plan);
      
      await updateDoc(doc(db, 'company_hq', hqId), {
        'billing.plan': plan,
        'billing.billing_cycle': billingCycle,
        'billing.total_monthly_cost': this.calculateMonthlyCost(plan, billingCycle),
        limits,
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating billing plan:', error);
      throw error;
    }
  }

  // Get plan limits
  private getPlanLimits(plan: string) {
    const limits: { [key: string]: CompanyHQ['limits'] } = {
      free: {
        max_workspaces: 3,
        max_members_per_workspace: 10,
        max_total_members: 25,
        max_storage_gb: 5
      },
      starter: {
        max_workspaces: 10,
        max_members_per_workspace: 50,
        max_total_members: 200,
        max_storage_gb: 50
      },
      professional: {
        max_workspaces: 50,
        max_members_per_workspace: 200,
        max_total_members: 1000,
        max_storage_gb: 500
      },
      enterprise: {
        max_workspaces: -1, // unlimited
        max_members_per_workspace: -1,
        max_total_members: -1,
        max_storage_gb: -1
      }
    };
    
    return limits[plan] || limits.free;
  }

  // Calculate monthly cost
  private calculateMonthlyCost(plan: string, cycle: 'monthly' | 'yearly'): number {
    const monthlyPrices: { [key: string]: number } = {
      free: 0,
      starter: 29,
      professional: 99,
      enterprise: 299
    };
    
    const price = monthlyPrices[plan] || 0;
    
    // 20% discount for yearly billing
    return cycle === 'yearly' ? price * 0.8 : price;
  }

  // Check workspace creation permission
  async canCreateWorkspace(companyId: string): Promise<boolean> {
    try {
      const hq = await this.getCompanyHQ(companyId);
      if (!hq) return false;

      if (!hq.settings.allow_workspace_creation) return false;
      
      if (hq.limits.max_workspaces === -1) return true; // unlimited
      
      return hq.usage.current_workspaces < hq.limits.max_workspaces;
    } catch (error) {
      console.error('Error checking workspace creation permission:', error);
      return false;
    }
  }

  // Update usage stats
  async updateUsageStats(companyId: string): Promise<void> {
    try {
      const hq = await this.getCompanyHQ(companyId);
      if (!hq) return;

      // Get actual counts from database
      const workspacesQuery = query(
        collection(db, 'workspaces'),
        where('company_id', '==', companyId)
      );
      const workspacesSnapshot = await getDocs(workspacesQuery);

      const membersQuery = query(
        collection(db, 'members'),
        where('company_id', '==', companyId)
      );
      const membersSnapshot = await getDocs(membersQuery);

      const objectivesQuery = query(
        collection(db, 'company_objectives'),
        where('company_id', '==', companyId),
        where('status', '==', 'active')
      );
      const objectivesSnapshot = await getDocs(objectivesQuery);

      await updateDoc(doc(db, 'company_hq', hq.id!), {
        'usage.current_workspaces': workspacesSnapshot.size,
        'usage.current_total_members': membersSnapshot.size,
        'usage.active_objectives': objectivesSnapshot.size,
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating usage stats:', error);
    }
  }
}

const hqService = new HQService();
export default hqService;