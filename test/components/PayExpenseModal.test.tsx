import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PayExpenseModal from '../../src/components/PayExpenseModal';
import api from '../../src/api';
import { ExpenseItem } from '../../src/types/finance';

jest.mock('../../src/api', () => ({
  __esModule: true,
  default: {
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

interface MockApi {
  post: jest.Mock<Promise<{ data: unknown }>, [string, Record<string, unknown>?]>;
  patch: jest.Mock<Promise<{ data: unknown }>, [string, Record<string, unknown>?]>;
}

const mockedApi = api as unknown as MockApi;

describe('PayExpenseModal batch flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.post.mockResolvedValue({ data: {} });
    mockedApi.patch.mockResolvedValue({ data: {} });
  });

  it('pays multiple selected debts in batch using the payment method flow', async () => {
    const onSuccess = jest.fn();
    const onClose = jest.fn();
    const batchItems: ExpenseItem[] = [
      {
        id: 'exp-1',
        name: 'Dívida A',
        accountTypeId: 'cat-debt',
        accountType: { id: 'cat-debt', name: 'Dívidas' },
        value: 300,
        dueDate: '2026-11-10',
        isRecurring: false,
        isInstallment: false,
        isPaid: false,
        status: 'pendente',
      },
      {
        id: 'exp-2',
        name: 'Sofá B',
        accountTypeId: 'cat-mov',
        accountType: { id: 'cat-mov', name: 'Móveis e Eletrônicos' },
        value: 700,
        dueDate: '2026-11-15',
        isRecurring: false,
        isInstallment: false,
        isPaid: false,
        status: 'pendente',
      },
    ];

    render(
      <PayExpenseModal
        expense={null}
        batchExpenses={batchItems}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    expect(screen.getByText('Pagar Dívidas em Lote')).toBeInTheDocument();
    expect(screen.getByText('Dívida A')).toBeInTheDocument();
    expect(screen.getByText('Sofá B')).toBeInTheDocument();
    expect(screen.getByText(/Total selecionado \(2 itens\)/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Débito'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Pagamento' }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/expenses/pay-batch', {
        expenseIds: ['exp-1', 'exp-2'],
        paymentMethod: 'debito',
      });
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
