# Goals and Tasks Management Backend API

## Overview
This document describes the backend implementation for the Goals (OKR) and Tasks management system in TeamPulse.

## Architecture

### Database Schema
The system uses MySQL with the following main tables:
- `objectives` - Stores company, team, and individual objectives
- `key_results` - Stores measurable key results linked to objectives
- `key_result_updates` - Tracks progress updates and check-ins
- `tasks` - Enhanced task management with OKR linkage
- `task_comments`, `task_attachments`, `task_activities` - Supporting tables

### Models
- **Objective Model** (`/models/Objective.js`)
  - Full CRUD operations
  - Hierarchical data retrieval (company → team → individual)
  - Automatic progress calculation based on key results
  - Dashboard analytics

- **KeyResult Model** (`/models/KeyResult.js`)
  - CRUD operations with objective linkage
  - Progress tracking with history
  - Bulk update capabilities
  - Automatic objective progress recalculation

- **Task Model** (`/models/Task.js`)
  - Enhanced with OKR integration
  - Dependency management
  - Time tracking
  - Comments and attachments

### Controllers
- **ObjectiveController** (`/controllers/objectiveController.js`)
  - Handles all objective-related operations
  - Key result management
  - Progress tracking
  - Dashboard data aggregation

- **TaskController** (`/controllers/taskController.js`)
  - Complete task lifecycle management
  - Dependency graph generation
  - Search functionality
  - Real-time updates via WebSocket

### Routes
- **Objective Routes** (`/routes/objectiveRoutes.js`)
  - RESTful endpoints for objectives and key results
  - Input validation using express-validator
  - Authentication middleware integration

- **Task Routes** (`/routes/taskRoutes.js`)
  - Comprehensive task management endpoints
  - Advanced filtering and sorting
  - Dependency management endpoints

## API Endpoints

### Objectives
- `POST /api/objectives` - Create objective
- `GET /api/objectives/:id` - Get objective by ID
- `GET /api/objectives/user` - Get user's objectives
- `GET /api/objectives/team/:teamId` - Get team objectives
- `GET /api/objectives/hierarchy` - Get OKR hierarchy
- `GET /api/objectives/dashboard` - Get dashboard data
- `PUT /api/objectives/:id` - Update objective
- `DELETE /api/objectives/:id` - Delete objective

### Key Results
- `POST /api/objectives/:id/key-results` - Add key result
- `PUT /api/objectives/key-results/:id` - Update key result
- `PUT /api/objectives/key-results/:id/progress` - Update progress
- `PUT /api/objectives/key-results/bulk-update` - Bulk update
- `DELETE /api/objectives/key-results/:id` - Delete key result
- `GET /api/objectives/key-results/user` - Get user's key results

### Tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks/:id` - Get task details
- `GET /api/tasks/user` - Get user's tasks
- `GET /api/tasks/team/:teamId` - Get team tasks
- `GET /api/tasks/search` - Search tasks
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Task Features
- `POST /api/tasks/:id/dependencies` - Add dependency
- `DELETE /api/tasks/:id/dependencies/:depId` - Remove dependency
- `GET /api/tasks/:id/dependencies/graph` - Get dependency graph
- `POST /api/tasks/:id/comments` - Add comment
- `POST /api/tasks/:id/time-logs` - Log time

## Features

### 1. OKR Framework
- Supports company, team, and individual objectives
- Quarterly planning with year tracking
- Automatic progress calculation
- Key result check-ins with history

### 2. Task Management
- Full CRUD operations
- Task dependencies (finish-to-start, etc.)
- Time tracking
- Comments with mentions
- File attachments
- Activity logging

### 3. Progress Tracking
- Real-time progress updates
- Historical tracking
- Bulk updates for efficiency
- Visual progress indicators

### 4. Filtering & Sorting
- Filter by quarter, year, status, type
- Search functionality
- Sort by priority, due date
- Team and user-based filtering

### 5. Real-time Updates
- WebSocket integration for live updates
- Event-based notifications
- Collaborative features

## Security
- JWT authentication required for all endpoints
- User-based access control
- Team-based visibility
- Input validation on all endpoints

## Error Handling
- Consistent error response format
- Detailed validation errors
- Database transaction support
- Proper error logging

## Integration Points
- Links tasks to key results
- Supports meeting task integration
- Calendar integration ready
- Notification system integration

## Usage Example

### Creating an Objective with Key Results
```javascript
// 1. Create objective
POST /api/objectives
{
  "title": "Improve Product Quality",
  "description": "Enhance overall product quality and reliability",
  "quarter": "Q1",
  "year": 2025,
  "type": "team",
  "team_id": 1
}

// 2. Add key results
POST /api/objectives/1/key-results
{
  "title": "Reduce bug count by 50%",
  "target_value": 50,
  "unit": "%",
  "due_date": "2025-03-31"
}

// 3. Update progress
PUT /api/objectives/key-results/1/progress
{
  "currentValue": 30,
  "comment": "Implemented new testing procedures"
}
```

## Next Steps
1. Frontend integration with the new API endpoints
2. Add more advanced analytics endpoints
3. Implement caching for performance
4. Add webhook support for external integrations
5. Enhanced reporting capabilities