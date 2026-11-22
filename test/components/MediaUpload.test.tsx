import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import api from '../../src/api';
import { AuthProvider, useAuth } from '../../src/context/AuthContext';
import Navbar from '../../src/components/dashboard/Navbar';
import UserEditModal from '../../src/components/UserEditModal';
import ExpenseModal from '../../src/components/ExpenseModal';
import ExpensesListSection from '../../src/components/dashboard/ExpensesListSection';
import type { ExpenseItem } from '../../src/types/finance';

jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => jest.fn(),
  }),
  { virtual: true },
);

jest.mock('../../src/services/firebaseAuth', () => ({
  signOutFirebase: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/api', () => ({
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
    warning: jest.fn(),
    info: jest.fn(),
  },
}));

interface MockApi {
  get: jest.Mock<Promise<{ data: unknown }>, [string]>;
  post: jest.Mock<Promise<{ data: unknown }>, [string, unknown?]>;
  patch: jest.Mock<Promise<{ data: unknown }>, [string, unknown?]>;
  delete: jest.Mock<Promise<{ data: unknown }>, [string]>;
}

const mockedApi = api as unknown as MockApi;
const mockedToast = toast as unknown as {
  success: jest.Mock;
  error: jest.Mock;
};

const AvatarHarness: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(true);

  return (
    <>
      <Navbar
        userId={user?.id}
        userName={user?.name}
        userInitials="IM"
        userAvatarUrl={user?.avatarUrl}
        panelScope="individual"
        familyStatus={null}
        pendingInvitesCount={0}
        onChangeScope={jest.fn()}
        onOpenFamilyModal={jest.fn()}
        onOpenProfileModal={() => setOpen(true)}
        onRequestLogout={jest.fn()}
      />
      <UserEditModal
        isOpen={open}
        onClose={() => setOpen(false)}
        userData={{ name: user?.name || 'Igor Mendes' }}
        onSuccess={jest.fn()}
      />
    </>
  );
};

describe('Cloudinary avatar & expense photo uploads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'jwt-token');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'user-1', name: 'Igor Mendes', avatarUrl: null }),
    );
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('uploads and removes profile avatar in UserEditModal and updates top Navbar', async () => {
    const cloudAvatarUrl =
      'https://res.cloudinary.com/ddjpnj6ls/image/upload/v1/avatars/avatar-1.png';

    mockedApi.get.mockResolvedValue({
      data: {
        name: 'Igor Mendes',
        email: 'igor@example.com',
        cpf: '12345678900',
        phone: '11999998888',
        avatarUrl: null,
      },
    });
    mockedApi.post.mockResolvedValueOnce({
      data: {
        id: 'user-1',
        name: 'Igor Mendes',
        avatarUrl: cloudAvatarUrl,
      },
    });
    mockedApi.delete.mockResolvedValueOnce({
      data: {
        id: 'user-1',
        name: 'Igor Mendes',
        avatarUrl: null,
      },
    });

    render(
      <AuthProvider>
        <AvatarHarness />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/users/me/profile');
    });

    expect(screen.getByTestId('navbar-user-initials')).toBeInTheDocument();

    const fileInput = screen.getByTestId('user-edit-avatar-input') as HTMLInputElement;
    const validPng = new File(['fake-png-bytes'], 'profile.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [validPng] } });

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/users/me/avatar', expect.any(FormData));
    });

    const navbarImg = await screen.findByTestId('navbar-user-avatar-img');
    expect(navbarImg).toHaveAttribute('src', cloudAvatarUrl);

    const removeBtn = screen.getByTestId('user-edit-remove-avatar-btn');
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(mockedApi.delete).toHaveBeenCalledWith('/users/me/avatar');
    });

    await waitFor(() => {
      expect(screen.getByTestId('navbar-user-initials')).toBeInTheDocument();
    });
  });

  it('blocks non-image avatar files cleanly before calling upload endpoint', async () => {
    mockedApi.get.mockResolvedValue({
      data: { name: 'Igor Mendes', email: 'igor@example.com', avatarUrl: null },
    });

    render(
      <AuthProvider>
        <AvatarHarness />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/users/me/profile');
    });

    const fileInput = screen.getByTestId('user-edit-avatar-input') as HTMLInputElement;
    const pdfFile = new File(['%PDF'], 'doc.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [pdfFile] } });

    await waitFor(() => {
      expect(mockedToast.error).toHaveBeenCalledTimes(1);
    });
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('uploads receipt photo on new expense creation and removes Cloudinary photo on edit removal', async () => {
    mockedApi.get.mockResolvedValue({
      data: [{ id: 'cat-food', name: 'Alimentação' }],
    });
    mockedApi.post
      .mockResolvedValueOnce({ data: { id: 'exp-new-1' } })
      .mockResolvedValueOnce({ data: { id: 'exp-new-1', receiptUrl: 'https://res.cloudinary.com/demo/r.png' } });
    mockedApi.patch.mockResolvedValueOnce({ data: { id: 'exp-edit-1' } });
    mockedApi.delete.mockResolvedValueOnce({ data: { id: 'exp-edit-1', receiptUrl: null } });

    const onSuccessCreate = jest.fn();
    const { unmount } = render(
      <ExpenseModal isOpen={true} onClose={jest.fn()} onSuccess={onSuccessCreate} />,
    );

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/account-types');
    });

    fireEvent.change(screen.getByPlaceholderText('Ex: Aluguel, Energia, Internet'), {
      target: { value: 'Compra Mercado' },
    });
    fireEvent.change(screen.getByPlaceholderText('0,00'), {
      target: { value: '250' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Categoria/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Alimentação' }));

    const photoInput = screen.getByTestId('expense-photo-input') as HTMLInputElement;
    const photoFile = new File(['img-bytes'], 'cupom.jpg', { type: 'image/jpeg' });
    fireEvent.change(photoInput, { target: { files: [photoFile] } });

    await waitFor(() => {
      expect(screen.getByTestId('expense-photo-preview')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar Despesa' }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/expenses', expect.objectContaining({ name: 'Compra Mercado' }));
      expect(mockedApi.post).toHaveBeenCalledWith('/expenses/exp-new-1/photo', expect.any(FormData));
    });
    expect(onSuccessCreate).toHaveBeenCalledTimes(1);
    unmount();

    const existingExpense: Partial<ExpenseItem> = {
      id: 'exp-edit-1',
      name: 'Nota Antiga',
      accountTypeId: 'cat-food',
      accountType: { id: 'cat-food', name: 'Alimentação' },
      value: 120,
      dueDate: '2026-11-20',
      receiptUrl: 'https://res.cloudinary.com/ddjpnj6ls/image/upload/v1/old-receipt.png',
      isPaid: false,
      isRecurring: false,
      isInstallment: false,
    };

    const onSuccessEdit = jest.fn();
    render(
      <ExpenseModal
        isOpen={true}
        onClose={jest.fn()}
        onSuccess={onSuccessEdit}
        initialData={existingExpense}
      />,
    );

    expect(screen.getByTestId('expense-photo-preview')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('expense-remove-photo-btn'));

    await waitFor(() => {
      expect(screen.queryByTestId('expense-photo-preview')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => {
      expect(mockedApi.patch).toHaveBeenCalledWith('/expenses/exp-edit-1', expect.objectContaining({ name: 'Nota Antiga' }));
      expect(mockedApi.delete).toHaveBeenCalledWith('/expenses/exp-edit-1/photo');
    });
    expect(onSuccessEdit).toHaveBeenCalledTimes(1);
  });

  it('opens receipt image lightbox from ExpensesListSection when expense has receiptUrl', () => {
    const receiptUrl = 'https://res.cloudinary.com/ddjpnj6ls/image/upload/v1/receipt.png';
    const items: ExpenseItem[] = [
      {
        id: 'exp-99',
        name: 'Fatura Energia',
        accountTypeId: 'cat-housing',
        accountType: { id: 'cat-housing', name: 'Moradia' },
        value: 320,
        dueDate: '2026-11-18',
        isRecurring: false,
        isInstallment: false,
        isPaid: true,
        status: 'pago',
        isOwn: true,
        receiptUrl,
      },
    ];

    render(
      <ExpensesListSection
        expenses={items}
        expenseFilter="todas"
        isFamilyMode={false}
        openInstallments={[]}
        onChangeFilter={jest.fn()}
        onToggleInstallment={jest.fn()}
        onPayExpense={jest.fn()}
        onPayBatchExpenses={jest.fn()}
        onEditExpense={jest.fn()}
        onDeleteExpense={jest.fn()}
      />,
    );

    const viewBtn = screen.getByTestId('expense-receipt-btn-exp-99');
    fireEvent.click(viewBtn);

    const img = screen.getByAltText('Fatura Energia');
    expect(img).toHaveAttribute('src', receiptUrl);
  });

  it('fetches encrypted receipt path via api.get with responseType blob and renders decrypted object URL', async () => {
    const encryptedPath = '/expenses/exp-enc-1/photo?v=1';
    const originalCreateObjectURL = URL.createObjectURL;
    const createObjectUrlMock = jest.fn(() => 'blob:decrypted-receipt-1');
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectUrlMock,
    });

    mockedApi.get.mockResolvedValueOnce({
      data: new Blob(['png-binary-content'], { type: 'image/png' }),
    });

    const items: ExpenseItem[] = [
      {
        id: 'exp-enc-1',
        name: 'Comprovante Cripto',
        accountTypeId: 'cat-housing',
        accountType: { id: 'cat-housing', name: 'Moradia' },
        value: 250,
        dueDate: '2026-11-20',
        isRecurring: false,
        isInstallment: false,
        isPaid: true,
        status: 'pago',
        isOwn: true,
        receiptUrl: encryptedPath,
      },
    ];

    try {
      render(
        <ExpensesListSection
          expenses={items}
          expenseFilter="todas"
          isFamilyMode={false}
          openInstallments={[]}
          onChangeFilter={jest.fn()}
          onToggleInstallment={jest.fn()}
          onPayExpense={jest.fn()}
          onPayBatchExpenses={jest.fn()}
          onEditExpense={jest.fn()}
          onDeleteExpense={jest.fn()}
        />,
      );

      fireEvent.click(screen.getByTestId('expense-receipt-btn-exp-enc-1'));

      await waitFor(() => {
        expect(mockedApi.get).toHaveBeenCalledWith(encryptedPath, {
          responseType: 'blob',
        });
      });

      await waitFor(() => {
        expect(screen.getByAltText('Comprovante Cripto')).toHaveAttribute(
          'src',
          'blob:decrypted-receipt-1',
        );
      });
    } finally {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        writable: true,
        value: originalCreateObjectURL,
      });
    }
  });
});
