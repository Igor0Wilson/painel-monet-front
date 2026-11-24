import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaCreditCard,
  FaHistory,
  FaLayerGroup,
  FaReceipt,
  FaSeedling,
  FaThLarge,
  FaUtensils,
  FaWallet,
} from 'react-icons/fa';
import { ActiveTab } from '../../types/finance';

interface Props {
  activeTab: ActiveTab;
  isCategoryDetailOpen: boolean;
  onSelectTab: (tab: ActiveTab) => void;
  openBillsCount?: number;
  cardsPendingCount?: number;
  incomesCount?: number;
}

const renderIcon = (IconComp: unknown, className: string) =>
  React.createElement(IconComp as React.ComponentType<{ className?: string }>, {
    className,
  });

const WebModuleSidebar: React.FC<Props> = ({
  activeTab,
  isCategoryDetailOpen,
  onSelectTab,
  openBillsCount = 0,
  cardsPendingCount = 0,
  incomesCount = 0,
}) => {
  const { t } = useTranslation();

  const isFinancesGroup =
    !isCategoryDetailOpen &&
    (activeTab === 'finances' ||
      activeTab === 'expenses' ||
      activeTab === 'cards' ||
      activeTab === 'incomes');

  const topItems: {
    id: ActiveTab;
    label: string;
    icon: unknown;
    badge?: number;
  }[] = [
    {
      id: 'overview',
      label: t('dashboard.navTabs.overview'),
      icon: FaThLarge,
    },
    {
      id: 'finances',
      label: t('dashboard.navTabs.finances'),
      icon: FaLayerGroup,
      badge: openBillsCount > 0 ? openBillsCount : undefined,
    },
  ];

  const financesSubItems: {
    id: ActiveTab;
    label: string;
    icon: unknown;
    badge?: number;
  }[] = [
    {
      id: 'expenses',
      label: t('dashboard.navTabs.expenses'),
      icon: FaReceipt,
      badge: openBillsCount > 0 ? openBillsCount : undefined,
    },
    {
      id: 'cards',
      label: t('dashboard.navTabs.cards'),
      icon: FaCreditCard,
      badge: cardsPendingCount > 0 ? cardsPendingCount : undefined,
    },
    {
      id: 'incomes',
      label: t('dashboard.navTabs.incomes'),
      icon: FaWallet,
      badge: incomesCount > 0 ? incomesCount : undefined,
    },
  ];

  const standaloneModules: {
    id: ActiveTab;
    label: string;
    icon: unknown;
  }[] = [
    {
      id: 'investments',
      label: t('dashboard.navTabs.investments'),
      icon: FaSeedling,
    },
    {
      id: 'food',
      label: t('dashboard.navTabs.food'),
      icon: FaUtensils,
    },
    {
      id: 'history',
      label: t('dashboard.navTabs.history'),
      icon: FaHistory,
    },
  ];

  const allCompactModules: {
    id: ActiveTab;
    label: string;
    icon: unknown;
  }[] = [
    { id: 'overview', label: t('dashboard.navTabs.overview'), icon: FaThLarge },
    { id: 'finances', label: t('dashboard.navTabs.finances'), icon: FaLayerGroup },
    { id: 'expenses', label: t('dashboard.navTabs.expenses'), icon: FaReceipt },
    { id: 'cards', label: t('dashboard.navTabs.cards'), icon: FaCreditCard },
    { id: 'incomes', label: t('dashboard.navTabs.incomes'), icon: FaWallet },
    { id: 'investments', label: t('dashboard.navTabs.investments'), icon: FaSeedling },
    { id: 'food', label: t('dashboard.navTabs.food'), icon: FaUtensils },
    { id: 'history', label: t('dashboard.navTabs.history'), icon: FaHistory },
  ];

  return (
    <>
      {/* Desktop Lateral Sidebar */}
      <aside
        data-testid="web-module-sidebar"
        aria-label={t('sidebar.menuLabel')}
        className="hidden lg:flex lg:w-64 xl:w-68 lg:flex-col lg:flex-shrink-0 border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900"
      >
        <div className="sticky top-16 p-4 space-y-5 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t('sidebar.menuLabel')}
            </p>
            <nav className="space-y-1">
              {topItems.map((item) => {
                const isActive =
                  item.id === 'finances'
                    ? activeTab === 'finances' && !isCategoryDetailOpen
                    : activeTab === item.id && !isCategoryDetailOpen;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`nav-tab-${item.id}`}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                      isActive || (item.id === 'finances' && isFinancesGroup)
                        ? isActive
                          ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      {renderIcon(
                        item.icon,
                        `text-xs flex-shrink-0 ${
                          isActive
                            ? 'text-emerald-400 dark:text-slate-950'
                            : 'text-slate-500 dark:text-slate-400'
                        }`,
                      )}
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badge !== undefined && (
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums flex-shrink-0 ${
                          isActive
                            ? 'bg-white/20 text-white dark:text-slate-950'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Sub-acessos de Contas, Despesas & Salários */}
              <div className="ml-3 pl-3 border-l border-slate-200 dark:border-slate-700 space-y-1 py-1">
                {financesSubItems.map((sub) => {
                  const isActive = activeTab === sub.id && !isCategoryDetailOpen;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      data-testid={`nav-tab-${sub.id}`}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => onSelectTab(sub.id)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all text-left ${
                        isActive
                          ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        {renderIcon(
                          sub.icon,
                          `text-[11px] flex-shrink-0 ${
                            isActive
                              ? 'text-emerald-400 dark:text-slate-950'
                              : 'text-slate-400 dark:text-slate-500'
                          }`,
                        )}
                        <span className="truncate">{sub.label}</span>
                      </span>
                      {sub.badge !== undefined && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums flex-shrink-0 ${
                            isActive
                              ? 'bg-white/20 text-white dark:text-slate-950'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {sub.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                {standaloneModules.map((mod) => {
                  const isActive = activeTab === mod.id && !isCategoryDetailOpen;
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      data-testid={`nav-tab-${mod.id}`}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => onSelectTab(mod.id)}
                      className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                        isActive
                          ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-sm'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      {renderIcon(
                        mod.icon,
                        `text-xs flex-shrink-0 ${
                          isActive
                            ? 'text-emerald-400 dark:text-slate-950'
                            : 'text-slate-500 dark:text-slate-400'
                        }`,
                      )}
                      <span className="truncate">{mod.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>
        </div>
      </aside>

      {/* Mobile Web Horizontal Module Bar (< lg) */}
      <div className="lg:hidden border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 flex items-center gap-1.5 overflow-x-auto">
        {allCompactModules.map((item) => {
          const isActive = activeTab === item.id && !isCategoryDetailOpen;
          return (
            <button
              key={item.id}
              type="button"
              data-testid={`mobile-web-nav-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all ${
                isActive
                  ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 border-slate-900 dark:border-emerald-500 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
            >
              {renderIcon(item.icon, 'text-[10px]')}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};

export default WebModuleSidebar;
