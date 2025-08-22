# Meeting API Documentation

## Base URL
All endpoints are prefixed with `/api/meetings`

## Authentication
All endpoints require JWT authentication token in the Authorization header:
```
Authorization: Bearer <token>
```

## Meeting Endpoints

### Create Meeting
```
POST /meetings
```

Request Body:
```json
{
  "title": "Team Standup",
  "description": "Daily team sync",
  "scheduled_at": "2024-01-15T10:00:00Z",
  "duration_minutes": 30,
  "location": "Conference Room A",
  "meeting_link": "https://zoom.us/j/123456789",
  "participants": [
    {
      "user_id": 2,
      "role": "participant"
    }
  ]
}
```

### Get User's Meetings
```
GET /meetings?status=scheduled&startDate=2024-01-01&endDate=2024-01-31&limit=50&offset=0
```

### Get Meeting Details
```
GET /meetings/:id
```

### Update Meeting
```
PUT /meetings/:id
```

### Delete Meeting
```
DELETE /meetings/:id
```

### Start Meeting
```
POST /meetings/:id/start
```

### End Meeting
```
POST /meetings/:id/end
```

### Update Participant Status
```
PUT /meetings/:id/participant-status
```
Request Body:
```json
{
  "status": "accepted" // accepted, declined, tentative
}
```

## Meeting Notes Endpoints

### Get Meeting Notes
```
GET /meetings/:id/notes?type=action_item&userId=1
```

### Create Note
```
POST /meetings/:id/notes
```
Request Body:
```json
{
  "content": "Discussed Q1 goals",
  "type": "note", // note, action_item, decision, highlight
  "parent_id": null
}
```

### Update Note
```
PUT /notes/:noteId
```

### Delete Note
```
DELETE /notes/:noteId
```

### Search Notes
```
GET /notes/search?q=keyword&limit=50
```

## Meeting Tasks Endpoints

### Get Meeting Tasks
```
GET /meetings/:id/tasks
```

### Create Task
```
POST /meetings/:id/tasks
```
Request Body:
```json
{
  "title": "Review Q1 budget",
  "description": "Review and approve Q1 budget allocation",
  "assignee_id": 2,
  "due_date": "2024-01-20",
  "priority": "high",
  "note_id": 123
}
```

### Get User's Tasks
```
GET /tasks?status=pending&dueBefore=2024-01-31
```

### Update Task
```
PUT /tasks/:taskId
```

### Delete Task
```
DELETE /tasks/:taskId
```

### Get Task Statistics
```
GET /tasks/stats
```

## Calendar Integration Endpoints

### Get Calendar Integrations
```
GET /calendar/integrations
```

### Connect Calendar
```
POST /calendar/connect
```
Request Body:
```json
{
  "provider": "google",
  "access_token": "token",
  "refresh_token": "refresh_token",
  "calendar_id": "primary"
}
```

### Toggle Sync
```
PUT /calendar/:provider/sync
```
Request Body:
```json
{
  "enabled": true
}
```

### Disconnect Calendar
```
DELETE /calendar/:provider
```

### Manual Sync
```
POST /calendar/:provider/sync-now
```

## WebSocket Events

### Connection
```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'jwt_token'
  }
});
```

### Meeting Events
- `meeting:join` - Join a meeting room
- `meeting:leave` - Leave a meeting room
- `meeting:created` - New meeting created
- `meeting:updated` - Meeting updated
- `meeting:deleted` - Meeting deleted
- `meeting:started` - Meeting started
- `meeting:ended` - Meeting ended

### Note Events
- `note:created` - New note created
- `note:updated` - Note updated
- `note:deleted` - Note deleted
- `note:typing` - User typing a note
- `note:stopTyping` - User stopped typing

### Task Events
- `task:created` - New task created
- `task:updated` - Task updated
- `task:deleted` - Task deleted
- `task:assigned` - Task assigned to user

### Participant Events
- `participant:joined` - Participant joined meeting
- `participant:left` - Participant left meeting
- `participant:statusUpdated` - Participant status changed
- `participant:disconnected` - Participant disconnected