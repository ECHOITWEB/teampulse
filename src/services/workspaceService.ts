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
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import companyService from './companyService';
import memberService from './memberService';

export interface Workspace {
  id: string;
  company_id: string;
  company_name: string;
  name: string;
  description?: string;
  type: 'headquarters' | 'team' | 'project' | 'subsidiary';
  is_main: boolean;
  
  owner_id: string;
  admin_ids: string[];
  
  plan?: 'free' | 'starter' | 'pro';
  settings: {
    okr_cycle: 'quarterly' | 'annual' | 'monthly';
    allow_individual_okrs: boolean;
    require_approval: boolean;
    features: {
      ai_enabled: boolean;
      chat_enabled: boolean;
      meetings_enabled: boolean;
    };
  };
  
  created_at: Timestamp;
  created_by: string;
  updated_at: Timestamp;
  
  stats: {
    member_count: number;
    active_objectives: number;
    completion_rate: number;
    last_activity: Timestamp;
  };
}

class WorkspaceService {
  private workspacesCollection = collection(db, 'workspaces');

  async createWorkspace(data: {
    name: string;
    company_name?: string;
    description?: string;
    type?: 'headquarters' | 'team' | 'project' | 'subsidiary';
  }): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Get or create company
    const companyName = data.company_name || data.name;
    const companyId = await companyService.getOrCreateCompanyFromWorkspace(companyName);

    // Get the company details
    const company = await companyService.getCompany(companyId);
    if (!company) throw new Error('Failed to create or get company');

    // Check if this is the first workspace for the company
    const existingWorkspaces = await this.getCompanyWorkspaces(companyId);
    const isMain = existingWorkspaces.length === 0;

    const workspaceData: Omit<Workspace, 'id'> = {
      company_id: companyId,
      company_name: company.name_ko,
      name: data.name,
      description: data.description,
      type: data.type || 'team',
      is_main: isMain,
      owner_id: user.uid,
      admin_ids: [user.uid],
      plan: 'free',
      settings: {
        okr_cycle: 'quarterly',
        allow_individual_okrs: true,
        require_approval: false,
        features: {
          ai_enabled: true,
          chat_enabled: true,
          meetings_enabled: true
        }
      },
      created_at: serverTimestamp() as Timestamp,
      created_by: user.uid,
      updated_at: serverTimestamp() as Timestamp,
      stats: {
        member_count: 1,
        active_objectives: 0,
        completion_rate: 0,
        last_activity: serverTimestamp() as Timestamp
      }
    };

    const docRef = await addDoc(this.workspacesCollection, workspaceData);
    
    // Create member entry for the creator
    await memberService.createMember({
      user_id: user.uid,
      company_id: companyId,
      workspace_id: docRef.id,
      workspace_role: 'owner',
      company_role: isMain ? 'owner' : 'member'
    });

    // Update company stats
    await companyService.updateCompanyStats(companyId);

    return docRef.id;
  }

  async getWorkspace(workspaceId: string): Promise<Workspace | null> {
    try {
      const docRef = doc(db, 'workspaces', workspaceId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Workspace;
    } catch (error) {
      console.error('Error getting workspace:', error);
      return null;
    }
  }

  async getCompanyWorkspaces(companyId: string): Promise<Workspace[]> {
    try {
      const q = query(
        this.workspacesCollection,
        where('company_id', '==', companyId)
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Workspace[];
    } catch (error) {
      console.error('Error getting company workspaces:', error);
      return [];
    }
  }

  async getUserWorkspaces(userId: string): Promise<Workspace[]> {
    try {
      // Get all member entries for this user
      const members = await memberService.getUserWorkspaces(userId);
      
      if (members.length === 0) return [];
      
      // Get workspace details for each membership
      const workspaces: Workspace[] = [];
      for (const member of members) {
        const workspace = await this.getWorkspace(member.workspace_id);
        if (workspace) {
          workspaces.push(workspace);
        }
      }
      
      return workspaces;
    } catch (error) {
      console.error('Error getting user workspaces:', error);
      return [];
    }
  }

  async updateWorkspace(workspaceId: string, updates: Partial<Workspace>): Promise<void> {
    try {
      const docRef = doc(db, 'workspaces', workspaceId);
      await updateDoc(docRef, {
        ...updates,
        updated_at: serverTimestamp()
      });
      
      // Update stats if workspace has company_id
      const workspace = await this.getWorkspace(workspaceId);
      if (workspace?.company_id) {
        await companyService.updateCompanyStats(workspace.company_id);
      }
    } catch (error) {
      console.error('Error updating workspace:', error);
      throw error;
    }
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    try {
      // Get workspace to find company
      const workspace = await this.getWorkspace(workspaceId);
      if (!workspace) throw new Error('Workspace not found');
      
      // Delete all members of this workspace
      const members = await memberService.getWorkspaceMembers(workspaceId);
      for (const member of members) {
        await memberService.removeMember(member.id);
      }
      
      // Delete the workspace
      await deleteDoc(doc(db, 'workspaces', workspaceId));
      
      // Update company stats
      await companyService.updateCompanyStats(workspace.company_id);
    } catch (error) {
      console.error('Error deleting workspace:', error);
      throw error;
    }
  }

  async addMember(
    workspaceId: string,
    userId: string,
    role: 'admin' | 'member' = 'member'
  ): Promise<void> {
    try {
      const workspace = await this.getWorkspace(workspaceId);
      if (!workspace) throw new Error('Workspace not found');
      
      await memberService.createMember({
        user_id: userId,
        company_id: workspace.company_id,
        workspace_id: workspaceId,
        workspace_role: role,
        company_role: 'member'
      });
      
      // Update workspace member count
      await this.updateWorkspaceStats(workspaceId);
    } catch (error) {
      console.error('Error adding member:', error);
      throw error;
    }
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    try {
      const member = await memberService.getMemberByUserAndWorkspace(userId, workspaceId);
      if (!member) throw new Error('Member not found');
      
      await memberService.removeMember(member.id);
      
      // Update workspace member count
      await this.updateWorkspaceStats(workspaceId);
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  }

  async updateWorkspaceStats(workspaceId: string): Promise<void> {
    try {
      // Get member count
      const members = await memberService.getWorkspaceMembers(workspaceId);
      
      // Get active objectives count
      const objectivesQuery = query(
        collection(db, 'objectives'),
        where('workspace_id', '==', workspaceId),
        where('status', '==', 'active')
      );
      const objectivesSnapshot = await getDocs(objectivesQuery);
      
      // Calculate completion rate
      let completedCount = 0;
      objectivesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.progress >= 100) {
          completedCount++;
        }
      });
      
      const completionRate = objectivesSnapshot.size > 0 
        ? Math.round((completedCount / objectivesSnapshot.size) * 100)
        : 0;
      
      // Update stats
      await updateDoc(doc(db, 'workspaces', workspaceId), {
        'stats.member_count': members.length,
        'stats.active_objectives': objectivesSnapshot.size,
        'stats.completion_rate': completionRate,
        'stats.last_activity': serverTimestamp(),
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating workspace stats:', error);
    }
  }

  async isUserMemberOfWorkspace(userId: string, workspaceId: string): Promise<boolean> {
    try {
      const member = await memberService.getMemberByUserAndWorkspace(userId, workspaceId);
      return member !== null && member.status === 'active';
    } catch (error) {
      console.error('Error checking workspace membership:', error);
      return false;
    }
  }

  async getUserRoleInWorkspace(
    userId: string, 
    workspaceId: string
  ): Promise<'owner' | 'admin' | 'member' | null> {
    try {
      const member = await memberService.getMemberByUserAndWorkspace(userId, workspaceId);
      return member?.workspace_role || null;
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }
}

const workspaceService = new WorkspaceService();
export default workspaceService;