import type { IconType } from 'react-icons';
import i18n from '../i18n';
import {
  FaBoxOpen,
  FaCar,
  FaCouch,
  FaFileInvoiceDollar,
  FaGamepad,
  FaHamburger,
  FaHeartbeat,
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
  'Saúde e Beleza',
  'Móveis e Eletrônicos',
  'Dívidas',
  'Diversos',
] as const;

export type OfficialCategoryName = (typeof OFFICIAL_CATEGORIES)[number];

export interface CategoryMeta {
  name: OfficialCategoryName;
  icon: IconType;
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
    bgClass: 'bg-blue-50 dark:bg-blue-950/40',
    textClass: 'text-blue-700 dark:text-blue-300',
    borderClass: 'border-blue-200 dark:border-blue-800/60',
    iconBgClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  },
  Moradia: {
    name: 'Moradia',
    icon: FaHome,
    color: '#7c3aed',
    bgClass: 'bg-violet-50 dark:bg-violet-950/40',
    textClass: 'text-violet-700 dark:text-violet-300',
    borderClass: 'border-violet-200 dark:border-violet-800/60',
    iconBgClass: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
  },
  Lazer: {
    name: 'Lazer',
    icon: FaGamepad,
    color: '#ec4899',
    bgClass: 'bg-pink-50 dark:bg-pink-950/40',
    textClass: 'text-pink-700 dark:text-pink-300',
    borderClass: 'border-pink-200 dark:border-pink-800/60',
    iconBgClass: 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300',
  },
  Alimentação: {
    name: 'Alimentação',
    icon: FaUtensils,
    color: '#10b981',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    borderClass: 'border-emerald-200 dark:border-emerald-800/60',
    iconBgClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  },
  FastFood: {
    name: 'FastFood',
    icon: FaHamburger,
    color: '#f59e0b',
    bgClass: 'bg-amber-50 dark:bg-amber-950/40',
    textClass: 'text-amber-700 dark:text-amber-300',
    borderClass: 'border-amber-200 dark:border-amber-800/60',
    iconBgClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  },
  'Saúde e Beleza': {
    name: 'Saúde e Beleza',
    icon: FaHeartbeat,
    color: '#e11d48',
    bgClass: 'bg-rose-50 dark:bg-rose-950/40',
    textClass: 'text-rose-700 dark:text-rose-300',
    borderClass: 'border-rose-200 dark:border-rose-800/60',
    iconBgClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
  },
  'Móveis e Eletrônicos': {
    name: 'Móveis e Eletrônicos',
    icon: FaCouch,
    color: '#4f46e5',
    bgClass: 'bg-indigo-50 dark:bg-indigo-950/40',
    textClass: 'text-indigo-700 dark:text-indigo-300',
    borderClass: 'border-indigo-200 dark:border-indigo-800/60',
    iconBgClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
  },
  Dívidas: {
    name: 'Dívidas',
    icon: FaFileInvoiceDollar,
    color: '#ea580c',
    bgClass: 'bg-orange-50 dark:bg-orange-950/40',
    textClass: 'text-orange-700 dark:text-orange-300',
    borderClass: 'border-orange-200 dark:border-orange-800/60',
    iconBgClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  },
  Diversos: {
    name: 'Diversos',
    icon: FaBoxOpen,
    color: '#06b6d4',
    bgClass: 'bg-cyan-50 dark:bg-cyan-950/40',
    textClass: 'text-cyan-700 dark:text-cyan-300',
    borderClass: 'border-cyan-200 dark:border-cyan-800/60',
    iconBgClass: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300',
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
  if (
    norm.includes('saude') ||
    norm.includes('beleza') ||
    norm.includes('farmacia') ||
    norm.includes('medico') ||
    norm.includes('dentista') ||
    norm.includes('academia') ||
    norm.includes('estetica') ||
    norm.includes('salao') ||
    norm.includes('barbearia') ||
    norm.includes('cosmetico')
  ) {
    return 'Saúde e Beleza';
  }
  if (
    norm.includes('moveis') ||
    norm.includes('movel') ||
    norm.includes('eletron') ||
    norm.includes('eletro') ||
    norm.includes('notebook') ||
    norm.includes('computador') ||
    norm.includes('celular') ||
    norm.includes('geladeira') ||
    norm.includes('sofa') ||
    norm.includes('televisao') ||
    norm.includes('monitor')
  ) {
    return 'Móveis e Eletrônicos';
  }
  if (
    norm.includes('divida') ||
    norm.includes('emprestimo') ||
    norm.includes('financiamento') ||
    norm.includes('acordo') ||
    norm.includes('renegociacao')
  ) {
    return 'Dívidas';
  }
  return 'Diversos';
}

export function isFoodCategory(
  rawCategoryName?: string | null,
  expenseDescription?: string | null,
): boolean {
  if (rawCategoryName) {
    const canonical = normalizeCategoryName(rawCategoryName);
    if (canonical === 'Alimentação' || canonical === 'FastFood') {
      return true;
    }
  }
  if (expenseDescription) {
    const normDesc = expenseDescription
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const foodKeywords = [
      'mercado',
      'supermercado',
      'atacadao',
      'assai',
      'carrefour',
      'restaurante',
      'lanche',
      'ifood',
      'comida',
      'refeicao',
      'almoco',
      'jantar',
      'padaria',
      'acougue',
      'hortifruti',
      'feira',
      'burger',
      'mcdonald',
      'pizza',
      'sushi',
      'churrasco',
      'cafeteria',
    ];
    if (foodKeywords.some((kw) => normDesc.includes(kw))) {
      return true;
    }
  }
  return false;
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

export function translateCategoryName(
  rawName?: string | null,
  translator?: (key: string, options?: Record<string, unknown>) => string,
): string {
  const canonical = normalizeCategoryName(rawName);
  const translate = translator || i18n.t.bind(i18n);
  return translate(`categories.${canonical}`, { defaultValue: canonical });
}
