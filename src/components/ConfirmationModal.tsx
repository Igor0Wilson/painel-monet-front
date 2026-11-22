import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaExclamationTriangle } from 'react-icons/fa';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="exec-modal-overlay z-[100]">
      <div className="exec-modal-container max-w-md">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900 rounded-xl flex items-center justify-center flex-shrink-0">
              {React.createElement(FaExclamationTriangle as unknown as React.ComponentType<{ className?: string }>, { className: 'text-base' })}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mt-1">{message}</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/70 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="exec-btn-secondary"
          >
            {cancelText || t('modals.confirm.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-medium shadow-sm hover:bg-rose-700 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {isLoading ? t('common.processing') : confirmText || t('modals.confirm.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
