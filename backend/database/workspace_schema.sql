-- Workspace/Project Management Schema for TeamPulse
-- This implements a Slack-like workspace model with Firebase authentication

USE teampulse;

-- Workspaces/Projects table (similar to Slack workspaces)
CREATE TABLE IF NOT EXISTS workspaces (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),
    owner_id INT NOT NULL,
    subscription_status ENUM('trial', 'active', 'suspended', 'cancelled') DEFAULT 'trial',
    subscription_plan ENUM('free', 'starter', 'professional', 'enterprise') DEFAULT 'free',
    trial_ends_at TIMESTAMP NULL,
    max_members INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id),
    INDEX idx_slug (slug),
    INDEX idx_owner (owner_id)
);

-- Workspace members with roles
CREATE TABLE IF NOT EXISTS workspace_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    workspace_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('owner', 'admin', 'member', 'guest') DEFAULT 'member',
    status ENUM('active', 'invited', 'deactivated') DEFAULT 'invited',
    invited_by INT,
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    joined_at TIMESTAMP NULL,
    last_active_at TIMESTAMP NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id),
    UNIQUE KEY unique_workspace_user (workspace_id, user_id),
    INDEX idx_workspace_status (workspace_id, status),
    INDEX idx_user_workspaces (user_id, status)
);

-- Workspace invitations (for email invites)
CREATE TABLE IF NOT EXISTS workspace_invitations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    workspace_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    role ENUM('admin', 'member', 'guest') DEFAULT 'member',
    token VARCHAR(255) UNIQUE NOT NULL,
    invited_by INT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id),
    INDEX idx_token (token),
    INDEX idx_email (email),
    INDEX idx_workspace (workspace_id)
);

-- Enhanced users table with Firebase integration
-- Using stored procedure to check column existence
DELIMITER $$
CREATE PROCEDURE IF NOT EXISTS add_user_columns()
BEGIN
    -- Check and add firebase_uid
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'teampulse' 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'firebase_uid'
    ) THEN
        ALTER TABLE users ADD COLUMN firebase_uid VARCHAR(128) UNIQUE;
    END IF;
    
    -- Check and add avatar_url
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'teampulse' 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'avatar_url'
    ) THEN
        ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);
    END IF;
    
    -- Check and add phone
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'teampulse' 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'phone'
    ) THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(20);
    END IF;
    
    -- Check and add timezone
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'teampulse' 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'timezone'
    ) THEN
        ALTER TABLE users ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';
    END IF;
    
    -- Check and add locale
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'teampulse' 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'locale'
    ) THEN
        ALTER TABLE users ADD COLUMN locale VARCHAR(10) DEFAULT 'en';
    END IF;
    
    -- Check and add last_login_at
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'teampulse' 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'last_login_at'
    ) THEN
        ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP NULL;
    END IF;
    
    -- Check and add is_email_verified
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'teampulse' 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'is_email_verified'
    ) THEN
        ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Check and add index on firebase_uid
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
    is_archived BOOLEAN DEFAULT FALSE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE KEY unique_workspace_channel (workspace_id, name),
    INDEX idx_workspace (workspace_id),
    INDEX idx_name (name)
);

-- Channel members
CREATE TABLE IF NOT EXISTS channel_members (
    channel_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP NULL,
    notification_preference ENUM('all', 'mentions', 'none') DEFAULT 'all',
    PRIMARY KEY (channel_id, user_id),
    FOREIGN KEY (channel_id) REFERENCES workspace_channels(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Billing/Payment information
CREATE TABLE IF NOT EXISTS workspace_billing (
    id INT PRIMARY KEY AUTO_INCREMENT,
    workspace_id INT NOT NULL,
    stripe_customer_id VARCHAR(255) UNIQUE,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    payment_method_id VARCHAR(255),
    card_last4 VARCHAR(4),
    card_brand VARCHAR(50),
    billing_email VARCHAR(255),
    billing_name VARCHAR(255),
    billing_address TEXT,
    next_billing_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    UNIQUE KEY unique_workspace (workspace_id),
    INDEX idx_stripe_customer (stripe_customer_id)
);

-- Payment history
CREATE TABLE IF NOT EXISTS payment_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    workspace_id INT NOT NULL,
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status ENUM('pending', 'succeeded', 'failed', 'refunded') NOT NULL,
    description TEXT,
    invoice_url VARCHAR(500),
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    INDEX idx_workspace (workspace_id),
    INDEX idx_status (status)
);

-- Workspace settings
CREATE TABLE IF NOT EXISTS workspace_settings (
    workspace_id INT PRIMARY KEY,
    allow_guest_access BOOLEAN DEFAULT TRUE,
    require_2fa BOOLEAN DEFAULT FALSE,
    default_channel_id INT,
    allowed_email_domains TEXT, -- JSON array of domains
    sso_enabled BOOLEAN DEFAULT FALSE,
    sso_provider VARCHAR(50),
    sso_config JSON,
    features JSON, -- JSON object of enabled features
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (default_channel_id) REFERENCES workspace_channels(id) ON DELETE SET NULL
);

-- Audit log for workspace activities
CREATE TABLE IF NOT EXISTS workspace_audit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    workspace_id INT NOT NULL,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INT,
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_workspace_created (workspace_id, created_at),
    INDEX idx_user (user_id),
    INDEX idx_action (action)
);

-- Update existing tables to support workspace context
-- Using stored procedures to check column existence
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
    
    -- Add workspace_id to meetings table (if table exists)
    IF EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = 'teampulse' 
        AND TABLE_NAME = 'meetings'
    ) THEN
        IF NOT EXISTS (
            SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'teampulse' 
            AND TABLE_NAME = 'meetings' 
            AND COLUMN_NAME = 'workspace_id'
        ) THEN
            ALTER TABLE meetings ADD COLUMN workspace_id INT;
            ALTER TABLE meetings ADD FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
        END IF;
        
        -- Add index for meetings.workspace_id
        IF NOT EXISTS (
            SELECT * FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = 'teampulse'
            AND TABLE_NAME = 'meetings'
            AND INDEX_NAME = 'idx_workspace'
        ) THEN
            ALTER TABLE meetings ADD INDEX idx_workspace (workspace_id);
        END IF;
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

-- Create default channels when workspace is created
DELIMITER $$
CREATE TRIGGER create_default_channels
AFTER INSERT ON workspaces
FOR EACH ROW
BEGIN
    -- Create general channel
    INSERT INTO workspace_channels (workspace_id, name, description, is_private, created_by)
    VALUES (NEW.id, 'general', 'General discussion', FALSE, NEW.owner_id);
    
    -- Add owner to general channel
    INSERT INTO channel_members (channel_id, user_id)
    SELECT LAST_INSERT_ID(), NEW.owner_id;
    
    -- Update workspace settings with default channel
    INSERT INTO workspace_settings (workspace_id, default_channel_id)
    VALUES (NEW.id, LAST_INSERT_ID());
END$$
DELIMITER ;

-- Create workspace member entry when owner creates workspace
DELIMITER $$
CREATE TRIGGER add_owner_as_member
AFTER INSERT ON workspaces
FOR EACH ROW
BEGIN
    INSERT INTO workspace_members (workspace_id, user_id, role, status, joined_at)
    VALUES (NEW.id, NEW.owner_id, 'owner', 'active', NOW());
END$$
DELIMITER ;

-- Function to generate unique workspace slug
DELIMITER $$
CREATE FUNCTION generate_workspace_slug(workspace_name VARCHAR(100))
RETURNS VARCHAR(100)
DETERMINISTIC
BEGIN
    DECLARE base_slug VARCHAR(100);
    DECLARE final_slug VARCHAR(100);
    DECLARE counter INT DEFAULT 1;
    
    -- Generate base slug from name
    SET base_slug = LOWER(REPLACE(TRIM(workspace_name), ' ', '-'));
    SET base_slug = REGEXP_REPLACE(base_slug, '[^a-z0-9-]', '');
    SET final_slug = base_slug;
    
    -- Check if slug exists and append number if needed
    WHILE EXISTS (SELECT 1 FROM workspaces WHERE slug = final_slug) DO
        SET final_slug = CONCAT(base_slug, '-', counter);
        SET counter = counter + 1;
    END WHILE;
    
    RETURN final_slug;
END$$
DELIMITER ;

-- View for workspace member details
CREATE OR REPLACE VIEW workspace_member_details AS
SELECT 
    wm.id,
    wm.workspace_id,
    w.name as workspace_name,
    w.slug as workspace_slug,
    wm.user_id,
    u.email,
    u.name as user_name,
    u.avatar_url,
    wm.role,
    wm.status,
    wm.joined_at,
    wm.last_active_at,
    iu.name as invited_by_name
FROM workspace_members wm
JOIN workspaces w ON wm.workspace_id = w.id
JOIN users u ON wm.user_id = u.id
LEFT JOIN users iu ON wm.invited_by = iu.id;

-- View for workspace analytics
CREATE OR REPLACE VIEW workspace_analytics AS
SELECT 
    w.id,
    w.name,
    w.subscription_plan,
    w.created_at,
    COUNT(DISTINCT wm.user_id) as total_members,
    COUNT(DISTINCT CASE WHEN wm.status = 'active' THEN wm.user_id END) as active_members,
    COUNT(DISTINCT o.id) as total_objectives,
    COUNT(DISTINCT t.id) as total_tasks,
    0 as total_meetings -- meetings table not implemented yet
FROM workspaces w
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
LEFT JOIN objectives o ON w.id = o.workspace_id
LEFT JOIN tasks t ON w.id = t.workspace_id
-- LEFT JOIN meetings m ON w.id = m.workspace_id
GROUP BY w.id;