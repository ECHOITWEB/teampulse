#!/bin/bash

# Script to apply workspace schema step by step

echo "Applying workspace schema step by step..."

# Load environment variables
if [ -f ".env" ]; then
    source .env
else
    echo "Error: .env file not found"
    exit 1
fi

# Default values if not set in .env
DB_HOST=${DB_HOST:-localhost}
DB_USER=${DB_USER:-teampulse_user}
DB_PASSWORD=${DB_PASSWORD:-teampulse123!}
DB_NAME=${DB_NAME:-teampulse}
DB_PORT=${DB_PORT:-3308}

# Function to execute SQL
execute_sql() {
    local sql="$1"
    local description="$2"
    
    echo -n "  $description... "
    if docker exec -i teampulse-mysql mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "$sql" 2>/dev/null; then
        echo "✓"
    else
        echo "✗ (may already exist)"
    fi
}

echo "1. Creating workspace tables..."

# Create workspaces table
execute_sql "CREATE TABLE IF NOT EXISTS workspaces (
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
);" "Creating workspaces table"

# Create workspace_members table
execute_sql "CREATE TABLE IF NOT EXISTS workspace_members (
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
);" "Creating workspace_members table"

# Create workspace_invitations table
execute_sql "CREATE TABLE IF NOT EXISTS workspace_invitations (
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
);" "Creating workspace_invitations table"

# Create workspace_billing table
execute_sql "CREATE TABLE IF NOT EXISTS workspace_billing (
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
);" "Creating workspace_billing table"

# Create workspace_channels table
execute_sql "CREATE TABLE IF NOT EXISTS workspace_channels (
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
);" "Creating workspace_channels table"

# Create channel_members table
execute_sql "CREATE TABLE IF NOT EXISTS channel_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    channel_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES workspace_channels(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_channel_member (channel_id, user_id),
    INDEX idx_channel (channel_id),
    INDEX idx_user (user_id)
);" "Creating channel_members table"

# Create payment_history table
execute_sql "CREATE TABLE IF NOT EXISTS payment_history (
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
);" "Creating payment_history table"

# Create workspace_settings table
execute_sql "CREATE TABLE IF NOT EXISTS workspace_settings (
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
);" "Creating workspace_settings table"

# Create workspace_audit_log table
execute_sql "CREATE TABLE IF NOT EXISTS workspace_audit_log (
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
);" "Creating workspace_audit_log table"

echo ""
echo "2. Updating users table..."

# Check and add firebase columns to users table
COLUMNS=("firebase_uid VARCHAR(128) UNIQUE" 
         "avatar_url VARCHAR(500)"
         "phone VARCHAR(20)"
         "timezone VARCHAR(50) DEFAULT 'UTC'"
         "locale VARCHAR(10) DEFAULT 'en'"
         "last_login_at TIMESTAMP NULL"
         "is_email_verified BOOLEAN DEFAULT FALSE")

COLUMN_NAMES=("firebase_uid" "avatar_url" "phone" "timezone" "locale" "last_login_at" "is_email_verified")

for i in "${!COLUMNS[@]}"; do
    COL_NAME="${COLUMN_NAMES[$i]}"
    COL_DEF="${COLUMNS[$i]}"
    
    # Check if column exists
    EXISTS=$(docker exec -i teampulse-mysql mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -N -B -e "
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = '$DB_NAME' 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = '$COL_NAME';" 2>/dev/null)
    
    if [ "$EXISTS" = "0" ]; then
        execute_sql "ALTER TABLE users ADD COLUMN $COL_DEF;" "Adding $COL_NAME to users table"
    else
        echo "  $COL_NAME already exists... ✓"
    fi
done

# Add index for firebase_uid if not exists
INDEX_EXISTS=$(docker exec -i teampulse-mysql mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -N -B -e "
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = '$DB_NAME'
    AND TABLE_NAME = 'users'
    AND INDEX_NAME = 'idx_firebase_uid';" 2>/dev/null)

if [ "$INDEX_EXISTS" = "0" ]; then
    execute_sql "ALTER TABLE users ADD INDEX idx_firebase_uid (firebase_uid);" "Adding index for firebase_uid"
else
    echo "  Index idx_firebase_uid already exists... ✓"
fi

echo ""
echo "3. Adding workspace_id to existing tables..."

# Tables to add workspace_id to
TABLES=("objectives" "tasks" "chat_sessions")

for TABLE in "${TABLES[@]}"; do
    # Check if workspace_id column exists
    EXISTS=$(docker exec -i teampulse-mysql mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -N -B -e "
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = '$DB_NAME' 
        AND TABLE_NAME = '$TABLE' 
        AND COLUMN_NAME = 'workspace_id';" 2>/dev/null)
    
    if [ "$EXISTS" = "0" ]; then
        execute_sql "ALTER TABLE $TABLE ADD COLUMN workspace_id INT;" "Adding workspace_id to $TABLE"
        execute_sql "ALTER TABLE $TABLE ADD FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;" "Adding FK for $TABLE.workspace_id"
        execute_sql "ALTER TABLE $TABLE ADD INDEX idx_workspace (workspace_id);" "Adding index for $TABLE.workspace_id"
    else
        echo "  workspace_id already exists in $TABLE... ✓"
    fi
done

echo ""
echo "4. Creating workspace summary view..."

execute_sql "DROP VIEW IF EXISTS workspace_summary;" "Dropping old workspace_summary view"

execute_sql "CREATE VIEW workspace_summary AS
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
    0 as total_meetings,
    w.created_at,
    w.updated_at
FROM workspaces w
LEFT JOIN users u ON w.owner_id = u.id
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.is_active = TRUE
LEFT JOIN objectives o ON w.id = o.workspace_id
LEFT JOIN tasks t ON w.id = t.workspace_id
GROUP BY w.id;" "Creating workspace_summary view"

echo ""
echo "✅ Workspace schema applied successfully!"
echo ""
echo "New tables created:"
echo "  - workspaces"
echo "  - workspace_members"
echo "  - workspace_invitations"
echo "  - workspace_channels"
echo "  - channel_members"
echo "  - workspace_billing"
echo "  - payment_history"
echo "  - workspace_settings"
echo "  - workspace_audit_log"
echo ""
echo "Updated tables:"
echo "  - users (added Firebase fields)"
echo "  - objectives (added workspace_id)"
echo "  - tasks (added workspace_id)"
echo "  - chat_sessions (added workspace_id)"