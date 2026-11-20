import {
  FaBoxOpen,
  FaCar,
  FaGamepad,
  FaHamburger,
  FaHome,
  FaUtensils,
} from 'react-icons/fa';
import { ExpenseItem } from '../types/finance';

export const OFFICIAL_CATEGORIES = [
  'Transporte',
  'Moradia',
  'Lazer',
  'Alimentação',
  'FastFood',
  'Diversos',
] as const;

export type OfficialCategoryName = (typeof OFFICIAL_CATEGORIES)[number];

export interface CategoryMeta {
  name: OfficialCategoryName;
  icon: any;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  iconBgClass: string;
}

export const CATEGORY_META_MAP: Record<OfficialCategoryName, CategoryMeta> = {
  Transporte: {
    name: 'Transporte',
    icon: FaCar,
    color: '#2563eb',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
    iconBgClass: 'bg-blue-100 text-blue-700',
  },
  Moradia: {
    name: 'Moradia',
    icon: FaHome,
    color: '#7c3aed',
    bgClass: 'bg-violet-50',
    textClass: 'text-violet-700',
    borderClass: 'border-violet-200',
    iconBgClass: 'bg-violet-100 text-violet-700',
  },
  Lazer: {
    name: 'Lazer',
    icon: FaGamepad,
    color: '#ec4899',
    bgClass: 'bg-pink-50',
    textClass: 'text-pink-700',
    borderClass: 'border-pink-200',
    iconBgClass: 'bg-pink-100 text-pink-700',
  },
  Alimentação: {
    name: 'Alimentação',
    icon: FaUtensils,
    color: '#10b981',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200',
    iconBgClass: 'bg-emerald-100 text-emerald-700',
  },
  FastFood: {
    name: 'FastFood',
    icon: FaHamburger,
    color: '#f59e0b',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
    iconBgClass: 'bg-amber-100 text-amber-700',
  },
  Diversos: {
    name: 'Diversos',
    icon: FaBoxOpen,
    color: '#06b6d4',
    bgClass: 'bg-cyan-50',
    textClass: 'text-cyan-700',
    borderClass: 'border-cyan-200',
    iconBgClass: 'bg-cyan-100 text-cyan-700',
  },
};

export function normalizeCategoryName(rawName?: string | null): OfficialCategoryName {
  if (!rawName) return 'Diversos';
  const norm = rawName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  if (
    norm.includes('transporte') ||
    norm.includes('uber') ||
    norm.includes('combustivel') ||
    norm.includes('gasolina') ||
    norm.includes('veiculo')
  ) {
    return 'Transporte';
  }
  if (
    norm.includes('moradia') ||
    norm.includes('aluguel') ||
    norm.includes('agua') ||
    norm.includes('energia') ||
    norm.includes('luz') ||
    norm.includes('internet') ||
    norm.includes('condominio') ||
    norm.includes('casa')
  ) {
    return 'Moradia';
  }
  if (
    norm.includes('lazer') ||
    norm.includes('viagem') ||
    norm.includes('cinema') ||
    norm.includes('streaming')
  ) {
    return 'Lazer';
  }
  if (
    norm.includes('fastfood') ||
    norm.includes('fast food') ||
    norm.includes('fast-food') ||
    norm.includes('lanche') ||
    norm.includes('hamburguer') ||
    norm.includes('delivery') ||
    norm.includes('ifood')
  ) {
    return 'FastFood';
  }
  if (
    norm.includes('alimentacao') ||
    norm.includes('mercado') ||
    norm.includes('supermercado') ||
    norm.includes('feira') ||
    norm.includes('restaurante')
  ) {
    return 'Alimentação';
  }
  return 'Diversos';
}

export function getCategoryMeta(rawName?: string | null): CategoryMeta {
  const canonical = normalizeCategoryName(rawName);
  return CATEGORY_META_MAP[canonical];
}

export function filterOfficialAccountTypes<T extends { id: string; name: string }>(
  options: T[],
): T[] {
  const byCanonical = new Map<OfficialCategoryName, T>();

  for (const opt of options) {
    const exact = OFFICIAL_CATEGORIES.find(
      (c) => c.toLowerCase() === opt.name.trim().toLowerCase(),
    );
    if (exact && !byCanonical.has(exact)) {
      byCanonical.set(exact, { ...opt, name: exact });
    } else if (
      opt.name.trim().toLowerCase() === 'fast food' &&
      !byCanonical.has('FastFood')
    ) {
      byCanonical.set('FastFood', { ...opt, name: 'FastFood' });
    }
  }

  for (const opt of options) {
    const canonical = normalizeCategoryName(opt.name);
    if (!byCanonical.has(canonical)) {
      byCanonical.set(canonical, { ...opt, name: canonical });
    }
  }

  return OFFICIAL_CATEGORIES.map((name) => byCanonical.get(name)).filter(
    (item): item is T => Boolean(item),
  );
}

export interface CategoryRealtimeSummary {
  name: OfficialCategoryName;
  value: number;
  count: number;
  percentage: number;
  color: string;
  meta: CategoryMeta;
  items: ExpenseItem[];
}

export function getMonthExpensesForAnalytics(
  expenses: ExpenseItem[],
  monthKey: string,
): ExpenseItem[] {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return [];
  const [targetYear, targetMonth] = monthKey.split('-').map(Number);
  const targetMonthIdx = targetYear * 12 + (targetMonth - 1);

  return expenses
    .filter((exp) => {
      if (!exp.dueDate) return false;
      if (exp.paymentMethod === 'credito' && !exp.isCreditCard) {
        return false;
      }

      const cleanDate = String(exp.dueDate).split('T')[0];
      if (cleanDate.startsWith(monthKey)) {
        return true;
      }

      if (exp.isRecurring) {
        const [ey, em] = cleanDate.split('-').map(Number);
        const expMonthIdx = ey * 12 + (em - 1);
        return targetMonthIdx >= expMonthIdx;
      }

      return false;
    })
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
}

export function computeRealtimeCategoriesForMonth(
  expenses: ExpenseItem[],
  monthKey: string,
  fallbackCategories?: { name: string; value: number }[],
): {
  activeCategories: CategoryRealtimeSummary[];
  allCategories: CategoryRealtimeSummary[];
  monthExpenses: ExpenseItem[];
  totalMonthExpenses: number;
} {
  const monthExpenses = getMonthExpensesForAnalytics(expenses, monthKey);
  const grouped = new Map<OfficialCategoryName, { value: number; items: ExpenseItem[] }>();

  OFFICIAL_CATEGORIES.forEach((cat) => {
    grouped.set(cat, { value: 0, items: [] });
  });

  if (monthExpenses.length > 0) {
    monthExpenses.forEach((exp) => {
      const cat = normalizeCategoryName(exp.accountType?.name);
      const entry = grouped.get(cat)!;
      entry.value += Number(exp.value || 0);
      entry.items.push(exp);
    });
  } else if (fallbackCategories && fallbackCategories.length > 0) {
    fallbackCategories.forEach((c) => {
      const cat = normalizeCategoryName(c.name);
      const entry = grouped.get(cat)!;
      entry.value += Number(c.value || 0);
    });
  }

  const totalMonthExpenses = Array.from(grouped.values()).reduce(
    (acc, curr) => acc + curr.value,
    0,
  );

  const allCategories: CategoryRealtimeSummary[] = OFFICIAL_CATEGORIES.map((cat) => {
    const entry = grouped.get(cat)!;
    const value = Number(entry.value.toFixed(2));
    const percentage =
      totalMonthExpenses > 0
        ? Number(((value / totalMonthExpenses) * 100).toFixed(1))
        : 0;
    const meta = CATEGORY_META_MAP[cat];

    return {
      name: cat,
      value,
      count: entry.items.length,
      percentage,
      color: meta.color,
      meta,
      items: entry.items,
    };
  }).sort((a, b) => b.value - a.value);

  const activeCategories = allCategories.filter((c) => c.value > 0);

  return {
    activeCategories,
    allCategories,
    monthExpenses,
    totalMonthExpenses: Number(totalMonthExpenses.toFixed(2)),
  };
}
