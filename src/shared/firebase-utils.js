import { 
  collection, 
  doc, 
  serverTimestamp,
  Timestamp,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc
} from 'firebase/firestore';
import { 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Import already initialized Firebase instances from config
import { db, auth, storage } from '../config/firebase';

// Collection names constants
export const COLLECTIONS = {
  USERS: 'users',
  TEAMS: 'teams',
  WORKSPACES: 'workspaces',
  TASKS: 'tasks',
  OBJECTIVES: 'objectives',
  KEY_RESULTS: 'keyResults',
  MEETINGS: 'meetings',
  MEETING_NOTES: 'meetingNotes',
  COMMENTS: 'comments',
  NOTIFICATIONS: 'notifications',
  ACTIVITY_LOGS: 'activityLogs'
};

// Helper to create timestamps
export const createTimestamps = () => ({
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
});

// Helper to update timestamp
export const updateTimestamp = () => ({
  updatedAt: serverTimestamp()
});

// Generic CRUD operations
export class FirebaseCollection {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.collectionRef = collection(db, collectionName);
  }

  // Create document
  async create(data) {
    try {
      const docData = {
        ...data,
        ...createTimestamps()
      };
      const docRef = await addDoc(this.collectionRef, docData);
      return { id: docRef.id, ...docData };
    } catch (error) {
      console.error(`Error creating ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Create with specific ID
  async createWithId(id, data) {
    try {
      const docData = {
        ...data,
        ...createTimestamps()
      };
      await setDoc(doc(this.collectionRef, id), docData);
      return { id, ...docData };
    } catch (error) {
      console.error(`Error creating ${this.collectionName} with ID:`, error);
      throw error;
    }
  }

  // Read single document
  async getById(id) {
    try {
      const docSnap = await getDoc(doc(this.collectionRef, id));
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error(`Error getting ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Update document
  async update(id, data) {
    try {
      const updateData = {
        ...data,
        ...updateTimestamp()
      };
      await updateDoc(doc(this.collectionRef, id), updateData);
      return { id, ...updateData };
    } catch (error) {
      console.error(`Error updating ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Delete document
  async delete(id) {
    try {
      await deleteDoc(doc(this.collectionRef, id));
      return true;
    } catch (error) {
      console.error(`Error deleting ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Query documents
  async query(constraints = []) {
    try {
      const q = query(this.collectionRef, ...constraints);
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(`Error querying ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Real-time subscription to single document
  subscribe(id, callback, onError) {
    const docRef = doc(this.collectionRef, id);
    return onSnapshot(
      docRef,
      (doc) => {
        if (doc.exists()) {
          callback({ id: doc.id, ...doc.data() });
        } else {
          callback(null);
        }
      },
      onError || ((error) => console.error(`Subscription error:`, error))
    );
  }

  // Real-time subscription to query
  subscribeToQuery(constraints = [], callback, onError) {
    const q = query(this.collectionRef, ...constraints);
    return onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(docs);
      },
      onError || ((error) => console.error(`Query subscription error:`, error))
    );
  }
}

// Batch operations helper
export const batchOperations = async (operations) => {
  const batch = writeBatch(db);
  
  operations.forEach(({ type, ref, data }) => {
    switch (type) {
      case 'set':
        batch.set(ref, data);
        break;
      case 'update':
        batch.update(ref, data);
        break;
      case 'delete':
        batch.delete(ref);
        break;
    }
  });
  
  await batch.commit();
};

// File upload helper
export const uploadFile = async (file, path) => {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return {
      path: snapshot.ref.fullPath,
      url: downloadURL,
      metadata: snapshot.metadata
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// Common query helpers
export const queryHelpers = {
  byUser: (userId) => where('userId', '==', userId),
  byTeam: (teamId) => where('teamId', '==', teamId),
  byWorkspace: (workspaceId) => where('workspaceId', '==', workspaceId),
  byStatus: (status) => where('status', '==', status),
  byDateRange: (field, startDate, endDate) => [
    where(field, '>=', Timestamp.fromDate(startDate)),
    where(field, '<=', Timestamp.fromDate(endDate))
  ],
  orderByCreated: (direction = 'desc') => orderBy('createdAt', direction),
  orderByUpdated: (direction = 'desc') => orderBy('updatedAt', direction),
  limitTo: (count) => limit(count)
};

// Subcollection helper
export class SubCollection {
  constructor(parentCollection, parentId, subCollectionName) {
    this.path = `${parentCollection}/${parentId}/${subCollectionName}`;
    this.collectionRef = collection(db, parentCollection, parentId, subCollectionName);
  }

  async create(data) {
    try {
      const docData = {
        ...data,
        ...createTimestamps()
      };
      const docRef = await addDoc(this.collectionRef, docData);
      return { id: docRef.id, ...docData };
    } catch (error) {
      console.error(`Error creating subcollection document:`, error);
      throw error;
    }
  }

  async getAll() {
    try {
      const snapshot = await getDocs(this.collectionRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(`Error getting subcollection:`, error);
      throw error;
    }
  }

  subscribe(callback, onError) {
    return onSnapshot(
      this.collectionRef,
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(docs);
      },
      onError || ((error) => console.error(`Subcollection subscription error:`, error))
    );
  }
}

// Presence system for real-time collaboration
export class PresenceSystem {
  constructor(collectionPath) {
    this.presenceRef = collection(db, collectionPath, 'presence');
  }

  async setPresence(userId, data) {
    const presenceData = {
      userId,
      ...data,
      lastSeen: serverTimestamp()
    };
    await setDoc(doc(this.presenceRef, userId), presenceData);
  }

  async removePresence(userId) {
    await deleteDoc(doc(this.presenceRef, userId));
  }

  subscribeToPresence(callback) {
    return onSnapshot(this.presenceRef, (snapshot) => {
      const activeUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(activeUsers);
    });
  }
}

// Activity logger
export const logActivity = async (activity) => {
  const activityCollection = new FirebaseCollection(COLLECTIONS.ACTIVITY_LOGS);
  await activityCollection.create({
    ...activity,
    timestamp: serverTimestamp()
  });
};

// Export query constraints for easy use
export { where, orderBy, limit, query };

// Auth state observer
export const observeAuthState = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Simplified auth functions
export const signIn = async (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const signUp = async (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const logOut = async () => {
  return signOut(auth);
};

// Re-export Firebase instances
export { db, auth, storage };

// Export individual items for named imports
export { doc, serverTimestamp };

export default {
  db,
  auth,
  storage,
  FirebaseCollection,
  SubCollection,
  PresenceSystem,
  batchOperations,
  uploadFile,
  queryHelpers,
  logActivity,
  observeAuthState,
  doc,
  serverTimestamp
};