import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaCheckCircle,
  FaCreditCard,
  FaEdit,
  FaFileInvoiceDollar,
  FaLink,
  FaTimes,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../../api';
import { usePrivacyMode } from '../../context/PrivacyModeContext';
import { ExpenseItem } from '../../types/finance';
import { getCategoryMeta, translateCategoryName } from '../../utils/categories';
import { extractApiErrorMessage } from '../../utils/errorHandler';
import {
  formatDateBr,
  formatExpenseDisplayName,
  formatMonthLabel,
  formatMonthShortLabel,
  normalizeCardLast4Input,
} from '../../utils/formatters';
import { compareIsoDates, getTodayLocalIso } from '../../utils/recurrence';
import { CreditCardInvoiceGroup } from '../PayCreditCardModal';
import StatusBadge from './StatusBadge';

interface Props {
  invoices: CreditCardInvoiceGroup[];
  activeInvoice: CreditCardInvoiceGroup | null;
  onSelectMonth: (month: string) => void;
  onPayInvoice: (invoice: CreditCardInvoiceGroup) => void;
  expenses?: ExpenseItem[];
  selectedMonth?: string;
  onPayExpense?: (expense: ExpenseItem) => void;
  onEditExpense?: (expense: ExpenseItem) => void;
  onGenerateCardInvoice?: (expenses: ExpenseItem[]) => void;
  onRefresh?: () => void;
}

function getCardKey(exp: ExpenseItem): string {
  const bank = (exp.cardBank || '').trim();
  const last4 = (exp.cardLast4 || '').trim();
  if (!bank && !last4) return '__unlinked__';
  return `${bank.toLowerCase()}::${last4}`;
}

const ALL_CARDS_KEY = '__all_cards__';
const ALL_MONTHS_KEY = '__all_months__';

const CreditCardInvoicePanel: React.FC<Props> = ({
  invoices,
  activeInvoice,
  onSelectMonth,
  onPayInvoice,
  expenses,
  selectedMonth,
  onPayExpense,
  onEditExpense,
  onGenerateCardInvoice,
  onRefresh,
}) => {
  const { t } = useTranslation();
  const { formatProtectedCurrency } = usePrivacyMode();

  const [statusTab, setStatusTab] = useState<'open' | 'paid'>('open');
  const [selectedCardKey, setSelectedCardKey] = useState<string>(ALL_CARDS_KEY);
  const [selectedViewMonth, setSelectedViewMonth] = useState<string>(
    selectedMonth || activeInvoice?.month || ALL_MONTHS_KEY,
  );
  const [linkingItem, setLinkingItem] = useState<ExpenseItem | null>(null);
  const [linkBank, setLinkBank] = useState('');
  const [linkLast4, setLinkLast4] = useState('');
  const [linkingBusy, setLinkingBusy] = useState(false);

  const sourceCreditItems = useMemo<ExpenseItem[]>(() => {
    if (expenses) {
      return expenses.filter(
        (exp) =>
          Boolean(exp.dueDate) &&
          (Boolean(exp.isCreditCard) || exp.paymentMethod === 'credito'),
      );
    }
    return invoices.flatMap((inv) => inv.items);
  }, [expenses, invoices]);

  const autoDebitReadyItems = useMemo(() => {
    if (!expenses) return [];
    return expenses.filter(
      (exp) =>
        !exp.isPaid &&
        !exp.isCreditCard &&
        exp.isOwn !== false &&
        (exp.isAutoDebit || Boolean(exp.cardBank) || Boolean(exp.cardLast4)),
    );
  }, [expenses]);

  const statusItems = useMemo(() => {
    return sourceCreditItems.filter((item) =>
      statusTab === 'open' ? !item.isPaid : Boolean(item.isPaid),
    );
  }, [sourceCreditItems, statusTab]);

  const cardBuckets = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        cardBank: string | null;
        cardLast4: string | null;
        label: string;
        items: ExpenseItem[];
        total: number;
      }
    >();

    statusItems.forEach((item) => {
      const key = getCardKey(item);
      const bank = (item.cardBank || '').trim() || null;
      const last4 = (item.cardLast4 || '').trim() || null;
      if (!map.has(key)) {
        const label =
          bank && last4
            ? t('expenses.cardLast4Label', { bank, last4 })
            : last4
              ? t('expenses.cardHeadingNoBank', { last4 })
              : bank || t('dashboard.cardInvoices.unlinkedCard');
        map.set(key, {
          key,
          cardBank: bank,
          cardLast4: last4,
          label,
          items: [],
          total: 0,
        });
      }
      const bucket = map.get(key)!;
      bucket.items.push(item);
      bucket.total = Number((bucket.total + Number(item.value || 0)).toFixed(2));
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.key === '__unlinked__') return 1;
      if (b.key === '__unlinked__') return -1;
      return b.total - a.total;
    });
  }, [statusItems, t]);

  useEffect(() => {
    if (
      selectedCardKey !== ALL_CARDS_KEY &&
      !cardBuckets.some((b) => b.key === selectedCardKey)
    ) {
      setSelectedCardKey(ALL_CARDS_KEY);
    }
  }, [cardBuckets, selectedCardKey]);

  const cardFilteredItems = useMemo(() => {
    if (selectedCardKey === ALL_CARDS_KEY) return statusItems;
    return statusItems.filter((item) => getCardKey(item) === selectedCardKey);
  }, [statusItems, selectedCardKey]);

  const monthGroups = useMemo(() => {
    const map = new Map<string, ExpenseItem[]>();
    cardFilteredItems.forEach((item) => {
      const m = String(item.dueDate).slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(m)) return;
      if (!map.has(m)) map.set(m, []);
      map.get(m)!.push(item);
    });

    return Array.from(map.entries())
      .sort(([a], [b]) => (statusTab === 'paid' ? b.localeCompare(a) : a.localeCompare(b)))
      .map(([month, items]) => {
        const sorted = [...items].sort((a, b) =>
          compareIsoDates(a.dueDate, b.dueDate),
        );
        const total = Number(
          sorted.reduce((sum, i) => sum + Number(i.value || 0), 0).toFixed(2),
        );
        const [yearStr] = month.split('-');
        return {
          month,
          label: formatMonthLabel(month),
          shortLabel: `${formatMonthShortLabel(month)}/${yearStr}`,
          total,
          items: sorted,
        };
      });
  }, [cardFilteredItems, statusTab]);

  useEffect(() => {
    if (monthGroups.length === 0) {
      setSelectedViewMonth(ALL_MONTHS_KEY);
      return;
    }
    if (
      selectedViewMonth !== ALL_MONTHS_KEY &&
      !monthGroups.some((g) => g.month === selectedViewMonth)
    ) {
      const currentMonth = getTodayLocalIso().slice(0, 7);
      const preferred =
        monthGroups.find((g) => g.month >= currentMonth) || monthGroups[0];
      setSelectedViewMonth(preferred.month);
    }
  }, [monthGroups, selectedViewMonth]);

  const displayedItems = useMemo(() => {
    if (selectedViewMonth === ALL_MONTHS_KEY) {
      return [...cardFilteredItems].sort((a, b) =>
        compareIsoDates(a.dueDate, b.dueDate),
      );
    }
    return monthGroups.find((g) => g.month === selectedViewMonth)?.items || [];
  }, [cardFilteredItems, monthGroups, selectedViewMonth]);

  const displayedTotal = useMemo(
    () =>
      Number(
        displayedItems.reduce((sum, i) => sum + Number(i.value || 0), 0).toFixed(2),
      ),
    [displayedItems],
  );

  const activeMonthMeta = useMemo(() => {
    if (selectedViewMonth === ALL_MONTHS_KEY) return null;
    return monthGroups.find((g) => g.month === selectedViewMonth) || null;
  }, [monthGroups, selectedViewMonth]);

  const savedCardOptions = useMemo(() => {
    const map = new Map<string, { cardBank: string; cardLast4: string }>();
    sourceCreditItems.forEach((item) => {
      const bank = (item.cardBank || '').trim();
      const last4 = (item.cardLast4 || '').trim();
      if (!bank && !last4) return;
      const key = `${bank.toLowerCase()}::${last4}`;
      if (!map.has(key)) {
        map.set(key, { cardBank: bank, cardLast4: last4 });
      }
    });
    return Array.from(map.values());
  }, [sourceCreditItems]);

  const handleOpenLinkCard = (item: ExpenseItem) => {
    setLinkingItem(item);
    setLinkBank(item.cardBank || '');
    setLinkLast4(item.cardLast4 || '');
  };

  const handleSaveLinkCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingItem) return;
    const cleanBank = linkBank.trim();
    const cleanLast4 = normalizeCardLast4Input(linkLast4);
    if (!cleanBank && cleanLast4.length !== 4) {
      toast.error(t('modals.expense.cardLast4InvalidError'));
      return;
    }
    if (cleanLast4.length > 0 && cleanLast4.length !== 4) {
      toast.error(t('modals.expense.cardLast4InvalidError'));
      return;
    }
    try {
      setLinkingBusy(true);
      await api.patch(`/expenses/${linkingItem.id}`, {
        cardBank: cleanBank || undefined,
        cardLast4: cleanLast4 || undefined,
        editScope: linkingItem.isInstallment ? 'all_installments' : undefined,
      });
      toast.success(t('modals.expense.updatedToast'));
      setLinkingItem(null);
      onRefresh?.();
    } catch (err: unknown) {
      toast.error(extractApiErrorMessage(err, t('modals.expense.validationError')));
    } finally {
      setLinkingBusy(false);
    }
  };

  if (!expenses && !activeInvoice && invoices.length === 0) return null;

  const activeCardMeta =
    selectedCardKey === ALL_CARDS_KEY
      ? null
      : cardBuckets.find((b) => b.key === selectedCardKey) || null;

  const invoicePayloadForActiveView: CreditCardInvoiceGroup | null =
    statusTab === 'open' && displayedItems.length > 0
      ? {
          month: activeMonthMeta?.month || selectedViewMonth,
          label:
            activeMonthMeta?.label ||
            (activeCardMeta?.label || t('dashboard.cardInvoices.allCards')),
          shortLabel:
            activeMonthMeta?.shortLabel ||
            (activeCardMeta?.label || t('dashboard.cardInvoices.allCards')),
          total: displayedTotal,
          items: displayedItems.filter((i) => !i.isPaid && i.isOwn !== false),
          cardBank: activeCardMeta?.cardBank || null,
          cardLast4: activeCardMeta?.cardLast4 || null,
        }
      : null;

  return (
    <section
      data-testid="credit-card-invoice-panel"
      className="exec-card overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 bg-slate-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
            {React.createElement(
              FaCreditCard as unknown as React.ComponentType<{ className?: string }>,
              { className: 'text-base' },
            )}
          </span>
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-white">
              {t('dashboard.cardInvoices.title')}
            </h2>
            <p className="text-[11px] text-slate-400">
              {t('dashboard.cardInvoices.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl bg-white/10 p-1">
            <button
              type="button"
              data-testid="card-invoices-tab-open"
              onClick={() => setStatusTab('open')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusTab === 'open'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {t('dashboard.cardInvoices.openTab')}
            </button>
            <button
              type="button"
              data-testid="card-invoices-tab-paid"
              onClick={() => setStatusTab('paid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusTab === 'paid'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {t('dashboard.cardInvoices.paidTab')}
            </button>
          </div>

          <div className="text-left md:text-right pl-1">
            <span className="text-[11px] text-slate-400 block">
              {statusTab === 'open'
                ? t('dashboard.cardInvoices.totalPending')
                : t('dashboard.cardInvoices.totalPaid')}
            </span>
            <span className="text-lg font-semibold tabular-nums text-white">
              {formatProtectedCurrency(displayedTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Auto-debit ready for statement banner */}
      {statusTab === 'open' &&
        onGenerateCardInvoice &&
        autoDebitReadyItems.length > 0 && (
          <div className="px-6 py-3 bg-sky-50/80 dark:bg-sky-950/30 border-b border-sky-100 dark:border-sky-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <p className="text-xs font-medium text-sky-900 dark:text-sky-200">
              {t('dashboard.cardInvoices.autoDebitReadyHint')} (
              <strong className="tabular-nums">{autoDebitReadyItems.length}</strong>)
            </p>
            <button
              type="button"
              onClick={() => onGenerateCardInvoice(autoDebitReadyItems)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold transition-colors self-start sm:self-center"
            >
              {React.createElement(
                FaFileInvoiceDollar as unknown as React.ComponentType<{ className?: string }>,
                { className: 'text-[11px]' },
              )}
              <span>{t('dashboard.cardInvoices.generateAutoDebitBtn')}</span>
            </button>
          </div>
        )}

      {/* Card Filter Tabs */}
      {cardBuckets.length > 0 && (
        <div className="px-6 py-3 bg-slate-50/90 dark:bg-slate-900/70 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedCardKey(ALL_CARDS_KEY)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all flex items-center gap-2 ${
              selectedCardKey === ALL_CARDS_KEY
                ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 border-slate-900 dark:border-emerald-500 shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <span>{t('dashboard.cardInvoices.allCards')}</span>
            <span className="text-[11px] opacity-80 tabular-nums">
              {formatProtectedCurrency(
                statusItems.reduce((s, i) => s + Number(i.value || 0), 0),
              )}
            </span>
          </button>

          {cardBuckets.map((bucket) => {
            const isSelected = selectedCardKey === bucket.key;
            return (
              <button
                key={bucket.key}
                type="button"
                data-testid={`card-tab-${bucket.cardLast4 || bucket.key}`}
                onClick={() => setSelectedCardKey(bucket.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 border-slate-900 dark:border-emerald-500 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <span>{bucket.label}</span>
                <span
                  className={`text-[11px] tabular-nums ${
                    isSelected
                      ? 'text-emerald-300 dark:text-slate-950'
                      : 'text-slate-400'
                  }`}
                >
                  {formatProtectedCurrency(bucket.total)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Month Filter Pills */}
      {monthGroups.length > 0 && (
        <div className="px-6 py-3 bg-white dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedViewMonth(ALL_MONTHS_KEY)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all ${
              selectedViewMonth === ALL_MONTHS_KEY
                ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 border-slate-900 dark:border-emerald-500 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            {t('dashboard.cardInvoices.allMonths')}
          </button>

          {monthGroups.map((inv) => {
            const isSelected = inv.month === selectedViewMonth;
            return (
              <button
                key={inv.month}
                type="button"
                data-testid={`card-month-pill-${inv.month}`}
                onClick={() => {
                  setSelectedViewMonth(inv.month);
                  onSelectMonth(inv.month);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 border-slate-900 dark:border-emerald-500 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <span>{inv.shortLabel}</span>
                <span
                  className={`tabular-nums text-[11px] ${
                    isSelected
                      ? 'text-emerald-300 dark:text-slate-950'
                      : 'text-slate-400'
                  }`}
                >
                  {formatProtectedCurrency(inv.total)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Inline Card Link Editor */}
      {linkingItem && (
        <form
          onSubmit={handleSaveLinkCard}
          className="px-6 py-4 bg-emerald-50/80 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-800/60 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                {t('dashboard.cardInvoices.linkCardTitle')}:{' '}
                {formatExpenseDisplayName(linkingItem.name, t)}
              </p>
              {linkingItem.isInstallment && (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  {t('dashboard.scopeEdit.allInstallmentsDesc')}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setLinkingItem(null)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-white dark:hover:bg-slate-800"
            >
              {React.createElement(
                FaTimes as unknown as React.ComponentType<{ className?: string }>,
                { className: 'text-xs' },
              )}
            </button>
          </div>

          {savedCardOptions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {savedCardOptions.map((c) => (
                <button
                  key={`${c.cardBank}::${c.cardLast4}`}
                  type="button"
                  onClick={() => {
                    setLinkBank(c.cardBank);
                    setLinkLast4(c.cardLast4);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-500"
                >
                  {[c.cardBank, c.cardLast4 ? `•••• ${c.cardLast4}` : '']
                    .filter(Boolean)
                    .join(' ')}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={linkBank}
              onChange={(e) => setLinkBank(e.target.value)}
              placeholder={t('dashboard.cardInvoices.cardBankLabel')}
              className="exec-input flex-1 text-xs"
            />
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={linkLast4}
              onChange={(e) => setLinkLast4(normalizeCardLast4Input(e.target.value))}
              placeholder={t('dashboard.cardInvoices.cardLast4Label')}
              className="exec-input sm:w-36 text-xs tabular-nums"
            />
            <button
              type="submit"
              disabled={linkingBusy}
              className="exec-btn-primary px-4 py-2 text-xs whitespace-nowrap"
            >
              {t('dashboard.cardInvoices.saveLinkBtn')}
            </button>
          </div>
        </form>
      )}

      {/* Items List */}
      <div className="px-6 py-4 space-y-4">
        {displayedItems.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">
            {statusTab === 'open'
              ? t('dashboard.cardInvoices.emptyOpen')
              : t('dashboard.cardInvoices.emptyPaid')}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30">
            {displayedItems.map((item) => {
              const catMeta = getCategoryMeta(item.accountType?.name);
              const isUnlinked = !item.cardBank && !item.cardLast4;
              return (
                <div
                  key={item.id}
                  data-testid={`card-invoice-item-${item.id}`}
                  className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-white/70 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {formatExpenseDisplayName(item.name, t)}
                      </p>
                      <StatusBadge
                        status={item.status}
                        paymentMethod={item.paymentMethod}
                        isPartiallyPaid={item.isPartiallyPaid}
                      />
                      {item.isInstallment && item.installmentNumber && item.installmentCount && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                          {t('dashboard.cardInvoices.installmentBadge', {
                            current: item.installmentNumber,
                            total: item.installmentCount,
                          })}
                        </span>
                      )}
                      {(item.cardBank || item.cardLast4) ? (
                        <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                          {item.cardLast4
                            ? t('expenses.cardLast4Label', {
                                bank: item.cardBank || t('paymentMethods.credito'),
                                last4: item.cardLast4,
                              })
                            : item.cardBank}
                        </span>
                      ) : (
                        onRefresh && (
                          <button
                            type="button"
                            onClick={() => handleOpenLinkCard(item)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-[10px] font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition-colors"
                          >
                            {React.createElement(
                              FaLink as unknown as React.ComponentType<{ className?: string }>,
                              { className: 'text-[9px]' },
                            )}
                            <span>{t('dashboard.cardInvoices.linkCardBtn')}</span>
                          </button>
                        )
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {t('dashboard.cardInvoices.dueOn', {
                          date: formatDateBr(item.dueDate),
                        })}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${catMeta.bgClass} ${catMeta.textClass} ${catMeta.borderClass}`}
                      >
                        {translateCategoryName(catMeta.name)}
                      </span>
                      {item.isPaid && item.paidAt && (
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                          {t('expenses.paidOnDate', {
                            date: formatDateBr(item.paidAt),
                          })}
                        </span>
                      )}
                      {isUnlinked && !onRefresh && (
                        <span className="text-amber-600 dark:text-amber-400">
                          {t('dashboard.cardInvoices.unlinkedCard')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2.5 flex-shrink-0">
                    <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatProtectedCurrency(Number(item.value || 0))}
                    </span>

                    {!item.isPaid && item.isOwn !== false && onPayExpense && (
                      <button
                        type="button"
                        onClick={() => onPayExpense(item)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors"
                      >
                        {t('expenses.payBtn')}
                      </button>
                    )}

                    {item.isOwn !== false && onEditExpense && (
                      <button
                        type="button"
                        onClick={() => onEditExpense(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title={t('common.edit')}
                      >
                        {React.createElement(
                          FaEdit as unknown as React.ComponentType<{ className?: string }>,
                          { className: 'text-xs' },
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Action */}
        {invoicePayloadForActiveView && invoicePayloadForActiveView.items.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('dashboard.cardInvoices.itemsCount', {
                count: invoicePayloadForActiveView.items.length,
              })}{' '}
              ·{' '}
              <strong className="text-slate-700 dark:text-slate-200">
                {invoicePayloadForActiveView.label}
              </strong>
            </p>
            <button
              type="button"
              onClick={() => onPayInvoice(invoicePayloadForActiveView)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              {React.createElement(
                FaCheckCircle as unknown as React.ComponentType<{ className?: string }>,
                { className: 'text-xs' },
              )}
              <span>
                {t('creditCard.payInvoiceBtn', {
                  amount: formatProtectedCurrency(invoicePayloadForActiveView.total),
                })}
              </span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default CreditCardInvoicePanel;
