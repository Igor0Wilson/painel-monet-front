import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ExpensesListSection from '../../src/components/dashboard/ExpensesListSection';
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

  it('supports partial settlement with custom date and undoing an existing part', async () => {
    const onClose = jest.fn();
    const onSuccess = jest.fn();
    const expense: ExpenseItem = {
      id: 'exp-part-1',
      name: 'Seguro Auto',
      accountTypeId: 'cat-transport',
      value: 500,
      paidAmount: 200,
      remainingAmount: 300,
      isPartiallyPaid: true,
      dueDate: '2026-11-28',
      isRecurring: false,
      isInstallment: false,
      isPaid: false,
      status: 'pendente',
      payments: [
        {
          id: 'part-1',
          amount: 200,
          paidAt: '2026-11-10',
          paymentMethod: 'pix',
        },
      ],
    };

    mockedApi.patch.mockResolvedValue({
      data: {
        ...expense,
        payments: [],
        paidAmount: 0,
        remainingAmount: 500,
      },
    });

    const { container } = render(
      <PayExpenseModal
        expense={expense}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    expect(screen.getByText('10/11/2026')).toBeInTheDocument();
    expect(screen.getByText(/Partes já pagas \(1\)/)).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Desfazer parte'));
    await waitFor(() => {
      expect(mockedApi.patch).toHaveBeenCalledWith('/expenses/exp-part-1/undo-pay', {
        paymentId: 'part-1',
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Pagamento Parcial' }));

    const amountInput = screen.getByPlaceholderText('0,00');
    fireEvent.change(amountInput, { target: { value: '150' } });

    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-11-22' } });

    fireEvent.click(screen.getAllByText('Dinheiro')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Pagamento' }));

    await waitFor(() => {
      expect(mockedApi.patch).toHaveBeenCalledWith('/expenses/exp-part-1/pay', {
        paymentMethod: 'dinheiro',
        paidAt: '2026-11-22',
        amount: 150,
      });
    });

    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('displays masked pixKey when pix is chosen and forwards cardBank + cardLast4 when paying with credit card', async () => {
    const onClose = jest.fn();
    const onSuccess = jest.fn();
    const expense: ExpenseItem = {
      id: 'exp-card-pix-1',
      name: 'Boleto Energia',
      accountTypeId: 'cat-housing',
      value: 200,
      dueDate: '2026-12-10',
      isRecurring: false,
      isInstallment: false,
      isPaid: false,
      status: 'pendente',
      pixKey: 'energia@concessionaria.com.br',
      cardBank: 'Nubank',
      cardLast4: '4821',
    };

    mockedApi.patch.mockResolvedValue({
      data: { ...expense, isPaid: true, paymentMethod: 'credito' },
    });

    render(
      <PayExpenseModal
        expense={expense}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    expect(screen.getByText('Chave Pix cadastrada:')).toBeInTheDocument();
    expect(screen.getByText('en***@concessionaria.com.br')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar Pix' })).toBeInTheDocument();

    fireEvent.click(screen.getByText('Crédito'));

    const bankInput = screen.getByPlaceholderText('Ex: Nubank, Itaú, Inter, Bradesco...') as HTMLInputElement;
    const last4Input = screen.getByPlaceholderText('Ex: 4821') as HTMLInputElement;
    expect(bankInput.value).toBe('Nubank');
    expect(last4Input.value).toBe('4821');

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Crédito/ }));

    await waitFor(() => {
      expect(mockedApi.patch).toHaveBeenCalledWith(
        '/expenses/exp-card-pix-1/pay',
        expect.objectContaining({
          paymentMethod: 'credito',
          cardBank: 'Nubank',
          cardLast4: '4821',
        }),
      );
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('asks about early payment discount, submits discounted paid value, and displays original vs paid on listing', async () => {
    const onClose = jest.fn();
    const onSuccess = jest.fn();
    const expense: ExpenseItem = {
      id: 'exp-early-1',
      name: 'Parcela Financiamento',
      accountTypeId: 'cat-moradia',
      accountType: { id: 'cat-moradia', name: 'Moradia' },
      value: 200,
      dueDate: '2026-11-28',
      isRecurring: false,
      isInstallment: false,
      isPaid: false,
      status: 'pendente',
    };

    mockedApi.patch.mockResolvedValue({
      data: {
        ...expense,
        isPaid: true,
        isEarlyPayment: true,
        paidAmount: 170,
        discountAmount: 30,
        status: 'pago',
      },
    });

    render(
      <PayExpenseModal
        expense={expense}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    expect(
      screen.getByText('A conta foi paga com antecedência? Teve algum desconto?'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('early-payment-discount-toggle'));
    const paidInput = screen.getByTestId(
      'early-discount-paid-input',
    ) as HTMLInputElement;
    fireEvent.change(paidInput, { target: { value: '170,00' } });

    expect(screen.getByText(/Economia na antecipação/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Pagamento' }));

    await waitFor(() => {
      expect(mockedApi.patch).toHaveBeenCalledWith(
        '/expenses/exp-early-1/pay',
        expect.objectContaining({
          paymentMethod: 'pix',
          isEarlyPayment: true,
          amount: 170,
        }),
      );
    });

    const paidListItem: ExpenseItem = {
      ...expense,
      isPaid: true,
      isEarlyPayment: true,
      paidAmount: 170,
      discountAmount: 30,
      remainingAmount: 0,
      status: 'pago',
    };

    render(
      <ExpensesListSection
        expenses={[paidListItem]}
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

    const earlyNote = screen.getByTestId('early-discount-note-exp-early-1');
    expect(earlyNote).toHaveTextContent(/200,00/);
    expect(earlyNote).toHaveTextContent(/170,00/);
    expect(earlyNote).toHaveTextContent(/devido à antecipação/i);
  });
});
