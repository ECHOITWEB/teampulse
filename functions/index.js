const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

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

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://teampulse-61474.web.app',
    'https://teampulse-61474.firebaseapp.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

// Enable CORS with preflight support
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const workspaceRoutes = require('./src/routes/workspaceRoutes');
const chatRoutes = require('./src/routes/chatRoutes');
const userRoutes = require('./src/routes/userRoutes');
const historyRoutes = require('./src/routes/historyRoutes');
const meetingRoutes = require('./src/routes/meetingRoutes');
const teamRoutes = require('./src/routes/teamRoutes');
const objectiveRoutes = require('./src/routes/objectiveRoutes');
const taskRoutes = require('./src/routes/taskRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const aiRoutes = require('./src/routes/aiChatRoutes'); // Combined AI routes
const notificationRoutes = require('./src/routes/notificationRoutes');
const capacityRoutes = require('./src/routes/capacityRoutes');
const commentRoutes = require('./src/routes/commentRoutes');
const workspaceAdminRoutes = require('./src/routes/workspaceAdminRoutes');

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
app.use('/chat', chatRoutes);
app.use('/users', userRoutes);
app.use('/history', historyRoutes);
app.use('/meetings', meetingRoutes);
app.use('/teams', teamRoutes);
app.use('/objectives', objectiveRoutes);
app.use('/tasks', taskRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/ai', aiRoutes); // All AI functionality including chat
app.use('/notifications', notificationRoutes);
app.use('/capacity', capacityRoutes);
app.use('/comments', commentRoutes);

// Enhanced error handling with monitoring
app.use(errorHandler.expressMiddleware());

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Export Express app as Firebase Function
exports.api = functions.https.onRequest(app);

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

// Export for testing
exports.updateKeyResultProgress = updateKeyResultProgress;

// ============ AI Chat Functions ============

// HTTP Function: Process AI chat message
exports.processAIChatMessage = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = context.auth.uid;
  const { channelId, content } = data;
  
  if (!channelId || !content) {
    throw new functions.https.HttpsError('invalid-argument', 'Channel ID and content are required');
  }
  
  try {
    // Get channel information to check if AI is invited
    const channelDoc = await db.collection('channels').doc(channelId).get();
    
    if (!channelDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Channel not found');
    }
    
    const channel = channelDoc.data();
    
    if (!channel.aiBot) {
      throw new functions.https.HttpsError('failed-precondition', 'AI bot is not invited to this channel');
    }
    
    // Get AI service instance
    const aiService = getAIService();
    
    // Process the message with AI
    const response = await aiService.processChatMessage(
      channel.workspaceId,
      userId,
      channelId,
      content,
      channel.aiBot
    );
    
    return {
      success: true,
      data: response
    };
  } catch (error) {
    console.error('Error processing AI message:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', error.message || 'Failed to process AI message');
  }
});

// HTTP Function: Get AI usage statistics
exports.getAIUsageStats = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { workspaceId, startDate, endDate } = data;
  
  if (!workspaceId) {
    throw new functions.https.HttpsError('invalid-argument', 'Workspace ID is required');
  }
  
  try {
    let query = db.collection('ai_usage')
      .where('workspaceId', '==', workspaceId)
      .where('status', '==', 'success');
    
    if (startDate) {
      query = query.where('timestamp', '>=', admin.firestore.Timestamp.fromDate(new Date(startDate)));
    }
    
    if (endDate) {
      query = query.where('timestamp', '<=', admin.firestore.Timestamp.fromDate(new Date(endDate)));
    }
    
    const snapshot = await query.get();
    
    const stats = {
      totalMessages: 0,
      totalTokens: 0,
      totalCost: 0,
      byProvider: {},
      byModel: {},
      byUser: {}
    };
    
    // Get AI service for cost calculation
    const aiService = getAIService();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      
      stats.totalMessages++;
      stats.totalTokens += data.totalTokens || 0;
      
      // Calculate cost for this usage
      const cost = aiService.calculateCost(
        data.provider,
        data.model,
        data.inputTokens || 0,
        data.outputTokens || 0
      );
      stats.totalCost += cost.totalCost;
      
      // Group by provider
      if (!stats.byProvider[data.provider]) {
        stats.byProvider[data.provider] = {
          messages: 0,
          tokens: 0,
          cost: 0
        };
      }
      stats.byProvider[data.provider].messages++;
      stats.byProvider[data.provider].tokens += data.totalTokens || 0;
      stats.byProvider[data.provider].cost += cost.totalCost;
      
      // Group by model
      if (!stats.byModel[data.model]) {
        stats.byModel[data.model] = {
          messages: 0,
          tokens: 0,
          cost: 0
        };
      }
      stats.byModel[data.model].messages++;
      stats.byModel[data.model].tokens += data.totalTokens || 0;
      stats.byModel[data.model].cost += cost.totalCost;
      
      // Group by user
      if (!stats.byUser[data.userId]) {
        stats.byUser[data.userId] = {
          messages: 0,
          tokens: 0,
          cost: 0
        };
      }
      stats.byUser[data.userId].messages++;
      stats.byUser[data.userId].tokens += data.totalTokens || 0;
      stats.byUser[data.userId].cost += cost.totalCost;
    });
    
    return stats;
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    throw new functions.https.HttpsError('internal', 'Failed to fetch usage statistics');
  }
});

// Firestore Trigger: Process AI mentions in messages
exports.onMessageWithAIMention = functions.firestore
  .document('messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const messageId = context.params.messageId;
    
    // Check if message contains @AI mention and is not from AI itself
    if (message.content && 
        message.content.toLowerCase().includes('@ai') && 
        !message.isAI && 
        message.author !== 'system') {
      
      try {
        // Get channel information
        const channelDoc = await db.collection('channels').doc(message.channelId).get();
        
        if (!channelDoc.exists || !channelDoc.data().aiBot) {
          return; // AI not invited to this channel
        }
        
        const channel = channelDoc.data();
        
        // Get AI service instance
        const aiService = getAIService();
        
        // Extract content after @AI mention
        const aiContent = message.content.replace(/^.*@ai\s*/i, '').trim();
        
        // Process the message with AI
        await aiService.processChatMessage(
          channel.workspaceId,
          message.author,
          message.channelId,
          aiContent,
          channel.aiBot
        );
      } catch (error) {
        console.error('Error processing AI mention:', error);
        
        // Send error message to channel
        await db.collection('messages').add({
          channelId: message.channelId,
          content: '죄송합니다. AI 응답 처리 중 오류가 발생했습니다.',
          author: 'system',
          authorName: 'System',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          isError: true
        });
      }
    }
  });