const admin = require('firebase-admin');
const { query, collections, create, update } = require('../utils/firestore');

// Firebase authentication middleware
const firebaseAuth = async (req, res, next) => {
  try {
    // Get the ID token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    // Verify the ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      console.error('Token verification error:', error);
      if (error.code === 'auth/id-token-expired') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Get or create user in Firestore
    const users = await query(collections.users, [
      { field: 'firebase_uid', operator: '==', value: decodedToken.uid }
    ]);

    let user;
    if (users.length === 0) {
      // Create new user
      user = await create(collections.users, {
        firebase_uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.email.split('@')[0],
        avatar_url: decodedToken.picture || null,
        is_email_verified: decodedToken.email_verified || false,
        status: 'active',
        role: 'user'
      });
    } else {
      user = users[0];
      
      // Update last login
      await update(collections.users, user.id, {
        last_login_at: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Attach user and Firebase data to request
    req.user = user;
    req.firebaseUser = decodedToken;
    
    next();
  } catch (error) {
    console.error('Firebase auth error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    if (error.code === 'auth/argument-error') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Optional auth middleware (doesn't require authentication but adds user if token exists)
const optionalFirebaseAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      const users = await query(collections.users, [
        { field: 'firebase_uid', operator: '==', value: decodedToken.uid }
      ]);

      if (users.length > 0) {
        req.user = users[0];
        req.firebaseUser = decodedToken;
      }
    } catch (error) {
      // If token verification fails, continue without user
      console.log('Optional auth failed:', error.message);
    }
    
    next();
  } catch (error) {
    // If any error occurs, continue without user
    next();
  }
};

module.exports = {
  firebaseAuth,
  optionalFirebaseAuth
};