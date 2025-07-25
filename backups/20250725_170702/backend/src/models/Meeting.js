const db = require('../utils/database');

class Meeting {
  // Create a new meeting
  static async create(meetingData, organizerId) {
    const {
      title,
      description,
      scheduled_at,
      duration_minutes = 60,
      location,
      meeting_link,
      participants = []
    } = meetingData;

    return await db.transaction(async (connection) => {
      // Create meeting
      const [meetingResult] = await connection.execute(
        `INSERT INTO meetings (title, description, scheduled_at, duration_minutes, 
         location, meeting_link, organizer_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [title, description, scheduled_at, duration_minutes, location, meeting_link, organizerId]
      );

      const meetingId = meetingResult.insertId;

      // Add organizer as participant
      await connection.execute(
        `INSERT INTO meeting_participants (meeting_id, user_id, role, attendance_status) 
         VALUES (?, ?, 'organizer', 'accepted')`,
        [meetingId, organizerId]
      );

      // Add other participants
      if (participants.length > 0) {
        const participantValues = participants.map(p => 
          [meetingId, p.user_id, p.role || 'participant', 'pending']
        );
        
        await connection.query(
          `INSERT INTO meeting_participants (meeting_id, user_id, role, attendance_status) 
           VALUES ?`,
          [participantValues]
        );
      }

      return { id: meetingId, ...meetingData };
    });
  }

  // Get meeting by ID with participants
  static async findById(meetingId) {
    const [meeting] = await db.query(
      `SELECT m.*, u.name as organizer_name, u.email as organizer_email
       FROM meetings m
       JOIN users u ON m.organizer_id = u.id
       WHERE m.id = ?`,
      [meetingId]
    );

    if (!meeting) return null;

    // Get participants
    const participants = await db.query(
      `SELECT mp.*, u.name, u.email
       FROM meeting_participants mp
       JOIN users u ON mp.user_id = u.id
       WHERE mp.meeting_id = ?
       ORDER BY mp.role = 'organizer' DESC, u.name`,
      [meetingId]
    );

    return { ...meeting, participants };
  }

  // Get meetings for a user
  static async findByUserId(userId, filters = {}) {
    const { status, startDate, endDate, limit = 50, offset = 0 } = filters;
    
    let query = `
      SELECT DISTINCT m.*, u.name as organizer_name, mp.role, mp.attendance_status
      FROM meetings m
      JOIN meeting_participants mp ON m.id = mp.meeting_id
      JOIN users u ON m.organizer_id = u.id
      WHERE mp.user_id = ?
    `;
    
    const params = [userId];

    if (status) {
      query += ' AND m.status = ?';
      params.push(status);
    }

    if (startDate) {
      query += ' AND m.scheduled_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND m.scheduled_at <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY m.scheduled_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return await db.query(query, params);
  }

  // Update meeting
  static async update(meetingId, updates, userId) {
    const allowedFields = ['title', 'description', 'scheduled_at', 'duration_minutes', 
                          'location', 'meeting_link', 'status'];
    
    const fields = Object.keys(updates).filter(field => allowedFields.includes(field));
    if (fields.length === 0) return false;

    // Check if user is organizer
    const [meeting] = await db.query(
      'SELECT organizer_id FROM meetings WHERE id = ?',
      [meetingId]
    );

    if (!meeting || meeting.organizer_id !== userId) {
      throw new Error('Unauthorized to update this meeting');
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updates[field]);
    values.push(meetingId);

    await db.query(
      `UPDATE meetings SET ${setClause} WHERE id = ?`,
      values
    );

    return true;
  }

  // Delete meeting
  static async delete(meetingId, userId) {
    // Check if user is organizer
    const [meeting] = await db.query(
      'SELECT organizer_id FROM meetings WHERE id = ?',
      [meetingId]
    );

    if (!meeting || meeting.organizer_id !== userId) {
      throw new Error('Unauthorized to delete this meeting');
    }

    await db.query('DELETE FROM meetings WHERE id = ?', [meetingId]);
    return true;
  }

  // Update participant status
  static async updateParticipantStatus(meetingId, userId, status) {
    const result = await db.query(
      `UPDATE meeting_participants 
       SET attendance_status = ? 
       WHERE meeting_id = ? AND user_id = ?`,
      [status, meetingId, userId]
    );

    return result.affectedRows > 0;
  }

  // Mark attendance
  static async markAttendance(meetingId, userId, attended = true) {
    const result = await db.query(
      `UPDATE meeting_participants 
       SET attended = ? 
       WHERE meeting_id = ? AND user_id = ?`,
      [attended, meetingId, userId]
    );

    return result.affectedRows > 0;
  }

  // Get upcoming meetings
  static async getUpcoming(userId, limit = 10) {
    return await db.query(
      `SELECT m.*, u.name as organizer_name, mp.role, mp.attendance_status
       FROM meetings m
       JOIN meeting_participants mp ON m.id = mp.meeting_id
       JOIN users u ON m.organizer_id = u.id
       WHERE mp.user_id = ? 
         AND m.scheduled_at > NOW()
         AND m.status = 'scheduled'
       ORDER BY m.scheduled_at ASC
       LIMIT ?`,
      [userId, limit]
    );
  }
}

module.exports = Meeting;