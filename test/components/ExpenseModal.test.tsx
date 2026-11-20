import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ExpenseModal from '../../src/components/ExpenseModal';
import api from '../../src/api';
import { ExpenseItem } from '../../src/types/finance';

jest.mock('../../src/api', () => ({
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

interface MockApi {
  get: jest.Mock<Promise<{ data: unknown }>, [string]>;
  post: jest.Mock<Promise<{ data: unknown }>, [string, Record<string, unknown>?]>;
  patch: jest.Mock<Promise<{ data: unknown }>, [string, Record<string, unknown>?]>;
}

const mockedApi = api as unknown as MockApi;

describe('ExpenseModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.get.mockResolvedValue({
      data: [
        { id: 'cat-food', name: 'Alimentação' },
        { id: 'cat-div', name: 'Diversos' },
      ],
    });
    mockedApi.post.mockResolvedValue({ data: {} });
    mockedApi.patch.mockResolvedValue({ data: {} });
  });

  it('formats value automatically with thousand separators while typing', async () => {
    render(
      <ExpenseModal
        isOpen={true}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />,
    );

    const valueInput = screen.getByPlaceholderText('0,00') as HTMLInputElement;
    fireEvent.change(valueInput, { target: { value: '1500' } });
    expect(valueInput.value).toBe('1.500');

    fireEvent.change(valueInput, { target: { value: '15000,75' } });
    expect(valueInput.value).toBe('15.000,75');

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/account-types');
    });
  });

  it('recovers all fields of a credit card expense on edit and allows saving a single field change', async () => {
    const onSuccess = jest.fn();
    const onClose = jest.fn();

    const creditExpense: Partial<ExpenseItem> = {
      id: 'exp-cc-1',
      name: 'Mercado Cartão',
      accountTypeId: 'legacy-food-id',
      accountType: { id: 'legacy-food-id', name: 'Alimentação' },
      value: 2500.5,
      dueDate: '2026-12-10T00:00:00.000Z',
      isRecurring: false,
      isInstallment: true,
      installmentCount: 6,
      installmentNumber: 1,
      isPaid: false,
      isCreditCard: true,
      paymentMethod: null,
    };

    render(
      <ExpenseModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
        initialData={creditExpense}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Alimentação')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Ex: Aluguel, Energia, Internet') as HTMLInputElement;
    const valueInput = screen.getByPlaceholderText('0,00') as HTMLInputElement;
    const installmentInput = screen.getByPlaceholderText('Ex: 6') as HTMLInputElement;

    expect(nameInput.value).toBe('Mercado Cartão');
    expect(valueInput.value).toBe('2.500,50');
    expect(installmentInput.value).toBe('6');
    expect(screen.getByText('Parcela 1/6')).toBeInTheDocument();

    fireEvent.change(nameInput, { target: { value: 'Mercado Cartão Atualizado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => {
      expect(mockedApi.patch).toHaveBeenCalledWith('/expenses/exp-cc-1', {
        name: 'Mercado Cartão Atualizado',
        accountTypeId: 'cat-food',
        value: 2500.5,
        dueDate: '2026-12-10',
        isRecurring: false,
        isInstallment: true,
        installmentCount: 6,
        isPaid: false,
        isCreditCard: true,
      });
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
