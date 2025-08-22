const admin = require('firebase-admin');
const { PubSub } = require('@google-cloud/pubsub');

/**
 * Firebase 호환 큐 서비스
 * Cloud Tasks 또는 Pub/Sub 사용
 */
class FirebaseQueueService {
  constructor() {
    this.db = admin.firestore();
    
    // Pub/Sub 클라이언트 (Firebase 프로젝트와 연동)
    try {
      this.pubsub = new PubSub();
      this.topics = {
        aiProcessing: 'ai-processing',
        messageProcessing: 'message-processing',
        analytics: 'analytics',
        notifications: 'notifications'
      };
    } catch (error) {
      console.log('Pub/Sub not available, using Firestore queue fallback');
      this.pubsub = null;
    }
  }
  
  /**
   * Firestore 기반 큐 (Pub/Sub 사용 불가 시 폴백)
   */
  async addToFirestoreQueue(queueName, data, options = {}) {
    const jobData = {
      queue: queueName,
      data,
      status: 'pending',
      priority: options.priority || 0,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      scheduledFor: options.delay 
        ? admin.firestore.Timestamp.fromMillis(Date.now() + options.delay)
        : admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await this.db.collection('_queues').add(jobData);
    
    return {
      id: docRef.id,
      queue: queueName
    };
  }
  
  /**
   * AI 처리 작업 추가
   */
  async addAIJob(data, options = {}) {
    if (this.pubsub) {
      try {
        const topic = this.pubsub.topic(this.topics.aiProcessing);
        const messageId = await topic.publish(Buffer.from(JSON.stringify({
          ...data,
          timestamp: Date.now(),
          priority: options.priority || 0
        })));
        
        return { id: messageId, queue: 'ai-processing' };
      } catch (error) {
        console.error('Pub/Sub publish failed, using Firestore queue:', error);
      }
    }
    
    // Firestore 큐 폴백
    return this.addToFirestoreQueue('ai-processing', data, options);
  }
  
  /**
   * 메시지 처리 작업 추가
   */
  async addMessageJob(data, options = {}) {
    if (this.pubsub) {
      try {
        const topic = this.pubsub.topic(this.topics.messageProcessing);
        const messageId = await topic.publish(Buffer.from(JSON.stringify(data)));
        return { id: messageId, queue: 'message-processing' };
      } catch (error) {
        console.error('Pub/Sub publish failed:', error);
      }
    }
    
    return this.addToFirestoreQueue('message-processing', data, options);
  }
  
  /**
   * 분석 작업 추가
   */
  async addAnalyticsJob(data, options = {}) {
    // 분석은 배치 처리를 위해 Firestore에 저장
    const analyticsData = {
      ...data,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      processed: false
    };
    
    await this.db.collection('_analytics_queue').add(analyticsData);
    
    return { queue: 'analytics', status: 'queued' };
  }
  
  /**
   * 알림 작업 추가
   */
  async addNotificationJob(data, options = {}) {
    // FCM (Firebase Cloud Messaging) 직접 사용
    if (data.type === 'push' && data.fcmToken) {
      try {
        const message = {
          token: data.fcmToken,
          notification: {
            title: data.title,
            body: data.body
          },
          data: data.metadata || {}
        };
        
        const response = await admin.messaging().send(message);
        return { id: response, queue: 'notifications', status: 'sent' };
      } catch (error) {
        console.error('FCM send failed:', error);
      }
    }
    
    // 일반 알림은 Firestore에 저장
    const notificationRef = await this.db.collection('notifications').add({
      ...data,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { id: notificationRef.id, queue: 'notifications' };
  }
  
  /**
   * Firestore 큐 처리 (Cloud Functions에서 호출)
   * Cloud Scheduler 또는 Firestore 트리거로 실행
   */
  async processFirestoreQueue(queueName, processor) {
    const snapshot = await this.db.collection('_queues')
      .where('queue', '==', queueName)
      .where('status', '==', 'pending')
      .where('scheduledFor', '<=', admin.firestore.Timestamp.now())
      .orderBy('scheduledFor', 'asc')
      .orderBy('priority', 'desc')
      .limit(10)
      .get();
    
    const results = [];
    
    for (const doc of snapshot.docs) {
      const job = { id: doc.id, ...doc.data() };
      
      // 작업을 처리 중으로 표시
      await doc.ref.update({
        status: 'processing',
        startedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      try {
        // 프로세서 실행
        const result = await processor(job);
        
        // 성공으로 표시
        await doc.ref.update({
          status: 'completed',
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
          result
        });
        
        results.push({ id: job.id, success: true, result });
      } catch (error) {
        // 실패 처리
        const attempts = job.attempts + 1;
        
        if (attempts >= job.maxAttempts) {
          // 최대 재시도 횟수 초과
          await doc.ref.update({
            status: 'failed',
            failedAt: admin.firestore.FieldValue.serverTimestamp(),
            error: error.message,
            attempts
          });
        } else {
          // 재시도 스케줄
          const backoffDelay = Math.min(1000 * Math.pow(2, attempts), 60000);
          await doc.ref.update({
            status: 'pending',
            attempts,
            lastError: error.message,
            scheduledFor: admin.firestore.Timestamp.fromMillis(
              Date.now() + backoffDelay
            )
          });
        }
        
        results.push({ id: job.id, success: false, error: error.message });
      }
    }
    
    return results;
  }
  
  /**
   * 배치 분석 처리 (Cloud Scheduler로 호출)
   */
  async processBatchAnalytics() {
    const snapshot = await this.db.collection('_analytics_queue')
      .where('processed', '==', false)
      .limit(500)
      .get();
    
    if (snapshot.empty) return;
    
    const batch = this.db.batch();
    const analytics = {};
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const date = new Date().toISOString().split('T')[0];
      
      // 워크스페이스별 집계
      if (data.workspaceId) {
        const key = `workspace_${data.workspaceId}_${date}`;
        if (!analytics[key]) {
          analytics[key] = {
            workspaceId: data.workspaceId,
            date,
            messageCount: 0,
            aiUsageCount: 0,
            activeUsers: new Set()
          };
        }
        
        if (data.type === 'message') analytics[key].messageCount++;
        if (data.type === 'ai_usage') analytics[key].aiUsageCount++;
        if (data.userId) analytics[key].activeUsers.add(data.userId);
      }
      
      // 처리 완료 표시
      batch.update(doc.ref, { processed: true });
    });
    
    // 집계 데이터 저장
    for (const [key, data] of Object.entries(analytics)) {
      const statsRef = this.db.collection('analytics').doc(key);
      batch.set(statsRef, {
        ...data,
        activeUserCount: data.activeUsers.size,
        activeUsers: Array.from(data.activeUsers),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
    
    await batch.commit();
    
    console.log(`Processed ${snapshot.size} analytics events`);
  }
  
  /**
   * 큐 상태 조회
   */
  async getQueueStats() {
    const stats = {};
    
    // Firestore 큐 상태
    const queues = ['ai-processing', 'message-processing', 'notifications'];
    
    for (const queueName of queues) {
      const [pending, processing, completed, failed] = await Promise.all([
        this.db.collection('_queues').where('queue', '==', queueName)
          .where('status', '==', 'pending').count().get(),
        this.db.collection('_queues').where('queue', '==', queueName)
          .where('status', '==', 'processing').count().get(),
        this.db.collection('_queues').where('queue', '==', queueName)
          .where('status', '==', 'completed')
          .where('completedAt', '>', admin.firestore.Timestamp.fromDate(
            new Date(Date.now() - 3600000)
          )).count().get(),
        this.db.collection('_queues').where('queue', '==', queueName)
          .where('status', '==', 'failed').count().get()
      ]);
      
      stats[queueName] = {
        pending: pending.data().count,
        processing: processing.data().count,
        completed: completed.data().count,
        failed: failed.data().count
      };
    }
    
    // 분석 큐 상태
    const analyticsQueue = await this.db.collection('_analytics_queue')
      .where('processed', '==', false).count().get();
    
    stats.analytics = {
      pending: analyticsQueue.data().count
    };
    
    return stats;
  }
  
  /**
   * 오래된 작업 정리
   */
  async cleanupOldJobs(olderThanHours = 24) {
    const cutoffTime = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - olderThanHours * 3600000)
    );
    
    // 완료된 작업 삭제
    const completedSnapshot = await this.db.collection('_queues')
      .where('status', '==', 'completed')
      .where('completedAt', '<', cutoffTime)
      .limit(500)
      .get();
    
    // 실패한 작업 삭제 (7일 이상)
    const failedSnapshot = await this.db.collection('_queues')
      .where('status', '==', 'failed')
      .where('failedAt', '<', admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - 7 * 24 * 3600000)
      ))
      .limit(500)
      .get();
    
    const batch = this.db.batch();
    let deleteCount = 0;
    
    completedSnapshot.forEach(doc => {
      batch.delete(doc.ref);
      deleteCount++;
    });
    
    failedSnapshot.forEach(doc => {
      batch.delete(doc.ref);
      deleteCount++;
    });
    
    if (deleteCount > 0) {
      await batch.commit();
      console.log(`Cleaned up ${deleteCount} old queue jobs`);
    }
    
    return deleteCount;
  }
}

module.exports = new FirebaseQueueService();