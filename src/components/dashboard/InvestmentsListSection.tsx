import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaCalendarAlt,
  FaEdit,
  FaLock,
  FaPlus,
  FaSeedling,
  FaTrash,
} from 'react-icons/fa';
import { InvestmentItem, MemberBreakdown } from '../../types/finance';
import {
  formatCurrency,
  formatDateBr,
  translateInvestmentCategory,
} from '../../utils/formatters';

interface Props {
  items: InvestmentItem[];
  isFamilyMode: boolean;
  selectedMember?: MemberBreakdown | null;
  onAddInvestment: () => void;
  onEditInvestment: (item: InvestmentItem) => void;
  onDeleteInvestment: (id: string) => void;
}

const InvestmentsListSection: React.FC<Props> = ({
  items,
  isFamilyMode,
  selectedMember,
  onAddInvestment,
  onEditInvestment,
  onDeleteInvestment,
}) => {
  const { t } = useTranslation();
  const [sourceFilter, setSourceFilter] = useState<'all' | 'external' | 'balance'>('all');

  const isSelectedMemberRestricted = Boolean(
    isFamilyMode &&
    selectedMember &&
    !selectedMember.isSelf &&
    selectedMember.permissions &&
    !selectedMember.permissions.viewInvestments,
  );

  const visibleItems = items.filter((it) =>
    sourceFilter === 'all' ? true : it.source === sourceFilter,
  );

  const totalVisible = visibleItems.reduce((sum, it) => sum + Number(it.amount || 0), 0);

  return (
    <section className="exec-card overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {React.createElement(
              FaSeedling as unknown as React.ComponentType<{ className?: string }>,
              { className: 'text-emerald-600 dark:text-emerald-400 text-sm' },
            )}
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {t('investments.title')}
            </h2>
            {visibleItems.length > 0 && (
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-full tabular-nums">
                {formatCurrency(totalVisible)}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('investments.subtitleCount', { count: visibleItems.length })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/80 dark:border-slate-700">
            {[
              { id: 'all' as const, label: t('common.all') },
              { id: 'external' as const, label: t('investments.sourceExternal') },
              { id: 'balance' as const, label: t('investments.sourceBalance') },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSourceFilter(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${sourceFilter === tab.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onAddInvestment}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            {React.createElement(
              FaPlus as unknown as React.ComponentType<{ className?: string }>,
              { className: 'text-[10px]' },
            )}
            <span>{t('investments.manageBtn')}</span>
          </button>
        </div>
      </div>

      {isSelectedMemberRestricted ? (
        <div className="p-8 text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto">
            {React.createElement(
              FaLock as unknown as React.ComponentType<{ className?: string }>,
              { className: 'text-sm' },
            )}
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {t('kpi.hiddenByPrivacy')}
          </p>
          <p className="text-xs text-slate-400">
            {selectedMember?.name} — {t('common.privateValue')}
          </p>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {t('investments.empty')}
          </p>
          <div className="mt-4">
            <button type="button" onClick={onAddInvestment} className="exec-btn-secondary text-xs">
              {t('investments.manageBtn')}
            </button>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {item.name}
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                    {translateInvestmentCategory(item.category, t)}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${item.source === 'balance'
                      ? 'bg-slate-900 dark:bg-slate-700 text-white'
                      : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60'
                      }`}
                  >
                    {item.source === 'balance'
                      ? t('investments.sourceBalance')
                      : t('investments.sourceExternal')}
                  </span>
                  {isFamilyMode && item.ownerName && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/60">
                      {item.isOwn ? t('common.you') : item.ownerName.split(' ')[0]}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  <span className="inline-flex items-center gap-1.5">
                    {React.createElement(
                      FaCalendarAlt as unknown as React.ComponentType<{ className?: string }>,
                      { className: 'text-[10px]' },
                    )}
                    {t('investments.dateLabel', { date: formatDateBr(item.investedDate) })}
                  </span>
                  {item.notes && <span>· {item.notes}</span>}
                </p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                <span className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                  {formatCurrency(item.amount)}
                </span>
                {item.isOwn !== false && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditInvestment(item)}
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title={t('common.edit')}
                    >
                      {React.createElement(
                        FaEdit as unknown as React.ComponentType<{ className?: string }>,
                        { className: 'text-xs' },
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteInvestment(item.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title={t('common.delete')}
                    >
                      {React.createElement(
                        FaTrash as unknown as React.ComponentType<{ className?: string }>,
                        { className: 'text-xs' },
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default InvestmentsListSection;
