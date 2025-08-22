import { useState, useEffect, useCallback } from 'react';
import { tasksApi, Task, TaskCreate, TaskUpdate, TaskFilters } from '../api/tasksApi';

interface UseTasksOptions extends TaskFilters {
  autoLoad?: boolean;
}

export const useTasks = (options: UseTasksOptions = {}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { autoLoad, ...filters } = options;
      const data = await tasksApi.getTasks(filters);
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [options]);

  useEffect(() => {
    if (options.autoLoad !== false) {
      loadTasks();
    }
  }, [loadTasks, options.autoLoad]);

  const createTask = async (data: TaskCreate) => {
    try {
      setLoading(true);
      const newTask = await tasksApi.createTask(data);
      setTasks([...tasks, newTask]);
      return newTask;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async (id: number, data: TaskUpdate) => {
    try {
      setLoading(true);
      const updatedTask = await tasksApi.updateTask(id, data);
      setTasks(tasks.map(task => 
        task.id === id ? updatedTask : task
      ));
      return updatedTask;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (id: number) => {
    try {
      setLoading(true);
      await tasksApi.deleteTask(id);
      setTasks(tasks.filter(task => task.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (id: number, status: Task['status'], position?: number) => {
    try {
      const updatedTask = await tasksApi.updateTaskStatus(id, status, position);
      setTasks(tasks.map(task => 
        task.id === id ? updatedTask : task
      ));
      return updatedTask;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task status');
      throw err;
    }
  };

  const moveTask = (taskId: string, newStatus: Task['status']) => {
    // Optimistic update for drag and drop
    setTasks(tasks.map(task => 
      task.id.toString() === taskId 
        ? { ...task, status: newStatus, updatedAt: new Date().toISOString() }
        : task
    ));
  };

  const getTasksByStatus = (status: Task['status']) => {
    return tasks.filter(task => task.status === status);
  };

  const getTaskStats = () => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const overdue = tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
    ).length;

    return {
      total,
      completed,
      inProgress,
      overdue,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  };

  return {
    tasks,
    loading,
    error,
    refetch: loadTasks,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    moveTask,
    getTasksByStatus,
    getTaskStats
  };
};