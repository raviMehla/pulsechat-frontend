// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getMessaging } from "firebase/messaging";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA6_9ps0m7PwuTuSwHTfE8IfGuSOWWg_rA",
  authDomain: "pulsechat-0001.firebaseapp.com",
  projectId: "pulsechat-0001",
  storageBucket: "pulsechat-0001.firebasestorage.app",
  messagingSenderId: "792322280630",
  appId: "1:792322280630:web:07d1fb2a39da138e36ea17",
  measurementId: "G-EB06KB2FF2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);
const analytics = getAnalytics(app);