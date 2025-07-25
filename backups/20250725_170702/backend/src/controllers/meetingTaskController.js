const MeetingTask = require('../models/MeetingTask');
const Meeting = require('../models/Meeting');
const { validationResult } = require('express-validator');

// Create a task
exports.createTask = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const taskData = {
      ...req.body,
      created_by: req.user.id
    };

    // Check if user is participant in the meeting
    const meeting = await Meeting.findById(taskData.meeting_id);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const isParticipant = meeting.participants.some(p => p.user_id === req.user.id);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const task = await MeetingTask.create(taskData);

    // Emit socket event
    if (req.io) {
      req.io.to(`meeting_${taskData.meeting_id}`).emit('task:created', task);
      if (taskData.assignee_id) {
        req.io.to(`user_${taskData.assignee_id}`).emit('task:assigned', task);
      }
    }

    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

// Get tasks for a meeting
exports.getMeetingTasks = async (req, res, next) => {
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

    const tasks = await MeetingTask.findByMeetingId(meetingId);

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    next(error);
  }
};

// Get user's tasks
exports.getUserTasks = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      dueBefore: req.query.dueBefore,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const tasks = await MeetingTask.findByAssigneeId(req.user.id, filters);

    res.json({
      success: true,
      data: tasks,
      pagination: {
        limit: filters.limit,
        offset: filters.offset
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update task
exports.updateTask = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { taskId } = req.params;
    await MeetingTask.update(taskId, req.body, req.user.id);

    // Get updated task
    const [updatedTask] = await require('../utils/database').query(
      `SELECT mt.*, creator.name as creator_name, assignee.name as assignee_name
       FROM meeting_tasks mt
       JOIN users creator ON mt.created_by = creator.id
       LEFT JOIN users assignee ON mt.assignee_id = assignee.id
       WHERE mt.id = ?`,
      [taskId]
    );

    // Emit socket event
    if (req.io) {
      req.io.to(`meeting_${updatedTask.meeting_id}`).emit('task:updated', updatedTask);
      if (updatedTask.assignee_id) {
        req.io.to(`user_${updatedTask.assignee_id}`).emit('task:updated', updatedTask);
      }
    }

    res.json({
      success: true,
      data: updatedTask
    });
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
};

// Delete task
exports.deleteTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    // Get task details before deletion
    const [task] = await require('../utils/database').query(
      'SELECT meeting_id, assignee_id FROM meeting_tasks WHERE id = ?',
      [taskId]
    );

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await MeetingTask.delete(taskId, req.user.id);

    // Emit socket event
    if (req.io) {
      req.io.to(`meeting_${task.meeting_id}`).emit('task:deleted', {
        id: taskId,
        meeting_id: task.meeting_id
      });
      if (task.assignee_id) {
        req.io.to(`user_${task.assignee_id}`).emit('task:deleted', {
          id: taskId,
          meeting_id: task.meeting_id
        });
      }
    }

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
};

// Get task statistics
exports.getTaskStats = async (req, res, next) => {
  try {
    const stats = await MeetingTask.getStats(req.user.id);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// Convert to general task
exports.convertToGeneralTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const generalTaskData = await MeetingTask.convertToGeneralTask(taskId, req.user.id);

    res.json({
      success: true,
      data: generalTaskData,
      message: 'Task data prepared for conversion'
    });
  } catch (error) {
    next(error);
  }
};