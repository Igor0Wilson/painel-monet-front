import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationTriangle,
  FaEye,
  FaEyeSlash,
  FaKey,
  FaShieldAlt,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import ThemeAndLangControls from '../components/ThemeAndLangControls';
import {
  confirmFirebasePasswordReset,
  translateFirebaseAuthError,
  verifyFirebaseResetCode,
} from '../services/firebaseAuth';

const AuthAction: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const mode = searchParams.get('mode') || 'resetPassword';
  const oobCode = searchParams.get('oobCode') || '';
  const intent = searchParams.get('intent') === 'reactivate' ? 'reactivate' : 'reset';

  const [verifying, setVerifying] = useState(true);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [invalidReason, setInvalidReason] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let active = true;
    const validateCode = async () => {
      if (mode !== 'resetPassword' || !oobCode) {
        if (active) {
          setInvalidReason(t('auth.action.invalidSubtitle'));
          setVerifying(false);
        }
        return;
      }

      try {
        const email = await verifyFirebaseResetCode(oobCode);
        if (active) {
          setVerifiedEmail(email);
          setInvalidReason(null);
        }
      } catch (error: unknown) {
        if (active) {
          const msg =
            translateFirebaseAuthError(error, t('auth.action.invalidSubtitle')) ||
            t('auth.action.invalidSubtitle');
          setInvalidReason(msg);
        }
      } finally {
        if (active) setVerifying(false);
      }
    };

    validateCode();
    return () => {
      active = false;
    };
  }, [mode, oobCode, t]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error(t('auth.validation.passwordMin'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('auth.validation.passwordsMismatch'));
      return;
    }

    try {
      setSubmitting(true);
      await confirmFirebasePasswordReset(oobCode, newPassword);
      setCompleted(true);
      toast.success(
        intent === 'reactivate'
          ? t('auth.action.toastReactivated')
          : t('auth.action.toastReset'),
      );
      setTimeout(() => {
        navigate(intent === 'reactivate' ? '/login?reactivated=1' : '/login?passwordReset=1');
      }, 2200);
    } catch (error: unknown) {
      const msg =
        translateFirebaseAuthError(error, t('auth.action.genericError')) ||
        t('auth.action.genericError');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isReactivate = intent === 'reactivate';

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
            <p className="text-sm font-semibold tracking-tight text-white">
              {t('common.appName')}
            </p>
            <p className="text-[11px] text-slate-400">{t('common.suiteName')}</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-5">
          <h1 className="text-3xl font-semibold tracking-tight leading-tight text-white">
            {isReactivate ? t('auth.action.titleReactivate') : t('auth.action.titleReset')}
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            {isReactivate ? t('auth.action.subtitleReactivate') : t('auth.action.subtitleReset')}
          </p>
          <div className="flex items-center gap-3 text-xs text-slate-300 pt-2">
            <span className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400">
              {React.createElement(FaShieldAlt as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
            </span>
            {t('auth.heroBullet3')}
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-500">
          &copy; {new Date().getFullYear()} {t('auth.heroCopyright')}
        </p>
      </div>

      <div className="w-full min-w-0 flex-1 flex flex-col justify-center items-center px-5 py-8 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-md min-w-0">
          <div className="mb-6 flex items-center justify-between gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {React.createElement(FaArrowLeft as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
              {t('auth.action.goToLogin')}
            </Link>
            <ThemeAndLangControls />
          </div>

          <div className="mb-6">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 flex items-center justify-center mb-4">
              {React.createElement(FaKey as unknown as React.ComponentType<{ className?: string }>, { className: 'text-base' })}
            </div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
              {isReactivate ? t('auth.action.titleReactivate') : t('auth.action.titleReset')}
            </h2>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              {verifying
                ? t('auth.action.validating')
                : completed
                  ? t('auth.action.doneSubtitle')
                  : isReactivate
                    ? t('auth.action.subtitleReactivate')
                    : t('auth.action.subtitleReset')}
            </p>
          </div>

          <div className="exec-card p-6 sm:p-8">
            {verifying ? (
              <div className="py-10 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-slate-900 dark:border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t('auth.action.validating')}
                </p>
              </div>
            ) : invalidReason ? (
              <div className="space-y-5">
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-4 flex items-start gap-3 text-xs text-rose-900 dark:text-rose-200">
                  {React.createElement(FaExclamationTriangle as unknown as React.ComponentType<{ className?: string }>, {
                    className: 'text-rose-600 dark:text-rose-400 text-base mt-0.5 flex-shrink-0',
                  })}
                  <div className="leading-relaxed">
                    <p className="font-semibold">{t('auth.action.invalidTitle')}</p>
                    <p className="mt-1">{invalidReason}</p>
                  </div>
                </div>
                <Link
                  to="/forgot-password"
                  className="exec-btn-primary w-full py-3 inline-flex items-center justify-center"
                >
                  {t('auth.action.requestNewLink')}
                </Link>
              </div>
            ) : completed ? (
              <div className="space-y-5 text-center py-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  {React.createElement(FaCheckCircle as unknown as React.ComponentType<{ className?: string }>, { className: 'text-2xl' })}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {t('auth.action.doneTitle')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {t('auth.action.doneSubtitle')}
                  </p>
                </div>
                <Link
                  to={isReactivate ? '/login?reactivated=1' : '/login?passwordReset=1'}
                  className="exec-btn-primary w-full py-3 inline-flex items-center justify-center"
                >
                  {t('auth.action.goToLogin')}
                </Link>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleConfirm}>
                {verifiedEmail && (
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 px-3.5 py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        {t('auth.action.accountLabel')}
                      </p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {verifiedEmail}
                      </p>
                    </div>
                    {React.createElement(FaCheckCircle as unknown as React.ComponentType<{ className?: string }>, {
                      className: 'text-emerald-600 dark:text-emerald-400 text-base flex-shrink-0',
                    })}
                  </div>
                )}

                <div>
                  <label htmlFor="action-new-password" className="exec-label">
                    {t('auth.action.newPasswordLabel')}
                  </label>
                  <div className="relative">
                    <input
                      id="action-new-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="exec-input pr-10"
                      placeholder={t('auth.validation.passwordMin')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      {React.createElement((showPassword ? FaEyeSlash : FaEye) as unknown as React.ComponentType<{ className?: string }>, {
                        className: 'text-sm',
                      })}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="action-confirm-password" className="exec-label">
                    {t('auth.action.confirmNewPasswordLabel')}
                  </label>
                  <input
                    id="action-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="exec-input"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="exec-btn-primary w-full py-3 mt-2"
                >
                  {submitting
                    ? t('auth.action.saving')
                    : isReactivate
                      ? t('auth.action.submitReactivate')
                      : t('auth.action.submitReset')}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthAction;
