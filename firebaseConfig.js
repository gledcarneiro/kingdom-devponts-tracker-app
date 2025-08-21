import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Configurações do Firebase
export const firebaseConfig = {
  apiKey: "AIzaSyAted6ls2JRLmlbAWpWnbNqr8lqvRiqNtY",
  authDomain: "kingdom-devponts-tracker.firebaseapp.com",
  projectId: "kingdom-devponts-tracker",
  storageBucket: "kingdom-devponts-tracker.firebasestorage.app",
  messagingSenderId: "285976466192",
  appId: "1:285976466192:web:8c754a66ebb61dca044b95"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Centraliza a lógica do App ID para ser usada em todo o aplicativo.
// Isso evita duplicação de código e garante consistência.
export const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';