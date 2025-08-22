#!/bin/bash

# Script to apply enhanced schema to the TeamPulse database
# This script should be run after the initial database setup

echo "Applying enhanced schema to TeamPulse database..."

# Database credentials
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-rootpassword}"
DB_NAME="${DB_NAME:-teampulse}"

# Check if enhanced schema file exists
if [ ! -f "../database/enhanced_schema.sql" ]; then
    echo "Error: enhanced_schema.sql not found!"
    exit 1
fi

# Apply the enhanced schema
echo "Connecting to MySQL and applying enhanced schema..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < ../database/enhanced_schema.sql

if [ $? -eq 0 ]; then
    echo "Enhanced schema applied successfully!"
    
    # Create indexes for performance
    echo "Creating additional performance indexes..."
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" <<EOF
-- Additional performance indexes
CREATE INDEX idx_tasks_assignee_due ON tasks(assignee_id, due_date, status);
CREATE INDEX idx_tasks_team_status ON tasks(team_id, status, created_at);
CREATE INDEX idx_objectives_dates ON objectives(start_date, end_date, status);
CREATE INDEX idx_key_results_objective_progress ON key_results(objective_id, progress);
CREATE INDEX idx_analytics_user_date ON analytics_events(user_id, created_at);
CREATE INDEX idx_capacity_user_date ON user_capacity(user_id, date);

-- Create composite indexes for common queries
CREATE INDEX idx_tasks_complex ON tasks(assignee_id, status, priority, due_date);
CREATE INDEX idx_notifications_user_read_type ON notifications(user_id, is_read, type, created_at);

SHOW INDEXES FROM tasks;
SHOW INDEXES FROM objectives;
SHOW INDEXES FROM notifications;
EOF

    echo "Performance indexes created successfully!"
    
    # Insert sample data for development
    echo "Would you like to insert sample data? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "Inserting sample data..."
        mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" <<EOF
-- Insert sample teams
INSERT INTO teams (name, description) VALUES 
('Frontend', 'Frontend development team'),
('Backend', 'Backend development team'),
('QA', 'Quality assurance team')
ON DUPLICATE KEY UPDATE description=description;

-- Insert sample objectives
INSERT INTO objectives (title, description, owner_id, team_id, type, status, visibility, start_date, end_date) VALUES
('Improve Platform Performance', 'Optimize application performance across all services', 1, 1, 'team', 'active', 'company', '2024-01-01', '2024-03-31'),
('Enhance User Experience', 'Improve UI/UX based on user feedback', 1, 2, 'team', 'active', 'team', '2024-01-01', '2024-03-31')
ON DUPLICATE KEY UPDATE description=description;

EOF
        echo "Sample data inserted!"
    fi
    
else
    echo "Error: Failed to apply enhanced schema!"
    exit 1
fi

echo "Enhanced schema setup complete!"
echo ""
echo "Next steps:"
echo "1. Run 'npm install' to install new dependencies (nodemailer, openai, redis)"
echo "2. Configure Redis connection in .env file"
echo "3. Set up OpenAI API key in .env file"
echo "4. Restart the backend server"