import { 
  FirebaseCollection, 
  SubCollection, 
  COLLECTIONS, 
  queryHelpers,
  where,
  orderBy,
  limit,
  logActivity,
  serverTimestamp,
  batchOperations,
  doc,
  db
} from '../firebase-utils';

class TaskService {
  constructor() {
    this.tasks = new FirebaseCollection(COLLECTIONS.TASKS);
  }

  // Create a new task
  async createTask(taskData, userId) {
    const task = await this.tasks.create({
      ...taskData,
      createdBy: userId,
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      tags: taskData.tags || [],
      attachments: taskData.attachments || []
    });

    // Log activity
    await logActivity({
      type: 'task_created',
      userId,
      taskId: task.id,
      taskTitle: task.title,
      description: `Created task: ${task.title}`
    });

    return task;
  }

  // Get task by ID with comments
  async getTaskWithDetails(taskId) {
    const task = await this.tasks.getById(taskId);
    if (!task) return null;

    // Get comments subcollection
    const comments = new SubCollection(COLLECTIONS.TASKS, taskId, COLLECTIONS.COMMENTS);
    task.comments = await comments.getAll();

    return task;
  }

  // Update task
  async updateTask(taskId, updates, userId) {
    const updatedTask = await this.tasks.update(taskId, updates);

    // Log specific status changes
    if (updates.status) {
      await logActivity({
        type: 'task_status_changed',
        userId,
        taskId,
        previousStatus: updates.previousStatus,
        newStatus: updates.status,
        description: `Changed task status to ${updates.status}`
      });
    }

    return updatedTask;
  }

  // Get tasks for a user
  async getUserTasks(userId, filters = {}) {
    const constraints = [queryHelpers.byUser(userId)];

    if (filters.status) {
      constraints.push(queryHelpers.byStatus(filters.status));
    }

    if (filters.priority) {
      constraints.push(where('priority', '==', filters.priority));
    }

    if (filters.startDate && filters.endDate) {
      constraints.push(...queryHelpers.byDateRange('dueDate', filters.startDate, filters.endDate));
    }

    constraints.push(queryHelpers.orderByCreated());

    return this.tasks.query(constraints);
  }

  // Get team tasks
  async getTeamTasks(teamId, filters = {}) {
    const constraints = [queryHelpers.byTeam(teamId)];

    if (filters.status) {
      constraints.push(queryHelpers.byStatus(filters.status));
    }

    constraints.push(queryHelpers.orderByCreated());

    return this.tasks.query(constraints);
  }

  // Add comment to task
  async addComment(taskId, commentData, userId) {
    const comments = new SubCollection(COLLECTIONS.TASKS, taskId, COLLECTIONS.COMMENTS);
    const comment = await comments.create({
      ...commentData,
      userId,
      mentions: commentData.mentions || []
    });

    await logActivity({
      type: 'comment_added',
      userId,
      taskId,
      commentId: comment.id,
      description: 'Added a comment'
    });

    return comment;
  }

  // Search tasks
  async searchTasks(searchTerm, userId, maxResults = 20) {
    // Note: For full-text search, consider using Algolia or Firebase Extensions
    // This is a simple implementation
    const userTasks = await this.getUserTasks(userId);
    
    const filtered = userTasks.filter(task => 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return filtered.slice(0, maxResults);
  }

  // Subscribe to task updates
  subscribeToTask(taskId, callback) {
    return this.tasks.subscribe(taskId, callback);
  }

  // Subscribe to user's tasks
  subscribeToUserTasks(userId, callback) {
    const constraints = [
      queryHelpers.byUser(userId),
      queryHelpers.orderByUpdated()
    ];
    return this.tasks.subscribeToQuery(constraints, callback);
  }

  // Subscribe to task comments
  subscribeToComments(taskId, callback) {
    const comments = new SubCollection(COLLECTIONS.TASKS, taskId, COLLECTIONS.COMMENTS);
    return comments.subscribe(callback);
  }

  // Batch update multiple tasks
  async batchUpdateTasks(updates) {
    const operations = updates.map(({ taskId, data }) => ({
      type: 'update',
      ref: doc(db, COLLECTIONS.TASKS, taskId),
      data: { ...data, updatedAt: serverTimestamp() }
    }));

    await batchOperations(operations);
  }

  // Get task statistics
  async getTaskStats(userId) {
    const tasks = await this.getUserTasks(userId);
    
    const stats = {
      total: tasks.length,
      byStatus: {},
      byPriority: {},
      overdue: 0
    };

    const now = new Date();
    
    tasks.forEach(task => {
      // Count by status
      stats.byStatus[task.status] = (stats.byStatus[task.status] || 0) + 1;
      
      // Count by priority
      stats.byPriority[task.priority] = (stats.byPriority[task.priority] || 0) + 1;
      
      // Count overdue
      if (task.dueDate && new Date(task.dueDate.toDate()) < now && task.status !== 'completed') {
        stats.overdue++;
      }
    });

    return stats;
  }
}

// Export singleton instance
export default new TaskService();