import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaCalendarAlt,
  FaEdit,
  FaPlus,
  FaSeedling,
  FaTimes,
  FaTrash,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../../api';
import type { InvestmentItem, InvestmentSource } from '../../types/finance';
import { extractApiErrorMessage } from '../../utils/errorHandler';
import {
  formatCurrency,
  formatCurrencyInput,
  formatDateBr,
  formatNumberToCurrencyInput,
  parseCurrencyInput,
} from '../../utils/formatters';

interface Props {
  isOpen: boolean;
  items: InvestmentItem[];
  ownAvailableBalance: number;
  allocatedInvestments: number;
  externalInvestments: number;
  initialEditItem?: InvestmentItem | null;
  onClose: () => void;
  onRefresh: () => void;
}

const INVESTMENT_CATEGORIES = [
  'Renda Fixa',
  'Tesouro Direto',
  'Ações / FIIs',
  'Fundos',
  'Cripto',
  'Previdência',
  'Outros',
];

function getTodayIso(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const InvestmentsModal: React.FC<Props> = ({
  isOpen,
  items,
  ownAvailableBalance,
  allocatedInvestments,
  externalInvestments,
  initialEditItem,
  onClose,
  onRefresh,
}) => {
  const { t } = useTranslation();
  const [editingItem, setEditingItem] = useState<InvestmentItem | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Renda Fixa');
  const [amountInput, setAmountInput] = useState('');
  const [investedDate, setInvestedDate] = useState(getTodayIso());
  const [source, setSource] = useState<InvestmentSource>('external');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = (item?: InvestmentItem | null) => {
    if (item) {
      setEditingItem(item);
      setName(item.name);
      setCategory(item.category || 'Renda Fixa');
      setAmountInput(formatNumberToCurrencyInput(item.amount));
      setInvestedDate(
        item.investedDate ? String(item.investedDate).split('T')[0] : getTodayIso(),
      );
      setSource(item.source || 'external');
      setNotes(item.notes || '');
    } else {
      setEditingItem(null);
      setName('');
      setCategory('Renda Fixa');
      setAmountInput('');
      setInvestedDate(getTodayIso());
      setSource('external');
      setNotes('');
    }
  };

  useEffect(() => {
    if (isOpen) {
      resetForm(initialEditItem || null);
    }
  }, [isOpen, initialEditItem]);

  if (!isOpen) return null;

  const ownItems = items.filter((it) => it.isOwn !== false);
  const totalPortfolio = Number((allocatedInvestments + externalInvestments).toFixed(2));
  const parsedAmount = parseCurrencyInput(amountInput);

  const oldBalanceImpact =
    editingItem && editingItem.source === 'balance' ? Number(editingItem.amount) : 0;
  const newBalanceImpact = source === 'balance' ? parsedAmount : 0;
  const deltaOnBalance = Number((newBalanceImpact - oldBalanceImpact).toFixed(2));
  const projectedBalance = Number((ownAvailableBalance - deltaOnBalance).toFixed(2));

  const translateInvCategory = (cat: string) =>
    t(`modals.investments.categories.${cat}`, { defaultValue: cat });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t('modals.investments.nameRequiredError'));
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error(t('modals.investments.amountInvalidError'));
      return;
    }
    if (!investedDate) {
      toast.error(t('modals.investments.dateRequiredError'));
      return;
    }
    if (deltaOnBalance > ownAvailableBalance + 0.001) {
      toast.error(t('modals.investments.insufficientBalanceError'));
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: name.trim(),
        category,
        amount: Number(parsedAmount.toFixed(2)),
        investedDate,
        source,
        notes: notes.trim() || undefined,
      };

      if (editingItem) {
        await api.patch(`/balance/investments/items/${editingItem.id}`, payload);
        toast.success(t('modals.investments.updatedToast'));
      } else {
        await api.post('/balance/investments/items', payload);
        toast.success(t('modals.investments.createdToast'));
      }
      resetForm(null);
      onRefresh();
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, t('modals.investments.saveError')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      setSubmitting(true);
      await api.delete(`/balance/investments/items/${id}`);
      if (editingItem?.id === id) {
        resetForm(null);
      }
      toast.success(t('modals.investments.deletedToast'));
      onRefresh();
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, t('modals.investments.deleteError')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReclassifyAll = async () => {
    try {
      setSubmitting(true);
      await api.post('/balance/investments', {
        amount: 0,
        reclassifyAllocatedToExternal: true,
      });
      toast.success(t('modals.investments.reclassifySuccessToast'));
      onRefresh();
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, t('modals.investments.reclassifyError')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="exec-modal-overlay z-[60]">
      <div className="exec-modal-container max-w-3xl max-h-[92dvh] flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              {React.createElement(
                FaSeedling as unknown as React.ComponentType<{ className?: string }>,
                { className: 'text-sm' },
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {t('modals.investments.title')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('modals.investments.subtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={t('common.close')}
          >
            {React.createElement(
              FaTimes as unknown as React.ComponentType<{ className?: string }>,
              { className: 'text-sm' },
            )}
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Resumo da Carteira */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-950 dark:bg-slate-800 border border-transparent dark:border-slate-700 text-white p-3.5">
              <p className="text-[11px] text-slate-400">
                {t('modals.investments.totalPortfolioLabel')}
              </p>
              <p className="text-lg font-semibold tabular-nums mt-0.5">
                {formatCurrency(totalPortfolio)}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/70 p-3.5">
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                {t('modals.investments.existingPortfolioLabel')}
              </p>
              <p className="text-lg font-semibold text-emerald-950 dark:text-emerald-200 tabular-nums mt-0.5">
                {formatCurrency(externalInvestments)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-3.5">
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                {t('modals.investments.monthlyAllocatedLabel')}
              </p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">
                {formatCurrency(allocatedInvestments)}
              </p>
            </div>
          </div>

          {allocatedInvestments > 0 && (
            <button
              type="button"
              disabled={submitting}
              onClick={handleReclassifyAll}
              className="w-full text-left text-xs font-semibold text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/60 border border-amber-200 dark:border-amber-800/70 rounded-xl px-4 py-2.5 transition-colors disabled:opacity-50"
            >
              {t('modals.investments.reclassifyAllBtn', {
                amount: formatCurrency(allocatedInvestments),
              })}
            </button>
          )}

          {/* Formulário */}
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-4 sm:p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                {React.createElement(
                  (editingItem ? FaEdit : FaPlus) as unknown as React.ComponentType<{
                    className?: string;
                  }>,
                  { className: 'text-[11px] text-emerald-600 dark:text-emerald-400' },
                )}
                {editingItem
                  ? t('modals.investments.editSectionTitle')
                  : t('modals.investments.newSectionTitle')}
              </h4>
              {editingItem && (
                <button
                  type="button"
                  onClick={() => resetForm(null)}
                  className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 underline"
                >
                  {t('modals.investments.cancelEditBtn')}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="exec-label">{t('modals.investments.nameLabel')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="exec-input"
                  placeholder={t('modals.investments.namePlaceholder')}
                />
              </div>

              <div>
                <label className="exec-label">{t('modals.investments.categoryLabel')}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="exec-input"
                >
                  {INVESTMENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {translateInvCategory(cat)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="exec-label">{t('modals.investments.amountLabel')}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amountInput}
                  onChange={(e) => setAmountInput(formatCurrencyInput(e.target.value, amountInput))}
                  className="exec-input tabular-nums font-semibold"
                  placeholder="0,00"
                />
              </div>

              <div>
                <label className="exec-label flex items-center gap-1.5">
                  {React.createElement(
                    FaCalendarAlt as unknown as React.ComponentType<{ className?: string }>,
                    { className: 'text-[10px] text-slate-400 dark:text-slate-500' },
                  )}
                  {t('modals.investments.dateLabel')}
                </label>
                <input
                  type="date"
                  value={investedDate}
                  onChange={(e) => setInvestedDate(e.target.value)}
                  className="exec-input"
                  required
                />
              </div>

              <div>
                <label className="exec-label">{t('modals.investments.notesLabel')}</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="exec-input"
                  placeholder={t('modals.investments.notesPlaceholder')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="exec-label">{t('modals.investments.sourceLabel')}</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSource('external')}
                  className={`p-3 rounded-xl border text-left transition-all ${source === 'external'
                      ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                >
                  <p className="text-xs font-semibold">
                    {t('modals.investments.sourceExternalTitle')}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('modals.investments.sourceExternalSub')}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setSource('balance')}
                  className={`p-3 rounded-xl border text-left transition-all ${source === 'balance'
                      ? 'border-slate-900 dark:border-slate-100 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                >
                  <p className="text-xs font-semibold">
                    {t('modals.investments.sourceBalanceTitle')}
                  </p>
                  <p
                    className={`text-[11px] mt-0.5 ${source === 'balance'
                        ? 'text-slate-300 dark:text-slate-600'
                        : 'text-slate-500 dark:text-slate-400'
                      }`}
                  >
                    {t('modals.investments.sourceBalanceSub', {
                      current: formatCurrency(ownAvailableBalance),
                      after: formatCurrency(projectedBalance),
                    })}
                  </p>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                {submitting
                  ? t('modals.investments.saving')
                  : editingItem
                    ? t('modals.investments.saveEditBtn')
                    : t('modals.investments.saveNewBtn')}
              </button>
            </div>
          </form>

          {/* Histórico Detalhado */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {t('modals.investments.listTitle', { count: ownItems.length })}
            </h4>

            {ownItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                {t('modals.investments.emptyList')}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
                {ownItems.map((item) => (
                  <div
                    key={item.id}
                    className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {item.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {translateInvCategory(item.category)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${item.source === 'balance'
                              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950'
                              : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/70'
                            }`}
                        >
                          {item.source === 'balance'
                            ? t('modals.investments.badgeMonthly')
                            : t('modals.investments.badgeExternal')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span className="inline-flex items-center gap-1">
                          {React.createElement(
                            FaCalendarAlt as unknown as React.ComponentType<{
                              className?: string;
                            }>,
                            { className: 'text-[10px]' },
                          )}
                          {t('modals.investments.datePrefix', {
                            date: formatDateBr(item.investedDate),
                          })}
                        </span>
                        {item.notes && <span className="truncate">· {item.notes}</span>}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                        {formatCurrency(item.amount)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => resetForm(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title={t('modals.investments.editItemTitle')}
                        >
                          {React.createElement(
                            FaEdit as unknown as React.ComponentType<{ className?: string }>,
                            { className: 'text-xs' },
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                          title={t('modals.investments.deleteItemTitle')}
                        >
                          {React.createElement(
                            FaTrash as unknown as React.ComponentType<{ className?: string }>,
                            { className: 'text-xs' },
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end flex-shrink-0">
          <button type="button" onClick={onClose} className="exec-btn-secondary">
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvestmentsModal;
