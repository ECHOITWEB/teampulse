const db = require('../utils/database');

class MeetingReminderService {
  /**
   * Create reminders for a meeting
   */
  static async createReminders(meetingId, participantIds, reminderMinutesBefore = [15, 60]) {
    try {
      const [meeting] = await db.query(
        'SELECT scheduled_at FROM meetings WHERE id = ?',
        [meetingId]
      );

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      const reminders = [];
      const scheduledAt = new Date(meeting.scheduled_at);

      for (const userId of participantIds) {
        for (const minutesBefore of reminderMinutesBefore) {
          const reminderTime = new Date(scheduledAt.getTime() - minutesBefore * 60000);
          
          // Only create reminder if it's in the future
          if (reminderTime > new Date()) {
            reminders.push([
              meetingId,
              userId,
              reminderTime,
              'email' // default to email, can be extended
            ]);
          }
        }
      }

      if (reminders.length > 0) {
        await db.query(
          'INSERT INTO meeting_reminders (meeting_id, user_id, reminder_time, type) VALUES ?',
          [reminders]
        );
      }

      return {
        success: true,
        remindersCreated: reminders.length
      };
    } catch (error) {
      console.error('Error creating reminders:', error);
      throw error;
    }
  }

  /**
   * Get pending reminders that need to be sent
   */
  static async getPendingReminders() {
    try {
      const reminders = await db.query(
        `SELECT mr.*, m.title, m.scheduled_at, m.location, m.meeting_link,
                u.email, u.name
         FROM meeting_reminders mr
         JOIN meetings m ON mr.meeting_id = m.id
         JOIN users u ON mr.user_id = u.id
         WHERE mr.sent = FALSE 
           AND mr.reminder_time <= NOW()
           AND m.status = 'scheduled'
         ORDER BY mr.reminder_time ASC
         LIMIT 100`
      );

      return reminders;
    } catch (error) {
      console.error('Error getting pending reminders:', error);
      return [];
    }
  }

  /**
   * Mark reminders as sent
   */
  static async markRemindersSent(reminderIds) {
    if (reminderIds.length === 0) return;

    try {
      await db.query(
        'UPDATE meeting_reminders SET sent = TRUE WHERE id IN (?)',
        [reminderIds]
      );
      return true;
    } catch (error) {
      console.error('Error marking reminders as sent:', error);
      return false;
    }
  }

  /**
   * Send reminder notifications
   */
  static async sendReminders() {
    try {
      const pendingReminders = await this.getPendingReminders();
      
      if (pendingReminders.length === 0) {
        return { sent: 0 };
      }

      const sentReminderIds = [];

      for (const reminder of pendingReminders) {
        try {
          // Calculate time until meeting
          const minutesUntil = Math.round(
            (new Date(reminder.scheduled_at) - new Date()) / 60000
          );

          // Send based on reminder type
          switch (reminder.type) {
            case 'email':
              await this.sendEmailReminder(reminder, minutesUntil);
              break;
            case 'push':
              await this.sendPushReminder(reminder, minutesUntil);
              break;
            case 'sms':
              await this.sendSMSReminder(reminder, minutesUntil);
              break;
          }

          sentReminderIds.push(reminder.id);
        } catch (error) {
          console.error(`Failed to send reminder ${reminder.id}:`, error);
        }
      }

      // Mark sent reminders
      if (sentReminderIds.length > 0) {
        await this.markRemindersSent(sentReminderIds);
      }

      return {
        sent: sentReminderIds.length,
        failed: pendingReminders.length - sentReminderIds.length
      };
    } catch (error) {
      console.error('Error in sendReminders:', error);
      throw error;
    }
  }

  /**
   * Send email reminder
   */
  static async sendEmailReminder(reminder, minutesUntil) {
    // This would integrate with an email service
    console.log(`Sending email reminder to ${reminder.email}:`);
    console.log(`Meeting "${reminder.title}" starts in ${minutesUntil} minutes`);
    
    // Email implementation would go here
    // For example: await emailService.send({...})
  }

  /**
   * Send push notification reminder
   */
  static async sendPushReminder(reminder, minutesUntil) {
    // This would integrate with a push notification service
    console.log(`Sending push reminder to user ${reminder.user_id}`);
    
    // Push notification implementation would go here
  }

  /**
   * Send SMS reminder
   */
  static async sendSMSReminder(reminder, minutesUntil) {
    // This would integrate with an SMS service
    console.log(`Sending SMS reminder for meeting ${reminder.meeting_id}`);
    
    // SMS implementation would go here
  }

  /**
   * Update user reminder preferences
   */
  static async updateReminderPreferences(userId, preferences) {
    try {
      const { types, minutesBefore } = preferences;
      
      // Store preferences (would need a user_preferences table)
      // For now, just return success
      return {
        success: true,
        preferences: {
          types: types || ['email'],
          minutesBefore: minutesBefore || [15, 60]
        }
      };
    } catch (error) {
      console.error('Error updating reminder preferences:', error);
      throw error;
    }
  }

  /**
   * Cancel reminders for a meeting
   */
  static async cancelMeetingReminders(meetingId) {
    try {
      const result = await db.query(
        'DELETE FROM meeting_reminders WHERE meeting_id = ? AND sent = FALSE',
        [meetingId]
      );

      return {
        success: true,
        cancelledCount: result.affectedRows
      };
    } catch (error) {
      console.error('Error cancelling reminders:', error);
      throw error;
    }
  }
}

// Function to run reminder service periodically
const startReminderService = (intervalMinutes = 1) => {
  console.log('Starting meeting reminder service...');
  
  // Run immediately
  MeetingReminderService.sendReminders()
    .then(result => console.log('Reminder service run:', result))
    .catch(error => console.error('Reminder service error:', error));

  // Then run periodically
  setInterval(async () => {
    try {
      const result = await MeetingReminderService.sendReminders();
      if (result.sent > 0) {
        console.log(`Sent ${result.sent} meeting reminders`);
      }
    } catch (error) {
      console.error('Reminder service error:', error);
    }
  }, intervalMinutes * 60 * 1000);
};

module.exports = {
  MeetingReminderService,
  startReminderService
};