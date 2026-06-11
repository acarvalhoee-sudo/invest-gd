/**
 * firebase.ts
 * Inicialização do Firebase SDK — sem Authentication
 * Acesso direto ao Firestore para armazenamento dos estudos
 */

import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

// Evita reinicializar em hot-reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

/** Instância do Firestore */
export const db = getFirestore(app)

export default app
