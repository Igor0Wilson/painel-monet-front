import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaEdit,
  FaPlus,
  FaTrash,
} from 'react-icons/fa';
import { usePrivacyMode } from '../../context/PrivacyModeContext';
import { IncomeItem } from '../../types/finance';
import {
  formatDateBr,
  formatMonthLabel,
  formatShortDate,
  getCurrentMonthKey,
  shiftMonthKey,
} from '../../utils/formatters';
import { getEffectiveIncomeForMonth } from '../../utils/recurrence';

interface Props {
  incomes: IncomeItem[];
  isFamilyMode: boolean;
  onAddIncome: () => void;
  onEditIncome: (income: IncomeItem, targetMonth?: string) => void;
  onDeleteIncome: (id: string) => void;
  onDeleteIncomeWithMonth?: (income: IncomeItem, monthKey?: string) => void;
  selectedMonth?: string;
  onSelectMonth?: (month: string) => void;
}

const IncomesListSection: React.FC<Props> = ({
  incomes,
  isFamilyMode,
  onAddIncome,
  onEditIncome,
  onDeleteIncome,
  onDeleteIncomeWithMonth,
  selectedMonth,
  onSelectMonth,
}) => {
  const { t } = useTranslation();
  const { formatProtectedCurrency } = usePrivacyMode();
  const [periodMode, setPeriodMode] = useState<'month' | 'all'>('month');
  const [localMonth, setLocalMonth] = useState<string>(
    selectedMonth || getCurrentMonthKey(),
  );
  const activeMonth = selectedMonth || localMonth;
  const setMonth = (m: string) => {
    setLocalMonth(m);
    onSelectMonth?.(m);
  };

  const monthRows = useMemo(() => {
    if (periodMode === 'all') {
      return incomes.map((income) => ({
        income,
        effectiveName: income.name,
        effectiveValue: Number(income.value || 0),
        effectiveDate: income.incomeDate,
        effectiveStatus: income.status || 'creditado',
        hasOverride: false,
      }));
    }
    return incomes
      .map((income) => {
        const eff = getEffectiveIncomeForMonth(income, activeMonth);
        return { income, eff };
      })
      .filter((r) => r.eff.applies)
      .map((r) => ({
        income: r.income,
        effectiveName: r.eff.name,
        effectiveValue: r.eff.value,
        effectiveDate: r.eff.date,
        effectiveStatus: r.eff.status,
        hasOverride: r.eff.hasOverride,
      }));
  }, [incomes, periodMode, activeMonth]);

  const monthTotals = useMemo(() => {
    let credited = 0;
    let scheduled = 0;
    monthRows.forEach((row) => {
      if (row.effectiveStatus === 'agendado') scheduled += row.effectiveValue;
      else credited += row.effectiveValue;
    });
    return {
      credited: Number(credited.toFixed(2)),
      scheduled: Number(scheduled.toFixed(2)),
    };
  }, [monthRows]);

  return (
    <section className="lg:col-span-4 exec-card overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {t('incomes.title')}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('incomes.subtitleCount', { count: monthRows.length })}
            </p>
          </div>
          <button
            type="button"
            onClick={onAddIncome}
            className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-emerald-400 flex items-center justify-center transition-colors"
            title={t('incomes.newBtn')}
          >
            {React.createElement(FaPlus as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/70 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setPeriodMode('month')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                periodMode === 'month'
                  ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {t('dashboard.incomesSection.monthPeriod')}
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                periodMode === 'all'
                  ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {t('dashboard.incomesSection.allPeriod')}
            </button>
          </div>

          {periodMode === 'month' && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMonth(shiftMonthKey(activeMonth, -1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                aria-label={t('charts.prevMonth')}
              >
                {React.createElement(FaChevronLeft as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
              </button>
              <span className="px-2 text-xs font-semibold text-slate-700 dark:text-slate-200 min-w-[110px] text-center">
                {formatMonthLabel(activeMonth)}
              </span>
              <button
                type="button"
                onClick={() => setMonth(shiftMonthKey(activeMonth, 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                aria-label={t('charts.nextMonth')}
              >
                {React.createElement(FaChevronRight as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
              </button>
            </div>
          )}
        </div>

        {periodMode === 'month' && monthRows.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-[11px] bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-1.5">
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold tabular-nums">
              {t('dashboard.incomesSection.monthTotalCredited')}:{' '}
              {formatProtectedCurrency(monthTotals.credited)}
            </span>
            {monthTotals.scheduled > 0 && (
              <span className="text-amber-700 dark:text-amber-400 font-semibold tabular-nums">
                {t('dashboard.incomesSection.monthTotalScheduled')}:{' '}
                {formatProtectedCurrency(monthTotals.scheduled)}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {monthRows.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {periodMode === 'month'
                ? t('dashboard.incomesSection.emptyForMonth', {
                    month: formatMonthLabel(activeMonth),
                  })
                : t('incomes.empty')}
            </p>
            <div className="mt-4">
              <button type="button" onClick={onAddIncome} className="exec-btn-secondary text-xs">
                {t('incomes.newBtn')}
              </button>
            </div>
          </div>
        ) : (
          monthRows.map(
            ({
              income,
              effectiveName,
              effectiveValue,
              effectiveDate,
              effectiveStatus,
              hasOverride,
            }) => (
              <div
                key={`${income.id}-${periodMode === 'month' ? activeMonth : 'all'}`}
                className="px-6 py-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {effectiveName}
                      </h4>
                      {income.isRecurring && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700 flex-shrink-0">
                          {t('incomes.recurringLabel')}
                        </span>
                      )}
                      {hasOverride && periodMode === 'month' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200/70 dark:border-sky-800/60 flex-shrink-0">
                          {t('dashboard.incomesSection.editedForMonthBadge', {
                            month: formatMonthLabel(activeMonth),
                          })}
                        </span>
                      )}
                      {effectiveStatus === 'agendado' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60 flex-shrink-0">
                          {t('status.agendado')} ·{' '}
                          {formatShortDate(
                            periodMode === 'month'
                              ? effectiveDate
                              : income.nextCreditDate || income.incomeDate,
                          )}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60 flex-shrink-0">
                          {t('status.creditado')}
                        </span>
                      )}
                      {isFamilyMode && income.ownerName && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-900 dark:bg-slate-700 text-white">
                          {income.ownerName.split(' ')[0]}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                      {React.createElement(FaCalendarAlt as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
                      <span>
                        {t('incomes.dateLabel', {
                          date: formatDateBr(effectiveDate),
                        })}
                      </span>
                    </p>
                  </div>

                  {income.isOwn !== false && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          onEditIncome(
                            income,
                            periodMode === 'month' ? activeMonth : undefined,
                          )
                        }
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title={t('common.edit')}
                      >
                        {React.createElement(FaEdit as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onDeleteIncomeWithMonth
                            ? onDeleteIncomeWithMonth(
                                income,
                                periodMode === 'month' ? activeMonth : undefined,
                              )
                            : onDeleteIncome(income.id)
                        }
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title={t('common.delete')}
                      >
                        {React.createElement(FaTrash as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
                      </button>
                    </div>
                  )}
                </div>

                <p
                  className={`text-base font-semibold mt-2 tabular-nums ${
                    effectiveStatus === 'agendado'
                      ? 'text-slate-500 dark:text-slate-400'
                      : 'text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  + {formatProtectedCurrency(effectiveValue)}
                </p>
              </div>
            ),
          )
        )}
      </div>
    </section>
  );
};

export default IncomesListSection;
