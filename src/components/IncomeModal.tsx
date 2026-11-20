import React, { useEffect, useState } from 'react';
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
import { extractApiErrorMessage } from '../utils/errorHandler';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
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
          value: String(initialData.value ?? ''),
          incomeDate: initialData.incomeDate || getTodayIso(),
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
      createBlankEntry('Adiantamento Quinzenal', getDateForDay(20), true),
      createBlankEntry('Salário Principal', getDateForDay(5), true),
    ]);
  };

  const applyTwoSalariesPreset = () => {
    setErrors({});
    setEntries([
      createBlankEntry('Salário 1', getDateForDay(5), true),
      createBlankEntry('Salário 2', getDateForDay(15), true),
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
            createBlankEntry('Adiantamento Quinzenal', getDateForDay(20), true),
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
      prev.map((item) => (item.key === key ? { ...item, [field]: value } : item)),
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
      toast.info('Máximo de 6 lançamentos simultâneos.');
      return;
    }
    setEntries((prev) => [
      ...prev,
      createBlankEntry(`Salário / Renda ${prev.length + 1}`, getTodayIso(), true),
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
        entryErr.name = 'Informe a descrição da receita';
        isValid = false;
      }
      const numericVal = parseFloat(entry.value);
      if (isNaN(numericVal) || numericVal <= 0) {
        entryErr.value = 'Informe um valor positivo';
        isValid = false;
      }
      if (!entry.incomeDate) {
        entryErr.incomeDate = 'Informe a data';
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
    const val = parseFloat(item.value);
    return sum + (isNaN(val) || val < 0 ? 0 : val);
  }, 0);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEntries()) return;

    try {
      setLoading(true);
      if (initialData) {
        const entry = entries[0];
        await api.patch(`/income/${initialData.id}`, {
          name: entry.name.trim(),
          value: Number(parseFloat(entry.value).toFixed(2)),
          incomeDate: entry.incomeDate,
          isRecurring: entry.isRecurring,
        });
        toast.success('Receita atualizada com sucesso!');
      } else {
        for (const entry of entries) {
          await api.post('/income', {
            name: entry.name.trim(),
            value: Number(parseFloat(entry.value).toFixed(2)),
            incomeDate: entry.incomeDate,
            isRecurring: entry.isRecurring,
          });
        }
        toast.success(
          entries.length > 1
            ? `${entries.length} recebimentos cadastrados com sucesso!`
            : 'Receita cadastrada com sucesso!',
        );
      }
      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, 'Erro ao salvar receita'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="exec-modal-overlay z-50">
      <div className="exec-modal-container max-w-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
              {React.createElement(FaWallet as any, { className: 'text-base' })}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {initialData ? 'Editar Receita / Salário' : 'Registrar Salário ou Receita'}
              </h3>
              <p className="text-xs text-slate-500">
                {initialData
                  ? 'Atualize os dados deste recebimento'
                  : 'Cadastre um lançamento único ou múltiplos recebimentos (ex.: salário + adiantamento quinzenal)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors p-2 rounded-lg"
          >
            {React.createElement(FaTimes as any, { className: 'text-sm' })}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Seletor de Múltiplos Salários / Quinzenal (somente no cadastro) */}
          {!initialData && (
            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 text-slate-600">
                    {React.createElement(FaLayerGroup as any, { className: 'text-sm' })}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Recebe mais de 1 salário ou adiantamento quinzenal?
                    </p>
                    <p className="text-xs text-slate-500">
                      Ative para cadastrar 2 ou mais recebimentos de uma só vez (ex.: dia 5 e dia 20).
                    </p>
                  </div>
                </div>

                <div className="inline-flex rounded-lg bg-white p-1 border border-slate-200 self-start sm:self-center flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleModeChange(false)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${!hasMultipleSalaries
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    1 Salário
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange(true)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${hasMultipleSalaries
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    Mais de 1 / Quinzenal
                  </button>
                </div>
              </div>

              {hasMultipleSalaries && (
                <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-500 mr-1">Modelos rápidos:</span>
                  <button
                    type="button"
                    onClick={applyBiweeklyPreset}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:border-slate-900 hover:text-slate-900 transition-colors"
                  >
                    {React.createElement(FaCalendarAlt as any, { className: 'text-[10px] text-emerald-600' })}
                    Salário + Adiantamento Quinzenal
                  </button>
                  <button
                    type="button"
                    onClick={applyTwoSalariesPreset}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:border-slate-900 hover:text-slate-900 transition-colors"
                  >
                    {React.createElement(FaLayerGroup as any, { className: 'text-[10px] text-slate-600' })}
                    2 Salários / Fontes Fixas
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
                    ? 'border-slate-200 bg-white'
                    : 'border-transparent p-0'
                    }`}
                >
                  {hasMultipleSalaries && (
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                      <span className="text-xs font-semibold text-slate-700">
                        Recebimento #{idx + 1}
                      </span>
                      {entries.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeEntry(entry.key)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700"
                        >
                          {React.createElement(FaTrash as any, { className: 'text-[10px]' })}
                          Remover
                        </button>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="exec-label">Descrição / Fonte da receita</label>
                      <input
                        type="text"
                        value={entry.name}
                        onChange={(e) => updateEntry(entry.key, 'name', e.target.value)}
                        className={`exec-input ${entryErr.name ? 'exec-input-error' : ''}`}
                        placeholder={
                          hasMultipleSalaries
                            ? idx === 0
                              ? 'Ex: Adiantamento Quinzenal'
                              : 'Ex: Salário Principal'
                            : 'Ex: Salário Mensal, Pró-labore, Dividendos'
                        }
                      />
                      {entryErr.name && (
                        <p className="mt-1 text-xs text-rose-600 font-medium">{entryErr.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="exec-label">Valor líquido (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={entry.value}
                        onChange={(e) => updateEntry(entry.key, 'value', e.target.value)}
                        className={`exec-input tabular-nums font-semibold ${entryErr.value ? 'exec-input-error' : ''
                          }`}
                        placeholder="0,00"
                      />
                      {entryErr.value && (
                        <p className="mt-1 text-xs text-rose-600 font-medium">{entryErr.value}</p>
                      )}
                    </div>

                    <div>
                      <label className="exec-label">Data de recebimento</label>
                      <input
                        type="date"
                        value={entry.incomeDate}
                        onChange={(e) => updateEntry(entry.key, 'incomeDate', e.target.value)}
                        className={`exec-input ${entryErr.incomeDate ? 'exec-input-error' : ''}`}
                      />
                      {entryErr.incomeDate && (
                        <p className="mt-1 text-xs text-rose-600 font-medium">
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
                            className={`w-10 h-5 rounded-full transition-colors ${entry.isRecurring ? 'bg-emerald-600' : 'bg-slate-200'
                              }`}
                          />
                          <div
                            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${entry.isRecurring ? 'translate-x-5' : ''
                              }`}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-700">
                          Receita fixa mensal (recorrente)
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botão adicionar mais um salário e resumo combinado */}
          {hasMultipleSalaries && !initialData && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={addEntry}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-dashed border-slate-300 text-xs font-semibold text-slate-700 hover:border-slate-900 hover:text-slate-900 hover:bg-slate-50 transition-all"
              >
                {React.createElement(FaPlus as any, { className: 'text-[10px]' })}
                Adicionar outro salário / parcela
              </button>

              <div className="flex items-center justify-between sm:justify-end gap-2 bg-emerald-50/80 border border-emerald-100 rounded-xl px-4 py-2">
                <span className="text-xs font-medium text-emerald-800">
                  Total ({entries.length} lançamentos):
                </span>
                <span className="text-sm font-bold text-emerald-900 tabular-nums">
                  {formatCurrency(totalCombined)}
                </span>
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="exec-btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="exec-btn-primary">
              {loading
                ? 'Processando...'
                : initialData
                  ? 'Salvar alterações'
                  : hasMultipleSalaries
                    ? `Registrar ${entries.length} recebimentos`
                    : 'Registrar receita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IncomeModal;
