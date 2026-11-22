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

export function formatCurrency(val: number): string {
  const locale = getActiveLocale();
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'BRL',
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

export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return monthKey;
  const locale = getActiveLocale();
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

export function formatCurrencyInput(
  raw?: string | number | null,
  prevFormatted = '',
): string {
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
  const safeVal = Math.max(0, Number(val));
  if (safeVal === 0) return '0';
  if (Number.isInteger(safeVal)) {
    return String(safeVal).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  return safeVal.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseCurrencyInput(raw?: string | number | null): number {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : 0;
  }
  if (!raw) return 0;

  const cleaned = String(raw).trim().replace(/[^\d.,]/g, '');
  if (!cleaned) return 0;

  let normalized = cleaned;
  if (cleaned.includes(',')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    const dots = (cleaned.match(/\./g) || []).length;
    if (dots > 1) {
      normalized = cleaned.replace(/\./g, '');
    } else if (dots === 1) {
      const [, afterDot = ''] = cleaned.split('.');
      if (afterDot.length === 3) {
        normalized = cleaned.replace(/\./g, '');
      }
    }
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
