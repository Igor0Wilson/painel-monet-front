import { getCategoryMeta } from './categories';
import { formatCurrency } from './formatters';

export const EXECUTIVE_CHART_PALETTE = [
  '#2563eb',
  '#7c3aed',
  '#ec4899',
  '#10b981',
  '#f59e0b',
  '#06b6d4',
];

export const EXECUTIVE_LINE_OPTIONS: any = {
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: '#f1f5f9' },
      border: { display: false },
      ticks: {
        color: '#64748b',
        font: { size: 11 },
        callback: (value: number) =>
          new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0,
          }).format(value),
      },
    },
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: '#64748b', font: { size: 11, weight: '500' } },
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
        color: '#475569',
        font: { size: 11, weight: '500' },
      },
    },
    tooltip: {
      backgroundColor: '#0f172a',
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: (ctx: any) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`,
      },
    },
  },
};

export const EXECUTIVE_DOUGHNUT_OPTIONS: any = {
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
        color: '#334155',
        font: { size: 12 },
      },
    },
    tooltip: {
      backgroundColor: '#0f172a',
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: (ctx: any) => ` ${ctx.label}: ${formatCurrency(ctx.parsed)}`,
      },
    },
  },
};

export function buildDoughnutChartData(
  categories: { name: string; value: number; color?: string }[] = [],
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
        borderColor: '#ffffff',
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
) {
  return {
    labels: points.map((p) => p.month),
    datasets: [
      {
        label: incomeLabel,
        data: points.map((p) => p.income),
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.08)',
        pointBackgroundColor: '#059669',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 3.5,
        borderWidth: 2,
        fill: true,
        tension: 0.25,
      },
      {
        label: expenseLabel,
        data: points.map((p) => p.expenses),
        borderColor: '#0f172a',
        backgroundColor: 'rgba(15, 23, 42, 0.05)',
        pointBackgroundColor: '#0f172a',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 3.5,
        borderWidth: 2,
        fill: true,
        tension: 0.25,
      },
    ],
  };
}
