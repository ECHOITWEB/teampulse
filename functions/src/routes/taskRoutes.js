const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const auth = require('../middleware/auth');
const { body, param, query } = require('express-validator');

// Validation middleware
const validateTask = [
  body('title').notEmpty().withMessage('Task title is required'),
  body('description').optional().isString(),
  body('type').optional().isIn(['task', 'milestone', 'epic', 'story', 'bug']),
  body('priority').optional().isIn(['critical', 'high', 'medium', 'low']),
  body('estimated_hours').optional().isFloat({ min: 0 }),
  body('start_date').optional().isISO8601(),
  body('due_date').optional().isISO8601(),
  body('assignee_id').optional().isInt(),
  body('team_id').optional().isInt(),
  body('key_result_id').optional().isInt(),
  body('parent_task_id').optional().isInt()
];

const validateComment = [
  body('comment').notEmpty().withMessage('Comment text is required'),
  body('mentioned_users').optional().isArray(),
  body('attachments').optional().isArray()
];

const validateTimeLog = [
  body('hoursLogged').isFloat({ min: 0.1 }).withMessage('Hours must be greater than 0'),
  body('description').optional().isString(),
  body('logDate').optional().isISO8601()
];

const validateDependency = [
  body('dependsOnTaskId').isInt().withMessage('Dependency task ID is required'),
  body('dependencyType').optional().isIn(['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish']),
  body('lagTime').optional().isInt()
];

// All routes require authentication
router.use(auth);

// Task CRUD operations
router.post('/', validateTask, taskController.createTask);
router.get('/search', taskController.searchTasks);
router.get('/user', taskController.getUserTasks);
router.get('/team/:teamId', param('teamId').isInt(), taskController.getTeamTasks);
router.get('/:id', param('id').isInt(), taskController.getTask);
router.put('/:id', param('id').isInt(), taskController.updateTask);
router.delete('/:id', param('id').isInt(), taskController.deleteTask);

// Task dependencies
router.get('/:id/dependencies/graph', param('id').isInt(), taskController.getDependencyGraph);
router.post('/:id/dependencies', 
  param('id').isInt(),
  validateDependency,
  taskController.addDependency
);
router.delete('/:taskId/dependencies/:dependsOnTaskId',
  param('taskId').isInt(),
  param('dependsOnTaskId').isInt(),
  taskController.removeDependency
);

// Task comments
router.post('/:id/comments',
  param('id').isInt(),
  validateComment,
  taskController.addComment
);

// Time tracking
router.post('/:id/time-logs',
  param('id').isInt(),
  validateTimeLog,
  taskController.logTime
);

module.exports = router;