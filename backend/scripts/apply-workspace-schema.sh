#!/bin/bash

# Script to apply workspace schema to the database

echo "Applying workspace schema to TeamPulse database..."

# Load environment variables
if [ -f ".env" ]; then
    source .env
else
    echo "Error: .env file not found"
    exit 1
fi

# Default values if not set in .env
DB_HOST=${DB_HOST:-localhost}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD:-rootpassword}
DB_NAME=${DB_NAME:-teampulse}
DB_PORT=${DB_PORT:-3307}

# Apply the workspace schema
echo "Connecting to MySQL at $DB_HOST:$DB_PORT..."
docker exec -i teampulse-mysql mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < ./database/workspace_schema.sql

if [ $? -eq 0 ]; then
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
    echo "Existing tables updated with workspace_id:"
    echo "  - objectives"
    echo "  - tasks"
    echo "  - meetings"
    echo "  - chat_sessions"
else
    echo "❌ Error applying workspace schema"
    exit 1
fi