import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FaEye,
  FaEyeSlash,
  FaFingerprint,
  FaShieldAlt,
  FaChartLine,
  FaLayerGroup,
  FaExclamationTriangle,
  FaUserShield,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../api';
import { useAuth, type User } from '../context/AuthContext';
import {
  clearLocalBiometricPointer,
  detectBiometricCapabilities,
  getLocalBiometricPointer,
  loginWithBiometricCredential,
  type BiometricCapabilityInfo,
  type LocalBiometricDevicePointer,
} from '../utils/biometricAuth';
import {
  consumeGoogleRedirectResult,
  signInWithEmailFirebase,
  signInWithGooglePopup,
  signOutFirebase,
  translateFirebaseAuthError,
} from '../services/firebaseAuth';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import GoogleCompleteProfileModal, {
  GooglePendingProfile,
} from '../components/auth/GoogleCompleteProfileModal';
import InstallAppBanner from '../components/InstallAppBanner';
import ThemeAndLangControls from '../components/ThemeAndLangControls';
import { extractApiErrorMessage, getApiErrorCode } from '../utils/errorHandler';

interface LoginFormData {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricPointer, setBiometricPointer] =
    useState<LocalBiometricDevicePointer | null>(() => getLocalBiometricPointer());
  const [bioCaps, setBioCaps] = useState<BiometricCapabilityInfo | null>(null);
  const [googlePending, setGooglePending] = useState<GooglePendingProfile | null>(null);
  const [deactivatedEmail, setDeactivatedEmail] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const schema = useMemo(
    () =>
      yup
        .object({
          email: yup
            .string()
            .email(t('auth.validation.emailInvalid'))
            .required(t('auth.validation.required')),
          password: yup
            .string()
            .min(6, t('auth.validation.passwordMin'))
            .required(t('auth.validation.required')),
        })
        .required(),
    [t],
  );

  useEffect(() => {
    let active = true;
    detectBiometricCapabilities()
      .then((caps) => {
        if (active) setBioCaps(caps);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const handleBiometricLogin = async () => {
    try {
      setBiometricLoading(true);
      const isApp = Boolean(bioCaps?.isInstalledApp);
      const promptTitle = isApp
        ? t('auth.biometric.loginBiometricApp')
        : t('auth.biometric.loginFacialWeb');
      const result = await loginWithBiometricCredential(promptTitle);
      login(result.access_token, result.user as unknown as User);
      toast.success(t('auth.biometric.loginSuccess'));
      navigate('/dashboard', { replace: true });
    } catch (error: unknown) {
      const apiStatus = (error as { response?: { status?: number } })?.response?.status;
      if (apiStatus === 401 || apiStatus === 404) {
        clearLocalBiometricPointer();
        setBiometricPointer(null);
        toast.info(t('auth.biometric.loginUnavailable'));
      } else {
        toast.error(
          extractApiErrorMessage(error, t('auth.biometric.loginUnavailable')),
        );
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  useEffect(() => {
    if (searchParams.get('reactivated') === '1') {
      toast.success(t('auth.reactivatedQueryToast'));
    } else if (searchParams.get('passwordReset') === '1') {
      toast.success(t('auth.passwordResetQueryToast'));
    }
  }, [searchParams, t]);

  useEffect(() => {
    let active = true;
    consumeGoogleRedirectResult().then(async (redirectResult) => {
      if (!active || !redirectResult) return;
      try {
        setGoogleLoading(true);
        const response = await api.post('/auth/firebase-login', {
          idToken: redirectResult.idToken,
        });
        if (response.data?.requiresProfileCompletion) {
          setGooglePending({
            completionToken: response.data.completionToken,
            email: response.data.googleProfile?.email || redirectResult.email,
            name: response.data.googleProfile?.name || redirectResult.displayName,
            cpf: response.data.googleProfile?.cpf || '',
            phone: response.data.googleProfile?.phone || '',
          });
          return;
        }
        const { access_token, user, reactivated } = response.data;
        login(access_token, user);
        toast.success(
          reactivated
            ? t('auth.accountReactivatedSuccess')
            : t('auth.loginGoogleSuccess'),
        );
        navigate('/dashboard', { replace: true });
      } catch (error: unknown) {
        const apiCode = getApiErrorCode(error);
        if (apiCode === 'ACCOUNT_DEACTIVATED') {
          await signOutFirebase();
          setDeactivatedEmail(redirectResult.email);
          return;
        }
        await signOutFirebase();
        toast.error(extractApiErrorMessage(error, t('auth.googleGenericError')));
      } finally {
        if (active) setGoogleLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [login, navigate, t]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setDeactivatedEmail(null);
    try {
      setLoading(true);
      const fbResult = await signInWithEmailFirebase(data.email, data.password);
      const response = await api.post('/auth/firebase-login', {
        idToken: fbResult.idToken,
      });

      const { access_token, user, reactivated } = response.data;
      login(access_token, user);
      toast.success(
        reactivated
          ? t('auth.accountReactivatedSuccess')
          : t('auth.loginSuccess'),
      );
      navigate('/dashboard', { replace: true });
    } catch (error: unknown) {
      const apiCode = getApiErrorCode(error);
      if (apiCode === 'ACCOUNT_DEACTIVATED') {
        await signOutFirebase();
        setDeactivatedEmail(data.email.trim().toLowerCase());
        toast.warning(t('auth.deactivatedEmailSent'));
        return;
      }

      const firebaseMsg = translateFirebaseAuthError(error, t('auth.loginGenericError'));
      if (firebaseMsg === '') return;
      if (firebaseMsg) {
        toast.error(firebaseMsg);
        return;
      }

      await signOutFirebase();
      toast.error(extractApiErrorMessage(error, t('auth.loginGenericError')));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setDeactivatedEmail(null);
    let googleEmail = '';
    try {
      setGoogleLoading(true);
      const googleResult = await signInWithGooglePopup();
      googleEmail = googleResult.email;
      const response = await api.post('/auth/firebase-login', {
        idToken: googleResult.idToken,
      });

      if (response.data?.requiresProfileCompletion) {
        setGooglePending({
          completionToken: response.data.completionToken,
          email: response.data.googleProfile?.email || googleResult.email,
          name: response.data.googleProfile?.name || googleResult.displayName,
          cpf: response.data.googleProfile?.cpf || '',
          phone: response.data.googleProfile?.phone || '',
        });
        return;
      }

      const { access_token, user, reactivated } = response.data;
      login(access_token, user);
      toast.success(
        reactivated
          ? t('auth.accountReactivatedSuccess')
          : t('auth.loginGoogleSuccess'),
      );
      navigate('/dashboard', { replace: true });
    } catch (error: unknown) {
      const apiCode = getApiErrorCode(error);
      if (apiCode === 'ACCOUNT_DEACTIVATED') {
        await signOutFirebase();
        setDeactivatedEmail(googleEmail);
        toast.warning(t('auth.deactivatedBannerTitle'));
        return;
      }

      const firebaseMsg = translateFirebaseAuthError(error, t('auth.googleGenericError'));
      if (firebaseMsg === '') return;
      if (firebaseMsg) {
        toast.error(firebaseMsg);
        return;
      }

      await signOutFirebase();
      toast.error(extractApiErrorMessage(error, t('auth.googleGenericError')));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row transition-colors duration-300">
      <div className="hidden lg:flex lg:w-[46%] bg-slate-950 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <img
            src="/logo192.png?v=5"
            alt={t('common.appName')}
            className="w-10 h-10 rounded-xl shadow-sm object-cover"
          />
          <div>
            <p className="text-sm font-semibold tracking-tight text-white">{t('common.appName')}</p>
            <p className="text-[11px] text-slate-400">{t('common.suiteName')}</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-6">
          <h1 className="text-3xl font-semibold tracking-tight leading-tight text-white">
            {t('auth.heroTitle')}
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            {t('auth.heroSubtitle')}
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400">
                {React.createElement(FaChartLine as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
              </span>
              {t('auth.heroBullet1')}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400">
                {React.createElement(FaLayerGroup as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
              </span>
              {t('auth.heroBullet2')}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400">
                {React.createElement(FaShieldAlt as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
              </span>
              {t('auth.heroBullet3')}
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-500">
          &copy; {new Date().getFullYear()} {t('auth.heroCopyright')}
        </p>
      </div>

      <div className="w-full min-w-0 flex-1 flex flex-col justify-center items-center px-5 py-8 sm:px-10 lg:px-16 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="mx-auto w-full max-w-md min-w-0">
          <div className="flex items-center justify-between gap-2 mb-5">
            <div className="lg:hidden flex items-center gap-2.5 min-w-0">
              <img
                src="/logo192.png?v=5"
                alt={t('common.appName')}
                className="w-9 h-9 rounded-xl flex-shrink-0 object-cover shadow-sm"
              />
              <span className="text-base font-semibold text-slate-900 dark:text-white truncate">
                {t('common.appName')}
              </span>
            </div>
            <div className="ml-auto">
              <ThemeAndLangControls />
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
              {t('auth.loginTitle')}
            </h2>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              {t('auth.loginSubtitle')}
            </p>
          </div>

          <div className="exec-card p-5 sm:p-8 w-full">
            {deactivatedEmail && (
              <div className="mb-5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 p-4 flex items-start gap-3">
                {React.createElement(FaExclamationTriangle as unknown as React.ComponentType<{ className?: string }>, {
                  className: 'text-amber-600 dark:text-amber-400 text-sm mt-0.5 flex-shrink-0',
                })}
                <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                  <p className="font-semibold">{t('auth.deactivatedBannerTitle')}</p>
                  <p className="mt-0.5">
                    {t('auth.deactivatedBannerBody', { email: deactivatedEmail })}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      navigate('/forgot-password', {
                        state: { identifier: deactivatedEmail, reason: 'reactivate' },
                      })
                    }
                    className="mt-2 inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors"
                  >
                    {t('auth.deactivatedButtonSend')}
                  </button>
                </div>
              </div>
            )}

            <GoogleSignInButton
              onClick={handleGoogleLogin}
              loading={googleLoading}
              label={t('auth.googleContinue')}
            />

            {biometricPointer && bioCaps?.available && (
              <button
                type="button"
                onClick={handleBiometricLogin}
                disabled={biometricLoading || loading || googleLoading}
                data-testid="biometric-login-btn"
                className="w-full mt-3 inline-flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm font-semibold transition-all disabled:opacity-50"
              >
                {React.createElement(
                  (bioCaps.isInstalledApp ? FaFingerprint : FaUserShield) as unknown as React.ComponentType<{
                    className?: string;
                  }>,
                  { className: 'text-sm' },
                )}
                <span>
                  {biometricLoading
                    ? t('auth.biometric.verifying')
                    : !bioCaps.isInstalledApp
                      ? t('auth.biometric.loginFacialWeb')
                      : biometricPointer.kind === 'fingerprint'
                        ? t('auth.biometric.loginFingerprintApp')
                        : biometricPointer.kind === 'facial'
                          ? t('auth.biometric.loginFacialWeb')
                          : t('auth.biometric.loginBiometricApp')}
                </span>
              </button>
            )}

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white dark:bg-slate-900 text-slate-400 font-medium transition-colors duration-300">
                  {t('auth.orEmailContinue')}
                </span>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label htmlFor="email" className="exec-label">
                  {t('auth.emailLabel')}
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  className={`exec-input ${errors.email ? 'exec-input-error' : ''}`}
                  placeholder={t('auth.emailPlaceholder')}
                />
                {errors.email && (
                  <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="exec-label">
                    {t('auth.passwordLabel')}
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 mb-1.5"
                  >
                    {t('auth.forgotPasswordLink')}
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    {...register('password')}
                    className={`exec-input pr-10 ${errors.password ? 'exec-input-error' : ''}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {React.createElement((showPassword ? FaEyeSlash : FaEye) as unknown as React.ComponentType<{ className?: string }>, {
                      className: 'text-sm',
                    })}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="exec-btn-primary w-full py-3 mt-2"
              >
                {loading ? t('auth.signingIn') : t('auth.signInButton')}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
              <p className="text-[11px] text-slate-400">
                {t('auth.biometric.mandatoryPasswordHint')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('auth.noAccountPrompt')}{' '}
                <Link
                  to="/register"
                  className="font-semibold text-slate-900 dark:text-emerald-400 hover:underline underline-offset-4"
                >
                  {t('auth.createFreeAccount')}
                </Link>
              </p>
            </div>
          </div>

          <InstallAppBanner />
        </div>
      </div>

      <GoogleCompleteProfileModal
        pending={googlePending}
        onClose={() => setGooglePending(null)}
      />
    </div>
  );
};

export default Login;
