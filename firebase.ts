import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAuir_9-oi6qn29lAJbF7y3EF7NEDBUAPw",
  authDomain: "luggage-deposit-dashboard.firebaseapp.com",
  projectId: "luggage-deposit-dashboard",
  storageBucket: "luggage-deposit-dashboard.firebasestorage.app",
  messagingSenderId: "746584809132",
  appId: "1:746584809132:web:ba192efb8ebac668dcc909",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
