import { ExpenseItem } from '../../src/types/finance';
import {
  computeRealtimeCategoriesForMonth,
  isFoodCategory,
  normalizeCategoryName,
  OFFICIAL_CATEGORIES,
} from '../../src/utils/categories';

describe('categories', () => {
  it('exposes all 9 official categories including Móveis e Eletrônicos and Dívidas', () => {
    expect(OFFICIAL_CATEGORIES).toEqual([
      'Transporte',
      'Moradia',
      'Lazer',
      'Alimentação',
      'FastFood',
      'Saúde e Beleza',
      'Móveis e Eletrônicos',
      'Dívidas',
      'Diversos',
    ]);
  });

  it('maps legacy and related names to official categories', () => {
    expect(normalizeCategoryName('Aluguel')).toBe('Moradia');
    expect(normalizeCategoryName('Fast Food')).toBe('FastFood');
    expect(normalizeCategoryName('Farmácia e Saúde')).toBe('Saúde e Beleza');
    expect(normalizeCategoryName('Móveis e Notebook')).toBe('Móveis e Eletrônicos');
    expect(normalizeCategoryName('Empréstimo e Dívida')).toBe('Dívidas');
    expect(normalizeCategoryName('Uber')).toBe('Transporte');
    expect(normalizeCategoryName('Qualquer outra')).toBe('Diversos');
  });

  it('detects food-related categories and descriptions for VA/VR option', () => {
    expect(isFoodCategory('Alimentação', '')).toBe(true);
    expect(isFoodCategory('FastFood', '')).toBe(true);
    expect(isFoodCategory('Diversos', 'Almoço restaurante')).toBe(true);
    expect(isFoodCategory('Moradia', 'Aluguel apartamento')).toBe(false);
  });

  it('computes real-time monthly totals per category correctly', () => {
    const mockExpenses: ExpenseItem[] = [
      {
        id: '1',
        name: 'Uber',
        accountTypeId: 't-1',
        accountType: { id: 't-1', name: 'Transporte' },
        value: 50,
        dueDate: '2026-11-10',
        isRecurring: false,
        isInstallment: false,
        isPaid: true,
        status: 'pago',
      },
      {
        id: '2',
        name: 'Farmácia',
        accountTypeId: 't-2',
        accountType: { id: 't-2', name: 'Saúde e Beleza' },
        value: 150,
        dueDate: '2026-11-12',
        isRecurring: false,
        isInstallment: false,
        isPaid: false,
        status: 'pendente',
      },
    ];

    const summary = computeRealtimeCategoriesForMonth(mockExpenses, '2026-11');
    expect(summary.totalMonthExpenses).toBe(200);
    expect(summary.activeCategories.map((c) => c.name)).toEqual([
      'Saúde e Beleza',
      'Transporte',
    ]);
    expect(summary.activeCategories[0].percentage).toBe(75);
  });
});
