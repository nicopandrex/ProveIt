import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration - Authentication + Database
const firebaseConfig = {
  apiKey: "AIzaSyAJBiSkn5R0iCpZ4FOkv7CBl7H6WIxfWM8",
  authDomain: "test-d72d4.firebaseapp.com",
  projectId: "test-d72d4",
  storageBucket: "test-d72d4.firebasestorage.app",
  messagingSenderId: "859645866277",
  appId: "1:859645866277:web:114b3414610a6e6fadeacc",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services - Authentication + Database
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
