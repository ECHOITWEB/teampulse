const admin = require('firebase-admin');

/**
 * Schema Manager for TeamPulse Database
 * Handles database operations that require admin privileges
 */
class SchemaManager {
  constructor() {
    this.db = admin.firestore();
  }

  // ==================== COMPANIES ====================
  
  async createCompany(data) {
    const companyData = {
      name_ko: data.name_ko,
      name_en: data.name_en,
      domain: data.domain || null,
      industry: data.industry || null,
      size: data.size || '1-10',
      logo_url: data.logo_url || null,
      plan: data.plan || 'free',
      billing_type: data.billing_type || 'company',
      billing_email: data.billing_email || null,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      created_by: data.created_by,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      settings: {
        allow_workspace_creation: true,
        require_admin_approval: false,
        default_workspace_plan: 'free'
      },
      stats: {
        total_workspaces: 0,
        total_members: 0,
        active_members_30d: 0
      }
    };

    const companyRef = await this.db.collection('companies').add(companyData);
    return companyRef.id;
  }

  async getCompanyByName(nameKo, nameEn) {
    const snapshot = await this.db.collection('companies')
      .where('name_ko', '==', nameKo)
      .where('name_en', '==', nameEn)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }
    return null;
  }

  // ==================== WORKSPACES ====================
  
  async createWorkspace(data) {
    const workspaceData = {
      company_id: data.company_id,
      name: data.name,
      description: data.description || null,
      type: data.type || 'team',
      parent_workspace_id: data.parent_workspace_id || null,
      is_main: data.is_main || false,
      visibility: data.visibility || 'company_only',
      allow_join_requests: data.allow_join_requests !== false,
      require_approval: data.require_approval || false,
      plan: data.plan || 'free',
      plan_inherited: data.plan_inherited !== false,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      created_by: data.created_by,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      owner_id: data.owner_id || data.created_by,
      settings: {
        features: {
          okr_enabled: true,
          meetings_enabled: true,
          ai_tools_enabled: true
        },
        ai_usage_limit: data.ai_usage_limit || 10000,
        ai_usage_this_month: 0
      },
      stats: {
        member_count: 0,
        active_members_7d: 0,
        total_objectives: 0,
        completed_objectives: 0
      }
    };

    const workspaceRef = await this.db.collection('workspaces').add(workspaceData);
    
    // Update company stats
    await this.db.collection('companies').doc(data.company_id).update({
      'stats.total_workspaces': admin.firestore.FieldValue.increment(1)
    });

    return workspaceRef.id;
  }

  // ==================== MEMBERS ====================
  
  async addMemberToWorkspace(userId, companyId, workspaceId, role = 'member') {
    const memberData = {
      user_id: userId,
      company_id: companyId,
      workspace_id: workspaceId,
      company_role: role,
      workspace_role: role,
      permissions: {
        can_create_objectives: true,
        can_edit_all_objectives: role !== 'member',
        can_delete_objectives: role === 'owner' || role === 'admin',
        can_manage_members: role === 'owner' || role === 'admin',
        can_manage_settings: role === 'owner'
      },
      status: 'active',
      joined_at: admin.firestore.FieldValue.serverTimestamp(),
      last_active: admin.firestore.FieldValue.serverTimestamp(),
      workspace_profile: {}
    };

    const memberRef = await this.db.collection('members').add(memberData);
    
    // Update workspace member count
    await this.db.collection('workspaces').doc(workspaceId).update({
      'stats.member_count': admin.firestore.FieldValue.increment(1)
    });
    
    // Update company member count
    await this.db.collection('companies').doc(companyId).update({
      'stats.total_members': admin.firestore.FieldValue.increment(1)
    });

    return memberRef.id;
  }

  async getUserWorkspaces(userId) {
    const membersSnapshot = await this.db.collection('members')
      .where('user_id', '==', userId)
      .where('status', '==', 'active')
      .get();
    
    const workspaces = [];
    
    for (const memberDoc of membersSnapshot.docs) {
      const memberData = memberDoc.data();
      const workspaceDoc = await this.db.collection('workspaces')
        .doc(memberData.workspace_id)
        .get();
      
      if (workspaceDoc.exists) {
        const companyDoc = await this.db.collection('companies')
          .doc(memberData.company_id)
          .get();
        
        workspaces.push({
          workspace: { id: workspaceDoc.id, ...workspaceDoc.data() },
          company: { id: companyDoc.id, ...companyDoc.data() },
          membership: { id: memberDoc.id, ...memberData }
        });
      }
    }
    
    return workspaces;
  }

  // ==================== OBJECTIVES ====================
  
  async createObjective(data) {
    const objectiveData = {
      company_id: data.company_id,
      workspace_id: data.workspace_id || null,
      user_id: data.user_id || null,
      type: data.type,
      level: data.type === 'company' ? 0 : (data.type === 'team' ? 1 : 2),
      title: data.title,
      description: data.description || null,
      period_type: data.period_type || 'quarter',
      quarter: data.quarter || null,
      year: data.year || null,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      progress: 0,
      status: 'not_started',
      visibility: data.visibility || 'public',
      parent_objective_id: data.parent_objective_id || null,
      aligned_objectives: [],
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      created_by: data.created_by,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_by: data.created_by,
      owner_id: data.owner_id || data.created_by,
      collaborators: data.collaborators || [],
      tags: data.tags || [],
      category: data.category || null,
      priority: data.priority || 'medium'
    };

    const objectiveRef = await this.db.collection('objectives').add(objectiveData);
    
    // Update workspace objectives count
    if (data.workspace_id) {
      await this.db.collection('workspaces').doc(data.workspace_id).update({
        'stats.total_objectives': admin.firestore.FieldValue.increment(1)
      });
    }

    return objectiveRef.id;
  }

  async updateObjective(objectiveId, updates) {
    const updateData = {
      ...updates,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    await this.db.collection('objectives').doc(objectiveId).update(updateData);
    return true;
  }

  async deleteObjective(objectiveId) {
    // Get objective data first
    const objectiveDoc = await this.db.collection('objectives').doc(objectiveId).get();
    
    if (!objectiveDoc.exists) {
      throw new Error('Objective not found');
    }

    const objectiveData = objectiveDoc.data();
    
    // Delete all key results
    const keyResultsSnapshot = await this.db.collection('keyResults')
      .where('objective_id', '==', objectiveId)
      .get();
    
    const batch = this.db.batch();
    
    keyResultsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete the objective
    batch.delete(objectiveDoc.ref);
    
    await batch.commit();
    
    // Update workspace stats
    if (objectiveData.workspace_id) {
      await this.db.collection('workspaces').doc(objectiveData.workspace_id).update({
        'stats.total_objectives': admin.firestore.FieldValue.increment(-1),
        'stats.completed_objectives': objectiveData.status === 'completed' 
          ? admin.firestore.FieldValue.increment(-1) 
          : admin.firestore.FieldValue.increment(0)
      });
    }

    return true;
  }

  // ==================== MIGRATION ====================
  
  async migrateExistingData() {
    console.log('Starting data migration to new schema...');
    
    // Step 1: Create companies from existing workspaces
    const workspacesSnapshot = await this.db.collection('workspaces').get();
    const companyMap = new Map();
    
    for (const workspaceDoc of workspacesSnapshot.docs) {
      const data = workspaceDoc.data();
      const companyName = data.company_name || data.name;
      
      if (!companyMap.has(companyName)) {
        // Create company if not exists
        const companyId = await this.createCompany({
          name_ko: companyName,
          name_en: companyName.toUpperCase(),
          created_by: data.owner_id || 'system',
          plan: data.plan || 'free'
        });
        
        companyMap.set(companyName, companyId);
        console.log(`Created company: ${companyName} (${companyId})`);
      }
      
      // Update workspace with company_id
      const companyId = companyMap.get(companyName);
      await this.db.collection('workspaces').doc(workspaceDoc.id).update({
        company_id: companyId
      });
      
      console.log(`Updated workspace ${data.name} with company_id: ${companyId}`);
    }
    
    // Step 2: Migrate workspace_members to members collection
    const membersSnapshot = await this.db.collection('workspace_members').get();
    
    for (const memberDoc of membersSnapshot.docs) {
      const data = memberDoc.data();
      const workspaceDoc = await this.db.collection('workspaces').doc(data.workspace_id).get();
      
      if (workspaceDoc.exists) {
        const workspaceData = workspaceDoc.data();
        
        // Create member entry
        await this.addMemberToWorkspace(
          data.user_id,
          workspaceData.company_id,
          data.workspace_id,
          data.role || 'member'
        );
        
        console.log(`Migrated member ${data.user_id} to workspace ${data.workspace_id}`);
      }
    }
    
    // Step 3: Update objectives with proper company_id
    const objectivesSnapshot = await this.db.collection('objectives').get();
    
    for (const objectiveDoc of objectivesSnapshot.docs) {
      const data = objectiveDoc.data();
      
      if (data.workspaceId) {
        const workspaceDoc = await this.db.collection('workspaces').doc(data.workspaceId).get();
        
        if (workspaceDoc.exists) {
          const workspaceData = workspaceDoc.data();
          
          await this.db.collection('objectives').doc(objectiveDoc.id).update({
            company_id: workspaceData.company_id,
            workspace_id: data.workspaceId,  // Normalize field name
            type: data.type || 'team'
          });
          
          console.log(`Updated objective ${data.title} with proper schema`);
        }
      }
    }
    
    console.log('Migration completed!');
  }

  // ==================== CLEANUP ====================
  
  async cleanupDummyData() {
    console.log('Cleaning up dummy data...');
    
    const objectivesSnapshot = await this.db.collection('objectives').get();
    const batch = this.db.batch();
    let count = 0;
    
    for (const doc of objectivesSnapshot.docs) {
      const data = doc.data();
      
      // Identify dummy data
      const isDummy = (
        !data.created_by ||
        data.title?.includes('테스트') ||
        data.title?.includes('신규 고객') ||
        data.title?.includes('월간 활성') ||
        data.title?.includes('NPS') ||
        data.title?.includes('시스템 안정성')
      );
      
      if (isDummy) {
        batch.delete(doc.ref);
        count++;
        console.log(`Deleting dummy objective: ${data.title}`);
      }
    }
    
    if (count > 0) {
      await batch.commit();
      console.log(`Deleted ${count} dummy objectives`);
    } else {
      console.log('No dummy data found');
    }
  }
}

module.exports = SchemaManager;