import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FaCamera,
  FaCheckCircle,
  FaTimes,
  FaTrashAlt,
  FaUser,
  FaUserShield,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../../api';
import { useAuth, type User } from '../../context/AuthContext';
import { extractApiErrorMessage, getApiErrorCode } from '../../utils/errorHandler';
import { formatCpfInput, formatPhoneInput, onlyDigits } from '../../utils/formatters';
import { createPreviewDataUrl, prepareImageForUpload } from '../../utils/imageUpload';

export interface GooglePendingProfile {
  completionToken: string;
  email: string;
  name: string;
  cpf?: string;
  phone?: string;
}

interface GoogleCompleteProfileModalProps {
  pending: GooglePendingProfile | null;
  onClose: () => void;
}

const GoogleCompleteProfileModal: React.FC<GoogleCompleteProfileModalProps> = ({
  pending,
  onClose,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cpfConflictMessage, setCpfConflictMessage] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (pending) {
      setName(pending.name || '');
      setCpf(pending.cpf ? formatCpfInput(pending.cpf) : '');
      setPhone(pending.phone ? formatPhoneInput(pending.phone) : '');
      setCpfConflictMessage(null);
      setAvatarFile(null);
      setAvatarPreview(null);
    }
  }, [pending]);

  if (!pending) return null;

  const handleSelectPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCpfConflictMessage(null);

    const trimmedName = name.trim();
    const cpfDigits = onlyDigits(cpf);
    const phoneDigits = onlyDigits(phone);

    if (trimmedName.length < 2) {
      toast.error(t('auth.validation.nameMin'));
      return;
    }
    if (cpfDigits.length !== 11) {
      toast.error(t('auth.validation.cpfLen'));
      return;
    }
    if (phoneDigits.length < 10) {
      toast.error(t('auth.validation.phoneLen'));
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post('/auth/google/complete', {
        completionToken: pending.completionToken,
        name: trimmedName,
        cpf: cpfDigits,
        phone: phoneDigits,
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
      toast.success(t('auth.googleComplete.successToast'));
      onClose();
      navigate('/dashboard', { replace: true });
    } catch (error: unknown) {
      const code = getApiErrorCode(error);
      const message = extractApiErrorMessage(error, t('auth.googleComplete.errorToast'));

      if (code === 'CPF_ALREADY_EXISTS' || message.toLowerCase().includes('cpf já está')) {
        const redirectMsg = t('auth.register.cpfExistsRedirect');
        setCpfConflictMessage(redirectMsg);
        toast.warning(redirectMsg);
        setTimeout(() => {
          onClose();
          navigate('/forgot-password', {
            state: { identifier: formatCpfInput(cpfDigits), reason: 'cpf_exists' },
          });
        }, 1800);
        return;
      }

      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="exec-modal-overlay z-50">
      <div className="exec-modal-container max-w-md">
        <div className="px-6 py-5 bg-slate-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              {React.createElement(FaUserShield as unknown as React.ComponentType<{ className?: string }>, { className: 'text-base' })}
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight">
                {t('auth.googleComplete.title')}
              </h3>
              <p className="text-xs text-slate-400">
                {t('auth.googleComplete.subtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label={t('common.close')}
          >
            {React.createElement(FaTimes as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 px-3.5 py-2.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                {t('auth.googleComplete.emailConnected')}
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {pending.email}
              </p>
            </div>
            {React.createElement(FaCheckCircle as unknown as React.ComponentType<{ className?: string }>, {
              className: 'text-emerald-600 dark:text-emerald-400 text-base flex-shrink-0',
            })}
          </div>

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
                {t('auth.googleComplete.photoLabel')}
              </p>
              <p className="text-[11px] text-slate-400 mb-2">{t('common.photoHint')}</p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleSelectPhoto}
                  className="hidden"
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

          {cpfConflictMessage && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-900 dark:text-amber-200 font-medium">
              {cpfConflictMessage}
            </div>
          )}

          <div>
            <label htmlFor="google-name" className="exec-label">
              {t('auth.googleComplete.nameLabel')} *
            </label>
            <input
              id="google-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="exec-input"
              placeholder={t('auth.register.fullNamePlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="google-cpf" className="exec-label">
              {t('auth.googleComplete.cpfLabel')}
            </label>
            <input
              id="google-cpf"
              type="text"
              inputMode="numeric"
              required
              value={cpf}
              onChange={(e) => setCpf(formatCpfInput(e.target.value))}
              className="exec-input tabular-nums"
              placeholder={t('auth.register.cpfPlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="google-phone" className="exec-label">
              {t('auth.googleComplete.phoneLabel')}
            </label>
            <input
              id="google-phone"
              type="tel"
              inputMode="tel"
              required
              value={phone}
              onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
              className="exec-input tabular-nums"
              placeholder={t('auth.register.phonePlaceholder')}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 exec-btn-secondary py-2.5"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 exec-btn-primary py-2.5"
            >
              {submitting ? t('auth.googleComplete.submitting') : t('auth.googleComplete.submitButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoogleCompleteProfileModal;
