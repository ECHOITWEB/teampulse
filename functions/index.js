const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Import performance monitoring and error handling
const performanceMonitor = require('./src/utils/performanceMonitor').getInstance();
const errorHandler = require('./src/utils/errorHandler').getInstance();

// Import the Express app from backend
const app = express();

// Add performance monitoring middleware (should be first)
app.use(performanceMonitor.expressMiddleware());

// Create CORS handler for standalone functions
const corsHandler = cors({ origin: true });

// CORS configuration - Allow all origins for Firebase Functions
const corsOptions = {
  origin: true, // Allow all origins in Firebase Functions
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type'],
  optionsSuccessStatus: 200,
  maxAge: 86400 // Cache preflight response for 24 hours
};

// Enable CORS with preflight support
app.use(cors(corsOptions));

// Handle preflight requests explicitly for all routes
app.options('*', cors(corsOptions));

// Additional CORS headers for all responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const workspaceRoutes = require('./src/routes/workspaceRoutes');
const userRoutes = require('./src/routes/userRoutes');
const historyRoutes = require('./src/routes/historyRoutes');
const meetingRoutes = require('./src/routes/meetingRoutes');
const teamRoutes = require('./src/routes/teamRoutes');
const objectiveRoutes = require('./src/routes/objectiveRoutes');
const taskRoutes = require('./src/routes/taskRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const capacityRoutes = require('./src/routes/capacityRoutes');
const commentRoutes = require('./src/routes/commentRoutes');
const workspaceAdminRoutes = require('./src/routes/workspaceAdminRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const agentRoutes = require('./src/routes/agentRoutes');

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Performance metrics endpoint (protected)
app.get('/metrics', (req, res) => {
  // Simple auth check - you can enhance this
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const summary = performanceMonitor.getPerformanceSummary();
  const errorStats = errorHandler.getErrorStats();
  
  res.json({
    performance: summary,
    errors: errorStats,
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/auth', authRoutes);
app.use('/workspaces', workspaceRoutes);
app.use('/admin', workspaceAdminRoutes);
app.use('/system-admin', adminRoutes);  // New system admin routes
app.use('/users', userRoutes);
app.use('/history', historyRoutes);
app.use('/meetings', meetingRoutes);
app.use('/teams', teamRoutes);
app.use('/objectives', objectiveRoutes);
app.use('/tasks', taskRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/notifications', notificationRoutes);
app.use('/capacity', capacityRoutes);
app.use('/comments', commentRoutes);
app.use('/agents', agentRoutes);

// Enhanced error handling with monitoring
app.use(errorHandler.expressMiddleware());

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Export Express app as Firebase Function with increased timeout and memory
// Declare all secrets that this function needs access to
exports.api = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes
    memory: '1GB',
    // Allow unauthenticated invocations
    invoker: 'public',
    // Declare secrets from Secret Manager
    secrets: [
      'REACT_APP_OPENAI_API_KEY',
      'REACT_APP_ANTHROPIC_API_KEY',
      'OPENAI_API_KEY1',
      'OPENAI_API_KEY2', 
      'OPENAI_API_KEY3',
      'ANTHROPIC_API_KEY1',
      'ANTHROPIC_API_KEY2',
      'ANTHROPIC_API_KEY3'
    ]
  })
  .https.onRequest((req, res) => {
    // Handle CORS preflight immediately for OPTIONS
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.set('Access-Control-Max-Age', '3600');
      return res.status(204).send('');
    }
    
    // For all other requests, use the Express app
    return app(req, res);
  });

// Get AI service helper function
function getAIService() {
  return require('./aiServiceWrapper');
}

// Trigger: When a task status changes to completed
exports.onTaskComplete = functions.firestore
  .document('tasks/{taskId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const previousData = change.before.data();
    
    // Check if task was just completed
    if (newData.status === 'completed' && previousData.status !== 'completed') {
      const taskId = context.params.taskId;
      
      // Update completion timestamp
      await change.after.ref.update({
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Create notification for task creator
      if (newData.createdBy !== newData.assigneeId) {
        await db.collection('notifications').add({
          userId: newData.createdBy,
          type: 'task_completed',
          title: 'Task Completed',
          message: `Task "${newData.title}" has been completed`,
          entityType: 'task',
          entityId: taskId,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      // Update parent objective progress if linked
      if (newData.keyResultId) {
        await updateKeyResultProgress(newData.keyResultId);
      }
      
      // Log activity
      await db.collection('activityLogs').add({
        type: 'task_completed',
        userId: newData.assigneeId,
        taskId: taskId,
        taskTitle: newData.title,
        workspaceId: newData.workspaceId,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  });

// Trigger: When a meeting is scheduled
exports.onMeetingScheduled = functions.firestore
  .document('meetings/{meetingId}')
  .onCreate(async (snap, context) => {
    const meeting = snap.data();
    const meetingId = context.params.meetingId;
    
    // Send notifications to all participants
    const notifications = meeting.participants.map(participantId => ({
      userId: participantId,
      type: 'meeting_scheduled',
      title: 'New Meeting Scheduled',
      message: `You've been invited to "${meeting.title}"`,
      entityType: 'meeting',
      entityId: meetingId,
      scheduledAt: meeting.scheduledAt,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }));
    
    // Batch create notifications
    const batch = db.batch();
    notifications.forEach(notification => {
      const docRef = db.collection('notifications').doc();
      batch.set(docRef, notification);
    });
    await batch.commit();
  });

// Trigger: Clean up presence when meeting ends
exports.onMeetingEnd = functions.firestore
  .document('meetings/{meetingId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const previousData = change.before.data();
    
    if (newData.status === 'completed' && previousData.status !== 'completed') {
      const meetingId = context.params.meetingId;
      
      // Delete all presence documents
      const presenceRef = db.collection('meetings').doc(meetingId).collection('presence');
      const snapshot = await presenceRef.get();
      
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      // Convert action items to tasks if any
      if (newData.actionItems && newData.actionItems.length > 0) {
        for (const actionItem of newData.actionItems) {
          if (actionItem.convertToTask) {
            await db.collection('tasks').add({
              title: actionItem.title,
              description: `From meeting: ${newData.title}\n\n${actionItem.description || ''}`,
              assigneeId: actionItem.assigneeId,
              createdBy: newData.organizerId,
              teamId: newData.teamId,
              workspaceId: newData.workspaceId,
              meetingId: meetingId,
              status: 'todo',
              priority: 'medium',
              dueDate: actionItem.dueDate,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }
      }
    }
  });

// Trigger: Update objective progress when key results change
exports.onKeyResultUpdate = functions.firestore
  .document('objectives/{objectiveId}/keyResults/{keyResultId}')
  .onWrite(async (change, context) => {
    const objectiveId = context.params.objectiveId;
    
    // Get all key results for this objective
    const keyResultsSnapshot = await db.collection('objectives')
      .doc(objectiveId)
      .collection('keyResults')
      .get();
    
    // Calculate average progress
    let totalProgress = 0;
    let count = 0;
    
    keyResultsSnapshot.forEach(doc => {
      const kr = doc.data();
      if (kr.targetValue && kr.currentValue !== undefined) {
        const progress = (kr.currentValue / kr.targetValue) * 100;
        totalProgress += Math.min(progress, 100);
        count++;
      }
    });
    
    const averageProgress = count > 0 ? Math.round(totalProgress / count) : 0;
    
    // Update objective progress
    await db.collection('objectives').doc(objectiveId).update({
      progress: averageProgress,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

// Scheduled function: Send meeting reminders
exports.sendMeetingReminders = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const fifteenMinutesLater = admin.firestore.Timestamp.fromDate(
      new Date(now.toDate().getTime() + 15 * 60 * 1000)
    );
    
    // Find meetings starting in the next 15 minutes
    const upcomingMeetings = await db.collection('meetings')
      .where('status', '==', 'scheduled')
      .where('scheduledAt', '>', now)
      .where('scheduledAt', '<=', fifteenMinutesLater)
      .where('reminderSent', '==', false)
      .get();
    
    const batch = db.batch();
    
    for (const doc of upcomingMeetings.docs) {
      const meeting = doc.data();
      
      // Create reminder notifications for all participants
      meeting.participants.forEach(participantId => {
        const notifRef = db.collection('notifications').doc();
        batch.set(notifRef, {
          userId: participantId,
          type: 'meeting_reminder',
          title: 'Meeting Starting Soon',
          message: `"${meeting.title}" starts in 15 minutes`,
          entityType: 'meeting',
          entityId: doc.id,
          priority: 'high',
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      
      // Mark reminder as sent
      batch.update(doc.ref, { reminderSent: true });
    }
    
    await batch.commit();
  });

// Scheduled function: Clean up old data
exports.cleanupOldData = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    
    // Delete old read notifications
    const oldNotifications = await db.collection('notifications')
      .where('read', '==', true)
      .where('createdAt', '<', thirtyDaysAgo)
      .limit(500)
      .get();
    
    const batch = db.batch();
    oldNotifications.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete old activity logs
    const oldLogs = await db.collection('activityLogs')
      .where('timestamp', '<', thirtyDaysAgo)
      .limit(500)
      .get();
    
    oldLogs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  });

// Helper function to update key result progress
async function updateKeyResultProgress(keyResultId) {
  // Find the parent objective
  const objectivesSnapshot = await db.collectionGroup('keyResults')
    .where(admin.firestore.FieldPath.documentId(), '==', keyResultId)
    .limit(1)
    .get();
  
  if (!objectivesSnapshot.empty) {
    const keyResultRef = objectivesSnapshot.docs[0].ref;
    const objectiveId = keyResultRef.parent.parent.id;
    
    // Count completed tasks for this key result
    const completedTasks = await db.collection('tasks')
      .where('keyResultId', '==', keyResultId)
      .where('status', '==', 'completed')
      .get();
    
    const totalTasks = await db.collection('tasks')
      .where('keyResultId', '==', keyResultId)
      .get();
    
    if (totalTasks.size > 0) {
      const progress = Math.round((completedTasks.size / totalTasks.size) * 100);
      
      await keyResultRef.update({
        currentValue: completedTasks.size,
        progress: progress,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  }
}

// HTTP function: Generate analytics report
exports.generateAnalytics = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = context.auth.uid;
  const { startDate, endDate, workspaceId } = data;
  
  const start = admin.firestore.Timestamp.fromDate(new Date(startDate));
  const end = admin.firestore.Timestamp.fromDate(new Date(endDate));
  
  // Build base query
  let tasksQuery = db.collection('tasks')
    .where('createdAt', '>=', start)
    .where('createdAt', '<=', end);
  
  if (workspaceId) {
    tasksQuery = tasksQuery.where('workspaceId', '==', workspaceId);
  } else {
    tasksQuery = tasksQuery.where('assigneeId', '==', userId);
  }
  
  const tasksSnapshot = await tasksQuery.get();
  
  // Calculate analytics
  const analytics = {
    totalTasks: tasksSnapshot.size,
    completedTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0,
    averageCompletionTime: 0,
    tasksByPriority: { low: 0, medium: 0, high: 0, critical: 0 },
    tasksByStatus: { todo: 0, in_progress: 0, review: 0, completed: 0 }
  };
  
  let totalCompletionTime = 0;
  let completedCount = 0;
  const now = admin.firestore.Timestamp.now();
  
  tasksSnapshot.forEach(doc => {
    const task = doc.data();
    
    // Count by status
    if (task.status) {
      analytics.tasksByStatus[task.status] = (analytics.tasksByStatus[task.status] || 0) + 1;
      
      if (task.status === 'completed') {
        analytics.completedTasks++;
        
        // Calculate completion time
        if (task.createdAt && task.completedAt) {
          const completionTime = task.completedAt.toDate() - task.createdAt.toDate();
          totalCompletionTime += completionTime;
          completedCount++;
        }
      } else if (task.status === 'in_progress') {
        analytics.inProgressTasks++;
      }
    }
    
    // Count by priority
    if (task.priority) {
      analytics.tasksByPriority[task.priority] = (analytics.tasksByPriority[task.priority] || 0) + 1;
    }
    
    // Check if overdue
    if (task.dueDate && task.dueDate < now && task.status !== 'completed') {
      analytics.overdueTasks++;
    }
  });
  
  // Calculate average completion time in days
  if (completedCount > 0) {
    analytics.averageCompletionTime = Math.round(totalCompletionTime / completedCount / (1000 * 60 * 60 * 24));
  }
  
  // Get meeting analytics
  let meetingsQuery = db.collection('meetings')
    .where('scheduledAt', '>=', start)
    .where('scheduledAt', '<=', end);
  
  if (workspaceId) {
    meetingsQuery = meetingsQuery.where('workspaceId', '==', workspaceId);
  } else {
    meetingsQuery = meetingsQuery.where('participants', 'array-contains', userId);
  }
  
  const meetingsSnapshot = await meetingsQuery.get();
  
  analytics.meetings = {
    total: meetingsSnapshot.size,
    completed: 0,
    totalDuration: 0,
    averageDuration: 0
  };
  
  meetingsSnapshot.forEach(doc => {
    const meeting = doc.data();
    if (meeting.status === 'completed') {
      analytics.meetings.completed++;
      
      if (meeting.startedAt && meeting.endedAt) {
        const duration = meeting.endedAt.toDate() - meeting.startedAt.toDate();
        analytics.meetings.totalDuration += duration;
      }
    }
  });
  
  if (analytics.meetings.completed > 0) {
    analytics.meetings.averageDuration = Math.round(
      analytics.meetings.totalDuration / analytics.meetings.completed / (1000 * 60)
    ); // in minutes
  }
  
  return analytics;
});

// Import document processor functions
const { processDocument, analyzeDocumentWithAI, convertImageToBase64, processDocumentHttp } = require('./src/documentProcessor');

// Export document processing functions
exports.processDocument = processDocument;
exports.processDocumentHttp = processDocumentHttp; // HTTP version with CORS
exports.analyzeDocumentWithAI = analyzeDocumentWithAI;
exports.convertImageToBase64 = convertImageToBase64;

// Export for testing
exports.updateKeyResultProgress = updateKeyResultProgress;