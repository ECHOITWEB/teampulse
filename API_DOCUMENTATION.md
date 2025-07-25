# TeamPulse API Documentation

## Overview

TeamPulse API provides endpoints for managing chat sessions, user authentication, and history tracking for various AI-powered tools. The API is built with Express.js and uses MySQL for data persistence.

## Base URL

```
http://localhost:5000/api
```

## Authentication

The API uses JWT (JSON Web Token) for authentication. All protected endpoints require a valid JWT token in the Authorization header.

### Authentication Header Format

```
Authorization: Bearer <jwt_token>
```

### Token Generation

Tokens are generated during login and have a 30-day expiration period.

## Rate Limiting

API requests are rate-limited to 100 requests per 15-minute window per IP address.

## Common Response Formats

### Success Response

```json
{
  "data": {},
  "message": "Success"
}
```

### Error Response

```json
{
  "error": {
    "message": "Error description",
    "status": 400
  }
}
```

## Endpoints

### Health Check

#### GET /health

Check API server health status.

**Authentication:** Not required

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

---

### User Endpoints

#### POST /api/users/demo-login

Login as a demo user (for development purposes).

**Authentication:** Not required

**Request Body:** None

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "demo@teampulse.com",
    "name": "Demo User"
  }
}
```

#### GET /api/users/me

Get current authenticated user information.

**Authentication:** Required

**Response:**
```json
{
  "id": 1,
  "email": "demo@teampulse.com",
  "name": "Demo User",
  "created_at": "2025-01-20T10:30:00.000Z"
}
```

**Error Responses:**
- `401 Unauthorized`: No token provided or invalid token
- `404 Not Found`: User not found

---

### Chat Session Endpoints

#### POST /api/chat/sessions

Create a new chat session.

**Authentication:** Required

**Request Body:**
```json
{
  "tool_type": "string",  // Required: Type of AI tool (e.g., "translator", "analyzer", "composer")
  "session_name": "string" // Optional: Custom session name
}
```

**Response:**
```json
{
  "id": 123,
  "user_id": 1,
  "tool_type": "translator",
  "session_name": "New translator Session",
  "created_at": "2025-01-20T10:30:00.000Z"
}
```

#### GET /api/chat/sessions

Get user's chat sessions with pagination.

**Authentication:** Required

**Query Parameters:**
- `tool_type` (optional): Filter by tool type
- `limit` (optional, default: 20): Number of sessions to return
- `offset` (optional, default: 0): Pagination offset

**Response:**
```json
{
  "sessions": [
    {
      "id": 123,
      "user_id": 1,
      "tool_type": "translator",
      "session_name": "Translation Session",
      "created_at": "2025-01-20T10:30:00.000Z",
      "updated_at": "2025-01-20T11:30:00.000Z",
      "message_count": 5,
      "last_message_at": "2025-01-20T11:30:00.000Z"
    }
  ]
}
```

#### GET /api/chat/sessions/:sessionId

Get a specific session with all its messages.

**Authentication:** Required

**URL Parameters:**
- `sessionId`: The ID of the chat session

**Response:**
```json
{
  "session": {
    "id": 123,
    "user_id": 1,
    "tool_type": "translator",
    "session_name": "Translation Session",
    "created_at": "2025-01-20T10:30:00.000Z",
    "updated_at": "2025-01-20T11:30:00.000Z"
  },
  "messages": [
    {
      "id": 1,
      "session_id": 123,
      "role": "user",
      "content": "Translate this text",
      "file_info": null,
      "tokens_used": 0,
      "created_at": "2025-01-20T10:31:00.000Z"
    },
    {
      "id": 2,
      "session_id": 123,
      "role": "assistant",
      "content": "Here is the translation...",
      "file_info": null,
      "tokens_used": 150,
      "created_at": "2025-01-20T10:31:30.000Z"
    }
  ]
}
```

**Error Responses:**
- `404 Not Found`: Session not found or doesn't belong to user

#### POST /api/chat/sessions/:sessionId/messages

Send a message to a chat session.

**Authentication:** Required

**URL Parameters:**
- `sessionId`: The ID of the chat session

**Request Body:**
```json
{
  "role": "user",              // Required: "user" or "assistant"
  "content": "string",         // Required: Message content
  "file_info": {},            // Optional: File metadata (JSON object)
  "tokens_used": 0            // Optional: Number of tokens used (for assistant messages)
}
```

**Response:**
```json
{
  "id": 456,
  "session_id": 123,
  "role": "user",
  "content": "Translate this text",
  "file_info": null,
  "tokens_used": 0,
  "created_at": "2025-01-20T10:31:00.000Z"
}
```

**Notes:**
- When role is "assistant" and tokens_used > 0, API usage is tracked for billing
- The session's `updated_at` timestamp is automatically updated

**Error Responses:**
- `404 Not Found`: Session not found or doesn't belong to user

#### DELETE /api/chat/sessions/:sessionId

Delete a chat session and all its messages.

**Authentication:** Required

**URL Parameters:**
- `sessionId`: The ID of the chat session

**Response:** `204 No Content` (empty response on success)

**Error Responses:**
- `404 Not Found`: Session not found or doesn't belong to user

#### PATCH /api/chat/sessions/:sessionId

Update a chat session's name.

**Authentication:** Required

**URL Parameters:**
- `sessionId`: The ID of the chat session

**Request Body:**
```json
{
  "session_name": "Updated Session Name"
}
```

**Response:**
```json
{
  "message": "Session updated successfully"
}
```

**Error Responses:**
- `404 Not Found`: Session not found or doesn't belong to user

---

### History Endpoints

#### GET /api/history/summary

Get a summary of user's chat history and usage statistics.

**Authentication:** Required

**Response:**
```json
{
  "sessionCounts": [
    {
      "tool_type": "translator",
      "count": 15
    },
    {
      "tool_type": "analyzer",
      "count": 8
    }
  ],
  "messageStats": {
    "total_messages": 234,
    "total_tokens": 45678
  },
  "recentSessions": [
    {
      "id": 123,
      "tool_type": "translator",
      "session_name": "Recent Translation",
      "created_at": "2025-01-20T10:30:00.000Z",
      "updated_at": "2025-01-20T11:30:00.000Z",
      "message_count": 5
    }
  ]
}
```

#### GET /api/history/export

Export chat history in various formats.

**Authentication:** Required

**Query Parameters:**
- `format` (optional, default: "json"): Export format (currently only "json" is supported)
- `sessionId` (optional): Export specific session only

**Response (JSON format):**
```json
[
  {
    "session_id": 123,
    "tool_type": "translator",
    "session_name": "Translation Session",
    "session_created_at": "2025-01-20T10:30:00.000Z",
    "role": "user",
    "content": "Translate this text",
    "file_info": null,
    "message_created_at": "2025-01-20T10:31:00.000Z"
  },
  {
    "session_id": 123,
    "tool_type": "translator",
    "session_name": "Translation Session",
    "session_created_at": "2025-01-20T10:30:00.000Z",
    "role": "assistant",
    "content": "Here is the translation...",
    "file_info": null,
    "message_created_at": "2025-01-20T10:31:30.000Z"
  }
]
```

**Error Responses:**
- `400 Bad Request`: Unsupported format

---

## Data Models

### User
```json
{
  "id": "integer",
  "email": "string",
  "name": "string",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### Chat Session
```json
{
  "id": "integer",
  "user_id": "integer",
  "tool_type": "string",
  "session_name": "string",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### Chat Message
```json
{
  "id": "integer",
  "session_id": "integer",
  "role": "enum: user|assistant|system",
  "content": "text",
  "file_info": "json",
  "tokens_used": "integer",
  "created_at": "timestamp"
}
```

### API Usage
```json
{
  "id": "integer",
  "user_id": "integer",
  "api_type": "string",
  "tokens_used": "integer",
  "cost_estimate": "decimal",
  "created_at": "timestamp"
}
```

## Tool Types

The following tool types are supported in the system:

- `translator`: Text translation tool
- `analyzer`: Data analysis tool
- `composer`: Email composition tool
- `reviewer`: Document review tool
- `planner`: PowerPoint planning tool
- `company_bot`: Company information bot
- `teampulse_ai`: General TeamPulse AI assistant

## Error Handling

The API uses standard HTTP status codes:

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `204 No Content`: Successful request with no response body
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

All errors return a consistent JSON structure:

```json
{
  "error": {
    "message": "Human-readable error message",
    "status": 400
  }
}
```

## Security Features

1. **JWT Authentication**: Secure token-based authentication with 30-day expiration
2. **Rate Limiting**: 100 requests per 15 minutes per IP
3. **Helmet.js**: Security headers for protection against common vulnerabilities
4. **CORS**: Configured for frontend access with credentials support
5. **Request Size Limits**: 50MB limit for JSON and URL-encoded bodies
6. **SQL Injection Protection**: Parameterized queries throughout

## Development Notes

- In development mode, if no authentication token is provided, the API automatically uses the demo user account
- The demo user email is `demo@teampulse.com`
- All timestamps are in ISO 8601 format
- File uploads are handled through `file_info` JSON field in messages
- Token usage tracking is automatic for assistant messages with `tokens_used > 0`