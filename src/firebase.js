import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, sendEmailVerification, applyActionCode, deleteUser } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc, addDoc, serverTimestamp, onSnapshot, orderBy, limit } from 'firebase/firestore';

const env = import.meta.env || {};

// Firebase client config. Values can be overridden in .env with VITE_FIREBASE_*.
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyDAniQjUFjHmrra6TkoJno4JqvpSC_8ews",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "case-3791e.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "case-3791e",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "351985375859",
  appId: env.VITE_FIREBASE_APP_ID || "1:351985375859:web:c1f4a99ca7e0e2e03aa806"
};

let app, auth, db;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app, env.VITE_FIREBASE_DATABASE_ID || 'case');
} catch (error) {
  console.warn("Firebase is not configured correctly. Please update src/firebase.js", error);
}

export { app, auth, db };
export { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, sendEmailVerification, applyActionCode, deleteUser };
export { doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc, addDoc, serverTimestamp, onSnapshot, orderBy, limit };
