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

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDntelxrvxbDGP7eWASajYPtJJUwveQ7FQ",
  authDomain: "teampulse-61474.firebaseapp.com",
  projectId: "teampulse-61474",
  storageBucket: "teampulse-61474.firebasestorage.app",
  messagingSenderId: "96569153819",
  appId: "1:96569153819:web:e488999f9d9c2cab295bbe",
  measurementId: "G-C5P674RG81"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Auth persistence is handled automatically by Firebase

// Configure Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Sign in with Google using popup
export const signInWithGoogle = async () => {
  try {
    // Clear any existing auth state
    const currentUser = auth.currentUser;
    if (currentUser) {
      await firebaseSignOut(auth);
    }
    
    // Configure provider to force account selection
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
      access_type: 'offline',
      include_granted_scopes: 'true'
    });
    
    // Sign in with popup
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Get ID token
    const idToken = await user.getIdToken();
    
    return {
      user: user,
      idToken
    };
  } catch (error: any) {
    // Handle specific error cases
    if (error.code === 'auth/popup-closed-by-user') {
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