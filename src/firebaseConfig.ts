import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, type Functions } from "firebase/functions"; // Import Firebase Functions

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, // Si utilisé
};

// Initialiser Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const functions: Functions = getFunctions(app, 'europe-west1'); // Initialize Firebase Functions
if (import.meta.env.DEV) {
  console.log("Development mode: Connecting to Firebase Emulators");

  // Emulateur d'authentification
  connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });

  // Emulateur Firestore
  connectFirestoreEmulator(db, 'localhost', 8090);

  // Emulateur Functions
  connectFunctionsEmulator(functions, "localhost", 5001);
}

export { app, auth, db, functions /*, storage */ }; // Export functions
