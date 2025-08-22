// Goals API - OKR Management
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Types
export interface KeyResultUpdate {
  value: number;
  comment?: string;
}

export interface KeyResultCreate {
  title: string;
  description?: string;
  targetValue: number;
  unit: string;
  ownerId: number;
  dueDate?: string;
}

export interface KeyResult {
  id: number;
  objectiveId: number;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  progress: number;
  status: 'not_started' | 'in_progress' | 'at_risk' | 'completed';
  ownerId: number;
  owner?: {
    id: number;
    fullName: string;
    avatar?: string;
  };
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ObjectiveCreate {
  title: string;
  description?: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  year: number;
  type: 'company' | 'team' | 'individual';
  ownerId?: number;
  teamId?: number;
  keyResults?: KeyResultCreate[];
}

export interface Objective {
  id: number;
  title: string;
  description?: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  year: number;
  type: 'company' | 'team' | 'individual';
  ownerId?: number;
  teamId?: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  progress: number;
  owner?: {
    id: number;
    fullName: string;
    avatar?: string;
  };
  team?: {
    id: number;
    name: string;
  };
  keyResults?: KeyResult[];
  createdAt: string;
  updatedAt: string;
}

// API Client
class GoalsAPI {
  private axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add auth token to requests
  constructor() {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  // Objectives
  async getObjectives(params?: {
    quarter?: string;
    year?: number;
    type?: string;
    status?: string;
    ownerId?: number;
    teamId?: number;
  }): Promise<Objective[]> {
    const response = await this.axiosInstance.get('/objectives', { params });
    return response.data;
  }

  async getObjective(id: number): Promise<Objective> {
    const response = await this.axiosInstance.get(`/objectives/${id}`);
    return response.data;
  }

  async createObjective(data: ObjectiveCreate): Promise<Objective> {
    const response = await this.axiosInstance.post('/objectives', data);
    return response.data;
  }

  async updateObjective(id: number, data: Partial<ObjectiveCreate>): Promise<Objective> {
    const response = await this.axiosInstance.put(`/objectives/${id}`, data);
    return response.data;
  }

  async deleteObjective(id: number): Promise<void> {
    await this.axiosInstance.delete(`/objectives/${id}`);
  }

  async updateObjectiveStatus(id: number, status: Objective['status']): Promise<Objective> {
    const response = await this.axiosInstance.patch(`/objectives/${id}/status`, { status });
    return response.data;
  }

  // Key Results
  async getKeyResults(objectiveId: number): Promise<KeyResult[]> {
    const response = await this.axiosInstance.get(`/objectives/${objectiveId}/key-results`);
    return response.data;
  }

  async createKeyResult(objectiveId: number, data: KeyResultCreate): Promise<KeyResult> {
    const response = await this.axiosInstance.post(`/objectives/${objectiveId}/key-results`, data);
    return response.data;
  }

  async updateKeyResult(id: number, data: Partial<KeyResultCreate>): Promise<KeyResult> {
    const response = await this.axiosInstance.put(`/key-results/${id}`, data);
    return response.data;
  }

  async deleteKeyResult(id: number): Promise<void> {
    await this.axiosInstance.delete(`/key-results/${id}`);
  }

  async updateKeyResultProgress(id: number, update: KeyResultUpdate): Promise<KeyResult> {
    const response = await this.axiosInstance.post(`/key-results/${id}/updates`, update);
    return response.data;
  }

  async getKeyResultUpdates(id: number): Promise<any[]> {
    const response = await this.axiosInstance.get(`/key-results/${id}/updates`);
    return response.data;
  }

  // Dashboard & Analytics
  async getGoalsOverview(params?: {
    quarter?: string;
    year?: number;
    teamId?: number;
  }): Promise<{
    totalObjectives: number;
    completedObjectives: number;
    averageProgress: number;
    objectivesByType: { type: string; count: number; progress: number }[];
    objectivesByStatus: { status: string; count: number }[];
    topPerformers: { user: any; completedKeyResults: number; averageProgress: number }[];
  }> {
    const response = await this.axiosInstance.get('/objectives/overview', { params });
    return response.data;
  }

  async getTeamGoals(teamId: number, quarter?: string, year?: number): Promise<Objective[]> {
    const response = await this.axiosInstance.get(`/teams/${teamId}/objectives`, {
      params: { quarter, year }
    });
    return response.data;
  }

  async getUserGoals(userId: number, quarter?: string, year?: number): Promise<Objective[]> {
    const response = await this.axiosInstance.get(`/users/${userId}/objectives`, {
      params: { quarter, year }
    });
    return response.data;
  }
}

export const goalsApi = new GoalsAPI();