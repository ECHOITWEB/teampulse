import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signOut as firebaseSignOut, 
  onAuthStateChanged
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Your web app's Firebase configuration
// These values should be set in your .env file
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || ""
};

// Validate required configuration
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("Firebase configuration is missing. Please check your environment variables.");
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Note: Firebase Auth v9+ automatically maintains persistence
// The auth state is persisted across browser sessions by default

// Configure Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Sign in with Google using popup (with better COOP handling)
export const signInWithGoogle = async () => {
  try {
    // Configure provider to force account selection
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    // Add additional scopes if needed
    // Note: scopes are already included by default in GoogleAuthProvider
    
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Get ID token with error handling
    let idToken = null;
    try {
      idToken = await user.getIdToken();
    } catch (tokenError) {
      console.warn('Could not get ID token, but user is authenticated:', tokenError);
    }
    
    return {
      user: user,
      idToken
    };
  } catch (error: any) {
    // Handle specific error cases
    if (error.code === 'auth/popup-closed-by-user' || 
        error.code === 'auth/cancelled-popup-request') {
      console.log('User cancelled sign in');
      return null;
    }
    
    if (error.code === 'auth/popup-blocked') {
      console.error('Popup blocked. Please allow popups for this site.');
      throw new Error('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.');
    }
    
    if (error.code === 'auth/unauthorized-domain') {
      console.error('Unauthorized domain. Please add this domain to Firebase Auth.');
      throw new Error('인증되지 않은 도메인입니다. Firebase 콘솔에서 도메인을 추가해주세요.');
    }
    
    // Handle internal assertion errors
    if (error.code === 'auth/internal-error' || 
        error.message?.includes('INTERNAL ASSERTION FAILED')) {
      console.warn('Firebase internal error, retrying authentication...');
      // Return null to allow retry
      return null;
    }
    
    // Ignore COOP warnings but continue
    if (error.message?.includes('Cross-Origin-Opener-Policy')) {
      console.warn('COOP policy warning detected, but authentication may still succeed');
      // Don't throw the error, just log it
      return null;
    }
    
    console.error('Google sign in error:', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    // Clear any cached data
    localStorage.removeItem('selectedWorkspaceId');
    sessionStorage.clear();
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

// Get current user's ID token
export const getIdToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    const token = await user.getIdToken();
    return token;
  } catch (error) {
    console.error('Get ID token error:', error);
    return null;
  }
};

// Refresh ID token
export const refreshIdToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    const token = await user.getIdToken(true);
    return token;
  } catch (error) {
    console.error('Refresh ID token error:', error);
    return null;
  }
};

// Auth state observer
export const onAuthStateChange = (callback: (user: any) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Export auth state
export const getCurrentUser = () => auth.currentUser;