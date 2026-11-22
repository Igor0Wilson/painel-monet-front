import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaCalculator,
  FaCalendarAlt,
  FaCheckCircle,
  FaCheckDouble,
  FaChevronDown,
  FaChevronUp,
  FaCreditCard,
  FaEdit,
  FaImage,
  FaTimes,
  FaTrash,
  FaUndo,
  FaUser,
} from 'react-icons/fa';
import EncryptedImage from '../EncryptedImage';
import { ExpenseFilter, ExpenseItem } from '../../types/finance';
import { getCategoryMeta, translateCategoryName } from '../../utils/categories';
import {
  formatCurrency,
  formatDateBr,
  formatMonthLabel,
  getCurrentMonthKey,
} from '../../utils/formatters';
import StatusBadge from './StatusBadge';

interface Props {
  expenses: ExpenseItem[];
  expenseFilter: ExpenseFilter;
  isFamilyMode: boolean;
  openInstallments: string[];
  onChangeFilter: (filter: ExpenseFilter) => void;
  onToggleInstallment: (id: string) => void;
  onPayExpense: (expense: ExpenseItem) => void;
  onPayBatchExpenses?: (expenses: ExpenseItem[]) => void;
  onUndoPayment?: (expense: ExpenseItem) => void;
  onEditExpense: (expense: ExpenseItem) => void;
  onDeleteExpense: (id: string) => void;
}

const FILTER_TAB_KEYS: {
  key: ExpenseFilter;
  labelKey: 'expenses.filterAll' | 'expenses.filterPending' | 'expenses.filterOverdue' | 'expenses.filterPaid';
}[] = [
    { key: 'todas', labelKey: 'expenses.filterAll' },
    { key: 'pendente', labelKey: 'expenses.filterPending' },
    { key: 'em_atraso', labelKey: 'expenses.filterOverdue' },
    { key: 'pago', labelKey: 'expenses.filterPaid' },
  ];

type PeriodMode = 'all' | 'month' | 'custom';

const ExpensesListSection: React.FC<Props> = ({
  expenses,
  expenseFilter,
  isFamilyMode,
  openInstallments,
  onChangeFilter,
  onToggleInstallment,
  onPayExpense,
  onPayBatchExpenses,
  onUndoPayment,
  onEditExpense,
  onDeleteExpense,
}) => {
  const { t } = useTranslation();
  const [periodMode, setPeriodMode] = useState<PeriodMode>('all');
  const [selectedPeriodMonth, setSelectedPeriodMonth] = useState<string>(getCurrentMonthKey());
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewReceipt, setPreviewReceipt] = useState<{
    url: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    const validUnpaidIds = new Set(
      expenses.filter((e) => !e.isPaid && e.isOwn !== false).map((e) => e.id),
    );
    setSelectedIds((prev) => prev.filter((id) => validUnpaidIds.has(id)));
  }, [expenses]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>([getCurrentMonthKey()]);
    expenses.forEach((exp) => {
      if (exp.dueDate) {
        set.add(String(exp.dueDate).slice(0, 7));
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [expenses]);

  const periodFilteredExpenses = useMemo(() => {
    if (periodMode === 'all') return expenses;
    return expenses.filter((exp) => {
      const cleanDate = String(exp.dueDate || '').split('T')[0];
      if (!cleanDate) return false;
      if (periodMode === 'month') {
        return cleanDate.startsWith(selectedPeriodMonth);
      }
      if (customStartDate && cleanDate < customStartDate) return false;
      if (customEndDate && cleanDate > customEndDate) return false;
      return true;
    });
  }, [expenses, periodMode, selectedPeriodMonth, customStartDate, customEndDate]);

  const periodTotalSum = useMemo(
    () => periodFilteredExpenses.reduce((sum, e) => sum + (Number(e.value) || 0), 0),
    [periodFilteredExpenses],
  );

  const getRemainingAmount = (exp: ExpenseItem): number => {
    if (exp.isPaid) return 0;
    if (typeof exp.remainingAmount === 'number') {
      return Math.max(0, Number(exp.remainingAmount) || 0);
    }
    const total = Number(exp.value) || 0;
    const paid = Number(exp.paidAmount) || 0;
    return Math.max(0, Number((total - paid).toFixed(2)));
  };

  const selectableVisibleExpenses = useMemo(
    () => periodFilteredExpenses.filter((e) => !e.isPaid && e.isOwn !== false),
    [periodFilteredExpenses],
  );

  const periodUnpaidSum = useMemo(
    () => selectableVisibleExpenses.reduce((sum, e) => sum + getRemainingAmount(e), 0),
    [selectableVisibleExpenses],
  );

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedExpenses = useMemo(
    () => expenses.filter((e) => selectedIdSet.has(e.id) && !e.isPaid && e.isOwn !== false),
    [expenses, selectedIdSet],
  );

  const selectedTotal = useMemo(
    () => selectedExpenses.reduce((sum, e) => sum + getRemainingAmount(e), 0),
    [selectedExpenses],
  );

  const allVisibleSelected =
    selectableVisibleExpenses.length > 0 &&
    selectableVisibleExpenses.every((e) => selectedIdSet.has(e.id));

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((curr) => curr !== id) : [...prev, id],
    );
  };

  const handleToggleSelectAllVisible = () => {
    const visibleIds = selectableVisibleExpenses.map((e) => e.id);
    if (visibleIds.length === 0) return;

    if (allVisibleSelected) {
      const visibleSet = new Set(visibleIds);
      setSelectedIds((prev) => prev.filter((id) => !visibleSet.has(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  return (
    <section className="exec-card overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {isFamilyMode ? t('expenses.titleFamily') : t('expenses.titleIndividual')}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isFamilyMode
              ? t('expenses.subtitleFamily')
              : t('expenses.subtitleIndividual')}
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-slate-100/80 dark:bg-slate-800 p-1 self-start sm:self-auto">
          {FILTER_TAB_KEYS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChangeFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${expenseFilter === tab.key
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Filtro por Período & Seleção em Lote */}
      <div className="px-6 py-3.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t('expenses.periodLabel')}
            </span>
            <div className="inline-flex rounded-lg bg-white dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-slate-700">
              {[
                { id: 'all' as const, label: t('expenses.periodAll') },
                { id: 'month' as const, label: t('expenses.periodMonth') },
                { id: 'custom' as const, label: t('expenses.periodRange') },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setPeriodMode(mode.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${periodMode === mode.id
                    ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {periodMode === 'month' && (
              <select
                aria-label={t('expenses.periodMonthAria')}
                value={selectedPeriodMonth}
                onChange={(e) => setSelectedPeriodMonth(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-100"
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthLabel(m)}
                  </option>
                ))}
              </select>
            )}

            {periodMode === 'custom' && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <input
                  aria-label={t('expenses.periodStartAria')}
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-800 dark:text-slate-100"
                />
                <span className="text-slate-400">{t('expenses.periodUntil')}</span>
                <input
                  aria-label={t('expenses.periodEndAria')}
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-800 dark:text-slate-100"
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-slate-500 dark:text-slate-400 tabular-nums">
              {t('expenses.periodTotalLabel')}{' '}
              <strong className="text-slate-900 dark:text-white">
                {formatCurrency(periodTotalSum)}
              </strong>
              {periodUnpaidSum > 0 && (
                <span className="text-amber-700 dark:text-amber-400 font-semibold">
                  {' '}
                  · {t('expenses.periodOpenSum', { amount: formatCurrency(periodUnpaidSum) })}
                </span>
              )}
            </span>

            {selectableVisibleExpenses.length > 0 && (
              <button
                type="button"
                onClick={handleToggleSelectAllVisible}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
              >
                {React.createElement(
                  FaCheckDouble as unknown as React.ComponentType<{ className?: string }>,
                  { className: 'text-[10px] text-emerald-600 dark:text-emerald-400' },
                )}
                {allVisibleSelected
                  ? t('expenses.unselectAllOpen')
                  : t('expenses.selectAllOpen', { count: selectableVisibleExpenses.length })}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Calculadora & Pagamento em Lote */}
      {selectedExpenses.length > 0 && (
        <div className="px-6 py-4 bg-slate-950 dark:bg-slate-950/95 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              {React.createElement(
                FaCalculator as unknown as React.ComponentType<{ className?: string }>,
                { className: 'text-sm' },
              )}
            </span>
            <div>
              <p className="text-xs text-slate-300">
                {selectedExpenses.length === 1
                  ? t('expenses.batchCountSingle')
                  : t('expenses.batchCountPlural', { count: selectedExpenses.length })}
              </p>
              <p className="text-lg font-bold tabular-nums text-white leading-tight">
                {t('common.total')}: {formatCurrency(selectedTotal)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-colors"
            >
              {t('expenses.clearSelection')}
            </button>
            {onPayBatchExpenses && (
              <button
                type="button"
                onClick={() => onPayBatchExpenses(selectedExpenses)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-bold shadow-sm transition-colors"
              >
                {React.createElement(
                  FaCheckCircle as unknown as React.ComponentType<{ className?: string }>,
                  { className: 'text-xs' },
                )}
                <span>{t('expenses.payBatchBtn', { amount: formatCurrency(selectedTotal) })}</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {periodFilteredExpenses.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {t('expenses.emptyTitle')}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {expenseFilter === 'todas' && periodMode === 'all'
                ? t('expenses.emptyAllHint')
                : t('expenses.emptyFilterHint')}
            </p>
          </div>
        ) : (
          periodFilteredExpenses.map((expense) => {
            if (
              expenseFilter === 'todas' &&
              expense.isInstallment &&
              expense.parentExpenseId &&
              periodFilteredExpenses.some((e) => e.id === expense.parentExpenseId)
            ) {
              return null;
            }

            const isGroupHeader =
              expenseFilter === 'todas' && expense.isInstallment && !expense.parentExpenseId;
            const childInstallments = isGroupHeader
              ? periodFilteredExpenses.filter((e) => e.parentExpenseId === expense.id)
              : [];
            const isAccordionOpen = openInstallments.includes(expense.id);
            const canModify = expense.isOwn !== false;
            const canSelect = !expense.isPaid && canModify;
            const isChecked = selectedIdSet.has(expense.id);

            return (
              <div
                key={expense.id}
                className={`transition-colors ${isChecked
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/25'
                  : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/50'
                  }`}
              >
                <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {canSelect && (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectId(expense.id)}
                        aria-label={t('expenses.selectExpenseAria', { name: expense.name })}
                        className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-600 cursor-pointer flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {isGroupHeader ? expense.name.split(' (')[0] : expense.name}
                        </h4>
                        <StatusBadge
                          status={expense.status}
                          paymentMethod={expense.paymentMethod}
                          isPartiallyPaid={expense.isPartiallyPaid}
                        />
                        {expense.receiptUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewReceipt({
                                url: expense.receiptUrl!,
                                name: expense.name,
                              })
                            }
                            data-testid={`expense-receipt-btn-${expense.id}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                          >
                            {React.createElement(FaImage as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
                            <span>{t('expenses.receiptAttached')}</span>
                          </button>
                        )}
                        {isFamilyMode && expense.ownerName && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${expense.isOwn
                              ? 'bg-slate-900 dark:bg-slate-700 text-white'
                              : 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/60'
                              }`}
                          >
                            {React.createElement(FaUser as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[8px]' })}
                            {expense.ownerName.split(' ')[0]}
                          </span>
                        )}
                        {isGroupHeader && childInstallments.length > 0 && (
                          <button
                            type="button"
                            onClick={() => onToggleInstallment(expense.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700 transition-colors"
                          >
                            {t('expenses.installmentGroupBadge', { count: childInstallments.length + 1 })}
                            {React.createElement(
                              (isAccordionOpen ? FaChevronUp : FaChevronDown) as unknown as React.ComponentType<{ className?: string }>,
                              { className: 'text-[9px]' },
                            )}
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                          {React.createElement(FaCalendarAlt as unknown as React.ComponentType<{ className?: string }>, {
                            className: 'text-[10px] text-slate-400',
                          })}
                          {formatDateBr(expense.dueDate)}
                        </span>
                        {expense.isPaid && expense.paidAt && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                            {t('expenses.paidOnDate', { date: formatDateBr(expense.paidAt) })}
                          </span>
                        )}
                        {(() => {
                          const catMeta = getCategoryMeta(expense.accountType?.name);
                          return (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${catMeta.bgClass} ${catMeta.textClass} ${catMeta.borderClass}`}
                            >
                              {React.createElement(catMeta.icon as unknown as React.ComponentType<{ className?: string }>, {
                                className: 'text-[10px]',
                              })}
                              {translateCategoryName(catMeta.name)}
                            </span>
                          );
                        })()}
                        {expense.isRecurring && (
                          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            {t('expenses.recurringBadge')}
                          </span>
                        )}
                        {expense.isInstallment && (
                          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            {t('expenses.installmentBadge', {
                              current: expense.installmentNumber,
                              total: expense.installmentCount,
                            })}
                          </span>
                        )}
                        {expense.isCreditCard && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-2 py-0.5 rounded-md">
                            {React.createElement(FaCreditCard as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[9px]' })}
                            {t('expenses.creditCardBadge')}
                          </span>
                        )}
                      </div>

                      {!expense.isPaid && (expense.isPartiallyPaid || Number(expense.paidAmount || 0) > 0) && (
                        <div className="mt-2 rounded-lg border border-amber-200/80 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30 px-3 py-2 text-xs space-y-1.5">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-semibold tabular-nums">
                            <span className="text-emerald-700 dark:text-emerald-300">
                              {t('expenses.partialPaidSummary', {
                                paid: formatCurrency(Number(expense.paidAmount) || 0),
                              })}
                            </span>
                            <span className="text-amber-700 dark:text-amber-300">
                              {t('expenses.partialRemainingSummary', {
                                remaining: formatCurrency(getRemainingAmount(expense)),
                              })}
                            </span>
                          </div>
                          {expense.payments && expense.payments.length > 0 && (
                            <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                              <p className="font-medium text-slate-500 dark:text-slate-400">
                                {t('expenses.partialPaymentsHistory')}
                              </p>
                              <ul className="flex flex-wrap gap-1.5">
                                {expense.payments.map((part) => (
                                  <li
                                    key={part.id}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-amber-200/70 dark:border-amber-800/50 tabular-nums"
                                  >
                                    <span>{formatDateBr(part.paidAt)}</span>
                                    <span>·</span>
                                    <span>{t(`paymentMethods.${part.paymentMethod}`)}</span>
                                    <span>·</span>
                                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                                      {formatCurrency(part.amount)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
                    <span className="text-base font-semibold text-slate-900 dark:text-white tabular-nums">
                      {formatCurrency(expense.value)}
                    </span>

                    {canModify && (
                      <div className="flex items-center gap-1.5">
                        {!expense.isPaid && (
                          <button
                            type="button"
                            onClick={() => onPayExpense(expense)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors"
                            title={t('expenses.payBtn')}
                          >
                            {React.createElement(FaCheckCircle as unknown as React.ComponentType<{ className?: string }>, {
                              className: 'text-[11px]',
                            })}
                            <span>{t('expenses.payBtn')}</span>
                          </button>
                        )}
                        {onUndoPayment && (expense.isPaid || Number(expense.paidAmount || 0) > 0) && (
                          <button
                            type="button"
                            onClick={() => onUndoPayment(expense)}
                            data-testid={`expense-undo-btn-${expense.id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-medium transition-colors"
                            title={t('expenses.undoPaymentTitle')}
                          >
                            {React.createElement(FaUndo as unknown as React.ComponentType<{ className?: string }>, {
                              className: 'text-[10px]',
                            })}
                            <span>{t('expenses.undoPaymentBtn')}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onEditExpense(expense)}
                          className="p-2 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title={t('common.edit')}
                        >
                          {React.createElement(FaEdit as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteExpense(expense.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title={t('common.delete')}
                        >
                          {React.createElement(FaTrash as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {isAccordionOpen && childInstallments.length > 0 && (
                  <div className="bg-slate-50/90 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 px-6 py-2.5 space-y-2">
                    {childInstallments.map((child) => {
                      const canSelectChild = !child.isPaid && child.isOwn !== false;
                      const isChildChecked = selectedIdSet.has(child.id);
                      return (
                        <div
                          key={child.id}
                          className={`px-4 py-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 transition-colors ${isChildChecked
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200/70 dark:border-slate-700'
                            }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {canSelectChild && (
                              <input
                                type="checkbox"
                                checked={isChildChecked}
                                onChange={() => toggleSelectId(child.id)}
                                aria-label={t('expenses.selectExpenseAria', { name: child.name })}
                                className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-600 cursor-pointer flex-shrink-0"
                              />
                            )}
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md tabular-nums">
                              {child.installmentNumber}/{child.installmentCount}
                            </span>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                              {formatDateBr(child.dueDate)}
                            </span>
                            <StatusBadge
                              status={child.status}
                              paymentMethod={child.paymentMethod}
                              isPartiallyPaid={child.isPartiallyPaid}
                            />
                            {child.isPaid && child.paidAt && (
                              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                                {t('expenses.paidOnDate', { date: formatDateBr(child.paidAt) })}
                              </span>
                            )}
                            {child.receiptUrl && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewReceipt({ url: child.receiptUrl!, name: child.name })
                                }
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300"
                              >
                                {React.createElement(FaImage as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
                                <span>{t('expenses.receiptAttached')}</span>
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                              {formatCurrency(child.value)}
                            </span>
                            {child.isOwn !== false && (
                              <div className="flex items-center gap-1">
                                {!child.isPaid && (
                                  <button
                                    type="button"
                                    onClick={() => onPayExpense(child)}
                                    className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                                    title={t('expenses.payBtn')}
                                  >
                                    {React.createElement(FaCheckCircle as unknown as React.ComponentType<{ className?: string }>, {
                                      className: 'text-xs',
                                    })}
                                  </button>
                                )}
                                {onUndoPayment && (child.isPaid || Number(child.paidAmount || 0) > 0) && (
                                  <button
                                    type="button"
                                    onClick={() => onUndoPayment(child)}
                                    data-testid={`expense-undo-btn-${child.id}`}
                                    className="p-1.5 rounded-lg text-amber-600 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors"
                                    title={t('expenses.undoPaymentTitle')}
                                  >
                                    {React.createElement(FaUndo as unknown as React.ComponentType<{ className?: string }>, {
                                      className: 'text-xs',
                                    })}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => onEditExpense(child)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                  title={t('common.edit')}
                                >
                                  {React.createElement(FaEdit as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteExpense(child.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                  title={t('common.delete')}
                                >
                                  {React.createElement(FaTrash as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
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
    </section>
  );
};

export default ExpensesListSection;
