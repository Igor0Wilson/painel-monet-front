import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaDownload,
  FaSignOutAlt,
  FaUser,
  FaUsers,
} from 'react-icons/fa';
import { FamilyStatusData, PanelScope } from '../../types/finance';
import { downloadUserFinancialData } from '../../utils/downloadUserData';
import EncryptedImage from '../EncryptedImage';
import InstallAppBanner from '../InstallAppBanner';
import ThemeAndLangControls from '../ThemeAndLangControls';

interface Props {
  userId?: string;
  userName?: string;
  userInitials: string;
  userAvatarUrl?: string | null;
  panelScope: PanelScope;
  familyStatus: FamilyStatusData | null;
  pendingInvitesCount: number;
  onChangeScope: (scope: PanelScope) => void;
  onOpenFamilyModal: () => void;
  onOpenProfileModal: () => void;
  onRequestLogout: () => void;
}

const Navbar: React.FC<Props> = ({
  userId,
  userName,
  userInitials,
  userAvatarUrl,
  panelScope,
  familyStatus,
  pendingInvitesCount,
  onChangeScope,
  onOpenFamilyModal,
  onOpenProfileModal,
  onRequestLogout,
}) => {
  const { t } = useTranslation();
  const isFamilyMode = panelScope === 'family';
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
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <img
            src="/logo192.png?v=5"
            alt={t('common.appName')}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl shadow-sm flex-shrink-0 object-cover"
          />
          <div className="leading-tight truncate">
            <span className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white tracking-tight block truncate">
              {t('common.appName')}
            </span>
            <span className="text-[11px] text-slate-400 hidden sm:block">
              {isFamilyMode ? t('dashboard.familyPanelActive') : t('dashboard.individualScopeBanner')}
            </span>
          </div>
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

          {familyStatus?.inFamily && (
            <div className="hidden md:inline-flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/80 dark:border-slate-700">
              <button
                type="button"
                onClick={() => onChangeScope('individual')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${panelScope === 'individual'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                {React.createElement(FaUser as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
                {t('navbar.individualScope')}
              </button>
              <button
                type="button"
                onClick={() => onChangeScope('family')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${panelScope === 'family'
                  ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                {React.createElement(FaUsers as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[11px]' })}
                {t('navbar.familyScope')} ({familyStatus.members?.length || 2})
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenFamilyModal}
            className="relative inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors"
            title={t('navbar.familyTooltip')}
          >
            {React.createElement(FaUsers as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs text-slate-700 dark:text-slate-200' })}
            <span className="hidden sm:inline">{t('navbar.familyScope')}</span>
            {pendingInvitesCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                {pendingInvitesCount}
              </span>
            )}
          </button>

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
