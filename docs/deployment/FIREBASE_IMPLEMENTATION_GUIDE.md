# Firebase Implementation Guide for TeamPulse

## Overview

This guide provides step-by-step instructions for implementing the Firebase-based architecture that will reduce the TeamPulse codebase by 80%+ while improving performance and scalability.

## Quick Start

### 1. Install Dependencies

```bash
# Backend (for migration scripts)
cd backend
npm install firebase-admin

# Frontend
cd ..
npm install firebase@latest

# Firebase Functions
cd functions
npm install firebase-functions firebase-admin
```

### 2. Deploy Firestore Security Rules

```bash
firebase deploy --only firestore:rules
```

### 3. Deploy Firebase Functions

```bash
cd functions
npm run deploy
```

### 4. Run Migration Script

```bash
cd migration
node migrateToFirestore.js
```

## Implementation Examples

### 1. Replace Socket.io with Firebase Real-time Listeners

**Before (Socket.io):**
```javascript
// Backend
socket.on('meeting:join', async (meetingId) => {
  socket.join(`meeting_${meetingId}`);
  socket.to(`meeting_${meetingId}`).emit('participant:joined', userData);
});

// Frontend
socket.emit('meeting:join', meetingId);
socket.on('participant:joined', (data) => {
  updateParticipantsList(data);
});
```

**After (Firebase):**
```javascript
// Frontend only - no backend code needed!
import { useMeetingWithPresence } from './hooks/useFirebaseRealtime';

function MeetingRoom({ meetingId }) {
  const { meeting, activeUsers, updateUserStatus } = useMeetingWithPresence(meetingId);
  
  // Automatically syncs presence and meeting data
  return (
    <div>
      <h2>{meeting?.title}</h2>
      <ParticipantsList users={activeUsers} />
    </div>
  );
}
```

### 2. Replace MySQL Queries with Firestore

**Before (MySQL + Express):**
```javascript
// Backend controller
async getUserTasks(req, res) {
  const userId = req.user.id;
  const tasks = await db.query(
    `SELECT t.*, u.name as assignee_name 
     FROM tasks t 
     LEFT JOIN users u ON t.assignee_id = u.id 
     WHERE t.assignee_id = ? 
     ORDER BY t.created_at DESC`,
    [userId]
  );
  res.json({ tasks });
}

// Frontend
const response = await axios.get('/api/tasks/user');
setTasks(response.data.tasks);
```

**After (Firestore):**
```javascript
// Frontend only - no backend needed!
import { useUserTasks } from './hooks/useFirebaseRealtime';

function TaskList() {
  const { data: tasks, loading } = useUserTasks({ 
    status: 'active',
    limit: 50 
  });
  
  // Automatically updates when tasks change
  return <TaskGrid tasks={tasks} loading={loading} />;
}
```

### 3. Replace Redis Caching

**Before (Redis):**
```javascript
// Backend with Redis caching
async getTask(req, res) {
  const taskId = req.params.id;
  
  // Check cache
  const cached = await cache.get(`task:${taskId}`);
  if (cached) return res.json(cached);
  
  // Query database
  const task = await Task.findById(taskId);
  
  // Update cache
  await cache.set(`task:${taskId}`, task, 600);
  
  res.json(task);
}
```

**After (Firestore with built-in caching):**
```javascript
// Frontend - Firestore handles caching automatically
const { data: task } = useFirebaseDocument('tasks', taskId);
// Firestore SDK caches this data automatically
```

### 4. Replace Custom Auth Middleware

**Before (Custom JWT):**
```javascript
// Backend middleware
const authenticateUser = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await db.query('SELECT * FROM users WHERE id = ?', [decoded.userId]);
  
  req.user = user;
  next();
};
```

**After (Firebase Auth):**
```javascript
// Firestore Security Rules handle auth automatically
// No backend code needed!

// Frontend
import { useAuth } from './contexts/AuthContext';

function SecureComponent() {
  const { user } = useAuth(); // Firebase handles token refresh
  // Component automatically re-renders on auth state change
}
```

### 5. Implement Collaborative Editing

```javascript
// Real-time collaborative document editing
import { useCollaborativeDocument } from './hooks/useFirebaseRealtime';

function DocumentEditor({ documentId }) {
  const { 
    document, 
    collaborators, 
    updateDocument,
    isEditing 
  } = useCollaborativeDocument('documents', documentId);
  
  const handleChange = (content) => {
    updateDocument({ content });
  };
  
  return (
    <div>
      <Editor 
        content={document?.content} 
        onChange={handleChange}
      />
      <CollaboratorCursors users={collaborators} />
    </div>
  );
}
```

## Migration Checklist

### Phase 1: Setup (Day 1-2)
- [ ] Deploy Firestore security rules
- [ ] Deploy Firebase Functions
- [ ] Set up Firebase project configuration
- [ ] Test Firebase connectivity

### Phase 2: Data Migration (Day 3-5)
- [ ] Backup MySQL database
- [ ] Run migration script for users
- [ ] Run migration script for workspaces
- [ ] Run migration script for teams
- [ ] Run migration script for tasks
- [ ] Run migration script for meetings
- [ ] Verify data integrity

### Phase 3: Frontend Migration (Week 2)
- [ ] Replace authentication flow
- [ ] Implement Firebase hooks
- [ ] Replace API calls with Firestore queries
- [ ] Add real-time listeners
- [ ] Remove Socket.io client code
- [ ] Test offline functionality

### Phase 4: Backend Simplification (Week 3)
- [ ] Remove unnecessary controllers
- [ ] Remove database models
- [ ] Remove middleware
- [ ] Remove Socket.io server
- [ ] Remove Redis dependencies
- [ ] Keep only necessary endpoints (file uploads, complex operations)

### Phase 5: Optimization (Week 4)
- [ ] Create Firestore indexes for common queries
- [ ] Optimize bundle size by removing unused dependencies
- [ ] Enable Firestore offline persistence
- [ ] Set up monitoring and analytics
- [ ] Performance testing

## Common Patterns

### 1. CRUD Operations

```javascript
// Create
const taskService = new FirebaseCollection('tasks');
const newTask = await taskService.create({ title, description, status: 'todo' });

// Read
const task = await taskService.getById(taskId);

// Update
await taskService.update(taskId, { status: 'completed' });

// Delete
await taskService.delete(taskId);

// Real-time subscription
const unsubscribe = taskService.subscribe(taskId, (task) => {
  console.log('Task updated:', task);
});
```

### 2. Complex Queries

```javascript
// Using the query builder
const tasks = await taskService.query([
  where('assigneeId', '==', userId),
  where('status', 'in', ['todo', 'in_progress']),
  where('dueDate', '<=', new Date()),
  orderBy('priority', 'desc'),
  limit(20)
]);
```

### 3. Batch Operations

```javascript
import { batchOperations } from './firebase-utils';

// Batch update multiple documents
await batchOperations([
  { type: 'update', ref: doc(db, 'tasks', 'task1'), data: { status: 'completed' } },
  { type: 'update', ref: doc(db, 'tasks', 'task2'), data: { status: 'completed' } },
  { type: 'delete', ref: doc(db, 'tasks', 'task3') }
]);
```

### 4. File Uploads

```javascript
import { uploadFile } from './firebase-utils';

const handleFileUpload = async (file) => {
  const result = await uploadFile(file, `attachments/${Date.now()}_${file.name}`);
  console.log('File URL:', result.url);
};
```

## Performance Tips

1. **Use Compound Queries**: Create composite indexes for frequently used query combinations
2. **Limit Real-time Listeners**: Only subscribe to data that needs real-time updates
3. **Paginate Large Lists**: Use `limit()` and cursor-based pagination
4. **Cache Static Data**: Use React Query or SWR for data that doesn't need real-time updates
5. **Optimize Bundle Size**: Import only needed Firebase modules

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   - Check Firestore security rules
   - Verify user authentication state
   - Check workspace/team membership

2. **Real-time Updates Not Working**
   - Ensure proper cleanup of listeners
   - Check network connectivity
   - Verify Firestore indexes

3. **Slow Queries**
   - Create composite indexes
   - Reduce query complexity
   - Use pagination

## Monitoring

Use Firebase Console to monitor:
- Database usage and performance
- Function execution and errors
- Authentication metrics
- Storage usage

## Cost Optimization

1. **Minimize Reads**: Use real-time listeners efficiently
2. **Batch Operations**: Reduce write costs
3. **Archive Old Data**: Move to cold storage
4. **Optimize Images**: Resize before upload
5. **Use Caching**: Leverage Firestore's built-in cache

## Next Steps

After completing the migration:

1. Remove old backend code
2. Update CI/CD pipelines
3. Train team on Firebase
4. Monitor performance metrics
5. Gather user feedback

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Firebase Security Rules Guide](https://firebase.google.com/docs/rules)
- [Firebase Functions Samples](https://github.com/firebase/functions-samples)