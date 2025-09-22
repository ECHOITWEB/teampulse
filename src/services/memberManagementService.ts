import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc,
  getDoc,
  Timestamp,
  orderBy,
  DocumentData
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface CompanyMember {
  id: string;
  user_id: string;
  email: string;
  name: string;
  profile_image?: string;
  workspaces: {
    workspace_id: string;
    workspace_name: string;
    role: 'owner' | 'admin' | 'member';
    joined_at: Timestamp;
  }[];
  company_role: 'super_admin' | 'admin' | 'member';
  status: 'active' | 'inactive' | 'suspended';
  joined_at: Timestamp;
  last_active: Timestamp;
  ai_usage_total: number;
  ai_cost_total: number;
  department?: string;
  position?: string;
  phone?: string;
}

export interface MemberActivity {
  user_id: string;
  user_name: string;
  activity_type: 'login' | 'ai_usage' | 'meeting' | 'chat' | 'document' | 'goal_update';
  description: string;
  workspace_id?: string;
  workspace_name?: string;
  timestamp: Timestamp;
  metadata?: any;
}

export interface MemberStats {
  total_members: number;
  active_members: number;
  new_members_this_month: number;
  inactive_members: number;
  members_by_role: {
    super_admin: number;
    admin: number;
    member: number;
  };
  members_by_workspace: {
    workspace_id: string;
    workspace_name: string;
    member_count: number;
  }[];
  growth_rate: number;
}

class MemberManagementService {
  // Get all members in a company
  async getCompanyMembers(companyId: string): Promise<CompanyMember[]> {
    try {
      // Get all workspaces in the company
      const workspacesQuery = query(
        collection(db, 'workspaces'),
        where('company_id', '==', companyId)
      );
      const workspacesSnapshot = await getDocs(workspacesQuery);
      const workspaceIds = workspacesSnapshot.docs.map(doc => doc.id);
      
      if (workspaceIds.length === 0) {
        return [];
      }

      // Get all members in these workspaces
      const membersQuery = query(
        collection(db, 'members'),
        where('workspace_id', 'in', workspaceIds)
      );
      const membersSnapshot = await getDocs(membersQuery);
      
      // Group members by user_id
      const memberMap = new Map<string, CompanyMember>();
      
      for (const memberDoc of membersSnapshot.docs) {
        const memberData = memberDoc.data();
        const userId = memberData.user_id;
        
        // Get user details
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) continue;
        
        const userData = userDoc.data();
        
        if (!memberMap.has(userId)) {
          memberMap.set(userId, {
            id: userId,
            user_id: userId,
            email: userData.email,
            name: userData.displayName || userData.email.split('@')[0],
            profile_image: userData.photoURL,
            workspaces: [],
            company_role: 'member',
            status: 'active',
            joined_at: memberData.joined_at || Timestamp.now(),
            last_active: userData.last_active || Timestamp.now(),
            ai_usage_total: 0,
            ai_cost_total: 0,
            department: userData.department,
            position: userData.position,
            phone: userData.phone
          });
        }
        
        const member = memberMap.get(userId)!;
        
        // Add workspace info
        const workspace = workspacesSnapshot.docs.find(w => w.id === memberData.workspace_id);
        if (workspace) {
          member.workspaces.push({
            workspace_id: memberData.workspace_id,
            workspace_name: workspace.data().name,
            role: memberData.role,
            joined_at: memberData.joined_at
          });
        }
        
        // Update role to highest level
        if (memberData.role === 'owner' || memberData.role === 'admin') {
          member.company_role = memberData.role === 'owner' ? 'super_admin' : 'admin';
        }
        
        // Accumulate AI usage
        member.ai_usage_total += memberData.ai_usage_this_month || 0;
        member.ai_cost_total += memberData.ai_cost_this_month || 0;
      }
      
      return Array.from(memberMap.values());
    } catch (error) {
      console.error('Error getting company members:', error);
      return [];
    }
  }

  // Get member profile details
  async getMemberProfile(userId: string, companyId: string): Promise<CompanyMember | null> {
    try {
      const members = await this.getCompanyMembers(companyId);
      return members.find(m => m.user_id === userId) || null;
    } catch (error) {
      console.error('Error getting member profile:', error);
      return null;
    }
  }

  // Update member role in company
  async updateMemberRole(
    userId: string,
    companyId: string,
    newRole: 'super_admin' | 'admin' | 'member'
  ): Promise<void> {
    try {
      // Get all workspaces in the company
      const workspacesQuery = query(
        collection(db, 'workspaces'),
        where('company_id', '==', companyId)
      );
      const workspacesSnapshot = await getDocs(workspacesQuery);
      
      // Update role in all workspaces
      const updatePromises = [];
      for (const workspace of workspacesSnapshot.docs) {
        const memberQuery = query(
          collection(db, 'members'),
          where('workspace_id', '==', workspace.id),
          where('user_id', '==', userId)
        );
        const memberSnapshot = await getDocs(memberQuery);
        
        if (!memberSnapshot.empty) {
          const memberDoc = memberSnapshot.docs[0];
          const workspaceRole = newRole === 'super_admin' ? 'owner' : 
                               newRole === 'admin' ? 'admin' : 'member';
          
          updatePromises.push(
            updateDoc(doc(db, 'members', memberDoc.id), {
              role: workspaceRole,
              updated_at: Timestamp.now()
            })
          );
        }
      }
      
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error updating member role:', error);
      throw error;
    }
  }

  // Update member status
  async updateMemberStatus(
    userId: string,
    companyId: string,
    status: 'active' | 'inactive' | 'suspended'
  ): Promise<void> {
    try {
      // Update user document
      await updateDoc(doc(db, 'users', userId), {
        account_status: status,
        status_updated_at: Timestamp.now()
      });
      
      // If suspending, remove from all workspaces
      if (status === 'suspended') {
        const workspacesQuery = query(
          collection(db, 'workspaces'),
          where('company_id', '==', companyId)
        );
        const workspacesSnapshot = await getDocs(workspacesQuery);
        
        const updatePromises = [];
        for (const workspace of workspacesSnapshot.docs) {
          const memberQuery = query(
            collection(db, 'members'),
            where('workspace_id', '==', workspace.id),
            where('user_id', '==', userId)
          );
          const memberSnapshot = await getDocs(memberQuery);
          
          if (!memberSnapshot.empty) {
            const memberDoc = memberSnapshot.docs[0];
            updatePromises.push(
              updateDoc(doc(db, 'members', memberDoc.id), {
                status: 'suspended',
                suspended_at: Timestamp.now()
              })
            );
          }
        }
        
        await Promise.all(updatePromises);
      }
    } catch (error) {
      console.error('Error updating member status:', error);
      throw error;
    }
  }

  // Get member activity log
  async getMemberActivity(
    userId: string,
    companyId: string,
    limit: number = 50
  ): Promise<MemberActivity[]> {
    try {
      // Get all activities for the user
      const activitiesQuery = query(
        collection(db, 'user_activities'),
        where('user_id', '==', userId),
        where('company_id', '==', companyId),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(activitiesQuery);
      const activities: MemberActivity[] = [];
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        activities.push({
          user_id: data.user_id,
          user_name: data.user_name,
          activity_type: data.activity_type,
          description: data.description,
          workspace_id: data.workspace_id,
          workspace_name: data.workspace_name,
          timestamp: data.timestamp,
          metadata: data.metadata
        });
      }
      
      return activities.slice(0, limit);
    } catch (error) {
      console.error('Error getting member activity:', error);
      return [];
    }
  }

  // Get company member statistics
  async getCompanyMemberStats(companyId: string): Promise<MemberStats> {
    try {
      const members = await this.getCompanyMembers(companyId);
      const now = Timestamp.now();
      const thirtyDaysAgo = Timestamp.fromMillis(now.toMillis() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = Timestamp.fromMillis(now.toMillis() - 7 * 24 * 60 * 60 * 1000);
      
      // Count active members (active in last 7 days)
      const activeMembers = members.filter(m => 
        m.last_active.toMillis() > sevenDaysAgo.toMillis()
      ).length;
      
      // Count new members this month
      const newMembers = members.filter(m => 
        m.joined_at.toMillis() > thirtyDaysAgo.toMillis()
      ).length;
      
      // Count by role
      const membersByRole = {
        super_admin: 0,
        admin: 0,
        member: 0
      };
      
      members.forEach(m => {
        membersByRole[m.company_role]++;
      });
      
      // Count by workspace
      const workspaceMap = new Map<string, { name: string; count: number }>();
      members.forEach(m => {
        m.workspaces.forEach(w => {
          if (!workspaceMap.has(w.workspace_id)) {
            workspaceMap.set(w.workspace_id, {
              name: w.workspace_name,
              count: 0
            });
          }
          workspaceMap.get(w.workspace_id)!.count++;
        });
      });
      
      const membersByWorkspace = Array.from(workspaceMap.entries()).map(([id, data]) => ({
        workspace_id: id,
        workspace_name: data.name,
        member_count: data.count
      }));
      
      // Calculate growth rate
      const lastMonthMembers = members.filter(m => 
        m.joined_at.toMillis() < thirtyDaysAgo.toMillis()
      ).length;
      
      const growthRate = lastMonthMembers > 0 
        ? ((members.length - lastMonthMembers) / lastMonthMembers) * 100 
        : 0;
      
      return {
        total_members: members.length,
        active_members: activeMembers,
        new_members_this_month: newMembers,
        inactive_members: members.length - activeMembers,
        members_by_role: membersByRole,
        members_by_workspace: membersByWorkspace,
        growth_rate: growthRate
      };
    } catch (error) {
      console.error('Error getting member stats:', error);
      return {
        total_members: 0,
        active_members: 0,
        new_members_this_month: 0,
        inactive_members: 0,
        members_by_role: { super_admin: 0, admin: 0, member: 0 },
        members_by_workspace: [],
        growth_rate: 0
      };
    }
  }

  // Search members
  async searchMembers(
    companyId: string,
    searchTerm: string
  ): Promise<CompanyMember[]> {
    try {
      const members = await this.getCompanyMembers(companyId);
      const searchLower = searchTerm.toLowerCase();
      
      return members.filter(m => 
        m.email.toLowerCase().includes(searchLower) ||
        m.name.toLowerCase().includes(searchLower) ||
        m.department?.toLowerCase().includes(searchLower) ||
        m.position?.toLowerCase().includes(searchLower)
      );
    } catch (error) {
      console.error('Error searching members:', error);
      return [];
    }
  }

  // Export members data
  async exportMembersData(companyId: string): Promise<string> {
    try {
      const members = await this.getCompanyMembers(companyId);
      
      // Convert to CSV
      const headers = [
        'Email', 'Name', 'Role', 'Status', 'Workspaces', 
        'Joined Date', 'Last Active', 'AI Usage', 'AI Cost', 
        'Department', 'Position'
      ];
      
      const rows = members.map(m => [
        m.email,
        m.name,
        m.company_role,
        m.status,
        m.workspaces.map(w => w.workspace_name).join('; '),
        m.joined_at.toDate().toLocaleDateString(),
        m.last_active.toDate().toLocaleDateString(),
        m.ai_usage_total.toString(),
        `$${m.ai_cost_total.toFixed(2)}`,
        m.department || '',
        m.position || ''
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      return csvContent;
    } catch (error) {
      console.error('Error exporting members data:', error);
      throw error;
    }
  }
}

export default new MemberManagementService();