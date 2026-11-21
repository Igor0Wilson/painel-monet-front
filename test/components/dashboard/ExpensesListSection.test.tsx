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
});
