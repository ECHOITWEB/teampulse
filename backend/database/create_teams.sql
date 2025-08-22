-- Create teams and related tables for TeamPulse
USE teampulse;

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Team members junction table
CREATE TABLE IF NOT EXISTS team_members (
    team_id INT,
    user_id INT,
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, user_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert sample teams
INSERT INTO teams (name, description) VALUES
('개발팀', '제품 개발 및 기술 인프라 담당'),
('디자인팀', 'UI/UX 및 브랜드 디자인 담당'),
('마케팅팀', '마케팅 전략 및 캠페인 실행'),
('기획팀', '제품 기획 및 비즈니스 전략');

-- Add demo user to dev team
INSERT INTO team_members (team_id, user_id, role) VALUES
(1, 1, 'member');