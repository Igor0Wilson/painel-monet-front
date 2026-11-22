import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { IconType } from 'react-icons';
import {
  FaTimes,
  FaCreditCard,
  FaQrcode,
  FaUniversity,
  FaMoneyBillWave,
  FaCheckCircle,
} from 'react-icons/fa';
import api from '../api';
import { toast } from 'react-toastify';
import type { ExpenseItem } from '../types/finance';
import { extractApiErrorMessage } from '../utils/errorHandler';
import { formatCurrency, formatDateBr } from '../utils/formatters';

export interface CreditCardInvoiceGroup {
  month: string;
  label: string;
  shortLabel: string;
  total: number;
  items: ExpenseItem[];
  cardBank?: string | null;
  cardLast4?: string | null;
}

interface Props {
  invoice: CreditCardInvoiceGroup | null;
  onClose: () => void;
  onSuccess: () => void;
}

type CashMethod = 'pix' | 'debito' | 'dinheiro';

const PayCreditCardModal: React.FC<Props> = ({ invoice, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [paymentMethod, setPaymentMethod] = useState<CashMethod>('pix');
  const [loading, setLoading] = useState(false);

  if (!invoice) return null;

  const methods: { id: CashMethod; label: string; icon: IconType }[] = [
    { id: 'pix', label: t('paymentMethods.pix'), icon: FaQrcode },
    { id: 'debito', label: t('paymentMethods.debito'), icon: FaUniversity },
    { id: 'dinheiro', label: t('paymentMethods.dinheiro'), icon: FaMoneyBillWave },
  ];

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload: {
        month: string;
        paymentMethod: CashMethod;
        cardBank?: string;
        cardLast4?: string;
      } = {
        month: invoice.month,
        paymentMethod,
      };
      if (invoice.cardBank) payload.cardBank = invoice.cardBank;
      if (invoice.cardLast4) payload.cardLast4 = invoice.cardLast4;

      await api.post('/expenses/credit-card/pay-invoice', payload);
      toast.success(t('modals.payCard.paidToast'));
      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, t('modals.expense.validationError')));
    } finally {
      setLoading(false);
    }
  };

  const cardSubtitle =
    invoice.cardBank || invoice.cardLast4
      ? invoice.cardBank && invoice.cardLast4
        ? t('expenses.cardHeadingWithBank', { bank: invoice.cardBank, last4: invoice.cardLast4 })
        : invoice.cardLast4
          ? t('expenses.cardHeadingNoBank', { last4: invoice.cardLast4 })
          : invoice.cardBank
      : null;

  return (
    <div className="exec-modal-overlay z-50">
      <div className="exec-modal-container max-w-lg">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 flex items-center justify-center">
              {React.createElement(FaCreditCard as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {t('modals.payCard.title')} — {invoice.label}
                {cardSubtitle ? ` · ${cardSubtitle}` : ''}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('modals.payCard.openCount', { count: invoice.items.length })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg"
          >
            {React.createElement(FaTimes as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-6 space-y-5">
          {/* Resumo Total */}
          <div className="rounded-xl bg-slate-950 border border-slate-800 text-white px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                {t('modals.payCard.totalLabel')} ({invoice.items.length})
              </p>
              <p className="text-2xl font-semibold tabular-nums mt-0.5">
                {formatCurrency(invoice.total)}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 text-xs font-medium text-emerald-300">
              {invoice.shortLabel}
            </span>
          </div>

          {/* Lista de itens */}
          <div>
            <label className="exec-label">{t('modals.payCard.openCount', { count: invoice.items.length })}</label>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
              {invoice.items.map((item) => (
                <div
                  key={item.id}
                  className="px-3.5 py-2.5 flex items-center justify-between gap-3 bg-white dark:bg-slate-900 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {item.accountType?.name || t('paymentMethods.creditoFull')} ·{' '}
                      {formatDateBr(item.dueDate)}
                    </p>
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-white tabular-nums flex-shrink-0">
                    {formatCurrency(Number(item.value))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Forma de pagamento */}
          <div>
            <label className="exec-label">{t('modals.payCard.methodLabel')}</label>
            <div className="grid grid-cols-3 gap-2.5">
              {methods.map((m) => {
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`py-3 px-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                      isSelected
                        ? 'border-slate-900 dark:border-emerald-500 bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/70'
                    }`}
                  >
                    {React.createElement(m.icon as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
                    <span className="text-xs font-semibold">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="exec-btn-secondary">
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium shadow-sm hover:bg-emerald-700 transition-all disabled:opacity-50"
            >
              {React.createElement(FaCheckCircle as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
              <span>
                {loading
                  ? t('modals.payCard.paying')
                  : `${t('modals.payCard.confirmBtn')} (${formatCurrency(invoice.total)})`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PayCreditCardModal;
