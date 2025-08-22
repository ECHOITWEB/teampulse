const commentService = require('../services/commentService');
const notificationService = require('../services/notificationService');
const { validationResult } = require('express-validator');

class CommentController {
  // Create a new comment
  async createComment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
      }

      const { objective_id, content, parent_comment_id, mentions } = req.body;
      const user_id = req.user.id;

      const commentData = {
        objective_id,
        user_id,
        content,
        parent_comment_id,
        mentions: mentions || []
      };

      const comment = await commentService.createComment(commentData);

      // Send notification for mentions
      if (mentions && mentions.length > 0) {
        await notificationService.notifyCommentMentions(
          comment.id,
          'objective',
          objective_id,
          user_id,
          mentions
        );
      }

      // Send notification for comment replies
      if (parent_comment_id) {
        // Get parent comment to find original author
        const parentComment = await commentService.getCommentById(parent_comment_id);
        if (parentComment && parentComment.user_id !== user_id) {
          await notificationService.createNotification(
            parentComment.user_id,
            'comment_reply',
            'comment',
            comment.id,
            {
              userName: req.user.name || 'Someone',
              entityTitle: 'objective', // Could be enhanced to get actual objective title
              actionUrl: `/goals/objectives/${objective_id}#comment-${comment.id}`
            }
          );
        }
      }

      // Emit real-time update
      if (req.io) {
        req.io.to(`objective_${objective_id}`).emit('comment:created', comment);
        req.io.to(`user_${user_id}`).emit('comment:created', comment);
      }

      res.status(201).json({
        success: true,
        data: comment,
        message: 'Comment created successfully'
      });
    } catch (error) {
      console.error('Create comment error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get comments for an objective
  async getObjectiveComments(req, res) {
    try {
      const { objectiveId } = req.params;
      const { 
        limit = 50, 
        offset = 0, 
        includeReplies = true 
      } = req.query;

      const options = {
        limit: parseInt(limit),
        offset: parseInt(offset),
        includeReplies: includeReplies === 'true'
      };

      const comments = await commentService.getObjectiveComments(objectiveId, options);
      const totalCount = await commentService.getCommentCount(objectiveId);

      res.json({
        success: true,
        data: {
          comments,
          totalCount,
          hasMore: (parseInt(offset) + comments.length) < totalCount
        }
      });
    } catch (error) {
      console.error('Get objective comments error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get a single comment
  async getComment(req, res) {
    try {
      const { commentId } = req.params;
      const comment = await commentService.getCommentById(commentId);

      if (!comment) {
        return res.status(404).json({
          success: false,
          error: 'Comment not found'
        });
      }

      res.json({
        success: true,
        data: comment
      });
    } catch (error) {
      console.error('Get comment error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Update a comment
  async updateComment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
      }

      const { commentId } = req.params;
      const { content } = req.body;
      const userId = req.user.id;

      const comment = await commentService.updateComment(commentId, userId, content);

      // Emit real-time update
      if (req.io) {
        req.io.to(`objective_${comment.objective_id}`).emit('comment:updated', comment);
      }

      res.json({
        success: true,
        data: comment,
        message: 'Comment updated successfully'
      });
    } catch (error) {
      console.error('Update comment error:', error);
      
      if (error.message === 'Comment not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      
      if (error.message === 'Unauthorized to update this comment') {
        return res.status(403).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Delete a comment
  async deleteComment(req, res) {
    try {
      const { commentId } = req.params;
      const userId = req.user.id;

      await commentService.deleteComment(commentId, userId);

      // Emit real-time update
      if (req.io) {
        req.io.to(`comment_${commentId}`).emit('comment:deleted', { commentId });
      }

      res.json({
        success: true,
        message: 'Comment deleted successfully'
      });
    } catch (error) {
      console.error('Delete comment error:', error);
      
      if (error.message === 'Comment not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      
      if (error.message === 'Unauthorized to delete this comment') {
        return res.status(403).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Search users for mentions
  async searchUsersForMention(req, res) {
    try {
      const { q: query, objectiveId } = req.query;

      if (!query || query.length < 2) {
        return res.json({
          success: true,
          data: []
        });
      }

      const users = await commentService.searchUsersForMention(query, objectiveId);

      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('Search users for mention error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get user's recent comments
  async getUserRecentComments(req, res) {
    try {
      const { limit = 10 } = req.query;
      const userId = req.user.id;

      const comments = await commentService.getUserRecentComments(userId, parseInt(limit));

      res.json({
        success: true,
        data: comments
      });
    } catch (error) {
      console.error('Get user recent comments error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get comment count for an objective
  async getCommentCount(req, res) {
    try {
      const { objectiveId } = req.params;
      const count = await commentService.getCommentCount(objectiveId);

      res.json({
        success: true,
        data: { count }
      });
    } catch (error) {
      console.error('Get comment count error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new CommentController();