// src/lib/firebase.js
import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyCM5r8d_M9Ml3QrLxunqniaRm0FIH2EqZk",
  authDomain: "pulse-realty-95e9b.firebaseapp.com",
  projectId: "pulse-realty-95e9b",
  storageBucket: "pulse-realty-95e9b.firebasestorage.app",
  messagingSenderId: "137888051716",
  appId: "1:137888051716:web:0c490254e4cce79072bb51",
  measurementId: "G-CXL8W7CL1B"
};

export const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false
});
export const storage = getStorage(app);

isSupported().then(ok => { if (ok) getAnalytics(app); });


