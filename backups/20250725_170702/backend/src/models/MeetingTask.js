const db = require('../utils/database');

class MeetingTask {
  // Create a task from meeting
  static async create(taskData) {
    const {
      meeting_id,
      note_id,
      title,
      description,
      assignee_id,
      due_date,
      priority = 'medium',
      created_by
    } = taskData;

    const [result] = await db.query(
      `INSERT INTO meeting_tasks 
       (meeting_id, note_id, title, description, assignee_id, due_date, priority, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [meeting_id, note_id, title, description, assignee_id, due_date, priority, created_by]
    );

    return {
      id: result.insertId,
      ...taskData,
      status: 'pending',
      created_at: new Date()
    };
  }

  // Get tasks for a meeting
  static async findByMeetingId(meetingId) {
    return await db.query(
      `SELECT mt.*, 
              creator.name as creator_name,
              assignee.name as assignee_name,
              mn.content as note_content
       FROM meeting_tasks mt
       JOIN users creator ON mt.created_by = creator.id
       LEFT JOIN users assignee ON mt.assignee_id = assignee.id
       LEFT JOIN meeting_notes mn ON mt.note_id = mn.id
       WHERE mt.meeting_id = ?
       ORDER BY mt.priority DESC, mt.due_date ASC`,
      [meetingId]
    );
  }

  // Get tasks assigned to a user
  static async findByAssigneeId(assigneeId, filters = {}) {
    const { status, dueBefore, limit = 50, offset = 0 } = filters;
    
    let query = `
      SELECT mt.*, m.title as meeting_title, m.scheduled_at,
             creator.name as creator_name
      FROM meeting_tasks mt
      JOIN meetings m ON mt.meeting_id = m.id
      JOIN users creator ON mt.created_by = creator.id
      WHERE mt.assignee_id = ?
    `;
    
    const params = [assigneeId];

    if (status) {
      query += ' AND mt.status = ?';
      params.push(status);
    }

    if (dueBefore) {
      query += ' AND mt.due_date <= ?';
      params.push(dueBefore);
    }

    query += ' ORDER BY mt.due_date ASC, mt.priority DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return await db.query(query, params);
  }

  // Update task
  static async update(taskId, updates, userId) {
    const allowedFields = ['title', 'description', 'assignee_id', 'due_date', 
                          'priority', 'status'];
    
    const fields = Object.keys(updates).filter(field => allowedFields.includes(field));
    if (fields.length === 0) return false;

    // Check if user can update (creator or assignee)
    const [task] = await db.query(
      'SELECT created_by, assignee_id FROM meeting_tasks WHERE id = ?',
      [taskId]
    );

    if (!task || (task.created_by !== userId && task.assignee_id !== userId)) {
      throw new Error('Unauthorized to update this task');
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updates[field]);
    values.push(taskId);

    await db.query(
      `UPDATE meeting_tasks SET ${setClause} WHERE id = ?`,
      values
    );

    return true;
  }

  // Delete task
  static async delete(taskId, userId) {
    // Check if user is creator
    const [task] = await db.query(
      'SELECT created_by FROM meeting_tasks WHERE id = ?',
      [taskId]
    );

    if (!task || task.created_by !== userId) {
      throw new Error('Unauthorized to delete this task');
    }

    await db.query('DELETE FROM meeting_tasks WHERE id = ?', [taskId]);
    return true;
  }

  // Get task statistics for a user
  static async getStats(userId) {
    const [stats] = await db.query(
      `SELECT 
         COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
         COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count,
         COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
         COUNT(CASE WHEN status != 'completed' AND due_date < CURDATE() THEN 1 END) as overdue_count
       FROM meeting_tasks
       WHERE assignee_id = ?`,
      [userId]
    );

    return stats;
  }

  // Convert to general task (for task management integration)
  static async convertToGeneralTask(taskId, userId) {
    const [task] = await db.query(
      `SELECT mt.*, m.title as meeting_title
       FROM meeting_tasks mt
       JOIN meetings m ON mt.meeting_id = m.id
       WHERE mt.id = ?`,
      [taskId]
    );

    if (!task) {
      throw new Error('Task not found');
    }

    // Here you would integrate with the general task management system
    // For now, we'll just return the task data formatted for conversion
    return {
      title: task.title,
      description: `${task.description}\n\nCreated from meeting: ${task.meeting_title}`,
      assignee_id: task.assignee_id,
      due_date: task.due_date,
      priority: task.priority,
      source: 'meeting',
      source_id: task.meeting_id
    };
  }
}

module.exports = MeetingTask;