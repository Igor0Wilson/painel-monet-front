import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import FamilyModal from '../../src/components/FamilyModal';
import api from '../../src/api';
import { FamilyStatusData } from '../../src/types/finance';

jest.mock('../../src/api', () => ({
  __esModule: true,
  default: {
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
  patch: jest.Mock<Promise<{ data: unknown }>, [string, Record<string, unknown>?]>;
}

const mockedApi = api as unknown as MockApi;

const mockFamilyStatus: FamilyStatusData = {
  hasCpf: true,
  maskedCpf: '***.456.789-**',
  inFamily: true,
  hasGroup: true,
  group: { id: 'fam-1', name: 'Família Teste' },
  members: [
    {
      userId: 'u-1',
      name: 'Igor',
      maskedCpf: '***.456.789-**',
      role: 'owner',
      isSelf: true,
    },
    {
      userId: 'u-2',
      name: 'Maria',
      maskedCpf: '***.111.222-**',
      role: 'member',
      isSelf: false,
    },
  ],
  myPrivacy: {
    fullAccessAll: true,
    rules: [
      {
        targetUserId: 'u-2',
        viewBalance: true,
        viewIncome: true,
        viewExpenses: true,
        viewInvestments: true,
        viewEmergencyFund: true,
        viewFoodAllowance: true,
      },
    ],
  },
  pendingReceivedInvites: [],
  pendingSentInvites: [],
};

describe('FamilyModal privacy controls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.patch.mockResolvedValue({ data: mockFamilyStatus });
  });

  it('allows switching to per-member permissions, toggling income/investments, and activating full access to all', async () => {
    const onRefresh = jest.fn();

    render(
      <FamilyModal
        isOpen={true}
        onClose={jest.fn()}
        familyStatus={mockFamilyStatus}
        onRefresh={onRefresh}
        onOpenProfile={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Por usuário' }));
    expect(screen.getByText(/pode ver/)).toBeInTheDocument();

    const incomeToggle = screen.getByLabelText('Renda, Salários & Receitas') as HTMLInputElement;
    expect(incomeToggle.checked).toBe(true);
    fireEvent.click(incomeToggle);
    expect(incomeToggle.checked).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar permissões de acesso' }));

    await waitFor(() => {
      expect(mockedApi.patch).toHaveBeenCalledWith('/family/privacy', {
        fullAccessAll: false,
        rules: [
          expect.objectContaining({
            targetUserId: 'u-2',
            viewIncome: false,
          }),
        ],
      });
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    const fullAccessBtn = screen.getByRole('button', { name: 'Acesso total a todos' });
    await waitFor(() => {
      expect(fullAccessBtn).not.toBeDisabled();
    });
    fireEvent.click(fullAccessBtn);

    await waitFor(() => {
      expect(mockedApi.patch).toHaveBeenCalledWith('/family/privacy', {
        fullAccessAll: true,
        rules: [
          {
            targetUserId: 'u-2',
            viewBalance: true,
            viewIncome: true,
            viewExpenses: true,
            viewInvestments: true,
            viewEmergencyFund: true,
            viewFoodAllowance: true,
          },
        ],
      });
    });
  });
});
