import React from 'react';
import { Doughnut, Line } from 'react-chartjs-2';
import { FaChartLine, FaChartPie } from 'react-icons/fa';
import { ChartDataResponse } from '../../types/finance';
import {
  buildDoughnutChartData,
  buildLineChartData,
  EXECUTIVE_DOUGHNUT_OPTIONS,
  EXECUTIVE_LINE_OPTIONS,
} from '../../utils/chartConfig';

interface Props {
  periodLabel: string;
  chartData: ChartDataResponse | null;
}

const MonthlyChartsSection: React.FC<Props> = ({ periodLabel, chartData }) => {
  const hasCategoryData = (chartData?.expensesByCategory?.length || 0) > 0;
  const doughnutData = buildDoughnutChartData(chartData?.expensesByCategory);
  const lineData = buildLineChartData(chartData?.monthlyHistory);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <div className="lg:col-span-5 exec-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Despesas por Categoria — {periodLabel}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Lançamentos liquidados no mês atual
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/70 text-slate-600 flex items-center justify-center">
            {React.createElement(FaChartPie as any, { className: 'text-xs' })}
          </div>
        </div>
        <div className="h-56 flex items-center justify-center">
          {!chartData ? (
            <p className="text-xs text-slate-400">Carregando indicadores...</p>
          ) : hasCategoryData ? (
            <Doughnut data={doughnutData} options={EXECUTIVE_DOUGHNUT_OPTIONS} />
          ) : (
            <div className="text-center px-4">
              <p className="text-sm font-medium text-slate-500">
                Sem despesas liquidadas neste mês
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Para consultar meses anteriores, acesse a aba <strong>Histórico</strong>.
              </p>
            </div>
          )}
        </div>
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
            {React.createElement(FaChartLine as any, { className: 'text-xs' })}
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
