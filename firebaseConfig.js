// Este arquivo centraliza a configuração do Firebase e outras constantes do projeto.

// Configurações do Firebase
export const firebaseConfig = {
  apiKey: "AIzaSyAted6ls2JRLmlbAWpWnbNqr8lqvRiqNtY",
  authDomain: "kingdom-devponts-tracker.firebaseapp.com",
  projectId: "kingdom-devponts-tracker",
  storageBucket: "kingdom-devponts-tracker.firebasestorage.app",
  messagingSenderId: "285976466192",
  appId: "1:285976466192:web:8c754a66ebb61dca044b95"
};

// Centraliza a lógica do App ID para ser usada em todo o aplicativo.
// Isso evita duplicação de código e garante consistência.
export const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';