import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { IconType } from 'react-icons';
import {
  FaTimes,
  FaCreditCard,
  FaMoneyBillWave,
  FaQrcode,
  FaUniversity,
  FaCheckCircle,
  FaCalendarAlt,
  FaUtensils,
  FaHamburger,
} from 'react-icons/fa';
import api from '../api';
import { toast } from 'react-toastify';
import type { ExpenseItem } from '../types/finance';
import { isFoodCategory } from '../utils/categories';
import { extractApiErrorMessage } from '../utils/errorHandler';
import { formatCurrency, formatDateBr } from '../utils/formatters';

export type PaymentMethod = 'dinheiro' | 'pix' | 'debito' | 'credito' | 'va' | 'vr';

interface Props {
  expense: ExpenseItem | null;
  batchExpenses?: ExpenseItem[];
  onClose: () => void;
  onSuccess: () => void;
}

function getNextMonthIso(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const yyyy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, '0');
  const dd = String(next.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const QUICK_INSTALLMENTS = [1, 2, 3, 6, 10, 12];

const PayExpenseModal: React.FC<Props> = ({
  expense,
  batchExpenses = [],
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [installments, setInstallments] = useState<string>('1');
  const [firstInstallmentDate, setFirstInstallmentDate] = useState<string>(getNextMonthIso());
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const targetExpenses = batchExpenses.length > 0 ? batchExpenses : expense ? [expense] : [];
  const isBatch = batchExpenses.length > 0;
  const targetKey = targetExpenses.map((e) => e.id).join(',');

  useEffect(() => {
    if (targetKey) {
      setPaymentMethod('pix');
      setInstallments('1');
      setFirstInstallmentDate(getNextMonthIso());
      setErrorMsg('');
    }
  }, [targetKey]);

  if (targetExpenses.length === 0) return null;

  const numericValue = targetExpenses.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const parsedInstallments = parseInt(installments, 10);
  const validInstallments = !isNaN(parsedInstallments) && parsedInstallments >= 1 ? parsedInstallments : 1;
  const perInstallment = numericValue / validInstallments;

  const showFoodVoucherOptions = targetExpenses.every((item) =>
    isFoodCategory(item.accountType?.name, item.name),
  );

  const methods: {
    id: PaymentMethod;
    label: string;
    subtitle: string;
    icon: IconType;
  }[] = [
    {
      id: 'pix',
      label: t('paymentMethods.pix'),
      subtitle: 'Pix',
      icon: FaQrcode,
    },
    {
      id: 'debito',
      label: t('paymentMethods.debito'),
      subtitle: t('paymentMethods.debitoFull'),
      icon: FaUniversity,
    },
    {
      id: 'dinheiro',
      label: t('paymentMethods.dinheiro'),
      subtitle: t('paymentMethods.dinheiro'),
      icon: FaMoneyBillWave,
    },
    {
      id: 'credito',
      label: t('paymentMethods.credito'),
      subtitle: t('paymentMethods.creditoFull'),
      icon: FaCreditCard,
    },
    ...(showFoodVoucherOptions
      ? [
          {
            id: 'va' as PaymentMethod,
            label: t('paymentMethods.vaFull'),
            subtitle: t('modals.payExpense.vrAvailableHint'),
            icon: FaUtensils,
          },
          {
            id: 'vr' as PaymentMethod,
            label: t('paymentMethods.vrFull'),
            subtitle: t('modals.payExpense.vrAvailableHint'),
            icon: FaHamburger,
          },
        ]
      : []),
  ];

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (paymentMethod === 'credito') {
      if (isNaN(parsedInstallments) || parsedInstallments < 1 || parsedInstallments > 60) {
        setErrorMsg(t('modals.payExpense.installmentsLabel'));
        return;
      }
      if (!firstInstallmentDate) {
        setErrorMsg(t('modals.payExpense.firstDueLabel'));
        return;
      }
    }

    try {
      setLoading(true);
      const payload: {
        paymentMethod: PaymentMethod;
        installments?: number;
        firstInstallmentDate?: string;
      } = { paymentMethod };
      if (paymentMethod === 'credito') {
        payload.installments = parsedInstallments;
        payload.firstInstallmentDate = firstInstallmentDate;
      }

      if (isBatch) {
        await api.post('/expenses/pay-batch', {
          expenseIds: targetExpenses.map((item) => item.id),
          ...payload,
        });
      } else {
        await api.patch(`/expenses/${targetExpenses[0].id}/pay`, payload);
      }

      toast.success(
        isBatch
          ? t('modals.payExpense.paidBatchToast', { count: targetExpenses.length })
          : t('modals.payExpense.paidSingleToast'),
      );

      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, t('modals.expense.validationError')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="exec-modal-overlay z-50">
      <div className="exec-modal-container max-w-lg">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/60 flex items-center justify-center">
              {React.createElement(FaCheckCircle as unknown as React.ComponentType<{ className?: string }>, { className: 'text-base' })}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {isBatch ? t('modals.payExpense.batchTitle') : t('modals.payExpense.singleTitle')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isBatch
                  ? targetExpenses.length === 1
                    ? t('modals.payExpense.batchSubtitleSingle')
                    : t('modals.payExpense.batchSubtitle', { count: targetExpenses.length })
                  : t('modals.payExpense.singleSubtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors p-2 rounded-lg"
          >
            {React.createElement(FaTimes as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-6 space-y-5">
          {/* Expense Summary */}
          {isBatch ? (
            <div className="space-y-2.5">
              <div className="rounded-xl bg-slate-950 dark:bg-slate-950/90 border border-slate-800 text-white px-4 py-3.5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                    {t('modals.payExpense.batchTotalLabel', { count: targetExpenses.length })}
                  </p>
                  <p className="text-xl font-semibold tabular-nums mt-0.5">
                    {formatCurrency(numericValue)}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-white/10 text-xs font-semibold text-emerald-300">
                  {t('modals.payExpense.batchBadge')}
                </span>
              </div>
              <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                {targetExpenses.map((item) => (
                  <div
                    key={item.id}
                    className="px-3.5 py-2 flex items-center justify-between gap-2 text-xs bg-white dark:bg-slate-900"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-slate-400">{formatDateBr(item.dueDate)}</p>
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white tabular-nums flex-shrink-0">
                      {formatCurrency(Number(item.value))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 px-4 py-3.5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('modals.payExpense.selectedExpenseLabel')}
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {targetExpenses[0].name}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('modals.payExpense.amountToPay')}
                </p>
                <p className="text-base font-semibold text-slate-900 dark:text-white tabular-nums">
                  {formatCurrency(numericValue)}
                </p>
              </div>
            </div>
          )}

          {/* Payment Method Grid */}
          <div>
            <label className="exec-label">{t('modals.payExpense.methodLabel')}</label>
            <div className="grid grid-cols-2 gap-2.5">
              {methods.map((m) => {
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(m.id);
                      setErrorMsg('');
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'border-slate-900 dark:border-emerald-500 bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/70'
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'bg-white/15 text-white dark:text-slate-950'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {React.createElement(m.icon as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight">{m.label}</p>
                      <p
                        className={`text-[11px] mt-0.5 ${
                          isSelected ? 'text-slate-300 dark:text-slate-800' : 'text-slate-400'
                        }`}
                      >
                        {m.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Credit Card Details */}
          {paymentMethod === 'credito' ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-4 space-y-4">
              <div className="flex items-center gap-2">
                {React.createElement(FaCreditCard as unknown as React.ComponentType<{ className?: string }>, {
                  className: 'text-xs text-slate-700 dark:text-slate-300',
                })}
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                  {t('paymentMethods.creditoFull')}
                </h4>
              </div>

              <div>
                <label className="exec-label">{t('modals.payExpense.installmentsLabel')}</label>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {QUICK_INSTALLMENTS.map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setInstallments(String(qty))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        parsedInstallments === qty
                          ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 border-slate-900 dark:border-emerald-500'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                      }`}
                    >
                      {qty}x
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  className="exec-input tabular-nums font-semibold"
                  placeholder="Ex: 3"
                />
              </div>

              <div>
                <label className="exec-label flex items-center gap-1.5">
                  {React.createElement(FaCalendarAlt as unknown as React.ComponentType<{ className?: string }>, {
                    className: 'text-[10px] text-slate-400',
                  })}
                  {t('modals.payExpense.firstDueLabel')}
                </label>
                <input
                  type="date"
                  value={firstInstallmentDate}
                  onChange={(e) => setFirstInstallmentDate(e.target.value)}
                  className="exec-input"
                />
              </div>

              {/* Preview Box */}
              <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 space-y-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                  {t('paymentMethods.creditoFull')}:{' '}
                  <span className="tabular-nums text-emerald-700 dark:text-emerald-400">
                    {validInstallments}x {formatCurrency(perInstallment)}
                  </span>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {formatDateBr(firstInstallmentDate)}
                </p>
              </div>
            </div>
          ) : null}

          {errorMsg && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{errorMsg}</p>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="exec-btn-secondary">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={loading} className="exec-btn-primary">
              {loading
                ? t('common.processing')
                : paymentMethod === 'credito'
                  ? t('modals.payExpense.confirmCreditBtn', { count: validInstallments })
                  : t('modals.payExpense.confirmSingleBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PayExpenseModal;
