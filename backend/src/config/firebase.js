const admin = require('firebase-admin');
const { Firestore } = require('@google-cloud/firestore');

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      console.log('Firebase Admin SDK already initialized');
      return;
    }
    
    // In Firebase Functions, the SDK is initialized automatically
    if (process.env.FUNCTIONS_EMULATOR || process.env.K_SERVICE) {
      // Running in Firebase Functions - SDK is auto-initialized
      console.log('Firebase Admin SDK auto-initialized in Functions environment');
    } else {
      // For local development, use service account file
      try {
        const serviceAccount = require('./serviceAccountKey.json');
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id
        });
        console.log('Firebase Admin SDK initialized with service account');
      } catch (error) {
        // Fallback to default initialization
        admin.initializeApp();
        console.log('Firebase Admin SDK initialized with default credentials');
      }
    }
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    throw error;
  }
};

// Verify Firebase ID token
const verifyIdToken = async (idToken) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    throw error;
  }
};

// Get or create user
const getOrCreateUser = async (firebaseUser) => {
  try {
    // Check if user exists
    const userRecord = await admin.auth().getUser(firebaseUser.uid);
    
    return {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      emailVerified: userRecord.emailVerified,
      phoneNumber: userRecord.phoneNumber,
      disabled: userRecord.disabled,
      metadata: userRecord.metadata
    };
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      // Create user if not exists
      const userRecord = await admin.auth().createUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        emailVerified: firebaseUser.emailVerified
      });
      
      return {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        emailVerified: userRecord.emailVerified,
        phoneNumber: userRecord.phoneNumber,
        disabled: userRecord.disabled,
        metadata: userRecord.metadata
      };
    }
    throw error;
  }
};

// Set custom claims for user (for roles)
const setCustomUserClaims = async (uid, claims) => {
  try {
    await admin.auth().setCustomUserClaims(uid, claims);
    return true;
  } catch (error) {
    console.error('Error setting custom claims:', error);
    throw error;
  }
};

// Delete user
const deleteUser = async (uid) => {
  try {
    await admin.auth().deleteUser(uid);
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

// Generate custom token (for testing or special cases)
const createCustomToken = async (uid, claims = {}) => {
  try {
    const customToken = await admin.auth().createCustomToken(uid, claims);
    return customToken;
  } catch (error) {
    console.error('Error creating custom token:', error);
    throw error;
  }
};

// Initialize on module load
initializeFirebase();

// Initialize Firestore
const db = admin.firestore();

// Configure Firestore settings
db.settings({
  ignoreUndefinedProperties: true,
  timestampsInSnapshots: true
});

// Helper function to convert Firestore timestamps
const convertTimestamp = (timestamp) => {
  if (!timestamp) return null;
  return timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
};

// Firestore collection references
const collections = {
  users: db.collection('users'),
  teams: db.collection('teams'),
  tasks: db.collection('tasks'),
  objectives: db.collection('objectives'),
  meetings: db.collection('meetings'),
  workspaces: db.collection('workspaces')
};

module.exports = {
  admin,
  db,
  collections,
  convertTimestamp,
  verifyIdToken,
  getOrCreateUser,
  setCustomUserClaims,
  deleteUser,
  createCustomToken
};