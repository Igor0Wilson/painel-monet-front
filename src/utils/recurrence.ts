import { ExpenseItem, IncomeItem } from '../types/finance';

export interface IsoDateParts {
  year: number;
  month: number;
  day: number;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function parseIsoDateParts(dateStr?: string | null): IsoDateParts | null {
  if (!dateStr) return null;
  const clean = String(dateStr).split('T')[0].trim();
  const parts = clean.split('-');
  if (parts.length !== 3) return null;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  return { year, month, day: Math.min(day, getDaysInMonth(year, month)) };
}

export function formatIsoDateParts(year: number, month: number, day: number): string {
  const safeDay = Math.min(Math.max(1, day), getDaysInMonth(year, month));
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
}

export function addMonthsIso(dateStr: string, deltaMonths: number): string {
  const parsed = parseIsoDateParts(dateStr);
  if (!parsed) return dateStr;
  const zeroMonth = parsed.month - 1 + deltaMonths;
  const year = parsed.year + Math.floor(zeroMonth / 12);
  const monthIndex = ((zeroMonth % 12) + 12) % 12;
  const month = monthIndex + 1;
  return formatIsoDateParts(year, month, parsed.day);
}

export function getTodayLocalIso(): string {
  const now = new Date();
  return formatIsoDateParts(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
  );
}

export function getNextMonthLocalIso(): string {
  return addMonthsIso(getTodayLocalIso(), 1);
}

export function getMonthKeyFromIso(dateStr?: string | null): string {
  const parts = parseIsoDateParts(dateStr);
  if (!parts) return '';
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}`;
}

export function compareIsoDates(a: string, b: string): number {
  const pa = parseIsoDateParts(a);
  const pb = parseIsoDateParts(b);
  if (!pa || !pb) return a.localeCompare(b);
  if (pa.year !== pb.year) return pa.year - pb.year;
  if (pa.month !== pb.month) return pa.month - pb.month;
  return pa.day - pb.day;
}

export function monthKeyToIndex(monthKey?: string | null): number | null {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return null;
  const [y, m] = monthKey.split('-').map(Number);
  return y * 12 + (m - 1);
}

export function computeOccurrenceStatus(
  dueDate: string,
  isPaid: boolean,
  todayIso = getTodayLocalIso(),
): 'pago' | 'em_atraso' | 'pendente' {
  if (isPaid) return 'pago';
  if (!dueDate) return 'pendente';
  return compareIsoDates(dueDate, todayIso) < 0 ? 'em_atraso' : 'pendente';
}

export interface EffectiveIncomeForMonth {
  applies: boolean;
  value: number;
  name: string;
  date: string;
  day: number;
  status: 'creditado' | 'agendado';
  hasOverride: boolean;
}

export function getEffectiveIncomeForMonth(
  income: IncomeItem,
  monthKey: string,
  todayIso = getTodayLocalIso(),
): EffectiveIncomeForMonth {
  const parsed = parseIsoDateParts(income.incomeDate);
  const targetIdx = monthKeyToIndex(monthKey);
  if (!parsed || targetIdx === null) {
    return {
      applies: false,
      value: Number(income.value || 0),
      name: income.name,
      date: income.incomeDate,
      day: 1,
      status: 'agendado',
      hasOverride: false,
    };
  }

  const startKey = `${String(parsed.year).padStart(4, '0')}-${String(parsed.month).padStart(2, '0')}`;
  const startIdx = parsed.year * 12 + (parsed.month - 1);

  if (!income.isRecurring) {
    const applies = startKey === monthKey;
    const status =
      compareIsoDates(income.incomeDate, todayIso) <= 0
        ? 'creditado'
        : 'agendado';
    return {
      applies,
      value: Number(income.value || 0),
      name: income.name,
      date: formatIsoDateParts(parsed.year, parsed.month, parsed.day),
      day: parsed.day,
      status,
      hasOverride: false,
    };
  }

  if (targetIdx < startIdx) {
    return {
      applies: false,
      value: 0,
      name: income.name,
      date: '',
      day: parsed.day,
      status: 'agendado',
      hasOverride: false,
    };
  }

  const endIdx = monthKeyToIndex(income.recurrenceEndMonth);
  if (endIdx !== null && targetIdx > endIdx) {
    return {
      applies: false,
      value: 0,
      name: income.name,
      date: '',
      day: parsed.day,
      status: 'agendado',
      hasOverride: false,
    };
  }

  const ov = income.monthlyOverrides?.[monthKey];
  if (ov?.skipped) {
    return {
      applies: false,
      value: 0,
      name: income.name,
      date: '',
      day: parsed.day,
      status: 'agendado',
      hasOverride: true,
    };
  }

  const [ty, tm] = monthKey.split('-').map(Number);
  const day = ov?.day ?? parsed.day;
  const date = formatIsoDateParts(ty, tm, day);
  const value = ov?.value !== undefined ? Number(ov.value) : Number(income.value || 0);
  const name = ov?.name ?? income.name;
  const status = compareIsoDates(date, todayIso) <= 0 ? 'creditado' : 'agendado';

  return {
    applies: true,
    value,
    name,
    date,
    day: Math.min(day, getDaysInMonth(ty, tm)),
    status,
    hasOverride: Boolean(ov && (ov.value !== undefined || ov.name !== undefined || ov.day !== undefined)),
  };
}

export function projectExpensesForMonth(
  expenses: ExpenseItem[],
  monthKey: string,
  todayIso = getTodayLocalIso(),
): ExpenseItem[] {
  const targetIdx = monthKeyToIndex(monthKey);
  if (targetIdx === null) return [];

  const materializedParents = new Set<string>();
  for (const exp of expenses) {
    if (exp.recurrenceParentId && exp.occurrenceMonth === monthKey) {
      materializedParents.add(exp.recurrenceParentId);
    }
  }

  const [targetYear, targetMonth] = monthKey.split('-').map(Number);
  const result: ExpenseItem[] = [];

  for (const exp of expenses) {
    if (!exp.dueDate) continue;
    const parsed = parseIsoDateParts(exp.dueDate);
    if (!parsed) continue;

    const cleanDate = formatIsoDateParts(parsed.year, parsed.month, parsed.day);
    const startKey = `${String(parsed.year).padStart(4, '0')}-${String(parsed.month).padStart(2, '0')}`;
    const startIdx = parsed.year * 12 + (parsed.month - 1);

    if (!exp.isRecurring) {
      if (cleanDate.startsWith(monthKey)) {
        result.push({
          ...exp,
          _occurrenceMonth: monthKey,
        });
      }
      continue;
    }

    if (targetIdx < startIdx) continue;
    const endIdx = monthKeyToIndex(exp.recurrenceEndMonth);
    if (endIdx !== null && targetIdx > endIdx) continue;

    if (materializedParents.has(exp.id)) {
      continue;
    }

    const ov = exp.monthlyOverrides?.[monthKey];
    if (ov?.skipped) continue;

    const effectiveDay = ov?.day ?? parsed.day;
    const effectiveDueDate = formatIsoDateParts(targetYear, targetMonth, effectiveDay);
    const effectiveValue =
      ov?.value !== undefined ? Number(ov.value) : Number(exp.value || 0);
    const effectiveName = ov?.name ?? exp.name;
    const effectiveAccountTypeId = ov?.accountTypeId ?? exp.accountTypeId;

    const isSameStartMonth = startKey === monthKey;
    const effectiveIsPaid = isSameStartMonth ? Boolean(exp.isPaid) : false;
    const effectiveRemaining = effectiveIsPaid
      ? 0
      : isSameStartMonth && exp.remainingAmount !== undefined
        ? exp.remainingAmount
        : effectiveValue;
    const effectiveStatus = computeOccurrenceStatus(
      effectiveDueDate,
      effectiveIsPaid,
      todayIso,
    );

    result.push({
      ...exp,
      name: effectiveName,
      value: effectiveValue,
      accountTypeId: effectiveAccountTypeId,
      dueDate: effectiveDueDate,
      isPaid: effectiveIsPaid,
      paidAmount: isSameStartMonth ? exp.paidAmount : 0,
      remainingAmount: effectiveRemaining,
      isPartiallyPaid: isSameStartMonth ? exp.isPartiallyPaid : false,
      payments: isSameStartMonth ? exp.payments : [],
      status: effectiveStatus,
      _occurrenceMonth: monthKey,
      _projectedFromRecurringId: isSameStartMonth ? undefined : exp.id,
      _hasMonthOverride: Boolean(
        ov &&
          (ov.value !== undefined ||
            ov.name !== undefined ||
            ov.day !== undefined ||
            ov.accountTypeId !== undefined),
      ),
    });
  }

  return result.sort((a, b) => compareIsoDates(a.dueDate, b.dueDate));
}
