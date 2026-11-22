import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FaDownload,
  FaExclamationTriangle,
  FaPauseCircle,
  FaTimes,
  FaTrashAlt,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { extractApiErrorMessage } from '../utils/errorHandler';

interface AccountDangerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadBackup: () => Promise<void>;
  downloading: boolean;
}

const AccountDangerModal: React.FC<AccountDangerModalProps> = ({
  isOpen,
  onClose,
  onDownloadBackup,
  downloading,
}) => {
  const { t } = useTranslation();
  const [selectedAction, setSelectedAction] = useState<'deactivate' | 'delete' | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const resetAndClose = () => {
    setSelectedAction(null);
    setStep(1);
    setConfirmChecked(false);
    setConfirmText('');
    onClose();
  };

  const handleProceedToSecondConfirmation = (action: 'deactivate' | 'delete') => {
    setSelectedAction(action);
    setConfirmChecked(false);
    setConfirmText('');
    setStep(2);
  };

  const handleConfirmAction = async () => {
    if (!selectedAction || !confirmChecked) {
      toast.error(t('modals.danger.errorCheckRequired'));
      return;
    }

    if (selectedAction === 'delete' && confirmText.trim().toUpperCase() !== 'EXCLUIR') {
      toast.error(t('modals.danger.errorTypeDelete'));
      return;
    }

    try {
      setSubmitting(true);
      if (selectedAction === 'deactivate') {
        const res = await api.post('/users/me/deactivate', { confirmed: true });
        toast.info(res.data?.message || t('modals.danger.deactivatedDefaultMsg'));
      } else {
        const res = await api.delete('/users/me', {
          data: { confirmed: true, confirmText: confirmText.trim().toUpperCase() },
        });
        toast.success(res.data?.message || t('modals.danger.deletedDefaultMsg'));
      }

      logout();
      resetAndClose();
      navigate('/login');
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, t('modals.danger.genericError')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="exec-modal-overlay z-[120]">
      <div className="exec-modal-container max-w-lg">
        <div className="px-6 py-4 bg-rose-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center">
              {React.createElement(FaExclamationTriangle as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
            </div>
            <div>
              <h3 className="text-sm font-semibold">{t('modals.danger.title')}</h3>
              <p className="text-[11px] text-rose-200/80">{t('modals.danger.subtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="text-rose-200 hover:text-white p-1.5 rounded-lg"
            aria-label={t('common.close')}
          >
            {React.createElement(FaTimes as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                {t('modals.danger.downloadBackupBtn')}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {t('modals.danger.step1Warning')}
              </p>
            </div>
            <button
              type="button"
              onClick={onDownloadBackup}
              disabled={downloading}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-emerald-400 transition-colors flex-shrink-0 disabled:opacity-60"
            >
              {React.createElement(FaDownload as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
              {downloading ? t('modals.userEdit.backupGenerating') : t('modals.danger.downloadBackupBtn')}
            </button>
          </div>

          {step === 1 ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                      {React.createElement(FaPauseCircle as unknown as React.ComponentType<{ className?: string }>, {
                        className: 'text-amber-600 dark:text-amber-400 text-sm',
                      })}
                      {t('modals.danger.deactivateTitle')}
                    </p>
                    <p className="text-xs text-amber-900/90 dark:text-amber-200/80 mt-1 leading-relaxed">
                      {t('modals.danger.deactivateDesc')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleProceedToSecondConfirmation('deactivate')}
                  className="mt-3 w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors"
                >
                  {t('modals.danger.deactivateBtn')}
                </button>
              </div>

              <div className="rounded-xl border border-rose-200 dark:border-rose-800/70 bg-rose-50/70 dark:bg-rose-950/30 p-4">
                <p className="text-sm font-semibold text-rose-950 dark:text-rose-200 flex items-center gap-2">
                  {React.createElement(FaTrashAlt as unknown as React.ComponentType<{ className?: string }>, {
                    className: 'text-rose-600 dark:text-rose-400 text-sm',
                  })}
                  {t('modals.danger.deleteTitle')}
                </p>
                <p className="text-xs text-rose-900/90 dark:text-rose-200/80 mt-1 leading-relaxed">
                  {t('modals.danger.deleteDesc')}
                </p>
                <button
                  type="button"
                  onClick={() => handleProceedToSecondConfirmation('delete')}
                  className="mt-3 w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors"
                >
                  {t('modals.danger.deleteBtn')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className={`rounded-xl p-4 border text-xs leading-relaxed ${
                  selectedAction === 'deactivate'
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200'
                    : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-200'
                }`}
              >
                <p className="font-semibold mb-1">
                  {selectedAction === 'deactivate'
                    ? t('modals.danger.step2DeactivateTitle')
                    : t('modals.danger.step2DeleteTitle')}
                </p>
                <p>
                  {selectedAction === 'deactivate'
                    ? t('modals.danger.deactivateDesc')
                    : t('modals.danger.deleteDesc')}
                </p>
              </div>

              {selectedAction === 'delete' && (
                <div>
                  <label htmlFor="delete-confirm-text" className="exec-label">
                    {t('modals.danger.typeDeletePrompt')}
                  </label>
                  <input
                    id="delete-confirm-text"
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="exec-input uppercase font-mono tracking-wider"
                    placeholder={t('modals.danger.typeDeletePlaceholder')}
                  />
                </div>
              )}

              <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={confirmChecked}
                  onChange={(e) => setConfirmChecked(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 dark:border-slate-600 text-rose-600 focus:ring-rose-500"
                />
                <span>{t('modals.danger.confirmCheckboxText')}</span>
              </label>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={submitting}
                  className="flex-1 exec-btn-secondary py-2.5 text-xs"
                >
                  {t('common.back')}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAction}
                  disabled={submitting}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-white text-xs font-semibold transition-colors disabled:opacity-60 ${
                    selectedAction === 'deactivate'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submitting
                    ? t('common.processing')
                    : selectedAction === 'deactivate'
                      ? t('modals.danger.confirmDeactivateBtn')
                      : t('modals.danger.confirmDeleteBtn')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountDangerModal;
