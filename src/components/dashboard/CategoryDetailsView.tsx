import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaChartPie,
  FaChevronLeft,
  FaChevronRight,
  FaCreditCard,
  FaImage,
  FaTimes,
  FaUser,
} from 'react-icons/fa';
import { usePrivacyMode } from '../../context/PrivacyModeContext';
import { ExpenseItem } from '../../types/finance';
import {
  computeRealtimeCategoriesForMonth,
  getEffectiveExpenseAmount,
  OfficialCategoryName,
  translateCategoryName,
} from '../../utils/categories';
import {
  formatDateBr,
  formatExpenseDisplayName,
  formatMonthLabel,
  shiftMonthKey,
} from '../../utils/formatters';
import EncryptedImage from '../EncryptedImage';
import StatusBadge from './StatusBadge';

interface Props {
  selectedMonth: string;
  initialCategory?: string | null;
  expenses: ExpenseItem[];
  isFamilyMode: boolean;
  onSelectMonth: (month: string) => void;
  onBack: () => void;
}

const CategoryDetailsView: React.FC<Props> = ({
  selectedMonth,
  initialCategory = null,
  expenses,
  isFamilyMode,
  onSelectMonth,
  onBack,
}) => {
  const { t } = useTranslation();
  const { formatProtectedCurrency } = usePrivacyMode();
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>(
    initialCategory || 'all',
  );
  const [previewReceipt, setPreviewReceipt] = useState<{
    url: string;
    name: string;
  } | null>(null);

  const { allCategories, activeCategories, totalMonthExpenses, monthExpenses } = useMemo(
    () => computeRealtimeCategoriesForMonth(expenses, selectedMonth),
    [expenses, selectedMonth],
  );

  const displayedCategories = useMemo(() => {
    if (selectedCategoryFilter === 'all') {
      return activeCategories.length > 0 ? activeCategories : allCategories;
    }
    return allCategories.filter((c) => c.name === selectedCategoryFilter);
  }, [allCategories, activeCategories, selectedCategoryFilter]);

  return (
    <div className="space-y-6">
      <div className="exec-card p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <button
            type="button"
            onClick={onBack}
            className="exec-btn-secondary px-3 py-2 text-xs gap-1.5 flex-shrink-0"
          >
            {React.createElement(FaArrowLeft as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
            <span>{t('common.back')}</span>
          </button>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {t('charts.categoryTitle')}{' '}
              {isFamilyMode ? `· ${t('navbar.familyScope')}` : `· ${t('navbar.individualScope')}`}
            </p>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-0.5">
              {formatMonthLabel(selectedMonth)} — {t('common.total')}:{' '}
              {formatProtectedCurrency(totalMonthExpenses)}
            </h2>
          </div>
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

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t('charts.totalMonthLabel')} ({monthExpenses.length})
          </h3>
          {selectedCategoryFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter('all')}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 underline"
            >
              {t('common.all')}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {allCategories.map((cat) => {
            const isSelected = selectedCategoryFilter === cat.name;
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() =>
                  setSelectedCategoryFilter((prev) =>
                    prev === cat.name ? 'all' : (cat.name as OfficialCategoryName),
                  )
                }
                className={`exec-card p-4 text-left transition-all border ${isSelected
                  ? 'ring-2 ring-slate-900 dark:ring-emerald-400 border-slate-900 dark:border-emerald-400 shadow-md'
                  : 'hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
              >
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.meta.iconBgClass}`}
                    >
                      {React.createElement(cat.meta.icon as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {translateCategoryName(cat.name)}
                      </p>
                      <p className="text-[11px] text-slate-400">{cat.count}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cat.meta.bgClass} ${cat.meta.textClass} ${cat.meta.borderClass}`}
                  >
                    {cat.percentage}%
                  </span>
                </div>

                <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {formatProtectedCurrency(cat.value)}
                </p>

                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2.5">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(cat.value > 0 ? 4 : 0, cat.percentage))}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {monthExpenses.length === 0 ? (
        <div className="exec-card p-10 text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto">
            {React.createElement(FaChartPie as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('modals.categoryDetails.empty')}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {displayedCategories.map((cat) => (
            <div key={cat.name} className="exec-card overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.meta.iconBgClass}`}
                  >
                    {React.createElement(cat.meta.icon as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {translateCategoryName(cat.name)}
                      </h4>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cat.meta.bgClass} ${cat.meta.textClass} ${cat.meta.borderClass}`}
                      >
                        {cat.percentage}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{cat.count}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {t('modals.categoryDetails.totalSpent')}
                  </span>
                  <span className="text-base font-bold text-slate-900 dark:text-white tabular-nums">
                    {formatProtectedCurrency(cat.value)}
                  </span>
                </div>
              </div>

              {cat.items.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  {t('modals.categoryDetails.empty')}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {cat.items.map((item) => (
                    <div
                      key={item.id}
                      className="px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {formatExpenseDisplayName(item.name, t)}
                          </span>
                          <StatusBadge
                            status={item.status}
                            paymentMethod={item.paymentMethod}
                            isPartiallyPaid={item.isPartiallyPaid}
                          />
                          {item.receiptUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewReceipt({
                                  url: item.receiptUrl!,
                                  name: formatExpenseDisplayName(item.name, t),
                                })
                              }
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
                            >
                              {React.createElement(FaImage as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
                              <span>{t('expenses.receiptAttached')}</span>
                            </button>
                          )}
                          {isFamilyMode && item.ownerName && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-900 dark:bg-slate-700 text-white">
                              {React.createElement(FaUser as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[8px]' })}
                              {item.ownerName.split(' ')[0]}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                            {React.createElement(FaCalendarAlt as unknown as React.ComponentType<{ className?: string }>, {
                              className: 'text-[10px] text-slate-400',
                            })}
                            {t('incomes.dateLabel', { date: formatDateBr(item.dueDate) })}
                          </span>
                          {item.isCreditCard && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              {React.createElement(FaCreditCard as unknown as React.ComponentType<{ className?: string }>, {
                                className: 'text-[10px]',
                              })}
                              {t('expenses.creditCardBadge')}
                            </span>
                          )}
                          {item.isRecurring && (
                            <span className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              {t('expenses.recurringBadge')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-1.5 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
                        <span className="text-xs text-slate-400 sm:hidden">{t('common.total')}</span>
                        <div className="text-right tabular-nums">
                          {item.isPaid &&
                            item.isEarlyPayment &&
                            Number(item.paidAmount || 0) > 0 &&
                            Number(item.paidAmount) < Number(item.value) - 0.009 ? (
                            <>
                              <span className="block text-[11px] text-slate-400 line-through">
                                {formatProtectedCurrency(Number(item.value))}
                              </span>
                              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                                {formatProtectedCurrency(getEffectiveExpenseAmount(item))}
                              </span>
                              <span className="block text-[10px] text-emerald-700 dark:text-emerald-400">
                                {t('expenses.earlyDiscountNote', {
                                  original: formatProtectedCurrency(Number(item.value)),
                                  paid: formatProtectedCurrency(getEffectiveExpenseAmount(item)),
                                })}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              {formatProtectedCurrency(Number(item.value))}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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

export default CategoryDetailsView;
