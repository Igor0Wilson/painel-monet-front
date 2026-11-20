import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CategoryDetailsView from '../../../src/components/dashboard/CategoryDetailsView';
import { ExpenseItem } from '../../../src/types/finance';

const mockExpenses: ExpenseItem[] = [
  {
    id: 'e-1',
    name: 'Burger King',
    accountTypeId: 'c-ff',
    accountType: { id: 'c-ff', name: 'FastFood' },
    value: 65,
    dueDate: '2026-11-18',
    isRecurring: false,
    isInstallment: false,
    isPaid: true,
    paymentMethod: 'vr',
    status: 'pago',
  },
  {
    id: 'e-2',
    name: 'Farmácia Drogasil',
    accountTypeId: 'c-sb',
    accountType: { id: 'c-sb', name: 'Saúde e Beleza' },
    value: 135,
    dueDate: '2026-11-19',
    isRecurring: false,
    isInstallment: false,
    isPaid: true,
    paymentMethod: 'pix',
    status: 'pago',
  },
];

describe('CategoryDetailsView', () => {
  it('renders category totals and itemized expenses by date', () => {
    const onBack = jest.fn();

    render(
      <CategoryDetailsView
        selectedMonth="2026-11"
        expenses={mockExpenses}
        isFamilyMode={false}
        onSelectMonth={jest.fn()}
        onBack={onBack}
      />,
    );

    expect(screen.getByText(/Total: R\$\s*200,00/)).toBeInTheDocument();
    expect(screen.getByText('Burger King')).toBeInTheDocument();
    expect(screen.getByText('Farmácia Drogasil')).toBeInTheDocument();
    expect(screen.getByText('Data: 18/11/2026')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Voltar'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
