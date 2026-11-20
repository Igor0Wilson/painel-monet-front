import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;

function getFirebaseAuth(): Auth {
  if (cachedAuth) {
    return cachedAuth;
  }

  const apiKey = process.env.REACT_APP_FIREBASE_API_KEY?.trim();
  const authDomain = process.env.REACT_APP_FIREBASE_AUTH_DOMAIN?.trim();
  const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID?.trim();
  const appId = process.env.REACT_APP_FIREBASE_APP_ID?.trim();

  if (!apiKey || !authDomain || !projectId || !appId) {
    throw new Error(
      'Autenticação Firebase não configurada. Defina as variáveis REACT_APP_FIREBASE_* no ambiente.',
    );
  }

  if (getApps().length > 0) {
    cachedApp = getApps()[0];
  } else {
    cachedApp = initializeApp({
      apiKey,
      authDomain,
      projectId,
      storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET?.trim(),
      messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID?.trim(),
      appId,
    });
  }

  cachedAuth = getAuth(cachedApp);
  return cachedAuth;
}

export interface FirebaseAuthResult {
  idToken: string;
  email: string;
  displayName: string;
}

export async function signInWithEmailFirebase(
  email: string,
  password: string,
): Promise<FirebaseAuthResult> {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(
    auth,
    email.trim().toLowerCase(),
    password,
  );
  const idToken = await credential.user.getIdToken(true);
  return {
    idToken,
    email: credential.user.email || email.trim().toLowerCase(),
    displayName: credential.user.displayName || '',
  };
}

export async function registerWithEmailFirebase(
  email: string,
  password: string,
  displayName: string,
): Promise<FirebaseAuthResult> {
  const auth = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(
    auth,
    email.trim().toLowerCase(),
    password,
  );
  if (displayName.trim()) {
    await updateProfile(credential.user, {
      displayName: displayName.trim(),
    }).catch(() => undefined);
  }
  const idToken = await credential.user.getIdToken(true);
  return {
    idToken,
    email: credential.user.email || email.trim().toLowerCase(),
    displayName: displayName.trim(),
  };
}

export async function signInWithGooglePopup(): Promise<FirebaseAuthResult> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const credential = await signInWithPopup(auth, provider);
  const idToken = await credential.user.getIdToken(true);

  return {
    idToken,
    email: credential.user.email || '',
    displayName: credential.user.displayName || '',
  };
}

export async function signOutFirebase(): Promise<void> {
  try {
    if (cachedAuth) {
      await signOut(cachedAuth);
    }
  } catch {
    return;
  }
}

export function translateFirebaseAuthError(
  error: unknown,
  fallback: string,
): string | null {
  const code = (error as { code?: string })?.code;
  if (!code) return null;

  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return '';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-mail ou senha inválidos. Se sua conta estiver desativada, clique em "Esqueci minha senha / Reativar conta".';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está em uso. Tente fazer login ou clique em "Esqueci minha senha".';
    case 'auth/weak-password':
      return 'A senha precisa ter no mínimo 6 caracteres.';
    case 'auth/invalid-email':
      return 'E-mail inválido.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde alguns instantes e tente novamente.';
    case 'auth/user-disabled':
      return 'Esta conta está desativada.';
    case 'auth/operation-not-allowed':
      return 'Provedor de autenticação não habilitado no Firebase Console.';
    default:
      return fallback;
  }
}
