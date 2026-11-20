import React, { useEffect, useState } from 'react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Informe o nome ou ativo do investimento.');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error('Informe um valor positivo para o investimento.');
      return;
    }
    if (!investedDate) {
      toast.error('Informe a data em que o investimento foi realizado.');
      return;
    }
    if (deltaOnBalance > ownAvailableBalance + 0.001) {
      toast.error(
        'Saldo disponível insuficiente para este aporte do mês. Use "Carteira já existente" para aplicações anteriores.',
      );
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
        toast.success('Investimento atualizado com sucesso!');
      } else {
        await api.post('/balance/investments/items', payload);
        toast.success('Investimento registrado com sucesso!');
      }
      resetForm(null);
      onRefresh();
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, 'Erro ao salvar investimento'));
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
      toast.success('Investimento removido com sucesso!');
      onRefresh();
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, 'Erro ao remover investimento'));
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
      toast.success('Aportes do mês movidos para carteira já existente e saldo liberado!');
      onRefresh();
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, 'Erro ao reclassificar investimentos'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="exec-modal-overlay z-[60]">
      <div className="exec-modal-container max-w-3xl max-h-[92dvh] flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              {React.createElement(
                FaSeedling as unknown as React.ComponentType<{ className?: string }>,
                { className: 'text-sm' },
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Módulo de Investimentos
              </h3>
              <p className="text-xs text-slate-500">
                Detalhe seus investimentos realizados com datas, ativos e origem do capital
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100"
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
            <div className="rounded-xl bg-slate-950 text-white p-3.5">
              <p className="text-[11px] text-slate-400">Carteira Total</p>
              <p className="text-lg font-semibold tabular-nums mt-0.5">
                {formatCurrency(totalPortfolio)}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-200/80 p-3.5">
              <p className="text-[11px] text-emerald-800 font-medium">Carteira já existente</p>
              <p className="text-lg font-semibold text-emerald-950 tabular-nums mt-0.5">
                {formatCurrency(externalInvestments)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-100 border border-slate-200 p-3.5">
              <p className="text-[11px] text-slate-600 font-medium">Alocado do saldo do mês</p>
              <p className="text-lg font-semibold text-slate-900 tabular-nums mt-0.5">
                {formatCurrency(allocatedInvestments)}
              </p>
            </div>
          </div>

          {allocatedInvestments > 0 && (
            <button
              type="button"
              disabled={submitting}
              onClick={handleReclassifyAll}
              className="w-full text-left text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl px-4 py-2.5 transition-colors disabled:opacity-50"
            >
              Mover os {formatCurrency(allocatedInvestments)} alocados do mês para &quot;Carteira já
              existente&quot; (libera {formatCurrency(allocatedInvestments)} no seu saldo disponível)
            </button>
          )}

          {/* Formulário */}
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                {React.createElement(
                  (editingItem ? FaEdit : FaPlus) as unknown as React.ComponentType<{
                    className?: string;
                  }>,
                  { className: 'text-[11px] text-emerald-600' },
                )}
                {editingItem ? 'Editar investimento realizado' : 'Registrar novo investimento'}
              </h4>
              {editingItem && (
                <button
                  type="button"
                  onClick={() => resetForm(null)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 underline"
                >
                  Cancelar edição
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="exec-label">Nome do investimento / aplicação</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="exec-input"
                  placeholder="Ex: Tesouro Selic 2029, CDB 110% CDI, IVVB11"
                />
              </div>

              <div>
                <label className="exec-label">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="exec-input"
                >
                  {INVESTMENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="exec-label">Valor aplicado (R$)</label>
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
                    { className: 'text-[10px] text-slate-400' },
                  )}
                  Data da realização
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
                <label className="exec-label">Observações (opcional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="exec-input"
                  placeholder="Ex: Corretora, vencimento, meta"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="exec-label">Origem do recurso</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSource('external')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    source === 'external'
                      ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <p className="text-xs font-semibold">Carteira já existente / Anterior</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Sem limite e sem descontar do saldo livre do mês
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setSource('balance')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    source === 'balance'
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <p className="text-xs font-semibold">Usar saldo disponível do mês</p>
                  <p
                    className={`text-[11px] mt-0.5 ${
                      source === 'balance' ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    Saldo atual: {formatCurrency(ownAvailableBalance)} → Após:{' '}
                    {formatCurrency(projectedBalance)}
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
                  ? 'Salvando...'
                  : editingItem
                    ? 'Salvar alteração'
                    : 'Adicionar investimento'}
              </button>
            </div>
          </form>

          {/* Histórico Detalhado */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Investimentos Realizados ({ownItems.length})
            </h4>

            {ownItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                Nenhum investimento detalhado registrado ainda. Preencha o formulário acima com a
                data e o valor da sua aplicação.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden bg-white">
                {ownItems.map((item) => (
                  <div
                    key={item.id}
                    className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          {item.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {item.category}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            item.source === 'balance'
                              ? 'bg-slate-900 text-white'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                          }`}
                        >
                          {item.source === 'balance' ? 'Do mês' : 'Já existente'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span className="inline-flex items-center gap-1">
                          {React.createElement(
                            FaCalendarAlt as unknown as React.ComponentType<{
                              className?: string;
                            }>,
                            { className: 'text-[10px]' },
                          )}
                          Data: {formatDateBr(item.investedDate)}
                        </span>
                        {item.notes && <span className="truncate">· {item.notes}</span>}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                      <span className="text-sm font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(item.amount)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => resetForm(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title="Editar investimento"
                        >
                          {React.createElement(
                            FaEdit as unknown as React.ComponentType<{ className?: string }>,
                            { className: 'text-xs' },
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Excluir investimento"
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

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end flex-shrink-0">
          <button type="button" onClick={onClose} className="exec-btn-secondary">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvestmentsModal;
