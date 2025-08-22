-- TeamPulse Database Schema

CREATE DATABASE IF NOT EXISTS teampulse;
USE teampulse;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);

-- Chat sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    tool_type VARCHAR(50) NOT NULL,
    session_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_tool (user_id, tool_type),
    INDEX idx_created_at (created_at)
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    role ENUM('user', 'assistant', 'system') NOT NULL,
    content TEXT NOT NULL,
    file_info JSON,
    tokens_used INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
    INDEX idx_session_created (session_id, created_at)
);

-- Document analysis history
CREATE TABLE IF NOT EXISTS document_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    session_id INT,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    file_size BIGINT,
    analysis_type VARCHAR(50),
    result_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE SET NULL,
    INDEX idx_user_created (user_id, created_at)
);

-- Presentation plans table
CREATE TABLE IF NOT EXISTS presentation_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    session_id INT,
    title VARCHAR(255),
    business_content TEXT,
    presentation_data JSON,
    slides_count INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE SET NULL,
    INDEX idx_user_created (user_id, created_at)
);

-- API usage tracking
CREATE TABLE IF NOT EXISTS api_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    api_type VARCHAR(50),
    tokens_used INT,
    cost_estimate DECIMAL(10, 6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, created_at)
);

-- Meetings table
CREATE TABLE IF NOT EXISTS meetings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_at DATETIME NOT NULL,
    duration_minutes INT DEFAULT 60,
    location VARCHAR(255),
    meeting_link VARCHAR(500),
    status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
    organizer_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_scheduled_at (scheduled_at),
    INDEX idx_organizer_status (organizer_id, status)
);

-- Meeting participants table
CREATE TABLE IF NOT EXISTS meeting_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meeting_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('organizer', 'participant', 'optional') DEFAULT 'participant',
    attendance_status ENUM('pending', 'accepted', 'declined', 'tentative') DEFAULT 'pending',
    attended BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_meeting_user (meeting_id, user_id),
    INDEX idx_user_meetings (user_id, meeting_id)
);

-- Meeting notes table
CREATE TABLE IF NOT EXISTS meeting_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meeting_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    type ENUM('note', 'action_item', 'decision', 'highlight') DEFAULT 'note',
    parent_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES meeting_notes(id) ON DELETE CASCADE,
    INDEX idx_meeting_notes (meeting_id, created_at),
    INDEX idx_user_notes (user_id, meeting_id)
);

-- Meeting tasks table (integration with task management)
CREATE TABLE IF NOT EXISTS meeting_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meeting_id INT NOT NULL,
    note_id INT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assignee_id INT,
    due_date DATE,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (note_id) REFERENCES meeting_notes(id) ON DELETE SET NULL,
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_assignee_status (assignee_id, status),
    INDEX idx_meeting_tasks (meeting_id, status)
);

-- Meeting attachments table
CREATE TABLE IF NOT EXISTS meeting_attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meeting_id INT NOT NULL,
    uploaded_by INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    file_size BIGINT,
    file_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_meeting_attachments (meeting_id)
);

-- Calendar integrations table
CREATE TABLE IF NOT EXISTS calendar_integrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    provider ENUM('google', 'outlook', 'apple') NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    calendar_id VARCHAR(255),
    sync_enabled BOOLEAN DEFAULT TRUE,
    last_synced_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_provider (user_id, provider)
);

-- Meeting reminders table
CREATE TABLE IF NOT EXISTS meeting_reminders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meeting_id INT NOT NULL,
    user_id INT NOT NULL,
    reminder_time DATETIME NOT NULL,
    type ENUM('email', 'push', 'sms') DEFAULT 'email',
    sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_reminder_time (reminder_time, sent)
);

-- Create default user for development
INSERT INTO users (email, name) VALUES ('demo@teampulse.com', 'Demo User') ON DUPLICATE KEY UPDATE name=name;

-- Goals and Tasks Management Schema
-- Goals and Tasks Management Schema for TeamPulse

-- Goal Periods (Quarterly planning)
CREATE TABLE IF NOT EXISTS goal_periods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year INT NOT NULL,
    quarter INT NOT NULL CHECK (quarter BETWEEN 1 AND 4),
    name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_year_quarter (year, quarter)
);

-- Objectives (OKR Framework)
CREATE TABLE IF NOT EXISTS objectives (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    owner_id INT NOT NULL,
    team_id INT,
    parent_objective_id INT,
    goal_period_id INT NOT NULL,
    status ENUM('draft', 'active', 'completed', 'cancelled') DEFAULT 'draft',
    progress DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id),
    FOREIGN KEY (team_id) REFERENCES departments(id),
    FOREIGN KEY (parent_objective_id) REFERENCES objectives(id),
    FOREIGN KEY (goal_period_id) REFERENCES goal_periods(id),
    INDEX idx_owner (owner_id),
    INDEX idx_team (team_id),
    INDEX idx_period (goal_period_id),
    INDEX idx_status (status)
);

-- Key Results
CREATE TABLE IF NOT EXISTS key_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    objective_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    owner_id INT NOT NULL,
    target_value DECIMAL(10,2) NOT NULL,
    current_value DECIMAL(10,2) DEFAULT 0.00,
    unit VARCHAR(50),
    progress DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN target_value = 0 THEN 0
            ELSE LEAST(100, (current_value / target_value) * 100)
        END
    ) STORED,
    status ENUM('not_started', 'on_track', 'at_risk', 'behind', 'completed') DEFAULT 'not_started',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (objective_id) REFERENCES objectives(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id),
    INDEX idx_objective (objective_id),
    INDEX idx_owner (owner_id)
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status ENUM('todo', 'in_progress', 'in_review', 'done', 'cancelled') DEFAULT 'todo',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    assignee_id INT,
    team_id INT,
    due_date DATE,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (assignee_id) REFERENCES users(id),
    FOREIGN KEY (team_id) REFERENCES departments(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_assignee (assignee_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_due_date (due_date)
);

-- Link tasks to key results
CREATE TABLE IF NOT EXISTS key_result_tasks (
    key_result_id INT NOT NULL,
    task_id INT NOT NULL,
    PRIMARY KEY (key_result_id, task_id),
    FOREIGN KEY (key_result_id) REFERENCES key_results(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Task Dependencies
CREATE TABLE IF NOT EXISTS task_dependencies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    depends_on_task_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    UNIQUE KEY unique_dependency (task_id, depends_on_task_id),
    CHECK (task_id != depends_on_task_id)
);

-- Task Comments
CREATE TABLE IF NOT EXISTS task_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    user_id INT NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_task (task_id)
);

-- Task Attachments
CREATE TABLE IF NOT EXISTS task_attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INT NOT NULL,
    file_type VARCHAR(100),
    file_url TEXT NOT NULL,
    uploaded_by INT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    INDEX idx_task (task_id)
);

-- Task Labels
CREATE TABLE IF NOT EXISTS task_labels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#666666',
    team_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES departments(id),
    UNIQUE KEY unique_label_team (name, team_id)
);

-- Task Label Assignments
CREATE TABLE IF NOT EXISTS task_label_assignments (
    task_id INT NOT NULL,
    label_id INT NOT NULL,
    PRIMARY KEY (task_id, label_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES task_labels(id) ON DELETE CASCADE
);

-- Progress History for Key Results
CREATE TABLE IF NOT EXISTS key_result_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    key_result_id INT NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    note TEXT,
    recorded_by INT NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (key_result_id) REFERENCES key_results(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id),
    INDEX idx_key_result (key_result_id),
    INDEX idx_recorded_at (recorded_at)
);

-- Insert default goal periods for 2025
INSERT INTO goal_periods (year, quarter, name, start_date, end_date, is_active) VALUES
(2025, 1, '2025 Q1', '2025-01-01', '2025-03-31', TRUE),
(2025, 2, '2025 Q2', '2025-04-01', '2025-06-30', FALSE),
(2025, 3, '2025 Q3', '2025-07-01', '2025-09-30', FALSE),
(2025, 4, '2025 Q4', '2025-10-01', '2025-12-31', FALSE);

-- Insert default task labels
INSERT INTO task_labels (name, color) VALUES
('버그', '#FF0000'),
('기능', '#00FF00'),
('개선', '#0080FF'),
('문서', '#FFA500'),
('긴급', '#FF00FF');

-- Objective Comments table for collaboration
CREATE TABLE IF NOT EXISTS objective_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    objective_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    parent_comment_id INT DEFAULT NULL,
    mentions JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (objective_id) REFERENCES objectives(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_comment_id) REFERENCES objective_comments(id) ON DELETE CASCADE,
    INDEX idx_objective_comments (objective_id, created_at),
    INDEX idx_user_comments (user_id, created_at),
    INDEX idx_parent_comments (parent_comment_id)
);

-- Create a view for objective progress
CREATE OR REPLACE VIEW objective_progress_view AS
SELECT 
    o.id,
    o.title,
    o.status,
    o.owner_id,
    o.team_id,
    o.goal_period_id,
    COALESCE(AVG(kr.progress), 0) as calculated_progress,
    COUNT(kr.id) as key_result_count
FROM objectives o
LEFT JOIN key_results kr ON o.id = kr.objective_id
GROUP BY o.id;

-- Trigger to update objective progress when key results change
DELIMITER $$
CREATE TRIGGER update_objective_progress_after_kr_update
AFTER UPDATE ON key_results
FOR EACH ROW
BEGIN
    UPDATE objectives o
    SET o.progress = (
        SELECT COALESCE(AVG(kr.progress), 0)
        FROM key_results kr
        WHERE kr.objective_id = NEW.objective_id
    )
    WHERE o.id = NEW.objective_id;
END$$
DELIMITER ;

-- Notifications table for comprehensive notification system
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

-- Notification preferences table
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
INSERT INTO notification_preferences (user_id, notification_type, in_app_enabled, email_enabled)
SELECT u.id, 'deadline_approaching', TRUE, TRUE FROM users u
ON DUPLICATE KEY UPDATE in_app_enabled = in_app_enabled;

INSERT INTO notification_preferences (user_id, notification_type, in_app_enabled, email_enabled)
SELECT u.id, 'deadline_today', TRUE, TRUE FROM users u
ON DUPLICATE KEY UPDATE in_app_enabled = in_app_enabled;

INSERT INTO notification_preferences (user_id, notification_type, in_app_enabled, email_enabled)
SELECT u.id, 'goal_progress_reminder', TRUE, FALSE FROM users u
ON DUPLICATE KEY UPDATE in_app_enabled = in_app_enabled;

INSERT INTO notification_preferences (user_id, notification_type, in_app_enabled, email_enabled)
SELECT u.id, 'goal_at_risk', TRUE, TRUE FROM users u
ON DUPLICATE KEY UPDATE in_app_enabled = in_app_enabled;

INSERT INTO notification_preferences (user_id, notification_type, in_app_enabled, email_enabled)
SELECT u.id, 'comment_mention', TRUE, TRUE FROM users u
ON DUPLICATE KEY UPDATE in_app_enabled = in_app_enabled;

INSERT INTO notification_preferences (user_id, notification_type, in_app_enabled, email_enabled)
SELECT u.id, 'goal_status_change', TRUE, FALSE FROM users u
ON DUPLICATE KEY UPDATE in_app_enabled = in_app_enabled;