-- Basic workspace tables without dependencies on missing tables

-- Workspaces table (like Slack workspaces)
CREATE TABLE IF NOT EXISTS workspaces (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    owner_id INT NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    subscription_tier ENUM('free', 'basic', 'pro', 'enterprise') DEFAULT 'free',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id),
    INDEX idx_slug (slug),
    INDEX idx_owner (owner_id)
);

-- Workspace members (users in a workspace)
CREATE TABLE IF NOT EXISTS workspace_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    workspace_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('owner', 'admin', 'member', 'guest') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_workspace_member (workspace_id, user_id),
    INDEX idx_workspace (workspace_id),
    INDEX idx_user (user_id)
);

-- Workspace invitations
CREATE TABLE IF NOT EXISTS workspace_invitations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    workspace_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    role ENUM('admin', 'member', 'guest') DEFAULT 'member',
    invited_by INT NOT NULL,
    invitation_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id),
    INDEX idx_token (invitation_token),
    INDEX idx_email (email)
);

-- Workspace billing information
CREATE TABLE IF NOT EXISTS workspace_billing (
    id INT PRIMARY KEY AUTO_INCREMENT,
    workspace_id INT NOT NULL UNIQUE,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    payment_method_last4 VARCHAR(4),
    payment_method_brand VARCHAR(50),
    billing_email VARCHAR(255),
    billing_cycle ENUM('monthly', 'yearly') DEFAULT 'monthly',
    next_billing_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    INDEX idx_stripe_customer (stripe_customer_id)
);

-- Enhanced users table with Firebase integration
DELIMITER $$
CREATE PROCEDURE IF NOT EXISTS add_user_columns()
BEGIN
    -- Add firebase_uid column
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'teampulse' 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'firebase_uid'
    ) THEN
        ALTER TABLE users ADD COLUMN firebase_uid VARCHAR(128) UNIQUE;
    END IF;
    
    -- Add avatar_url column
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'teampulse' 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'avatar_url'
    ) THEN
        ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);
    END IF;
    
    -- Add phone column
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'teampulse' 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'phone'
    ) THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(20);
    END IF;
    
    -- Add timezone column
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'teampulse' 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'timezone'
    ) THEN
        ALTER TABLE users ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';
    END IF;
    
    -- Add locale column
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'teampulse' 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'locale'
    ) THEN
        ALTER TABLE users ADD COLUMN locale VARCHAR(10) DEFAULT 'en';
    END IF;
    
    -- Add last_login_at column
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'teampulse' 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'last_login_at'
    ) THEN
        ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP NULL;
    END IF;
    
    -- Add is_email_verified column
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'teampulse' 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'is_email_verified'
    ) THEN
        ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add index for firebase_uid
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = 'teampulse'
        AND TABLE_NAME = 'users'
        AND INDEX_NAME = 'idx_firebase_uid'
    ) THEN
        ALTER TABLE users ADD INDEX idx_firebase_uid (firebase_uid);
    END IF;
END$$

DELIMITER ;

CALL add_user_columns();
DROP PROCEDURE IF EXISTS add_user_columns;

-- Workspace channels (like Slack channels)
CREATE TABLE IF NOT EXISTS workspace_channels (
    id INT PRIMARY KEY AUTO_INCREMENT,
    workspace_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_private BOOLEAN DEFAULT FALSE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE KEY unique_channel_name (workspace_id, name),
    INDEX idx_workspace (workspace_id)
);

-- Channel members
CREATE TABLE IF NOT EXISTS channel_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    channel_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES workspace_channels(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_channel_member (channel_id, user_id),
    INDEX idx_channel (channel_id),
    INDEX idx_user (user_id)
);

-- Payment history
CREATE TABLE IF NOT EXISTS payment_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    workspace_id INT NOT NULL,
    stripe_payment_intent_id VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status ENUM('succeeded', 'failed', 'pending', 'refunded') NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    INDEX idx_workspace (workspace_id),
    INDEX idx_status (status)
);

-- Workspace settings
CREATE TABLE IF NOT EXISTS workspace_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    workspace_id INT NOT NULL UNIQUE,
    allow_guest_access BOOLEAN DEFAULT FALSE,
    require_2fa BOOLEAN DEFAULT FALSE,
    default_timezone VARCHAR(50) DEFAULT 'UTC',
    week_starts_on ENUM('sunday', 'monday') DEFAULT 'monday',
    date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
    time_format ENUM('12h', '24h') DEFAULT '12h',
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- Workspace audit log
CREATE TABLE IF NOT EXISTS workspace_audit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    workspace_id INT NOT NULL,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    old_value JSON,
    new_value JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_workspace_user (workspace_id, user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
);

-- Add workspace_id to existing tables
DELIMITER $$
CREATE PROCEDURE IF NOT EXISTS add_workspace_columns()
BEGIN
    -- Add workspace_id to objectives table
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'teampulse' 
        AND TABLE_NAME = 'objectives' 
        AND COLUMN_NAME = 'workspace_id'
    ) THEN
        ALTER TABLE objectives ADD COLUMN workspace_id INT;
        ALTER TABLE objectives ADD FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
    END IF;
    
    -- Add index for objectives.workspace_id
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = 'teampulse'
        AND TABLE_NAME = 'objectives'
        AND INDEX_NAME = 'idx_workspace'
    ) THEN
        ALTER TABLE objectives ADD INDEX idx_workspace (workspace_id);
    END IF;
    
    -- Add workspace_id to tasks table
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'teampulse' 
        AND TABLE_NAME = 'tasks' 
        AND COLUMN_NAME = 'workspace_id'
    ) THEN
        ALTER TABLE tasks ADD COLUMN workspace_id INT;
        ALTER TABLE tasks ADD FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
    END IF;
    
    -- Add index for tasks.workspace_id
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = 'teampulse'
        AND TABLE_NAME = 'tasks'
        AND INDEX_NAME = 'idx_workspace'
    ) THEN
        ALTER TABLE tasks ADD INDEX idx_workspace (workspace_id);
    END IF;
    
    -- Add workspace_id to chat_sessions table
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'teampulse' 
        AND TABLE_NAME = 'chat_sessions' 
        AND COLUMN_NAME = 'workspace_id'
    ) THEN
        ALTER TABLE chat_sessions ADD COLUMN workspace_id INT;
        ALTER TABLE chat_sessions ADD FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
    END IF;
    
    -- Add index for chat_sessions.workspace_id
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = 'teampulse'
        AND TABLE_NAME = 'chat_sessions'
        AND INDEX_NAME = 'idx_workspace'
    ) THEN
        ALTER TABLE chat_sessions ADD INDEX idx_workspace (workspace_id);
    END IF;
END$$

DELIMITER ;

CALL add_workspace_columns();
DROP PROCEDURE IF EXISTS add_workspace_columns;

-- Create workspace summary view
CREATE OR REPLACE VIEW workspace_summary AS
SELECT 
    w.id,
    w.name,
    w.slug,
    w.owner_id,
    u.full_name as owner_name,
    w.subscription_tier,
    COUNT(DISTINCT wm.user_id) as member_count,
    COUNT(DISTINCT o.id) as total_objectives,
    COUNT(DISTINCT t.id) as total_tasks,
    0 as total_meetings, -- meetings table not implemented yet
    w.created_at,
    w.updated_at
FROM workspaces w
LEFT JOIN users u ON w.owner_id = u.id
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.is_active = TRUE
LEFT JOIN objectives o ON w.id = o.workspace_id
LEFT JOIN tasks t ON w.id = t.workspace_id
GROUP BY w.id;