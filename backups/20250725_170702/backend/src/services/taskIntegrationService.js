const db = require('../utils/database');
const MeetingTask = require('../models/MeetingTask');

class TaskIntegrationService {
  /**
   * Sync meeting tasks with the general task management system
   * This would integrate with the existing task management implementation
   */
  static async syncMeetingTasksToGeneralTasks(userId) {
    try {
      // Get all pending meeting tasks for the user
      const meetingTasks = await MeetingTask.findByAssigneeId(userId, {
        status: 'pending'
      });

      const syncedTasks = [];

      for (const task of meetingTasks) {
        // Check if task already exists in general task system
        const existingTask = await this.checkExistingGeneralTask(task.id);
        
        if (!existingTask) {
          // Create task in general task management system
          const generalTask = await this.createGeneralTask({
            title: task.title,
            description: task.description || `Task from meeting: ${task.meeting_title}`,
            assignee_id: task.assignee_id,
            due_date: task.due_date,
            priority: task.priority,
            source: 'meeting',
            source_id: task.meeting_id,
            meeting_task_id: task.id
          });

          syncedTasks.push(generalTask);
        }
      }

      return {
        success: true,
        synced: syncedTasks.length,
        tasks: syncedTasks
      };
    } catch (error) {
      console.error('Error syncing meeting tasks:', error);
      throw error;
    }
  }

  /**
   * Check if a meeting task already exists in general task system
   */
  static async checkExistingGeneralTask(meetingTaskId) {
    // This would check against the general task management table
    // For now, returning null to indicate no existing task
    return null;
  }

  /**
   * Create a task in the general task management system
   */
  static async createGeneralTask(taskData) {
    // This would create a task in the general task management system
    // For now, returning a mock response
    return {
      id: Date.now(),
      ...taskData,
      created_at: new Date()
    };
  }

  /**
   * Update meeting task when general task is updated
   */
  static async updateMeetingTaskFromGeneral(generalTaskId, updates) {
    try {
      // Find the corresponding meeting task
      const [meetingTask] = await db.query(
        'SELECT id FROM meeting_tasks WHERE general_task_id = ?',
        [generalTaskId]
      );

      if (meetingTask) {
        // Update the meeting task
        await MeetingTask.update(meetingTask.id, updates, updates.updated_by);
      }

      return true;
    } catch (error) {
      console.error('Error updating meeting task:', error);
      return false;
    }
  }

  /**
   * Get combined tasks (meeting + general) for a user
   */
  static async getCombinedTasks(userId, filters = {}) {
    try {
      // Get meeting tasks
      const meetingTasks = await MeetingTask.findByAssigneeId(userId, filters);
      
      // Get general tasks (would come from general task management)
      const generalTasks = await this.getGeneralTasks(userId, filters);

      // Combine and sort by due date
      const allTasks = [
        ...meetingTasks.map(task => ({ ...task, type: 'meeting' })),
        ...generalTasks.map(task => ({ ...task, type: 'general' }))
      ].sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      });

      return allTasks;
    } catch (error) {
      console.error('Error getting combined tasks:', error);
      throw error;
    }
  }

  /**
   * Get general tasks for a user
   */
  static async getGeneralTasks(userId, filters = {}) {
    // This would fetch from the general task management system
    // For now, returning empty array
    return [];
  }

  /**
   * Create a general task from a meeting action item
   */
  static async createTaskFromActionItem(noteId, assigneeId, dueDate) {
    try {
      // Get the note details
      const [note] = await db.query(
        `SELECT mn.*, m.title as meeting_title
         FROM meeting_notes mn
         JOIN meetings m ON mn.meeting_id = m.id
         WHERE mn.id = ? AND mn.type = 'action_item'`,
        [noteId]
      );

      if (!note) {
        throw new Error('Action item not found');
      }

      // Create meeting task
      const meetingTask = await MeetingTask.create({
        meeting_id: note.meeting_id,
        note_id: noteId,
        title: note.content.substring(0, 255),
        description: note.content,
        assignee_id: assigneeId,
        due_date: dueDate,
        priority: 'medium',
        created_by: note.user_id
      });

      // Also create in general task system
      const generalTask = await this.createGeneralTask({
        title: meetingTask.title,
        description: `Action item from meeting: ${note.meeting_title}\n\n${meetingTask.description}`,
        assignee_id: assigneeId,
        due_date: dueDate,
        priority: 'medium',
        source: 'meeting_action_item',
        source_id: note.meeting_id,
        meeting_task_id: meetingTask.id
      });

      return {
        meetingTask,
        generalTask
      };
    } catch (error) {
      console.error('Error creating task from action item:', error);
      throw error;
    }
  }
}

module.exports = TaskIntegrationService;