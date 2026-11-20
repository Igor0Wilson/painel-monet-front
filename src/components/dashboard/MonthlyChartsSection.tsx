import React, { useMemo } from 'react';
import type { ActiveElement, ChartEvent, ChartOptions } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import { FaChartLine, FaChartPie, FaExternalLinkAlt } from 'react-icons/fa';
import { ChartDataResponse, ExpenseItem } from '../../types/finance';
import { computeRealtimeCategoriesForMonth } from '../../utils/categories';
import {
  buildDoughnutChartData,
  buildLineChartData,
  EXECUTIVE_DOUGHNUT_OPTIONS,
  EXECUTIVE_LINE_OPTIONS,
} from '../../utils/chartConfig';
import { formatCurrency } from '../../utils/formatters';

interface Props {
  periodLabel: string;
  monthKey: string;
  expenses: ExpenseItem[];
  chartData: ChartDataResponse | null;
  onOpenCategoryDetail: (categoryName?: string | null) => void;
}

const MonthlyChartsSection: React.FC<Props> = ({
  periodLabel,
  monthKey,
  expenses,
  chartData,
  onOpenCategoryDetail,
}) => {
  const { activeCategories } = useMemo(
    () =>
      computeRealtimeCategoriesForMonth(
        expenses,
        monthKey,
        chartData?.expensesByCategory,
      ),
    [expenses, monthKey, chartData?.expensesByCategory],
  );

  const hasCategoryData = activeCategories.length > 0;
  const doughnutData = useMemo(
    () => buildDoughnutChartData(activeCategories),
    [activeCategories],
  );
  const lineData = buildLineChartData(chartData?.monthlyHistory);

  const interactiveDoughnutOptions = useMemo<ChartOptions<'doughnut'>>(
    () => ({
      ...EXECUTIVE_DOUGHNUT_OPTIONS,
      onClick: (_event: ChartEvent, elements: ActiveElement[]) => {
        if (elements && elements.length > 0) {
          const clickedIndex = elements[0].index;
          const cat = activeCategories[clickedIndex];
          onOpenCategoryDetail(cat?.name || null);
        } else {
          onOpenCategoryDetail(null);
        }
      },
    }),
    [activeCategories, onOpenCategoryDetail],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <div className="lg:col-span-5 exec-card p-6 flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Despesas por Categoria — {periodLabel}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Toque no gráfico para ver cada gasto por item e data
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenCategoryDetail(null)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-[11px] font-semibold transition-colors flex-shrink-0"
            title="Abrir tela detalhada de gastos por categoria"
          >
            {React.createElement(FaChartPie as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
            <span>Detalhar</span>
            {React.createElement(FaExternalLinkAlt as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[9px]' })}
          </button>
        </div>

        <div
          onClick={() => {
            if (!hasCategoryData) onOpenCategoryDetail(null);
          }}
          className="h-52 flex items-center justify-center cursor-pointer"
          title="Clique para abrir o detalhamento de gastos por categoria"
        >
          {!chartData && expenses.length === 0 ? (
            <p className="text-xs text-slate-400">Carregando indicadores...</p>
          ) : hasCategoryData ? (
            <Doughnut data={doughnutData} options={interactiveDoughnutOptions} />
          ) : (
            <div className="text-center px-4">
              <p className="text-sm font-medium text-slate-500">
                Sem gastos registrados neste mês
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Toque aqui ou adicione uma despesa para acompanhar suas categorias em tempo real.
              </p>
            </div>
          )}
        </div>

        {hasCategoryData && (
          <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-2 gap-2">
            {activeCategories.map((cat) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => onOpenCategoryDetail(cat.name)}
                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 transition-all text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${cat.meta.iconBgClass}`}
                  >
                    {React.createElement(cat.meta.icon as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
                  </span>
                  <span className="text-xs font-semibold text-slate-800 truncate">
                    {cat.name}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-900 tabular-nums flex-shrink-0">
                  {formatCurrency(cat.value)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="lg:col-span-7 exec-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Fluxo de Caixa — {periodLabel}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Evolução de entradas e despesas pagas no mês atual
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/70 text-slate-600 flex items-center justify-center">
            {React.createElement(FaChartLine as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
          </div>
        </div>
        <div className="h-56">
          {chartData ? (
            <Line data={lineData} options={EXECUTIVE_LINE_OPTIONS} />
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Carregando gráfico do mês...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonthlyChartsSection;
