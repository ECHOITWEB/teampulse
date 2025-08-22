const { queues } = require('../config/queue');
const aiService = require('../services/aiService');
const channelService = require('../services/channelService');
const admin = require('firebase-admin');

// AI Processing Worker
queues.aiProcessing.process('process-ai-message', async (job) => {
  const { workspaceId, userId, channelId, content, aiBot, attachments } = job.data;
  
  try {
    console.log(`Processing AI job ${job.id} for channel ${channelId}`);
    
    // Process AI message
    const response = await aiService.processChatMessage(
      workspaceId,
      userId,
      channelId,
      content,
      aiBot,
      attachments || []
    );
    
    // Update job progress
    job.progress(100);
    
    return response;
  } catch (error) {
    console.error(`AI job ${job.id} failed:`, error);
    throw error;
  }
});

// Message Processing Worker
queues.messageProcessing.process('process-message', async (job) => {
  const { channelId, messageData } = job.data;
  
  try {
    console.log(`Processing message job ${job.id} for channel ${channelId}`);
    
    // Send message
    const messageId = await channelService.sendMessage(channelId, messageData);
    
    // Process mentions
    if (messageData.mentions && messageData.mentions.length > 0) {
      for (const userId of messageData.mentions) {
        await queues.notifications.add('send-notification', {
          type: 'mention',
          userId,
          channelId,
          messageId,
          from: messageData.author
        });
      }
    }
    
    // Update analytics
    await queues.analytics.add('update-analytics', {
      type: 'message',
      channelId,
      workspaceId: messageData.workspaceId,
      userId: messageData.author,
      timestamp: new Date()
    });
    
    job.progress(100);
    
    return { messageId };
  } catch (error) {
    console.error(`Message job ${job.id} failed:`, error);
    throw error;
  }
});

// Analytics Worker
queues.analytics.process('update-analytics', async (job) => {
  const { type, workspaceId, channelId, userId, timestamp } = job.data;
  
  try {
    console.log(`Processing analytics job ${job.id} for type ${type}`);
    
    const db = admin.firestore();
    const batch = db.batch();
    
    // Update workspace analytics
    if (workspaceId) {
      const workspaceStatsRef = db.collection('analytics')
        .doc(`workspace_${workspaceId}_${new Date().toISOString().split('T')[0]}`);
      
      batch.set(workspaceStatsRef, {
        workspaceId,
        date: new Date().toISOString().split('T')[0],
        [`${type}Count`]: admin.firestore.FieldValue.increment(1),
        lastActivity: timestamp || admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
    
    // Update channel analytics
    if (channelId) {
      const channelStatsRef = db.collection('analytics')
        .doc(`channel_${channelId}_${new Date().toISOString().split('T')[0]}`);
      
      batch.set(channelStatsRef, {
        channelId,
        date: new Date().toISOString().split('T')[0],
        [`${type}Count`]: admin.firestore.FieldValue.increment(1),
        lastActivity: timestamp || admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
    
    // Update user analytics
    if (userId) {
      const userStatsRef = db.collection('analytics')
        .doc(`user_${userId}_${new Date().toISOString().split('T')[0]}`);
      
      batch.set(userStatsRef, {
        userId,
        date: new Date().toISOString().split('T')[0],
        [`${type}Count`]: admin.firestore.FieldValue.increment(1),
        lastActivity: timestamp || admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
    
    await batch.commit();
    
    job.progress(100);
    
    return { success: true };
  } catch (error) {
    console.error(`Analytics job ${job.id} failed:`, error);
    throw error;
  }
});

// Notification Worker
queues.notifications.process('send-notification', async (job) => {
  const { type, userId, channelId, messageId, from } = job.data;
  
  try {
    console.log(`Processing notification job ${job.id} for user ${userId}`);
    
    const db = admin.firestore();
    
    // Create notification record
    await db.collection('notifications').add({
      type,
      userId,
      channelId,
      messageId,
      from,
      read: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // TODO: Send push notification if user has enabled them
    // This would integrate with FCM or another push service
    
    job.progress(100);
    
    return { success: true };
  } catch (error) {
    console.error(`Notification job ${job.id} failed:`, error);
    throw error;
  }
});

// File Processing Worker
queues.fileProcessing.process('process-file', async (job) => {
  const { fileUrl, fileType, workspaceId, userId, channelId } = job.data;
  
  try {
    console.log(`Processing file job ${job.id} for file ${fileUrl}`);
    
    const db = admin.firestore();
    
    // Process based on file type
    let processedData = {};
    
    if (fileType.startsWith('image/')) {
      // Image processing (thumbnails, optimization)
      processedData = {
        type: 'image',
        thumbnail: fileUrl, // TODO: Generate actual thumbnail
        optimized: fileUrl  // TODO: Optimize image
      };
    } else if (fileType === 'application/pdf') {
      // PDF processing (text extraction, preview)
      processedData = {
        type: 'pdf',
        pageCount: 1, // TODO: Get actual page count
        preview: fileUrl // TODO: Generate preview
      };
    } else if (fileType.startsWith('video/')) {
      // Video processing (thumbnail, duration)
      processedData = {
        type: 'video',
        thumbnail: fileUrl, // TODO: Generate video thumbnail
        duration: 0 // TODO: Get video duration
      };
    } else {
      // Generic file
      processedData = {
        type: 'file'
      };
    }
    
    // Update file metadata
    await db.collection('files').add({
      url: fileUrl,
      type: fileType,
      workspaceId,
      userId,
      channelId,
      processed: true,
      processedData,
      processedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    job.progress(100);
    
    return { success: true, processedData };
  } catch (error) {
    console.error(`File job ${job.id} failed:`, error);
    throw error;
  }
});

// Cleanup worker - runs periodically
setInterval(async () => {
  try {
    const stats = await require('../config/queue').QueueService.getQueueStats();
    console.log('📊 Queue Statistics:', stats);
    
    // Clean old jobs if needed
    for (const [name, stat] of Object.entries(stats)) {
      if (stat.completed > 1000 || stat.failed > 100) {
        const cleaned = await queues[name].clean(3600000); // Clean jobs older than 1 hour
        console.log(`🧹 Cleaned ${cleaned.length} jobs from ${name} queue`);
      }
    }
  } catch (error) {
    console.error('Error in cleanup worker:', error);
  }
}, 300000); // Run every 5 minutes

console.log('✅ Queue workers started');

module.exports = {
  startWorkers: () => {
    console.log('Queue workers are running...');
  }
};