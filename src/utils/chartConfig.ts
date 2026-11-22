import type { ChartOptions, TooltipItem } from 'chart.js';
import { getActiveLocale } from '../i18n';
import { getCategoryMeta } from './categories';
import { formatCurrency } from './formatters';

export const EXECUTIVE_CHART_PALETTE = [
  '#2563eb',
  '#7c3aed',
  '#ec4899',
  '#10b981',
  '#f59e0b',
  '#e11d48',
  '#06b6d4',
];

export function getExecutiveLineOptions(isDark = false): ChartOptions<'line'> {
  const tickColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#1e293b' : '#f1f5f9';
  const legendColor = isDark ? '#cbd5e1' : '#475569';
  const tooltipBg = isDark ? '#020617' : '#0f172a';

  return {
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: gridColor },
        border: { display: false },
        ticks: {
          color: tickColor,
          font: { size: 11 },
          callback: (value: string | number) =>
            new Intl.NumberFormat(getActiveLocale(), {
              style: 'currency',
              currency: 'BRL',
              maximumFractionDigits: 0,
            }).format(Number(value)),
        },
      },
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: tickColor, font: { size: 11 } },
      },
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          color: legendColor,
          font: { size: 11 },
        },
      },
      tooltip: {
        backgroundColor: tooltipBg,
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: TooltipItem<'line'>) =>
            ` ${ctx.dataset.label}: ${formatCurrency(Number(ctx.parsed.y || 0))}`,
        },
      },
    },
  };
}

export function getExecutiveDoughnutOptions(isDark = false): ChartOptions<'doughnut'> {
  const legendColor = isDark ? '#cbd5e1' : '#334155';
  const tooltipBg = isDark ? '#020617' : '#0f172a';

  return {
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          padding: 14,
          color: legendColor,
          font: { size: 12 },
        },
      },
      tooltip: {
        backgroundColor: tooltipBg,
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: TooltipItem<'doughnut'>) =>
            ` ${ctx.label}: ${formatCurrency(Number(ctx.parsed || 0))}`,
        },
      },
    },
  };
}

export const EXECUTIVE_LINE_OPTIONS: ChartOptions<'line'> = getExecutiveLineOptions(false);
export const EXECUTIVE_DOUGHNUT_OPTIONS: ChartOptions<'doughnut'> = getExecutiveDoughnutOptions(false);

export function buildDoughnutChartData(
  categories: { name: string; value: number; color?: string }[] = [],
  isDark = false,
) {
  return {
    labels: categories.map((c) => c.name),
    datasets: [
      {
        data: categories.map((c) => c.value),
        backgroundColor: categories.map(
          (c, idx) =>
            c.color ||
            getCategoryMeta(c.name)?.color ||
            EXECUTIVE_CHART_PALETTE[idx % EXECUTIVE_CHART_PALETTE.length],
        ),
        borderColor: isDark ? '#0f172a' : '#ffffff',
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };
}

export function buildLineChartData(
  points: { month: string; income: number; expenses: number }[] = [],
  incomeLabel = 'Receitas do Mês',
  expenseLabel = 'Despesas Pagas do Mês',
  isDark = false,
) {
  const expenseStroke = isDark ? '#f8fafc' : '#0f172a';
  const expenseFill = isDark ? 'rgba(248, 250, 252, 0.08)' : 'rgba(15, 23, 42, 0.05)';
  const pointBorder = isDark ? '#0f172a' : '#ffffff';

  return {
    labels: points.map((p) => p.month),
    datasets: [
      {
        label: incomeLabel,
        data: points.map((p) => p.income),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        pointBackgroundColor: '#10b981',
        pointBorderColor: pointBorder,
        pointBorderWidth: 2,
        pointRadius: 3.5,
        borderWidth: 2,
        fill: true,
        tension: 0.25,
      },
      {
        label: expenseLabel,
        data: points.map((p) => p.expenses),
        borderColor: expenseStroke,
        backgroundColor: expenseFill,
        pointBackgroundColor: expenseStroke,
        pointBorderColor: pointBorder,
        pointBorderWidth: 2,
        pointRadius: 3.5,
        borderWidth: 2,
        fill: true,
        tension: 0.25,
      },
    ],
  };
}
