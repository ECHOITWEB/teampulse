# TeamPulse Enhanced API Documentation

## Overview

The TeamPulse backend has been enhanced with comprehensive OKR framework support, advanced task management, real-time collaboration, AI-powered features, and robust analytics capabilities.

## Table of Contents

1. [Authentication](#authentication)
2. [Teams API](#teams-api)
3. [Objectives & Key Results API](#objectives--key-results-api)
4. [Tasks API](#tasks-api)
5. [Analytics API](#analytics-api)
6. [AI Features API](#ai-features-api)
7. [Notifications API](#notifications-api)
8. [Capacity Management API](#capacity-management-api)
9. [WebSocket Events](#websocket-events)
10. [Performance Optimization](#performance-optimization)

## Authentication

All API endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Teams API

### Create Team
```http
POST /api/teams
Content-Type: application/json

{
  "name": "Engineering Team",
  "description": "Product development team",
  "parent_team_id": null,
  "leader_id": 1
}
```

### Get User's Teams
```http
GET /api/teams/user
```

### Get Team Details
```http
GET /api/teams/:id
```

### Get Team Hierarchy
```http
GET /api/teams/hierarchy/:id?
```

### Add Team Member
```http
POST /api/teams/:teamId/members
Content-Type: application/json

{
  "userId": 2,
  "role": "member" // member, leader, admin
}
```

### Get Team Statistics
```http
GET /api/teams/:id/stats
```

## Objectives & Key Results API

### Create Objective
```http
POST /api/objectives
Content-Type: application/json

{
  "title": "Increase User Engagement",
  "description": "Improve platform engagement metrics",
  "type": "team", // company, team, individual
  "team_id": 1,
  "start_date": "2024-01-01",
  "end_date": "2024-03-31",
  "visibility": "team" // private, team, company
}
```

### Get User's Objectives
```http
GET /api/objectives/user?status=active&type=individual
```

### Get Team Objectives
```http
GET /api/objectives/team/:teamId?status=active
```

### Add Key Result
```http
POST /api/objectives/:id/key-results
Content-Type: application/json

{
  "title": "Increase DAU by 25%",
  "metric_type": "percentage", // number, percentage, currency, boolean, milestone
  "start_value": 10000,
  "target_value": 12500,
  "unit": "users",
  "due_date": "2024-03-31"
}
```

### Update Key Result Progress
```http
PUT /api/objectives/:objectiveId/key-results/:keyResultId/progress
Content-Type: application/json

{
  "currentValue": 11000,
  "status": "on_track" // not_started, on_track, at_risk, behind, completed
}
```

### Get OKR Dashboard
```http
GET /api/objectives/dashboard
```

## Tasks API

### Create Task
```http
POST /api/tasks
Content-Type: application/json

{
  "title": "Implement user dashboard",
  "description": "Create analytics dashboard for users",
  "type": "task", // task, milestone, epic, story, bug
  "priority": "high", // critical, high, medium, low
  "estimated_hours": 16,
  "assignee_id": 2,
  "team_id": 1,
  "key_result_id": 5,
  "start_date": "2024-01-15",
  "due_date": "2024-01-22",
  "tags": ["frontend", "analytics"],
  "custom_fields": {
    "sprint": "Sprint 23",
    "story_points": 5
  }
}
```

### Get User Tasks
```http
GET /api/tasks/user?status=in_progress&priority=high&search=dashboard
```

### Search Tasks
```http
GET /api/tasks/search?q=dashboard&limit=20
```

### Add Task Dependency
```http
POST /api/tasks/:id/dependencies
Content-Type: application/json

{
  "dependsOnTaskId": 10,
  "dependencyType": "finish_to_start", // start_to_start, finish_to_finish, start_to_finish
  "lagTime": 0
}
```

### Get Task Dependency Graph
```http
GET /api/tasks/:id/dependencies/graph
```

### Add Task Comment
```http
POST /api/tasks/:id/comments
Content-Type: application/json

{
  "comment": "Updated the design mockups @user123",
  "mentioned_users": [123],
  "attachments": [
    {
      "type": "image",
      "url": "https://example.com/mockup.png",
      "name": "dashboard-mockup.png"
    }
  ]
}
```

### Log Time
```http
POST /api/tasks/:id/time-logs
Content-Type: application/json

{
  "hoursLogged": 2.5,
  "description": "Implemented user authentication",
  "logDate": "2024-01-15"
}
```

## Analytics API

### Get User Metrics
```http
GET /api/analytics/users/:userId/metrics?startDate=2024-01-01&endDate=2024-01-31
```

Response:
```json
{
  "summary": {
    "total_tasks": 45,
    "completed_tasks": 32,
    "in_progress_tasks": 8,
    "overdue_tasks": 2,
    "avg_completion_time": 48.5,
    "total_estimated_hours": 120,
    "total_actual_hours": 115,
    "avg_task_progress": 75.5,
    "total_objectives": 5,
    "avg_objective_progress": 68.2
  },
  "completionTrend": [
    {
      "date": "2024-01-15",
      "tasks_completed": 3
    }
  ]
}
```

### Get Team Metrics
```http
GET /api/analytics/teams/:teamId/metrics?startDate=2024-01-01&endDate=2024-01-31
```

### Get Workload Distribution
```http
GET /api/analytics/workload/distribution?teamId=1
```

### Get OKR Progress
```http
GET /api/analytics/okr/progress?teamId=1
```

### Get Productivity Insights
```http
GET /api/analytics/productivity/insights
```

### Get Burndown Chart
```http
GET /api/analytics/burndown?objectiveId=10&startDate=2024-01-01&endDate=2024-03-31
```

### Track Analytics Event
```http
POST /api/analytics/events/track
Content-Type: application/json

{
  "eventType": "task_viewed",
  "entityType": "task",
  "entityId": 123,
  "properties": {
    "source": "dashboard",
    "duration": 45
  }
}
```

## AI Features API

### Generate Task Suggestions
```http
POST /api/ai/suggestions/tasks
Content-Type: application/json

{
  "objectiveId": 10,
  "context": "We need to improve mobile app performance"
}
```

### Suggest Task Assignments
```http
POST /api/ai/suggestions/assignments
Content-Type: application/json

{
  "taskId": 123
}
```

### Predict Task Completion
```http
GET /api/ai/predictions/completion/:taskId
```

Response:
```json
{
  "predicted_hours": 24,
  "predicted_completion_date": "2024-01-25T15:00:00Z",
  "confidence": "high",
  "factors": {
    "historical_average": 22.5,
    "sample_size": 15,
    "dependencies_count": 2,
    "estimated_hours": 20
  }
}
```

### Get AI Insights
```http
GET /api/ai/insights
```

### Update Suggestion Status
```http
PUT /api/ai/suggestions/:suggestionId
Content-Type: application/json

{
  "status": "accepted", // accepted, rejected
  "feedback_rating": 4
}
```

## Notifications API

### Get User Notifications
```http
GET /api/notifications?unread=true&type=task_assigned&limit=50
```

### Mark Notification as Read
```http
PUT /api/notifications/:id/read
```

### Mark All as Read
```http
PUT /api/notifications/read-all
```

### Get Unread Count
```http
GET /api/notifications/unread-count
```

## Capacity Management API

### Get User Capacity
```http
GET /api/capacity/users/:userId?startDate=2024-01-01&endDate=2024-01-31
```

### Get Team Capacity
```http
GET /api/capacity/teams/:teamId?startDate=2024-01-01&endDate=2024-01-31
```

### Update User Capacity
```http
PUT /api/capacity/users/:userId/:date
Content-Type: application/json

{
  "available_hours": 6,
  "leave_type": "vacation" // none, vacation, sick, holiday, other
}
```

### Get Workload Balance Suggestions
```http
GET /api/capacity/teams/:teamId/balance?date=2024-01-15
```

### Forecast Capacity Needs
```http
GET /api/capacity/teams/:teamId/forecast?weeks=4
```

## WebSocket Events

### Connection & Authentication
```javascript
socket.emit('authenticate', { userId: 123, token: 'jwt_token' });
```

### Join/Leave Rooms
```javascript
// Join objective room for real-time updates
socket.emit('join:objective', objectiveId);
socket.emit('leave:objective', objectiveId);

// Join task room
socket.emit('join:task', taskId);
socket.emit('leave:task', taskId);
```

### Real-time Updates
```javascript
// Task updates
socket.on('task:updated', (data) => {
  console.log('Task updated:', data.taskId, data.updates);
});

// Comment typing indicator
socket.emit('comment:typing', { taskId: 123, isTyping: true });

// Capacity updates
socket.on('capacity:updated', (data) => {
  console.log('Capacity updated for', data.date);
});

// User presence
socket.emit('presence:update', { 
  status: 'active', 
  currentView: '/tasks/123' 
});
```

### Notification Events
```javascript
socket.on('notification:new', (notification) => {
  console.log('New notification:', notification);
});
```

## Performance Optimization

### Caching Strategy

The API implements Redis caching for:
- User profiles (30 min TTL)
- Team data (30 min TTL)
- Objectives (15 min TTL)
- Tasks (10 min TTL)
- Analytics results (30 min TTL)

Cache is automatically invalidated on updates.

### Database Indexing

Optimized indexes on:
- `users`: email, created_at
- `tasks`: assignee_id + status, due_date, full-text on title/description
- `objectives`: owner_id + status, dates, parent_objective_id
- `notifications`: user_id + is_read + created_at

### Rate Limiting

- General API: 100 requests per 15 minutes
- Search endpoints: 20 requests per minute
- Analytics endpoints: 50 requests per hour

### Pagination

All list endpoints support pagination:
```http
GET /api/tasks/user?page=1&limit=20
```

### Response Compression

All responses are compressed using gzip when supported by the client.

## Error Responses

Standard error format:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

Common error codes:
- `AUTH_REQUIRED`: Authentication required
- `INVALID_TOKEN`: Invalid or expired token
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Input validation failed
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

## Best Practices

1. **Use caching headers**: Check `ETag` and `Last-Modified` headers
2. **Batch requests**: Use bulk endpoints when available
3. **Subscribe to WebSocket**: For real-time updates instead of polling
4. **Include only needed fields**: Use `fields` parameter when available
5. **Handle rate limits**: Check `X-RateLimit-*` headers