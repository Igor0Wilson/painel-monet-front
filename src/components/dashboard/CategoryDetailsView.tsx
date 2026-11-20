import React, { useMemo, useState } from 'react';
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaChartPie,
  FaChevronLeft,
  FaChevronRight,
  FaCreditCard,
  FaUser,
} from 'react-icons/fa';
import { ExpenseItem } from '../../types/finance';
import {
  computeRealtimeCategoriesForMonth,
  OfficialCategoryName,
} from '../../utils/categories';
import {
  formatCurrency,
  formatDateBr,
  formatMonthLabel,
  shiftMonthKey,
} from '../../utils/formatters';
import StatusBadge from './StatusBadge';

interface Props {
  selectedMonth: string;
  initialCategory?: string | null;
  expenses: ExpenseItem[];
  isFamilyMode: boolean;
  onSelectMonth: (month: string) => void;
  onBack: () => void;
}

const CategoryDetailsView: React.FC<Props> = ({
  selectedMonth,
  initialCategory = null,
  expenses,
  isFamilyMode,
  onSelectMonth,
  onBack,
}) => {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>(
    initialCategory || 'all',
  );

  const { allCategories, activeCategories, totalMonthExpenses, monthExpenses } = useMemo(
    () => computeRealtimeCategoriesForMonth(expenses, selectedMonth),
    [expenses, selectedMonth],
  );

  const displayedCategories = useMemo(() => {
    if (selectedCategoryFilter === 'all') {
      return activeCategories.length > 0 ? activeCategories : allCategories;
    }
    return allCategories.filter((c) => c.name === selectedCategoryFilter);
  }, [allCategories, activeCategories, selectedCategoryFilter]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho com botão Voltar e seletor de mês na mesma linha */}
      <div className="exec-card p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <button
            type="button"
            onClick={onBack}
            className="exec-btn-secondary px-3 py-2 text-xs gap-1.5 flex-shrink-0"
          >
            {React.createElement(FaArrowLeft as any, { className: 'text-[10px]' })}
            <span>Voltar</span>
          </button>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Detalhamento de Gastos por Categoria {isFamilyMode ? '· Família' : '· Individual'}
            </p>
            <h2 className="text-xl font-semibold text-slate-900 mt-0.5">
              {formatMonthLabel(selectedMonth)} — Total: {formatCurrency(totalMonthExpenses)}
            </h2>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 flex-nowrap w-full lg:w-auto">
          <button
            type="button"
            onClick={() => onSelectMonth(shiftMonthKey(selectedMonth, -1))}
            className="exec-btn-secondary px-2.5 sm:px-3 py-2 text-xs gap-1 flex-shrink-0 whitespace-nowrap"
          >
            {React.createElement(FaChevronLeft as any, { className: 'text-[10px]' })}
            <span>Anterior</span>
          </button>

          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => e.target.value && onSelectMonth(e.target.value)}
            className="exec-input flex-1 min-w-0 sm:w-auto px-2.5 sm:px-3 py-2 text-xs font-semibold text-center"
          />

          <button
            type="button"
            onClick={() => onSelectMonth(shiftMonthKey(selectedMonth, 1))}
            className="exec-btn-secondary px-2.5 sm:px-3 py-2 text-xs gap-1 flex-shrink-0 whitespace-nowrap"
          >
            <span>Próximo</span>
            {React.createElement(FaChevronRight as any, { className: 'text-[10px]' })}
          </button>
        </div>
      </div>

      {/* Cards de gasto total em cada uma das 6 categorias */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Gasto Total em Cada Categoria ({monthExpenses.length}{' '}
            {monthExpenses.length === 1 ? 'lançamento' : 'lançamentos'})
          </h3>
          {selectedCategoryFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter('all')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
            >
              Mostrar todas as categorias
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {allCategories.map((cat) => {
            const isSelected = selectedCategoryFilter === cat.name;
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() =>
                  setSelectedCategoryFilter((prev) =>
                    prev === cat.name ? 'all' : (cat.name as OfficialCategoryName),
                  )
                }
                className={`exec-card p-4 text-left transition-all border ${
                  isSelected
                    ? 'ring-2 ring-slate-900 border-slate-900 shadow-md'
                    : 'hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.meta.iconBgClass}`}
                    >
                      {React.createElement(cat.meta.icon as any, { className: 'text-sm' })}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{cat.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {cat.count} {cat.count === 1 ? 'item no mês' : 'itens no mês'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cat.meta.bgClass} ${cat.meta.textClass} ${cat.meta.borderClass}`}
                  >
                    {cat.percentage}%
                  </span>
                </div>

                <p className="text-xl font-bold text-slate-900 tabular-nums">
                  {formatCurrency(cat.value)}
                </p>

                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2.5">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(cat.value > 0 ? 4 : 0, cat.percentage))}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista detalhada de cada gasto por item e por data em cada categoria */}
      {monthExpenses.length === 0 ? (
        <div className="exec-card p-10 text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            {React.createElement(FaChartPie as any, { className: 'text-sm' })}
          </div>
          <p className="text-sm font-semibold text-slate-700">
            Nenhum gasto registrado em {formatMonthLabel(selectedMonth)}
          </p>
          <p className="text-xs text-slate-400">
            Adicione uma despesa ou selecione outro mês acima para visualizar cada item por data e
            categoria.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {displayedCategories.map((cat) => (
            <div key={cat.name} className="exec-card overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.meta.iconBgClass}`}
                  >
                    {React.createElement(cat.meta.icon as any, { className: 'text-sm' })}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-900">{cat.name}</h4>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cat.meta.bgClass} ${cat.meta.textClass} ${cat.meta.borderClass}`}
                      >
                        {cat.percentage}% do mês
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {cat.count} {cat.count === 1 ? 'gasto registrado' : 'gastos registrados'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Total da Categoria
                  </span>
                  <span className="text-base font-bold text-slate-900 tabular-nums">
                    {formatCurrency(cat.value)}
                  </span>
                </div>
              </div>

              {cat.items.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Nenhum lançamento nesta categoria em {formatMonthLabel(selectedMonth)}.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {cat.items.map((item) => (
                    <div
                      key={item.id}
                      className="px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900 truncate">
                            {item.name}
                          </span>
                          <StatusBadge
                            status={item.status}
                            paymentMethod={item.paymentMethod}
                          />
                          {isFamilyMode && item.ownerName && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-900 text-white">
                              {React.createElement(FaUser as any, { className: 'text-[8px]' })}
                              {item.ownerName.split(' ')[0]}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
                            {React.createElement(FaCalendarAlt as any, {
                              className: 'text-[10px] text-slate-400',
                            })}
                            Data: {formatDateBr(item.dueDate)}
                          </span>
                          {item.isCreditCard && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              {React.createElement(FaCreditCard as any, {
                                className: 'text-[10px]',
                              })}
                              Fatura Cartão
                            </span>
                          )}
                          {item.isRecurring && (
                            <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              Fixa mensal
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-1.5 sm:pt-0 border-t sm:border-0 border-slate-100">
                        <span className="text-xs text-slate-400 sm:hidden">Valor do item</span>
                        <span className="text-sm font-bold text-slate-900 tabular-nums">
                          {formatCurrency(Number(item.value))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryDetailsView;
