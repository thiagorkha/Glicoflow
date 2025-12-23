import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCDcbBYbnvvRxSmx_5X48ADugUGftmvYcQ",
  authDomain: "glicoflow.firebaseapp.com",
  projectId: "glicoflow",
  storageBucket: "glicoflow.firebasestorage.app",
  messagingSenderId: "625004802204",
  appId: "1:625004802204:web:dc148c7f35fd52f644fd59",
  measurementId: "G-7K6F61K78E"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta as instâncias para uso nos serviços
export const auth = getAuth(app);
export const db = getFirestore(app);