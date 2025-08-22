// Tasks API - Task Management
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Types
export interface TaskCreate {
  title: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'review' | 'done';
  priority?: 'low' | 'medium' | 'high';
  assigneeId?: number;
  teamId?: number;
  dueDate?: string;
  relatedObjectiveId?: number;
  relatedKeyResultId?: number;
  estimatedHours?: number;
  labels?: string[];
}

export interface TaskUpdate extends Partial<TaskCreate> {
  position?: number;
  actualHours?: number;
}

export interface TaskComment {
  id: number;
  taskId: number;
  userId: number;
  comment: string;
  user?: {
    id: number;
    fullName: string;
    avatar?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TaskAttachment {
  id: number;
  taskId: number;
  uploadedBy: number;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt: string;
}

export interface TaskActivity {
  id: number;
  taskId: number;
  userId: number;
  action: string;
  oldValue?: string;
  newValue?: string;
  user?: {
    id: number;
    fullName: string;
  };
  createdAt: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  assigneeId?: number;
  reporterId: number;
  teamId?: number;
  dueDate?: string;
  completedAt?: string;
  position: number;
  relatedObjectiveId?: number;
  relatedKeyResultId?: number;
  estimatedHours?: number;
  actualHours?: number;
  assignee?: {
    id: number;
    fullName: string;
    avatar?: string;
  };
  reporter?: {
    id: number;
    fullName: string;
  };
  team?: {
    id: number;
    name: string;
  };
  labels?: { id: number; name: string; color: string }[];
  commentCount?: number;
  attachmentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  assigneeId?: number;
  teamId?: number;
  search?: string;
  relatedObjectiveId?: number;
  relatedKeyResultId?: number;
  dueDateFrom?: string;
  dueDateTo?: string;
  labels?: string[];
}

// API Client
class TasksAPI {
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

  // Tasks CRUD
  async getTasks(filters?: TaskFilters): Promise<Task[]> {
    const response = await this.axiosInstance.get('/tasks', { params: filters });
    return response.data;
  }

  async getTask(id: number): Promise<Task> {
    const response = await this.axiosInstance.get(`/tasks/${id}`);
    return response.data;
  }

  async createTask(data: TaskCreate): Promise<Task> {
    const response = await this.axiosInstance.post('/tasks', data);
    return response.data;
  }

  async updateTask(id: number, data: TaskUpdate): Promise<Task> {
    const response = await this.axiosInstance.put(`/tasks/${id}`, data);
    return response.data;
  }

  async deleteTask(id: number): Promise<void> {
    await this.axiosInstance.delete(`/tasks/${id}`);
  }

  // Task Status & Position
  async updateTaskStatus(id: number, status: Task['status'], position?: number): Promise<Task> {
    const response = await this.axiosInstance.patch(`/tasks/${id}/status`, { status, position });
    return response.data;
  }

  async reorderTasks(taskPositions: { id: number; position: number }[]): Promise<void> {
    await this.axiosInstance.post('/tasks/reorder', { taskPositions });
  }

  // Comments
  async getTaskComments(taskId: number): Promise<TaskComment[]> {
    const response = await this.axiosInstance.get(`/tasks/${taskId}/comments`);
    return response.data;
  }

  async addTaskComment(taskId: number, comment: string): Promise<TaskComment> {
    const response = await this.axiosInstance.post(`/tasks/${taskId}/comments`, { comment });
    return response.data;
  }

  async updateTaskComment(commentId: number, comment: string): Promise<TaskComment> {
    const response = await this.axiosInstance.put(`/comments/${commentId}`, { comment });
    return response.data;
  }

  async deleteTaskComment(commentId: number): Promise<void> {
    await this.axiosInstance.delete(`/comments/${commentId}`);
  }

  // Attachments
  async getTaskAttachments(taskId: number): Promise<TaskAttachment[]> {
    const response = await this.axiosInstance.get(`/tasks/${taskId}/attachments`);
    return response.data;
  }

  async uploadTaskAttachment(taskId: number, file: File): Promise<TaskAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await this.axiosInstance.post(
      `/tasks/${taskId}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  async deleteTaskAttachment(attachmentId: number): Promise<void> {
    await this.axiosInstance.delete(`/attachments/${attachmentId}`);
  }

  // Activity Log
  async getTaskActivities(taskId: number): Promise<TaskActivity[]> {
    const response = await this.axiosInstance.get(`/tasks/${taskId}/activities`);
    return response.data;
  }

  // Labels
  async getLabels(teamId?: number): Promise<{ id: number; name: string; color: string }[]> {
    const response = await this.axiosInstance.get('/labels', { params: { teamId } });
    return response.data;
  }

  async createLabel(data: { name: string; color: string; teamId?: number }): Promise<any> {
    const response = await this.axiosInstance.post('/labels', data);
    return response.data;
  }

  async updateTaskLabels(taskId: number, labelIds: number[]): Promise<Task> {
    const response = await this.axiosInstance.put(`/tasks/${taskId}/labels`, { labelIds });
    return response.data;
  }

  // Dashboard & Analytics
  async getTasksOverview(teamId?: number): Promise<{
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    tasksByStatus: { status: string; count: number }[];
    tasksByPriority: { priority: string; count: number }[];
    upcomingDeadlines: Task[];
    recentlyCompleted: Task[];
  }> {
    const response = await this.axiosInstance.get('/tasks/overview', { params: { teamId } });
    return response.data;
  }

  async getUserTasks(userId: number, filters?: TaskFilters): Promise<Task[]> {
    const response = await this.axiosInstance.get(`/users/${userId}/tasks`, { params: filters });
    return response.data;
  }

  async getTeamTasks(teamId: number, filters?: TaskFilters): Promise<Task[]> {
    const response = await this.axiosInstance.get(`/teams/${teamId}/tasks`, { params: filters });
    return response.data;
  }

  // Bulk Operations
  async bulkUpdateTasks(taskIds: number[], updates: Partial<TaskUpdate>): Promise<Task[]> {
    const response = await this.axiosInstance.post('/tasks/bulk-update', { taskIds, updates });
    return response.data;
  }

  async bulkDeleteTasks(taskIds: number[]): Promise<void> {
    await this.axiosInstance.post('/tasks/bulk-delete', { taskIds });
  }
}

export const tasksApi = new TasksAPI();