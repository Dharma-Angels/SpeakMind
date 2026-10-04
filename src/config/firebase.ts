import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, enableIndexedDbPersistence } from 'firebase/firestore'
import Logger from '../utils/Logger'

// Your web app's Firebase configuration
const rawApiKey = import.meta.env.VITE_FIREBASE_API_KEY
export const isFirebaseConfigured = Boolean(
  rawApiKey &&
  rawApiKey !== 'your-api-key' &&
  !rawApiKey.includes('your-') &&
  String(rawApiKey).trim() !== ''
)

// Fallback demo config to prevent crashes when .env is not yet configured
const firebaseConfig = {
  apiKey: isFirebaseConfigured ? rawApiKey : 'AIzaSySpeakMindDemoDummyKey00000000000',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'speakmind-demo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'speakmind-demo',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'speakmind-demo.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789012:web:demo123456',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-DEMO1234'
}

// Basic runtime validation for clearer local setup errors (development only)
if (import.meta.env.DEV) {
  if (!isFirebaseConfigured) {
    // eslint-disable-next-line no-console
    console.warn(
      '[Firebase] Running in Demo/Fallback mode. Firebase credentials not configured in .env. To enable live Firebase Auth & Firestore sync, configure VITE_FIREBASE_* in .env'
    )
  }
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app)

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app)

// Enable offline persistence for better UX (only if configured)
if (typeof window !== 'undefined' && isFirebaseConfigured) {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.warn('[Firebase] Persistence failed: Multiple tabs open')
    } else if (err.code === 'unimplemented') {
      // The current browser doesn't support persistence
      console.warn('[Firebase] Persistence not supported by browser')
    }
  })
}

// Connect to emulators in development (optional)
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099')
  connectFirestoreEmulator(db, 'localhost', 8080)
  Logger.info('[Firebase] Connected to emulators')
}

export default app
