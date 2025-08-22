const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const auth = require('../middleware/auth');
const { param, query } = require('express-validator');

// All routes require authentication
router.use(auth);

// Get user notifications
router.get('/', async (req, res) => {
  try {
    const filters = {
      unreadOnly: req.query.unread === 'true',
      type: req.query.type,
      limit: parseInt(req.query.limit) || 50
    };

    const notifications = await notificationService.getUserNotifications(
      req.user.id,
      filters
    );

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Mark notification as read
router.put('/:id/read', 
  param('id').isInt(),
  async (req, res) => {
    try {
      const success = await notificationService.markAsRead(
        req.params.id,
        req.user.id
      );

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found'
        });
      }

      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Mark all notifications as read
router.put('/read-all', async (req, res) => {
  try {
    const count = await notificationService.markAllAsRead(req.user.id);

    res.json({
      success: true,
      message: `${count} notifications marked as read`
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get unread count
router.get('/unread-count', async (req, res) => {
  try {
    const notifications = await notificationService.getUserNotifications(
      req.user.id,
      { unreadOnly: true, limit: 100 }
    );

    res.json({
      success: true,
      data: {
        count: notifications.length
      }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user notification preferences
router.get('/preferences', async (req, res) => {
  try {
    const preferences = await notificationService.getAllUserPreferences(req.user.id);

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update user notification preferences
router.put('/preferences', async (req, res) => {
  try {
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Preferences object is required'
      });
    }

    const results = await notificationService.updateUserPreferences(
      req.user.id,
      preferences
    );

    res.json({
      success: true,
      data: results,
      message: 'Notification preferences updated successfully'
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete notification
router.delete('/:id', 
  param('id').isInt(),
  async (req, res) => {
    try {
      const query = `
        DELETE FROM notifications 
        WHERE id = ? AND user_id = ?
      `;

      const [result] = await require('../utils/database').execute(query, [
        req.params.id,
        req.user.id
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found'
        });
      }

      res.json({
        success: true,
        message: 'Notification deleted successfully'
      });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Development/Testing endpoints
if (process.env.NODE_ENV === 'development') {
  const notificationScheduler = require('../services/notificationScheduler');

  // Manual trigger for testing deadline reminders
  router.post('/test/deadline-reminders', async (req, res) => {
    try {
      const count = await notificationScheduler.triggerGoalDeadlineReminders();
      res.json({
        success: true,
        message: `Triggered ${count} deadline reminder notifications`
      });
    } catch (error) {
      console.error('Test deadline reminders error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Manual trigger for testing progress reminders
  router.post('/test/progress-reminders', async (req, res) => {
    try {
      const count = await notificationScheduler.triggerProgressReminders();
      res.json({
        success: true,
        message: `Triggered ${count} progress reminder notifications`
      });
    } catch (error) {
      console.error('Test progress reminders error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Manual trigger for testing at-risk alerts
  router.post('/test/at-risk-alerts', async (req, res) => {
    try {
      const count = await notificationScheduler.triggerAtRiskAlerts();
      res.json({
        success: true,
        message: `Triggered ${count} at-risk goal alert notifications`
      });
    } catch (error) {
      console.error('Test at-risk alerts error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Test notification creation
  router.post('/test/create', async (req, res) => {
    try {
      const { type, entityType, entityId, data } = req.body;
      
      const notification = await notificationService.createNotification(
        req.user.id,
        type || 'goal_progress_reminder',
        entityType || 'objective',
        entityId || 1,
        {
          goalTitle: 'Test Goal',
          daysSinceUpdate: 7,
          currentProgress: 45,
          actionUrl: '/goals/objectives/1',
          ...data
        }
      );

      res.json({
        success: true,
        data: notification,
        message: 'Test notification created successfully'
      });
    } catch (error) {
      console.error('Test create notification error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
}

module.exports = router;