import {
  buildWhatsAppUrl,
  formatCpfInput,
  formatCurrency,
  formatCurrencyInput,
  formatDateBr,
  formatMonthLabel,
  formatNumberToCurrencyInput,
  formatPhoneInput,
  maskCpf,
  maskPixKey,
  normalizeCardLast4Input,
  onlyDigits,
  parseCurrencyInput,
  shiftMonthKey,
} from '../../src/utils/formatters';

describe('formatters', () => {
  it('strips non-digits cleanly', () => {
    expect(onlyDigits('123.456.789-01')).toBe('12345678901');
    expect(onlyDigits(null)).toBe('');
  });

  it('formats CPF progressively as user types', () => {
    expect(formatCpfInput('123')).toBe('123');
    expect(formatCpfInput('123456')).toBe('123.456');
    expect(formatCpfInput('123456789')).toBe('123.456.789');
    expect(formatCpfInput('12345678901')).toBe('123.456.789-01');
  });

  it('masks CPF safely for UI display', () => {
    expect(maskCpf('12345678901')).toBe('***.456.789-**');
    expect(maskCpf('123')).toBe('***.***.***-**');
  });

  it('formats phone numbers and builds safe WhatsApp links', () => {
    expect(formatPhoneInput('11999998888')).toBe('(11) 99999-8888');
    expect(formatPhoneInput('1133334444')).toBe('(11) 3333-4444');
    expect(buildWhatsAppUrl('(11) 99999-8888')).toBe('https://wa.me/5511999998888');
    expect(buildWhatsAppUrl('5511999998888')).toBe('https://wa.me/5511999998888');
    expect(buildWhatsAppUrl('12345')).toBeNull();
  });

  it('formats dates, currencies, and shifts months accurately', () => {
    expect(formatDateBr('2026-11-19')).toBe('19/11/2026');
    expect(formatDateBr(null)).toBe('-');
    expect(formatCurrency(1250.5)).toContain('1.250,50');
    expect(shiftMonthKey('2026-12', 1)).toBe('2027-01');
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12');
    expect(formatMonthLabel('2026-11').toLowerCase()).toContain('2026');
  });

  it('formats monetary inputs with automatic thousand separators and parses back cleanly', () => {
    expect(formatCurrencyInput('1500', '150')).toBe('1.500');
    expect(formatCurrencyInput('1234567', '123456')).toBe('1.234.567');
    expect(formatCurrencyInput('1.500,75', '1.500,7')).toBe('1.500,75');
    expect(formatCurrencyInput('1.500.', '1.500')).toBe('1.500,');
    expect(formatCurrencyInput('2500.75')).toBe('2.500,75');
    expect(formatNumberToCurrencyInput(1500)).toBe('1.500');
    expect(formatNumberToCurrencyInput(2500.5)).toBe('2.500,50');
    expect(parseCurrencyInput('1.500,75')).toBe(1500.75);
    expect(parseCurrencyInput('1.234.567')).toBe(1234567);
    expect(parseCurrencyInput('2500.5')).toBe(2500.5);
  });

  it('masks pix keys safely and normalizes card last4 inputs', () => {
    expect(maskPixKey('igor@empresa.com.br')).toBe('ig***@empresa.com.br');
    expect(maskPixKey('11999998888')).toBe('119***888');
    expect(maskPixKey('123456')).toBe('12***56');
    expect(maskPixKey(null)).toBe('');

    expect(normalizeCardLast4Input('48ab2199')).toBe('4821');
    expect(normalizeCardLast4Input('12')).toBe('12');
  });
});
