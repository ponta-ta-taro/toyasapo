import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only if config is present (to avoid crash during build/dev without env)
// Also check if valid config exists appropriately if needed, but for now basic check
const isConfigValid = Object.values(firebaseConfig).some(v => !!v);

let app;
let db: Firestore | null = null;

if (!getApps().length && isConfigValid) {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
    } catch (e) {
        console.warn("Firebase initialization failed:", e);
    }
} else if (getApps().length) {
    app = getApp();
    db = getFirestore(app);
} else {
    console.warn("Firebase config missing. Running in offline/local-only mode.");
}

export { db };
