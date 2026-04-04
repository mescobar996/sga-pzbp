import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDtONToOsf8Qp-gIgdf-qDRdgyMnBhOZA0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "project-b8788e8d-2d5c-46f9-a80.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "project-b8788e8d-2d5c-46f9-a80",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "project-b8788e8d-2d5c-46f9-a80.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "460900325662",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:460900325662:web:dbb62f1edb40fffb28d10f",
};

const app = initializeApp(firebaseConfig);

// Database ID: ai-studio-b794c53b-a898-4b3b-a5b0-4f8cfb63fa64 (NOT default)
const rawDbId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-b794c53b-a898-4b3b-a5b0-4f8cfb63fa64";
const firestoreDatabaseId = rawDbId.trim();
console.log('[Firebase] Initializing with database ID:', firestoreDatabaseId);
console.log('[Firebase] Project:', firebaseConfig.projectId);
export const db = getFirestore(app, firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
