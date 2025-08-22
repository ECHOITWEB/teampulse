const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const auth = require('../middleware/auth');
const { body, param, query } = require('express-validator');

// Validation middleware
const validateCreateComment = [
  body('objective_id').isInt().withMessage('Objective ID must be an integer'),
  body('content').notEmpty().trim().withMessage('Comment content is required'),
  body('parent_comment_id').optional().isInt().withMessage('Parent comment ID must be an integer'),
  body('mentions').optional().isArray().withMessage('Mentions must be an array'),
  body('mentions.*.userId').optional().isInt().withMessage('Mention user ID must be an integer'),
  body('mentions.*.userName').optional().isString().withMessage('Mention user name must be a string')
];

const validateUpdateComment = [
  body('content').notEmpty().trim().withMessage('Comment content is required')
];

const validateObjectiveId = [
  param('objectiveId').isInt().withMessage('Objective ID must be an integer')
];

const validateCommentId = [
  param('commentId').isInt().withMessage('Comment ID must be an integer')
];

const validateSearchQuery = [
  query('q').isLength({ min: 2 }).withMessage('Search query must be at least 2 characters'),
  query('objectiveId').optional().isInt().withMessage('Objective ID must be an integer')
];

// All routes require authentication
router.use(auth);

// Create a new comment
router.post('/', validateCreateComment, commentController.createComment);

// Get comments for an objective
router.get('/objective/:objectiveId', validateObjectiveId, commentController.getObjectiveComments);

// Get comment count for an objective
router.get('/objective/:objectiveId/count', validateObjectiveId, commentController.getCommentCount);

// Search users for mentions
router.get('/users/search', validateSearchQuery, commentController.searchUsersForMention);

// Get user's recent comments
router.get('/user/recent', commentController.getUserRecentComments);

// Get a single comment
router.get('/:commentId', validateCommentId, commentController.getComment);

// Update a comment
router.put('/:commentId', validateCommentId, validateUpdateComment, commentController.updateComment);

// Delete a comment
router.delete('/:commentId', validateCommentId, commentController.deleteComment);

module.exports = router;