import React, { useEffect, useMemo, useState } from 'react';
import {
  FaCalculator,
  FaCalendarAlt,
  FaCheckCircle,
  FaCheckDouble,
  FaChevronDown,
  FaChevronUp,
  FaCreditCard,
  FaEdit,
  FaTrash,
  FaUser,
} from 'react-icons/fa';
import { ExpenseFilter, ExpenseItem } from '../../types/finance';
import { getCategoryMeta } from '../../utils/categories';
import {
  formatCurrency,
  formatDateBr,
  formatMonthLabel,
  getCurrentMonthKey,
} from '../../utils/formatters';
import StatusBadge from './StatusBadge';

interface Props {
  expenses: ExpenseItem[];
  expenseFilter: ExpenseFilter;
  isFamilyMode: boolean;
  openInstallments: string[];
  onChangeFilter: (filter: ExpenseFilter) => void;
  onToggleInstallment: (id: string) => void;
  onPayExpense: (expense: ExpenseItem) => void;
  onPayBatchExpenses?: (expenses: ExpenseItem[]) => void;
  onEditExpense: (expense: ExpenseItem) => void;
  onDeleteExpense: (id: string) => void;
}

const FILTER_TABS: { key: ExpenseFilter; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'pendente', label: 'Pendentes' },
  { key: 'em_atraso', label: 'Em atraso' },
  { key: 'pago', label: 'Pagas' },
];

type PeriodMode = 'all' | 'month' | 'custom';

const ExpensesListSection: React.FC<Props> = ({
  expenses,
  expenseFilter,
  isFamilyMode,
  openInstallments,
  onChangeFilter,
  onToggleInstallment,
  onPayExpense,
  onPayBatchExpenses,
  onEditExpense,
  onDeleteExpense,
}) => {
  const [periodMode, setPeriodMode] = useState<PeriodMode>('all');
  const [selectedPeriodMonth, setSelectedPeriodMonth] = useState<string>(getCurrentMonthKey());
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const validUnpaidIds = new Set(
      expenses.filter((e) => !e.isPaid && e.isOwn !== false).map((e) => e.id),
    );
    setSelectedIds((prev) => prev.filter((id) => validUnpaidIds.has(id)));
  }, [expenses]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>([getCurrentMonthKey()]);
    expenses.forEach((exp) => {
      if (exp.dueDate) {
        set.add(String(exp.dueDate).slice(0, 7));
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [expenses]);

  const periodFilteredExpenses = useMemo(() => {
    if (periodMode === 'all') return expenses;
    return expenses.filter((exp) => {
      const cleanDate = String(exp.dueDate || '').split('T')[0];
      if (!cleanDate) return false;
      if (periodMode === 'month') {
        return cleanDate.startsWith(selectedPeriodMonth);
      }
      if (customStartDate && cleanDate < customStartDate) return false;
      if (customEndDate && cleanDate > customEndDate) return false;
      return true;
    });
  }, [expenses, periodMode, selectedPeriodMonth, customStartDate, customEndDate]);

  const periodTotalSum = useMemo(
    () => periodFilteredExpenses.reduce((sum, e) => sum + (Number(e.value) || 0), 0),
    [periodFilteredExpenses],
  );

  const selectableVisibleExpenses = useMemo(
    () => periodFilteredExpenses.filter((e) => !e.isPaid && e.isOwn !== false),
    [periodFilteredExpenses],
  );

  const periodUnpaidSum = useMemo(
    () => selectableVisibleExpenses.reduce((sum, e) => sum + (Number(e.value) || 0), 0),
    [selectableVisibleExpenses],
  );

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedExpenses = useMemo(
    () => expenses.filter((e) => selectedIdSet.has(e.id) && !e.isPaid && e.isOwn !== false),
    [expenses, selectedIdSet],
  );

  const selectedTotal = useMemo(
    () => selectedExpenses.reduce((sum, e) => sum + (Number(e.value) || 0), 0),
    [selectedExpenses],
  );

  const allVisibleSelected =
    selectableVisibleExpenses.length > 0 &&
    selectableVisibleExpenses.every((e) => selectedIdSet.has(e.id));

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((curr) => curr !== id) : [...prev, id],
    );
  };

  const handleToggleSelectAllVisible = () => {
    const visibleIds = selectableVisibleExpenses.map((e) => e.id);
    if (visibleIds.length === 0) return;

    if (allVisibleSelected) {
      const visibleSet = new Set(visibleIds);
      setSelectedIds((prev) => prev.filter((id) => !visibleSet.has(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  return (
    <section className="exec-card overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            {isFamilyMode ? 'Contas & Compras da Família' : 'Contas & Despesas'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isFamilyMode
              ? 'Detalhamento individual de cada participante no painel unificado'
              : 'Controle de vencimentos, soma por período e pagamento em lote'}
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-slate-100/80 p-1 self-start sm:self-auto">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChangeFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                expenseFilter === tab.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtro por Período & Seleção em Lote */}
      <div className="px-6 py-3.5 bg-slate-50/70 border-b border-slate-100 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Período:
            </span>
            <div className="inline-flex rounded-lg bg-white p-0.5 border border-slate-200">
              {[
                { id: 'all' as const, label: 'Tudo' },
                { id: 'month' as const, label: 'Por mês' },
                { id: 'custom' as const, label: 'Intervalo' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setPeriodMode(mode.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    periodMode === mode.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {periodMode === 'month' && (
              <select
                aria-label="Selecionar mês do período"
                value={selectedPeriodMonth}
                onChange={(e) => setSelectedPeriodMonth(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800"
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthLabel(m)}
                  </option>
                ))}
              </select>
            )}

            {periodMode === 'custom' && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <input
                  aria-label="Data inicial do período"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800"
                />
                <span className="text-slate-400">até</span>
                <input
                  aria-label="Data final do período"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800"
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-slate-500 tabular-nums">
              Total do período:{' '}
              <strong className="text-slate-900">{formatCurrency(periodTotalSum)}</strong>
              {periodUnpaidSum > 0 && (
                <span className="text-amber-700 font-semibold">
                  {' '}
                  · Em aberto: {formatCurrency(periodUnpaidSum)}
                </span>
              )}
            </span>

            {selectableVisibleExpenses.length > 0 && (
              <button
                type="button"
                onClick={handleToggleSelectAllVisible}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
              >
                {React.createElement(
                  FaCheckDouble as unknown as React.ComponentType<{ className?: string }>,
                  { className: 'text-[10px] text-emerald-600' },
                )}
                {allVisibleSelected
                  ? 'Desmarcar em aberto'
                  : `Selecionar em aberto (${selectableVisibleExpenses.length})`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Calculadora & Pagamento em Lote */}
      {selectedExpenses.length > 0 && (
        <div className="px-6 py-4 bg-slate-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              {React.createElement(
                FaCalculator as unknown as React.ComponentType<{ className?: string }>,
                { className: 'text-sm' },
              )}
            </span>
            <div>
              <p className="text-xs text-slate-300">
                {selectedExpenses.length}{' '}
                {selectedExpenses.length === 1 ? 'dívida selecionada' : 'dívidas selecionadas'}{' '}
                para pagamento em lote
              </p>
              <p className="text-lg font-bold tabular-nums text-white leading-tight">
                Total: {formatCurrency(selectedTotal)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-colors"
            >
              Limpar seleção
            </button>
            {onPayBatchExpenses && (
              <button
                type="button"
                onClick={() => onPayBatchExpenses(selectedExpenses)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-bold shadow-sm transition-colors"
              >
                {React.createElement(
                  FaCheckCircle as unknown as React.ComponentType<{ className?: string }>,
                  { className: 'text-xs' },
                )}
                <span>Pagar ({formatCurrency(selectedTotal)})</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="divide-y divide-slate-100">
        {periodFilteredExpenses.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-slate-600">Nenhuma despesa encontrada</p>
            <p className="text-xs text-slate-400 mt-1">
              {expenseFilter === 'todas' && periodMode === 'all'
                ? 'Clique em "Nova Despesa" para registrar seu primeiro lançamento.'
                : 'Nenhum lançamento corresponde ao filtro ou período selecionado.'}
            </p>
          </div>
        ) : (
          periodFilteredExpenses.map((expense) => {
            if (
              expenseFilter === 'todas' &&
              expense.isInstallment &&
              expense.parentExpenseId &&
              periodFilteredExpenses.some((e) => e.id === expense.parentExpenseId)
            ) {
              return null;
            }

            const isGroupHeader =
              expenseFilter === 'todas' && expense.isInstallment && !expense.parentExpenseId;
            const childInstallments = isGroupHeader
              ? periodFilteredExpenses.filter((e) => e.parentExpenseId === expense.id)
              : [];
            const isAccordionOpen = openInstallments.includes(expense.id);
            const canModify = expense.isOwn !== false;
            const canSelect = !expense.isPaid && canModify;
            const isChecked = selectedIdSet.has(expense.id);

            return (
              <div
                key={expense.id}
                className={`transition-colors ${
                  isChecked ? 'bg-emerald-50/50' : 'hover:bg-slate-50/70'
                }`}
              >
                <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {canSelect && (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectId(expense.id)}
                        aria-label={`Selecionar ${expense.name}`}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-900 truncate">
                        {isGroupHeader ? expense.name.split(' (')[0] : expense.name}
                      </h4>
                      <StatusBadge status={expense.status} paymentMethod={expense.paymentMethod} />
                      {isFamilyMode && expense.ownerName && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            expense.isOwn
                              ? 'bg-slate-900 text-white'
                              : 'bg-teal-50 text-teal-800 border border-teal-200/80'
                          }`}
                        >
                          {React.createElement(FaUser as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[8px]' })}
                          {expense.ownerName.split(' ')[0]}
                        </span>
                      )}
                      {isGroupHeader && childInstallments.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onToggleInstallment(expense.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-slate-200/80 transition-colors"
                        >
                          {childInstallments.length + 1} parcelas
                          {React.createElement(
                            (isAccordionOpen ? FaChevronUp : FaChevronDown) as unknown as React.ComponentType<{ className?: string }>,
                            { className: 'text-[9px]' },
                          )}
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        {React.createElement(FaCalendarAlt as unknown as React.ComponentType<{ className?: string }>, {
                          className: 'text-[10px] text-slate-400',
                        })}
                        {formatDateBr(expense.dueDate)}
                      </span>
                      {(() => {
                        const catMeta = getCategoryMeta(expense.accountType?.name);
                        return (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${catMeta.bgClass} ${catMeta.textClass} ${catMeta.borderClass}`}
                          >
                            {React.createElement(catMeta.icon as unknown as React.ComponentType<{ className?: string }>, {
                              className: 'text-[10px]',
                            })}
                            {catMeta.name}
                          </span>
                        );
                      })()}
                      {expense.isRecurring && (
                        <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          Fixa mensal
                        </span>
                      )}
                      {expense.isInstallment && (
                        <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          Parcela {expense.installmentNumber}/{expense.installmentCount}
                        </span>
                      )}
                      {expense.isCreditCard && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md">
                          {React.createElement(FaCreditCard as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[9px]' })}
                          Fatura Cartão
                        </span>
                      )}
                    </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                    <span className="text-base font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(expense.value)}
                    </span>

                    {canModify && (
                      <div className="flex items-center gap-1.5">
                        {!expense.isPaid && (
                          <button
                            type="button"
                            onClick={() => onPayExpense(expense)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors"
                            title="Liquidar despesa"
                          >
                            {React.createElement(FaCheckCircle as unknown as React.ComponentType<{ className?: string }>, {
                              className: 'text-[11px]',
                            })}
                            <span>Liquidar</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onEditExpense(expense)}
                          className="p-2 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title="Editar"
                        >
                          {React.createElement(FaEdit as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteExpense(expense.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Excluir"
                        >
                          {React.createElement(FaTrash as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {isAccordionOpen && childInstallments.length > 0 && (
                  <div className="bg-slate-50/90 border-t border-slate-100 px-6 py-2.5 space-y-2">
                    {childInstallments.map((child) => {
                      const canSelectChild = !child.isPaid && child.isOwn !== false;
                      const isChildChecked = selectedIdSet.has(child.id);
                      return (
                        <div
                          key={child.id}
                          className={`px-4 py-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 transition-colors ${
                            isChildChecked
                              ? 'bg-emerald-50 border-emerald-200'
                              : 'bg-white border-slate-200/70'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {canSelectChild && (
                              <input
                                type="checkbox"
                                checked={isChildChecked}
                                onChange={() => toggleSelectId(child.id)}
                                aria-label={`Selecionar parcela ${child.installmentNumber}/${child.installmentCount} de ${child.name}`}
                                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer flex-shrink-0"
                              />
                            )}
                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md tabular-nums">
                              {child.installmentNumber}/{child.installmentCount}
                            </span>
                            <span className="text-xs font-medium text-slate-700">
                              {formatDateBr(child.dueDate)}
                            </span>
                            <StatusBadge status={child.status} paymentMethod={child.paymentMethod} />
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-slate-900 tabular-nums">
                              {formatCurrency(child.value)}
                            </span>
                            {child.isOwn !== false && (
                              <div className="flex items-center gap-1">
                                {!child.isPaid && (
                                  <button
                                    type="button"
                                    onClick={() => onPayExpense(child)}
                                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                                    title="Liquidar parcela"
                                  >
                                    {React.createElement(FaCheckCircle as unknown as React.ComponentType<{ className?: string }>, {
                                      className: 'text-xs',
                                    })}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => onEditExpense(child)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                  title="Editar parcela"
                                >
                                  {React.createElement(FaEdit as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteExpense(child.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Excluir parcela"
                                >
                                  {React.createElement(FaTrash as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

export default ExpensesListSection;
