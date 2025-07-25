const Meeting = require('../models/Meeting');
const MeetingNote = require('../models/MeetingNote');
const MeetingTask = require('../models/MeetingTask');
const { validationResult } = require('express-validator');

// Create a new meeting
exports.createMeeting = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const meeting = await Meeting.create(req.body, req.user.id);
    
    // Emit socket event for real-time updates
    if (req.io) {
      req.body.participants?.forEach(participant => {
        req.io.to(`user_${participant.user_id}`).emit('meeting:created', meeting);
      });
    }

    res.status(201).json({
      success: true,
      data: meeting
    });
  } catch (error) {
    next(error);
  }
};

// Get meeting by ID
exports.getMeeting = async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Check if user is participant
    const isParticipant = meeting.participants.some(p => p.user_id === req.user.id);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      data: meeting
    });
  } catch (error) {
    next(error);
  }
};

// Get user's meetings
exports.getUserMeetings = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const meetings = await Meeting.findByUserId(req.user.id, filters);
    
    res.json({
      success: true,
      data: meetings,
      pagination: {
        limit: filters.limit,
        offset: filters.offset
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update meeting
exports.updateMeeting = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    await Meeting.update(req.params.id, req.body, req.user.id);
    const updatedMeeting = await Meeting.findById(req.params.id);

    // Emit socket event for real-time updates
    if (req.io) {
      updatedMeeting.participants.forEach(participant => {
        req.io.to(`user_${participant.user_id}`).emit('meeting:updated', updatedMeeting);
      });
    }

    res.json({
      success: true,
      data: updatedMeeting
    });
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
};

// Delete meeting
exports.deleteMeeting = async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    await Meeting.delete(req.params.id, req.user.id);

    // Emit socket event for real-time updates
    if (req.io) {
      meeting.participants.forEach(participant => {
        req.io.to(`user_${participant.user_id}`).emit('meeting:deleted', { id: req.params.id });
      });
    }

    res.json({
      success: true,
      message: 'Meeting deleted successfully'
    });
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
};

// Update participant status
exports.updateParticipantStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['accepted', 'declined', 'tentative'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updated = await Meeting.updateParticipantStatus(
      req.params.id, 
      req.user.id, 
      status
    );

    if (!updated) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    // Emit socket event
    if (req.io) {
      req.io.to(`meeting_${req.params.id}`).emit('participant:statusUpdated', {
        meetingId: req.params.id,
        userId: req.user.id,
        status
      });
    }

    res.json({
      success: true,
      message: 'Status updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get upcoming meetings
exports.getUpcomingMeetings = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const meetings = await Meeting.getUpcoming(req.user.id, limit);
    
    res.json({
      success: true,
      data: meetings
    });
  } catch (error) {
    next(error);
  }
};

// Start meeting (update status)
exports.startMeeting = async (req, res, next) => {
  try {
    await Meeting.update(req.params.id, { status: 'in_progress' }, req.user.id);
    
    const meeting = await Meeting.findById(req.params.id);

    // Emit socket event
    if (req.io) {
      meeting.participants.forEach(participant => {
        req.io.to(`user_${participant.user_id}`).emit('meeting:started', {
          id: req.params.id,
          startedBy: req.user.id
        });
      });
    }

    res.json({
      success: true,
      data: meeting
    });
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
};

// End meeting
exports.endMeeting = async (req, res, next) => {
  try {
    await Meeting.update(req.params.id, { status: 'completed' }, req.user.id);
    
    const meeting = await Meeting.findById(req.params.id);

    // Emit socket event
    if (req.io) {
      meeting.participants.forEach(participant => {
        req.io.to(`user_${participant.user_id}`).emit('meeting:ended', {
          id: req.params.id,
          endedBy: req.user.id
        });
      });
    }

    res.json({
      success: true,
      data: meeting
    });
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
};