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
  FacebookAuthProvider,
  OAuthProvider,
  User as FirebaseUser,
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
      console.log('Firebase Config:', firebaseConfig); // Debug line
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

const convertFirebaseUserToAppUser = (firebaseUser: FirebaseUser, provider: string): User => {
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || 'User',
    email: firebaseUser.email || '',
    provider: provider as 'google' | 'facebook' | 'apple',
  };
};

export const authService = {
  loginWithGoogle: async (): Promise<User> => {
    const { auth: authInstance } = initializeFirebase();
    if (!authInstance) throw new Error('Auth not initialized');

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');

      const result = await signInWithPopup(authInstance, provider);
      const user = convertFirebaseUserToAppUser(result.user, 'google');
      return user;
    } catch (error: any) {
      console.error('Google login error:', error);
      throw new Error(error.message || 'Google login failed');
    }
  },

  loginWithFacebook: async (): Promise<User> => {
    const { auth: authInstance } = initializeFirebase();
    if (!authInstance) throw new Error('Auth not initialized');

    try {
      const provider = new FacebookAuthProvider();
      provider.addScope('email');
      provider.addScope('public_profile');

      const result = await signInWithPopup(authInstance, provider);
      const user = convertFirebaseUserToAppUser(result.user, 'facebook');
      return user;
    } catch (error: any) {
      console.error('Facebook login error:', error);
      throw new Error(error.message || 'Facebook login failed');
    }
  },

  loginWithApple: async (): Promise<User> => {
    const { auth: authInstance } = initializeFirebase();
    if (!authInstance) throw new Error('Auth not initialized');

    try {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');

      const result = await signInWithPopup(authInstance, provider);
      const user = convertFirebaseUserToAppUser(result.user, 'apple');
      return user;
    } catch (error: any) {
      console.error('Apple login error:', error);
      throw new Error(error.message || 'Apple login failed');
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
      const unsubscribe = onAuthStateChanged(authInstance, (firebaseUser) => {
        unsubscribe();
        if (firebaseUser) {
          // Determine provider from metadata
          const provider =
            firebaseUser.providerData?.[0]?.providerId?.split('.')?.[0] || 'google';
          const user = convertFirebaseUserToAppUser(firebaseUser, provider);
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

    return onAuthStateChanged(authInstance, (firebaseUser) => {
      if (firebaseUser) {
        const provider =
          firebaseUser.providerData?.[0]?.providerId?.split('.')?.[0] || 'google';
        const user = convertFirebaseUserToAppUser(firebaseUser, provider);
        callback(user);
      } else {
        callback(null);
      }
    });
  },
};
