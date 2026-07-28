import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA5j5MviMSpdtfQXLu4D3JckzSUfrwUMvY",
  authDomain: "aitu-attendance.firebaseapp.com",
  projectId: "aitu-attendance",
  storageBucket: "aitu-attendance.firebasestorage.app",
  messagingSenderId: "37017181725",
  appId: "1:37017181725:web:bdbd49e77c5492852530f4"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "default");