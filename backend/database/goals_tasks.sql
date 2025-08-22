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