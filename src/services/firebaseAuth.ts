import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

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
      'Login com Google não configurado. Defina as variáveis REACT_APP_FIREBASE_* no ambiente.',
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

export interface GooglePopupResult {
  idToken: string;
  email: string;
  displayName: string;
}

export async function signInWithGooglePopup(): Promise<GooglePopupResult> {
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
