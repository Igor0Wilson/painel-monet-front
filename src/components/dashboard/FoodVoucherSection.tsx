import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaBalanceScale,
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaHamburger,
  FaPlus,
  FaTrash,
  FaUtensils,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../../api';
import { usePrivacyMode } from '../../context/PrivacyModeContext';
import { BalanceData, ExpenseItem, FoodBenefitConfig } from '../../types/finance';
import { extractApiErrorMessage } from '../../utils/errorHandler';
import {
  formatCurrencyInput,
  formatDateBr,
  formatMonthLabel,
  formatNumberToCurrencyInput,
  getCurrencyPlaceholder,
  getCurrentMonthKey,
  parseCurrencyInput,
  shiftMonthKey,
} from '../../utils/formatters';
import { getMonthKeyFromIso, getTodayLocalIso } from '../../utils/recurrence';

interface Props {
  balance: BalanceData;
  expenses: ExpenseItem[];
  onRefresh: () => void;
  selectedMonth?: string;
  onSelectMonth?: (month: string) => void;
}

interface BenefitFormState {
  enabled: boolean;
  amount: string;
  creditDate: string;
  isRecurring: boolean;
  mode: 'fixed' | 'variable';
}

interface BatchExpenseRow {
  key: string;
  name: string;
  amount: string;
  date: string;
  paymentMethod: 'va' | 'vr';
}

function buildBenefitState(
  config: FoodBenefitConfig | null | undefined,
  fallbackAmount: number,
  fallbackDate: string,
): BenefitFormState {
  return {
    enabled: config ? Boolean(config.enabled) : fallbackAmount > 0,
    amount:
      config && config.amount > 0
        ? formatNumberToCurrencyInput(config.amount)
        : fallbackAmount > 0
          ? formatNumberToCurrencyInput(fallbackAmount)
          : '',
    creditDate: config?.creditDate || fallbackDate,
    isRecurring: config ? Boolean(config.isRecurring) : true,
    mode: config?.mode || 'fixed',
  };
}

function createBatchRow(defaultDate: string, method: 'va' | 'vr' = 'vr'): BatchExpenseRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    amount: '',
    date: defaultDate,
    paymentMethod: method,
  };
}

const FoodVoucherSection: React.FC<Props> = ({
  balance,
  expenses,
  onRefresh,
  selectedMonth,
  onSelectMonth,
}) => {
  const { t } = useTranslation();
  const { formatProtectedCurrency } = usePrivacyMode();

  const todayIso = getTodayLocalIso();
  const [localMonth, setLocalMonth] = useState<string>(
    selectedMonth || getCurrentMonthKey(),
  );
  const activeMonth = selectedMonth || localMonth;
  const setActiveMonth = (m: string) => {
    setLocalMonth(m);
    onSelectMonth?.(m);
  };

  const [vaForm, setVaForm] = useState<BenefitFormState>(() =>
    buildBenefitState(
      balance.ownVaConfig,
      Number(balance.ownVaTotal || balance.ownFoodAllowanceConfigured || 0),
      balance.ownFoodAllowanceDate || todayIso,
    ),
  );
  const [vrForm, setVrForm] = useState<BenefitFormState>(() =>
    buildBenefitState(
      balance.ownVrConfig,
      Number(balance.ownVrTotal || 0),
      balance.ownFoodAllowanceDate || todayIso,
    ),
  );
  const [configScope, setConfigScope] = useState<'only_month' | 'from_month' | 'all'>('from_month');
  const [savingBenefit, setSavingBenefit] = useState<'va' | 'vr' | null>(null);

  const [batchRows, setBatchRows] = useState<BatchExpenseRow[]>([
    createBatchRow(todayIso, 'vr'),
    createBatchRow(todayIso, 'va'),
  ]);
  const [savingBatch, setSavingBatch] = useState(false);

  const [closingBenefit, setClosingBenefit] = useState<'total' | 'va' | 'vr'>('total');
  const [closingRemainingInput, setClosingRemainingInput] = useState<string>('');
  const [closingDate, setClosingDate] = useState<string>(todayIso);
  const [closingNote, setClosingNote] = useState<string>('');
  const [closingBusy, setClosingBusy] = useState(false);

  useEffect(() => {
    setVaForm(
      buildBenefitState(
        balance.ownVaConfig,
        Number(balance.ownVaTotal || balance.ownFoodAllowanceConfigured || 0),
        balance.ownFoodAllowanceDate || todayIso,
      ),
    );
    setVrForm(
      buildBenefitState(
        balance.ownVrConfig,
        Number(balance.ownVrTotal || 0),
        balance.ownFoodAllowanceDate || todayIso,
      ),
    );
  }, [
    balance.ownVaConfig,
    balance.ownVrConfig,
    balance.ownVaTotal,
    balance.ownVrTotal,
    balance.ownFoodAllowanceConfigured,
    balance.ownFoodAllowanceDate,
    todayIso,
  ]);

  const vaRemaining = Number(balance.ownVaRemaining ?? 0);
  const vrRemaining = Number(balance.ownVrRemaining ?? 0);
  const totalAvailable = Number(balance.ownFoodAllowance ?? 0);

  const validBatchItems = useMemo(() => {
    return batchRows
      .map((row) => ({
        row,
        parsedAmount: parseCurrencyInput(row.amount),
      }))
      .filter(
        ({ row, parsedAmount }) =>
          row.name.trim().length > 0 &&
          !Number.isNaN(parsedAmount) &&
          parsedAmount > 0 &&
          /^\d{4}-\d{2}-\d{2}$/.test(row.date),
      );
  }, [batchRows]);

  const batchTotals = useMemo(() => {
    let va = 0;
    let vr = 0;
    validBatchItems.forEach(({ row, parsedAmount }) => {
      if (row.paymentMethod === 'va') va += parsedAmount;
      else vr += parsedAmount;
    });
    return {
      va: Number(va.toFixed(2)),
      vr: Number(vr.toFixed(2)),
      all: Number((va + vr).toFixed(2)),
    };
  }, [validBatchItems]);

  const monthFoodEntries = useMemo(() => {
    return expenses
      .filter((exp) => {
        if (exp.isOwn === false) return false;
        const isVoucher =
          exp.paymentMethod === 'va' ||
          exp.paymentMethod === 'vr' ||
          (exp.payments || []).some(
            (p) => p.paymentMethod === 'va' || p.paymentMethod === 'vr',
          );
        if (!isVoucher) return false;
        const mKey = getMonthKeyFromIso(exp.paidAt || exp.dueDate);
        return mKey === activeMonth;
      })
      .sort((a, b) =>
        String(b.paidAt || b.dueDate).localeCompare(String(a.paidAt || a.dueDate)),
      );
  }, [expenses, activeMonth]);

  const handleSaveBenefit = async (kind: 'va' | 'vr') => {
    const form = kind === 'va' ? vaForm : vrForm;
    const parsedAmount = form.enabled ? parseCurrencyInput(form.amount) : 0;
    if (form.enabled && (Number.isNaN(parsedAmount) || parsedAmount < 0)) {
      toast.error(t('modals.expense.validationError'));
      return;
    }

    const dtoPayload = {
      enabled: form.enabled,
      amount: Number(Math.max(0, parsedAmount || 0).toFixed(2)),
      creditDate: /^\d{4}-\d{2}-\d{2}$/.test(form.creditDate)
        ? form.creditDate
        : todayIso,
      isRecurring: form.isRecurring,
      mode: form.mode,
    };

    try {
      setSavingBenefit(kind);
      await api.post('/balance/food-allowance', {
        editScope: configScope,
        targetMonth: activeMonth,
        [kind]: dtoPayload,
      });
      toast.success(t('dashboard.foodSection.savedConfigSuccess'));
      onRefresh();
    } catch (err: unknown) {
      toast.error(extractApiErrorMessage(err, t('modals.expense.validationError')));
    } finally {
      setSavingBenefit(null);
    }
  };

  const handleSubmitBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validBatchItems.length === 0) {
      toast.error(t('modals.expense.validationError'));
      return;
    }

    try {
      setSavingBatch(true);
      await api.post('/expenses/food-allowance/batch', {
        items: validBatchItems.map(({ row, parsedAmount }) => ({
          name: row.name.trim().slice(0, 120),
          amount: Number(parsedAmount.toFixed(2)),
          date: row.date,
          paymentMethod: row.paymentMethod,
        })),
      });
      toast.success(t('dashboard.foodSection.savedBatchSuccess'));
      setBatchRows([createBatchRow(todayIso, 'vr'), createBatchRow(todayIso, 'va')]);
      onRefresh();
    } catch (err: unknown) {
      toast.error(extractApiErrorMessage(err, t('modals.expense.validationError')));
    } finally {
      setSavingBatch(false);
    }
  };

  const handleCloseMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedRemaining = parseCurrencyInput(closingRemainingInput);
    if (Number.isNaN(parsedRemaining) || parsedRemaining < 0) {
      toast.error(t('modals.expense.validationError'));
      return;
    }

    try {
      setClosingBusy(true);
      const body: Record<string, unknown> = {
        month: activeMonth,
        benefit: closingBenefit,
        actualRemaining: Number(parsedRemaining.toFixed(2)),
        closingDate: /^\d{4}-\d{2}-\d{2}$/.test(closingDate)
          ? closingDate
          : todayIso,
      };
      if (closingNote.trim()) {
        body.note = closingNote.trim().slice(0, 140);
      }

      const res = await api.post<{ adjusted?: boolean; diff?: number }>(
        '/balance/food-allowance/close-month',
        body,
      );
      if (res.data?.adjusted) {
        toast.success(
          t('dashboard.foodSection.closeSuccessAdjusted', {
            amount: formatProtectedCurrency(Math.abs(Number(res.data.diff || 0))),
          }),
        );
      } else {
        toast.success(t('dashboard.foodSection.closeSuccessMatched'));
      }
      setClosingRemainingInput('');
      setClosingNote('');
      onRefresh();
    } catch (err: unknown) {
      toast.error(extractApiErrorMessage(err, t('modals.expense.validationError')));
    } finally {
      setClosingBusy(false);
    }
  };

  return (
    <div data-testid="food-voucher-section" className="space-y-6">
      {/* Header & Overview Strip */}
      <section className="exec-card p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
              {React.createElement(
                FaUtensils as unknown as React.ComponentType<{ className?: string }>,
                { className: 'text-sm' },
              )}
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {t('dashboard.foodSection.title')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('dashboard.foodSection.subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start md:self-center">
            <button
              type="button"
              onClick={() => setActiveMonth(shiftMonthKey(activeMonth, -1))}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
            >
              {React.createElement(
                FaChevronLeft as unknown as React.ComponentType<{ className?: string }>,
                { className: 'text-[10px]' },
              )}
            </button>
            <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 min-w-[130px] text-center">
              {formatMonthLabel(activeMonth)}
            </span>
            <button
              type="button"
              onClick={() => setActiveMonth(shiftMonthKey(activeMonth, 1))}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
            >
              {React.createElement(
                FaChevronRight as unknown as React.ComponentType<{ className?: string }>,
                { className: 'text-[10px]' },
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-amber-200/80 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 p-4">
            <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 block">
              {t('dashboard.foodSection.vaRemaining')}
            </span>
            <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums mt-1 block">
              {formatProtectedCurrency(vaRemaining)}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              {t('dashboard.foodSection.vaUsed')}:{' '}
              {formatProtectedCurrency(Number(balance.ownVaUsed || 0))}
            </span>
          </div>

          <div className="rounded-xl border border-teal-200/80 dark:border-teal-800/60 bg-teal-50/50 dark:bg-teal-950/20 p-4">
            <span className="text-[11px] font-semibold text-teal-800 dark:text-teal-300 block">
              {t('dashboard.foodSection.vrRemaining')}
            </span>
            <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums mt-1 block">
              {formatProtectedCurrency(vrRemaining)}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              {t('dashboard.foodSection.vrUsed')}:{' '}
              {formatProtectedCurrency(Number(balance.ownVrUsed || 0))}
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block">
              {t('dashboard.foodSection.totalAvailable')}
            </span>
            <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums mt-1 block">
              {formatProtectedCurrency(totalAvailable)}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              {t('kpi.foodTotalCredited')}:{' '}
              {formatProtectedCurrency(Number(balance.ownFoodAllowanceTotal || 0))}
            </span>
          </div>
        </div>
      </section>

      {/* VA & VR Configs + Edit Scope */}
      <section className="exec-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            {t('dashboard.foodSection.editScopeHint')}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                {
                  id: 'only_month' as const,
                  label: t('dashboard.scopeEdit.onlyMonth', {
                    month: formatMonthLabel(activeMonth),
                  }),
                },
                {
                  id: 'from_month' as const,
                  label: t('dashboard.scopeEdit.fromMonth', {
                    month: formatMonthLabel(activeMonth),
                  }),
                },
                { id: 'all' as const, label: t('dashboard.scopeEdit.all') },
              ]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setConfigScope(opt.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                  configScope === opt.id
                    ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 border-slate-900 dark:border-emerald-500'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(
            [
              {
                kind: 'va' as const,
                title: t('dashboard.foodSection.vaTitle'),
                icon: FaUtensils,
                form: vaForm,
                setForm: setVaForm,
              },
              {
                kind: 'vr' as const,
                title: t('dashboard.foodSection.vrTitle'),
                icon: FaHamburger,
                form: vrForm,
                setForm: setVrForm,
              },
            ]
          ).map(({ kind, title, icon, form, setForm }) => (
            <div
              key={kind}
              className="rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {React.createElement(
                    icon as unknown as React.ComponentType<{ className?: string }>,
                    { className: 'text-sm text-amber-600 dark:text-amber-400' },
                  )}
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {title}
                  </h3>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, enabled: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                  />
                  <span>{t('dashboard.foodSection.enabledLabel')}</span>
                </label>
              </div>

              {form.enabled && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { id: 'fixed' as const, label: t('dashboard.foodSection.fixedMode') },
                        { id: 'variable' as const, label: t('dashboard.foodSection.variableMode') },
                      ]
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, mode: m.id }))}
                        className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                          form.mode === m.id
                            ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 border-slate-900 dark:border-emerald-500'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="exec-label">
                        {t('dashboard.foodSection.amountLabel')}
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        data-testid={`food-${kind}-amount-input`}
                        value={form.amount}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            amount: formatCurrencyInput(e.target.value, prev.amount),
                          }))
                        }
                        placeholder={getCurrencyPlaceholder()}
                        className="exec-input tabular-nums font-semibold"
                      />
                    </div>
                    <div>
                      <label className="exec-label">
                        {t('dashboard.foodSection.creditDateLabel')}
                      </label>
                      <input
                        type="date"
                        value={form.creditDate}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, creditDate: e.target.value }))
                        }
                        className="exec-input"
                      />
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.isRecurring}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, isRecurring: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                    />
                    <span>{t('dashboard.foodSection.recurringLabel')}</span>
                  </label>
                </>
              )}

              <button
                type="button"
                data-testid={`food-save-${kind}-btn`}
                disabled={savingBenefit === kind}
                onClick={() => handleSaveBenefit(kind)}
                className="exec-btn-primary w-full py-2 text-xs"
              >
                {savingBenefit === kind
                  ? t('dashboard.foodSection.savingConfig')
                  : t('dashboard.foodSection.saveConfigBtn')}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Batch Multi-Day VA/VR Entry + Month Closing */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSubmitBatch}
          className="lg:col-span-7 exec-card p-6 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {t('dashboard.foodSection.batchTitle')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('dashboard.foodSection.batchSubtitle')}
              </p>
            </div>
            <button
              type="button"
              data-testid="food-add-batch-row-btn"
              onClick={() => setBatchRows((prev) => [...prev, createBatchRow(todayIso, 'vr')])}
              className="exec-btn-secondary px-3 py-1.5 text-xs gap-1.5 self-start sm:self-center"
            >
              {React.createElement(
                FaPlus as unknown as React.ComponentType<{ className?: string }>,
                { className: 'text-[10px]' },
              )}
              <span>{t('dashboard.foodSection.addRowBtn')}</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {batchRows.map((row, idx) => (
              <div
                key={row.key}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40"
              >
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    maxLength={120}
                    data-testid={`food-batch-name-${idx}`}
                    value={row.name}
                    onChange={(e) =>
                      setBatchRows((prev) =>
                        prev.map((r) => (r.key === row.key ? { ...r, name: e.target.value } : r)),
                      )
                    }
                    placeholder={t('dashboard.foodSection.rowDescPlaceholder')}
                    className="exec-input text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    data-testid={`food-batch-amount-${idx}`}
                    value={row.amount}
                    onChange={(e) =>
                      setBatchRows((prev) =>
                        prev.map((r) =>
                          r.key === row.key
                            ? { ...r, amount: formatCurrencyInput(e.target.value, r.amount) }
                            : r,
                        ),
                      )
                    }
                    placeholder={t('dashboard.foodSection.rowAmountPlaceholder')}
                    className="exec-input text-xs tabular-nums font-semibold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <select
                    value={row.paymentMethod}
                    data-testid={`food-batch-method-${idx}`}
                    onChange={(e) =>
                      setBatchRows((prev) =>
                        prev.map((r) =>
                          r.key === row.key
                            ? { ...r, paymentMethod: e.target.value === 'va' ? 'va' : 'vr' }
                            : r,
                        ),
                      )
                    }
                    className="exec-input text-xs font-semibold"
                  >
                    <option value="vr">VR</option>
                    <option value="va">VA</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <input
                    type="date"
                    value={row.date}
                    onChange={(e) =>
                      setBatchRows((prev) =>
                        prev.map((r) => (r.key === row.key ? { ...r, date: e.target.value } : r)),
                      )
                    }
                    className="exec-input text-xs"
                  />
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  {batchRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setBatchRows((prev) => prev.filter((r) => r.key !== row.key))
                      }
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      title={t('dashboard.foodSection.removeRowBtn')}
                    >
                      {React.createElement(
                        FaTrash as unknown as React.ComponentType<{ className?: string }>,
                        { className: 'text-xs' },
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="space-y-0.5">
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                {t('dashboard.foodSection.projectedRemaining')}:
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                VA: {formatProtectedCurrency(Math.max(0, vaRemaining - batchTotals.va))} · VR:{' '}
                {formatProtectedCurrency(Math.max(0, vrRemaining - batchTotals.vr))}
              </p>
            </div>
            <button
              type="submit"
              data-testid="food-submit-batch-btn"
              disabled={savingBatch || validBatchItems.length === 0}
              className="exec-btn-primary px-4 py-2 text-xs disabled:opacity-50"
            >
              {savingBatch
                ? t('dashboard.foodSection.savingBatch')
                : t('dashboard.foodSection.saveBatchBtn', { count: validBatchItems.length })}
            </button>
          </div>
        </form>

        {/* Quick Month Closing + Live Month Entries */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={handleCloseMonth} className="exec-card p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                {React.createElement(
                  FaBalanceScale as unknown as React.ComponentType<{ className?: string }>,
                  { className: 'text-xs' },
                )}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t('dashboard.foodSection.closeMonthTitle')}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('dashboard.foodSection.closeMonthSubtitle')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'total' as const, label: 'VA + VR' },
                  { id: 'va' as const, label: 'VA' },
                  { id: 'vr' as const, label: 'VR' },
                ]
              ).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setClosingBenefit(b.id)}
                  className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    closingBenefit === b.id
                      ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 border-slate-900 dark:border-emerald-500'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="exec-label">
                  {t('dashboard.foodSection.actualRemainingLabel')}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  data-testid="food-close-remaining-input"
                  value={closingRemainingInput}
                  onChange={(e) =>
                    setClosingRemainingInput(
                      formatCurrencyInput(e.target.value, closingRemainingInput),
                    )
                  }
                  placeholder={getCurrencyPlaceholder()}
                  className="exec-input tabular-nums font-semibold"
                />
              </div>
              <div>
                <label className="exec-label">
                  {t('dashboard.foodSection.closingDateLabel')}
                </label>
                <input
                  type="date"
                  value={closingDate}
                  onChange={(e) => setClosingDate(e.target.value)}
                  className="exec-input"
                />
              </div>
            </div>

            <div>
              <label className="exec-label">
                {t('dashboard.foodSection.closingNoteLabel')}
              </label>
              <input
                type="text"
                maxLength={140}
                value={closingNote}
                onChange={(e) => setClosingNote(e.target.value)}
                placeholder={t('dashboard.foodSection.rowDescPlaceholder')}
                className="exec-input text-xs"
              />
            </div>

            <button
              type="submit"
              data-testid="food-close-month-btn"
              disabled={closingBusy || !closingRemainingInput}
              className="exec-btn-primary w-full py-2.5 text-xs gap-2 disabled:opacity-50"
            >
              {React.createElement(
                FaCheckCircle as unknown as React.ComponentType<{ className?: string }>,
                { className: 'text-xs' },
              )}
              <span>
                {closingBusy
                  ? t('dashboard.foodSection.closingMonth')
                  : t('dashboard.foodSection.closeMonthBtn')}
              </span>
            </button>
          </form>

          {/* Month Food Entries */}
          <section className="exec-card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {t('dashboard.foodSection.monthEntriesTitle')} — {formatMonthLabel(activeMonth)}
              </h3>
              <span className="text-xs font-semibold text-slate-400 tabular-nums">
                {monthFoodEntries.length}
              </span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
              {monthFoodEntries.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  {t('dashboard.foodSection.noMonthEntries')}
                </div>
              ) : (
                monthFoodEntries.map((item) => (
                  <div
                    key={item.id}
                    className="px-5 py-3 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        {React.createElement(
                          FaCalendarAlt as unknown as React.ComponentType<{ className?: string }>,
                          { className: 'text-[10px]' },
                        )}
                        <span>{formatDateBr(item.paidAt || item.dueDate)}</span>
                        {item.paymentMethod && (
                          <span className="uppercase font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {item.paymentMethod}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums flex-shrink-0">
                      {formatProtectedCurrency(Number(item.paidAmount || item.value || 0))}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default FoodVoucherSection;
