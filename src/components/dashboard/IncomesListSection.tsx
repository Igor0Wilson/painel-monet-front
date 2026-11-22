import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaCalendarAlt, FaEdit, FaPlus, FaTrash } from 'react-icons/fa';
import { IncomeItem } from '../../types/finance';
import { formatCurrency, formatDateBr, formatShortDate } from '../../utils/formatters';

interface Props {
  incomes: IncomeItem[];
  isFamilyMode: boolean;
  onAddIncome: () => void;
  onEditIncome: (income: IncomeItem) => void;
  onDeleteIncome: (id: string) => void;
}

const IncomesListSection: React.FC<Props> = ({
  incomes,
  isFamilyMode,
  onAddIncome,
  onEditIncome,
  onDeleteIncome,
}) => {
  const { t } = useTranslation();

  return (
    <section className="lg:col-span-4 exec-card overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {t('incomes.title')}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('incomes.subtitleCount', { count: incomes.length })}
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

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {incomes.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {t('incomes.empty')}
            </p>
            <div className="mt-4">
              <button type="button" onClick={onAddIncome} className="exec-btn-secondary text-xs">
                {t('incomes.newBtn')}
              </button>
            </div>
          </div>
        ) : (
          incomes.map((income) => (
            <div
              key={income.id}
              className="px-6 py-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {income.name}
                    </h4>
                    {income.isRecurring && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700 flex-shrink-0">
                        {t('incomes.recurringLabel')}
                      </span>
                    )}
                    {income.status === 'agendado' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60 flex-shrink-0">
                        {t('status.agendado')} ·{' '}
                        {formatShortDate(income.nextCreditDate || income.incomeDate)}
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
                    <span>{t('incomes.dateLabel', { date: formatDateBr(income.incomeDate) })}</span>
                  </p>
                </div>

                {income.isOwn !== false && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditIncome(income)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title={t('common.edit')}
                    >
                      {React.createElement(FaEdit as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteIncome(income.id)}
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
                  income.status === 'agendado'
                    ? 'text-slate-500 dark:text-slate-400'
                    : 'text-emerald-700 dark:text-emerald-400'
                }`}
              >
                + {formatCurrency(income.value)}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default IncomesListSection;
