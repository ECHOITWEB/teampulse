import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id?: number;
  team_id?: number;
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  assignee?: User;
  labels?: string[];
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
  dependencies?: TaskDependency[];
}

export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

export interface TaskComment {
  id: number;
  task_id: number;
  user_id: number;
  comment: string;
  created_at: string;
  user?: User;
}

export interface TaskAttachment {
  id: number;
  task_id: number;
  file_name: string;
  file_size: number;
  file_type?: string;
  file_url: string;
  uploaded_by: number;
  uploaded_at: string;
}

export interface TaskDependency {
  id: number;
  task_id: number;
  depends_on_task_id: number;
  dependency_type: string;
  depends_on_task?: Task;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'in_review' | 'done';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id?: number;
  team_id?: number;
  due_date?: string;
  estimated_hours?: number;
  labels?: string[];
  key_result_ids?: number[];
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  assignee_id?: number;
  team_id?: number;
  due_date_from?: string;
  due_date_to?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

class TaskService {
  private getAuthHeader() {
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Create task
  async createTask(data: CreateTaskDto): Promise<Task> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/tasks`,
        data,
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  // Get task by ID
  async getTask(id: number): Promise<Task> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/tasks/${id}`,
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching task:', error);
      throw error;
    }
  }

  // Get user's tasks
  async getUserTasks(filters?: TaskFilters): Promise<{ tasks: Task[]; total: number }> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }
      
      const response = await axios.get(
        `${API_BASE_URL}/tasks/user?${params.toString()}`,
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching user tasks:', error);
      throw error;
    }
  }

  // Get team tasks
  async getTeamTasks(teamId: number, filters?: TaskFilters): Promise<{ tasks: Task[]; total: number }> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }
      
      const response = await axios.get(
        `${API_BASE_URL}/tasks/team/${teamId}?${params.toString()}`,
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching team tasks:', error);
      throw error;
    }
  }

  // Search tasks
  async searchTasks(query: string, filters?: TaskFilters): Promise<{ tasks: Task[]; total: number }> {
    try {
      const params = new URLSearchParams();
      params.append('q', query);
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }
      
      const response = await axios.get(
        `${API_BASE_URL}/tasks/search?${params.toString()}`,
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error searching tasks:', error);
      throw error;
    }
  }

  // Update task
  async updateTask(id: number, data: Partial<CreateTaskDto>): Promise<Task> {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/tasks/${id}`,
        data,
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  // Delete task
  async deleteTask(id: number): Promise<void> {
    try {
      await axios.delete(
        `${API_BASE_URL}/tasks/${id}`,
        { headers: this.getAuthHeader() }
      );
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  // Add dependency
  async addDependency(taskId: number, dependsOnTaskId: number, type: string = 'finish_to_start'): Promise<any> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/tasks/${taskId}/dependencies`,
        { depends_on_task_id: dependsOnTaskId, type },
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error adding dependency:', error);
      throw error;
    }
  }

  // Remove dependency
  async removeDependency(taskId: number, dependencyId: number): Promise<void> {
    try {
      await axios.delete(
        `${API_BASE_URL}/tasks/${taskId}/dependencies/${dependencyId}`,
        { headers: this.getAuthHeader() }
      );
    } catch (error) {
      console.error('Error removing dependency:', error);
      throw error;
    }
  }

  // Get dependency graph
  async getDependencyGraph(taskId: number): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/tasks/${taskId}/dependencies/graph`,
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching dependency graph:', error);
      throw error;
    }
  }

  // Add comment
  async addComment(taskId: number, comment: string): Promise<TaskComment> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/tasks/${taskId}/comments`,
        { comment },
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  // Log time
  async logTime(taskId: number, hours: number, date?: string, description?: string): Promise<any> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/tasks/${taskId}/time-logs`,
        { hours, date, description },
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error logging time:', error);
      throw error;
    }
  }

  // Update task status
  async updateTaskStatus(id: number, status: Task['status']): Promise<Task> {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/tasks/${id}`,
        { status },
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  }

  // Bulk update tasks
  async bulkUpdateTasks(taskIds: number[], updates: Partial<CreateTaskDto>): Promise<any> {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/tasks/bulk-update`,
        { task_ids: taskIds, updates },
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Error bulk updating tasks:', error);
      throw error;
    }
  }
}

const taskService = new TaskService();
export default taskService;