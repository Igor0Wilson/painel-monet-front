import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheckCircle, FaCreditCard } from 'react-icons/fa';
import { usePrivacyMode } from '../../context/PrivacyModeContext';
import { CreditCardInvoiceGroup } from '../PayCreditCardModal';
import { translateCategoryName } from '../../utils/categories';
import {
  formatDateBr,
  formatExpenseDisplayName,
} from '../../utils/formatters';

interface Props {
  invoices: CreditCardInvoiceGroup[];
  activeInvoice: CreditCardInvoiceGroup | null;
  onSelectMonth: (month: string) => void;
  onPayInvoice: (invoice: CreditCardInvoiceGroup) => void;
}

const CreditCardInvoicePanel: React.FC<Props> = ({
  invoices,
  activeInvoice,
  onSelectMonth,
  onPayInvoice,
}) => {
  const { t } = useTranslation();
  const { formatProtectedCurrency } = usePrivacyMode();
  if (!activeInvoice) return null;

  const cardBuckets = (() => {
    const map = new Map<
      string,
      {
        cardBank: string | null;
        cardLast4: string | null;
        items: typeof activeInvoice.items;
        total: number;
      }
    >();
    activeInvoice.items.forEach((item) => {
      const bank = (item.cardBank || '').trim() || null;
      const last4 = (item.cardLast4 || '').trim() || null;
      if (!bank && !last4) return;
      const key = `${(bank || '').toLowerCase()}::${last4 || ''}`;
      if (!map.has(key)) {
        map.set(key, { cardBank: bank, cardLast4: last4, items: [], total: 0 });
      }
      const b = map.get(key)!;
      b.items.push(item);
      b.total = Number((b.total + Number(item.value)).toFixed(2));
    });
    return Array.from(map.values());
  })();

  return (
    <section className="exec-card overflow-hidden">
      <div className="px-6 py-4 bg-slate-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
            {React.createElement(FaCreditCard as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
          </span>
          <div>
            <h2 className="text-sm font-semibold text-white">{t('creditCard.title')}</h2>
            <p className="text-[11px] text-slate-400">
              {t('creditCard.subtitle', { count: activeInvoice.items.length })}
            </p>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <span className="text-[11px] text-slate-400 block">
            {t('common.total')} {activeInvoice.shortLabel}
          </span>
          <span className="text-lg font-semibold tabular-nums text-white">
            {formatProtectedCurrency(activeInvoice.total)}
          </span>
        </div>
      </div>

      <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
        {invoices.map((inv) => {
          const isSelected = inv.month === activeInvoice.month;
          return (
            <button
              key={inv.month}
              type="button"
              onClick={() => onSelectMonth(inv.month)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all flex items-center gap-2 ${isSelected
                ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 border-slate-900 dark:border-emerald-500 shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <span>{inv.shortLabel}</span>
              <span
                className={`tabular-nums text-[11px] ${isSelected ? 'text-emerald-300 dark:text-slate-900' : 'text-slate-400'
                  }`}
              >
                {formatProtectedCurrency(inv.total)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="px-6 py-4 space-y-3">
        <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          {activeInvoice.items.map((item) => (
            <div
              key={item.id}
              className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="font-medium text-slate-800 dark:text-slate-100 truncate">
                    {formatExpenseDisplayName(item.name, t)}
                  </p>
                  {(item.cardBank || item.cardLast4) && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                      {item.cardLast4
                        ? t('expenses.cardLast4Label', {
                            bank: item.cardBank || t('paymentMethods.credito'),
                            last4: item.cardLast4,
                          })
                        : item.cardBank}
                    </span>
                  )}
                  {item.isAutoDebit && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                      {t('expenses.autoDebitBadge')}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  {item.accountType?.name
                    ? translateCategoryName(item.accountType.name)
                    : t('paymentMethods.creditoFull')}{' '}
                  · {formatDateBr(item.dueDate)}
                </p>
              </div>
              <span className="font-semibold text-slate-900 dark:text-white tabular-nums flex-shrink-0">
                {formatProtectedCurrency(Number(item.value))}
              </span>
            </div>
          ))}
        </div>

        {cardBuckets.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {cardBuckets.map((bucket) => {
              const bucketLabel =
                bucket.cardBank && bucket.cardLast4
                  ? t('expenses.cardLast4Label', {
                      bank: bucket.cardBank,
                      last4: bucket.cardLast4,
                    })
                  : bucket.cardLast4
                    ? t('expenses.cardHeadingNoBank', { last4: bucket.cardLast4 })
                    : bucket.cardBank!;
              return (
                <div
                  key={`${bucket.cardBank || ''}-${bucket.cardLast4 || ''}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {bucketLabel}
                  </span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {formatProtectedCurrency(bucket.total)}
                  </span>
                  {cardBuckets.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        onPayInvoice({
                          ...activeInvoice,
                          cardBank: bucket.cardBank,
                          cardLast4: bucket.cardLast4,
                          items: bucket.items,
                          total: bucket.total,
                        })
                      }
                      className="ml-1 px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors"
                    >
                      {t('expenses.payBtn')}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('creditCard.subtitle', { count: activeInvoice.items.length })} ·{' '}
            <strong className="text-slate-700 dark:text-slate-200">{activeInvoice.label}</strong>
          </p>
          <button
            type="button"
            onClick={() => onPayInvoice(activeInvoice)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            {React.createElement(FaCheckCircle as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
            <span>{t('creditCard.payInvoiceBtn', { amount: formatProtectedCurrency(activeInvoice.total) })}</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default CreditCardInvoicePanel;
