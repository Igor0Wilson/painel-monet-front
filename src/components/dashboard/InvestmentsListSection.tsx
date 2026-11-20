import React, { useState } from 'react';
import {
  FaCalendarAlt,
  FaEdit,
  FaLock,
  FaPlus,
  FaSeedling,
  FaTrash,
} from 'react-icons/fa';
import { InvestmentItem, MemberBreakdown } from '../../types/finance';
import { formatCurrency, formatDateBr } from '../../utils/formatters';

interface Props {
  items: InvestmentItem[];
  isFamilyMode: boolean;
  selectedMember?: MemberBreakdown | null;
  onAddInvestment: () => void;
  onEditInvestment: (item: InvestmentItem) => void;
  onDeleteInvestment: (id: string) => void;
}

const InvestmentsListSection: React.FC<Props> = ({
  items,
  isFamilyMode,
  selectedMember,
  onAddInvestment,
  onEditInvestment,
  onDeleteInvestment,
}) => {
  const [sourceFilter, setSourceFilter] = useState<'all' | 'external' | 'balance'>('all');

  const isSelectedMemberRestricted = Boolean(
    isFamilyMode &&
      selectedMember &&
      !selectedMember.isSelf &&
      selectedMember.permissions &&
      !selectedMember.permissions.viewInvestments,
  );

  const visibleItems = items.filter((it) =>
    sourceFilter === 'all' ? true : it.source === sourceFilter,
  );

  const totalVisible = visibleItems.reduce((sum, it) => sum + Number(it.amount || 0), 0);

  return (
    <section className="exec-card overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {React.createElement(
              FaSeedling as unknown as React.ComponentType<{ className?: string }>,
              { className: 'text-emerald-600 text-sm' },
            )}
            <h2 className="text-base font-semibold text-slate-900">
              {isFamilyMode ? 'Investimentos Realizados da Família' : 'Investimentos Realizados'}
            </h2>
            {visibleItems.length > 0 && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full tabular-nums">
                {formatCurrency(totalVisible)}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Histórico detalhado por data de aplicação, ativo e origem
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
            {[
              { id: 'all' as const, label: 'Todos' },
              { id: 'external' as const, label: 'Já existentes' },
              { id: 'balance' as const, label: 'Do mês' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSourceFilter(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  sourceFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onAddInvestment}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            {React.createElement(
              FaPlus as unknown as React.ComponentType<{ className?: string }>,
              { className: 'text-[10px]' },
            )}
            <span>Detalhar / Novo</span>
          </button>
        </div>
      </div>

      {isSelectedMemberRestricted ? (
        <div className="p-8 text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            {React.createElement(
              FaLock as unknown as React.ComponentType<{ className?: string }>,
              { className: 'text-sm' },
            )}
          </div>
          <p className="text-sm font-medium text-slate-700">
            Investimentos privados neste Painel Família
          </p>
          <p className="text-xs text-slate-400">
            {selectedMember?.name} optou por ocultar os detalhes de investimentos para você.
          </p>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm font-medium text-slate-600">
            Nenhum investimento detalhado neste filtro
          </p>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Registre suas aplicações com data e categoria sem precisar criar receitas falsas do
            passado.
          </p>
          <button type="button" onClick={onAddInvestment} className="exec-btn-secondary text-xs">
            Registrar investimento com data
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-900 truncate">{item.name}</h4>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                    {item.category}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      item.source === 'balance'
                        ? 'bg-slate-900 text-white'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                    }`}
                  >
                    {item.source === 'balance' ? 'Do saldo do mês' : 'Carteira já existente'}
                  </span>
                  {isFamilyMode && item.ownerName && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-800 border border-teal-200/80">
                      {item.isOwn ? 'Você' : item.ownerName.split(' ')[0]}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  <span className="inline-flex items-center gap-1.5">
                    {React.createElement(
                      FaCalendarAlt as unknown as React.ComponentType<{ className?: string }>,
                      { className: 'text-[10px]' },
                    )}
                    Realizado em {formatDateBr(item.investedDate)}
                  </span>
                  {item.notes && <span>· {item.notes}</span>}
                </p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                <span className="text-sm font-semibold text-slate-900 tabular-nums">
                  {formatCurrency(item.amount)}
                </span>
                {item.isOwn !== false && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditInvestment(item)}
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                      title="Editar investimento"
                    >
                      {React.createElement(
                        FaEdit as unknown as React.ComponentType<{ className?: string }>,
                        { className: 'text-xs' },
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteInvestment(item.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Excluir investimento"
                    >
                      {React.createElement(
                        FaTrash as unknown as React.ComponentType<{ className?: string }>,
                        { className: 'text-xs' },
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default InvestmentsListSection;
