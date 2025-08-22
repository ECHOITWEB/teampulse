const db = require('../utils/database');

class MeetingNote {
  // Create a new note
  static async create(noteData) {
    const { meeting_id, user_id, content, type = 'note', parent_id = null } = noteData;

    const [result] = await db.query(
      `INSERT INTO meeting_notes (meeting_id, user_id, content, type, parent_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [meeting_id, user_id, content, type, parent_id]
    );

    return {
      id: result.insertId,
      ...noteData,
      created_at: new Date(),
      updated_at: new Date()
    };
  }

  // Get notes for a meeting
  static async findByMeetingId(meetingId, filters = {}) {
    const { type, userId } = filters;
    
    let query = `
      SELECT mn.*, u.name as author_name, u.email as author_email,
             (SELECT COUNT(*) FROM meeting_notes WHERE parent_id = mn.id) as reply_count
      FROM meeting_notes mn
      JOIN users u ON mn.user_id = u.id
      WHERE mn.meeting_id = ? AND mn.parent_id IS NULL
    `;
    
    const params = [meetingId];

    if (type) {
      query += ' AND mn.type = ?';
      params.push(type);
    }

    if (userId) {
      query += ' AND mn.user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY mn.created_at ASC';

    const notes = await db.query(query, params);

    // Get replies for each note
    for (const note of notes) {
      if (note.reply_count > 0) {
        note.replies = await this.getReplies(note.id);
      }
    }

    return notes;
  }

  // Get replies for a note
  static async getReplies(parentId) {
    return await db.query(
      `SELECT mn.*, u.name as author_name, u.email as author_email
       FROM meeting_notes mn
       JOIN users u ON mn.user_id = u.id
       WHERE mn.parent_id = ?
       ORDER BY mn.created_at ASC`,
      [parentId]
    );
  }

  // Update note
  static async update(noteId, updates, userId) {
    // Check if user is the author
    const [note] = await db.query(
      'SELECT user_id FROM meeting_notes WHERE id = ?',
      [noteId]
    );

    if (!note || note.user_id !== userId) {
      throw new Error('Unauthorized to update this note');
    }

    const { content, type } = updates;
    const updateFields = [];
    const values = [];

    if (content !== undefined) {
      updateFields.push('content = ?');
      values.push(content);
    }

    if (type !== undefined) {
      updateFields.push('type = ?');
      values.push(type);
    }

    if (updateFields.length === 0) return false;

    values.push(noteId);
    await db.query(
      `UPDATE meeting_notes SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );

    return true;
  }

  // Delete note
  static async delete(noteId, userId) {
    // Check if user is the author
    const [note] = await db.query(
      'SELECT user_id FROM meeting_notes WHERE id = ?',
      [noteId]
    );

    if (!note || note.user_id !== userId) {
      throw new Error('Unauthorized to delete this note');
    }

    await db.query('DELETE FROM meeting_notes WHERE id = ?', [noteId]);
    return true;
  }

  // Get action items from meeting
  static async getActionItems(meetingId) {
    return await db.query(
      `SELECT mn.*, u.name as author_name, u.email as author_email,
              mt.id as task_id, mt.status as task_status, mt.assignee_id,
              assignee.name as assignee_name
       FROM meeting_notes mn
       JOIN users u ON mn.user_id = u.id
       LEFT JOIN meeting_tasks mt ON mn.id = mt.note_id
       LEFT JOIN users assignee ON mt.assignee_id = assignee.id
       WHERE mn.meeting_id = ? AND mn.type = 'action_item'
       ORDER BY mn.created_at ASC`,
      [meetingId]
    );
  }

  // Search notes
  static async search(userId, searchTerm, limit = 50) {
    return await db.query(
      `SELECT mn.*, m.title as meeting_title, m.scheduled_at,
              u.name as author_name
       FROM meeting_notes mn
       JOIN meetings m ON mn.meeting_id = m.id
       JOIN meeting_participants mp ON m.id = mp.meeting_id
       JOIN users u ON mn.user_id = u.id
       WHERE mp.user_id = ? 
         AND mn.content LIKE ?
       ORDER BY mn.created_at DESC
       LIMIT ?`,
      [userId, `%${searchTerm}%`, limit]
    );
  }
}

module.exports = MeetingNote;