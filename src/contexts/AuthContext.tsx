import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  signInWithGoogle,
  signOut, 
  onAuthStateChange
} from '../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface AuthUser {
  id: string;
  firebase_uid: string;
  email: string;
  name: string;
  displayName?: string;
  avatar_url?: string;
}

interface AuthContextType {
  firebaseUser: User | null;
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
  refreshToken: () => Promise<string | null>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync user with Firestore instead of backend API
  const syncUserWithFirestore = async (firebaseUser: User) => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      
      // Try to get existing user data
      const userDoc = await getDoc(userRef);
      
      const userData: AuthUser = {
        id: firebaseUser.uid,
        firebase_uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        displayName: firebaseUser.displayName || undefined,
        avatar_url: firebaseUser.photoURL || undefined
      };

      // Update or create user document
      await setDoc(userRef, {
        ...userData,
        last_login: new Date(),
        updated_at: new Date()
      }, { merge: true });

      setUser(userData);
      setError(null);
    } catch (error) {
      console.error('Failed to sync user with Firestore:', error);
      setError('Failed to sync user data');
      // Still set user data from Firebase Auth even if Firestore fails
      setUser({
        id: firebaseUser.uid,
        firebase_uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        avatar_url: firebaseUser.photoURL || undefined
      });
    }
  };

  // Sign in with Google
  const signIn = async () => {
    try {
      setError(null);
      setLoading(true);
      const result = await signInWithGoogle();
      // If result is null, it means redirect was used
      if (result && result.user) {
        await syncUserWithFirestore(result.user);
      }
      // For redirect, the result will be handled in useEffect
    } catch (error: any) {
      console.error('Sign in error:', error);
      setError(error.message || 'Failed to sign in');
      setLoading(false);
      throw error;
    }
  };

  // Get current auth token
  const getToken = async (): Promise<string | null> => {
    if (!firebaseUser) return null;
    try {
      return await firebaseUser.getIdToken();
    } catch (error) {
      console.error('Failed to get token:', error);
      return null;
    }
  };

  // Refresh auth token
  const refreshToken = async (): Promise<string | null> => {
    if (!firebaseUser) return null;
    try {
      return await firebaseUser.getIdToken(true);
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return null;
    }
  };

  // Clear error
  const clearError = () => setError(null);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        await syncUserWithFirestore(firebaseUser);
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value: AuthContextType = {
    firebaseUser,
    user,
    loading,
    error,
    signIn,
    signOut,
    getToken,
    refreshToken,
    clearError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;