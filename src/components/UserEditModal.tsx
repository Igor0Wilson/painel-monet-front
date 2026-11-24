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
  FaCheckCircle,
  FaDownload,
  FaExclamationTriangle,
  FaEye,
  FaEyeSlash,
  FaFingerprint,
  FaKey,
  FaShieldAlt,
  FaTimes,
  FaTrashAlt,
  FaUser,
  FaUserShield,
  FaWhatsapp,
} from 'react-icons/fa';
import {
  BiometricCapabilityInfo,
  BiometricCredentialView,
  BiometricKind,
  clearLocalBiometricPointer,
  detectBiometricCapabilities,
  getLocalBiometricPointer,
  getLocalBiometricPointers,
  registerBiometricCredential,
  removeNativeBiometricSecretIfPresent,
  saveLocalBiometricPointer,
  syncLocalBiometricPointersWithServer,
} from '../utils/biometricAuth';
import {
  fetchSecurityPinStatus,
  getAuthProviderHint,
  removeSecurityPin,
  setSecurityPin,
  syncSecurityPinDeviceToken,
} from '../utils/securityLockAuth';
import AccountDangerModal from './AccountDangerModal';
import EncryptedImage from './EncryptedImage';
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
  const [bioCaps, setBioCaps] = useState<BiometricCapabilityInfo | null>(null);
  const [bioCreds, setBioCreds] = useState<BiometricCredentialView[]>([]);
  const [bioSelectedKind, setBioSelectedKind] = useState<BiometricKind>('facial');
  const [bioBusy, setBioBusy] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [accountProvider, setAccountProvider] = useState<'password' | 'google'>(
    () => getAuthProviderHint() || 'password',
  );
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

    detectBiometricCapabilities()
      .then((caps) => {
        if (cancelled) return;
        setBioCaps(caps);
        if (caps.isInstalledApp) {
          setBioSelectedKind('biometric');
        } else {
          setBioSelectedKind('facial');
        }
      })
      .catch(() => undefined);

    api
      .get<BiometricCredentialView[]>('/auth/biometric/credentials')
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res.data) ? res.data : [];
        setBioCreds(list);
        syncLocalBiometricPointersWithServer(list, authUser?.id);
        const pointer = getLocalBiometricPointer();
        if (pointer) {
          setBioSelectedKind(pointer.kind);
        }
      })
      .catch(() => undefined);

    fetchSecurityPinStatus()
      .then((status) => {
        if (cancelled) return;
        setHasPin(Boolean(status.hasPin));
        if (status.authProvider === 'google' || status.authProvider === 'password') {
          setAccountProvider(status.authProvider);
        }
        if (status.hasPin) {
          void syncSecurityPinDeviceToken(userData.name).catch(() => undefined);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [authUser?.id, isOpen, userData.name, reset, t]);

  const localBioPointers = getLocalBiometricPointers();
  const activeDeviceCred =
    bioCreds.find(
      (c) =>
        c.kind === bioSelectedKind &&
        localBioPointers.some((p) => p.credentialId === c.credentialId),
    ) ||
    bioCreds.find((c) => c.kind === bioSelectedKind) ||
    (!bioCaps?.isInstalledApp ? bioCreds[0] : null) ||
    null;

  const handleActivateOrReconfigureBiometric = async () => {
    try {
      setBioBusy(true);
      const kindToUse: BiometricKind = bioCaps?.isInstalledApp
        ? bioSelectedKind
        : 'facial';
      const promptTitle =
        kindToUse === 'facial'
          ? t('auth.facialLoginBtn')
          : kindToUse === 'fingerprint'
            ? t('auth.biometric.loginFingerprintApp')
            : bioCaps?.isInstalledApp
              ? t('auth.biometric.loginBiometricApp')
              : t('auth.biometric.loginFacialWeb');

      const created = await registerBiometricCredential({
        kind: kindToUse,
        promptTitle,
        userId: authUser?.id,
      });
      setBioCreds((prev) => [
        created,
        ...prev.filter((c) => c.id !== created.id),
      ]);
      toast.success(t('modals.userEdit.biometricActivatedToast'));
    } catch (error: unknown) {
      toast.error(
        extractApiErrorMessage(error, t('modals.userEdit.biometricErrorToast')),
      );
    } finally {
      setBioBusy(false);
    }
  };

  const handleSaveSecurityPin = async () => {
    const digits = pinInput.replace(/\D/g, '').slice(0, 6);
    if (!/^\d{4,6}$/.test(digits)) {
      toast.error(t('modals.userEdit.biometricPinInvalidError'));
      return;
    }
    try {
      setPinBusy(true);
      const res = await setSecurityPin(digits, userData.name);
      setHasPin(res.hasPin);
      setAccountProvider(res.authProvider);
      setPinInput('');
      toast.success(t('modals.userEdit.biometricPinSavedToast'));
    } catch (error: unknown) {
      toast.error(
        extractApiErrorMessage(error, t('modals.userEdit.biometricErrorToast')),
      );
    } finally {
      setPinBusy(false);
    }
  };

  const handleRemoveSecurityPin = async () => {
    try {
      setPinBusy(true);
      await removeSecurityPin();
      setHasPin(false);
      toast.info(t('modals.userEdit.biometricPinRemovedToast'));
    } catch (error: unknown) {
      toast.error(
        extractApiErrorMessage(error, t('modals.userEdit.biometricErrorToast')),
      );
    } finally {
      setPinBusy(false);
    }
  };

  const handleToggleBiometricEnabled = async (cred: BiometricCredentialView) => {
    try {
      setBioBusy(true);
      const nextEnabled = !cred.isEnabled;
      const res = await api.patch<BiometricCredentialView>(
        `/auth/biometric/credentials/${cred.id}`,
        {
          isEnabled: nextEnabled,
          kind: cred.kind,
        },
      );
      const updated = res.data;
      setBioCreds((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      if (!updated.isEnabled) {
        clearLocalBiometricPointer(updated.credentialId);
        toast.info(t('modals.userEdit.biometricDisabledToast'));
      } else {
        saveLocalBiometricPointer({
          id: updated.id,
          credentialId: updated.credentialId,
          protocol: updated.protocol,
          kind: updated.kind,
          platform: updated.platform,
          deviceLabel: updated.deviceLabel,
          userId: authUser?.id,
        });
        toast.success(t('modals.userEdit.biometricUpdatedToast'));
      }
    } catch (error: unknown) {
      toast.error(
        extractApiErrorMessage(error, t('modals.userEdit.biometricErrorToast')),
      );
    } finally {
      setBioBusy(false);
    }
  };

  const handleDeleteBiometricCredential = async (cred: BiometricCredentialView) => {
    try {
      setBioBusy(true);
      await api.delete(`/auth/biometric/credentials/${cred.id}`);
      await removeNativeBiometricSecretIfPresent(cred.credentialId);
      clearLocalBiometricPointer(cred.credentialId);
      setBioCreds((prev) => prev.filter((c) => c.id !== cred.id));
      toast.success(t('modals.userEdit.biometricRemovedToast'));
    } catch (error: unknown) {
      toast.error(
        extractApiErrorMessage(error, t('modals.userEdit.biometricErrorToast')),
      );
    } finally {
      setBioBusy(false);
    }
  };

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
                <EncryptedImage
                  src={avatarUrl}
                  alt={t('common.photoAltProfile')}
                  className="w-full h-full object-cover"
                  fallback={React.createElement(FaUser as unknown as React.ComponentType<{ className?: string }>, {
                    className: 'text-sm',
                  })}
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
                <EncryptedImage
                  src={avatarUrl}
                  alt={t('common.photoAltProfile')}
                  className="w-full h-full object-cover"
                  fallback={React.createElement(FaUser as unknown as React.ComponentType<{ className?: string }>, {
                    className: 'text-xl',
                  })}
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

          <div
            data-testid="biometric-settings-section"
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {React.createElement(
                    (bioCaps?.isInstalledApp ? FaFingerprint : FaUserShield) as unknown as React.ComponentType<{
                      className?: string;
                    }>,
                    { className: 'text-sm' },
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                      {t('modals.userEdit.biometricTitle')}
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        activeDeviceCred?.isEnabled
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {activeDeviceCred?.isEnabled
                        ? t('modals.userEdit.biometricActiveBadge')
                        : t('modals.userEdit.biometricInactiveBadge')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    {bioCaps?.isInstalledApp
                      ? t('modals.userEdit.biometricAppSubtitle')
                      : t('modals.userEdit.biometricWebSubtitle')}
                  </p>
                </div>
              </div>
            </div>

            {bioCaps?.isInstalledApp ? (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block">
                  {t('modals.userEdit.biometricModeLabel')}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'biometric', label: t('modals.userEdit.biometricModeBoth') },
                      {
                        id: 'fingerprint',
                        label: t('modals.userEdit.biometricModeFingerprint'),
                      },
                      { id: 'facial', label: t('modals.userEdit.biometricModeFacial') },
                    ] as { id: BiometricKind; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={bioBusy}
                      onClick={() => setBioSelectedKind(opt.id)}
                      className={`px-2.5 py-2 rounded-lg border text-[11px] font-semibold transition-all text-left ${
                        bioSelectedKind === opt.id
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                {React.createElement(
                  FaUserShield as unknown as React.ComponentType<{ className?: string }>,
                  { className: 'text-[10px] text-emerald-600 dark:text-emerald-400' },
                )}
                <span>{t('modals.userEdit.biometricModeFacial')}</span>
              </div>
            )}

            {bioCaps && !bioCaps.available && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-lg px-3 py-2">
                {t('modals.userEdit.biometricUnsupportedHint')}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                disabled={bioBusy}
                data-testid="biometric-activate-btn"
                onClick={handleActivateOrReconfigureBiometric}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {React.createElement(
                  FaCheckCircle as unknown as React.ComponentType<{ className?: string }>,
                  { className: 'text-[11px]' },
                )}
                <span>
                  {activeDeviceCred
                    ? t('modals.userEdit.biometricReconfigureBtn')
                    : t('modals.userEdit.biometricActivateBtn')}
                </span>
              </button>

              {activeDeviceCred && (
                <>
                  <button
                    type="button"
                    disabled={bioBusy}
                    data-testid="biometric-toggle-btn"
                    onClick={() => handleToggleBiometricEnabled(activeDeviceCred)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-50 ${
                      activeDeviceCred.isEnabled
                        ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200'
                        : 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200'
                    }`}
                  >
                    {activeDeviceCred.isEnabled
                      ? t('modals.userEdit.biometricToggleDisableBtn')
                      : t('modals.userEdit.biometricToggleEnableBtn')}
                  </button>

                  <button
                    type="button"
                    disabled={bioBusy}
                    data-testid="biometric-remove-btn"
                    onClick={() => handleDeleteBiometricCredential(activeDeviceCred)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {React.createElement(
                      FaTrashAlt as unknown as React.ComponentType<{ className?: string }>,
                      { className: 'text-[10px]' },
                    )}
                    <span>{t('modals.userEdit.biometricRemoveBtn')}</span>
                  </button>
                </>
              )}
            </div>

            {bioCreds.length > 0 && (
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {t('modals.userEdit.biometricEnrolledListTitle', {
                    count: bioCreds.length,
                  })}
                </p>
                <div className="space-y-1">
                  {bioCreds.map((cred) => (
                    <div
                      key={cred.id}
                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-[11px]"
                    >
                      <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                        {cred.deviceLabel} ·{' '}
                        {cred.kind === 'fingerprint'
                          ? t('modals.userEdit.biometricModeFingerprint')
                          : cred.kind === 'facial'
                            ? t('modals.userEdit.biometricModeFacial')
                            : t('modals.userEdit.biometricModeBoth')}
                      </span>
                      <span
                        className={`font-semibold flex-shrink-0 ${
                          cred.isEnabled
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {cred.isEnabled
                          ? t('modals.userEdit.biometricActiveBadge')
                          : t('modals.userEdit.biometricInactiveBadge')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {accountProvider === 'google' && (
              <p className="text-[11px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 rounded-lg px-3 py-2">
                {t('modals.userEdit.biometricGooglePersistHint')}
              </p>
            )}
          </div>

          <div
            data-testid="pin-settings-section"
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-4 space-y-3"
          >
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                {React.createElement(FaKey as unknown as React.ComponentType<{ className?: string }>, {
                  className: 'text-sm',
                })}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                    {t('modals.userEdit.biometricPinCardTitle')}
                  </h4>
                  {hasPin && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      {t('modals.userEdit.biometricPinActiveBadge')}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {t('modals.userEdit.biometricPinCardDesc')}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                data-testid="pin-settings-input"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={t('modals.userEdit.biometricPinPlaceholder')}
                className="exec-input text-xs flex-1 tabular-nums tracking-[0.25em]"
              />
              <button
                type="button"
                disabled={pinBusy || pinInput.length < 4}
                data-testid="pin-save-btn"
                onClick={handleSaveSecurityPin}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {t('modals.userEdit.biometricPinSaveBtn')}
              </button>
              {hasPin && (
                <button
                  type="button"
                  disabled={pinBusy}
                  data-testid="pin-remove-btn"
                  onClick={handleRemoveSecurityPin}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {t('modals.userEdit.biometricPinRemoveBtn')}
                </button>
              )}
            </div>
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
