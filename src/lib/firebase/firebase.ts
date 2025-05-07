
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// Firebase configuration values are now hardcoded below as per user request.
// The original environment variable checks have been removed for these specific values.
// It's generally recommended to use environment variables for sensitive data in production.

const firebaseConfig = {
  apiKey: "AIzaSyCyHSmlrRvPy1fUoEBTOJo6LszdbU2TAfo",
  authDomain: "don-t-blink-studio.firebaseapp.com",
  projectId: "don-t-blink-studio",
  storageBucket: "don-t-blink-studio.appspot.com",
  messagingSenderId: "836820249384",
  appId: "1:836820249384:web:326ce6a7b0bc13e2c17e1d",
  measurementId: "G-8XGNZ17H3K"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

auth = getAuth(app);
db = getFirestore(app);
storage = getStorage(app);

export { app, auth, db, storage };

