const db = require('../utils/database');
const notificationService = require('./notificationService');

class CommentService {
  // Create a new comment
  async createComment(commentData) {
    try {
      const {
        objective_id,
        user_id,
        content,
        parent_comment_id = null,
        mentions = []
      } = commentData;

      // Insert the comment
      const query = `
        INSERT INTO objective_comments (
          objective_id, user_id, content, parent_comment_id, mentions
        ) VALUES (?, ?, ?, ?, ?)
      `;

      const [result] = await db.execute(query, [
        objective_id,
        user_id,
        content,
        parent_comment_id,
        JSON.stringify(mentions)
      ]);

      // Get the created comment with user information
      const comment = await this.getCommentById(result.insertId);

      // Send notifications for mentions
      if (mentions && mentions.length > 0) {
        await this.sendMentionNotifications(comment, mentions);
      }

      // Send notification to objective owner if not the commenter
      const [objective] = await db.execute(
        'SELECT owner_id, title FROM objectives WHERE id = ?',
        [objective_id]
      );

      if (objective[0] && objective[0].owner_id !== user_id) {
        await notificationService.createNotification(
          objective[0].owner_id,
          'comment_new',
          'objective',
          objective_id,
          {
            userName: comment.user_name,
            objectiveTitle: objective[0].title,
            commentContent: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
            actionUrl: `/goals/objectives/${objective_id}#comment-${comment.id}`,
            sendEmail: false
          }
        );
      }

      return comment;
    } catch (error) {
      console.error('Create comment error:', error);
      throw error;
    }
  }

  // Get comment by ID with user information
  async getCommentById(commentId) {
    try {
      const query = `
        SELECT 
          c.*,
          u.name as user_name,
          u.email as user_email,
          parent_u.name as parent_user_name
        FROM objective_comments c
        JOIN users u ON c.user_id = u.id
        LEFT JOIN objective_comments parent_c ON c.parent_comment_id = parent_c.id
        LEFT JOIN users parent_u ON parent_c.user_id = parent_u.id
        WHERE c.id = ? AND c.is_deleted = FALSE
      `;

      const [comments] = await db.execute(query, [commentId]);
      
      if (comments.length === 0) {
        return null;
      }

      const comment = comments[0];
      
      // Parse mentions JSON
      if (comment.mentions) {
        try {
          comment.mentions = JSON.parse(comment.mentions);
        } catch (e) {
          comment.mentions = [];
        }
      } else {
        comment.mentions = [];
      }

      return comment;
    } catch (error) {
      console.error('Get comment by ID error:', error);
      throw error;
    }
  }

  // Get all comments for an objective
  async getObjectiveComments(objectiveId, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        includeReplies = true
      } = options;

      let query = `
        SELECT 
          c.*,
          u.name as user_name,
          u.email as user_email,
          parent_u.name as parent_user_name
        FROM objective_comments c
        JOIN users u ON c.user_id = u.id
        LEFT JOIN objective_comments parent_c ON c.parent_comment_id = parent_c.id
        LEFT JOIN users parent_u ON parent_c.user_id = parent_u.id
        WHERE c.objective_id = ? AND c.is_deleted = FALSE
      `;

      const params = [objectiveId];

      if (!includeReplies) {
        query += ` AND c.parent_comment_id IS NULL`;
      }

      query += ` ORDER BY c.created_at ASC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const [comments] = await db.execute(query, params);

      // Parse mentions for each comment
      comments.forEach(comment => {
        if (comment.mentions) {
          try {
            comment.mentions = JSON.parse(comment.mentions);
          } catch (e) {
            comment.mentions = [];
          }
        } else {
          comment.mentions = [];
        }
      });

      // If including replies, organize them hierarchically
      if (includeReplies) {
        return this.organizeCommentsHierarchy(comments);
      }

      return comments;
    } catch (error) {
      console.error('Get objective comments error:', error);
      throw error;
    }
  }

  // Organize comments into a hierarchical structure
  organizeCommentsHierarchy(comments) {
    const commentMap = {};
    const rootComments = [];

    // First pass: create a map of all comments
    comments.forEach(comment => {
      comment.replies = [];
      commentMap[comment.id] = comment;
    });

    // Second pass: organize hierarchy
    comments.forEach(comment => {
      if (comment.parent_comment_id) {
        const parent = commentMap[comment.parent_comment_id];
        if (parent) {
          parent.replies.push(comment);
        }
      } else {
        rootComments.push(comment);
      }
    });

    return rootComments;
  }

  // Update a comment
  async updateComment(commentId, userId, newContent) {
    try {
      // Check if user owns the comment
      const [existingComment] = await db.execute(
        'SELECT user_id FROM objective_comments WHERE id = ? AND is_deleted = FALSE',
        [commentId]
      );

      if (!existingComment.length) {
        throw new Error('Comment not found');
      }

      if (existingComment[0].user_id !== userId) {
        throw new Error('Unauthorized to update this comment');
      }

      const query = `
        UPDATE objective_comments 
        SET content = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `;

      const [result] = await db.execute(query, [newContent, commentId, userId]);

      if (result.affectedRows === 0) {
        throw new Error('Failed to update comment');
      }

      return await this.getCommentById(commentId);
    } catch (error) {
      console.error('Update comment error:', error);
      throw error;
    }
  }

  // Delete a comment (soft delete)
  async deleteComment(commentId, userId) {
    try {
      // Check if user owns the comment
      const [existingComment] = await db.execute(
        'SELECT user_id FROM objective_comments WHERE id = ? AND is_deleted = FALSE',
        [commentId]
      );

      if (!existingComment.length) {
        throw new Error('Comment not found');
      }

      if (existingComment[0].user_id !== userId) {
        throw new Error('Unauthorized to delete this comment');
      }

      const query = `
        UPDATE objective_comments 
        SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `;

      const [result] = await db.execute(query, [commentId, userId]);

      if (result.affectedRows === 0) {
        throw new Error('Failed to delete comment');
      }

      return true;
    } catch (error) {
      console.error('Delete comment error:', error);
      throw error;
    }
  }

  // Get comment count for an objective
  async getCommentCount(objectiveId) {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM objective_comments
        WHERE objective_id = ? AND is_deleted = FALSE
      `;

      const [result] = await db.execute(query, [objectiveId]);
      return result[0].count;
    } catch (error) {
      console.error('Get comment count error:', error);
      throw error;
    }
  }

  // Search for users to mention
  async searchUsersForMention(query, objectiveId) {
    try {
      // Get users who have access to this objective (objective owner, team members, etc.)
      const searchQuery = `
        SELECT DISTINCT u.id, u.name, u.email
        FROM users u
        LEFT JOIN objectives o ON (o.owner_id = u.id OR o.team_id IS NULL)
        WHERE u.name LIKE ? OR u.email LIKE ?
        ORDER BY u.name
        LIMIT 10
      `;

      const searchTerm = `%${query}%`;
      const [users] = await db.execute(searchQuery, [searchTerm, searchTerm]);

      return users;
    } catch (error) {
      console.error('Search users for mention error:', error);
      throw error;
    }
  }

  // Send mention notifications
  async sendMentionNotifications(comment, mentions) {
    try {
      const [objective] = await db.execute(
        'SELECT title FROM objectives WHERE id = ?',
        [comment.objective_id]
      );

      if (!objective[0]) return;

      for (const mention of mentions) {
        if (mention.userId && mention.userId !== comment.user_id) {
          await notificationService.createNotification(
            mention.userId,
            'comment_mention',
            'objective',
            comment.objective_id,
            {
              userName: comment.user_name,
              objectiveTitle: objective[0].title,
              commentContent: comment.content.substring(0, 100) + (comment.content.length > 100 ? '...' : ''),
              actionUrl: `/goals/objectives/${comment.objective_id}#comment-${comment.id}`,
              sendEmail: true
            }
          );
        }
      }
    } catch (error) {
      console.error('Send mention notifications error:', error);
    }
  }

  // Get recent comments for a user (for activity feed)
  async getUserRecentComments(userId, limit = 10) {
    try {
      const query = `
        SELECT 
          c.*,
          o.title as objective_title,
          u.name as user_name
        FROM objective_comments c
        JOIN objectives o ON c.objective_id = o.id
        JOIN users u ON c.user_id = u.id
        WHERE c.user_id = ? AND c.is_deleted = FALSE
        ORDER BY c.created_at DESC
        LIMIT ?
      `;

      const [comments] = await db.execute(query, [userId, limit]);

      // Parse mentions for each comment
      comments.forEach(comment => {
        if (comment.mentions) {
          try {
            comment.mentions = JSON.parse(comment.mentions);
          } catch (e) {
            comment.mentions = [];
          }
        } else {
          comment.mentions = [];
        }
      });

      return comments;
    } catch (error) {
      console.error('Get user recent comments error:', error);
      throw error;
    }
  }
}

module.exports = new CommentService();