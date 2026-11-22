import {
  getFirebaseEnvironment,
  resetFirebaseClientForTests,
  resolveFirebaseClientConfig,
  translateFirebaseAuthError,
} from '../../src/services/firebaseAuth';

describe('firebaseAuth environment switching', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    resetFirebaseClientForTests();
  });

  it('uses production config when REACT_APP_FIREBASE_ENV is production or omitted', () => {
    delete process.env.REACT_APP_FIREBASE_ENV;
    process.env.REACT_APP_FIREBASE_API_KEY = 'prod-key';
    process.env.REACT_APP_FIREBASE_AUTH_DOMAIN = 'painel-monet.firebaseapp.com';
    process.env.REACT_APP_FIREBASE_PROJECT_ID = 'painel-monet';
    process.env.REACT_APP_FIREBASE_APP_ID = '1:710882066980:web:prod';

    expect(getFirebaseEnvironment()).toBe('production');
    const cfg = resolveFirebaseClientConfig();
    expect(cfg.environment).toBe('production');
    expect(cfg.projectId).toBe('painel-monet');
    expect(cfg.authDomain).toBe('painel-monet.firebaseapp.com');
  });

  it('switches automatically to painel-monet-dev when REACT_APP_FIREBASE_ENV=development', () => {
    process.env.REACT_APP_FIREBASE_ENV = 'development';
    delete process.env.REACT_APP_FIREBASE_DEV_API_KEY;
    delete process.env.REACT_APP_FIREBASE_DEV_PROJECT_ID;

    expect(getFirebaseEnvironment()).toBe('development');
    const cfg = resolveFirebaseClientConfig();
    expect(cfg.environment).toBe('development');
    expect(cfg.projectId).toBe('painel-monet-dev');
    expect(cfg.authDomain).toBe('painel-monet-dev.firebaseapp.com');
    expect(cfg.storageBucket).toBe('painel-monet-dev.firebasestorage.app');
    expect(cfg.messagingSenderId).toBe('5074525108');
    expect(cfg.appId).toBe('1:5074525108:web:dc9c5bcd662da717f5b0e1');
  });
});

describe('translateFirebaseAuthError', () => {
  it('returns null for non-Firebase errors such as Axios ERR_NETWORK', () => {
    expect(translateFirebaseAuthError({ code: 'ERR_NETWORK' }, 'Fallback')).toBeNull();
    expect(translateFirebaseAuthError({ code: 'ERR_BAD_RESPONSE' }, 'Fallback')).toBeNull();
    expect(translateFirebaseAuthError(new Error('Network Error'), 'Fallback')).toBeNull();
  });

  it('returns empty string for user-cancelled popup or redirect states', () => {
    expect(translateFirebaseAuthError({ code: 'auth/popup-closed-by-user' }, 'Fallback')).toBe('');
    expect(translateFirebaseAuthError({ code: 'auth/redirect-cancelled-by-user' }, 'Fallback')).toBe('');
    expect(translateFirebaseAuthError({ code: 'auth/redirect-started' }, 'Fallback')).toBe('');
  });

  it('translates unauthorized-domain, network-request-failed, and popup-blocked clearly', () => {
    const unauthorized = translateFirebaseAuthError({ code: 'auth/unauthorized-domain' }, 'Fallback');
    const network = translateFirebaseAuthError({ code: 'auth/network-request-failed' }, 'Fallback');
    const popupBlocked = translateFirebaseAuthError({ code: 'auth/popup-blocked' }, 'Fallback');
    expect(unauthorized).toBeTruthy();
    expect(unauthorized).not.toBe('Fallback');
    expect(network).toBeTruthy();
    expect(network).not.toBe('Fallback');
    expect(popupBlocked).toBeTruthy();
    expect(popupBlocked).not.toBe('Fallback');
  });
});
