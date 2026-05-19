import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDqDIMVWBTFVBjbHzOVybHi7HQI1CcH4k8",
  authDomain: "kobi-export-ai.firebaseapp.com",
  projectId: "kobi-export-ai",
  storageBucket: "kobi-export-ai.firebasestorage.app",
  messagingSenderId: "862003645353",
  appId: "1:862003645353:web:4a86ba9c3ec1f4889912b8"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);