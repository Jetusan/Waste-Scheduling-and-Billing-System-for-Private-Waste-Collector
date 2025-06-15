// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCVqP8D3Y7wN7M2zCnbGXDqBm-3worajRc",
  authDomain: "jetusanwasteauth.firebaseapp.com",
  projectId: "jetusanwasteauth",
  storageBucket: "jetusanwasteauth.firebasestorage.app",
  messagingSenderId: "1095793246202",
  appId: "1:1095793246202:web:7f045a8e441cfdfb616e43"
};

// Initialize Firebase
export const FIREBASE_APP = initializeApp(firebaseConfig);
export const FIREBASE_AUTH = getAuth(FIREBASE_APP);