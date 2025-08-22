class EmailTemplateService {
  // Get base email template structure
  getBaseTemplate(title, content, actionUrl = null, actionText = 'View Details') {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TeamPulse Notification</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background-color: #f6f9fc;
            color: #333;
            line-height: 1.6;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .content {
            padding: 40px 30px;
          }
          .content h2 {
            color: #2d3748;
            margin-top: 0;
            margin-bottom: 20px;
            font-size: 24px;
            font-weight: 600;
          }
          .content p {
            color: #4a5568;
            margin-bottom: 20px;
            font-size: 16px;
          }
          .action-button {
            display: inline-block;
            padding: 14px 28px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
            transition: transform 0.2s ease;
          }
          .action-button:hover {
            transform: translateY(-2px);
          }
          .info-box {
            background-color: #f7fafc;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
          }
          .footer {
            background-color: #f8f9fa;
            color: #6c757d;
            padding: 30px;
            text-align: center;
            font-size: 14px;
            border-top: 1px solid #e9ecef;
          }
          .footer a {
            color: #667eea;
            text-decoration: none;
          }
          .icon {
            font-size: 48px;
            margin-bottom: 20px;
          }
          @media (max-width: 600px) {
            .container {
              margin: 0 10px;
            }
            .header, .content, .footer {
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>TeamPulse</h1>
          </div>
          <div class="content">
            <h2>${title}</h2>
            ${content}
            ${actionUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${actionUrl}" class="action-button">${actionText}</a>
              </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>This is an automated notification from TeamPulse.</p>
            <p><a href="#unsubscribe">Manage your notification preferences</a> | <a href="#help">Need help?</a></p>
            <p>&copy; ${new Date().getFullYear()} TeamPulse. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Goal deadline approaching template
  getDeadlineApproachingTemplate(data) {
    const { goalTitle, daysRemaining, currentProgress, actionUrl } = data;
    const content = `
      <div class="icon">⏰</div>
      <p>Your goal <strong>"${goalTitle}"</strong> is approaching its deadline in <strong>${daysRemaining} days</strong>.</p>
      <div class="info-box">
        <p><strong>Current Progress:</strong> ${currentProgress}%</p>
        <p><strong>Days Remaining:</strong> ${daysRemaining}</p>
      </div>
      <p>Now is a great time to review your progress and ensure you're on track to meet your goal.</p>
    `;
    
    return this.getBaseTemplate(
      'Goal Deadline Approaching',
      content,
      actionUrl,
      'Review Goal'
    );
  }

  // Goal due today template
  getDeadlineTodayTemplate(data) {
    const { goalTitle, currentProgress, actionUrl } = data;
    const content = `
      <div class="icon">🚨</div>
      <p>Your goal <strong>"${goalTitle}"</strong> is <strong>due today</strong>!</p>
      <div class="info-box">
        <p><strong>Current Progress:</strong> ${currentProgress}%</p>
        <p><strong>Status:</strong> Due Today</p>
      </div>
      <p>This is your final reminder to complete this goal. Don't let your hard work go to waste!</p>
    `;
    
    return this.getBaseTemplate(
      'Goal Due Today',
      content,
      actionUrl,
      'Complete Goal'
    );
  }

  // Goal at risk template
  getGoalAtRiskTemplate(data) {
    const { goalTitle, currentProgress, daysRemaining, actionUrl } = data;
    const content = `
      <div class="icon">⚠️</div>
      <p>Your goal <strong>"${goalTitle}"</strong> appears to be <strong>at risk</strong> of not being completed on time.</p>
      <div class="info-box">
        <p><strong>Current Progress:</strong> ${currentProgress}%</p>
        <p><strong>Days Remaining:</strong> ${daysRemaining}</p>
        <p><strong>Risk Level:</strong> High</p>
      </div>
      <p>Consider reviewing your approach or breaking down the goal into smaller, more manageable tasks.</p>
    `;
    
    return this.getBaseTemplate(
      'Goal At Risk Alert',
      content,
      actionUrl,
      'Review & Update'
    );
  }

  // Progress reminder template
  getProgressReminderTemplate(data) {
    const { goalTitle, daysSinceUpdate, currentProgress, actionUrl } = data;
    const content = `
      <div class="icon">📊</div>
      <p>It's been <strong>${daysSinceUpdate} days</strong> since you last updated progress for <strong>"${goalTitle}"</strong>.</p>
      <div class="info-box">
        <p><strong>Current Progress:</strong> ${currentProgress}%</p>
        <p><strong>Last Updated:</strong> ${daysSinceUpdate} days ago</p>
      </div>
      <p>Regular progress updates help you stay on track and maintain momentum toward your goals.</p>
    `;
    
    return this.getBaseTemplate(
      'Progress Update Reminder',
      content,
      actionUrl,
      'Update Progress'
    );
  }

  // Comment mention template
  getCommentMentionTemplate(data) {
    const { userName, entityTitle, actionUrl } = data;
    const content = `
      <div class="icon">💬</div>
      <p><strong>${userName}</strong> mentioned you in a comment on <strong>"${entityTitle}"</strong>.</p>
      <div class="info-box">
        <p>You've been mentioned in a discussion that might require your attention or input.</p>
      </div>
      <p>Click below to view the comment and join the conversation.</p>
    `;
    
    return this.getBaseTemplate(
      'You were mentioned',
      content,
      actionUrl,
      'View Comment'
    );
  }

  // Goal status change template
  getGoalStatusChangeTemplate(data) {
    const { goalTitle, oldStatus, newStatus, actionUrl } = data;
    const statusEmoji = {
      'draft': '📝',
      'active': '🎯',
      'completed': '✅',
      'cancelled': '❌'
    };
    
    const content = `
      <div class="icon">${statusEmoji[newStatus] || '📊'}</div>
      <p>The status of your goal <strong>"${goalTitle}"</strong> has been changed.</p>
      <div class="info-box">
        <p><strong>Previous Status:</strong> ${oldStatus}</p>
        <p><strong>New Status:</strong> ${newStatus}</p>
      </div>
      <p>This status change may affect your goal timeline and related activities.</p>
    `;
    
    return this.getBaseTemplate(
      'Goal Status Updated',
      content,
      actionUrl,
      'View Goal'
    );
  }

  // Objective assignment template
  getObjectiveAssignmentTemplate(data) {
    const { objectiveTitle, actionUrl } = data;
    const content = `
      <div class="icon">🎯</div>
      <p>You have been assigned a new objective: <strong>"${objectiveTitle}"</strong>.</p>
      <div class="info-box">
        <p>This objective has been added to your goals dashboard. Review the details and start working toward achieving it.</p>
      </div>
      <p>Success in this objective will contribute to your overall performance and team goals.</p>
    `;
    
    return this.getBaseTemplate(
      'New Objective Assigned',
      content,
      actionUrl,
      'View Objective'
    );
  }

  // Key result update template
  getKeyResultUpdateTemplate(data) {
    const { keyResultTitle, progress, actionUrl } = data;
    const content = `
      <div class="icon">📈</div>
      <p>Progress has been updated for key result <strong>"${keyResultTitle}"</strong>.</p>
      <div class="info-box">
        <p><strong>Updated Progress:</strong> ${progress}%</p>
      </div>
      <p>This update affects the overall progress of your objective. Review the details to stay informed.</p>
    `;
    
    return this.getBaseTemplate(
      'Key Result Updated',
      content,
      actionUrl,
      'View Details'
    );
  }

  // Get template by notification type
  getTemplate(type, data) {
    switch (type) {
      case 'deadline_approaching':
        return this.getDeadlineApproachingTemplate(data);
      case 'deadline_today':
        return this.getDeadlineTodayTemplate(data);
      case 'goal_at_risk':
        return this.getGoalAtRiskTemplate(data);
      case 'goal_progress_reminder':
        return this.getProgressReminderTemplate(data);
      case 'comment_mention':
        return this.getCommentMentionTemplate(data);
      case 'goal_status_change':
        return this.getGoalStatusChangeTemplate(data);
      case 'objective_assigned':
        return this.getObjectiveAssignmentTemplate(data);
      case 'key_result_updated':
        return this.getKeyResultUpdateTemplate(data);
      default:
        // Fallback to basic template
        return this.getBaseTemplate(
          data.title || 'TeamPulse Notification',
          `<p>${data.message || 'You have a new notification from TeamPulse.'}</p>`,
          data.actionUrl
        );
    }
  }
}

module.exports = new EmailTemplateService();