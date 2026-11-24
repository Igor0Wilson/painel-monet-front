import React, { useMemo, useState } from 'react';
import type { ActiveElement, ChartEvent, ChartOptions } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import {
  FaArrowDown,
  FaArrowUp,
  FaCalendarAlt,
  FaChartLine,
  FaChartPie,
  FaChevronLeft,
  FaChevronRight,
  FaCreditCard,
  FaExternalLinkAlt,
  FaImage,
  FaTimes,
  FaUser,
} from 'react-icons/fa';
import { usePrivacyMode } from '../context/PrivacyModeContext';
import { useTheme } from '../context/ThemeContext';
import { ChartDataResponse, ExpenseItem, IncomeItem } from '../types/finance';
import {
  computeRealtimeCategoriesForMonth,
  getCategoryMeta,
  getEffectiveExpenseAmount,
  translateCategoryName,
} from '../utils/categories';
import {
  buildDoughnutChartData,
  buildLineChartData,
  getExecutiveDoughnutOptions,
  getExecutiveLineOptions,
} from '../utils/chartConfig';
import {
  formatDateBr,
  formatExpenseDisplayName,
  formatMonthLabel,
  shiftMonthKey,
} from '../utils/formatters';
import { getEffectiveIncomeForMonth } from '../utils/recurrence';
import EncryptedImage from './EncryptedImage';
import StatusBadge from './dashboard/StatusBadge';

interface Props {
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  chartData: ChartDataResponse | null;
  expenses: ExpenseItem[];
  incomes: IncomeItem[];
  isFamilyMode: boolean;
  onOpenCategoryDetail: (categoryName?: string | null) => void;
}

const HistoryTab: React.FC<Props> = ({
  selectedMonth,
  onSelectMonth,
  chartData,
  expenses,
  incomes,
  isFamilyMode,
  onOpenCategoryDetail,
}) => {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const { hideValues, formatProtectedCurrency } = usePrivacyMode();
  const [previewReceipt, setPreviewReceipt] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const availableMonths: string[] = chartData?.availableMonths || [selectedMonth];

  const { activeCategories, monthExpenses } = useMemo(
    () =>
      computeRealtimeCategoriesForMonth(
        expenses,
        selectedMonth,
        chartData?.expensesByCategory,
      ),
    [expenses, selectedMonth, chartData?.expensesByCategory],
  );

  const monthIncomes = useMemo(() => {
    return incomes
      .map((inc) => {
        const eff = getEffectiveIncomeForMonth(inc, selectedMonth);
        return { inc, eff };
      })
      .filter((entry) => entry.eff.applies)
      .map(({ inc, eff }) => ({
        ...inc,
        name: eff.name,
        value: eff.value,
        incomeDate: eff.date,
        status: eff.status,
      }));
  }, [incomes, selectedMonth]);

  const hasCategoryData = activeCategories.length > 0;
  const localizedCategories = useMemo(
    () => activeCategories.map((c) => ({ ...c, name: translateCategoryName(c.name, t) })),
    [activeCategories, t],
  );
  const doughnutData = useMemo(
    () => buildDoughnutChartData(localizedCategories, isDark),
    [localizedCategories, isDark],
  );
  const lineData = useMemo(
    () =>
      buildLineChartData(
        chartData?.monthlyHistory,
        t('charts.incomeDataset'),
        t('charts.expensesDataset'),
        isDark,
        chartData?.month,
        i18n.language,
      ),
    [chartData?.monthlyHistory, chartData?.month, t, isDark, i18n.language],
  );

  const lineOptions = useMemo(
    () => getExecutiveLineOptions(isDark, i18n.language, hideValues),
    [isDark, i18n.language, hideValues],
  );

  const interactiveDoughnutOptions = useMemo<ChartOptions<'doughnut'>>(
    () => ({
      ...getExecutiveDoughnutOptions(isDark, hideValues, i18n.language),
      onClick: (_event: ChartEvent, elements: ActiveElement[]) => {
        if (elements && elements.length > 0) {
          const clickedIndex = elements[0].index;
          const cat = activeCategories[clickedIndex];
          onOpenCategoryDetail(cat?.name || null);
        } else {
          onOpenCategoryDetail(null);
        }
      },
    }),
    [activeCategories, onOpenCategoryDetail, isDark, hideValues, i18n.language],
  );

  const summary = chartData?.monthSummary || {
    totalIncome: 0,
    scheduledIncome: 0,
    totalExpenses: 0,
    netFlow: 0,
  };

  return (
    <div className="space-y-6">
      <div className="exec-card p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {t('modals.history.title')}{' '}
            {isFamilyMode ? `· ${t('navbar.familyScope')}` : `· ${t('navbar.individualScope')}`}
          </p>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-0.5">
            {formatMonthLabel(selectedMonth)}
          </h2>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 flex-nowrap w-full lg:w-auto">
          <button
            type="button"
            onClick={() => onSelectMonth(shiftMonthKey(selectedMonth, -1))}
            className="exec-btn-secondary px-2.5 sm:px-3 py-2 text-xs gap-1 flex-shrink-0 whitespace-nowrap"
          >
            {React.createElement(FaChevronLeft as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
            <span>{t('charts.prevMonth')}</span>
          </button>

          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => e.target.value && onSelectMonth(e.target.value)}
            className="exec-input flex-1 min-w-0 sm:w-auto px-2.5 sm:px-3 py-2 text-xs font-semibold text-center"
          />

          <button
            type="button"
            onClick={() => onSelectMonth(shiftMonthKey(selectedMonth, 1))}
            className="exec-btn-secondary px-2.5 sm:px-3 py-2 text-xs gap-1 flex-shrink-0 whitespace-nowrap"
          >
            <span>{t('charts.nextMonth')}</span>
            {React.createElement(FaChevronRight as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
          </button>
        </div>
      </div>

      {availableMonths.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-medium text-slate-400 whitespace-nowrap mr-1">
            {t('expenses.periodLabel')}:
          </span>
          {availableMonths.slice(0, 12).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onSelectMonth(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors ${m === selectedMonth
                  ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 border-slate-900 dark:border-emerald-500'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
            >
              {formatMonthLabel(m)}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="exec-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('modals.history.totalFilteredIncomes')}
            </span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              {React.createElement(FaArrowUp as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[11px]' })}
            </span>
          </div>
          <p className="text-2xl font-semibold text-slate-900 dark:text-white tabular-nums">
            {formatProtectedCurrency(summary.totalIncome)}
          </p>
          {summary.scheduledIncome > 0 && (
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
              {t('kpi.incomeScheduledNote')} {formatProtectedCurrency(summary.scheduledIncome)}
            </p>
          )}
        </div>

        <div className="exec-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('modals.history.totalFilteredExpenses')}
            </span>
            <span className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              {React.createElement(FaArrowDown as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[11px]' })}
            </span>
          </div>
          <p className="text-2xl font-semibold text-slate-900 dark:text-white tabular-nums">
            {formatProtectedCurrency(summary.totalExpenses)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">{monthExpenses.length}</p>
        </div>

        <div className="exec-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('modals.history.netFiltered')}
            </span>
          </div>
          <p
            className={`text-2xl font-semibold tabular-nums ${summary.netFlow >= 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
              }`}
          >
            {formatProtectedCurrency(summary.netFlow)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">{t('charts.monthlySubtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 exec-card p-6 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {t('charts.categoryTitle')} ({formatMonthLabel(selectedMonth)})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{t('charts.categorySubtitle')}</p>
            </div>
            <button
              type="button"
              onClick={() => onOpenCategoryDetail(null)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition-colors flex-shrink-0"
              title={t('charts.categorySubtitle')}
            >
              {React.createElement(FaChartPie as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
              <span>{t('common.viewPhoto').split(' ')[0]}</span>
              {React.createElement(FaExternalLinkAlt as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[9px]' })}
            </button>
          </div>
          <div
            onClick={() => {
              if (!hasCategoryData) onOpenCategoryDetail(null);
            }}
            className="h-52 flex items-center justify-center cursor-pointer"
          >
            {hasCategoryData ? (
              <Doughnut data={doughnutData} options={interactiveDoughnutOptions} />
            ) : (
              <p className="text-xs text-slate-400 text-center px-4">
                {t('charts.noCategoryData')}
              </p>
            )}
          </div>

          {hasCategoryData && (
            <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
              {activeCategories.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => onOpenCategoryDetail(cat.name)}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${cat.meta.iconBgClass}`}
                    >
                      {React.createElement(cat.meta.icon as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
                    </span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {translateCategoryName(cat.name)}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-900 dark:text-white tabular-nums flex-shrink-0">
                    {formatProtectedCurrency(cat.value)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-7 exec-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {t('charts.monthlyTitle')} ({formatMonthLabel(selectedMonth)})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{t('charts.monthlySubtitle')}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-slate-600 dark:text-emerald-400 flex items-center justify-center">
              {React.createElement(FaChartLine as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
            </div>
          </div>
          <div className="h-56">
            {chartData ? (
              <Line data={lineData} options={lineOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                {t('common.loading')}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 exec-card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {t('expenses.titleIndividual')} — {formatMonthLabel(selectedMonth)}
              </h3>
              <p className="text-xs text-slate-400">{t('modals.history.subtitle')}</p>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
              {monthExpenses.length}
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {monthExpenses.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400">
                {t('expenses.emptyTitle')}
              </div>
            ) : (
              monthExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {formatExpenseDisplayName(exp.name, t)}
                      </span>
                      <StatusBadge
                        status={exp.status}
                        paymentMethod={exp.paymentMethod}
                        isPartiallyPaid={exp.isPartiallyPaid}
                      />
                      {exp.receiptUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewReceipt({
                              url: exp.receiptUrl!,
                              name: formatExpenseDisplayName(exp.name, t),
                            })
                          }
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
                        >
                          {React.createElement(FaImage as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
                          <span>{t('expenses.receiptAttached')}</span>
                        </button>
                      )}
                      {isFamilyMode && exp.ownerName && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-900 dark:bg-slate-700 text-white">
                          {React.createElement(FaUser as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[8px]' })}
                          {exp.ownerName.split(' ')[0]}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        {React.createElement(FaCalendarAlt as unknown as React.ComponentType<{ className?: string }>, {
                          className: 'text-[10px] text-slate-400',
                        })}
                        {formatDateBr(exp.dueDate)}
                      </span>
                      {(() => {
                        const catMeta = getCategoryMeta(exp.accountType?.name);
                        return (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${catMeta.bgClass} ${catMeta.textClass} ${catMeta.borderClass}`}
                          >
                            {React.createElement(catMeta.icon as unknown as React.ComponentType<{ className?: string }>, {
                              className: 'text-[10px]',
                            })}
                            {translateCategoryName(catMeta.name)}
                          </span>
                        );
                      })()}
                      {exp.isCreditCard && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                          {React.createElement(FaCreditCard as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
                          {t('expenses.creditCardBadge')}
                        </span>
                      )}
                      {exp.isPaid &&
                        exp.isEarlyPayment &&
                        Number(exp.paidAmount || 0) > 0 &&
                        Number(exp.paidAmount) < Number(exp.value) - 0.009 && (
                          <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                            {t('expenses.earlyDiscountNote', {
                              original: formatProtectedCurrency(Number(exp.value)),
                              paid: formatProtectedCurrency(getEffectiveExpenseAmount(exp)),
                            })}
                          </span>
                        )}
                    </div>
                  </div>
                  {exp.isPaid &&
                  exp.isEarlyPayment &&
                  Number(exp.paidAmount || 0) > 0 &&
                  Number(exp.paidAmount) < Number(exp.value) - 0.009 ? (
                    <div className="text-right tabular-nums flex-shrink-0">
                      <span className="block text-[11px] text-slate-400 line-through">
                        {formatProtectedCurrency(Number(exp.value))}
                      </span>
                      <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                        {formatProtectedCurrency(getEffectiveExpenseAmount(exp))}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums flex-shrink-0">
                      {formatProtectedCurrency(Number(exp.value))}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-4 exec-card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {t('incomes.title')} — {formatMonthLabel(selectedMonth)}
              </h3>
              <p className="text-xs text-slate-400">
                {t('incomes.subtitleCount', { count: monthIncomes.length })}
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
              {monthIncomes.length}
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {monthIncomes.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">{t('incomes.empty')}</div>
            ) : (
              monthIncomes.map((inc) => (
                <div
                  key={inc.id}
                  className="px-6 py-3.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {inc.name}
                      </span>
                      {inc.isRecurring && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {t('incomes.recurringLabel')}
                        </span>
                      )}
                      {isFamilyMode && inc.ownerName && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-900 dark:bg-slate-700 text-white">
                          {inc.ownerName.split(' ')[0]}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums flex-shrink-0">
                      + {formatProtectedCurrency(Number(inc.value))}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {t('incomes.dateLabel', { date: formatDateBr(inc.incomeDate) })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {previewReceipt && (
        <div
          className="exec-modal-overlay z-[130]"
          onClick={() => setPreviewReceipt(null)}
        >
          <div
            className="exec-modal-container max-w-lg p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t('expenses.receiptModalTitle')}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {previewReceipt.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewReceipt(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {React.createElement(FaTimes as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
              </button>
            </div>
            <EncryptedImage
              src={previewReceipt.url}
              alt={previewReceipt.name}
              className="w-full max-h-[70vh] object-contain rounded-xl bg-slate-100 dark:bg-slate-800"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryTab;
