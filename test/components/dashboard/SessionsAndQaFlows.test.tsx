import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import api from '../../../src/api';
import CreditCardInvoicePanel from '../../../src/components/dashboard/CreditCardInvoicePanel';
import FoodVoucherSection from '../../../src/components/dashboard/FoodVoucherSection';
import InvestmentsListSection from '../../../src/components/dashboard/InvestmentsListSection';
import IncomeModal from '../../../src/components/IncomeModal';
import ExpensesListSection from '../../../src/components/dashboard/ExpensesListSection';
import {
  BalanceData,
  ExpenseItem,
  IncomeItem,
  InvestmentItem,
} from '../../../src/types/finance';

jest.mock('../../../src/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}));

const mockedApi = api as unknown as {
  get: jest.Mock;
  post: jest.Mock;
  patch: jest.Mock;
};

describe('QA Flows: Credit Cards, Recurring Projection & Scopes, VA/VR Batch/Close, Yields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('CreditCardInvoicePanel organizes by card and open/paid status and links unlinked installments across all siblings', async () => {
    mockedApi.patch.mockResolvedValue({ data: {} });
    const onRefresh = jest.fn();

    const items: ExpenseItem[] = [
      {
        id: 'cc-1',
        name: 'Calça da Ana [Crédito]',
        accountTypeId: 'cat-1',
        accountType: { id: 'cat-1', name: 'Saúde e Beleza' },
        value: 62.5,
        dueDate: '2026-12-10',
        isRecurring: false,
        isInstallment: true,
        installmentCount: 4,
        installmentNumber: 1,
        isPaid: false,
        isCreditCard: true,
        paymentMethod: 'credito',
        cardBank: 'Nubank',
        cardLast4: '4821',
        status: 'pendente',
        isOwn: true,
      },
      {
        id: 'cc-2',
        name: 'Calça da Ana [Crédito]',
        accountTypeId: 'cat-1',
        accountType: { id: 'cat-1', name: 'Saúde e Beleza' },
        value: 62.5,
        dueDate: '2026-12-10',
        isRecurring: false,
        isInstallment: true,
        installmentCount: 4,
        installmentNumber: 2,
        isPaid: false,
        isCreditCard: true,
        paymentMethod: 'credito',
        status: 'pendente',
        isOwn: true,
      },
      {
        id: 'cc-paid',
        name: 'Mercado Pago [Crédito]',
        accountTypeId: 'cat-1',
        value: 90,
        dueDate: '2026-10-10',
        isRecurring: false,
        isInstallment: false,
        isPaid: true,
        paidAt: '2026-10-10',
        isCreditCard: true,
        paymentMethod: 'credito',
        cardBank: 'Nubank',
        cardLast4: '4821',
        status: 'pago',
        isOwn: true,
      },
    ];

    render(
      <CreditCardInvoicePanel
        invoices={[]}
        activeInvoice={null}
        onSelectMonth={jest.fn()}
        onPayInvoice={jest.fn()}
        expenses={items}
        selectedMonth="2026-12"
        onRefresh={onRefresh}
      />,
    );

    expect(screen.getByTestId('card-tab-4821')).toBeInTheDocument();
    expect(screen.getByTestId('card-invoice-item-cc-1')).toBeInTheDocument();
    expect(screen.getByTestId('card-invoice-item-cc-2')).toBeInTheDocument();
    expect(screen.queryByTestId('card-invoice-item-cc-paid')).not.toBeInTheDocument();

    // Link unlinked card installment
    fireEvent.click(screen.getByText('Vincular cartão'));
    fireEvent.change(screen.getByPlaceholderText('Banco / Emissor'), {
      target: { value: 'Nubank' },
    });
    fireEvent.change(screen.getByPlaceholderText('Últimos 4 dígitos'), {
      target: { value: '4821' },
    });
    fireEvent.click(screen.getByText('Salvar em todas as parcelas'));

    await waitFor(() => {
      expect(mockedApi.patch).toHaveBeenCalledWith('/expenses/cc-2', {
        cardBank: 'Nubank',
        cardLast4: '4821',
        editScope: 'all_installments',
      });
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    // Switch to Paid Invoices tab
    fireEvent.click(screen.getByTestId('card-invoices-tab-paid'));
    expect(screen.getByTestId('card-invoice-item-cc-paid')).toBeInTheDocument();
  });

  it('ExpensesListSection projects recurring bills when filtering by month, filters unified Móveis e Eletrônicos category, and separates by category section', () => {
    const recurringExpense: ExpenseItem = {
      id: 'rec-1',
      name: 'Aluguel Apartamento',
      accountTypeId: 'cat-moradia',
      accountType: { id: 'cat-moradia', name: 'Moradia' },
      value: 1800,
      dueDate: '2026-01-10',
      isRecurring: true,
      isInstallment: false,
      isPaid: false,
      status: 'pendente',
      isOwn: true,
    };
    const electronicsLegacy: ExpenseItem = {
      id: 'el-1',
      name: 'Monitor 4K',
      accountTypeId: 'cat-el',
      accountType: { id: 'cat-el', name: 'Eletrônicos' },
      value: 900,
      dueDate: '2026-11-12',
      isRecurring: false,
      isInstallment: false,
      isPaid: false,
      status: 'pendente',
      isOwn: true,
    };
    const furnitureLegacy: ExpenseItem = {
      id: 'mv-1',
      name: 'Sofá Sala',
      accountTypeId: 'cat-mv',
      accountType: { id: 'cat-mv', name: 'Móveis' },
      value: 1200,
      dueDate: '2026-11-15',
      isRecurring: false,
      isInstallment: false,
      isPaid: false,
      status: 'pendente',
      isOwn: true,
    };

    render(
      <ExpensesListSection
        expenses={[recurringExpense, electronicsLegacy, furnitureLegacy]}
        expenseFilter="todas"
        isFamilyMode={false}
        openInstallments={[]}
        onChangeFilter={jest.fn()}
        onToggleInstallment={jest.fn()}
        onPayExpense={jest.fn()}
        onEditExpense={jest.fn()}
        onDeleteExpense={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Por mês'));
    expect(screen.getByText('Aluguel Apartamento')).toBeInTheDocument();

    // Filter unified Móveis e Eletrônicos category (combines Eletrônicos + Móveis)
    fireEvent.change(screen.getByTestId('expense-category-filter-select'), {
      target: { value: 'Móveis e Eletrônicos' },
    });
    expect(screen.getByText('Monitor 4K')).toBeInTheDocument();
    expect(screen.getByText('Sofá Sala')).toBeInTheDocument();
    expect(screen.queryByText('Aluguel Apartamento')).not.toBeInTheDocument();

    // Reset filter and toggle Separated Category Sessions
    fireEvent.change(screen.getByTestId('expense-category-filter-select'), {
      target: { value: 'all' },
    });
    fireEvent.click(screen.getByTestId('expense-group-by-category-toggle'));
    expect(screen.getByTestId('expense-category-section-Moradia')).toBeInTheDocument();
    expect(
      screen.getByTestId('expense-category-section-Móveis e Eletrônicos'),
    ).toBeInTheDocument();
  });

  it('IncomeModal submits editScope and targetMonth when editing recurring salary', async () => {
    mockedApi.patch.mockResolvedValue({ data: {} });
    const onSuccess = jest.fn();
    const onClose = jest.fn();

    const salary: IncomeItem = {
      id: 'inc-1',
      name: 'Salário Empresa',
      value: 4000,
      isRecurring: true,
      incomeDate: '2026-01-05',
      monthlyOverrides: {
        '2026-11': { value: 4500 },
      },
    };

    render(
      <IncomeModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
        initialData={salary}
        targetMonth="2026-11"
      />,
    );

    // Defaults to only_month and shows overridden value for 2026-11
    fireEvent.click(screen.getByTestId('income-edit-scope-from_month'));
    fireEvent.click(screen.getByText('Salvar alterações'));

    await waitFor(() => {
      expect(mockedApi.patch).toHaveBeenCalledWith(
        '/income/inc-1',
        expect.objectContaining({
          name: 'Salário Empresa',
          value: 4500,
          editScope: 'from_month',
          targetMonth: '2026-11',
          isRecurring: true,
        }),
      );
    });
  });

  it('FoodVoucherSection configures VA/VR, submits batch expenses, and performs month closing', async () => {
    mockedApi.post.mockResolvedValue({ data: { adjusted: true, diff: 120 } });
    const onRefresh = jest.fn();

    const balance: BalanceData = {
      balance: 2000,
      totalIncome: 5000,
      scheduledIncome: 0,
      totalExpenses: 3000,
      emergencyFund: 0,
      investments: 0,
      ownBalance: 2000,
      ownEmergencyFund: 0,
      ownInvestments: 0,
      ownFoodAllowance: 950,
      ownVaRemaining: 450,
      ownVrRemaining: 500,
      ownVaUsed: 50,
      ownVrUsed: 100,
      ownVaConfig: {
        enabled: true,
        amount: 500,
        creditDate: '2026-11-05',
        isRecurring: true,
        mode: 'fixed',
      },
      ownVrConfig: {
        enabled: true,
        amount: 600,
        creditDate: '2026-11-05',
        isRecurring: true,
        mode: 'variable',
      },
      memberBreakdown: [],
    };

    render(
      <FoodVoucherSection
        balance={balance}
        expenses={[]}
        onRefresh={onRefresh}
        selectedMonth="2026-11"
      />,
    );

    // Save VA config
    fireEvent.click(screen.getByTestId('food-save-va-btn'));
    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/balance/food-allowance',
        expect.objectContaining({
          editScope: 'from_month',
          targetMonth: '2026-11',
          va: expect.objectContaining({ enabled: true, amount: 500, mode: 'fixed' }),
        }),
      );
    });

    // Submit batch VA/VR expense
    fireEvent.change(screen.getByTestId('food-batch-name-0'), {
      target: { value: 'Almoço Restaurante' },
    });
    fireEvent.change(screen.getByTestId('food-batch-amount-0'), {
      target: { value: '35,00' },
    });
    fireEvent.click(screen.getByTestId('food-submit-batch-btn'));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/expenses/food-allowance/batch',
        expect.objectContaining({
          items: [
            expect.objectContaining({
              name: 'Almoço Restaurante',
              amount: 35,
              paymentMethod: 'vr',
            }),
          ],
        }),
      );
    });

    // Close month remaining balance
    fireEvent.change(screen.getByTestId('food-close-remaining-input'), {
      target: { value: '380,00' },
    });
    fireEvent.click(screen.getByTestId('food-close-month-btn'));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/balance/food-allowance/close-month',
        expect.objectContaining({
          month: '2026-11',
          benefit: 'total',
          actualRemaining: 380,
        }),
      );
    });
  });

  it('InvestmentsListSection submits batch yield balance updates and emergency reserve yield', async () => {
    mockedApi.post.mockResolvedValue({ data: { updatedCount: 1, totalYieldDelta: 120 } });
    const onRefresh = jest.fn();

    const items: InvestmentItem[] = [
      {
        id: 'inv-1',
        name: 'CDB Banco Inter',
        category: 'Renda Fixa',
        amount: 1000,
        investedDate: '2026-10-01',
        source: 'balance',
        isOwn: true,
      },
    ];

    const balance: BalanceData = {
      balance: 2000,
      totalIncome: 5000,
      scheduledIncome: 0,
      totalExpenses: 3000,
      emergencyFund: 3000,
      investments: 1000,
      ownBalance: 2000,
      ownEmergencyFund: 3000,
      ownEmergencyFundTotalYield: 0,
      ownEmergencyFundYieldHistory: [],
      ownInvestments: 1000,
      memberBreakdown: [],
    };

    render(
      <InvestmentsListSection
        items={items}
        isFamilyMode={false}
        balance={balance}
        onRefresh={onRefresh}
        onAddInvestment={jest.fn()}
        onEditInvestment={jest.fn()}
        onDeleteInvestment={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('toggle-batch-yield-btn'));
    fireEvent.change(screen.getByTestId('yield-input-inv-1'), {
      target: { value: '1120,00' },
    });
    fireEvent.click(screen.getByTestId('save-batch-yield-btn'));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/balance/investments/batch-update-balances',
        expect.objectContaining({
          updates: [{ id: 'inv-1', newAmount: 1120 }],
        }),
      );
    });

    fireEvent.change(screen.getByTestId('reserve-yield-amount-input'), {
      target: { value: '3050,00' },
    });
    fireEvent.click(screen.getByTestId('reserve-yield-submit-btn'));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/balance/emergency-fund/yield',
        expect.objectContaining({
          newTotal: 3050,
        }),
      );
    });
  });
});
