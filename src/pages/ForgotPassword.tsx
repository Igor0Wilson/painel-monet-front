import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FaArrowLeft,
  FaCheckCircle,
  FaEnvelopeOpenText,
  FaExclamationTriangle,
  FaKey,
  FaShieldAlt,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../api';
import ThemeAndLangControls from '../components/ThemeAndLangControls';
import { extractApiErrorMessage } from '../utils/errorHandler';
import { formatCpfInput, onlyDigits } from '../utils/formatters';

interface ForgotPasswordLocationState {
  identifier?: string;
  reason?: 'cpf_exists' | 'reactivate';
}

const ForgotPassword: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const state = (location.state as ForgotPasswordLocationState | null) || {};

  const [identifier, setIdentifier] = useState<string>(state.identifier || '');
  const [sent, setSent] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [isDeactivated, setIsDeactivated] = useState(state.reason === 'reactivate');
  const [loading, setLoading] = useState(false);

  const handleIdentifierChange = (raw: string) => {
    if (!raw.includes('@') && /^[\d.\-\s]*$/.test(raw)) {
      setIdentifier(formatCpfInput(raw));
    } else {
      setIdentifier(raw);
    }
  };

  const handleSendFirebaseEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = identifier.trim();
    if (!trimmed) {
      toast.error(t('auth.validation.required'));
      return;
    }

    try {
      setLoading(true);
      const payloadIdentifier = trimmed.includes('@')
        ? trimmed.toLowerCase()
        : onlyDigits(trimmed);

      const response = await api.post('/auth/forgot-password', {
        identifier: payloadIdentifier,
        mode: state.reason === 'reactivate' ? 'reactivate' : 'reset',
      });

      setMaskedEmail(response.data?.maskedEmail || null);
      if (typeof response.data?.isDeactivated === 'boolean') {
        setIsDeactivated(response.data.isDeactivated);
      }
      setSent(true);
      toast.success(response.data?.message || t('auth.forgot.successToast'));
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, t('auth.forgot.errorToast')));
    } finally {
      setLoading(false);
    }
  };

  const isReactivateFlow = state.reason === 'reactivate' || isDeactivated;

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
            {t('auth.forgot.title')}
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            {t('auth.forgot.subtitle')}
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
              {t('auth.forgot.backToLogin')}
            </Link>
            <ThemeAndLangControls />
          </div>

          <div className="mb-6">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 flex items-center justify-center mb-4">
              {React.createElement((sent ? FaEnvelopeOpenText : FaKey) as unknown as React.ComponentType<{ className?: string }>, {
                className: 'text-base',
              })}
            </div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
              {t('auth.forgot.title')}
            </h2>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              {sent
                ? t('auth.forgot.sentSubtitle', { email: maskedEmail || identifier })
                : t('auth.forgot.subtitle')}
            </p>
          </div>

          {state.reason === 'cpf_exists' && !sent && (
            <div className="mb-5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 flex items-start gap-3">
              {React.createElement(FaExclamationTriangle as unknown as React.ComponentType<{ className?: string }>, {
                className: 'text-amber-600 dark:text-amber-400 text-sm mt-0.5 flex-shrink-0',
              })}
              <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                <p className="font-semibold">{t('auth.register.cpfExistsRedirect')}</p>
              </div>
            </div>
          )}

          {state.reason === 'reactivate' && !sent && (
            <div className="mb-5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 flex items-start gap-3">
              {React.createElement(FaExclamationTriangle as unknown as React.ComponentType<{ className?: string }>, {
                className: 'text-amber-600 dark:text-amber-400 text-sm mt-0.5 flex-shrink-0',
              })}
              <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                <p className="font-semibold">{t('auth.deactivatedBannerTitle')}</p>
                <p className="mt-0.5">
                  {t('auth.deactivatedBannerBody', { email: identifier || 'seu e-mail' })}
                </p>
              </div>
            </div>
          )}

          <div className="exec-card p-6 sm:p-8">
            {!sent ? (
              <form className="space-y-5" onSubmit={handleSendFirebaseEmail}>
                <div>
                  <label htmlFor="identifier" className="exec-label">
                    {t('auth.emailLabel')} / CPF
                  </label>
                  <input
                    id="identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => handleIdentifierChange(e.target.value)}
                    className="exec-input"
                    placeholder={`000.000.000-00 ${t('common.or')} ${t('auth.emailPlaceholder')}`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="exec-btn-primary w-full py-3"
                >
                  {loading
                    ? t('auth.forgot.sending')
                    : isReactivateFlow
                      ? t('auth.deactivatedButtonSend')
                      : t('auth.forgot.sendButton')}
                </button>
              </form>
            ) : (
              <div className="space-y-5">
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 p-4 flex items-start gap-3 text-xs text-emerald-950 dark:text-emerald-200">
                  {React.createElement(FaCheckCircle as unknown as React.ComponentType<{ className?: string }>, {
                    className: 'text-emerald-600 dark:text-emerald-400 text-base mt-0.5 flex-shrink-0',
                  })}
                  <div className="space-y-1.5 leading-relaxed">
                    <p className="font-semibold">{t('auth.forgot.sentTitle')}</p>
                    <p>{t('auth.forgot.sentSubtitle', { email: maskedEmail || identifier })}</p>
                    <p>{t('auth.forgot.sentWarning')}</p>
                  </div>
                </div>

                <Link
                  to="/login"
                  className="exec-btn-primary w-full py-3 inline-flex items-center justify-center"
                >
                  {t('auth.action.goToLogin')}
                </Link>

                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="w-full text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  {t('auth.forgot.resendButton')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
