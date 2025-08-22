const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const auth = require('../middleware/auth');
const { query, param, body } = require('express-validator');

// Validation middleware
const validateDateRange = [
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date')
];

const validateTrackEvent = [
  body('eventType').notEmpty().withMessage('Event type is required'),
  body('entityType').optional().isString(),
  body('entityId').optional().isInt(),
  body('properties').optional().isObject()
];

// All routes require authentication
router.use(auth);

// User metrics
router.get('/users/:userId/metrics', 
  param('userId').optional().isInt(),
  validateDateRange,
  analyticsController.getUserMetrics
);

// Team metrics
router.get('/teams/:teamId/metrics',
  param('teamId').isInt(),
  validateDateRange,
  analyticsController.getTeamMetrics
);

// Workload analysis
router.get('/workload/distribution',
  query('teamId').optional().isInt(),
  analyticsController.getWorkloadDistribution
);

// OKR progress
router.get('/okr/progress',
  query('teamId').optional().isInt(),
  query('userId').optional().isInt(),
  analyticsController.getOKRProgress
);

// Productivity insights
router.get('/productivity/insights', analyticsController.getProductivityInsights);

// Burndown chart
router.get('/burndown',
  query('objectiveId').isInt(),
  validateDateRange,
  analyticsController.getBurndownChart
);

// Event tracking
router.post('/events/track', validateTrackEvent, analyticsController.trackEvent);

// Goals Analytics Routes

// Goal completion trends
router.get('/goals/completion-trends',
  validateDateRange,
  query('teamId').optional().isInt(),
  query('userId').optional().isInt(),
  query('status').optional().isString(),
  analyticsController.getGoalCompletionTrends
);

// Team performance metrics
router.get('/goals/team-performance',
  validateDateRange,
  query('teamId').optional().isInt(),
  analyticsController.getGoalTeamPerformance
);

// Individual performance metrics
router.get('/goals/individual-performance',
  validateDateRange,
  query('teamId').optional().isInt(),
  query('userId').optional().isInt(),
  analyticsController.getGoalIndividualPerformance
);

// Progress distribution
router.get('/goals/progress-distribution',
  validateDateRange,
  query('teamId').optional().isInt(),
  query('type').optional().isString(),
  analyticsController.getGoalProgressDistribution
);

// Key result heat map
router.get('/goals/key-result-heatmap',
  validateDateRange,
  query('teamId').optional().isInt(),
  analyticsController.getKeyResultHeatMap
);

// Dashboard overview
router.get('/goals/dashboard-overview',
  validateDateRange,
  query('teamId').optional().isInt(),
  query('userId').optional().isInt(),
  analyticsController.getGoalDashboardOverview
);

// Export goals data
router.get('/goals/export',
  validateDateRange,
  query('teamId').optional().isInt(),
  query('userId').optional().isInt(),
  query('type').optional().isIn(['objectives', 'keyResults', 'performance']),
  analyticsController.exportGoalsData
);

module.exports = router;