import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { usePrivacyMode } from '../context/PrivacyModeContext';

interface PrivacyToggleButtonProps {
  variant?: 'icon' | 'sidebar';
  className?: string;
}

const PrivacyToggleButton: React.FC<PrivacyToggleButtonProps> = ({
  variant = 'icon',
  className = '',
}) => {
  const { t } = useTranslation();
  const { hideValues, toggleHideValues } = usePrivacyMode();

  const label = hideValues
    ? t('sidebar.privacyShowValues')
    : t('sidebar.privacyHideValues');
  const Icon = hideValues ? FaEyeSlash : FaEye;

  if (variant === 'sidebar') {
    return (
      <button
        type="button"
        onClick={toggleHideValues}
        data-testid="privacy-eye-btn"
        aria-label={label}
        aria-pressed={hideValues}
        title={label}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors ${className}`}
      >
        <span className="flex items-center gap-2.5">
          {React.createElement(
            Icon as unknown as React.ComponentType<{ className?: string }>,
            {
              className: `text-sm ${
                hideValues
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`,
            },
          )}
          <span>{label}</span>
        </span>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            hideValues
              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          {hideValues ? t('sidebar.privacyHiddenTag') : t('sidebar.privacyVisibleTag')}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleHideValues}
      data-testid="privacy-eye-btn"
      aria-label={label}
      aria-pressed={hideValues}
      title={label}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors flex-shrink-0 ${className}`}
    >
      {React.createElement(
        Icon as unknown as React.ComponentType<{ className?: string }>,
        {
          className: `text-sm ${
            hideValues ? 'text-amber-600 dark:text-amber-400' : ''
          }`,
        },
      )}
    </button>
  );
};

export default PrivacyToggleButton;
