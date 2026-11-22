import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import api from '../api';
import { useAuth, type User } from '../context/AuthContext';
import { extractApiErrorMessage } from '../utils/errorHandler';
import {
  FaCamera,
  FaDownload,
  FaExclamationTriangle,
  FaEye,
  FaEyeSlash,
  FaShieldAlt,
  FaTimes,
  FaTrashAlt,
  FaUser,
  FaWhatsapp,
} from 'react-icons/fa';
import AccountDangerModal from './AccountDangerModal';
import { downloadUserFinancialData } from '../utils/downloadUserData';
import {
  buildWhatsAppUrl,
  formatCpfInput,
  formatPhoneInput,
  onlyDigits,
} from '../utils/formatters';
import { prepareImageForUpload } from '../utils/imageUpload';

interface UserEditFormData {
  name: string;
  email: string;
  cpf?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData: {
    name: string;
    email?: string;
    cpf?: string | null;
    phone?: string | null;
  };
  onSuccess: () => void;
}

const UserEditModal: React.FC<UserEditModalProps> = ({
  isOpen,
  onClose,
  userData,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { user: authUser, updateUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(authUser?.avatarUrl || null);
  const [downloadingBackup, setDownloadingBackup] = useState(false);
  const [dangerModalOpen, setDangerModalOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const latestAuthAvatarRef = useRef<string | null>(authUser?.avatarUrl || null);
  latestAuthAvatarRef.current = authUser?.avatarUrl || null;

  const schema = useMemo(
    () =>
      yup.object().shape({
        name: yup.string().required(t('auth.validation.nameRequired')),
        email: yup
          .string()
          .email(t('auth.validation.emailInvalid'))
          .required(t('auth.validation.emailRequired')),
        cpf: yup
          .string()
          .optional()
          .test('cpf-len', t('auth.validation.cpfLen'), (v) => {
            const d = onlyDigits(v);
            return d.length === 0 || d.length === 11;
          }),
        phone: yup.string().optional(),
        password: yup
          .string()
          .transform((v) => (v === '' ? undefined : v))
          .min(6, t('auth.validation.passwordMin'))
          .optional(),
        confirmPassword: yup
          .string()
          .transform((v) => (v === '' ? undefined : v))
          .oneOf([yup.ref('password'), undefined], t('auth.validation.passwordsMismatch'))
          .optional(),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UserEditFormData>({
    resolver: yupResolver(schema) as unknown as Resolver<UserEditFormData>,
    defaultValues: {
      name: userData.name,
      email: userData.email || '',
      cpf: formatCpfInput(userData.cpf),
      phone: formatPhoneInput(userData.phone),
      password: '',
      confirmPassword: '',
    },
  });

  const phoneValue = watch('phone') || '';
  const cpfValue = watch('cpf') || '';
  const whatsappLink = buildWhatsAppUrl(phoneValue);

  useEffect(() => {
    if (!isOpen) {
      reset({
        name: userData.name,
        email: '',
        cpf: '',
        phone: '',
        password: '',
        confirmPassword: '',
      });
      return;
    }

    setAvatarUrl(latestAuthAvatarRef.current);

    let cancelled = false;
    setLoadingProfile(true);
    api
      .get('/users/me/profile')
      .then((res) => {
        if (cancelled) return;
        const p = res.data as {
          name?: string;
          email?: string;
          cpf?: string | null;
          phone?: string | null;
          avatarUrl?: string | null;
        };
        setAvatarUrl(p.avatarUrl || null);
        reset({
          name: p.name || userData.name,
          email: p.email || '',
          cpf: formatCpfInput(p.cpf),
          phone: formatPhoneInput(p.phone),
          password: '',
          confirmPassword: '',
        });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          toast.error(extractApiErrorMessage(error, t('modals.userEdit.loadError')));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProfile(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, userData.name, reset, t]);

  if (!isOpen) return null;

  const handleAvatarSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setUploadingAvatar(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/users/me/avatar', formData);
      const nextUser = res.data as User;
      setAvatarUrl(nextUser.avatarUrl || null);
      updateUser(nextUser);
      onSuccess();
      toast.success(t('modals.userEdit.avatarUpdatedToast'));
    } catch (err: unknown) {
      toast.error(extractApiErrorMessage(err, t('common.photoUploadError')));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!avatarUrl) return;
    try {
      setUploadingAvatar(true);
      const res = await api.delete('/users/me/avatar');
      const nextUser = res.data as User;
      setAvatarUrl(null);
      updateUser(nextUser);
      onSuccess();
      toast.success(t('modals.userEdit.avatarDeletedToast'));
    } catch (err: unknown) {
      toast.error(extractApiErrorMessage(err, t('modals.userEdit.saveError')));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onSubmit = async (data: UserEditFormData) => {
    try {
      setLoading(true);
      const payload: Record<string, string> = {
        name: data.name,
        email: data.email,
        cpf: onlyDigits(data.cpf),
        phone: onlyDigits(data.phone),
      };
      if (data.password) payload.password = data.password;

      const res = await api.patch('/users/me', payload);
      if (res.data) {
        updateUser(res.data as User);
      }
      toast.success(t('modals.userEdit.saveSuccess'));
      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, t('modals.userEdit.saveError')));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      setDownloadingBackup(true);
      await downloadUserFinancialData();
    } finally {
      setDownloadingBackup(false);
    }
  };

  return (
    <div className="exec-modal-overlay z-[100]">
      <div className="exec-modal-container max-w-lg">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={t('common.photoAltProfile')}
                  className="w-full h-full object-cover"
                />
              ) : (
                React.createElement(FaUser as unknown as React.ComponentType<{ className?: string }>, {
                  className: 'text-sm',
                })
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {t('modals.userEdit.title')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('modals.userEdit.subtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors p-2 rounded-lg"
          >
            {React.createElement(FaTimes as unknown as React.ComponentType<{ className?: string }>, {
              className: 'text-sm',
            })}
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Foto de perfil no Cloudinary */}
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 p-3.5 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-300/70 dark:border-slate-600">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={t('common.photoAltProfile')}
                  className="w-full h-full object-cover"
                />
              ) : (
                React.createElement(FaUser as unknown as React.ComponentType<{ className?: string }>, {
                  className: 'text-xl',
                })
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                {t('modals.userEdit.avatarLabel')}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                {t('modals.userEdit.avatarHint')} • {t('common.photoHint')}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarSelected}
                  className="hidden"
                  data-testid="user-edit-avatar-input"
                />
                <button
                  type="button"
                  disabled={uploadingAvatar}
                  onClick={() => avatarInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-100 transition-colors disabled:opacity-60"
                >
                  {React.createElement(FaCamera as unknown as React.ComponentType<{ className?: string }>, {
                    className: 'text-[11px]',
                  })}
                  <span>
                    {uploadingAvatar
                      ? t('common.uploadingPhoto')
                      : avatarUrl
                        ? t('common.changePhoto')
                        : t('common.selectPhoto')}
                  </span>
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    disabled={uploadingAvatar}
                    onClick={handleRemoveAvatar}
                    data-testid="user-edit-remove-avatar-btn"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-semibold transition-colors disabled:opacity-60"
                  >
                    {React.createElement(FaTrashAlt as unknown as React.ComponentType<{ className?: string }>, {
                      className: 'text-[11px]',
                    })}
                    <span>{t('common.removePhoto')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="exec-label">{t('modals.userEdit.fullNameLabel')}</label>
            <input
              {...register('name')}
              className={`exec-input ${errors.name ? 'exec-input-error' : ''}`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                {errors.name.message as string}
              </p>
            )}
          </div>

          <div>
            <label className="exec-label">{t('modals.userEdit.emailLabel')}</label>
            <input
              type="email"
              {...register('email')}
              className={`exec-input ${errors.email ? 'exec-input-error' : ''}`}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                {errors.email.message as string}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="exec-label">{t('modals.userEdit.cpfLabel')}</label>
              <input
                type="text"
                inputMode="numeric"
                value={cpfValue}
                onChange={(e) => setValue('cpf', formatCpfInput(e.target.value))}
                className={`exec-input tabular-nums ${errors.cpf ? 'exec-input-error' : ''}`}
                placeholder={t('auth.register.cpfPlaceholder')}
              />
              {errors.cpf && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {errors.cpf.message as string}
                </p>
              )}
            </div>

            <div>
              <label className="exec-label">{t('modals.userEdit.phoneLabel')}</label>
              <input
                type="tel"
                inputMode="tel"
                value={phoneValue}
                onChange={(e) => setValue('phone', formatPhoneInput(e.target.value))}
                className="exec-input tabular-nums"
                placeholder={t('auth.register.phonePlaceholder')}
              />
              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:underline"
                >
                  {React.createElement(FaWhatsapp as unknown as React.ComponentType<{ className?: string }>, {
                    className: 'text-sm',
                  })}
                  {t('modals.userEdit.openWhatsappLink')}
                </a>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 px-3.5 py-2.5 flex items-start gap-2.5">
            {React.createElement(FaShieldAlt as unknown as React.ComponentType<{ className?: string }>, {
              className: 'text-slate-600 dark:text-emerald-400 text-xs mt-0.5 flex-shrink-0',
            })}
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('modals.userEdit.cpfNotice')}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="exec-label">{t('modals.userEdit.newPasswordLabel')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className={`exec-input pr-10 ${errors.password ? 'exec-input-error' : ''}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  {React.createElement((showPassword ? FaEyeSlash : FaEye) as unknown as React.ComponentType<{ className?: string }>, {
                    className: 'text-sm',
                  })}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {errors.password.message as string}
                </p>
              )}
            </div>

            <div>
              <label className="exec-label">{t('modals.userEdit.confirmPasswordLabel')}</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...register('confirmPassword')}
                  className={`exec-input pr-10 ${errors.confirmPassword ? 'exec-input-error' : ''}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  {React.createElement((showConfirmPassword ? FaEyeSlash : FaEye) as unknown as React.ComponentType<{ className?: string }>, {
                    className: 'text-sm',
                  })}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {errors.confirmPassword.message as string}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="exec-btn-secondary">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={loading || loadingProfile} className="exec-btn-primary">
              {loading
                ? t('common.saving')
                : loadingProfile
                  ? t('common.loading')
                  : t('modals.userEdit.saveBtn')}
            </button>
          </div>

          <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <button
              type="button"
              onClick={handleDownloadBackup}
              disabled={downloadingBackup}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
            >
              {React.createElement(FaDownload as unknown as React.ComponentType<{ className?: string }>, {
                className: 'text-xs',
              })}
              {downloadingBackup
                ? t('modals.userEdit.backupGenerating')
                : t('modals.userEdit.backupBtn')}
            </button>

            <button
              type="button"
              onClick={() => setDangerModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-semibold transition-colors"
            >
              {React.createElement(FaExclamationTriangle as unknown as React.ComponentType<{ className?: string }>, {
                className: 'text-xs',
              })}
              {t('modals.userEdit.dangerBtn')}
            </button>
          </div>
        </form>
      </div>

      <AccountDangerModal
        isOpen={dangerModalOpen}
        onClose={() => setDangerModalOpen(false)}
        onDownloadBackup={handleDownloadBackup}
        downloading={downloadingBackup}
      />
    </div>
  );
};

export default UserEditModal;
