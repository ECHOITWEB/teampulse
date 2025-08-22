const cron = require('node-cron');
const notificationService = require('./notificationService');

class NotificationScheduler {
  constructor() {
    this.isInitialized = false;
  }

  // Initialize all scheduled notification jobs
  init() {
    if (this.isInitialized) {
      console.log('Notification scheduler already initialized');
      return;
    }

    console.log('Initializing notification scheduler...');

    // Daily deadline reminders at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
      try {
        console.log('Running daily goal deadline reminders...');
        const count = await notificationService.sendGoalDeadlineReminders();
        console.log(`Sent ${count} goal deadline reminder notifications`);
      } catch (error) {
        console.error('Error sending goal deadline reminders:', error);
      }
    });

    // Weekly progress reminders on Mondays at 10:00 AM
    cron.schedule('0 10 * * 1', async () => {
      try {
        console.log('Running weekly goal progress reminders...');
        const count = await notificationService.sendGoalProgressReminders();
        console.log(`Sent ${count} goal progress reminder notifications`);
      } catch (error) {
        console.error('Error sending goal progress reminders:', error);
      }
    });

    // Daily at-risk goal alerts at 2:00 PM
    cron.schedule('0 14 * * *', async () => {
      try {
        console.log('Running daily at-risk goal alerts...');
        const count = await notificationService.sendGoalAtRiskAlerts();
        console.log(`Sent ${count} at-risk goal alert notifications`);
      } catch (error) {
        console.error('Error sending at-risk goal alerts:', error);
      }
    });

    // Weekly cleanup of old notifications on Sundays at 3:00 AM
    cron.schedule('0 3 * * 0', async () => {
      try {
        console.log('Running notification cleanup...');
        const count = await notificationService.cleanupOldNotifications(30);
        console.log(`Cleaned up ${count} old notifications`);
      } catch (error) {
        console.error('Error cleaning up notifications:', error);
      }
    });

    // Hourly task deadline reminders (legacy support)
    cron.schedule('0 * * * *', async () => {
      try {
        console.log('Running hourly task deadline reminders...');
        const count = await notificationService.sendDeadlineReminders();
        console.log(`Sent ${count} task deadline reminder notifications`);
      } catch (error) {
        console.error('Error sending task deadline reminders:', error);
      }
    });

    this.isInitialized = true;
    console.log('Notification scheduler initialized successfully');
  }

  // Manual trigger functions for testing
  async triggerGoalDeadlineReminders() {
    console.log('Manually triggering goal deadline reminders...');
    const count = await notificationService.sendGoalDeadlineReminders();
    console.log(`Sent ${count} goal deadline reminder notifications`);
    return count;
  }

  async triggerProgressReminders() {
    console.log('Manually triggering progress reminders...');
    const count = await notificationService.sendGoalProgressReminders();
    console.log(`Sent ${count} progress reminder notifications`);
    return count;
  }

  async triggerAtRiskAlerts() {
    console.log('Manually triggering at-risk goal alerts...');
    const count = await notificationService.sendGoalAtRiskAlerts();
    console.log(`Sent ${count} at-risk goal alert notifications`);
    return count;
  }

  async triggerCleanup() {
    console.log('Manually triggering notification cleanup...');
    const count = await notificationService.cleanupOldNotifications(30);
    console.log(`Cleaned up ${count} old notifications`);
    return count;
  }

  // Stop all cron jobs (for graceful shutdown)
  stop() {
    console.log('Stopping notification scheduler...');
    cron.getTasks().forEach(task => {
      task.destroy();
    });
    this.isInitialized = false;
    console.log('Notification scheduler stopped');
  }
}

module.exports = new NotificationScheduler();