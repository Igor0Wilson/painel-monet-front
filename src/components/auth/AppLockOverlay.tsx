import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaFingerprint,
  FaKey,
  FaLock,
  FaSignOutAlt,
  FaSmile,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../../api';
import { useAuth, type User } from '../../context/AuthContext';
import {
  signInWithEmailFirebase,
  signInWithGooglePopup,
  signOutFirebase,
  translateFirebaseAuthError,
} from '../../services/firebaseAuth';
import {
  getLocalBiometricPointer,
  loginWithBiometricCredential,
} from '../../utils/biometricAuth';
import { extractApiErrorMessage } from '../../utils/errorHandler';
import {
  getAuthProviderHint,
  getLocalPinToken,
  syncSecurityPinDeviceToken,
  verifySecurityPinLogin,
} from '../../utils/securityLockAuth';
import GoogleSignInButton from './GoogleSignInButton';

function renderIcon(
  IconComponent: unknown,
  className: string,
): React.ReactElement {
  return React.createElement(
    IconComponent as React.ComponentType<{ className?: string }>,
    { className },
  );
}

interface AppLockOverlayProps {
  isLocked: boolean;
  hasPinConfigured: boolean;
  authProvider: 'password' | 'google';
  userName?: string;
  onUnlocked: () => void;
  onLogout: () => void;
}

const AppLockOverlay: React.FC<AppLockOverlayProps> = ({
  isLocked,
  hasPinConfigured,
  authProvider,
  userName,
  onUnlocked,
  onLogout,
}) => {
  const { t } = useTranslation();
  const { login } = useAuth();

  const fingerprintPointer = isLocked
    ? getLocalBiometricPointer('fingerprint')
    : null;
  const facialPointer = isLocked ? getLocalBiometricPointer('facial') : null;
  const pinTokenRecord = isLocked ? getLocalPinToken() : null;
  const hasCodeAvailable = Boolean(pinTokenRecord?.pinDeviceToken || hasPinConfigured);

  const [step, setStep] = useState<'fingerprint' | 'code' | 'password'>('fingerprint');
  const [fingerprintFailed, setFingerprintFailed] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [loadingBiometric, setLoadingBiometric] = useState(false);
  const [loadingPin, setLoadingPin] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const autoTriggeredLockCycleRef = useRef(false);

  const effectiveProvider =
    authProvider === 'google' || getAuthProviderHint() === 'google'
      ? 'google'
      : 'password';

  const handleFingerprintUnlock = useCallback(async () => {
    if (!getLocalBiometricPointer('fingerprint')) {
      setFingerprintFailed(true);
      setStep(getLocalPinToken() || hasPinConfigured ? 'code' : 'password');
      return;
    }
    try {
      setLoadingBiometric(true);
      setStatusError(null);
      const result = await loginWithBiometricCredential({
        preferredKind: 'fingerprint',
        promptTitle: t('auth.fingerprintLoginBtn'),
        disableDeviceFallback: true,
      });
      login(result.access_token, result.user as unknown as User);
      setPinInput('');
      setFingerprintFailed(false);
      onUnlocked();
    } catch {
      setFingerprintFailed(true);
      if (getLocalPinToken() || hasPinConfigured) {
        setStep('code');
        setStatusError(t('appLock.codeFallbackHint'));
      } else {
        setStep('password');
        setStatusError(t('appLock.genericError'));
      }
    } finally {
      setLoadingBiometric(false);
    }
  }, [hasPinConfigured, login, onUnlocked, t]);

  useEffect(() => {
    if (!isLocked) {
      autoTriggeredLockCycleRef.current = false;
      setFingerprintFailed(false);
      setStatusError(null);
      setPinInput('');
      return;
    }

    if (autoTriggeredLockCycleRef.current) return;
    autoTriggeredLockCycleRef.current = true;

    const fp = getLocalBiometricPointer('fingerprint');
    const pinTok = getLocalPinToken();
    const facial = getLocalBiometricPointer('facial');

    if (fp) {
      setStep('fingerprint');
      void handleFingerprintUnlock();
      return;
    }

    if (pinTok || hasPinConfigured) {
      setStep('code');
      return;
    }

    if (facial) {
      setStep('password');
      return;
    }

    setStep('password');
  }, [handleFingerprintUnlock, hasPinConfigured, isLocked]);

  if (!isLocked) return null;

  const handleFacialUnlock = async () => {
    if (!facialPointer) {
      setStatusError(t('appLock.facialNotConfigured'));
      return;
    }
    try {
      setLoadingBiometric(true);
      setStatusError(null);
      const result = await loginWithBiometricCredential({
        preferredKind: 'facial',
        promptTitle: t('auth.facialLoginBtn'),
        disableDeviceFallback: true,
      });
      login(result.access_token, result.user as unknown as User);
      setPinInput('');
      onUnlocked();
    } catch (error: unknown) {
      const msg = extractApiErrorMessage(error, t('appLock.genericError'));
      setStatusError(msg);
      if (hasCodeAvailable) {
        setStep('code');
      }
    } finally {
      setLoadingBiometric(false);
    }
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = pinInput.replace(/\D/g, '').slice(0, 6);
    if (!/^\d{4,6}$/.test(sanitized)) {
      setStatusError(t('appLock.codeRequiredError'));
      return;
    }
    try {
      setLoadingPin(true);
      setStatusError(null);
      if (!getLocalPinToken() && hasPinConfigured) {
        await syncSecurityPinDeviceToken(userName).catch(() => undefined);
      }
      const data = await verifySecurityPinLogin(sanitized);
      login(data.access_token, data.user);
      setPinInput('');
      onUnlocked();
    } catch (error: unknown) {
      setStatusError(extractApiErrorMessage(error, t('appLock.genericError')));
    } finally {
      setLoadingPin(false);
    }
  };

  const handleGoogleReauth = async () => {
    try {
      setLoadingGoogle(true);
      setStatusError(null);
      const fbResult = await signInWithGooglePopup();
      const response = await api.post('/auth/firebase-login', {
        idToken: fbResult.idToken,
      });
      if (response.data?.requiresProfileCompletion) {
        await signOutFirebase();
        setStatusError(t('auth.googleGenericError'));
        return;
      }
      const { access_token, user } = response.data as {
        access_token: string;
        user: User;
      };
      login(access_token, user);
      toast.success(t('appLock.googleReauthSuccess'));
      onUnlocked();
    } catch (error: unknown) {
      const fbMsg = translateFirebaseAuthError(error, t('auth.googleGenericError'));
      if (fbMsg === '') return;
      await signOutFirebase();
      setStatusError(fbMsg || extractApiErrorMessage(error, t('auth.googleGenericError')));
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handlePasswordReauth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !passwordInput) {
      setStatusError(t('appLock.genericError'));
      return;
    }
    try {
      setLoadingPassword(true);
      setStatusError(null);
      const fbResult = await signInWithEmailFirebase(
        emailInput.trim(),
        passwordInput,
      );
      const response = await api.post('/auth/firebase-login', {
        idToken: fbResult.idToken,
      });
      const { access_token, user } = response.data as {
        access_token: string;
        user: User;
      };
      login(access_token, user);
      setPasswordInput('');
      onUnlocked();
    } catch (error: unknown) {
      const fbMsg = translateFirebaseAuthError(error, t('auth.loginGenericError'));
      setStatusError(fbMsg || extractApiErrorMessage(error, t('auth.loginGenericError')));
    } finally {
      setLoadingPassword(false);
    }
  };

  const anyBusy = loadingBiometric || loadingPin || loadingPassword || loadingGoogle;

  return (
    <div
      data-testid="app-lock-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t('appLock.title')}
      className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
            {renderIcon(FaLock, 'text-lg')}
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            {t('appLock.badge')}
          </p>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {t('appLock.title')}
          </h2>
          {userName && (
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {userName}
            </p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('appLock.subtitle')}
          </p>
          {effectiveProvider === 'google' && (
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {t('appLock.googleAccountTag')}
            </span>
          )}
        </div>

        {statusError && (
          <div
            data-testid="app-lock-error"
            className="rounded-xl border border-amber-200 dark:border-amber-800/70 bg-amber-50 dark:bg-amber-950/40 px-3.5 py-2.5 text-xs text-amber-900 dark:text-amber-200"
          >
            {statusError}
          </div>
        )}

        {step === 'fingerprint' && fingerprintPointer && (
          <div className="space-y-3">
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 p-4 text-center space-y-2">
              <div className="mx-auto w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                {renderIcon(FaFingerprint, 'text-lg')}
              </div>
              <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                {t('appLock.fingerprintAutoHint')}
              </p>
              {loadingBiometric && (
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {t('appLock.fingerprintTrying')}
                </p>
              )}
            </div>

            <button
              type="button"
              data-testid="lock-fingerprint-retry-btn"
              onClick={handleFingerprintUnlock}
              disabled={anyBusy}
              className="exec-btn-primary w-full gap-2"
            >
              {renderIcon(FaFingerprint, 'text-sm')}
              <span>
                {loadingBiometric
                  ? t('appLock.verifying')
                  : t('appLock.retryFingerprintBtn')}
              </span>
            </button>
          </div>
        )}

        {step === 'code' && (
          <form onSubmit={handleVerifyPin} className="space-y-3" data-testid="lock-pin-form">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-100">
                {renderIcon(FaKey, 'text-emerald-600')}
                <span>{t('appLock.codeFallbackHeading')}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {fingerprintFailed
                  ? t('appLock.codeFallbackHint')
                  : t('appLock.codePromptHint')}
              </p>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                autoFocus
                data-testid="lock-pin-input"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={t('appLock.codePlaceholder')}
                className="exec-input text-center tracking-[0.4em] text-base font-semibold"
              />
            </div>

            <button
              type="submit"
              data-testid="lock-pin-submit-btn"
              disabled={anyBusy || pinInput.length < 4}
              className="exec-btn-primary w-full gap-2"
            >
              {renderIcon(FaKey, 'text-xs')}
              <span>{loadingPin ? t('appLock.verifying') : t('appLock.unlockWithCodeBtn')}</span>
            </button>

            {fingerprintPointer && (
              <button
                type="button"
                data-testid="lock-fingerprint-retry-btn"
                onClick={() => {
                  setStep('fingerprint');
                  void handleFingerprintUnlock();
                }}
                disabled={anyBusy}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2"
              >
                {renderIcon(FaFingerprint, 'text-sm text-emerald-600')}
                <span>{t('appLock.retryFingerprintBtn')}</span>
              </button>
            )}
          </form>
        )}

        {step === 'password' && (
          <div className="space-y-3">
            {fingerprintPointer && (
              <button
                type="button"
                data-testid="lock-fingerprint-retry-btn"
                onClick={() => {
                  setStep('fingerprint');
                  void handleFingerprintUnlock();
                }}
                disabled={anyBusy}
                className="w-full py-2.5 px-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center justify-center gap-2"
              >
                {renderIcon(FaFingerprint, 'text-sm')}
                <span>{t('appLock.retryFingerprintBtn')}</span>
              </button>
            )}

            {hasCodeAvailable && (
              <button
                type="button"
                onClick={() => setStep('code')}
                disabled={anyBusy}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2"
              >
                {renderIcon(FaKey, 'text-xs text-emerald-600')}
                <span>{t('appLock.showCodeBtn')}</span>
              </button>
            )}

            <GoogleSignInButton
              onClick={handleGoogleReauth}
              loading={loadingGoogle}
            />

            <form onSubmit={handlePasswordReauth} className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                className="exec-input text-xs"
                autoComplete="email"
              />
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder={t('appLock.passwordLabel')}
                className="exec-input text-xs"
                autoComplete="current-password"
              />
              <button
                type="submit"
                disabled={anyBusy}
                className="exec-btn-secondary w-full text-xs"
              >
                {loadingPassword
                  ? t('appLock.verifying')
                  : t('appLock.unlockWithPasswordBtn')}
              </button>
            </form>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <button
            type="button"
            data-testid="lock-facial-btn"
            onClick={handleFacialUnlock}
            disabled={anyBusy}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-60"
          >
            {renderIcon(FaSmile, 'text-sm')}
            <span>
              {loadingBiometric
                ? t('appLock.facialTrying')
                : t('appLock.facialBtn')}
            </span>
          </button>

          {step !== 'password' && (
            <div className="flex items-center justify-between gap-2 pt-1">
              {hasCodeAvailable && step !== 'code' ? (
                <button
                  type="button"
                  onClick={() => setStep('code')}
                  className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  {t('appLock.showCodeBtn')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep('password')}
                  className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:underline"
                >
                  {t('appLock.passwordFallbackBtn')}
                </button>
              )}

              <button
                type="button"
                data-testid="lock-logout-btn"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline"
              >
                {renderIcon(FaSignOutAlt, 'text-xs')}
                <span>{t('appLock.logoutBtn')}</span>
              </button>
            </div>
          )}

          {step === 'password' && (
            <div className="flex justify-end">
              <button
                type="button"
                data-testid="lock-logout-btn"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline"
              >
                {renderIcon(FaSignOutAlt, 'text-xs')}
                <span>{t('appLock.logoutBtn')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppLockOverlay;
