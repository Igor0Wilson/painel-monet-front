import { getActiveLocale } from '../i18n';

export function onlyDigits(raw?: string | null): string {
  if (!raw) return '';
  return String(raw).replace(/\D/g, '');
}

export function formatCpfInput(raw?: string | null): string {
  const digits = onlyDigits(raw).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function maskCpf(raw?: string | null): string {
  const digits = onlyDigits(raw);
  if (digits.length !== 11) return '***.***.***-**';
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}

export function maskPixKey(raw?: string | null): string {
  const clean = (raw || '').trim();
  if (!clean) return '';
  if (clean.includes('@')) {
    const [local, domain] = clean.split('@');
    const safeLocal =
      local.length <= 2 ? `${local[0] || '*'}*` : `${local.slice(0, 2)}***`;
    return `${safeLocal}@${domain || '***'}`;
  }
  if (clean.length <= 4) {
    return `**${clean.slice(-2)}`;
  }
  if (clean.length <= 8) {
    return `${clean.slice(0, 2)}***${clean.slice(-2)}`;
  }
  return `${clean.slice(0, 3)}***${clean.slice(-3)}`;
}

export function normalizeCardLast4Input(raw?: string | null): string {
  return String(raw || '').replace(/\D/g, '').slice(0, 4);
}

export function formatPhoneInput(raw?: string | null): string {
  const digits = onlyDigits(raw).slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function buildWhatsAppUrl(phone?: string | null): string | null {
  const digits = onlyDigits(phone);
  if (digits.length < 10) return null;
  const full = digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`;
  return `https://wa.me/${full}`;
}

export interface LocaleFormattingConfig {
  locale: 'pt-BR' | 'en-US' | 'es-ES';
  currency: 'BRL' | 'USD' | 'EUR';
  thousandsSeparator: '.' | ',';
  decimalSeparator: ',' | '.';
  currencyPlaceholder: string;
}

export function getLocaleFormatting(localeOverride?: string): LocaleFormattingConfig {
  const active = getActiveLocale();
  const locale =
    localeOverride === 'en-US' || localeOverride === 'es-ES' || localeOverride === 'pt-BR'
      ? localeOverride
      : active;
  if (locale === 'en-US') {
    return {
      locale: 'en-US',
      currency: 'USD',
      thousandsSeparator: ',',
      decimalSeparator: '.',
      currencyPlaceholder: '0.00',
    };
  }
  if (locale === 'es-ES') {
    return {
      locale: 'es-ES',
      currency: 'EUR',
      thousandsSeparator: '.',
      decimalSeparator: ',',
      currencyPlaceholder: '0,00',
    };
  }
  return {
    locale: 'pt-BR',
    currency: 'BRL',
    thousandsSeparator: '.',
    decimalSeparator: ',',
    currencyPlaceholder: '0,00',
  };
}

export function getCurrencyPlaceholder(): string {
  return getLocaleFormatting().currencyPlaceholder;
}

export function formatCurrency(val: number): string {
  const { locale, currency } = getLocaleFormatting();
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(val || 0);
}

export function formatDateBr(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const clean = String(dateStr).split('T')[0];
  const parts = clean.split('-');
  if (parts.length !== 3) return dateStr;
  if (getActiveLocale() === 'en-US') {
    return `${parts[1]}/${parts[2]}/${parts[0]}`;
  }
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatMonthLabel(monthKey: string, localeOverride?: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return monthKey;
  const locale = localeOverride || getActiveLocale();
  const label = new Date(y, m - 1, 1).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatShortDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const clean = String(dateStr).split('T')[0];
  const parts = clean.split('-');
  if (parts.length !== 3) return dateStr;
  if (getActiveLocale() === 'en-US') {
    return `${parts[1]}/${parts[2]}`;
  }
  return `${parts[2]}/${parts[1]}`;
}

export function formatMonthShortLabel(monthKey?: string | null): string {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
    return monthKey || '-';
  }
  const [year, month] = monthKey.split('-').map(Number);
  const locale = getActiveLocale();
  const label = new Date(year, month - 1, 1)
    .toLocaleDateString(locale, { month: 'short' })
    .replace('.', '');
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : monthKey;
}

const PT_SHORT_MONTH_MAP: Record<string, number> = {
  jan: 0,
  fev: 1,
  mar: 2,
  abr: 3,
  mai: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  set: 8,
  out: 9,
  nov: 10,
  dez: 11,
};

export function formatChartDayLabel(
  point: { month: string; day?: number },
  monthKey?: string,
  localeOverride?: string,
): string {
  const locale = getLocaleFormatting(localeOverride).locale;
  let dayNum = typeof point.day === 'number' && point.day >= 1 ? point.day : NaN;
  let yearNum = new Date().getFullYear();
  let monthIdx = NaN;

  if (monthKey && /^\d{4}-\d{2}$/.test(monthKey)) {
    const [y, m] = monthKey.split('-').map(Number);
    yearNum = y;
    monthIdx = m - 1;
  }

  if (Number.isNaN(dayNum) || Number.isNaN(monthIdx)) {
    const match = String(point.month || '')
      .trim()
      .toLowerCase()
      .match(/^(\d{1,2})\/([a-zç]+)$/);
    if (match) {
      if (Number.isNaN(dayNum)) dayNum = Number(match[1]);
      if (Number.isNaN(monthIdx) && match[2] in PT_SHORT_MONTH_MAP) {
        monthIdx = PT_SHORT_MONTH_MAP[match[2]];
      }
    }
  }

  if (Number.isNaN(dayNum) || Number.isNaN(monthIdx)) {
    return point.month;
  }

  const dayStr = String(dayNum).padStart(2, '0');
  const shortMonth = new Date(yearNum, monthIdx, dayNum)
    .toLocaleDateString(locale, { month: 'short' })
    .replace('.', '');

  if (locale === 'en-US') {
    const capitalized =
      shortMonth.charAt(0).toUpperCase() + shortMonth.slice(1);
    return `${capitalized} ${dayStr}`;
  }

  return `${dayStr}/${shortMonth.toLowerCase()}`;
}

function formatUsCurrencyInput(
  raw?: string | number | null,
  prevFormatted = '',
): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw < 0) return '';
    return formatNumberToCurrencyInput(raw);
  }

  const trimmed = String(raw).trim();
  if (!trimmed) return '';

  const cleaned = trimmed.replace(/[^0-9.,]/g, '');
  if (!cleaned) return '';

  if (prevFormatted && cleaned === prevFormatted.replace(/[^0-9.,]/g, '')) {
    return prevFormatted;
  }

  const dotIdx = cleaned.indexOf('.');
  if (dotIdx === -1) {
    const intDigits = cleaned.replace(/\D/g, '');
    if (!intDigits) return '';
    const normalizedInt = intDigits.replace(/^0+(?=\d)/, '');
    return (normalizedInt || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  const intPartRaw = cleaned.slice(0, dotIdx);
  const decPartRaw = cleaned.slice(dotIdx + 1);
  const intDigits = intPartRaw.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  const intFormatted = (intDigits || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const decDigits = decPartRaw.replace(/\D/g, '').slice(0, 2);
  return `${intFormatted}.${decDigits}`;
}

export function formatCurrencyInput(
  raw?: string | number | null,
  prevFormatted = '',
): string {
  if (getLocaleFormatting().decimalSeparator === '.') {
    return formatUsCurrencyInput(raw, prevFormatted);
  }
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'number') {
    return formatNumberToCurrencyInput(raw);
  }

  const cleaned = String(raw).replace(/[^\d.,]/g, '');
  if (!cleaned) return '';

  let hasComma = cleaned.includes(',');
  let intPart = cleaned;
  let decPart = '';

  if (hasComma) {
    const commaIdx = cleaned.indexOf(',');
    intPart = cleaned.slice(0, commaIdx);
    decPart = cleaned.slice(commaIdx + 1);
  } else {
    const dotsNow = (cleaned.match(/\./g) || []).length;
    const dotsPrev = (String(prevFormatted || '').match(/\./g) || []).length;

    if (dotsNow > dotsPrev) {
      const lastDotIdx = cleaned.lastIndexOf('.');
      const afterLastDot = cleaned.slice(lastDotIdx + 1).replace(/\D/g, '');
      const beforeLastDot = cleaned.slice(0, lastDotIdx).replace(/\D/g, '');
      const looksLikeBrazilianThousandGroup =
        dotsNow === 1 &&
        !cleaned.endsWith('.') &&
        beforeLastDot.length >= 1 &&
        beforeLastDot.length <= 3 &&
        afterLastDot.length === 3 &&
        prevFormatted === '';

      if (!looksLikeBrazilianThousandGroup) {
        hasComma = true;
        intPart = cleaned.slice(0, lastDotIdx);
        decPart = cleaned.slice(lastDotIdx + 1);
      }
    } else if (dotsNow === 1 && prevFormatted === '' && !cleaned.endsWith('.')) {
      const lastDotIdx = cleaned.lastIndexOf('.');
      const beforeDot = cleaned.slice(0, lastDotIdx).replace(/\D/g, '');
      const afterDot = cleaned.slice(lastDotIdx + 1).replace(/\D/g, '');
      const looksLikeBrazilianThousandGroup =
        beforeDot.length >= 1 && beforeDot.length <= 3 && afterDot.length === 3;
      if (!looksLikeBrazilianThousandGroup) {
        hasComma = true;
        intPart = cleaned.slice(0, lastDotIdx);
        decPart = cleaned.slice(lastDotIdx + 1);
      }
    }
  }

  const rawIntDigits = intPart.replace(/\D/g, '');
  const intDigits = rawIntDigits.replace(/^0+(?=\d)/, '');

  if (!intDigits && !hasComma) {
    return '';
  }

  const intFormatted = (intDigits || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (!hasComma) {
    return intFormatted;
  }

  const decDigits = decPart.replace(/\D/g, '').slice(0, 2);
  return `${intFormatted},${decDigits}`;
}

export function formatNumberToCurrencyInput(val?: number | null): string {
  if (val === null || val === undefined || isNaN(val)) return '';
  const { thousandsSeparator, decimalSeparator } = getLocaleFormatting();
  const safeVal = Math.max(0, Number(val));
  if (safeVal === 0) return '0';
  if (Number.isInteger(safeVal)) {
    return String(safeVal).replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
  }
  const [intPart, decPart] = safeVal.toFixed(2).split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
  return `${formattedInt}${decimalSeparator}${decPart}`;
}

export function parseCurrencyInput(raw?: string | number | null): number {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : 0;
  }
  if (!raw) return 0;

  const cleaned = String(raw).trim().replace(/[^\d.,]/g, '');
  if (!cleaned) return 0;

  const { decimalSeparator } = getLocaleFormatting();
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  let normalized = cleaned;
  if (hasComma && hasDot) {
    if (cleaned.lastIndexOf('.') > cleaned.lastIndexOf(',')) {
      normalized = cleaned.replace(/,/g, '');
    } else {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    }
  } else if (hasComma) {
    const commas = (cleaned.match(/,/g) || []).length;
    const [, afterComma = ''] = cleaned.split(',');
    if (
      decimalSeparator === '.' &&
      (commas > 1 || (commas === 1 && afterComma.length === 3))
    ) {
      normalized = cleaned.replace(/,/g, '');
    } else {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    }
  } else if (hasDot) {
    const dots = (cleaned.match(/\./g) || []).length;
    if (dots > 1) {
      normalized = cleaned.replace(/\./g, '');
    } else if (dots === 1 && decimalSeparator === ',') {
      const [, afterDot = ''] = cleaned.split('.');
      if (afterDot.length === 3) {
        normalized = cleaned.replace(/\./g, '');
      }
    }
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

type TranslateFn = (key: string, opts?: Record<string, unknown>) => string;

export function formatExpenseDisplayName(
  name: string | undefined | null,
  t: TranslateFn,
): string {
  const safe = String(name || '');
  if (!safe) return '';
  const localizedCredit = t('paymentMethods.credito');
  return safe.replace(/\[Cr[eé]dito((?:\s+\d+\/\d+)?)\]/gi, `[${localizedCredit}$1]`);
}

const INVESTMENT_CATEGORY_KEY_MAP: Record<string, string> = {
  'renda fixa': 'modals.investments.categories.Renda Fixa',
  'fixed income': 'modals.investments.categories.Renda Fixa',
  'renta fija': 'modals.investments.categories.Renda Fixa',
  'tesouro direto': 'modals.investments.categories.Tesouro Direto',
  'treasury bonds': 'modals.investments.categories.Tesouro Direto',
  'bonos del tesoro': 'modals.investments.categories.Tesouro Direto',
  'ações / fiis': 'modals.investments.categories.Ações / FIIs',
  'acoes / fiis': 'modals.investments.categories.Ações / FIIs',
  'ações': 'modals.investments.categories.Ações / FIIs',
  acoes: 'modals.investments.categories.Ações / FIIs',
  'fundos imobiliários': 'modals.investments.categories.Ações / FIIs',
  'fundos imobiliarios': 'modals.investments.categories.Ações / FIIs',
  'stocks / reits': 'modals.investments.categories.Ações / FIIs',
  'acciones / reits': 'modals.investments.categories.Ações / FIIs',
  'acciones / socimis': 'modals.investments.categories.Ações / FIIs',
  fundos: 'modals.investments.categories.Fundos',
  funds: 'modals.investments.categories.Fundos',
  fondos: 'modals.investments.categories.Fundos',
  cripto: 'modals.investments.categories.Cripto',
  criptomoedas: 'modals.investments.categories.Cripto',
  crypto: 'modals.investments.categories.Cripto',
  criptomonedas: 'modals.investments.categories.Cripto',
  'previdência': 'modals.investments.categories.Previdência',
  previdencia: 'modals.investments.categories.Previdência',
  retirement: 'modals.investments.categories.Previdência',
  pensiones: 'modals.investments.categories.Previdência',
  outros: 'modals.investments.categories.Outros',
  other: 'modals.investments.categories.Outros',
  otros: 'modals.investments.categories.Outros',
};

export function translateInvestmentCategory(
  category: string | undefined | null,
  t: TranslateFn,
): string {
  const raw = String(category || '').trim();
  if (!raw) return t('modals.investments.categories.Outros');
  const key = INVESTMENT_CATEGORY_KEY_MAP[raw.toLowerCase()];
  return key ? t(key) : raw;
}
