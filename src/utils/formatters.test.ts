import {
  buildWhatsAppUrl,
  formatCpfInput,
  formatCurrency,
  formatDateBr,
  formatMonthLabel,
  formatPhoneInput,
  maskCpf,
  onlyDigits,
  shiftMonthKey,
} from './formatters';

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
});
