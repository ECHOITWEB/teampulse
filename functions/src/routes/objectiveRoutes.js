const express = require('express');
const router = express.Router();
const objectiveController = require('../controllers/objectiveController');
const auth = require('../middleware/auth');
const { body, param, query } = require('express-validator');

// Validation middleware
const validateObjective = [
  body('title').notEmpty().withMessage('Objective title is required'),
  body('description').optional().isString(),
  body('quarter').isIn(['Q1', 'Q2', 'Q3', 'Q4']).withMessage('Invalid quarter'),
  body('year').isInt({ min: 2020, max: 2030 }).withMessage('Invalid year'),
  body('type').isIn(['company', 'team', 'individual']).withMessage('Invalid objective type'),
  body('team_id').optional().isInt(),
  body('status').optional().isIn(['draft', 'active', 'completed', 'cancelled'])
];

const validateKeyResult = [
  body('title').notEmpty().withMessage('Key result title is required'),
  body('description').optional().isString(),
  body('target_value').isNumeric().withMessage('Target value must be numeric'),
  body('unit').optional().isString(),
  body('owner_id').optional().isInt(),
  body('due_date').optional().isISO8601()
];

const validateProgressUpdate = [
  body('currentValue').isNumeric().withMessage('Current value must be numeric'),
  body('comment').optional().isString()
];

const validateBulkUpdate = [
  body('updates').isArray().withMessage('Updates must be an array'),
  body('updates.*.keyResultId').isInt().withMessage('Key result ID must be an integer'),
  body('updates.*.currentValue').isNumeric().withMessage('Current value must be numeric'),
  body('updates.*.comment').optional().isString()
];

// All routes require authentication
router.use(auth);

// Objective CRUD operations
router.post('/', validateObjective, objectiveController.createObjective);
router.get('/dashboard', objectiveController.getOKRDashboard);
router.get('/user', objectiveController.getUserObjectives);
router.get('/team/:teamId', param('teamId').isInt(), objectiveController.getTeamObjectives);
router.get('/hierarchy', objectiveController.getObjectiveHierarchy);
router.get('/:id', param('id').isInt(), objectiveController.getObjective);
router.put('/:id', param('id').isInt(), validateObjective, objectiveController.updateObjective);
router.delete('/:id', param('id').isInt(), objectiveController.deleteObjective);

// Key Results management
router.get('/key-results/user', objectiveController.getUserKeyResults);
router.post('/:id/key-results', 
  param('id').isInt(),
  validateKeyResult,
  objectiveController.addKeyResult
);
router.put('/key-results/:keyResultId',
  param('keyResultId').isInt(),
  objectiveController.updateKeyResult
);
router.delete('/key-results/:keyResultId',
  param('keyResultId').isInt(),
  objectiveController.deleteKeyResult
);
router.put('/key-results/:keyResultId/progress',
  param('keyResultId').isInt(),
  validateProgressUpdate,
  objectiveController.updateKeyResultProgress
);
router.put('/key-results/bulk-update',
  validateBulkUpdate,
  objectiveController.bulkUpdateKeyResults
);

module.exports = router;