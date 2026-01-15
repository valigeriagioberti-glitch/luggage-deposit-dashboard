
// Initialize Firebase using the modular SDK
import { initializeApp } from 'firebase/app';
// Get Auth instance using the modular SDK
import { getAuth } from 'firebase/auth';
// Get Firestore instance using the modular SDK
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

console.log("VITE_FIREBASE_API_KEY =", import.meta.env.VITE_FIREBASE_API_KEY);


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
