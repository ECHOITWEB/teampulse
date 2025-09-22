import { auth } from '../config/firebase';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api-qkfkpv5zbq-uc.a.run.app';

class AdminService {
  private async getAuthToken(): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    return user.getIdToken();
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/system-admin${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // ==================== MIGRATION ====================
  
  async migrateToNewSchema(): Promise<void> {
    console.log('Starting schema migration...');
    const result = await this.request('/migrate', {
      method: 'POST',
    });
    console.log('Migration result:', result);
    return result;
  }

  // ==================== CLEANUP ====================
  
  async cleanupDummyData(): Promise<void> {
    console.log('Starting dummy data cleanup...');
    const result = await this.request('/cleanup', {
      method: 'POST',
    });
    console.log('Cleanup result:', result);
    return result;
  }

  // ==================== COMPANIES ====================
  
  async createCompany(data: {
    name_ko: string;
    name_en: string;
    domain?: string;
    industry?: string;
    size?: string;
    plan?: string;
  }): Promise<string> {
    const result = await this.request('/companies', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        created_by: auth.currentUser?.uid,
      }),
    });
    return result.companyId;
  }

  // ==================== WORKSPACES ====================
  
  async createWorkspace(data: {
    company_id: string;
    name: string;
    description?: string;
    type?: 'headquarters' | 'team' | 'project' | 'subsidiary';
    is_main?: boolean;
  }): Promise<string> {
    const result = await this.request('/workspaces', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        created_by: auth.currentUser?.uid,
        owner_id: auth.currentUser?.uid,
      }),
    });
    return result.workspaceId;
  }

  // ==================== OBJECTIVES ====================
  
  async createObjective(data: any): Promise<string> {
    const result = await this.request('/objectives', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        created_by: auth.currentUser?.uid,
      }),
    });
    return result.objectiveId;
  }

  async updateObjective(objectiveId: string, updates: any): Promise<void> {
    await this.request(`/objectives/${objectiveId}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...updates,
        updated_by: auth.currentUser?.uid,
      }),
    });
  }

  async deleteObjective(objectiveId: string): Promise<void> {
    await this.request(`/objectives/${objectiveId}`, {
      method: 'DELETE',
    });
  }

  // ==================== USER WORKSPACES ====================
  
  async getUserWorkspaces(userId: string): Promise<any[]> {
    const result = await this.request(`/users/${userId}/workspaces`, {
      method: 'GET',
    });
    return result.workspaces;
  }

  // ==================== DIRECT FIRESTORE ACCESS ====================
  
  async deleteDocument(collection: string, documentId: string): Promise<void> {
    await this.request('/firestore/delete', {
      method: 'POST',
      body: JSON.stringify({ collection, documentId }),
    });
  }

  async updateDocument(collection: string, documentId: string, data: any): Promise<void> {
    await this.request('/firestore/update', {
      method: 'POST',
      body: JSON.stringify({ collection, documentId, data }),
    });
  }

  // ==================== BATCH OPERATIONS ====================
  
  async deleteMultipleObjectives(objectiveIds: string[]): Promise<void> {
    console.log(`Deleting ${objectiveIds.length} objectives...`);
    
    for (const id of objectiveIds) {
      try {
        await this.deleteObjective(id);
        console.log(`Deleted objective: ${id}`);
      } catch (error) {
        console.error(`Failed to delete objective ${id}:`, error);
      }
    }
  }

  async deleteDummyObjectives(): Promise<void> {
    // This will be called from the UI to clean up dummy data
    const dummyKeywords = [
      '신규 고객',
      '월간 활성',
      'NPS',
      '시스템 안정성',
      '모바일 앱',
      '자동화',
      '비용 절감',
      '파트너십',
      '직원 만족도',
      '테스트',
      'test',
      'dummy',
      'example'
    ];

    console.log('Searching for dummy objectives...');
    
    // Note: This would need to be implemented with proper queries
    // For now, we'll use the cleanup endpoint
    await this.cleanupDummyData();
  }
}

const adminService = new AdminService();
export default adminService;