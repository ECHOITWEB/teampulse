-- Notifications table migration
-- Run this migration after the main init.sql schema

USE teampulse;

-- Add notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM(
        'deadline_approaching', 'deadline_today', 'deadline_overdue',
        'goal_progress_reminder', 'goal_at_risk', 'goal_status_change',
        'comment_mention', 'comment_reply', 'task_assigned', 'task_completed',
        'objective_assigned', 'objective_completed', 'key_result_updated'
    ) NOT NULL,
    entity_type ENUM('objective', 'key_result', 'task', 'comment', 'goal_period') NOT NULL,
    entity_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_read (user_id, is_read),
    INDEX idx_user_created (user_id, created_at),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_type_created (type, created_at)
);

-- Add notification preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS notification_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    notification_type ENUM(
        'deadline_approaching', 'deadline_today', 'deadline_overdue',
        'goal_progress_reminder', 'goal_at_risk', 'goal_status_change',
        'comment_mention', 'comment_reply', 'task_assigned', 'task_completed',
        'objective_assigned', 'objective_completed', 'key_result_updated'
    ) NOT NULL,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT FALSE,
    digest_frequency ENUM('immediately', 'hourly', 'daily', 'weekly', 'never') DEFAULT 'immediately',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_type (user_id, notification_type)
);

-- Insert default notification preferences for existing users
-- This will only insert if the user doesn't already have preferences for these types
INSERT IGNORE INTO notification_preferences (user_id, notification_type, in_app_enabled, email_enabled)
SELECT u.id, 'deadline_approaching', TRUE, TRUE FROM users u;

INSERT IGNORE INTO notification_preferences (user_id, notification_type, in_app_enabled, email_enabled)
SELECT u.id, 'deadline_today', TRUE, TRUE FROM users u;

INSERT IGNORE INTO notification_preferences (user_id, notification_type, in_app_enabled, email_enabled)
SELECT u.id, 'goal_progress_reminder', TRUE, FALSE FROM users u;

INSERT IGNORE INTO notification_preferences (user_id, notification_type, in_app_enabled, email_enabled)
SELECT u.id, 'goal_at_risk', TRUE, TRUE FROM users u;

INSERT IGNORE INTO notification_preferences (user_id, notification_type, in_app_enabled, email_enabled)
SELECT u.id, 'comment_mention', TRUE, TRUE FROM users u;

INSERT IGNORE INTO notification_preferences (user_id, notification_type, in_app_enabled, email_enabled)
SELECT u.id, 'goal_status_change', TRUE, FALSE FROM users u;

INSERT IGNORE INTO notification_preferences (user_id, notification_type, in_app_enabled, email_enabled)
SELECT u.id, 'objective_assigned', TRUE, TRUE FROM users u;

INSERT IGNORE INTO notification_preferences (user_id, notification_type, in_app_enabled, email_enabled)
SELECT u.id, 'objective_completed', TRUE, FALSE FROM users u;

INSERT IGNORE INTO notification_preferences (user_id, notification_type, in_app_enabled, email_enabled)
SELECT u.id, 'key_result_updated', TRUE, FALSE FROM users u;

INSERT IGNORE INTO notification_preferences (user_id, notification_type, in_app_enabled, email_enabled)
SELECT u.id, 'comment_reply', TRUE, TRUE FROM users u;

-- Add some sample notifications for testing (optional)
-- These will help test the notification system
INSERT IGNORE INTO notifications (user_id, type, entity_type, entity_id, title, message, action_url)
SELECT 
    u.id,
    'goal_progress_reminder',
    'objective',
    1,
    'Progress Update Reminder',
    'Please update progress for your goals - it has been 7 days since your last update',
    '/goals/objectives/1'
FROM users u 
LIMIT 1;

SELECT 'Notification system tables created and initialized successfully!' as status;