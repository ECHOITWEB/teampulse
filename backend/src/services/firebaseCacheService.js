const admin = require('firebase-admin');

/**
 * Firebase Firestore 기반 캐싱 서비스
 * Redis 대신 Firestore의 메모리 캐시와 로컬 캐시를 활용
 */
class FirebaseCacheService {
  constructor() {
    // In-memory cache for Firebase Functions
    this.memoryCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
    
    // Firestore는 자체적으로 로컬 캐시 제공
    this.db = admin.firestore();
    
    // Enable Firestore offline persistence (for client SDK)
    if (typeof window !== 'undefined') {
      this.db.enablePersistence({ synchronizeTabs: true })
        .catch(err => console.error('Firestore persistence error:', err));
    }
  }
  
  /**
   * 캐시 키 생성
   */
  getCacheKey(collection, id, suffix = '') {
    return `${collection}:${id}${suffix ? ':' + suffix : ''}`;
  }
  
  /**
   * 메모리 캐시에서 가져오기
   */
  getFromMemory(key) {
    const cached = this.memoryCache.get(key);
    if (cached && cached.expiry > Date.now()) {
      this.cacheStats.hits++;
      return cached.data;
    }
    if (cached) {
      this.memoryCache.delete(key);
    }
    this.cacheStats.misses++;
    return null;
  }
  
  /**
   * 메모리 캐시에 저장
   */
  setInMemory(key, data, ttlSeconds = 300) {
    this.memoryCache.set(key, {
      data,
      expiry: Date.now() + (ttlSeconds * 1000)
    });
    this.cacheStats.sets++;
    
    // 메모리 제한 관리 (최대 1000개 항목)
    if (this.memoryCache.size > 1000) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
  }
  
  /**
   * Firestore 캐시 컬렉션 활용
   */
  async getFromFirestoreCache(key, ttlSeconds = 300) {
    try {
      const doc = await this.db.collection('_cache').doc(key).get();
      
      if (doc.exists) {
        const data = doc.data();
        const expiresAt = data.expiresAt?.toDate();
        
        if (expiresAt && expiresAt > new Date()) {
          return data.value;
        } else {
          // 만료된 캐시 삭제
          await doc.ref.delete();
        }
      }
      return null;
    } catch (error) {
      console.error('Firestore cache read error:', error);
      return null;
    }
  }
  
  /**
   * Firestore 캐시에 저장
   */
  async setInFirestoreCache(key, value, ttlSeconds = 300) {
    try {
      await this.db.collection('_cache').doc(key).set({
        value,
        expiresAt: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + ttlSeconds * 1000)
        ),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Firestore cache write error:', error);
    }
  }
  
  /**
   * 워크스페이스 캐싱
   */
  async getCachedWorkspace(workspaceId) {
    const key = this.getCacheKey('workspace', workspaceId);
    
    // 1. 메모리 캐시 확인
    const memCached = this.getFromMemory(key);
    if (memCached) return memCached;
    
    // 2. Firestore 캐시 확인
    const fsCached = await this.getFromFirestoreCache(key);
    if (fsCached) {
      this.setInMemory(key, fsCached, 300);
      return fsCached;
    }
    
    // 3. 실제 데이터 조회
    const doc = await this.db.collection('workspaces').doc(workspaceId).get();
    if (doc.exists) {
      const data = { id: doc.id, ...doc.data() };
      
      // 캐시 저장
      this.setInMemory(key, data, 600);
      await this.setInFirestoreCache(key, data, 600);
      
      return data;
    }
    
    return null;
  }
  
  /**
   * 채널 메시지 캐싱
   */
  async getCachedChannelMessages(channelId, limit = 50) {
    const key = this.getCacheKey('channel', channelId, `messages:${limit}`);
    
    // 1. 메모리 캐시 확인
    const memCached = this.getFromMemory(key);
    if (memCached) return memCached;
    
    // 2. Firestore에서 직접 조회 (Firestore 자체 캐싱 활용)
    const snapshot = await this.db.collection('messages')
      .where('channelId', '==', channelId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    
    const messages = [];
    snapshot.forEach(doc => {
      messages.push({ id: doc.id, ...doc.data() });
    });
    
    // 메모리 캐시만 저장 (메시지는 자주 변경되므로)
    this.setInMemory(key, messages, 60); // 1분 TTL
    
    return messages;
  }
  
  /**
   * 사용자 정보 캐싱
   */
  async getCachedUser(userId) {
    const key = this.getCacheKey('user', userId);
    
    // 1. 메모리 캐시 확인
    const memCached = this.getFromMemory(key);
    if (memCached) return memCached;
    
    // 2. Firestore 캐시 확인
    const fsCached = await this.getFromFirestoreCache(key, 1800);
    if (fsCached) {
      this.setInMemory(key, fsCached, 1800);
      return fsCached;
    }
    
    // 3. 실제 데이터 조회
    const doc = await this.db.collection('users').doc(userId).get();
    if (doc.exists) {
      const data = { id: doc.id, ...doc.data() };
      
      // 캐시 저장
      this.setInMemory(key, data, 1800); // 30분
      await this.setInFirestoreCache(key, data, 1800);
      
      return data;
    }
    
    return null;
  }
  
  /**
   * 캐시 무효화
   */
  async invalidateCache(pattern) {
    // 메모리 캐시 무효화
    for (const [key] of this.memoryCache) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }
    
    // Firestore 캐시 무효화
    if (pattern) {
      const snapshot = await this.db.collection('_cache')
        .where(admin.firestore.FieldPath.documentId(), '>=', pattern)
        .where(admin.firestore.FieldPath.documentId(), '<', pattern + '\uf8ff')
        .get();
      
      const batch = this.db.batch();
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      if (!snapshot.empty) {
        await batch.commit();
      }
    }
  }
  
  /**
   * 캐시 통계
   */
  getStats() {
    const hitRate = this.cacheStats.hits / 
      (this.cacheStats.hits + this.cacheStats.misses) || 0;
    
    return {
      ...this.cacheStats,
      hitRate: (hitRate * 100).toFixed(2) + '%',
      memorySize: this.memoryCache.size
    };
  }
  
  /**
   * 정기적인 캐시 정리 (Cloud Scheduler로 호출)
   */
  async cleanupExpiredCache() {
    // 메모리 캐시 정리
    const now = Date.now();
    for (const [key, value] of this.memoryCache) {
      if (value.expiry < now) {
        this.memoryCache.delete(key);
      }
    }
    
    // Firestore 캐시 정리
    const snapshot = await this.db.collection('_cache')
      .where('expiresAt', '<', admin.firestore.Timestamp.now())
      .limit(500)
      .get();
    
    if (!snapshot.empty) {
      const batch = this.db.batch();
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      console.log(`Cleaned up ${snapshot.size} expired cache entries`);
    }
  }
}

module.exports = new FirebaseCacheService();