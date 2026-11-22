import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaLock, FaShieldAlt, FaWhatsapp } from 'react-icons/fa';
import { MemberBreakdown } from '../../types/finance';
import { buildWhatsAppUrl, formatCurrency } from '../../utils/formatters';

interface Props {
  members: MemberBreakdown[];
  selectedMemberId: string;
  onSelectMember: (memberId: string) => void;
  onOpenPrivacySettings?: () => void;
}

const FamilyMembersStrip: React.FC<Props> = ({
  members,
  selectedMemberId,
  onSelectMember,
  onOpenPrivacySettings,
}) => {
  const { t } = useTranslation();
  if (!members.length) return null;

  const renderPrivateOrValue = (
    allowed: boolean | undefined,
    amount: number,
    _isSelected: boolean,
    highlightClass: string,
  ) => {
    if (allowed === false) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
          {React.createElement(
            FaLock as unknown as React.ComponentType<{ className?: string }>,
            { className: 'text-[9px]' },
          )}
          {t('common.privateValue')}
        </span>
      );
    }
    return (
      <span className={`font-semibold tabular-nums ${highlightClass}`}>
        {formatCurrency(amount)}
      </span>
    );
  };

  return (
    <div className="exec-card p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
            {t('familyStrip.title', { count: members.length })}
          </h2>
          <p className="text-xs text-slate-400">{t('familyStrip.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {onOpenPrivacySettings && (
            <button
              type="button"
              onClick={onOpenPrivacySettings}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
            >
              {React.createElement(
                FaShieldAlt as unknown as React.ComponentType<{ className?: string }>,
                { className: 'text-[11px] text-emerald-600 dark:text-emerald-400' },
              )}
              {t('familyStrip.privacyBtn')}
            </button>
          )}
          {selectedMemberId !== 'all' && (
            <button
              type="button"
              onClick={() => onSelectMember('all')}
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white underline"
            >
              {t('familyStrip.showAllBtn')}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {members.map((member) => {
          const isSelected = selectedMemberId === member.userId;
          const waUrl = buildWhatsAppUrl(member.phone);

          return (
            <div
              key={member.userId}
              onClick={() => onSelectMember(isSelected ? 'all' : member.userId)}
              className={`rounded-xl border p-3.5 cursor-pointer transition-all ${isSelected
                ? 'border-slate-900 dark:border-emerald-500 bg-slate-900 dark:bg-emerald-950/60 text-white shadow-sm'
                : 'border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-800'
                }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  {member.avatarUrl && (
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      className="w-8 h-8 rounded-lg object-cover border border-slate-200/70 dark:border-slate-600 flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'
                        }`}
                    >
                      {member.name} {member.isSelf ? `(${t('common.you')})` : ''}
                    </p>
                    <p
                      className={`text-[11px] tabular-nums ${isSelected ? 'text-slate-300' : 'text-slate-400'
                        }`}
                    >
                      CPF: {member.maskedCpf}
                    </p>
                  </div>
                </div>
                {waUrl && !member.isSelf && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={`p-2 rounded-lg transition-colors ${isSelected
                      ? 'bg-white/10 text-emerald-300 hover:bg-white/20'
                      : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                      }`}
                    title={t('common.openWhatsapp')}
                  >
                    {React.createElement(FaWhatsapp as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
                  </a>
                )}
              </div>

              <div className="mt-3 pt-2.5 border-t border-current/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span
                    className={`block text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-400'
                      }`}
                  >
                    {t('familyStrip.incomeLabel')}
                  </span>
                  {renderPrivateOrValue(
                    member.permissions?.viewIncome,
                    member.totalIncome,
                    isSelected,
                    isSelected ? 'text-emerald-300' : 'text-emerald-700 dark:text-emerald-400',
                  )}
                </div>
                <div>
                  <span
                    className={`block text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-400'
                      }`}
                  >
                    {t('familyStrip.expensesLabel')}
                  </span>
                  {renderPrivateOrValue(
                    member.permissions?.viewExpenses,
                    member.totalExpenses,
                    isSelected,
                    isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-100',
                  )}
                </div>
                <div>
                  <span
                    className={`block text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-400'
                      }`}
                  >
                    {t('familyStrip.investmentsLabel')}
                  </span>
                  {renderPrivateOrValue(
                    member.permissions?.viewInvestments,
                    member.investments,
                    isSelected,
                    isSelected ? 'text-emerald-300' : 'text-emerald-700 dark:text-emerald-400',
                  )}
                </div>
                <div>
                  <span
                    className={`block text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-400'
                      }`}
                  >
                    {t('familyStrip.foodLabel')}
                  </span>
                  {renderPrivateOrValue(
                    member.permissions?.viewFoodAllowance,
                    member.foodAllowance || 0,
                    isSelected,
                    isSelected ? 'text-amber-300' : 'text-amber-700 dark:text-amber-400',
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FamilyMembersStrip;
