const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { authenticateUser } = require('../middleware/auth');
const meetingController = require('../controllers/meetingController');
const meetingNoteController = require('../controllers/meetingNoteController');
const meetingTaskController = require('../controllers/meetingTaskController');
const calendarController = require('../controllers/calendarController');

// Meeting validation rules
const meetingValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('scheduled_at').isISO8601().withMessage('Valid scheduled date is required'),
  body('duration_minutes').optional().isInt({ min: 15, max: 480 }).withMessage('Duration must be between 15 and 480 minutes'),
  body('participants').optional().isArray().withMessage('Participants must be an array')
];

const noteValidation = [
  body('content').trim().notEmpty().withMessage('Content is required'),
  body('type').optional().isIn(['note', 'action_item', 'decision', 'highlight']).withMessage('Invalid note type')
];

const taskValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  body('due_date').optional().isISO8601().withMessage('Valid due date is required')
];

// Apply authentication to all routes
router.use(authenticateUser);

// Meeting CRUD routes
router.post('/meetings', meetingValidation, meetingController.createMeeting);
router.get('/meetings', meetingController.getUserMeetings);
router.get('/meetings/upcoming', meetingController.getUpcomingMeetings);
router.get('/meetings/:id', meetingController.getMeeting);
router.put('/meetings/:id', meetingValidation, meetingController.updateMeeting);
router.delete('/meetings/:id', meetingController.deleteMeeting);

// Meeting status management
router.post('/meetings/:id/start', meetingController.startMeeting);
router.post('/meetings/:id/end', meetingController.endMeeting);
router.put('/meetings/:id/participant-status', 
  body('status').isIn(['accepted', 'declined', 'tentative']).withMessage('Invalid status'),
  meetingController.updateParticipantStatus
);

// Meeting notes routes
router.get('/meetings/:id/notes', meetingNoteController.getMeetingNotes);
router.post('/meetings/:id/notes', noteValidation, meetingNoteController.createNote);
router.put('/notes/:noteId', noteValidation, meetingNoteController.updateNote);
router.delete('/notes/:noteId', meetingNoteController.deleteNote);
router.get('/meetings/:id/action-items', meetingNoteController.getActionItems);
router.get('/notes/search', 
  query('q').trim().isLength({ min: 3 }).withMessage('Search term must be at least 3 characters'),
  meetingNoteController.searchNotes
);

// Meeting tasks routes
router.get('/meetings/:id/tasks', meetingTaskController.getMeetingTasks);
router.post('/meetings/:id/tasks', taskValidation, meetingTaskController.createTask);
router.get('/tasks', meetingTaskController.getUserTasks);
router.get('/tasks/stats', meetingTaskController.getTaskStats);
router.put('/tasks/:taskId', taskValidation, meetingTaskController.updateTask);
router.delete('/tasks/:taskId', meetingTaskController.deleteTask);
router.post('/tasks/:taskId/convert', meetingTaskController.convertToGeneralTask);

// Calendar integration routes
router.get('/calendar/integrations', calendarController.getIntegrations);
router.post('/calendar/connect', 
  body('provider').isIn(['google', 'outlook', 'apple']).withMessage('Invalid provider'),
  body('access_token').notEmpty().withMessage('Access token is required'),
  calendarController.connectCalendar
);
router.put('/calendar/:provider/sync', 
  param('provider').isIn(['google', 'outlook', 'apple']).withMessage('Invalid provider'),
  body('enabled').isBoolean().withMessage('Enabled must be boolean'),
  calendarController.toggleSync
);
router.delete('/calendar/:provider', 
  param('provider').isIn(['google', 'outlook', 'apple']).withMessage('Invalid provider'),
  calendarController.disconnectCalendar
);
router.post('/calendar/:provider/sync-now', 
  param('provider').isIn(['google', 'outlook', 'apple']).withMessage('Invalid provider'),
  calendarController.syncCalendar
);
router.get('/calendar/:provider/events', 
  param('provider').isIn(['google', 'outlook', 'apple']).withMessage('Invalid provider'),
  calendarController.getCalendarEvents
);

// OAuth callbacks
router.get('/calendar/callback/google', calendarController.googleCallback);
router.get('/calendar/callback/outlook', calendarController.outlookCallback);

module.exports = router;