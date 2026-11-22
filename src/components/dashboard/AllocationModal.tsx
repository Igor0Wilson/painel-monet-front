import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaCalendarAlt, FaSeedling, FaShieldAlt, FaTimes, FaUtensils } from 'react-icons/fa';
import {
  formatCurrency,
  formatCurrencyInput,
  formatDateBr,
  getCurrencyPlaceholder,
  parseCurrencyInput,
} from '../../utils/formatters';

interface Props {
  isOpen: boolean;
  variant: 'emergency' | 'investment' | 'food';
  value: string;
  creditDate?: string;
  isRecurring?: boolean;
  maxLimit: number;
  usedAmount?: number;
  ownAvailableBalance?: number;
  savingsFromBalance?: boolean;
  allocatedSavings?: number;
  externalSavings?: number;
  loading: boolean;
  onChangeValue: (val: string) => void;
  onChangeCreditDate?: (date: string) => void;
  onChangeIsRecurring?: (recurring: boolean) => void;
  onChangeSavingsFromBalance?: (fromBalance: boolean) => void;
  onReclassifyToExternal?: () => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

function getTodayIso(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const AllocationModal: React.FC<Props> = ({
  isOpen,
  variant,
  value,
  creditDate = getTodayIso(),
  isRecurring = true,
  maxLimit,
  usedAmount = 0,
  ownAvailableBalance = 0,
  savingsFromBalance = false,
  allocatedSavings = 0,
  externalSavings = 0,
  loading,
  onChangeValue,
  onChangeCreditDate,
  onChangeIsRecurring,
  onChangeSavingsFromBalance,
  onReclassifyToExternal,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const isEmergency = variant === 'emergency';
  const isFood = variant === 'food';
  const isInvestment = variant === 'investment';
  const todayIso = getTodayIso();
  const isFutureDate = Boolean(isFood && creditDate && creditDate > todayIso);

  const parsedInput = parseCurrencyInput(value);
  const allocationDelta = Number((parsedInput - allocatedSavings).toFixed(2));
  const projectedBalance = Number((ownAvailableBalance - allocationDelta).toFixed(2));

  const IconComp = isFood ? FaUtensils : isEmergency ? FaShieldAlt : FaSeedling;
  const headerBadgeClass = isFood
    ? 'bg-amber-500 text-slate-950'
    : isEmergency
      ? 'bg-slate-900 dark:bg-slate-100 text-emerald-400 dark:text-emerald-600'
      : 'bg-emerald-600 text-white';

  const titleText = isFood
    ? t('modals.allocation.foodTitle')
    : isEmergency
      ? t('modals.allocation.emergencyTitle')
      : t('modals.allocation.investmentTitle');

  const subtitleText = isFood
    ? t('modals.allocation.foodSubtitle')
    : isEmergency
      ? t('modals.allocation.emergencySubtitle')
      : t('modals.allocation.investmentSubtitle');

  return (
    <div className="exec-modal-overlay z-[60]">
      <div className="exec-modal-container max-w-md">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${headerBadgeClass}`}
            >
              {React.createElement(IconComp as unknown as React.ComponentType<{ className?: string }>, {
                className: 'text-sm',
              })}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {titleText}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{subtitleText}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={t('common.close')}
          >
            {React.createElement(FaTimes as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-5">
          {!isFood && (
            <div className="space-y-2">
              <label className="exec-label">{t('modals.allocation.sourceLabel')}</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChangeSavingsFromBalance?.(false)}
                  className={`p-3 rounded-xl border text-left transition-all ${!savingsFromBalance
                    ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                >
                  <p className="text-xs font-semibold">
                    {isEmergency
                      ? t('modals.allocation.existingReserve')
                      : t('modals.allocation.existingPortfolio')}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('modals.allocation.unlimitedSub')}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeSavingsFromBalance?.(true)}
                  className={`p-3 rounded-xl border text-left transition-all ${savingsFromBalance
                    ? 'border-slate-900 dark:border-slate-100 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                >
                  <p className="text-xs font-semibold">
                    {t('modals.allocation.monthlySourceTitle')}
                  </p>
                  <p
                    className={`text-[11px] mt-0.5 ${savingsFromBalance
                      ? 'text-slate-300 dark:text-slate-600'
                      : 'text-slate-500 dark:text-slate-400'
                      }`}
                  >
                    {t('modals.allocation.monthlySourceSub')}
                  </p>
                </button>
              </div>
              {(allocatedSavings > 0 || externalSavings > 0) && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                  {t('modals.allocation.currentTotalPrefix')}{' '}
                  <strong>{formatCurrency(allocatedSavings + externalSavings)}</strong> (
                  {t('modals.allocation.existingBreakdown')} {formatCurrency(externalSavings)} ·{' '}
                  {t('modals.allocation.monthlyBreakdown')} {formatCurrency(allocatedSavings)})
                </p>
              )}
            </div>
          )}

          <div>
            <label className="exec-label">
              {isFood
                ? t('modals.allocation.foodAmountLabel')
                : isEmergency
                  ? savingsFromBalance
                    ? t('modals.allocation.emergencyMonthlyLabel')
                    : t('modals.allocation.emergencyExistingLabel')
                  : savingsFromBalance
                    ? t('modals.allocation.investmentMonthlyLabel')
                    : t('modals.allocation.investmentExistingLabel')}
            </label>
            <input
              autoFocus
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(e) => onChangeValue(formatCurrencyInput(e.target.value, value))}
              className="exec-input tabular-nums font-semibold"
              placeholder={getCurrencyPlaceholder()}
            />
            {isFood ? (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="exec-label flex items-center gap-1.5">
                    {React.createElement(FaCalendarAlt as unknown as React.ComponentType<{ className?: string }>, {
                      className: 'text-[10px] text-slate-400 dark:text-slate-500',
                    })}
                    {t('modals.allocation.foodDateLabel')}
                  </label>
                  <input
                    type="date"
                    value={creditDate}
                    onChange={(e) => onChangeCreditDate?.(e.target.value)}
                    className="exec-input"
                    required
                  />
                </div>

                <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => onChangeIsRecurring?.(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-10 h-5 rounded-full transition-colors ${isRecurring ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                    />
                    <div
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isRecurring ? 'translate-x-5' : ''
                        }`}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {t('modals.allocation.foodRecurringLabel')}
                  </span>
                </label>

                <div
                  className={`rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed ${isFutureDate
                    ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/70 text-amber-900 dark:text-amber-200'
                    : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-200'
                    }`}
                >
                  {isFutureDate ? (
                    <>
                      <strong>
                        {t('modals.allocation.foodScheduledFuture', {
                          date: formatDateBr(creditDate),
                        })}
                      </strong>{' '}
                      {t('modals.allocation.foodScheduledFutureBody1')}{' '}
                      <strong>{t('modals.allocation.foodScheduledFuturePending')}</strong>{' '}
                      {t('modals.allocation.foodScheduledFutureBody2', {
                        date: formatDateBr(creditDate),
                      })}
                    </>
                  ) : (
                    <>
                      {t('modals.allocation.foodCreditedPrefix')}{' '}
                      <strong>{formatDateBr(creditDate)}</strong>{' '}
                      {t('modals.allocation.foodCreditedMiddle')}{' '}
                      <strong>{t('modals.allocation.foodCreditedTitle')}</strong>
                      {usedAmount > 0
                        ? t('modals.allocation.foodAlreadyUsed', {
                          amount: formatCurrency(usedAmount),
                        })
                        : ''}
                      .
                    </>
                  )}
                </div>
              </div>
            ) : !savingsFromBalance ? (
              <div className="space-y-2 mt-2">
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/70 rounded-lg px-3 py-2">
                  {t('modals.allocation.unlimitedModeHint')}
                </p>
                {allocatedSavings > 0 && onReclassifyToExternal && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={onReclassifyToExternal}
                    className="w-full text-left text-[11px] font-semibold text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/60 border border-amber-200 dark:border-amber-800/70 rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
                  >
                    {t('modals.allocation.reclassifyMonthlyToHere', {
                      amount: formatCurrency(allocatedSavings),
                    })}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2 mt-2">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 px-3 py-2 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                  <p>
                    {t('modals.allocation.maxAllocatable')}{' '}
                    <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatCurrency(Math.max(0, maxLimit))}
                    </span>
                  </p>
                  <p>
                    {t('modals.allocation.balanceAfterSave')}{' '}
                    <span
                      className={`font-semibold tabular-nums ${projectedBalance >= 0
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                        }`}
                    >
                      {formatCurrency(projectedBalance)}
                    </span>
                    {allocationDelta < 0 && (
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                        {' '}
                        (
                        {t('modals.allocation.releasedToSpend', {
                          amount: formatCurrency(Math.abs(allocationDelta)),
                        })}
                        )
                      </span>
                    )}
                    {allocationDelta > 0 && (
                      <span className="text-slate-500 dark:text-slate-400">
                        {' '}
                        (
                        {t('modals.allocation.reservedDelta', {
                          amount: formatCurrency(allocationDelta),
                        })}
                        )
                      </span>
                    )}
                  </p>
                </div>

                {allocatedSavings > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onChangeValue('0')}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      {t('modals.allocation.redeemAllBtn', {
                        amount: formatCurrency(allocatedSavings),
                      })}
                    </button>
                    {onReclassifyToExternal && (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={onReclassifyToExternal}
                        className="px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 transition-colors disabled:opacity-50"
                      >
                        {isInvestment
                          ? t('modals.allocation.moveToExistingPortfolio')
                          : t('modals.allocation.moveToExistingReserve')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="exec-btn-secondary">
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className={
                isFood
                  ? 'inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-bold shadow-sm transition-all disabled:opacity-50'
                  : isEmergency
                    ? 'exec-btn-primary'
                    : 'inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition-all disabled:opacity-50'
              }
            >
              {loading
                ? t('common.saving')
                : isFood
                  ? t('modals.allocation.submitFood')
                  : isEmergency
                    ? t('modals.allocation.submitEmergency')
                    : t('modals.allocation.submitInvestment')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AllocationModal;
