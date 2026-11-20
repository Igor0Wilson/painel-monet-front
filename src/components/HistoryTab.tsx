import React, { useMemo } from 'react';
import { Doughnut, Line } from 'react-chartjs-2';
import {
  FaArrowDown,
  FaArrowUp,
  FaCalendarAlt,
  FaChartLine,
  FaChartPie,
  FaChevronLeft,
  FaChevronRight,
  FaCreditCard,
  FaTag,
  FaUser,
} from 'react-icons/fa';
import { ChartDataResponse, ExpenseItem, IncomeItem } from '../types/finance';
import {
  buildDoughnutChartData,
  buildLineChartData,
  EXECUTIVE_DOUGHNUT_OPTIONS,
  EXECUTIVE_LINE_OPTIONS,
} from '../utils/chartConfig';
import {
  formatCurrency,
  formatDateBr,
  formatMonthLabel,
  shiftMonthKey,
} from '../utils/formatters';
import StatusBadge from './dashboard/StatusBadge';

interface Props {
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  chartData: ChartDataResponse | null;
  expenses: ExpenseItem[];
  incomes: IncomeItem[];
  isFamilyMode: boolean;
}

const HistoryTab: React.FC<Props> = ({
  selectedMonth,
  onSelectMonth,
  chartData,
  expenses,
  incomes,
  isFamilyMode,
}) => {
  const availableMonths: string[] = chartData?.availableMonths || [selectedMonth];

  const monthExpenses = useMemo(() => {
    return expenses
      .filter((e) => e.dueDate && String(e.dueDate).startsWith(selectedMonth))
      .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
  }, [expenses, selectedMonth]);

  const monthIncomes = useMemo(() => {
    const [selYear, selMonth] = selectedMonth.split('-').map(Number);
    const selMonthIndex = selYear * 12 + (selMonth - 1);

    return incomes.filter((inc) => {
      if (!inc.incomeDate) return false;
      const clean = String(inc.incomeDate).split('T')[0];
      const [iy, im] = clean.split('-').map(Number);
      const startMonthIndex = iy * 12 + (im - 1);

      if (!inc.isRecurring) {
        return clean.startsWith(selectedMonth);
      }
      return selMonthIndex >= startMonthIndex;
    });
  }, [incomes, selectedMonth]);

  const hasCategoryData = (chartData?.expensesByCategory?.length || 0) > 0;
  const doughnutData = buildDoughnutChartData(chartData?.expensesByCategory);
  const lineData = buildLineChartData(
    chartData?.monthlyHistory,
    'Receitas Acumuladas',
    'Despesas Pagas Acumuladas',
  );

  const summary = chartData?.monthSummary || {
    totalIncome: 0,
    scheduledIncome: 0,
    totalExpenses: 0,
    netFlow: 0,
  };

  return (
    <div className="space-y-6">
      <div className="exec-card p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Histórico Detalhado {isFamilyMode ? '· Painel Família' : '· Individual'}
          </p>
          <h2 className="text-xl font-semibold text-slate-900 mt-0.5">
            {formatMonthLabel(selectedMonth)}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectMonth(shiftMonthKey(selectedMonth, -1))}
            className="exec-btn-secondary px-3 py-2 text-xs gap-1.5"
          >
            {React.createElement(FaChevronLeft as any, { className: 'text-[10px]' })}
            Anterior
          </button>

          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => e.target.value && onSelectMonth(e.target.value)}
            className="exec-input w-auto py-2 text-xs font-semibold"
          />

          <button
            type="button"
            onClick={() => onSelectMonth(shiftMonthKey(selectedMonth, 1))}
            className="exec-btn-secondary px-3 py-2 text-xs gap-1.5"
          >
            Próximo
            {React.createElement(FaChevronRight as any, { className: 'text-[10px]' })}
          </button>
        </div>
      </div>

      {availableMonths.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-medium text-slate-400 whitespace-nowrap mr-1">
            Meses registrados:
          </span>
          {availableMonths.slice(0, 12).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onSelectMonth(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors ${
                m === selectedMonth
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {formatMonthLabel(m)}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="exec-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Entradas no Mês</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              {React.createElement(FaArrowUp as any, { className: 'text-[11px]' })}
            </span>
          </div>
          <p className="text-2xl font-semibold text-slate-900 tabular-nums">
            {formatCurrency(summary.totalIncome)}
          </p>
          {summary.scheduledIncome > 0 && (
            <p className="text-[11px] text-amber-700 mt-1">
              Previsto/agendado: {formatCurrency(summary.scheduledIncome)}
            </p>
          )}
        </div>

        <div className="exec-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Despesas Pagas no Mês</span>
            <span className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              {React.createElement(FaArrowDown as any, { className: 'text-[11px]' })}
            </span>
          </div>
          <p className="text-2xl font-semibold text-slate-900 tabular-nums">
            {formatCurrency(summary.totalExpenses)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {monthExpenses.length}{' '}
            {monthExpenses.length === 1 ? 'lançamento no mês' : 'lançamentos no mês'}
          </p>
        </div>

        <div className="exec-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Resultado do Mês</span>
          </div>
          <p
            className={`text-2xl font-semibold tabular-nums ${
              summary.netFlow >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {formatCurrency(summary.netFlow)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Entradas menos despesas pagas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 exec-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Despesas por Categoria ({formatMonthLabel(selectedMonth)})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Somente despesas pagas no mês</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/70 text-slate-600 flex items-center justify-center">
              {React.createElement(FaChartPie as any, { className: 'text-xs' })}
            </div>
          </div>
          <div className="h-56 flex items-center justify-center">
            {hasCategoryData ? (
              <Doughnut data={doughnutData} options={EXECUTIVE_DOUGHNUT_OPTIONS} />
            ) : (
              <p className="text-xs text-slate-400 text-center px-4">
                Nenhuma despesa liquidada registrada em {formatMonthLabel(selectedMonth)}.
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 exec-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Fluxo do Mês ({formatMonthLabel(selectedMonth)})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Evolução acumulada de entradas e saídas ao longo dos dias do mês
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/70 text-slate-600 flex items-center justify-center">
              {React.createElement(FaChartLine as any, { className: 'text-xs' })}
            </div>
          </div>
          <div className="h-56">
            {chartData ? (
              <Line data={lineData} options={EXECUTIVE_LINE_OPTIONS} />
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Carregando gráfico...
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 exec-card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Despesas de {formatMonthLabel(selectedMonth)}
              </h3>
              <p className="text-xs text-slate-400">
                Detalhamento completo de contas, compras e parcelas com vencimento no mês
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 tabular-nums">
              {monthExpenses.length} {monthExpenses.length === 1 ? 'item' : 'itens'}
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {monthExpenses.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400">
                Nenhuma despesa registrada para {formatMonthLabel(selectedMonth)}.
              </div>
            ) : (
              monthExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {exp.name}
                      </span>
                      <StatusBadge status={exp.status} paymentMethod={exp.paymentMethod} />
                      {isFamilyMode && exp.ownerName && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-900 text-white">
                          {React.createElement(FaUser as any, { className: 'text-[8px]' })}
                          {exp.ownerName.split(' ')[0]}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        {React.createElement(FaCalendarAlt as any, {
                          className: 'text-[10px] text-slate-400',
                        })}
                        {formatDateBr(exp.dueDate)}
                      </span>
                      {exp.accountType?.name && (
                        <span className="inline-flex items-center gap-1">
                          {React.createElement(FaTag as any, {
                            className: 'text-[10px] text-slate-400',
                          })}
                          {exp.accountType.name}
                        </span>
                      )}
                      {exp.isCreditCard && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                          {React.createElement(FaCreditCard as any, { className: 'text-[10px]' })}
                          Cartão
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 tabular-nums flex-shrink-0">
                    {formatCurrency(Number(exp.value))}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-4 exec-card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Entradas de {formatMonthLabel(selectedMonth)}
              </h3>
              <p className="text-xs text-slate-400">Salários, vales e receitas do período</p>
            </div>
            <span className="text-xs font-semibold text-slate-500 tabular-nums">
              {monthIncomes.length}
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {monthIncomes.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Nenhuma entrada registrada neste mês.
              </div>
            ) : (
              monthIncomes.map((inc) => (
                <div key={inc.id} className="px-6 py-3.5 hover:bg-slate-50/70">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {inc.name}
                      </span>
                      {inc.isRecurring && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                          Fixo
                        </span>
                      )}
                      {isFamilyMode && inc.ownerName && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-900 text-white">
                          {inc.ownerName.split(' ')[0]}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-emerald-700 tabular-nums flex-shrink-0">
                      + {formatCurrency(Number(inc.value))}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Data base: {formatDateBr(inc.incomeDate)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryTab;
