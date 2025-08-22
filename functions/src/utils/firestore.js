const { admin, adminDb } = require('../config/firebase-admin');

// Get Firestore instance
const db = adminDb;

// Helper functions for common database operations
const firestoreUtils = {
  // Get a reference to a collection
  collection: (collectionName) => db.collection(collectionName),

  // Get a reference to a document
  doc: (collectionName, docId) => db.collection(collectionName).doc(docId),

  // Create a new document with auto-generated ID
  create: async (collectionName, data) => {
    const docRef = await db.collection(collectionName).add({
      ...data,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    return { id: docRef.id, ...data };
  },

  // Create a document with specific ID
  createWithId: async (collectionName, docId, data) => {
    await db.collection(collectionName).doc(docId).set({
      ...data,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    return { id: docId, ...data };
  },

  // Get a document by ID
  get: async (collectionName, docId) => {
    const doc = await db.collection(collectionName).doc(docId).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() };
  },

  // Update a document
  update: async (collectionName, docId, data) => {
    await db.collection(collectionName).doc(docId).update({
      ...data,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    return { id: docId, ...data };
  },

  // Delete a document
  delete: async (collectionName, docId) => {
    await db.collection(collectionName).doc(docId).delete();
    return { id: docId };
  },

  // Query documents
  query: async (collectionName, conditions = [], orderByField = null, limitCount = null) => {
    let query = db.collection(collectionName);

    // Apply where conditions
    conditions.forEach(({ field, operator, value }) => {
      query = query.where(field, operator, value);
    });

    // Apply ordering
    if (orderByField) {
      query = query.orderBy(orderByField.field, orderByField.direction || 'asc');
    }

    // Apply limit
    if (limitCount) {
      query = query.limit(limitCount);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  // Batch operations
  batch: () => db.batch(),

  // Transaction
  runTransaction: (updateFunction) => db.runTransaction(updateFunction),

  // Server timestamp
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),

  // Array operations
  arrayUnion: (...elements) => admin.firestore.FieldValue.arrayUnion(...elements),
  arrayRemove: (...elements) => admin.firestore.FieldValue.arrayRemove(...elements),

  // Increment operation
  increment: (n) => admin.firestore.FieldValue.increment(n)
};

// Collections mapping (MySQL tables to Firestore collections)
const collections = {
  users: 'users',
  workspaces: 'workspaces',
  workspace_members: 'workspace_members',
  teams: 'teams',
  team_members: 'team_members',
  meetings: 'meetings',
  meeting_participants: 'meeting_participants',
  action_items: 'action_items',
  chat_sessions: 'chat_sessions',
  chat_messages: 'chat_messages',
  objectives: 'objectives',
  tasks: 'tasks',
  notifications: 'notifications',
  analytics_events: 'analytics_events',
  capacity_entries: 'capacity_entries'
};

module.exports = {
  db,
  ...firestoreUtils,
  collections
};