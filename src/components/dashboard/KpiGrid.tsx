import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaArrowDown,
  FaArrowUp,
  FaLandmark,
  FaPiggyBank,
  FaSeedling,
  FaShieldAlt,
  FaUtensils,
} from 'react-icons/fa';
import { usePrivacyMode } from '../../context/PrivacyModeContext';
import { BalanceData } from '../../types/finance';
import { formatShortDate } from '../../utils/formatters';

interface Props {
  balance: BalanceData;
  incomesCount: number;
  isFamilyMode: boolean;
  onOpenEmergencyModal: () => void;
  onOpenInvestmentModal: () => void;
  onOpenFoodAllowanceModal?: () => void;
}

const KpiGrid: React.FC<Props> = ({
  balance,
  incomesCount,
  isFamilyMode,
  onOpenEmergencyModal,
  onOpenInvestmentModal,
  onOpenFoodAllowanceModal,
}) => {
  const { t } = useTranslation();
  const { formatProtectedCurrency } = usePrivacyMode();
  const netFlow = balance.totalIncome - balance.totalExpenses;
  const totalPatrimony = Number(
    ((balance.balance || 0) + (balance.emergencyFund || 0) + (balance.investments || 0)).toFixed(2),
  );
  const hasMonthlyAllocatedSavings =
    (balance.ownAllocatedInvestments || 0) > 0 || (balance.ownAllocatedEmergencyFund || 0) > 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        <div className="bg-slate-950 text-white rounded-2xl p-6 shadow-executive-lg border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-slate-800" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-400">
              {isFamilyMode ? t('kpi.balanceTitleFamily') : t('kpi.balanceTitle')}
            </span>
            <span className="w-8 h-8 rounded-lg bg-white/10 text-emerald-400 flex items-center justify-center">
              {React.createElement(FaLandmark as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums">
            {formatProtectedCurrency(balance.balance)}
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            {(balance.emergencyFund || 0) > 0 || (balance.investments || 0) > 0
              ? t('kpi.totalPatrimonyHint', { amount: formatProtectedCurrency(totalPatrimony) })
              : t('kpi.balanceSubIndividual')}
          </p>
          {balance.balance < 0 && hasMonthlyAllocatedSavings && (
            <p className="text-[11px] text-amber-300 mt-1.5 leading-snug">
              {t('kpi.balanceRetainedHint')}
            </p>
          )}
        </div>

        <div className="exec-card p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {isFamilyMode ? t('kpi.incomeTitleFamily') : t('kpi.incomeTitle')}
            </span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/60 flex items-center justify-center">
              {React.createElement(FaArrowUp as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight tabular-nums">
            {formatProtectedCurrency(balance.totalIncome)}
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            {balance.scheduledIncome > 0 ? (
              <>
                {t('kpi.incomeScheduledNote')}{' '}
                <span className="font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
                  {formatProtectedCurrency(balance.scheduledIncome)}
                </span>
              </>
            ) : (
              <>{t('kpi.incomeSourcesCount', { count: incomesCount })}</>
            )}
          </p>
        </div>

        <div className="exec-card p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {isFamilyMode ? t('kpi.expensesTitleFamily') : t('kpi.expensesTitle')}
            </span>
            <span className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800/60 flex items-center justify-center">
              {React.createElement(FaArrowDown as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight tabular-nums">
            {formatProtectedCurrency(balance.totalExpenses)}
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            {t('kpi.netFlowLabel')}{' '}
            <span
              className={`font-semibold tabular-nums ${netFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
            >
              {formatProtectedCurrency(netFlow)}
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <div className="exec-card p-6 flex flex-col sm:flex-row lg:flex-col xl:flex-row sm:items-center lg:items-start xl:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center">
                {React.createElement(FaShieldAlt as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {isFamilyMode ? t('kpi.reserveTitleFamily') : t('kpi.reserveTitle')}
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight tabular-nums">
              {formatProtectedCurrency(balance.emergencyFund)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {isFamilyMode
                ? t('kpi.reserveOwnPart', { amount: formatProtectedCurrency(balance.ownEmergencyFund || 0) })
                : (balance.externalEmergencyFund || 0) > 0 &&
                  (balance.allocatedEmergencyFund || 0) > 0
                  ? t('kpi.reservePrevHint', {
                    reserve: formatProtectedCurrency(balance.externalEmergencyFund || 0),
                    allocated: formatProtectedCurrency(balance.allocatedEmergencyFund || 0),
                  })
                  : (balance.externalEmergencyFund || 0) > 0
                    ? t('kpi.reserveUnlimitedHint')
                    : t('kpi.reserveDefaultHint')}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenEmergencyModal}
            aria-label={t('kpi.reserveAddAria')}
            className="w-full sm:w-auto lg:w-full xl:w-auto min-w-[136px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white text-sm font-semibold shadow-sm active:scale-[0.99] transition-all"
          >
            {React.createElement(FaPiggyBank as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm text-emerald-400' })}
            <span>{t('kpi.guardBtn')}</span>
          </button>
        </div>

        <div className="exec-card p-6 flex flex-col sm:flex-row lg:flex-col xl:flex-row sm:items-center lg:items-start xl:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/60 flex items-center justify-center">
                {React.createElement(FaSeedling as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {isFamilyMode ? t('kpi.investmentsTitleFamily') : t('kpi.investmentsTitle')}
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight tabular-nums">
              {formatProtectedCurrency(balance.investments || 0)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {isFamilyMode
                ? t('kpi.investmentsOwnPart', { amount: formatProtectedCurrency(balance.ownInvestments || 0) })
                : (balance.externalInvestments || 0) > 0 &&
                  (balance.allocatedInvestments || 0) > 0
                  ? t('kpi.investmentsPrevHint', {
                    external: formatProtectedCurrency(balance.externalInvestments || 0),
                    allocated: formatProtectedCurrency(balance.allocatedInvestments || 0),
                  })
                  : (balance.externalInvestments || 0) > 0
                    ? t('kpi.investmentsUnlimitedHint')
                    : t('kpi.investmentsDefaultHint')}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenInvestmentModal}
            aria-label={t('kpi.investmentsAddAria')}
            className="w-full sm:w-auto lg:w-full xl:w-auto min-w-[136px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm active:scale-[0.99] transition-all"
          >
            {React.createElement(FaSeedling as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
            <span>{t('kpi.guardBtn')}</span>
          </button>
        </div>

        <div className="exec-card p-6 flex flex-col sm:flex-row lg:flex-col xl:flex-row sm:items-center lg:items-start xl:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-center">
                {React.createElement(FaUtensils as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {isFamilyMode ? t('kpi.foodTitleFamily') : t('kpi.foodTitle')}
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight tabular-nums">
              {formatProtectedCurrency(balance.foodAllowance || 0)}
            </p>
            <div className="text-xs text-slate-400 mt-1 space-y-0.5">
              {(balance.foodAllowanceScheduled || 0) > 0 && (
                <p className="text-amber-700 dark:text-amber-400 font-semibold tabular-nums">
                  {t('kpi.foodScheduledHint')}
                  {balance.ownFoodAllowanceNextDate
                    ? ` (${formatShortDate(balance.ownFoodAllowanceNextDate)})`
                    : ''}
                  : {formatProtectedCurrency(balance.foodAllowanceScheduled || 0)}
                </p>
              )}
              <p>
                {isFamilyMode
                  ? t('kpi.foodFamilyOwnSub', { amount: formatProtectedCurrency(balance.ownFoodAllowance || 0) })
                  : (balance.foodAllowanceUsed || 0) > 0
                    ? t('kpi.foodUsageHint', {
                      total: formatProtectedCurrency(balance.foodAllowanceTotal || 0),
                      used: formatProtectedCurrency(balance.foodAllowanceUsed || 0),
                    })
                    : t('kpi.foodDefaultHint')}
              </p>
            </div>
          </div>

          {onOpenFoodAllowanceModal && (
            <button
              type="button"
              onClick={onOpenFoodAllowanceModal}
              aria-label={t('kpi.foodAddAria')}
              className="w-full sm:w-auto lg:w-full xl:w-auto min-w-[136px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-bold shadow-sm active:scale-[0.99] transition-all"
            >
              {React.createElement(FaUtensils as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
              <span>{t('kpi.insertFoodBtn')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default KpiGrid;
