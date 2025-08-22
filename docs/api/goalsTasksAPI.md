# Goals and Tasks Management API Documentation

## Overview
This document describes the RESTful API endpoints for managing objectives (OKRs), key results, and tasks in TeamPulse.

## Authentication
All endpoints require authentication using the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Base URL
```
http://localhost:5000/api
```

## Objectives API

### Create Objective
Creates a new objective.

**Endpoint:** `POST /objectives`

**Request Body:**
```json
{
  "title": "Increase Customer Satisfaction",
  "description": "Improve overall customer satisfaction score",
  "quarter": "Q1",
  "year": 2025,
  "type": "team", // company, team, or individual
  "team_id": 1, // optional, required for team objectives
  "status": "active" // draft, active, completed, cancelled
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Increase Customer Satisfaction",
    "description": "Improve overall customer satisfaction score",
    "quarter": "Q1",
    "year": 2025,
    "type": "team",
    "owner_id": 1,
    "team_id": 1,
    "status": "active",
    "progress": 0,
    "created_at": "2025-01-25T10:00:00Z"
  },
  "message": "Objective created successfully"
}
```

### Get Objective by ID
Retrieves a specific objective with its key results.

**Endpoint:** `GET /objectives/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Increase Customer Satisfaction",
    "description": "Improve overall customer satisfaction score",
    "quarter": "Q1",
    "year": 2025,
    "type": "team",
    "owner_id": 1,
    "owner_name": "Kim Developer",
    "team_id": 1,
    "team_name": "개발팀",
    "status": "active",
    "progress": 45.5,
    "key_results_count": 3,
    "keyResults": [
      {
        "id": 1,
        "title": "Achieve 90% customer satisfaction score",
        "target_value": 90,
        "current_value": 85,
        "unit": "%",
        "progress": 94.4,
        "status": "in_progress",
        "owner_id": 1,
        "owner_name": "Kim Developer",
        "due_date": "2025-03-31"
      }
    ]
  }
}
```

### Get User Objectives
Retrieves objectives owned by the current user.

**Endpoint:** `GET /objectives/user`

**Query Parameters:**
- `quarter` (optional): Filter by quarter (Q1, Q2, Q3, Q4)
- `year` (optional): Filter by year
- `type` (optional): Filter by type (company, team, individual)
- `status` (optional): Filter by status

**Example:** `GET /objectives/user?quarter=Q1&year=2025&type=individual`

### Get Team Objectives
Retrieves objectives for a specific team.

**Endpoint:** `GET /objectives/team/:teamId`

**Query Parameters:**
- `quarter` (optional): Filter by quarter
- `year` (optional): Filter by year
- `status` (optional): Filter by status

### Get Objective Hierarchy
Retrieves the hierarchical view of objectives (company → team → individual).

**Endpoint:** `GET /objectives/hierarchy`

**Query Parameters:**
- `teamId` (optional): Filter team objectives by specific team

**Response:**
```json
{
  "success": true,
  "data": {
    "company": [...],
    "team": [...],
    "individual": [...]
  }
}
```

### Update Objective
Updates an existing objective.

**Endpoint:** `PUT /objectives/:id`

**Request Body:** (all fields optional)
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "status": "completed",
  "progress": 75.5
}
```

### Delete Objective
Deletes an objective and all its key results.

**Endpoint:** `DELETE /objectives/:id`

### Get OKR Dashboard
Retrieves dashboard data with summary statistics.

**Endpoint:** `GET /objectives/dashboard`

**Query Parameters:**
- `quarter` (optional): Filter by quarter
- `year` (optional): Filter by year (defaults to current year)
- `type` (optional): Filter by type
- `teamId` (optional): Filter by team

## Key Results API

### Add Key Result
Adds a key result to an objective.

**Endpoint:** `POST /objectives/:id/key-results`

**Request Body:**
```json
{
  "title": "Achieve 90% customer satisfaction score",
  "description": "As measured by quarterly NPS survey",
  "target_value": 90,
  "unit": "%",
  "owner_id": 1, // optional, defaults to current user
  "due_date": "2025-03-31"
}
```

### Update Key Result
Updates a key result.

**Endpoint:** `PUT /objectives/key-results/:keyResultId`

**Request Body:** (all fields optional)
```json
{
  "title": "Updated title",
  "target_value": 95,
  "due_date": "2025-04-15"
}
```

### Update Key Result Progress
Updates the progress of a key result.

**Endpoint:** `PUT /objectives/key-results/:keyResultId/progress`

**Request Body:**
```json
{
  "currentValue": 87,
  "comment": "Latest NPS survey shows improvement"
}
```

### Bulk Update Key Results
Updates multiple key results at once.

**Endpoint:** `PUT /objectives/key-results/bulk-update`

**Request Body:**
```json
{
  "updates": [
    {
      "keyResultId": 1,
      "currentValue": 87,
      "comment": "Q1 progress update"
    },
    {
      "keyResultId": 2,
      "currentValue": 45,
      "comment": "On track"
    }
  ]
}
```

### Delete Key Result
Deletes a key result.

**Endpoint:** `DELETE /objectives/key-results/:keyResultId`

### Get User Key Results
Retrieves all key results owned by the current user.

**Endpoint:** `GET /objectives/key-results/user`

**Query Parameters:**
- `status` (optional): Filter by status
- `quarter` (optional): Filter by objective quarter
- `year` (optional): Filter by objective year

## Tasks API

### Create Task
Creates a new task.

**Endpoint:** `POST /tasks`

**Request Body:**
```json
{
  "title": "Implement user feedback system",
  "description": "Build a system to collect and analyze user feedback",
  "type": "task", // task, milestone, epic, story, bug
  "priority": "high", // critical, high, medium, low
  "status": "todo", // todo, in_progress, review, done
  "assignee_id": 2,
  "team_id": 1,
  "key_result_id": 1, // optional, links to a key result
  "estimated_hours": 16,
  "start_date": "2025-01-26",
  "due_date": "2025-02-01",
  "tags": ["backend", "api"],
  "custom_fields": {
    "sprint": "Sprint 15"
  }
}
```

### Get Task by ID
Retrieves a specific task with details.

**Endpoint:** `GET /tasks/:id`

**Response includes:**
- Task details
- Comments
- Time logs
- Dependencies
- Dependent tasks

### Get User Tasks
Retrieves tasks assigned to the current user.

**Endpoint:** `GET /tasks/user`

**Query Parameters:**
- `status` (optional): Filter by status
- `priority` (optional): Filter by priority
- `due_date_start` (optional): Filter by due date range start
- `due_date_end` (optional): Filter by due date range end
- `search` (optional): Search in title and description

### Get Team Tasks
Retrieves tasks for a specific team.

**Endpoint:** `GET /tasks/team/:teamId`

**Query Parameters:**
- `status` (optional): Comma-separated list of statuses

### Update Task
Updates a task.

**Endpoint:** `PUT /tasks/:id`

**Request Body:** (all fields optional)
```json
{
  "title": "Updated title",
  "status": "in_progress",
  "assignee_id": 3,
  "progress": 50,
  "actual_hours": 8
}
```

### Delete Task
Deletes a task.

**Endpoint:** `DELETE /tasks/:id`

### Search Tasks
Searches tasks by title or description.

**Endpoint:** `GET /tasks/search`

**Query Parameters:**
- `q` (required): Search query (minimum 2 characters)
- `limit` (optional): Maximum results (default: 20)

### Task Dependencies

#### Add Dependency
Creates a dependency between tasks.

**Endpoint:** `POST /tasks/:id/dependencies`

**Request Body:**
```json
{
  "dependsOnTaskId": 5,
  "dependencyType": "finish_to_start", // finish_to_start, start_to_start, finish_to_finish, start_to_finish
  "lagTime": 0
}
```

#### Remove Dependency
Removes a dependency between tasks.

**Endpoint:** `DELETE /tasks/:taskId/dependencies/:dependsOnTaskId`

#### Get Dependency Graph
Retrieves the dependency graph for a task.

**Endpoint:** `GET /tasks/:id/dependencies/graph`

### Task Comments

#### Add Comment
Adds a comment to a task.

**Endpoint:** `POST /tasks/:id/comments`

**Request Body:**
```json
{
  "comment": "Great progress on this task!",
  "mentioned_users": [2, 3], // optional
  "attachments": [] // optional
}
```

### Time Tracking

#### Log Time
Logs time spent on a task.

**Endpoint:** `POST /tasks/:id/time-logs`

**Request Body:**
```json
{
  "hoursLogged": 2.5,
  "description": "Implemented API endpoints",
  "logDate": "2025-01-25"
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "success": false,
  "errors": [
    {
      "msg": "Task title is required",
      "param": "title",
      "location": "body"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error message"
}
```

## Real-time Updates

The API supports real-time updates via WebSocket connections. When connected, clients will receive the following events:

### Objective Events
- `objective:created` - New objective created
- `objective:updated` - Objective updated
- `objective:deleted` - Objective deleted

### Key Result Events
- `keyResult:created` - New key result added
- `keyResult:updated` - Key result updated
- `keyResult:deleted` - Key result deleted
- `keyResult:progressUpdated` - Key result progress updated

### Task Events
- `task:created` - New task created
- `task:updated` - Task updated
- `task:deleted` - Task deleted
- `task:assigned` - Task assigned to user
- `comment:added` - Comment added to task
- `time:logged` - Time logged on task