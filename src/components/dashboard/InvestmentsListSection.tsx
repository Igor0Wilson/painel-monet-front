import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaCalendarAlt,
  FaChartLine,
  FaEdit,
  FaLock,
  FaPlus,
  FaSeedling,
  FaShieldAlt,
  FaTrash,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../../api';
import { usePrivacyMode } from '../../context/PrivacyModeContext';
import { BalanceData, InvestmentItem, MemberBreakdown } from '../../types/finance';
import { extractApiErrorMessage } from '../../utils/errorHandler';
import {
  formatCurrencyInput,
  formatDateBr,
  formatNumberToCurrencyInput,
  getCurrencyPlaceholder,
  getCurrentMonthKey,
  parseCurrencyInput,
  translateInvestmentCategory,
} from '../../utils/formatters';
import { getTodayLocalIso } from '../../utils/recurrence';

interface Props {
  items: InvestmentItem[];
  isFamilyMode: boolean;
  selectedMember?: MemberBreakdown | null;
  onAddInvestment: () => void;
  onEditInvestment: (item: InvestmentItem) => void;
  onDeleteInvestment: (id: string) => void;
  balance?: BalanceData;
  onRefresh?: () => void;
  onOpenEmergencyModal?: () => void;
}

const InvestmentsListSection: React.FC<Props> = ({
  items,
  isFamilyMode,
  selectedMember,
  onAddInvestment,
  onEditInvestment,
  onDeleteInvestment,
  balance,
  onRefresh,
  onOpenEmergencyModal,
}) => {
  const { t } = useTranslation();
  const { formatProtectedCurrency } = usePrivacyMode();
  const [sourceFilter, setSourceFilter] = useState<'all' | 'external' | 'balance'>('all');

  // Batch Yield Update state (QA #2)
  const [showYieldPanel, setShowYieldPanel] = useState(false);
  const [newBalancesMap, setNewBalancesMap] = useState<Record<string, string>>({});
  const [yieldMonth, setYieldMonth] = useState<string>(getCurrentMonthKey());
  const [yieldDate, setYieldDate] = useState<string>(getTodayLocalIso());
  const [savingBatchYield, setSavingBatchYield] = useState(false);

  // Emergency Reserve Yield state (QA #2)
  const [reserveMode, setReserveMode] = useState<'newTotal' | 'yieldAmount'>('newTotal');
  const [reserveAmountInput, setReserveAmountInput] = useState<string>('');
  const [reserveDate, setReserveDate] = useState<string>(getTodayLocalIso());
  const [reserveNote, setReserveNote] = useState<string>('');
  const [savingReserveYield, setSavingReserveYield] = useState(false);

  const ownItems = useMemo(
    () => items.filter((it) => it.isOwn !== false),
    [items],
  );

  useEffect(() => {
    const initial: Record<string, string> = {};
    ownItems.forEach((it) => {
      initial[it.id] = formatNumberToCurrencyInput(it.amount);
    });
    setNewBalancesMap(initial);
  }, [ownItems]);

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

  const pendingYieldUpdates = useMemo(() => {
    return ownItems
      .map((item) => {
        const raw = newBalancesMap[item.id] ?? '';
        const parsed = parseCurrencyInput(raw);
        const current = Number(item.amount || 0);
        if (Number.isNaN(parsed) || parsed < 0) return null;
        const delta = Number((parsed - current).toFixed(2));
        if (Math.abs(delta) < 0.01) return null;
        return {
          id: item.id,
          newAmount: Number(parsed.toFixed(2)),
          delta,
        };
      })
      .filter((x): x is { id: string; newAmount: number; delta: number } => Boolean(x));
  }, [ownItems, newBalancesMap]);

  const handleSaveBatchYields = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingYieldUpdates.length === 0) return;

    try {
      setSavingBatchYield(true);
      const res = await api.post<{ updatedCount: number; totalYieldDelta: number }>(
        '/balance/investments/batch-update-balances',
        {
          updates: pendingYieldUpdates.map(({ id, newAmount }) => ({ id, newAmount })),
          month: /^\d{4}-\d{2}$/.test(yieldMonth) ? yieldMonth : getCurrentMonthKey(),
          date: /^\d{4}-\d{2}-\d{2}$/.test(yieldDate) ? yieldDate : getTodayLocalIso(),
        },
      );
      toast.success(
        t('dashboard.investmentsYield.savedYieldsSuccess', {
          count: res.data?.updatedCount ?? pendingYieldUpdates.length,
          amount: formatProtectedCurrency(Number(res.data?.totalYieldDelta ?? 0)),
        }),
      );
      setShowYieldPanel(false);
      onRefresh?.();
    } catch (err: unknown) {
      toast.error(extractApiErrorMessage(err, t('modals.expense.validationError')));
    } finally {
      setSavingBatchYield(false);
    }
  };

  const handleApplyReserveYield = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseCurrencyInput(reserveAmountInput);
    if (Number.isNaN(parsed) || (reserveMode === 'newTotal' && parsed < 0)) {
      toast.error(t('modals.expense.validationError'));
      return;
    }

    try {
      setSavingReserveYield(true);
      const body: Record<string, unknown> = {
        month: getCurrentMonthKey(),
        date: /^\d{4}-\d{2}-\d{2}$/.test(reserveDate) ? reserveDate : getTodayLocalIso(),
        [reserveMode]: Number(parsed.toFixed(2)),
      };
      if (reserveNote.trim()) {
        body.note = reserveNote.trim().slice(0, 160);
      }

      await api.post('/balance/emergency-fund/yield', body);
      toast.success(t('dashboard.investmentsYield.reserveApplySuccess'));
      setReserveAmountInput('');
      setReserveNote('');
      onRefresh?.();
    } catch (err: unknown) {
      toast.error(extractApiErrorMessage(err, t('modals.expense.validationError')));
    } finally {
      setSavingReserveYield(false);
    }
  };

  const ownEmergencyTotal = Number(balance?.ownEmergencyFund ?? 0);
  const ownEmergencyYieldTotal = Number(balance?.ownEmergencyFundTotalYield ?? 0);
  const emergencyYieldHistory = balance?.ownEmergencyFundYieldHistory || [];

  return (
    <div className="space-y-6">
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
                  {formatProtectedCurrency(totalVisible)}
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

            {onRefresh && ownItems.length > 0 && (
              <button
                type="button"
                data-testid="toggle-batch-yield-btn"
                onClick={() => setShowYieldPanel((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 transition-colors"
              >
                {React.createElement(
                  FaChartLine as unknown as React.ComponentType<{ className?: string }>,
                  { className: 'text-[11px]' },
                )}
                <span>{t('dashboard.investmentsYield.batchTitle')}</span>
              </button>
            )}

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

        {/* Collapsible Batch Monthly Balances & Yields Form */}
        {showYieldPanel && onRefresh && ownItems.length > 0 && (
          <form
            onSubmit={handleSaveBatchYields}
            data-testid="investments-batch-yield-form"
            className="p-6 bg-emerald-50/40 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/50 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t('dashboard.investmentsYield.batchTitle')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('dashboard.investmentsYield.batchSubtitle')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={yieldMonth}
                  onChange={(e) => setYieldMonth(e.target.value)}
                  className="exec-input text-xs py-1.5"
                />
                <input
                  type="date"
                  value={yieldDate}
                  onChange={(e) => setYieldDate(e.target.value)}
                  className="exec-input text-xs py-1.5"
                />
              </div>
            </div>

            <div className="space-y-2">
              {ownItems.map((item) => {
                const current = Number(item.amount || 0);
                const rawVal = newBalancesMap[item.id] ?? '';
                const parsedNew = parseCurrencyInput(rawVal);
                const delta =
                  !Number.isNaN(parsedNew) && parsedNew >= 0
                    ? Number((parsedNew - current).toFixed(2))
                    : 0;
                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs"
                  >
                    <div className="sm:col-span-5 min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-slate-400 tabular-nums">
                        {t('dashboard.investmentsYield.currentValue')}:{' '}
                        {formatProtectedCurrency(current)}
                      </p>
                    </div>
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        inputMode="decimal"
                        data-testid={`yield-input-${item.id}`}
                        value={rawVal}
                        onChange={(e) =>
                          setNewBalancesMap((prev) => ({
                            ...prev,
                            [item.id]: formatCurrencyInput(e.target.value, prev[item.id] || ''),
                          }))
                        }
                        placeholder={getCurrencyPlaceholder()}
                        className="exec-input text-xs tabular-nums font-semibold"
                      />
                    </div>
                    <div className="sm:col-span-3 text-right tabular-nums font-semibold">
                      {Math.abs(delta) < 0.01 ? (
                        <span className="text-[11px] text-slate-400 font-normal">
                          {t('dashboard.investmentsYield.noChangeHint')}
                        </span>
                      ) : (
                        <span
                          className={
                            delta > 0
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }
                        >
                          {delta > 0 ? '+' : ''}
                          {formatProtectedCurrency(delta)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                data-testid="save-batch-yield-btn"
                disabled={savingBatchYield || pendingYieldUpdates.length === 0}
                className="exec-btn-primary px-4 py-2 text-xs disabled:opacity-50"
              >
                {savingBatchYield
                  ? t('dashboard.investmentsYield.savingYields')
                  : t('dashboard.investmentsYield.saveYieldsBtn')}
              </button>
            </div>
          </form>
        )}

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
            {visibleItems.map((item) => {
              const accumulatedYield = Number(item.yieldAmount || 0);
              return (
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
                      {Math.abs(accumulatedYield) >= 0.01 && (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold tabular-nums ${
                            accumulatedYield > 0
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60'
                          }`}
                        >
                          {t('dashboard.investmentsYield.accumulatedYield')}:{' '}
                          {accumulatedYield > 0 ? '+' : ''}
                          {formatProtectedCurrency(accumulatedYield)}
                        </span>
                      )}
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
                      {item.principalAmount !== undefined &&
                        Math.abs(item.principalAmount - item.amount) >= 0.01 && (
                          <span className="tabular-nums">
                            · {t('dashboard.investmentsYield.principalLabel')}:{' '}
                            {formatProtectedCurrency(item.principalAmount)}
                          </span>
                        )}
                      {item.notes && <span>· {item.notes}</span>}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                      {formatProtectedCurrency(item.amount)}
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
              );
            })}
          </div>
        )}
      </section>

      {/* Emergency Reserve Yield Card */}
      {balance && onRefresh && (
        <section
          data-testid="emergency-reserve-yield-card"
          className="exec-card p-6 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center justify-center">
                {React.createElement(
                  FaShieldAlt as unknown as React.ComponentType<{ className?: string }>,
                  { className: 'text-sm' },
                )}
              </span>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {t('dashboard.investmentsYield.reserveYieldTitle')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('dashboard.investmentsYield.reserveYieldSubtitle')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-left sm:text-right">
                <span className="text-xs text-slate-400 block">
                  {t('kpi.emergencyTitle')}
                </span>
                <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                  {formatProtectedCurrency(ownEmergencyTotal)}
                </span>
                {Math.abs(ownEmergencyYieldTotal) >= 0.01 && (
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 block tabular-nums">
                    {t('dashboard.investmentsYield.accumulatedYield')}:{' '}
                    {ownEmergencyYieldTotal > 0 ? '+' : ''}
                    {formatProtectedCurrency(ownEmergencyYieldTotal)}
                  </span>
                )}
              </div>
              {onOpenEmergencyModal && (
                <button
                  type="button"
                  onClick={onOpenEmergencyModal}
                  className="exec-btn-secondary px-3 py-2 text-xs"
                >
                  {t('kpi.emergencyBtn')}
                </button>
              )}
            </div>
          </div>

          <form
            onSubmit={handleApplyReserveYield}
            className="rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-3"
          >
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  {
                    id: 'newTotal' as const,
                    label: t('dashboard.investmentsYield.newTotalMode'),
                  },
                  {
                    id: 'yieldAmount' as const,
                    label: t('dashboard.investmentsYield.yieldAmountMode'),
                  },
                ]
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setReserveMode(m.id)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                    reserveMode === m.id
                      ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 border-slate-900 dark:border-emerald-500'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="exec-label">
                  {reserveMode === 'newTotal'
                    ? t('dashboard.investmentsYield.newTotalLabel')
                    : t('dashboard.investmentsYield.yieldAmountLabel')}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  data-testid="reserve-yield-amount-input"
                  value={reserveAmountInput}
                  onChange={(e) =>
                    setReserveAmountInput(
                      formatCurrencyInput(e.target.value, reserveAmountInput),
                    )
                  }
                  placeholder={getCurrencyPlaceholder()}
                  className="exec-input tabular-nums font-semibold"
                />
              </div>
              <div>
                <label className="exec-label">
                  {t('dashboard.investmentsYield.reserveDateLabel')}
                </label>
                <input
                  type="date"
                  value={reserveDate}
                  onChange={(e) => setReserveDate(e.target.value)}
                  className="exec-input"
                />
              </div>
              <div>
                <label className="exec-label">
                  {t('dashboard.investmentsYield.reserveNoteLabel')}
                </label>
                <input
                  type="text"
                  maxLength={160}
                  value={reserveNote}
                  onChange={(e) => setReserveNote(e.target.value)}
                  placeholder="CDI / Selic"
                  className="exec-input"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                data-testid="reserve-yield-submit-btn"
                disabled={savingReserveYield || !reserveAmountInput}
                className="exec-btn-primary px-4 py-2 text-xs disabled:opacity-50"
              >
                {savingReserveYield
                  ? t('dashboard.investmentsYield.savingYields')
                  : t('dashboard.investmentsYield.reserveApplyBtn')}
              </button>
            </div>
          </form>

          {emergencyYieldHistory.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('dashboard.investmentsYield.yieldHistoryTitle')}
              </p>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 max-h-44 overflow-y-auto">
                {[...emergencyYieldHistory].reverse().map((h) => (
                  <div
                    key={h.id}
                    className="px-4 py-2.5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatDateBr(h.date)}
                      </span>
                      {h.note && (
                        <span className="text-slate-400 ml-2">· {h.note}</span>
                      )}
                    </div>
                    <span
                      className={`font-bold tabular-nums ${
                        h.delta >= 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {h.delta >= 0 ? '+' : ''}
                      {formatProtectedCurrency(h.delta)} (→{' '}
                      {formatProtectedCurrency(h.newAmount)})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default InvestmentsListSection;
