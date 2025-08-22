# TeamPulse Notification System

A comprehensive notification system for the Goals feature in TeamPulse, supporting in-app, email, and push notifications with user preferences management.

## Overview

The notification system provides real-time and scheduled notifications for goal-related activities, including deadline reminders, progress updates, comments, and status changes.

## Features

### 📱 Notification Types
- **Deadline Approaching** (3 days before due date)
- **Deadline Today** (on due date)
- **Deadline Overdue** (after due date)
- **Progress Reminders** (weekly/monthly)
- **Goal At Risk Alerts** (when progress is behind schedule)
- **Goal Status Changes** (draft → active → completed)
- **Comment Mentions** (when mentioned in comments)
- **Comment Replies** (replies to your comments)
- **Objective Assignments** (when assigned new objectives)
- **Key Result Updates** (progress updates)

### 🔔 Delivery Methods
- **In-App Notifications** - Real-time notifications in the header bell icon
- **Email Notifications** - Rich HTML email templates
- **Push Notifications** - Browser/mobile push notifications (future)

### ⚙️ User Preferences
- Per-notification-type preferences (in-app, email, push)
- Digest frequency settings (immediately, hourly, daily, weekly, never)
- Granular control over each notification type

## Architecture

### Backend Components

#### 1. Database Schema
```sql
-- Notifications table
notifications (
  id, user_id, type, entity_type, entity_id,
  title, message, action_url, is_read, read_at,
  created_at, updated_at
)

-- Notification preferences table
notification_preferences (
  id, user_id, notification_type,
  in_app_enabled, email_enabled, push_enabled,
  digest_frequency, created_at, updated_at
)
```

#### 2. Services
- **`notificationService.js`** - Core notification management
- **`emailTemplates.js`** - Rich HTML email templates
- **`notificationScheduler.js`** - Cron job scheduler for periodic notifications

#### 3. API Routes (`/api/notifications`)
- `GET /` - Get user notifications (with filters)
- `GET /unread-count` - Get unread notification count
- `PUT /:id/read` - Mark notification as read
- `PUT /read-all` - Mark all notifications as read
- `DELETE /:id` - Delete notification
- `GET /preferences` - Get user notification preferences
- `PUT /preferences` - Update user notification preferences

#### 4. Scheduled Jobs
- **Daily 9:00 AM** - Goal deadline reminders
- **Monday 10:00 AM** - Weekly progress reminders
- **Daily 2:00 PM** - At-risk goal alerts
- **Sunday 3:00 AM** - Cleanup old notifications

### Frontend Components

#### 1. NotificationCenter
- Bell icon in header with unread count badge
- Dropdown showing recent notifications
- Mark as read/delete functionality
- Filter by all/unread notifications

#### 2. NotificationPreferences
- Modal for managing notification preferences
- Per-notification-type toggles for in-app/email/push
- Digest frequency selection
- Bulk enable/disable by category

## Usage

### Setting Up Notifications

1. **Database Migration**
   ```bash
   mysql -u root -p teampulse < backend/database/notifications_migration.sql
   ```

2. **Environment Variables**
   ```bash
   # Email configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM=noreply@teampulse.com
   ```

3. **Install Dependencies**
   ```bash
   cd backend
   npm install node-cron nodemailer
   ```

### Triggering Notifications

#### Automatic Triggers
Notifications are automatically sent when:
- Objectives are created/updated
- Key results are updated
- Comments mention users
- Status changes occur
- Scheduled jobs run (deadlines, reminders)

#### Manual Triggers (Development)
```bash
# Test deadline reminders
POST /api/notifications/test/deadline-reminders

# Test progress reminders  
POST /api/notifications/test/progress-reminders

# Test at-risk alerts
POST /api/notifications/test/at-risk-alerts

# Create test notification
POST /api/notifications/test/create
{
  "type": "goal_progress_reminder",
  "entityType": "objective",
  "entityId": 1,
  "data": {
    "goalTitle": "Test Goal",
    "daysSinceUpdate": 7,
    "currentProgress": 45
  }
}
```

### Frontend Integration

```typescript
// Add to Header component
import { NotificationCenter, NotificationPreferences } from './notifications';

// Usage
<NotificationCenter 
  onPreferencesClick={() => setIsNotificationPreferencesOpen(true)}
/>
<NotificationPreferences 
  isOpen={isNotificationPreferencesOpen}
  onClose={() => setIsNotificationPreferencesOpen(false)}
/>
```

## Email Templates

Rich HTML email templates are provided for each notification type:
- Responsive design for mobile/desktop
- TeamPulse branding
- Action buttons for direct navigation
- Professional styling with gradients and shadows

Template types:
- `deadline_approaching` - 3-day deadline warning
- `deadline_today` - Due today alert
- `goal_at_risk` - At-risk goal warning
- `goal_progress_reminder` - Progress update reminder
- `comment_mention` - Mention notification
- `goal_status_change` - Status change notification
- `objective_assigned` - New objective assignment
- `key_result_updated` - Key result progress update

## Real-time Updates

Socket.IO integration provides real-time notifications:
```javascript
// Real-time notification delivery
io.to(`user_${userId}`).emit('notification:new', notification);
```

## Security & Privacy

- User-based access control (users only see their own notifications)
- Opt-out mechanisms via preferences
- Data retention policies (30-day cleanup)
- Email unsubscribe links (planned)

## Testing

### Development Endpoints
When `NODE_ENV=development`, additional testing endpoints are available:
- `/api/notifications/test/*` - Manual trigger endpoints
- Test notification creation
- Manual scheduler triggers

### Testing Checklist
- [ ] In-app notifications appear in real-time
- [ ] Email notifications sent with proper templates
- [ ] Notification preferences save correctly
- [ ] Scheduled jobs run on time
- [ ] Unread count updates correctly
- [ ] Mark as read functionality works
- [ ] Delete notifications works
- [ ] Real-time updates via WebSocket

## Performance Considerations

- Database indexes on frequently queried columns
- Pagination for notification lists (50 per page)
- Automatic cleanup of old notifications
- Email rate limiting to prevent spam
- Efficient SQL queries with proper joins

## Future Enhancements

- [ ] Push notifications (browser/mobile)
- [ ] Notification digest emails
- [ ] Team-level notification preferences
- [ ] Notification analytics and metrics
- [ ] Advanced filtering and search
- [ ] Notification templates customization
- [ ] Integration with external services (Slack, Teams)
- [ ] A/B testing for notification effectiveness

## Troubleshooting

### Common Issues

1. **Notifications not sending**
   - Check SMTP configuration
   - Verify user preferences
   - Check server logs for errors

2. **Real-time notifications not working**
   - Verify WebSocket connection
   - Check browser console for errors
   - Ensure proper authentication

3. **Scheduled jobs not running**
   - Check server logs
   - Verify cron job initialization
   - Check database connectivity

4. **Email templates not loading**
   - Verify template files exist
   - Check template syntax
   - Review email service logs

### Debugging Commands

```bash
# Check notification service logs
tail -f backend/server.log | grep notification

# Test email configuration
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({...});
transporter.verify(console.log);
"

# Check database connectivity
mysql -u root -p teampulse -e "SELECT COUNT(*) FROM notifications;"
```

## API Documentation

### Notification Object Structure
```typescript
interface Notification {
  id: number;
  user_id: number;
  type: NotificationType;
  entity_type: 'objective' | 'key_result' | 'task' | 'comment' | 'goal_period';
  entity_id: number;
  title: string;
  message: string;
  action_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}
```

### Notification Preference Structure
```typescript
interface NotificationPreference {
  id: number;
  user_id: number;
  notification_type: NotificationType;
  in_app_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  digest_frequency: 'immediately' | 'hourly' | 'daily' | 'weekly' | 'never';
  created_at: string;
  updated_at: string;
}
```

This comprehensive notification system enhances user engagement and ensures important goal-related activities are never missed.