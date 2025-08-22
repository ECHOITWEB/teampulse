export interface Task {
  id: number | string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'todo' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id?: string;
  assignee_name?: string;
  due_date?: any; // Firebase Timestamp or string
  created_at: string;
  updated_at: string;
  completed_at?: string;
  project_id?: number;
  tags?: string[];
  attachments?: string[];
  subtasks?: Subtask[];
  comments_count?: number;
}

export interface Subtask {
  id: number;
  task_id: number;
  title: string;
  is_completed: boolean;
  created_at: string;
  completed_at?: string;
}

export interface TaskComment {
  id: number;
  task_id: number;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface TaskFilter {
  status?: string[];
  priority?: string[];
  assignee_id?: string;
  due_date_from?: string;
  due_date_to?: string;
  search?: string;
  project_id?: number;
}