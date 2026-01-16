import {
  initializeApp,
  FirebaseApp,
} from 'firebase/app';
import {
  getAuth,
  Auth,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  Unsubscribe,
  GoogleAuthProvider,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { User } from '../types';

// Initialize Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

  const initializeFirebase = () => {
    if (!app) {
      try {
        if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
          throw new Error('Firebase configuration is incomplete');
        }
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
      } catch (error) {
        console.error('Firebase initialization error:', error);
        throw new Error('Firebase is not properly configured. Please check your environment variables.');
      }
    }
    return { app, auth };
  };

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const convertFirebaseUserToAppUser = async (firebaseUser: FirebaseUser, provider: string): Promise<User> => {
  try {
    // Register/sync user with backend database
    const response = await fetch(`${API_URL}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: firebaseUser.displayName || 'User',
        provider: provider
      })
    });

    if (!response.ok) {
      throw new Error('Failed to sync user with database');
    }

    const userData = await response.json();
    
    return {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      provider: userData.provider as 'google' | 'email',
      credits: userData.credits,
    };
  } catch (error) {
    console.error('Error syncing user with database:', error);
    // Fallback to basic user without credits from DB
    return {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || 'User',
      email: firebaseUser.email || '',
      provider: provider as 'google' | 'email',
      credits: 0,
    };
  }
};

export const authService = {
  registerWithEmail: async (email: string, password: string, displayName: string): Promise<User> => {
    const { auth: authInstance } = initializeFirebase();
    if (!authInstance) throw new Error('Auth not initialized');

    try {
      // Create user account
      const result = await createUserWithEmailAndPassword(authInstance, email, password);
      
      // Update display name
      await updateProfile(result.user, { displayName });
      
      const user = await convertFirebaseUserToAppUser(result.user, 'email');
      return user;
    } catch (error: any) {
      console.error('Email registration error:', error);
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password should be at least 6 characters');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address');
      }
      throw new Error(error.message || 'Registration failed');
    }
  },

  loginWithEmail: async (email: string, password: string): Promise<User> => {
    const { auth: authInstance } = initializeFirebase();
    if (!authInstance) throw new Error('Auth not initialized');

    try {
      const result = await signInWithEmailAndPassword(authInstance, email, password);
      const user = await convertFirebaseUserToAppUser(result.user, 'email');
      return user;
    } catch (error: any) {
      console.error('Email login error:', error);
      if (error.code === 'auth/user-not-found') {
        throw new Error('Email not found. Please register first.');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address');
      }
      throw new Error(error.message || 'Login failed');
    }
  },

  loginWithGoogle: async (): Promise<User> => {
    const { auth: authInstance } = initializeFirebase();
    if (!authInstance) throw new Error('Auth not initialized');

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');

      const result = await signInWithPopup(authInstance, provider);
      const user = await convertFirebaseUserToAppUser(result.user, 'google');
      return user;
    } catch (error: any) {
      console.error('Google login error:', error);
      throw new Error(error.message || 'Google login failed');
    }
  },

  logout: async (): Promise<void> => {
    const { auth: authInstance } = initializeFirebase();
    if (!authInstance) throw new Error('Auth not initialized');

    try {
      await signOut(authInstance);
    } catch (error: any) {
      console.error('Logout error:', error);
      throw new Error(error.message || 'Logout failed');
    }
  },

  getCurrentUser: async (): Promise<User | null> => {
    const { auth: authInstance } = initializeFirebase();
    if (!authInstance) return null;

    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(authInstance, async (firebaseUser) => {
        unsubscribe();
        if (firebaseUser) {
          // Determine provider from metadata
          const provider =
            firebaseUser.providerData?.[0]?.providerId?.split('.')?.[0] || 'google';
          const user = await convertFirebaseUserToAppUser(firebaseUser, provider);
          resolve(user);
        } else {
          resolve(null);
        }
      });
    });
  },

  onAuthStateChanged: (callback: (user: User | null) => void): Unsubscribe => {
    const { auth: authInstance } = initializeFirebase();
    if (!authInstance) return () => {};

    return onAuthStateChanged(authInstance, async (firebaseUser) => {
      if (firebaseUser) {
        const provider =
          firebaseUser.providerData?.[0]?.providerId?.split('.')?.[0] || 'google';
        const user = await convertFirebaseUserToAppUser(firebaseUser, provider);
        callback(user);
      } else {
        callback(null);
      }
    });
  },
};
