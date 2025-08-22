const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const auth = require('../middleware/auth');
const { body, param, query } = require('express-validator');

// Validation middleware
const validateTaskSuggestion = [
  body('objectiveId').isInt().withMessage('Objective ID is required'),
  body('context').optional().isString()
];

const validateAssignmentSuggestion = [
  body('taskId').isInt().withMessage('Task ID is required')
];

const validateSuggestionUpdate = [
  param('suggestionId').isInt(),
  body('status').isIn(['accepted', 'rejected']).withMessage('Invalid status'),
  body('feedback_rating').optional().isInt({ min: 1, max: 5 })
];

// All routes require authentication
router.use(auth);

// AI-powered suggestions
router.post('/suggestions/tasks', validateTaskSuggestion, aiController.generateTaskSuggestions);
router.post('/suggestions/assignments', validateAssignmentSuggestion, aiController.suggestTaskAssignments);

// Task predictions
router.get('/predictions/completion/:taskId',
  param('taskId').isInt(),
  aiController.predictTaskCompletion
);

// User suggestions management
router.get('/suggestions', 
  query('status').optional().isIn(['pending', 'accepted', 'rejected', 'expired']),
  aiController.getUserSuggestions
);

router.put('/suggestions/:suggestionId',
  validateSuggestionUpdate,
  aiController.updateSuggestionStatus
);

// AI insights
router.get('/insights', aiController.getInsights);

module.exports = router;