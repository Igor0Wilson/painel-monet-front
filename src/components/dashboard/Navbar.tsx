import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaDownload,
  FaSignOutAlt,
} from 'react-icons/fa';
import { downloadUserFinancialData } from '../../utils/downloadUserData';
import EncryptedImage from '../EncryptedImage';
import InstallAppBanner from '../InstallAppBanner';
import PrivacyToggleButton from '../PrivacyToggleButton';
import ThemeAndLangControls from '../ThemeAndLangControls';

interface Props {
  userId?: string;
  userName?: string;
  userInitials: string;
  userAvatarUrl?: string | null;
  onOpenProfileModal: () => void;
  onRequestLogout: () => void;
}

const Navbar: React.FC<Props> = ({
  userId,
  userName,
  userInitials,
  userAvatarUrl,
  onOpenProfileModal,
  onRequestLogout,
}) => {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);

  const handleDownloadClick = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadUserFinancialData({ userId });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <nav className="safe-top-navbar bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-40 w-full transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-[3.5rem] sm:h-16 py-1.5 sm:py-0 flex justify-between items-center gap-2 sm:gap-3">
        <div className="flex items-center min-w-0">
          <img
            src="/logo192.png?v=5"
            alt={t('common.appName')}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl shadow-sm flex-shrink-0 object-cover"
          />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <InstallAppBanner compact />

          <button
            type="button"
            onClick={handleDownloadClick}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-50"
            title={t('dashboard.exportBtn')}
          >
            {React.createElement(FaDownload as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs text-emerald-700 dark:text-emerald-400' })}
            <span className="hidden md:inline">
              {downloading ? t('modals.userEdit.backupGenerating') : t('dashboard.exportBtn')}
            </span>
          </button>

          <PrivacyToggleButton />

          <ThemeAndLangControls compact />

          <button
            type="button"
            onClick={onOpenProfileModal}
            className="flex items-center gap-2 pl-1 pr-1.5 sm:pr-3 py-1 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-200/80 dark:hover:border-slate-700"
            title={t('navbar.profileTooltip')}
          >
            {userAvatarUrl ? (
              <EncryptedImage
                src={userAvatarUrl}
                alt={userName || t('common.photoAltProfile')}
                className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
                data-testid="navbar-user-avatar-img"
                fallback={
                  <div
                    className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 text-xs font-semibold flex items-center justify-center flex-shrink-0"
                  >
                    {userInitials}
                  </div>
                }
              />
            ) : (
              <div
                className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 text-xs font-semibold flex items-center justify-center flex-shrink-0"
                data-testid="navbar-user-initials"
              >
                {userInitials}
              </div>
            )}
            <div className="hidden sm:block text-left leading-tight">
              <p className="text-xs font-semibold text-slate-900 dark:text-white max-w-[120px] truncate">
                {userName}
              </p>
              <p className="text-[11px] text-slate-400">{t('navbar.profileSubtitle')}</p>
            </div>
          </button>

          <button
            type="button"
            onClick={onRequestLogout}
            className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={t('navbar.logoutTooltip')}
            aria-label={t('navbar.logoutAria')}
          >
            {React.createElement(FaSignOutAlt as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
            <span className="hidden lg:inline">{t('navbar.logoutTooltip')}</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
