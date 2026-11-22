import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import i18n from '../i18n';
import {
  Auth,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  verifyPasswordResetCode,
} from 'firebase/auth';

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedEnvName: 'development' | 'production' | null = null;

export interface ResolvedFirebaseClientConfig {
  environment: 'development' | 'production';
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
}

const DEV_FIREBASE_DEFAULT_CONFIG = {
  apiKey: 'AIzaSyCp7epNvGqDH5TGCVEAW8_-3D-U_mV70u0',
  authDomain: 'painel-monet-dev.firebaseapp.com',
  projectId: 'painel-monet-dev',
  storageBucket: 'painel-monet-dev.firebasestorage.app',
  messagingSenderId: '5074525108',
  appId: '1:5074525108:web:dc9c5bcd662da717f5b0e1',
  measurementId: 'G-8TN13SK7LC',
} as const;

export function getFirebaseEnvironment(): 'development' | 'production' {
  const raw = (process.env.REACT_APP_FIREBASE_ENV || '').trim().toLowerCase();
  if (raw === 'development' || raw === 'dev') {
    return 'development';
  }
  return 'production';
}

export function resolveFirebaseClientConfig(): ResolvedFirebaseClientConfig {
  const environment = getFirebaseEnvironment();

  if (environment === 'development') {
    return {
      environment,
      apiKey:
        process.env.REACT_APP_FIREBASE_DEV_API_KEY?.trim() ||
        DEV_FIREBASE_DEFAULT_CONFIG.apiKey,
      authDomain:
        process.env.REACT_APP_FIREBASE_DEV_AUTH_DOMAIN?.trim() ||
        DEV_FIREBASE_DEFAULT_CONFIG.authDomain,
      projectId:
        process.env.REACT_APP_FIREBASE_DEV_PROJECT_ID?.trim() ||
        DEV_FIREBASE_DEFAULT_CONFIG.projectId,
      storageBucket:
        process.env.REACT_APP_FIREBASE_DEV_STORAGE_BUCKET?.trim() ||
        DEV_FIREBASE_DEFAULT_CONFIG.storageBucket,
      messagingSenderId:
        process.env.REACT_APP_FIREBASE_DEV_MESSAGING_SENDER_ID?.trim() ||
        DEV_FIREBASE_DEFAULT_CONFIG.messagingSenderId,
      appId:
        process.env.REACT_APP_FIREBASE_DEV_APP_ID?.trim() ||
        DEV_FIREBASE_DEFAULT_CONFIG.appId,
      measurementId:
        process.env.REACT_APP_FIREBASE_DEV_MEASUREMENT_ID?.trim() ||
        DEV_FIREBASE_DEFAULT_CONFIG.measurementId,
    };
  }

  const apiKey = process.env.REACT_APP_FIREBASE_API_KEY?.trim() || '';
  const authDomain = process.env.REACT_APP_FIREBASE_AUTH_DOMAIN?.trim() || '';
  const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID?.trim() || '';
  const appId = process.env.REACT_APP_FIREBASE_APP_ID?.trim() || '';

  if (!apiKey || !authDomain || !projectId || !appId) {
    throw new Error(
      'Autenticação Firebase não configurada. Defina as variáveis REACT_APP_FIREBASE_* no ambiente.',
    );
  }

  return {
    environment,
    apiKey,
    authDomain,
    projectId,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET?.trim(),
    messagingSenderId:
      process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID?.trim(),
    appId,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID?.trim(),
  };
}

export function resetFirebaseClientForTests(): void {
  cachedApp = null;
  cachedAuth = null;
  cachedEnvName = null;
}

function getFirebaseAuth(): Auth {
  const config = resolveFirebaseClientConfig();
  if (cachedAuth && cachedEnvName === config.environment) {
    return cachedAuth;
  }

  const existing = getApps().find((item) => item.name === config.environment);
  if (existing) {
    cachedApp = existing;
  } else {
    cachedApp = initializeApp(
      {
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId,
        ...(config.measurementId
          ? { measurementId: config.measurementId }
          : {}),
      },
      config.environment === 'production' && getApps().length === 0
        ? undefined
        : config.environment,
    );
  }

  cachedEnvName = config.environment;
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

function createRedirectStartedError(): Error {
  return Object.assign(new Error('auth/redirect-started'), {
    code: 'auth/redirect-started',
  });
}

export async function signInWithGooglePopup(): Promise<FirebaseAuthResult> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const isNativeWebView =
    typeof window !== 'undefined' &&
    Boolean((window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView);

  if (isNativeWebView) {
    await signInWithRedirect(auth, provider);
    throw createRedirectStartedError();
  }

  try {
    const credential = await signInWithPopup(auth, provider);
    const idToken = await credential.user.getIdToken(true);

    return {
      idToken,
      email: credential.user.email || '',
      displayName: credential.user.displayName || '',
    };
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment'
    ) {
      await signInWithRedirect(auth, provider);
      throw createRedirectStartedError();
    }
    throw error;
  }
}

export async function consumeGoogleRedirectResult(): Promise<FirebaseAuthResult | null> {
  try {
    const auth = getFirebaseAuth();
    const credential = await getRedirectResult(auth);
    if (!credential || !credential.user) return null;
    const idToken = await credential.user.getIdToken(true);
    return {
      idToken,
      email: credential.user.email || '',
      displayName: credential.user.displayName || '',
    };
  } catch {
    return null;
  }
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

export async function verifyFirebaseResetCode(oobCode: string): Promise<string> {
  const auth = getFirebaseAuth();
  return verifyPasswordResetCode(auth, oobCode);
}

export async function confirmFirebasePasswordReset(
  oobCode: string,
  newPassword: string,
): Promise<void> {
  const auth = getFirebaseAuth();
  await confirmPasswordReset(auth, oobCode, newPassword);
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
    case 'auth/redirect-started':
      return '';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return i18n.t('auth.firebaseErrors.invalidCredential');
    case 'auth/email-already-in-use':
      return i18n.t('auth.firebaseErrors.emailAlreadyInUse');
    case 'auth/weak-password':
      return i18n.t('auth.firebaseErrors.weakPassword');
    case 'auth/invalid-email':
      return i18n.t('auth.firebaseErrors.invalidEmail');
    case 'auth/too-many-requests':
      return i18n.t('auth.firebaseErrors.tooManyRequests');
    case 'auth/user-disabled':
      return i18n.t('auth.firebaseErrors.userDisabled');
    case 'auth/operation-not-allowed':
      return i18n.t('auth.firebaseErrors.operationNotAllowed');
    case 'auth/expired-action-code':
      return i18n.t('auth.firebaseErrors.expiredActionCode');
    case 'auth/invalid-action-code':
      return i18n.t('auth.firebaseErrors.invalidActionCode');
    default:
      return fallback;
  }
}
