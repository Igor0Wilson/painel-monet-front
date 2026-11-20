import React from 'react';
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronDown,
  FaChevronUp,
  FaCreditCard,
  FaEdit,
  FaTrash,
  FaUser,
} from 'react-icons/fa';
import { ExpenseFilter, ExpenseItem } from '../../types/finance';
import { getCategoryMeta } from '../../utils/categories';
import { formatCurrency, formatDateBr } from '../../utils/formatters';
import StatusBadge from './StatusBadge';

interface Props {
  expenses: ExpenseItem[];
  expenseFilter: ExpenseFilter;
  isFamilyMode: boolean;
  openInstallments: string[];
  onChangeFilter: (filter: ExpenseFilter) => void;
  onToggleInstallment: (id: string) => void;
  onPayExpense: (expense: ExpenseItem) => void;
  onEditExpense: (expense: ExpenseItem) => void;
  onDeleteExpense: (id: string) => void;
}

const FILTER_TABS: { key: ExpenseFilter; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'pendente', label: 'Pendentes' },
  { key: 'em_atraso', label: 'Em atraso' },
  { key: 'pago', label: 'Pagas' },
];

const ExpensesListSection: React.FC<Props> = ({
  expenses,
  expenseFilter,
  isFamilyMode,
  openInstallments,
  onChangeFilter,
  onToggleInstallment,
  onPayExpense,
  onEditExpense,
  onDeleteExpense,
}) => {
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
              : 'Controle de vencimentos, liquidações e parcelamentos'}
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

      <div className="divide-y divide-slate-100">
        {expenses.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-slate-600">Nenhuma despesa encontrada</p>
            <p className="text-xs text-slate-400 mt-1">
              {expenseFilter === 'todas'
                ? 'Clique em "Nova Despesa" para registrar seu primeiro lançamento.'
                : 'Nenhum lançamento corresponde ao filtro selecionado.'}
            </p>
          </div>
        ) : (
          expenses.map((expense) => {
            if (
              expenseFilter === 'todas' &&
              expense.isInstallment &&
              expense.parentExpenseId &&
              expenses.some((e) => e.id === expense.parentExpenseId)
            ) {
              return null;
            }

            const isGroupHeader =
              expenseFilter === 'todas' && expense.isInstallment && !expense.parentExpenseId;
            const childInstallments = isGroupHeader
              ? expenses.filter((e) => e.parentExpenseId === expense.id)
              : [];
            const isAccordionOpen = openInstallments.includes(expense.id);
            const canModify = expense.isOwn !== false;

            return (
              <div key={expense.id} className="transition-colors hover:bg-slate-50/70">
                <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                          {React.createElement(FaUser as any, { className: 'text-[8px]' })}
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
                            (isAccordionOpen ? FaChevronUp : FaChevronDown) as any,
                            { className: 'text-[9px]' },
                          )}
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        {React.createElement(FaCalendarAlt as any, {
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
                            {React.createElement(catMeta.icon as any, {
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
                          {React.createElement(FaCreditCard as any, { className: 'text-[9px]' })}
                          Fatura Cartão
                        </span>
                      )}
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
                            {React.createElement(FaCheckCircle as any, {
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
                          {React.createElement(FaEdit as any, { className: 'text-xs' })}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteExpense(expense.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Excluir"
                        >
                          {React.createElement(FaTrash as any, { className: 'text-xs' })}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {isAccordionOpen && childInstallments.length > 0 && (
                  <div className="bg-slate-50/90 border-t border-slate-100 px-6 py-2.5 space-y-2">
                    {childInstallments.map((child) => (
                      <div
                        key={child.id}
                        className="bg-white px-4 py-2.5 rounded-xl border border-slate-200/70 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5">
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
                                  {React.createElement(FaCheckCircle as any, {
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
                                {React.createElement(FaEdit as any, { className: 'text-xs' })}
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteExpense(child.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Excluir parcela"
                              >
                                {React.createElement(FaTrash as any, { className: 'text-xs' })}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
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
