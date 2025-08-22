import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

export interface Objective {
  id: number;
  title: string;
  description?: string;
  owner_id: number;
  team_id?: number;
  parent_objective_id?: number;
  goal_period_id: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  progress: number;
  created_at: string;
  updated_at: string;
  keyResults?: KeyResult[];
}

export interface KeyResult {
  id: number;
  objective_id: number;
  title: string;
  description?: string;
  owner_id: number;
  target_value: number;
  current_value: number;
  unit?: string;
  progress: number;
  status: 'not_started' | 'on_track' | 'at_risk' | 'behind' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface CreateObjectiveDto {
  title: string;
  description?: string;
  type: 'company' | 'team' | 'individual';
  team_id?: number;
  parent_objective_id?: number;
  quarter: string;
  year: number;
  progress?: number;
}

export interface CreateKeyResultDto {
  title: string;
  description?: string;
  target_value: number;
  current_value?: number;
  unit?: string;
  due_date?: string;
}

export interface UpdateProgressDto {
  currentValue: number;
  comment?: string;
}

class ObjectiveService {
  private getAuthHeader() {
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Create objective
  async createObjective(data: CreateObjectiveDto): Promise<Objective> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/objectives`,
        data,
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating objective:', error);
      throw error;
    }
  }

  // Get objective by ID
  async getObjective(id: number): Promise<Objective> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/objectives/${id}`,
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching objective:', error);
      throw error;
    }
  }

  // Get user's objectives
  async getUserObjectives(): Promise<Objective[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/objectives/user`,
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching user objectives:', error);
      throw error;
    }
  }

  // Get team objectives
  async getTeamObjectives(teamId: number): Promise<Objective[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/objectives/team/${teamId}`,
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching team objectives:', error);
      throw error;
    }
  }

  // Get OKR hierarchy
  async getOKRHierarchy(type?: 'company' | 'team' | 'individual', teamId?: number): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (teamId) params.append('teamId', teamId.toString());
      
      const response = await axios.get(
        `${API_BASE_URL}/objectives/hierarchy?${params.toString()}`,
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching OKR hierarchy:', error);
      throw error;
    }
  }

  // Get dashboard data
  async getDashboardData(): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/objectives/dashboard`,
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }

  // Update objective
  async updateObjective(id: number, data: Partial<CreateObjectiveDto>): Promise<Objective> {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/objectives/${id}`,
        data,
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating objective:', error);
      throw error;
    }
  }

  // Delete objective
  async deleteObjective(id: number): Promise<void> {
    try {
      await axios.delete(
        `${API_BASE_URL}/objectives/${id}`,
        { headers: this.getAuthHeader() }
      );
    } catch (error) {
      console.error('Error deleting objective:', error);
      throw error;
    }
  }

  // Add key result
  async addKeyResult(objectiveId: number, data: CreateKeyResultDto): Promise<KeyResult> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/objectives/${objectiveId}/key-results`,
        data,
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error adding key result:', error);
      throw error;
    }
  }

  // Update key result
  async updateKeyResult(id: number, data: Partial<CreateKeyResultDto>): Promise<KeyResult> {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/objectives/key-results/${id}`,
        data,
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating key result:', error);
      throw error;
    }
  }

  // Update key result progress
  async updateKeyResultProgress(id: number, data: UpdateProgressDto): Promise<KeyResult> {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/objectives/key-results/${id}/progress`,
        data,
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating key result progress:', error);
      throw error;
    }
  }

  // Bulk update key results
  async bulkUpdateKeyResults(updates: Array<{ id: number; currentValue: number }>): Promise<any> {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/objectives/key-results/bulk-update`,
        { updates },
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error bulk updating key results:', error);
      throw error;
    }
  }

  // Delete key result
  async deleteKeyResult(id: number): Promise<void> {
    try {
      await axios.delete(
        `${API_BASE_URL}/objectives/key-results/${id}`,
        { headers: this.getAuthHeader() }
      );
    } catch (error) {
      console.error('Error deleting key result:', error);
      throw error;
    }
  }

  // Get user's key results
  async getUserKeyResults(): Promise<KeyResult[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/objectives/key-results/user`,
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching user key results:', error);
      throw error;
    }
  }
}

const objectiveService = new ObjectiveService();
export default objectiveService;