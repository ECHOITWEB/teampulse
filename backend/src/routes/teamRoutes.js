const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const auth = require('../middleware/auth');
const { body, param, query } = require('express-validator');

// Validation middleware
const validateTeam = [
  body('name').notEmpty().withMessage('Team name is required'),
  body('description').optional().isString(),
  body('parent_team_id').optional().isInt(),
  body('leader_id').optional().isInt()
];

const validateTeamMember = [
  body('userId').isInt().withMessage('Valid user ID is required'),
  body('role').isIn(['member', 'leader', 'admin']).withMessage('Invalid role')
];

// All routes require authentication
router.use(auth);

// Team CRUD operations
router.post('/', validateTeam, teamController.createTeam);
router.get('/user', teamController.getUserTeams);
router.get('/hierarchy/:id?', teamController.getTeamHierarchy);
router.get('/:id', param('id').isInt(), teamController.getTeam);
router.put('/:id', param('id').isInt(), teamController.updateTeam);
router.delete('/:id', param('id').isInt(), teamController.deleteTeam);

// Team member management
router.get('/:id/members', param('id').isInt(), teamController.getTeamMembers);
router.post('/:teamId/members', validateTeamMember, teamController.addTeamMember);
router.delete('/:teamId/members/:userId', 
  param('teamId').isInt(),
  param('userId').isInt(),
  teamController.removeTeamMember
);

// Team statistics
router.get('/:id/stats', param('id').isInt(), teamController.getTeamStats);

module.exports = router;