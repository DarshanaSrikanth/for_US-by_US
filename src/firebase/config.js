// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, Timestamp } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAwPiqcfwEqDJmQ0NDEYzFc27hNfFG96cM",
  authDomain: "forusbyus-f6443.firebaseapp.com",
  projectId: "forusbyus-f6443",
  storageBucket: "forusbyus-f6443.firebasestorage.app",
  messagingSenderId: "139864208980",
  appId: "1:139864208980:web:8b731764094349d98a9fc1",
  measurementId: "G-DJSSM1R9SH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true, // For better compatibility
});


export { auth, db, Timestamp };
