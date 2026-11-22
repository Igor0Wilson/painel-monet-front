import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaTimes,
  FaWallet,
  FaPlus,
  FaTrash,
  FaLayerGroup,
  FaCalendarAlt,
} from 'react-icons/fa';
import api from '../api';
import { toast } from 'react-toastify';
import type { IncomeItem } from '../types/finance';
import { extractApiErrorMessage } from '../utils/errorHandler';
import {
  formatCurrency,
  formatCurrencyInput,
  formatNumberToCurrencyInput,
  getCurrencyPlaceholder,
  parseCurrencyInput,
} from '../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<IncomeItem> | null;
}

interface IncomeEntry {
  key: string;
  name: string;
  value: string;
  incomeDate: string;
  isRecurring: boolean;
}

interface EntryErrors {
  name?: string;
  value?: string;
  incomeDate?: string;
}

function getDateForDay(day: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const clampedDay = Math.min(day, lastDay);
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(clampedDay).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function getTodayIso(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const createBlankEntry = (label = '', defaultDate = getTodayIso(), recurring = true): IncomeEntry => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: label,
  value: '',
  incomeDate: defaultDate,
  isRecurring: recurring,
});

const IncomeModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, initialData }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [hasMultipleSalaries, setHasMultipleSalaries] = useState(false);
  const [entries, setEntries] = useState<IncomeEntry[]>([createBlankEntry('', getTodayIso(), false)]);
  const [errors, setErrors] = useState<Record<string, EntryErrors>>({});

  useEffect(() => {
    if (!isOpen) return;

    setErrors({});
    if (initialData) {
      setHasMultipleSalaries(false);
      setEntries([
        {
          key: 'edit-entry',
          name: initialData.name || '',
          value: formatNumberToCurrencyInput(initialData.value),
          incomeDate: initialData.incomeDate
            ? String(initialData.incomeDate).split('T')[0]
            : getTodayIso(),
          isRecurring: Boolean(initialData.isRecurring),
        },
      ]);
    } else {
      setHasMultipleSalaries(false);
      setEntries([createBlankEntry('', getTodayIso(), true)]);
    }
  }, [isOpen, initialData]);

  const applyBiweeklyPreset = () => {
    setErrors({});
    setEntries([
      createBlankEntry(t('modals.income.presetAdvanceName'), getDateForDay(20), true),
      createBlankEntry(t('modals.income.presetMainSalaryName'), getDateForDay(5), true),
    ]);
  };

  const applyTwoSalariesPreset = () => {
    setErrors({});
    setEntries([
      createBlankEntry(t('modals.income.presetSalaryN', { index: 1 }), getDateForDay(5), true),
      createBlankEntry(t('modals.income.presetSalaryN', { index: 2 }), getDateForDay(15), true),
    ]);
  };

  const handleModeChange = (multiple: boolean) => {
    setHasMultipleSalaries(multiple);
    setErrors({});
    if (multiple) {
      if (entries.length < 2) {
        const first = entries[0];
        const hasCustomFirst = first && (first.name.trim() || first.value.trim());
        if (hasCustomFirst) {
          setEntries([
            { ...first, isRecurring: true },
            createBlankEntry(t('modals.income.presetAdvanceName'), getDateForDay(20), true),
          ]);
        } else {
          applyBiweeklyPreset();
        }
      }
    } else {
      setEntries((prev) => [prev[0] || createBlankEntry('', getTodayIso(), true)]);
    }
  };

  const updateEntry = (key: string, field: keyof IncomeEntry, value: string | boolean) => {
    setEntries((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        if (field === 'value' && typeof value === 'string') {
          return { ...item, value: formatCurrencyInput(value, item.value) };
        }
        return { ...item, [field]: value };
      }),
    );
    setErrors((prev) => {
      if (!prev[key]?.[field as keyof EntryErrors]) return prev;
      return {
        ...prev,
        [key]: { ...prev[key], [field]: undefined },
      };
    });
  };

  const addEntry = () => {
    if (entries.length >= 6) {
      toast.info(t('modals.income.maxEntriesInfo'));
      return;
    }
    setEntries((prev) => [
      ...prev,
      createBlankEntry(
        t('modals.income.extraEntryName', { index: prev.length + 1 }),
        getTodayIso(),
        true,
      ),
    ]);
  };

  const removeEntry = (key: string) => {
    if (entries.length <= 2) return;
    setEntries((prev) => prev.filter((item) => item.key !== key));
  };

  const validateEntries = (): boolean => {
    const nextErrors: Record<string, EntryErrors> = {};
    let isValid = true;

    entries.forEach((entry) => {
      const entryErr: EntryErrors = {};
      if (!entry.name.trim()) {
        entryErr.name = t('modals.income.nameRequiredError');
        isValid = false;
      }
      const numericVal = parseCurrencyInput(entry.value);
      if (isNaN(numericVal) || numericVal <= 0) {
        entryErr.value = t('modals.income.valueInvalidError');
        isValid = false;
      }
      if (!entry.incomeDate) {
        entryErr.incomeDate = t('modals.income.dateRequiredError');
        isValid = false;
      }
      if (Object.keys(entryErr).length > 0) {
        nextErrors[entry.key] = entryErr;
      }
    });

    setErrors(nextErrors);
    return isValid;
  };

  const totalCombined = entries.reduce((sum, item) => {
    const val = parseCurrencyInput(item.value);
    return sum + (isNaN(val) || val < 0 ? 0 : val);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEntries()) return;

    try {
      setLoading(true);
      if (initialData) {
        const entry = entries[0];
        await api.patch(`/income/${initialData.id}`, {
          name: entry.name.trim(),
          value: Number(parseCurrencyInput(entry.value).toFixed(2)),
          incomeDate: entry.incomeDate,
          isRecurring: entry.isRecurring,
        });
        toast.success(t('modals.income.updatedToast'));
      } else {
        for (const entry of entries) {
          await api.post('/income', {
            name: entry.name.trim(),
            value: Number(parseCurrencyInput(entry.value).toFixed(2)),
            incomeDate: entry.incomeDate,
            isRecurring: entry.isRecurring,
          });
        }
        toast.success(
          entries.length > 1
            ? t('modals.income.createdMultiToast', { count: entries.length })
            : t('modals.income.createdSingleToast'),
        );
      }
      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, t('modals.income.saveError')));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="exec-modal-overlay z-50">
      <div className="exec-modal-container max-w-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/70 flex items-center justify-center">
              {React.createElement(FaWallet as unknown as React.ComponentType<{ className?: string }>, { className: 'text-base' })}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {initialData ? t('modals.income.editTitle') : t('modals.income.newTitle')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {initialData ? t('modals.income.editSubtitle') : t('modals.income.newSubtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors p-2 rounded-lg"
            aria-label={t('common.close')}
          >
            {React.createElement(FaTimes as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {!initialData && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 text-slate-600 dark:text-slate-400">
                    {React.createElement(FaLayerGroup as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {t('modals.income.multiTitle')}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t('modals.income.multiDesc')}
                    </p>
                  </div>
                </div>

                <div className="inline-flex rounded-lg bg-white dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-700 self-start sm:self-center flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleModeChange(false)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${!hasMultipleSalaries
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    {t('modals.income.singleModeBtn')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange(true)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${hasMultipleSalaries
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    {t('modals.income.multiModeBtn')}
                  </button>
                </div>
              </div>

              {hasMultipleSalaries && (
                <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mr-1">
                    {t('modals.income.quickPresetsLabel')}
                  </span>
                  <button
                    type="button"
                    onClick={applyBiweeklyPreset}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-slate-900 dark:hover:border-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    {React.createElement(FaCalendarAlt as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px] text-emerald-600 dark:text-emerald-400' })}
                    {t('modals.income.presetBiweeklyBtn')}
                  </button>
                  <button
                    type="button"
                    onClick={applyTwoSalariesPreset}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-slate-900 dark:hover:border-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    {React.createElement(FaLayerGroup as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px] text-slate-600 dark:text-slate-400' })}
                    {t('modals.income.presetTwoSalariesBtn')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Lista de lançamentos */}
          <div className="space-y-4 max-h-[46vh] overflow-y-auto pr-1">
            {entries.map((entry, idx) => {
              const entryErr = errors[entry.key] || {};
              return (
                <div
                  key={entry.key}
                  className={`rounded-xl border p-4 transition-colors ${hasMultipleSalaries
                    ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60'
                    : 'border-transparent p-0'
                    }`}
                >
                  {hasMultipleSalaries && (
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-700">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {t('modals.income.entryHeader', { index: idx + 1 })}
                      </span>
                      {entries.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeEntry(entry.key)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300"
                        >
                          {React.createElement(FaTrash as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
                          {t('modals.income.removeEntryBtn')}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="exec-label">{t('modals.income.nameLabel')}</label>
                      <input
                        type="text"
                        value={entry.name}
                        onChange={(e) => updateEntry(entry.key, 'name', e.target.value)}
                        className={`exec-input ${entryErr.name ? 'exec-input-error' : ''}`}
                        placeholder={
                          hasMultipleSalaries
                            ? idx === 0
                              ? t('modals.income.namePlaceholderFirstMulti')
                              : t('modals.income.namePlaceholderSecondMulti')
                            : t('modals.income.namePlaceholderSingle')
                        }
                      />
                      {entryErr.name && (
                        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                          {entryErr.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="exec-label">{t('modals.income.valueLabel')}</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={entry.value}
                        onChange={(e) => updateEntry(entry.key, 'value', e.target.value)}
                        className={`exec-input tabular-nums font-semibold ${entryErr.value ? 'exec-input-error' : ''
                          }`}
                        placeholder={getCurrencyPlaceholder()}
                      />
                      {entryErr.value && (
                        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                          {entryErr.value}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="exec-label">{t('modals.income.dateLabel')}</label>
                      <input
                        type="date"
                        value={entry.incomeDate}
                        onChange={(e) => updateEntry(entry.key, 'incomeDate', e.target.value)}
                        className={`exec-input ${entryErr.incomeDate ? 'exec-input-error' : ''}`}
                      />
                      {entryErr.incomeDate && (
                        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                          {entryErr.incomeDate}
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2 pt-1">
                      <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={entry.isRecurring}
                            onChange={(e) => updateEntry(entry.key, 'isRecurring', e.target.checked)}
                            className="sr-only"
                          />
                          <div
                            className={`w-10 h-5 rounded-full transition-colors ${entry.isRecurring ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700'
                              }`}
                          />
                          <div
                            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${entry.isRecurring ? 'translate-x-5' : ''
                              }`}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {t('modals.income.recurringLabel')}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {hasMultipleSalaries && !initialData && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={addEntry}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-900 dark:hover:border-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                {React.createElement(FaPlus as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
                {t('modals.income.addAnotherBtn')}
              </button>

              <div className="flex items-center justify-between sm:justify-end gap-2 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/70 rounded-xl px-4 py-2">
                <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                  {t('modals.income.totalCombinedLabel', { count: entries.length })}
                </span>
                <span className="text-sm font-bold text-emerald-900 dark:text-emerald-200 tabular-nums">
                  {formatCurrency(totalCombined)}
                </span>
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="exec-btn-secondary">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={loading} className="exec-btn-primary">
              {loading
                ? t('common.processing')
                : initialData
                  ? t('modals.income.saveEdit')
                  : hasMultipleSalaries
                    ? t('modals.income.saveMulti', { count: entries.length })
                    : t('modals.income.saveNew')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IncomeModal;
