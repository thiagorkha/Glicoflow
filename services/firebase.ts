// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCDcbBYbnvvRxSmx_5X48ADugUGftmvYcQ",
  authDomain: "glicoflow.firebaseapp.com",
  projectId: "glicoflow",
  storageBucket: "glicoflow.firebasestorage.app",
  messagingSenderId: "625004802204",
  appId: "1:625004802204:web:dc148c7f35fd52f644fd59",
  measurementId: "G-7K6F61K78E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);