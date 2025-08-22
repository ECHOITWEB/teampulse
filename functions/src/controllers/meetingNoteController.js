const MeetingNote = require('../models/MeetingNote');
const Meeting = require('../models/Meeting');
const { validationResult } = require('express-validator');

// Create a note
exports.createNote = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { meeting_id, content, type, parent_id } = req.body;

    // Check if user is participant
    const meeting = await Meeting.findById(meeting_id);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const isParticipant = meeting.participants.some(p => p.user_id === req.user.id);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const note = await MeetingNote.create({
      meeting_id,
      user_id: req.user.id,
      content,
      type,
      parent_id
    });

    // Add author info
    note.author_name = req.user.name;
    note.author_email = req.user.email;

    // Emit socket event for real-time sync
    if (req.io) {
      req.io.to(`meeting_${meeting_id}`).emit('note:created', note);
    }

    res.status(201).json({
      success: true,
      data: note
    });
  } catch (error) {
    next(error);
  }
};

// Get notes for a meeting
exports.getMeetingNotes = async (req, res, next) => {
  try {
    const { id: meetingId } = req.params;
    const { type, userId } = req.query;

    // Check if user is participant
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const isParticipant = meeting.participants.some(p => p.user_id === req.user.id);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const notes = await MeetingNote.findByMeetingId(meetingId, { type, userId });

    res.json({
      success: true,
      data: notes
    });
  } catch (error) {
    next(error);
  }
};

// Update note
exports.updateNote = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { noteId } = req.params;
    const updates = req.body;

    await MeetingNote.update(noteId, updates, req.user.id);

    // Get updated note with author info
    const [updatedNote] = await require('../utils/database').query(
      `SELECT mn.*, u.name as author_name, u.email as author_email
       FROM meeting_notes mn
       JOIN users u ON mn.user_id = u.id
       WHERE mn.id = ?`,
      [noteId]
    );

    // Emit socket event
    if (req.io) {
      req.io.to(`meeting_${updatedNote.meeting_id}`).emit('note:updated', updatedNote);
    }

    res.json({
      success: true,
      data: updatedNote
    });
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
};

// Delete note
exports.deleteNote = async (req, res, next) => {
  try {
    const { noteId } = req.params;

    // Get note details before deletion
    const [note] = await require('../utils/database').query(
      'SELECT meeting_id FROM meeting_notes WHERE id = ?',
      [noteId]
    );

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    await MeetingNote.delete(noteId, req.user.id);

    // Emit socket event
    if (req.io) {
      req.io.to(`meeting_${note.meeting_id}`).emit('note:deleted', {
        id: noteId,
        meeting_id: note.meeting_id
      });
    }

    res.json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
};

// Get action items
exports.getActionItems = async (req, res, next) => {
  try {
    const { id: meetingId } = req.params;

    // Check if user is participant
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const isParticipant = meeting.participants.some(p => p.user_id === req.user.id);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const actionItems = await MeetingNote.getActionItems(meetingId);

    res.json({
      success: true,
      data: actionItems
    });
  } catch (error) {
    next(error);
  }
};

// Search notes
exports.searchNotes = async (req, res, next) => {
  try {
    const { q: searchTerm } = req.query;
    const limit = parseInt(req.query.limit) || 50;

    if (!searchTerm || searchTerm.length < 3) {
      return res.status(400).json({ error: 'Search term must be at least 3 characters' });
    }

    const notes = await MeetingNote.search(req.user.id, searchTerm, limit);

    res.json({
      success: true,
      data: notes,
      query: searchTerm
    });
  } catch (error) {
    next(error);
  }
};