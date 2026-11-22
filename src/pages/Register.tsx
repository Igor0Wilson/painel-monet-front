import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FaCamera,
  FaCheckCircle,
  FaExclamationTriangle,
  FaShieldAlt,
  FaTrashAlt,
  FaUser,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../api';
import { useAuth, type User } from '../context/AuthContext';
import {
  consumeGoogleRedirectResult,
  registerWithEmailFirebase,
  signInWithGooglePopup,
  signOutFirebase,
  translateFirebaseAuthError,
} from '../services/firebaseAuth';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import GoogleCompleteProfileModal, {
  GooglePendingProfile,
} from '../components/auth/GoogleCompleteProfileModal';
import ThemeAndLangControls from '../components/ThemeAndLangControls';
import { extractApiErrorMessage, getApiErrorCode } from '../utils/errorHandler';
import { formatCpfInput, formatPhoneInput, onlyDigits } from '../utils/formatters';
import { createPreviewDataUrl, prepareImageForUpload } from '../utils/imageUpload';

interface RegisterFormData {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

const Register: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googlePending, setGooglePending] = useState<GooglePendingProfile | null>(null);
  const [cpfRedirectBanner, setCpfRedirectBanner] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const schema = useMemo(
    () =>
      yup
        .object({
          name: yup
            .string()
            .trim()
            .min(2, t('auth.validation.nameMin'))
            .required(t('auth.validation.required')),
          email: yup
            .string()
            .email(t('auth.validation.emailInvalid'))
            .required(t('auth.validation.required')),
          cpf: yup
            .string()
            .required(t('auth.validation.cpfRequired'))
            .test('cpf-len', t('auth.validation.cpfLen'), (v) => onlyDigits(v).length === 11),
          phone: yup
            .string()
            .required(t('auth.validation.phoneRequired'))
            .test('phone-len', t('auth.validation.phoneLen'), (v) => onlyDigits(v).length >= 10),
          password: yup
            .string()
            .min(6, t('auth.validation.passwordMin'))
            .required(t('auth.validation.required')),
          confirmPassword: yup
            .string()
            .oneOf([yup.ref('password')], t('auth.validation.passwordsMismatch'))
            .required(t('auth.validation.required')),
        })
        .required(),
    [t],
  );

  const {
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: yupResolver(schema) as unknown as Resolver<RegisterFormData>,
    defaultValues: { cpf: '', phone: '' },
  });

  const cpfValue = watch('cpf') || '';
  const phoneValue = watch('phone') || '';

  const handleSelectAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    e.target.value = '';
    if (!selected) return;

    const { file, error } = await prepareImageForUpload(selected);
    if (error === 'invalid_type') {
      toast.error(t('common.photoInvalidType'));
      return;
    }
    if (error === 'too_large') {
      toast.error(t('common.photoTooLarge'));
      return;
    }

    try {
      const preview = await createPreviewDataUrl(file);
      setAvatarFile(file);
      setAvatarPreview(preview);
    } catch {
      toast.error(t('common.photoInvalidType'));
    }
  };

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
        const { access_token, user } = response.data;
        login(access_token, user);
        toast.success(t('auth.register.googleExistingAccount'));
        navigate('/dashboard', { replace: true });
      } catch (error: unknown) {
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

  const onSubmit = async (data: RegisterFormData) => {
    setCpfRedirectBanner(null);
    const cpfDigits = onlyDigits(data.cpf);

    try {
      setLoading(true);
      const fbResult = await registerWithEmailFirebase(
        data.email.trim(),
        data.password,
        data.name.trim(),
      );

      const response = await api.post('/auth/firebase-register', {
        idToken: fbResult.idToken,
        name: data.name.trim(),
        cpf: cpfDigits,
        phone: onlyDigits(data.phone),
      });

      const { access_token, user: createdUser } = response.data as {
        access_token: string;
        user: User;
      };
      let finalUser = createdUser;

      if (avatarFile && access_token) {
        try {
          const formData = new FormData();
          formData.append('file', avatarFile);
          const avatarRes = await api.post('/users/me/avatar', formData, {
            headers: { Authorization: `Bearer ${access_token}` },
          });
          finalUser = avatarRes.data as User;
        } catch {
          toast.warning(t('auth.register.avatarPostWarning'));
        }
      }

      login(access_token, finalUser);
      toast.success(t('auth.register.successToast'));
      navigate('/dashboard', { replace: true });
    } catch (error: unknown) {
      const code = getApiErrorCode(error);
      const message = extractApiErrorMessage(error, t('auth.register.registerError'));

      if (code === 'CPF_ALREADY_EXISTS' || message.toLowerCase().includes('cpf já está')) {
        await signOutFirebase();
        setCpfRedirectBanner(t('auth.register.cpfExistsRedirect'));
        toast.warning(t('auth.register.cpfExistsRedirect'));
        setTimeout(() => {
          navigate('/forgot-password', {
            state: {
              identifier: formatCpfInput(cpfDigits),
              reason: 'cpf_exists',
            },
          });
        }, 1800);
        return;
      }

      const firebaseMsg = translateFirebaseAuthError(error, t('auth.register.registerError'));
      if (firebaseMsg === '') return;
      if (firebaseMsg) {
        toast.error(firebaseMsg);
        return;
      }

      await signOutFirebase();
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      setGoogleLoading(true);
      const googleResult = await signInWithGooglePopup();
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

      const { access_token, user } = response.data;
      login(access_token, user);
      toast.success(t('auth.register.googleExistingAccount'));
      navigate('/dashboard', { replace: true });
    } catch (error: unknown) {
      const apiCode = getApiErrorCode(error);
      if (apiCode === 'ACCOUNT_DEACTIVATED') {
        await signOutFirebase();
        toast.warning(t('auth.deactivatedBannerTitle'));
        navigate('/forgot-password', { state: { reason: 'reactivate' } });
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
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <img
            src="/logo192.png?v=5"
            alt={t('common.appName')}
            className="w-10 h-10 rounded-xl shadow-sm object-cover"
          />
          <div>
            <p className="text-sm font-semibold tracking-tight text-white">
              {t('common.appName')}
            </p>
            <p className="text-[11px] text-slate-400">{t('common.suiteName')}</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-6">
          <h1 className="text-3xl font-semibold tracking-tight leading-tight text-white">
            {t('auth.register.heroTitle')}
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            {t('auth.register.heroSubtitle')}
          </p>
          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex items-center gap-2.5">
              {React.createElement(FaCheckCircle as unknown as React.ComponentType<{ className?: string }>, {
                className: 'text-emerald-400 text-sm flex-shrink-0',
              })}
              <span>{t('auth.register.heroBullet1')}</span>
            </div>
            <div className="flex items-center gap-2.5">
              {React.createElement(FaCheckCircle as unknown as React.ComponentType<{ className?: string }>, {
                className: 'text-emerald-400 text-sm flex-shrink-0',
              })}
              <span>{t('auth.register.heroBullet2')}</span>
            </div>
            <div className="flex items-center gap-2.5">
              {React.createElement(FaShieldAlt as unknown as React.ComponentType<{ className?: string }>, {
                className: 'text-emerald-400 text-sm flex-shrink-0',
              })}
              <span>{t('auth.register.heroBullet3')}</span>
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
              {t('auth.register.title')}
            </h2>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              {t('auth.register.subtitle')}
            </p>
          </div>

          <div className="exec-card p-5 sm:p-8 w-full">
            <GoogleSignInButton
              onClick={handleGoogleRegister}
              loading={googleLoading}
              label={t('auth.googleContinue')}
            />

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white dark:bg-slate-900 text-slate-400 font-medium transition-colors duration-300">
                  {t('auth.register.orForm')}
                </span>
              </div>
            </div>

            {cpfRedirectBanner && (
              <div className="mb-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3.5 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                {React.createElement(FaExclamationTriangle as unknown as React.ComponentType<{ className?: string }>, {
                  className: 'text-amber-600 dark:text-amber-400 text-sm mt-0.5 flex-shrink-0',
                })}
                <div>
                  <p className="font-semibold">{cpfRedirectBanner}</p>
                  <button
                    type="button"
                    onClick={() =>
                      navigate('/forgot-password', {
                        state: { identifier: cpfValue, reason: 'cpf_exists' },
                      })
                    }
                    className="mt-1 underline font-semibold text-amber-950 dark:text-amber-100"
                  >
                    {t('auth.forgotPasswordLink')}
                  </button>
                </div>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 p-3 flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-300/70 dark:border-slate-600">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt={t('common.photoAltProfile')}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    React.createElement(FaUser as unknown as React.ComponentType<{ className?: string }>, {
                      className: 'text-lg',
                    })
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {t('auth.register.photoSectionTitle')}
                  </p>
                  <p className="text-[11px] text-slate-400 mb-2">
                    {t('auth.register.photoSectionHint')} • {t('common.photoHint')}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleSelectAvatar}
                      className="hidden"
                      data-testid="register-avatar-input"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-[11px] font-semibold text-slate-700 dark:text-slate-100 transition-colors"
                    >
                      {React.createElement(FaCamera as unknown as React.ComponentType<{ className?: string }>, {
                        className: 'text-[10px]',
                      })}
                      <span>{avatarPreview ? t('common.changePhoto') : t('common.selectPhoto')}</span>
                    </button>
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarFile(null);
                          setAvatarPreview(null);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-[11px] font-semibold"
                      >
                        {React.createElement(FaTrashAlt as unknown as React.ComponentType<{ className?: string }>, {
                          className: 'text-[10px]',
                        })}
                        <span>{t('common.removePhoto')}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="name" className="exec-label">
                  {t('auth.register.fullNameLabel')} *
                </label>
                <input
                  id="name"
                  type="text"
                  {...register('name')}
                  className={`exec-input ${errors.name ? 'exec-input-error' : ''}`}
                  placeholder={t('auth.register.fullNamePlaceholder')}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="exec-label">
                  {t('auth.emailLabel')} *
                </label>
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  className={`exec-input ${errors.email ? 'exec-input-error' : ''}`}
                  placeholder={t('auth.emailPlaceholder')}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cpf" className="exec-label">
                    {t('auth.register.cpfLabel')} *
                  </label>
                  <input
                    id="cpf"
                    type="text"
                    inputMode="numeric"
                    value={cpfValue}
                    onChange={(e) => setValue('cpf', formatCpfInput(e.target.value))}
                    className={`exec-input tabular-nums ${errors.cpf ? 'exec-input-error' : ''}`}
                    placeholder={t('auth.register.cpfPlaceholder')}
                  />
                  {errors.cpf && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                      {errors.cpf.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="exec-label">
                    {t('auth.register.phoneLabel')} *
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    value={phoneValue}
                    onChange={(e) => setValue('phone', formatPhoneInput(e.target.value))}
                    className={`exec-input tabular-nums ${errors.phone ? 'exec-input-error' : ''}`}
                    placeholder={t('auth.register.phonePlaceholder')}
                  />
                  {errors.phone && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="password" className="exec-label">
                    {t('auth.passwordLabel')} *
                  </label>
                  <input
                    id="password"
                    type="password"
                    {...register('password')}
                    className={`exec-input ${errors.password ? 'exec-input-error' : ''}`}
                    placeholder="••••••••"
                  />
                  {errors.password && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="exec-label">
                    {t('auth.register.confirmPasswordLabel')} *
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    {...register('confirmPassword')}
                    className={`exec-input ${errors.confirmPassword ? 'exec-input-error' : ''}`}
                    placeholder="••••••••"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="exec-btn-primary w-full py-3 mt-2"
              >
                {loading ? t('auth.register.submitting') : t('auth.register.submitButton')}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('auth.register.alreadyHasAccount')}{' '}
                <Link
                  to="/login"
                  className="font-semibold text-slate-900 dark:text-emerald-400 hover:underline underline-offset-4"
                >
                  {t('auth.register.signInHere')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <GoogleCompleteProfileModal
        pending={googlePending}
        onClose={() => setGooglePending(null)}
      />
    </div>
  );
};

export default Register;
