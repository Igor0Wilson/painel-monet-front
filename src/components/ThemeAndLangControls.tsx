import React from 'react';
import { FaMoon, FaSun } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import {
  getActiveLocale,
  setAppLanguage,
  type SupportedLanguage,
} from '../i18n';
import { useTheme } from '../context/ThemeContext';

const BrazilFlagIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 16"
    className="w-5 h-3.5 rounded-[2px] shadow-sm flex-shrink-0"
    aria-hidden="true"
  >
    <rect width="24" height="16" fill="#009c3b" rx="1.5" />
    <polygon points="12,2 21,8 12,14 3,8" fill="#ffdf00" />
    <circle cx="12" cy="8" r="3.2" fill="#002776" />
    <path
      d="M9.1,7.5 C10.8,6.7 13.2,6.9 14.9,8.1"
      fill="none"
      stroke="#ffffff"
      strokeWidth="0.7"
      strokeLinecap="round"
    />
  </svg>
);

const UsaFlagIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 16"
    className="w-5 h-3.5 rounded-[2px] shadow-sm flex-shrink-0"
    aria-hidden="true"
  >
    <rect width="24" height="16" fill="#b22234" rx="1.5" />
    <rect y="2" width="24" height="1.5" fill="#ffffff" />
    <rect y="5" width="24" height="1.5" fill="#ffffff" />
    <rect y="8" width="24" height="1.5" fill="#ffffff" />
    <rect y="11" width="24" height="1.5" fill="#ffffff" />
    <rect y="14" width="24" height="1.5" fill="#ffffff" />
    <rect width="11" height="8.5" fill="#3c3b6e" rx="1" />
    <circle cx="2.5" cy="2" r="0.6" fill="#ffffff" />
    <circle cx="5.5" cy="2" r="0.6" fill="#ffffff" />
    <circle cx="8.5" cy="2" r="0.6" fill="#ffffff" />
    <circle cx="4" cy="4.2" r="0.6" fill="#ffffff" />
    <circle cx="7" cy="4.2" r="0.6" fill="#ffffff" />
    <circle cx="2.5" cy="6.4" r="0.6" fill="#ffffff" />
    <circle cx="5.5" cy="6.4" r="0.6" fill="#ffffff" />
    <circle cx="8.5" cy="6.4" r="0.6" fill="#ffffff" />
  </svg>
);

const SpainFlagIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 16"
    className="w-5 h-3.5 rounded-[2px] shadow-sm flex-shrink-0"
    aria-hidden="true"
  >
    <rect width="24" height="16" fill="#aa151b" rx="1.5" />
    <rect y="4" width="24" height="8" fill="#f1bf00" />
    <rect x="5" y="5.5" width="2.4" height="4.4" rx="0.8" fill="#aa151b" />
    <rect x="5.4" y="6.2" width="1.6" height="3" fill="#f1bf00" />
  </svg>
);

const LANGUAGE_OPTIONS: ReadonlyArray<{
  code: SupportedLanguage;
  shortLabel: string;
  labelKey: 'languages.ptBR' | 'languages.enUS' | 'languages.esES';
  Flag: React.FC;
}> = [
  { code: 'pt-BR', shortLabel: 'PT', labelKey: 'languages.ptBR', Flag: BrazilFlagIcon },
  { code: 'en-US', shortLabel: 'EN', labelKey: 'languages.enUS', Flag: UsaFlagIcon },
  { code: 'es-ES', shortLabel: 'ES', labelKey: 'languages.esES', Flag: SpainFlagIcon },
];

interface ThemeAndLangControlsProps {
  compact?: boolean;
  variant?: 'toolbar' | 'sidebar';
  className?: string;
}

const ThemeAndLangControls: React.FC<ThemeAndLangControlsProps> = ({
  compact = false,
  variant = 'toolbar',
  className = '',
}) => {
  const { t, i18n } = useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const activeLang: SupportedLanguage =
    i18n.language === 'en-US' || i18n.language === 'es-ES' || i18n.language === 'pt-BR'
      ? i18n.language
      : getActiveLocale();

  if (variant === 'sidebar') {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="space-y-1.5">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t('languages.label')}
          </span>
          <div
            role="group"
            aria-label={t('languages.label')}
            className="grid grid-cols-3 gap-1.5 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 rounded-xl p-1 transition-colors duration-300"
          >
            {LANGUAGE_OPTIONS.map(({ code, shortLabel, labelKey, Flag }) => {
              const isActive = activeLang === code;
              const label = t(labelKey);
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setAppLanguage(code)}
                  title={label}
                  aria-label={label}
                  aria-pressed={isActive}
                  data-testid={`lang-btn-${code}`}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 opacity-80 hover:opacity-100'
                  }`}
                >
                  <Flag />
                  <span>{shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          title={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
          aria-label={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
          aria-pressed={isDark}
          data-testid="theme-toggle-btn"
          className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all duration-200"
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-amber-300 flex items-center justify-center flex-shrink-0">
              {React.createElement(
                (isDark ? FaSun : FaMoon) as unknown as React.ComponentType<{
                  className?: string;
                }>,
                { className: 'text-xs' },
              )}
            </span>
            <span className="text-xs font-semibold truncate">
              {isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
            </span>
          </span>
          <span
            aria-hidden="true"
            className={`w-9 h-5 rounded-full p-0.5 flex items-center transition-colors flex-shrink-0 ${
              isDark ? 'bg-emerald-500 justify-end' : 'bg-slate-300 dark:bg-slate-600 justify-start'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 ${className}`}>
      <div
        role="group"
        aria-label={t('languages.label')}
        className="flex items-center bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 rounded-xl p-0.5 transition-colors duration-300"
      >
        {LANGUAGE_OPTIONS.map(({ code, shortLabel, labelKey, Flag }) => {
          const isActive = activeLang === code;
          const label = t(labelKey);
          return (
            <button
              key={code}
              type="button"
              onClick={() => setAppLanguage(code)}
              title={label}
              aria-label={label}
              aria-pressed={isActive}
              data-testid={`lang-btn-${code}`}
              className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 opacity-75 hover:opacity-100'
              }`}
            >
              <Flag />
              {!compact && <span className="hidden md:inline">{shortLabel}</span>}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={toggleTheme}
        title={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
        aria-label={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
        aria-pressed={isDark}
        data-testid="theme-toggle-btn"
        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-all duration-300 shadow-sm"
      >
        <span
          className={`inline-flex items-center justify-center transition-transform duration-300 ${
            isDark ? 'rotate-180 scale-110' : 'rotate-0 scale-100'
          }`}
        >
          {React.createElement(
            (isDark ? FaSun : FaMoon) as unknown as React.ComponentType<{
              className?: string;
            }>,
            { className: 'text-xs sm:text-sm' },
          )}
        </span>
      </button>
    </div>
  );
};

export default ThemeAndLangControls;
