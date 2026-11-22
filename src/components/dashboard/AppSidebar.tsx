import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaBars,
  FaChevronRight,
  FaDownload,
  FaHistory,
  FaSignOutAlt,
  FaTimes,
  FaUser,
  FaUserPlus,
  FaUsers,
} from 'react-icons/fa';
import { ActiveTab, PanelScope } from '../../types/finance';
import { downloadUserFinancialData } from '../../utils/downloadUserData';
import EncryptedImage from '../EncryptedImage';
import ThemeAndLangControls from '../ThemeAndLangControls';

function renderIcon(
  IconComponent: unknown,
  className: string,
): React.ReactElement {
  return React.createElement(
    IconComponent as React.ComponentType<{ className?: string }>,
    { className },
  );
}

interface MobileAppHeaderProps {
  activeTitle: string;
  userName?: string;
  userInitials: string;
  userAvatarUrl?: string | null;
  pendingInvitesCount: number;
  isSidebarOpen: boolean;
  onOpenSidebar: () => void;
  onOpenProfileModal: () => void;
}

export const MobileAppHeader: React.FC<MobileAppHeaderProps> = ({
  activeTitle,
  userName,
  userInitials,
  userAvatarUrl,
  pendingInvitesCount,
  isSidebarOpen,
  onOpenSidebar,
  onOpenProfileModal,
}) => {
  const { t } = useTranslation();

  return (
    <header className="lg:hidden safe-top-navbar bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-40 w-full transition-colors duration-300">
      <div className="px-3 min-h-[3.5rem] py-1.5 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onOpenSidebar}
            data-testid="sidebar-open-btn"
            aria-label={t('sidebar.openMenuAria')}
            aria-expanded={isSidebarOpen}
            className="relative w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center flex-shrink-0 transition-colors"
          >
            {renderIcon(FaBars, 'text-sm')}
            {pendingInvitesCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-600 ring-2 ring-white dark:ring-slate-900 animate-pulse"
              />
            )}
          </button>

          <img
            src="/logo192.png?v=5"
            alt={t('common.appName')}
            className="w-8 h-8 rounded-xl shadow-sm flex-shrink-0 object-cover"
          />

          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {activeTitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenProfileModal}
          aria-label={t('navbar.profileTooltip')}
          className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
        >
          {userAvatarUrl ? (
            <EncryptedImage
              src={userAvatarUrl}
              alt={userName || t('common.photoAltProfile')}
              className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
              fallback={
                <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                  {userInitials}
                </div>
              }
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 text-xs font-semibold flex items-center justify-center flex-shrink-0">
              {userInitials}
            </div>
          )}
        </button>
      </div>
    </header>
  );
};

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userName?: string;
  userInitials: string;
  userAvatarUrl?: string | null;
  activeTab: ActiveTab;
  panelScope: PanelScope;
  isCategoryDetailOpen: boolean;
  inFamily: boolean;
  familyMembersCount: number;
  pendingInvitesCount: number;
  onSelectIndividualPanel: () => void;
  onSelectFamilyPanel: () => void;
  onSelectHistory: () => void;
  onOpenFamilyModal: () => void;
  onOpenProfileModal: () => void;
  onRequestLogout: () => void;
}

const AppSidebar: React.FC<AppSidebarProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  userInitials,
  userAvatarUrl,
  activeTab,
  panelScope,
  isCategoryDetailOpen,
  inFamily,
  familyMembersCount,
  pendingInvitesCount,
  onSelectIndividualPanel,
  onSelectFamilyPanel,
  onSelectHistory,
  onOpenFamilyModal,
  onOpenProfileModal,
  onRequestLogout,
}) => {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleDownloadClick = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadUserFinancialData({ userId });
    } finally {
      setDownloading(false);
    }
  };

  const isIndividualActive =
    activeTab === 'overview' && panelScope === 'individual' && !isCategoryDetailOpen;
  const isFamilyActive =
    activeTab === 'overview' && panelScope === 'family' && !isCategoryDetailOpen;
  const isHistoryActive = activeTab === 'history' && !isCategoryDetailOpen;

  return (
    <>
      {isOpen && (
        <div
          data-testid="sidebar-backdrop"
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[85] lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      <aside
        data-testid="app-sidebar"
        data-open={isOpen ? 'true' : 'false'}
        aria-label={t('sidebar.menuLabel')}
        className={`fixed inset-y-0 left-0 z-[90] w-[285px] max-w-[85vw] lg:sticky lg:top-0 lg:h-[100dvh] lg:w-72 lg:flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 shadow-2xl lg:shadow-none flex flex-col safe-sidebar-panel transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-4 pb-3 flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/logo192.png?v=5"
              alt={t('common.appName')}
              className="w-9 h-9 rounded-xl shadow-sm flex-shrink-0 object-cover"
            />
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {t('common.appName')}
              </p>
              <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 truncate">
                {t('sidebar.appBadge')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            data-testid="sidebar-close-btn"
            aria-label={t('sidebar.closeMenuAria')}
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {renderIcon(FaTimes, 'text-sm')}
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenProfileModal();
            }}
            data-testid="sidebar-profile-btn"
            title={t('navbar.profileTooltip')}
            className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition-colors text-left"
          >
            {userAvatarUrl ? (
              <EncryptedImage
                src={userAvatarUrl}
                alt={userName || t('common.photoAltProfile')}
                className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
                data-testid="sidebar-user-avatar-img"
                fallback={
                  <div
                    className="w-11 h-11 rounded-xl bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 text-sm font-bold flex items-center justify-center flex-shrink-0"
                    data-testid="sidebar-user-initials"
                  >
                    {userInitials}
                  </div>
                }
              />
            ) : (
              <div
                className="w-11 h-11 rounded-xl bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 text-sm font-bold flex items-center justify-center flex-shrink-0"
                data-testid="sidebar-user-initials"
              >
                {userInitials}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p
                className="text-sm font-semibold text-slate-900 dark:text-white truncate"
                data-testid="sidebar-user-name"
              >
                {userName}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {t('navbar.profileSubtitle')}
              </p>
            </div>

            {renderIcon(FaChevronRight, 'text-[11px] text-slate-400 flex-shrink-0')}
          </button>
        </div>

        <nav
          aria-label={t('sidebar.menuLabel')}
          className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5"
        >
          <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t('sidebar.menuLabel')}
          </p>

          <button
            type="button"
            onClick={() => {
              onSelectIndividualPanel();
              onClose();
            }}
            data-testid="sidebar-nav-individual"
            aria-current={isIndividualActive ? 'page' : undefined}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              isIndividualActive
                ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-sm'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {renderIcon(
              FaUser,
              `text-xs flex-shrink-0 ${
                isIndividualActive
                  ? 'text-emerald-400 dark:text-slate-950'
                  : 'text-slate-500 dark:text-slate-400'
              }`,
            )}
            <span className="truncate">{t('sidebar.individualPanel')}</span>
          </button>

          {inFamily && (
            <button
              type="button"
              onClick={() => {
                onSelectFamilyPanel();
                onClose();
              }}
              data-testid="sidebar-nav-family"
              aria-current={isFamilyActive ? 'page' : undefined}
              className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isFamilyActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                {renderIcon(
                  FaUsers,
                  `text-xs flex-shrink-0 ${
                    isFamilyActive
                      ? 'text-white'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`,
                )}
                <span className="truncate">{t('sidebar.familyPanel')}</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold tabular-nums flex-shrink-0 ${
                  isFamilyActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {familyMembersCount}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onSelectHistory();
              onClose();
            }}
            data-testid="sidebar-nav-history"
            aria-current={isHistoryActive ? 'page' : undefined}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              isHistoryActive
                ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-sm'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {renderIcon(
              FaHistory,
              `text-xs flex-shrink-0 ${
                isHistoryActive
                  ? 'text-emerald-400 dark:text-slate-950'
                  : 'text-slate-500 dark:text-slate-400'
              }`,
            )}
            <span className="truncate">{t('dashboard.historyTab')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenFamilyModal();
            }}
            data-testid="sidebar-nav-connect"
            className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/30 border border-slate-200/80 dark:border-slate-700/80 transition-all mt-2"
          >
            <span className="flex items-center gap-3 min-w-0 text-left">
              <span className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                {renderIcon(FaUserPlus, 'text-xs')}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {t('sidebar.connectSomeone')}
                </span>
                <span className="block text-[10px] font-normal text-slate-500 dark:text-slate-400 truncate">
                  {t('sidebar.connectSomeoneDesc')}
                </span>
              </span>
            </span>
            {pendingInvitesCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 animate-pulse">
                {pendingInvitesCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadClick}
            disabled={downloading}
            data-testid="sidebar-export-btn"
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {renderIcon(FaDownload, 'text-xs text-emerald-700 dark:text-emerald-400 flex-shrink-0')}
            <span className="truncate">
              {downloading ? t('modals.userEdit.backupGenerating') : t('dashboard.exportBtn')}
            </span>
          </button>
        </nav>

        <div className="px-4 py-3.5 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <ThemeAndLangControls variant="sidebar" />

          <button
            type="button"
            onClick={() => {
              onClose();
              onRequestLogout();
            }}
            data-testid="sidebar-logout-btn"
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/70 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-xs font-semibold text-rose-700 dark:text-rose-300 transition-colors"
          >
            {renderIcon(FaSignOutAlt, 'text-xs')}
            <span>{t('navbar.logoutTooltip')}</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
