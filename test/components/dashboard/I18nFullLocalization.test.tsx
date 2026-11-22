import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import api from '../../../src/api';
import ExpenseModal from '../../../src/components/ExpenseModal';
import ThemeAndLangControls from '../../../src/components/ThemeAndLangControls';
import CategoryDetailsView from '../../../src/components/dashboard/CategoryDetailsView';
import ExpensesListSection from '../../../src/components/dashboard/ExpensesListSection';
import InvestmentsListSection from '../../../src/components/dashboard/InvestmentsListSection';
import { ThemeProvider } from '../../../src/context/ThemeContext';
import i18n from '../../../src/i18n';
import { ExpenseItem, InvestmentItem } from '../../../src/types/finance';
import { formatMonthLabel } from '../../../src/utils/formatters';

jest.mock('../../../src/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}));

const mockedApi = api as unknown as {
  get: jest.Mock<Promise<{ data: unknown }>, [string]>;
};

const PeriodProbe: React.FC = () => {
  const { i18n: activeI18n } = useTranslation();
  return (
    <span data-testid="period-label" data-lang={activeI18n.language}>
      {formatMonthLabel('2026-11')}
    </span>
  );
};

const sampleExpenses: ExpenseItem[] = [
  {
    id: 'debt-1',
    name: 'Celular [Crédito 1/1]',
    accountTypeId: 'cat-debt',
    accountType: { id: 'cat-debt', name: 'Dívidas' },
    value: 1250.5,
    dueDate: '2026-11-19',
    isRecurring: false,
    isInstallment: false,
    isPaid: false,
    isCreditCard: true,
    status: 'pendente',
    isOwn: true,
  },
];

const sampleInvestments: InvestmentItem[] = [
  {
    id: 'inv-1',
    name: 'Tesouro Selic 2029',
    category: 'Renda Fixa',
    amount: 5000,
    investedDate: '2026-11-19',
    source: 'balance',
    isOwn: true,
  },
];

describe('Full i18n & country formatting localization', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    localStorage.clear();
    mockedApi.get.mockResolvedValue({
      data: [{ id: 'cat-debt', name: 'Dívidas' }],
    });
    await act(async () => {
      await i18n.changeLanguage('pt-BR');
    });
  });

  afterEach(async () => {
    localStorage.clear();
    await act(async () => {
      await i18n.changeLanguage('pt-BR');
    });
  });

  it('live-translates debts, investments, months, and country number/date/currency formats', () => {
    render(
      <ThemeProvider>
        <ThemeAndLangControls />
        <PeriodProbe />
        <ExpensesListSection
          expenses={sampleExpenses}
          expenseFilter="todas"
          isFamilyMode={false}
          openInstallments={[]}
          onChangeFilter={jest.fn()}
          onToggleInstallment={jest.fn()}
          onPayExpense={jest.fn()}
          onEditExpense={jest.fn()}
          onDeleteExpense={jest.fn()}
        />
        <InvestmentsListSection
          items={sampleInvestments}
          isFamilyMode={false}
          onAddInvestment={jest.fn()}
          onEditInvestment={jest.fn()}
          onDeleteInvestment={jest.fn()}
        />
        <CategoryDetailsView
          selectedMonth="2026-11"
          expenses={sampleExpenses}
          isFamilyMode={false}
          onSelectMonth={jest.fn()}
          onBack={jest.fn()}
        />
      </ThemeProvider>,
    );

    // 1. Default pt-BR (Brazil / BRL / DD/MM/YYYY)
    expect(screen.getByTestId('period-label').textContent?.toLowerCase()).toContain('novembro');
    expect(screen.getAllByText('Dívidas').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Renda Fixa').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Celular [Crédito 1/1]').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/R\$\s*1\.250,50/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('19/11/2026').length).toBeGreaterThan(0);

    // 2. Switch live to en-US (USA / USD / MM/DD/YYYY)
    fireEvent.click(screen.getByTestId('lang-btn-en-US'));
    expect(screen.getByTestId('period-label').textContent?.toLowerCase()).toContain('november');
    expect(screen.getAllByText('Debts & Loans').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Fixed Income').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Celular [Credit 1/1]').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$1,250.50').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$5,000.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('11/19/2026').length).toBeGreaterThan(0);

    // 3. Switch live to es-ES (Spain / EUR / DD/MM/YYYY)
    fireEvent.click(screen.getByTestId('lang-btn-es-ES'));
    expect(screen.getByTestId('period-label').textContent?.toLowerCase()).toContain('noviembre');
    expect(screen.getAllByText('Deudas').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Renta Fija').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1\.?250,50\s*€/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('19/11/2026').length).toBeGreaterThan(0);
  });

  it('uses country-formatted monetary labels and placeholders in ExpenseModal', async () => {
    await act(async () => {
      await i18n.changeLanguage('en-US');
    });

    render(
      <ExpenseModal
        isOpen={true}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/account-types');
    });

    expect(screen.getByText('Amount ($)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('expense-link-card-toggle'));
    expect(screen.getByPlaceholderText('E.g., 4821')).toBeInTheDocument();

    await act(async () => {
      await i18n.changeLanguage('es-ES');
    });
    expect(screen.getByText('Importe (€)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0,00')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ej.: 4821')).toBeInTheDocument();
  });
});
