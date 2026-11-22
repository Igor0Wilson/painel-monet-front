import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ExpensesListSection from '../../../src/components/dashboard/ExpensesListSection';
import { ExpenseItem } from '../../../src/types/finance';

const mockExpenses: ExpenseItem[] = [
  {
    id: 'exp-1',
    name: 'Parcela Financiamento',
    accountTypeId: 'cat-debt',
    accountType: { id: 'cat-debt', name: 'Dívidas' },
    value: 450,
    dueDate: '2026-11-10',
    isRecurring: false,
    isInstallment: false,
    isPaid: false,
    status: 'pendente',
    isOwn: true,
  },
  {
    id: 'exp-2',
    name: 'Notebook Geladeira',
    accountTypeId: 'cat-mov',
    accountType: { id: 'cat-mov', name: 'Móveis e Eletrônicos' },
    value: 550,
    dueDate: '2026-11-20',
    isRecurring: false,
    isInstallment: false,
    isPaid: false,
    status: 'pendente',
    isOwn: true,
  },
  {
    id: 'exp-3',
    name: 'Dívida Dezembro',
    accountTypeId: 'cat-debt',
    accountType: { id: 'cat-debt', name: 'Dívidas' },
    value: 300,
    dueDate: '2026-12-05',
    isRecurring: false,
    isInstallment: false,
    isPaid: false,
    status: 'pendente',
    isOwn: true,
  },
];

describe('ExpensesListSection batch calculation and period filtering', () => {
  it('sums and subtracts live total as debt checkboxes are checked/unchecked and triggers batch payment', () => {
    const onPayBatch = jest.fn();

    render(
      <ExpensesListSection
        expenses={mockExpenses}
        expenseFilter="todas"
        isFamilyMode={false}
        openInstallments={[]}
        onChangeFilter={jest.fn()}
        onToggleInstallment={jest.fn()}
        onPayExpense={jest.fn()}
        onPayBatchExpenses={onPayBatch}
        onEditExpense={jest.fn()}
        onDeleteExpense={jest.fn()}
      />,
    );

    const cb1 = screen.getByLabelText('Selecionar Parcela Financiamento') as HTMLInputElement;
    const cb2 = screen.getByLabelText('Selecionar Notebook Geladeira') as HTMLInputElement;

    fireEvent.click(cb1);
    expect(screen.getByText(/1 dívida selecionada/)).toBeInTheDocument();
    expect(screen.getByText(/Total:.*450,00/)).toBeInTheDocument();

    fireEvent.click(cb2);
    expect(screen.getByText(/2 dívidas selecionadas/)).toBeInTheDocument();
    expect(screen.getByText(/Total:.*1\.000,00/)).toBeInTheDocument();

    fireEvent.click(cb1);
    expect(screen.getByText(/1 dívida selecionada/)).toBeInTheDocument();
    expect(screen.getByText(/Total:.*550,00/)).toBeInTheDocument();

    fireEvent.click(cb1);
    fireEvent.click(screen.getByRole('button', { name: /Pagar \(/ }));

    expect(onPayBatch).toHaveBeenCalledTimes(1);
    expect(onPayBatch.mock.calls[0][0].map((e: ExpenseItem) => e.id)).toEqual([
      'exp-1',
      'exp-2',
    ]);
  });

  it('filters expenses by month period and computes period total cleanly', () => {
    render(
      <ExpensesListSection
        expenses={mockExpenses}
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

    fireEvent.click(screen.getByRole('button', { name: 'Por mês' }));
    const select = screen.getByLabelText('Selecionar mês do período') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '2026-12' } });

    expect(screen.getByText('Dívida Dezembro')).toBeInTheDocument();
    expect(screen.queryByText('Parcela Financiamento')).not.toBeInTheDocument();
    expect(screen.getByText(/Selecionar em aberto \(1\)/)).toBeInTheDocument();
  });

  it('displays Em dia / Atrasada, partial payment breakdown, remaining sum, and undo action', () => {
    const onUndoPayment = jest.fn();
    const partialItem: ExpenseItem = {
      id: 'exp-part',
      name: 'Conta Parcial',
      accountTypeId: 'cat-housing',
      accountType: { id: 'cat-housing', name: 'Moradia' },
      value: 500,
      paidAmount: 200,
      remainingAmount: 300,
      isPartiallyPaid: true,
      dueDate: '2026-12-20',
      isRecurring: false,
      isInstallment: false,
      isPaid: false,
      status: 'pendente',
      isOwn: true,
      payments: [
        {
          id: 'p1',
          amount: 200,
          paidAt: '2026-11-10',
          paymentMethod: 'pix',
        },
      ],
    };
    const overdueItem: ExpenseItem = {
      id: 'exp-late',
      name: 'Conta Vencida',
      accountTypeId: 'cat-housing',
      accountType: { id: 'cat-housing', name: 'Moradia' },
      value: 100,
      dueDate: '2026-10-01',
      isRecurring: false,
      isInstallment: false,
      isPaid: false,
      status: 'em_atraso',
      isOwn: true,
    };

    render(
      <ExpensesListSection
        expenses={[partialItem, overdueItem]}
        expenseFilter="todas"
        isFamilyMode={false}
        openInstallments={[]}
        onChangeFilter={jest.fn()}
        onToggleInstallment={jest.fn()}
        onPayExpense={jest.fn()}
        onUndoPayment={onUndoPayment}
        onEditExpense={jest.fn()}
        onDeleteExpense={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Em dia' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Atrasadas' })).toBeInTheDocument();
    expect(screen.getAllByText('Em dia').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Atrasada')).toBeInTheDocument();
    expect(screen.getByText('Pago parcial')).toBeInTheDocument();
    expect(screen.getByText(/Pago:.*200,00/)).toBeInTheDocument();
    expect(screen.getByText(/Falta:.*300,00/)).toBeInTheDocument();
    expect(screen.getByText('10/11/2026')).toBeInTheDocument();
    expect(screen.getByText(/Em aberto:.*400,00/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('expense-undo-btn-exp-part'));
    expect(onUndoPayment).toHaveBeenCalledTimes(1);
    expect(onUndoPayment).toHaveBeenCalledWith(partialItem);
  });

  it('shows card summary grouped by card last4/bank with auto-debit, pending, paid-with-card, masked pix copy, and generate card invoice', () => {
    const onGenerateCardInvoice = jest.fn();
    const autoDebitBill: ExpenseItem = {
      id: 'exp-ad-1',
      name: 'Netflix Mensal',
      accountTypeId: 'cat-sub',
      accountType: { id: 'cat-sub', name: 'Assinaturas' },
      value: 55.9,
      dueDate: '2026-12-08',
      isRecurring: false,
      isInstallment: false,
      isPaid: false,
      status: 'pendente',
      isOwn: true,
      isAutoDebit: true,
      cardBank: 'Nubank',
      cardLast4: '4821',
      pixKey: 'pagar@netflix.com',
    };
    const cardInvoiceItem: ExpenseItem = {
      id: 'exp-cc-inv',
      name: 'Compra Supermercado [Crédito 1/1]',
      accountTypeId: 'cat-food',
      accountType: { id: 'cat-food', name: 'Alimentação' },
      value: 300,
      dueDate: '2026-12-15',
      isRecurring: false,
      isInstallment: false,
      isPaid: false,
      isCreditCard: true,
      status: 'pendente',
      isOwn: true,
      cardBank: 'Nubank',
      cardLast4: '4821',
    };
    const paidWithCard: ExpenseItem = {
      id: 'exp-paid-card',
      name: 'Farmácia Origem',
      accountTypeId: 'cat-health',
      accountType: { id: 'cat-health', name: 'Saúde' },
      value: 120,
      dueDate: '2026-12-01',
      isRecurring: false,
      isInstallment: false,
      isPaid: true,
      paymentMethod: 'credito',
      status: 'pago',
      isOwn: true,
      cardBank: 'Nubank',
      cardLast4: '4821',
    };

    render(
      <ExpensesListSection
        expenses={[autoDebitBill, cardInvoiceItem, paidWithCard]}
        expenseFilter="todas"
        isFamilyMode={false}
        openInstallments={[]}
        onChangeFilter={jest.fn()}
        onToggleInstallment={jest.fn()}
        onPayExpense={jest.fn()}
        onGenerateCardInvoice={onGenerateCardInvoice}
        onEditExpense={jest.fn()}
        onDeleteExpense={jest.fn()}
      />,
    );

    expect(screen.getByText('Cartão Nubank final 4821')).toBeInTheDocument();
    expect(screen.getByText('Débito automático:')).toBeInTheDocument();
    expect(screen.getByText('Pendentes para pagamento:')).toBeInTheDocument();
    expect(screen.getByText('Pagas com o cartão:')).toBeInTheDocument();

    expect(screen.getByText(/Pix cadastrado: pa\*\*\*@netflix\.com/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Mostrar ou ocultar chave Pix'));
    expect(screen.getByText(/Pix cadastrado: pagar@netflix\.com/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('generate-card-invoice-btn-4821'));
    expect(onGenerateCardInvoice).toHaveBeenCalledTimes(1);
    expect(onGenerateCardInvoice).toHaveBeenCalledWith([autoDebitBill]);
  });
});
