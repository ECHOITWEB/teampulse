const db = require('../utils/database');
const nodemailer = require('nodemailer');
const emailTemplates = require('./emailTemplates');

class NotificationService {
  constructor() {
    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Notification types configuration
    this.notificationTypes = {
      // Goal-specific notifications
      deadline_approaching: {
        title: 'Deadline Approaching',
        template: 'Goal "{goalTitle}" deadline is in {daysRemaining} days'
      },
      deadline_today: {
        title: 'Goal Due Today',
        template: 'Goal "{goalTitle}" is due today!'
      },
      deadline_overdue: {
        title: 'Goal Overdue',
        template: 'Goal "{goalTitle}" is overdue by {daysOverdue} days'
      },
      goal_progress_reminder: {
        title: 'Progress Update Reminder',
        template: 'Please update progress for goal "{goalTitle}" - it\'s been {daysSinceUpdate} days since last update'
      },
      goal_at_risk: {
        title: 'Goal At Risk',
        template: 'Goal "{goalTitle}" is at risk - progress is {currentProgress}% with {daysRemaining} days remaining'
      },
      goal_status_change: {
        title: 'Goal Status Changed',
        template: 'Goal "{goalTitle}" status changed from {oldStatus} to {newStatus}'
      },
      comment_mention: {
        title: 'You were mentioned',
        template: '{userName} mentioned you in a comment on "{entityTitle}"'
      },
      comment_reply: {
        title: 'New Comment Reply',
        template: '{userName} replied to your comment on "{entityTitle}"'
      },
      objective_assigned: {
        title: 'New Objective Assigned',
        template: 'You have been assigned objective: "{objectiveTitle}"'
      },
      objective_completed: {
        title: 'Objective Completed',
        template: 'Objective "{objectiveTitle}" has been completed'
      },
      key_result_updated: {
        title: 'Key Result Updated',
        template: 'Key result "{keyResultTitle}" progress updated to {progress}%'
      },
      // Legacy task notifications
      task_assigned: {
        title: 'New Task Assigned',
        template: 'You have been assigned a new task: {taskTitle}'
      },
      task_completed: {
        title: 'Task Completed',
        template: 'Task "{taskTitle}" has been completed'
      },
      task_overdue: {
        title: 'Task Overdue',
        template: 'Task "{taskTitle}" is overdue. Due date was {dueDate}'
      },
      deadline_reminder: {
        title: 'Deadline Reminder',
        template: 'Task "{taskTitle}" is due in {daysUntilDue} days'
      },
      capacity_alert: {
        title: 'Capacity Alert',
        template: 'Your workload for {date} exceeds available capacity'
      },
      meeting_reminder: {
        title: 'Meeting Reminder',
        template: 'Meeting "{meetingTitle}" starts in {minutesUntil} minutes'
      }
    };
  }

  // Create a notification
  async createNotification(userId, type, entityType, entityId, data = {}) {
    try {
      const notificationConfig = this.notificationTypes[type];
      if (!notificationConfig) {
        throw new Error(`Unknown notification type: ${type}`);
      }

      // Check user preferences before creating notification
      const preferences = await this.getUserPreferences(userId, type);
      if (!preferences || !preferences.in_app_enabled) {
        return null; // Don't create notification if disabled
      }

      // Format message with data
      let message = notificationConfig.template;
      Object.keys(data).forEach(key => {
        message = message.replace(`{${key}}`, data[key]);
      });

      const query = `
        INSERT INTO notifications (
          user_id, type, entity_type, entity_id, title, message, action_url
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await db.execute(query, [
        userId,
        type,
        entityType,
        entityId,
        notificationConfig.title,
        message,
        data.actionUrl || null
      ]);

      const notification = {
        id: result.insertId,
        userId,
        type,
        entityType,
        entityId,
        title: notificationConfig.title,
        message,
        actionUrl: data.actionUrl
      };

      // Send real-time notification if socket is available
      if (global.io) {
        global.io.to(`user_${userId}`).emit('notification:new', notification);
      }

      // Send email notification if enabled in preferences
      if (preferences.email_enabled && (data.sendEmail !== false)) {
        await this.sendEmailNotification(userId, notification);
      }

      return notification;
    } catch (error) {
      console.error('Create notification error:', error);
      throw error;
    }
  }

  // Send email notification
  async sendEmailNotification(userId, notification) {
    try {
      // Get user email
      const [user] = await db.execute(
        'SELECT email, name FROM users WHERE id = ?',
        [userId]
      );

      if (!user[0]) {
        throw new Error('User not found');
      }

      // Get template data for email
      const templateData = {
        title: notification.title,
        message: notification.message,
        actionUrl: notification.actionUrl,
        ...notification.templateData // Additional data for specific templates
      };

      const mailOptions = {
        from: `"TeamPulse" <${process.env.SMTP_FROM || 'noreply@teampulse.com'}>`,
        to: user[0].email,
        subject: `[TeamPulse] ${notification.title}`,
        html: emailTemplates.getTemplate(notification.type, templateData)
      };

      await this.emailTransporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Send email notification error:', error);
      // Don't throw error to prevent notification creation from failing
    }
  }

  // Get user notifications
  async getUserNotifications(userId, filters = {}) {
    try {
      let query = `
        SELECT * FROM notifications
        WHERE user_id = ?
      `;

      const params = [userId];

      if (filters.unreadOnly) {
        query += ` AND is_read = FALSE`;
      }

      if (filters.type) {
        query += ` AND type = ?`;
        params.push(filters.type);
      }

      query += ` ORDER BY created_at DESC LIMIT ?`;
      params.push(filters.limit || 50);

      const [notifications] = await db.execute(query, params);
      return notifications;
    } catch (error) {
      console.error('Get user notifications error:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    try {
      const query = `
        UPDATE notifications 
        SET is_read = TRUE, read_at = NOW()
        WHERE id = ? AND user_id = ?
      `;

      const [result] = await db.execute(query, [notificationId, userId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Mark as read error:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId) {
    try {
      const query = `
        UPDATE notifications 
        SET is_read = TRUE, read_at = NOW()
        WHERE user_id = ? AND is_read = FALSE
      `;

      const [result] = await db.execute(query, [userId]);
      return result.affectedRows;
    } catch (error) {
      console.error('Mark all as read error:', error);
      throw error;
    }
  }

  // Send deadline reminders
  async sendDeadlineReminders() {
    try {
      // Find tasks due soon
      const query = `
        SELECT 
          t.id,
          t.title,
          t.assignee_id,
          t.due_date,
          DATEDIFF(t.due_date, CURDATE()) as days_until_due
        FROM tasks t
        WHERE t.status NOT IN ('completed', 'cancelled')
          AND t.due_date IS NOT NULL
          AND DATEDIFF(t.due_date, CURDATE()) IN (1, 3, 7)
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.entity_type = 'task' 
              AND n.entity_id = t.id
              AND n.type = 'deadline_reminder'
              AND DATE(n.created_at) = CURDATE()
          )
      `;

      const [tasks] = await db.execute(query);

      for (const task of tasks) {
        await this.createNotification(
          task.assignee_id,
          'deadline_reminder',
          'task',
          task.id,
          {
            taskTitle: task.title,
            daysUntilDue: task.days_until_due,
            dueDate: task.due_date,
            actionUrl: `/tasks/${task.id}`,
            sendEmail: task.days_until_due <= 1
          }
        );
      }

      return tasks.length;
    } catch (error) {
      console.error('Send deadline reminders error:', error);
      throw error;
    }
  }

  // Send capacity alerts
  async sendCapacityAlerts() {
    try {
      const query = `
        SELECT 
          uc.user_id,
          uc.date,
          uc.available_hours,
          uc.planned_hours,
          u.name,
          u.email
        FROM user_capacity uc
        JOIN users u ON uc.user_id = u.id
        WHERE uc.date >= CURDATE()
          AND uc.date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
          AND uc.planned_hours > uc.available_hours
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.user_id = uc.user_id
              AND n.type = 'capacity_alert'
              AND n.entity_id = uc.id
              AND DATE(n.created_at) = CURDATE()
          )
      `;

      const [overloadedDays] = await db.execute(query);

      for (const day of overloadedDays) {
        await this.createNotification(
          day.user_id,
          'capacity_alert',
          'capacity',
          day.id,
          {
            date: day.date,
            plannedHours: day.planned_hours,
            availableHours: day.available_hours,
            actionUrl: `/capacity/manage`,
            sendEmail: true
          }
        );
      }

      return overloadedDays.length;
    } catch (error) {
      console.error('Send capacity alerts error:', error);
      throw error;
    }
  }

  // Get user notification preferences
  async getUserPreferences(userId, notificationType) {
    try {
      const query = `
        SELECT * FROM notification_preferences
        WHERE user_id = ? AND notification_type = ?
      `;

      const [preferences] = await db.execute(query, [userId, notificationType]);
      return preferences[0] || null;
    } catch (error) {
      console.error('Get user preferences error:', error);
      throw error;
    }
  }

  // Update user notification preferences
  async updateUserPreferences(userId, preferences) {
    try {
      const results = [];
      
      for (const [notificationType, settings] of Object.entries(preferences)) {
        const query = `
          INSERT INTO notification_preferences (
            user_id, notification_type, in_app_enabled, email_enabled, 
            push_enabled, digest_frequency
          )
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            in_app_enabled = VALUES(in_app_enabled),
            email_enabled = VALUES(email_enabled),
            push_enabled = VALUES(push_enabled),
            digest_frequency = VALUES(digest_frequency),
            updated_at = NOW()
        `;

        const [result] = await db.execute(query, [
          userId,
          notificationType,
          settings.in_app_enabled || false,
          settings.email_enabled || false,
          settings.push_enabled || false,
          settings.digest_frequency || 'immediately'
        ]);

        results.push({ type: notificationType, success: result.affectedRows > 0 });
      }

      return results;
    } catch (error) {
      console.error('Update user preferences error:', error);
      throw error;
    }
  }

  // Get all user preferences
  async getAllUserPreferences(userId) {
    try {
      const query = `
        SELECT * FROM notification_preferences
        WHERE user_id = ?
        ORDER BY notification_type
      `;

      const [preferences] = await db.execute(query, [userId]);
      return preferences;
    } catch (error) {
      console.error('Get all user preferences error:', error);
      throw error;
    }
  }

  // Send goal deadline reminders (3 days, 1 day)
  async sendGoalDeadlineReminders() {
    try {
      const query = `
        SELECT 
          o.id,
          o.title,
          o.owner_id,
          gp.end_date,
          DATEDIFF(gp.end_date, CURDATE()) as days_until_deadline,
          o.progress
        FROM objectives o
        JOIN goal_periods gp ON o.goal_period_id = gp.id
        WHERE o.status = 'active'
          AND gp.end_date IS NOT NULL
          AND DATEDIFF(gp.end_date, CURDATE()) IN (1, 3)
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.entity_type = 'objective' 
              AND n.entity_id = o.id
              AND n.type IN ('deadline_approaching', 'deadline_today')
              AND DATE(n.created_at) = CURDATE()
          )
      `;

      const [objectives] = await db.execute(query);

      for (const objective of objectives) {
        const notificationType = objective.days_until_deadline === 1 ? 'deadline_today' : 'deadline_approaching';
        
        await this.createNotification(
          objective.owner_id,
          notificationType,
          'objective',
          objective.id,
          {
            goalTitle: objective.title,
            daysRemaining: objective.days_until_deadline,
            currentProgress: Math.round(objective.progress),
            actionUrl: `/goals/objectives/${objective.id}`
          }
        );
      }

      return objectives.length;
    } catch (error) {
      console.error('Send goal deadline reminders error:', error);
      throw error;
    }
  }

  // Send goal progress reminders (weekly/monthly)
  async sendGoalProgressReminders() {
    try {
      const query = `
        SELECT 
          o.id,
          o.title,
          o.owner_id,
          o.updated_at,
          DATEDIFF(CURDATE(), DATE(o.updated_at)) as days_since_update,
          o.progress
        FROM objectives o
        WHERE o.status = 'active'
          AND DATEDIFF(CURDATE(), DATE(o.updated_at)) >= 7
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.entity_type = 'objective' 
              AND n.entity_id = o.id
              AND n.type = 'goal_progress_reminder'
              AND n.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
          )
      `;

      const [objectives] = await db.execute(query);

      for (const objective of objectives) {
        await this.createNotification(
          objective.owner_id,
          'goal_progress_reminder',
          'objective',
          objective.id,
          {
            goalTitle: objective.title,
            daysSinceUpdate: objective.days_since_update,
            currentProgress: Math.round(objective.progress),
            actionUrl: `/goals/objectives/${objective.id}`
          }
        );
      }

      return objectives.length;
    } catch (error) {
      console.error('Send goal progress reminders error:', error);
      throw error;
    }
  }

  // Send goal at risk alerts
  async sendGoalAtRiskAlerts() {
    try {
      const query = `
        SELECT 
          o.id,
          o.title,
          o.owner_id,
          o.progress,
          gp.end_date,
          DATEDIFF(gp.end_date, CURDATE()) as days_remaining
        FROM objectives o
        JOIN goal_periods gp ON o.goal_period_id = gp.id
        WHERE o.status = 'active'
          AND gp.end_date IS NOT NULL
          AND DATEDIFF(gp.end_date, CURDATE()) > 0
          AND (
            -- Progress is less than 50% with less than 30 days remaining
            (o.progress < 50 AND DATEDIFF(gp.end_date, CURDATE()) <= 30)
            OR
            -- Progress is less than 25% with less than 60 days remaining
            (o.progress < 25 AND DATEDIFF(gp.end_date, CURDATE()) <= 60)
          )
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.entity_type = 'objective' 
              AND n.entity_id = o.id
              AND n.type = 'goal_at_risk'
              AND n.created_at > DATE_SUB(NOW(), INTERVAL 3 DAY)
          )
      `;

      const [objectives] = await db.execute(query);

      for (const objective of objectives) {
        await this.createNotification(
          objective.owner_id,
          'goal_at_risk',
          'objective',
          objective.id,
          {
            goalTitle: objective.title,
            currentProgress: Math.round(objective.progress),
            daysRemaining: objective.days_remaining,
            actionUrl: `/goals/objectives/${objective.id}`
          }
        );
      }

      return objectives.length;
    } catch (error) {
      console.error('Send goal at risk alerts error:', error);
      throw error;
    }
  }

  // Notify when mentioned in comments
  async notifyCommentMentions(commentId, entityType, entityId, authorId, mentions = []) {
    try {
      if (!mentions || mentions.length === 0) return;

      // Get comment content and entity title
      const commentQuery = `
        SELECT content FROM ${entityType}_comments WHERE id = ?
      `;
      const [comments] = await db.execute(commentQuery, [commentId]);
      
      let entityTitle = 'item';
      if (entityType === 'objective') {
        const [objectives] = await db.execute('SELECT title FROM objectives WHERE id = ?', [entityId]);
        entityTitle = objectives[0]?.title || 'objective';
      }

      const [author] = await db.execute('SELECT name FROM users WHERE id = ?', [authorId]);
      const authorName = author[0]?.name || 'Someone';

      for (const mentionedUserId of mentions) {
        if (mentionedUserId !== authorId) { // Don't notify the author
          await this.createNotification(
            mentionedUserId,
            'comment_mention',
            'comment',
            commentId,
            {
              userName: authorName,
              entityTitle: entityTitle,
              actionUrl: `/goals/${entityType}s/${entityId}#comment-${commentId}`
            }
          );
        }
      }

      return mentions.length;
    } catch (error) {
      console.error('Notify comment mentions error:', error);
      throw error;
    }
  }

  // Clean up old notifications
  async cleanupOldNotifications(daysToKeep = 30) {
    try {
      const query = `
        DELETE FROM notifications
        WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
          AND is_read = TRUE
      `;

      const [result] = await db.execute(query, [daysToKeep]);
      return result.affectedRows;
    } catch (error) {
      console.error('Cleanup old notifications error:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();