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

export interface Member {
  id: string;
  user_id: string;
  company_id: string;
  workspace_id: string;
  
  company_role: 'owner' | 'admin' | 'member';
  workspace_role: 'owner' | 'admin' | 'member';
  
  permissions: {
    can_create_objectives: boolean;
    can_edit_all_objectives: boolean;
    can_delete_objectives: boolean;
    can_manage_members: boolean;
    can_manage_settings: boolean;
    can_view_analytics: boolean;
  };
  
  status: 'active' | 'inactive' | 'suspended';
  joined_at: Timestamp;
  last_active: Timestamp;
  
  workspace_profile: {
    display_name?: string;
    department?: string;
    position?: string;
    team?: string;
  };
}

class MemberService {
  private membersCollection = collection(db, 'members');

  async createMember(data: {
    user_id: string;
    company_id: string;
    workspace_id: string;
    company_role?: 'owner' | 'admin' | 'member';
    workspace_role?: 'owner' | 'admin' | 'member';
  }): Promise<string> {
    const role = data.workspace_role || 'member';
    
    const memberData: Omit<Member, 'id'> = {
      user_id: data.user_id,
      company_id: data.company_id,
      workspace_id: data.workspace_id,
      company_role: data.company_role || 'member',
      workspace_role: role,
      permissions: {
        can_create_objectives: true,
        can_edit_all_objectives: role !== 'member',
        can_delete_objectives: role === 'owner' || role === 'admin',
        can_manage_members: role === 'owner' || role === 'admin',
        can_manage_settings: role === 'owner',
        can_view_analytics: true
      },
      status: 'active',
      joined_at: serverTimestamp() as Timestamp,
      last_active: serverTimestamp() as Timestamp,
      workspace_profile: {}
    };

    const docRef = await addDoc(this.membersCollection, memberData);
    return docRef.id;
  }

  async getMember(memberId: string): Promise<Member | null> {
    try {
      const docRef = doc(db, 'members', memberId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Member;
    } catch (error) {
      console.error('Error getting member:', error);
      return null;
    }
  }

  async getMemberByUserAndWorkspace(userId: string, workspaceId: string): Promise<Member | null> {
    try {
      const q = query(
        this.membersCollection,
        where('user_id', '==', userId),
        where('workspace_id', '==', workspaceId)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }
      
      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as Member;
    } catch (error) {
      console.error('Error getting member by user and workspace:', error);
      return null;
    }
  }

  async getWorkspaceMembers(workspaceId: string): Promise<Member[]> {
    try {
      const q = query(
        this.membersCollection,
        where('workspace_id', '==', workspaceId),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Member[];
    } catch (error) {
      console.error('Error getting workspace members:', error);
      return [];
    }
  }

  async getUserWorkspaces(userId: string): Promise<Member[]> {
    try {
      const q = query(
        this.membersCollection,
        where('user_id', '==', userId),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Member[];
    } catch (error) {
      console.error('Error getting user workspaces:', error);
      return [];
    }
  }

  async updateMember(memberId: string, updates: Partial<Member>): Promise<void> {
    try {
      const docRef = doc(db, 'members', memberId);
      await updateDoc(docRef, {
        ...updates,
        last_active: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating member:', error);
      throw error;
    }
  }

  async updateMemberRole(
    memberId: string, 
    newRole: 'owner' | 'admin' | 'member'
  ): Promise<void> {
    try {
      const permissions = {
        can_create_objectives: true,
        can_edit_all_objectives: newRole !== 'member',
        can_delete_objectives: newRole === 'owner' || newRole === 'admin',
        can_manage_members: newRole === 'owner' || newRole === 'admin',
        can_manage_settings: newRole === 'owner',
        can_view_analytics: true
      };

      await this.updateMember(memberId, {
        workspace_role: newRole,
        permissions
      });
    } catch (error) {
      console.error('Error updating member role:', error);
      throw error;
    }
  }

  async removeMember(memberId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'members', memberId));
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  }

  async updateLastActive(userId: string, workspaceId: string): Promise<void> {
    try {
      const member = await this.getMemberByUserAndWorkspace(userId, workspaceId);
      if (member) {
        await this.updateMember(member.id, {
          last_active: serverTimestamp() as Timestamp
        });
      }
    } catch (error) {
      console.error('Error updating last active:', error);
    }
  }

  async checkPermission(
    userId: string, 
    workspaceId: string, 
    permission: keyof Member['permissions']
  ): Promise<boolean> {
    try {
      const member = await this.getMemberByUserAndWorkspace(userId, workspaceId);
      if (!member) return false;
      
      return member.permissions[permission] || false;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  async isWorkspaceAdmin(userId: string, workspaceId: string): Promise<boolean> {
    try {
      const member = await this.getMemberByUserAndWorkspace(userId, workspaceId);
      if (!member) return false;
      
      return member.workspace_role === 'owner' || member.workspace_role === 'admin';
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  async getOrCreateMember(
    userId: string,
    companyId: string,
    workspaceId: string,
    role: 'owner' | 'admin' | 'member' = 'member'
  ): Promise<Member> {
    try {
      // Check if member already exists
      const existingMember = await this.getMemberByUserAndWorkspace(userId, workspaceId);
      if (existingMember) {
        return existingMember;
      }

      // Create new member
      const memberId = await this.createMember({
        user_id: userId,
        company_id: companyId,
        workspace_id: workspaceId,
        workspace_role: role,
        company_role: role
      });

      const newMember = await this.getMember(memberId);
      if (!newMember) {
        throw new Error('Failed to create member');
      }

      return newMember;
    } catch (error) {
      console.error('Error in getOrCreateMember:', error);
      throw error;
    }
  }
}

const memberService = new MemberService();
export default memberService;