import React from 'react';
import { FaCalendarAlt, FaEdit, FaPlus, FaTrash } from 'react-icons/fa';
import { IncomeItem } from '../../types/finance';
import { formatCurrency, formatDateBr } from '../../utils/formatters';

interface Props {
  incomes: IncomeItem[];
  isFamilyMode: boolean;
  onAddIncome: () => void;
  onEditIncome: (income: IncomeItem) => void;
  onDeleteIncome: (id: string) => void;
}

const IncomesListSection: React.FC<Props> = ({
  incomes,
  isFamilyMode,
  onAddIncome,
  onEditIncome,
  onDeleteIncome,
}) => {
  return (
    <section className="lg:col-span-4 exec-card overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            {isFamilyMode ? 'Salários & Receitas da Família' : 'Salários & Receitas'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Entradas fixas, quinzenais e extras</p>
        </div>
        <button
          type="button"
          onClick={onAddIncome}
          className="w-8 h-8 rounded-xl bg-slate-900 text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
          title="Adicionar salário ou receita"
        >
          {React.createElement(FaPlus as any, { className: 'text-xs' })}
        </button>
      </div>

      <div className="divide-y divide-slate-100">
        {incomes.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-slate-600">Nenhuma receita cadastrada</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Adicione seu salário mensal, adiantamento quinzenal ou outras fontes de renda.
            </p>
            <button type="button" onClick={onAddIncome} className="exec-btn-secondary text-xs">
              Cadastrar primeiro salário
            </button>
          </div>
        ) : (
          incomes.map((income) => (
            <div key={income.id} className="px-6 py-4 hover:bg-slate-50/70 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h4 className="text-sm font-semibold text-slate-900 truncate">{income.name}</h4>
                    {income.isRecurring && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/70 flex-shrink-0">
                        Fixo
                      </span>
                    )}
                    {income.status === 'agendado' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/70 flex-shrink-0">
                        Entra em{' '}
                        {formatDateBr(income.nextCreditDate || income.incomeDate).slice(0, 5)}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70 flex-shrink-0">
                        Creditado
                      </span>
                    )}
                    {isFamilyMode && income.ownerName && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-900 text-white">
                        {income.ownerName.split(' ')[0]}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    {React.createElement(FaCalendarAlt as any, { className: 'text-[10px]' })}
                    <span>Entrada: {formatDateBr(income.incomeDate)}</span>
                  </p>
                </div>

                {income.isOwn !== false && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditIncome(income)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                      title="Editar receita"
                    >
                      {React.createElement(FaEdit as any, { className: 'text-xs' })}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteIncome(income.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Excluir receita"
                    >
                      {React.createElement(FaTrash as any, { className: 'text-xs' })}
                    </button>
                  </div>
                )}
              </div>

              <p
                className={`text-base font-semibold mt-2 tabular-nums ${
                  income.status === 'agendado' ? 'text-slate-500' : 'text-emerald-700'
                }`}
              >
                + {formatCurrency(income.value)}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default IncomesListSection;
