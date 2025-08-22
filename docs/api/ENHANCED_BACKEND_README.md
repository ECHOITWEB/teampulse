# TeamPulse Enhanced Backend

## Overview

The TeamPulse backend has been significantly enhanced with enterprise-grade features for comprehensive goal and task management, including:

- **OKR Framework**: Complete Objectives and Key Results implementation
- **Advanced Task Management**: Dependencies, time tracking, and hierarchical tasks
- **Real-time Collaboration**: WebSocket-based live updates and presence
- **AI-Powered Features**: Smart task suggestions and workload optimization
- **Analytics & Reporting**: Comprehensive metrics and insights
- **Capacity Management**: Team workload balancing and forecasting
- **Performance Optimization**: Redis caching and database indexing

## New Features

### 1. Enhanced Database Schema

- **Teams**: Hierarchical team structure with roles
- **Objectives & Key Results**: Full OKR implementation with progress tracking
- **Tasks**: Advanced task management with dependencies and custom fields
- **Notifications**: Real-time notification system
- **Analytics**: Event tracking and performance metrics
- **AI Suggestions**: Machine learning-powered recommendations

### 2. API Endpoints

#### Teams Management
- `POST /api/teams` - Create team
- `GET /api/teams/user` - Get user's teams
- `GET /api/teams/:id` - Get team details
- `GET /api/teams/hierarchy/:id?` - Get team hierarchy
- `POST /api/teams/:teamId/members` - Add team member
- `GET /api/teams/:id/stats` - Get team statistics

#### OKR Management
- `POST /api/objectives` - Create objective
- `GET /api/objectives/user` - Get user objectives
- `GET /api/objectives/team/:teamId` - Get team objectives
- `POST /api/objectives/:id/key-results` - Add key result
- `PUT /api/objectives/:id/key-results/:krId/progress` - Update progress
- `GET /api/objectives/dashboard` - OKR dashboard

#### Task Management
- `POST /api/tasks` - Create task
- `GET /api/tasks/user` - Get user tasks
- `GET /api/tasks/search` - Search tasks
- `POST /api/tasks/:id/dependencies` - Add dependency
- `GET /api/tasks/:id/dependencies/graph` - Get dependency graph
- `POST /api/tasks/:id/comments` - Add comment
- `POST /api/tasks/:id/time-logs` - Log time

#### Analytics
- `GET /api/analytics/users/:id/metrics` - User metrics
- `GET /api/analytics/teams/:id/metrics` - Team metrics
- `GET /api/analytics/workload/distribution` - Workload analysis
- `GET /api/analytics/productivity/insights` - Productivity insights
- `POST /api/analytics/events/track` - Track events

#### AI Features
- `POST /api/ai/suggestions/tasks` - Generate task suggestions
- `POST /api/ai/suggestions/assignments` - Suggest assignments
- `GET /api/ai/predictions/completion/:taskId` - Predict completion
- `GET /api/ai/insights` - Get AI insights

#### Capacity Management
- `GET /api/capacity/users/:id` - User capacity
- `GET /api/capacity/teams/:id` - Team capacity
- `PUT /api/capacity/users/:id/:date` - Update capacity
- `GET /api/capacity/teams/:id/balance` - Balance suggestions
- `GET /api/capacity/teams/:id/forecast` - Capacity forecast

### 3. Real-time Features

WebSocket events for:
- Task updates
- Comment notifications
- Presence tracking
- Capacity changes
- Live collaboration

### 4. Performance Optimizations

#### Caching (Redis)
- User profiles (30 min TTL)
- Team data (30 min TTL)
- Tasks (10 min TTL)
- Analytics results (30 min TTL)

#### Database Optimizations
- Composite indexes on frequently queried columns
- Full-text search indexes
- Materialized views for complex queries
- Query optimization for large datasets

## Setup Instructions

### Prerequisites
- Node.js 14+
- MySQL 5.7+
- Redis 6+
- OpenAI API key (for AI features)

### Installation

1. Install dependencies:
```bash
cd backend
npm install
```

2. Set up environment variables in `.env`:
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=rootpassword
DB_NAME=teampulse

# Redis
REDIS_URL=redis://localhost:6379

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@teampulse.com

# JWT
JWT_SECRET=your_jwt_secret

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

3. Apply the enhanced database schema:
```bash
cd scripts
./apply-enhanced-schema.sh
```

4. Start the server:
```bash
npm run dev
```

## Architecture

### Technology Stack
- **Framework**: Express.js
- **Database**: MySQL with mysql2
- **Cache**: Redis
- **Real-time**: Socket.io
- **AI**: OpenAI GPT-4
- **Email**: Nodemailer
- **Authentication**: JWT

### Project Structure
```
backend/
├── src/
│   ├── controllers/      # Request handlers
│   ├── models/          # Data models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── middleware/      # Express middleware
│   └── utils/           # Utilities
├── database/
│   ├── init.sql         # Initial schema
│   └── enhanced_schema.sql # Enhanced schema
├── scripts/             # Utility scripts
└── docs/               # Documentation
```

### Key Services

#### CacheService
- Redis-based caching
- Automatic cache invalidation
- Rate limiting support
- Session management

#### NotificationService
- Email notifications
- In-app notifications
- Real-time alerts
- Batch processing

#### CapacityService
- Workload calculations
- Resource planning
- Balance suggestions
- Forecasting

#### AIController
- Task generation
- Smart assignments
- Completion predictions
- Productivity insights

## API Usage Examples

### Create an Objective with Key Results
```javascript
// Create objective
const objective = await fetch('/api/objectives', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Increase User Engagement',
    type: 'team',
    team_id: 1,
    start_date: '2024-01-01',
    end_date: '2024-03-31'
  })
});

// Add key result
const keyResult = await fetch(`/api/objectives/${objective.id}/key-results`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Increase DAU by 25%',
    metric_type: 'percentage',
    start_value: 10000,
    target_value: 12500
  })
});
```

### Get AI Task Suggestions
```javascript
const suggestions = await fetch('/api/ai/suggestions/tasks', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    objectiveId: 10,
    context: 'Need to improve mobile app performance'
  })
});
```

### Real-time Task Updates
```javascript
// Connect to WebSocket
const socket = io('http://localhost:5000');

// Authenticate
socket.emit('authenticate', { userId: 123, token });

// Join task room
socket.emit('join:task', taskId);

// Listen for updates
socket.on('task:updated', (data) => {
  console.log('Task updated:', data);
});

// Send update
socket.emit('task:update', {
  taskId: 123,
  updates: { status: 'in_progress' }
});
```

## Performance Considerations

1. **Caching**: All frequently accessed data is cached in Redis
2. **Pagination**: Use pagination for large datasets
3. **Indexes**: Database queries are optimized with proper indexes
4. **Connection Pooling**: MySQL connection pooling is enabled
5. **Compression**: Response compression is enabled

## Security Features

1. **Authentication**: JWT-based authentication
2. **Authorization**: Role-based access control
3. **Rate Limiting**: Request rate limiting per IP
4. **Input Validation**: Express-validator for all inputs
5. **SQL Injection Prevention**: Parameterized queries
6. **XSS Protection**: Helmet.js security headers

## Monitoring & Debugging

1. **Logging**: Morgan for HTTP requests
2. **Error Tracking**: Comprehensive error handling
3. **Performance Metrics**: Built-in analytics
4. **Health Checks**: `/health` endpoint

## Future Enhancements

1. **GraphQL API**: Alternative to REST
2. **Microservices**: Service decomposition
3. **Event Sourcing**: Complete audit trail
4. **Machine Learning**: Advanced predictions
5. **Mobile Push**: Native notifications

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Submit pull requests

## Support

For issues or questions:
1. Check the API documentation
2. Review error logs
3. Contact the development team