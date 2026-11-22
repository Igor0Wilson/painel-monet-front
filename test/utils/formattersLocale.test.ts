import i18n, { setAppLanguage } from '../../src/i18n';
import { buildLineChartData } from '../../src/utils/chartConfig';
import {
  formatChartDayLabel,
  formatCurrency,
  formatCurrencyInput,
  formatDateBr,
  formatExpenseDisplayName,
  formatMonthLabel,
  formatMonthShortLabel,
  formatNumberToCurrencyInput,
  formatShortDate,
  getCurrencyPlaceholder,
  getLocaleFormatting,
  parseCurrencyInput,
  translateInvestmentCategory,
} from '../../src/utils/formatters';

describe('formatters multi-country & i18n localization', () => {
  afterEach(async () => {
    await setAppLanguage('pt-BR');
  });

  it('formats currency, numbers, inputs, dates, months and chart days for pt-BR (Brazil / BRL)', async () => {
    await setAppLanguage('pt-BR');

    expect(getLocaleFormatting()).toEqual({
      locale: 'pt-BR',
      currency: 'BRL',
      thousandsSeparator: '.',
      decimalSeparator: ',',
      currencyPlaceholder: '0,00',
    });
    expect(getCurrencyPlaceholder()).toBe('0,00');

    const formatted = formatCurrency(1250.5);
    expect(formatted).toContain('R$');
    expect(formatted).toContain('1.250,50');

    expect(formatDateBr('2026-11-19')).toBe('19/11/2026');
    expect(formatShortDate('2026-11-19')).toBe('19/11');
    expect(formatMonthLabel('2026-11').toLowerCase()).toContain('novembro');
    expect(formatMonthLabel('2026-11')).toContain('2026');
    expect(formatMonthShortLabel('2026-12').toLowerCase()).toBe('dez');
    expect(formatChartDayLabel({ month: '05/dez', day: 5 }, '2026-12').toLowerCase()).toBe(
      '05/dez',
    );

    expect(formatNumberToCurrencyInput(1250.5)).toBe('1.250,50');
    expect(formatCurrencyInput('1250,50')).toBe('1.250,50');
    expect(parseCurrencyInput('1.250,50')).toBe(1250.5);

    const t = i18n.t.bind(i18n);
    expect(formatExpenseDisplayName('Notebook [Crédito] (2/6)', t)).toBe(
      'Notebook [Crédito] (2/6)',
    );
    expect(translateInvestmentCategory('Renda Fixa', t)).toBe('Renda Fixa');
    expect(translateInvestmentCategory('Previdência', t)).toBe('Previdência');
  });

  it('formats currency, numbers, inputs, dates, months and chart days for en-US (USA / USD)', async () => {
    await setAppLanguage('en-US');

    expect(getLocaleFormatting()).toEqual({
      locale: 'en-US',
      currency: 'USD',
      thousandsSeparator: ',',
      decimalSeparator: '.',
      currencyPlaceholder: '0.00',
    });
    expect(getCurrencyPlaceholder()).toBe('0.00');

    expect(formatCurrency(1250.5)).toBe('$1,250.50');
    expect(formatDateBr('2026-11-19')).toBe('11/19/2026');
    expect(formatShortDate('2026-11-19')).toBe('11/19');
    expect(formatMonthLabel('2026-11').toLowerCase()).toContain('november');
    expect(formatMonthLabel('2026-11')).toContain('2026');
    expect(formatMonthShortLabel('2026-12')).toBe('Dec');
    expect(formatChartDayLabel({ month: '05/dez', day: 5 }, '2026-12')).toBe('Dec 05');
    expect(formatChartDayLabel({ month: '05/dez' })).toBe('Dec 05');

    const line = buildLineChartData(
      [{ month: '05/dez', day: 5, income: 3000, expenses: 1200 }],
      'Income',
      'Expenses',
      false,
      '2026-12',
    );
    expect(line.labels).toEqual(['Dec 05']);

    expect(formatNumberToCurrencyInput(1250)).toBe('1,250');
    expect(formatNumberToCurrencyInput(1250.5)).toBe('1,250.50');
    expect(formatCurrencyInput('1250.50')).toBe('1,250.50');
    // Backspace from 1,234 -> 1,23 stays whole number 123
    expect(formatCurrencyInput('1,23', '1,234')).toBe('123');
    expect(parseCurrencyInput('1,250.50')).toBe(1250.5);
    expect(parseCurrencyInput('1,250')).toBe(1250);

    const t = i18n.t.bind(i18n);
    expect(formatExpenseDisplayName('Celular [Crédito 1/1]', t)).toBe('Celular [Credit 1/1]');
    expect(formatExpenseDisplayName('Notebook [Crédito] (2/6)', t)).toBe(
      'Notebook [Credit] (2/6)',
    );
    expect(translateInvestmentCategory('Renda Fixa', t)).toBe('Fixed Income');
    expect(translateInvestmentCategory('Ações / FIIs', t)).toBe('Stocks / REITs');
    expect(translateInvestmentCategory('Previdência', t)).toBe('Retirement');
    expect(translateInvestmentCategory('Criptomoedas', t)).toBe('Crypto');
  });

  it('formats currency, numbers, inputs, dates, months and chart days for es-ES (Spain / EUR)', async () => {
    await setAppLanguage('es-ES');

    expect(getLocaleFormatting()).toEqual({
      locale: 'es-ES',
      currency: 'EUR',
      thousandsSeparator: '.',
      decimalSeparator: ',',
      currencyPlaceholder: '0,00',
    });
    expect(getCurrencyPlaceholder()).toBe('0,00');

    const formatted = formatCurrency(1250.5);
    expect(formatted).toContain('€');
    expect(formatted).toMatch(/1\.?250,50/);

    expect(formatDateBr('2026-11-19')).toBe('19/11/2026');
    expect(formatShortDate('2026-11-19')).toBe('19/11');
    expect(formatMonthLabel('2026-11').toLowerCase()).toContain('noviembre');
    expect(formatMonthLabel('2026-11')).toContain('2026');
    expect(formatMonthShortLabel('2026-12').toLowerCase()).toBe('dic');
    expect(formatChartDayLabel({ month: '05/dez', day: 5 }, '2026-12').toLowerCase()).toBe(
      '05/dic',
    );

    expect(formatNumberToCurrencyInput(1250.5)).toBe('1.250,50');
    expect(formatCurrencyInput('1250,50')).toBe('1.250,50');
    expect(parseCurrencyInput('1.250,50')).toBe(1250.5);

    const t = i18n.t.bind(i18n);
    expect(formatExpenseDisplayName('Celular [Crédito 1/1]', t)).toBe(
      'Celular [Crédito 1/1]',
    );
    expect(translateInvestmentCategory('Renda Fixa', t)).toBe('Renta Fija');
    expect(translateInvestmentCategory('Previdência', t)).toBe('Pensiones');
    expect(translateInvestmentCategory('Ações / FIIs', t)).toBe('Acciones / REITs');
  });
});
