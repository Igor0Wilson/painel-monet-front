import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import InvestmentsModal from '../../../src/components/dashboard/InvestmentsModal';
import api from '../../../src/api';
import { InvestmentItem } from '../../../src/types/finance';

jest.mock('../../../src/api', () => ({
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
  post: jest.Mock<Promise<{ data: unknown }>, [string, Record<string, unknown>?]>;
  patch: jest.Mock<Promise<{ data: unknown }>, [string, Record<string, unknown>?]>;
  delete: jest.Mock<Promise<{ data: unknown }>, [string]>;
}

const mockedApi = api as unknown as MockApi;

describe('InvestmentsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.post.mockResolvedValue({ data: {} });
    mockedApi.patch.mockResolvedValue({ data: {} });
    mockedApi.delete.mockResolvedValue({ data: {} });
  });

  it('registers a detailed investment with custom date and thousand-formatted value', async () => {
    const onRefresh = jest.fn();

    render(
      <InvestmentsModal
        isOpen={true}
        items={[]}
        ownAvailableBalance={1500}
        allocatedInvestments={0}
        externalInvestments={0}
        onClose={jest.fn()}
        onRefresh={onRefresh}
      />,
    );

    const nameInput = screen.getByPlaceholderText(
      'Ex: Tesouro Selic 2029, CDB 110% CDI, IVVB11',
    ) as HTMLInputElement;
    const valueInput = screen.getByPlaceholderText('0,00') as HTMLInputElement;
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: 'CDB Liquidez Diária' } });
    fireEvent.change(valueInput, { target: { value: '10000' } });
    expect(valueInput.value).toBe('10.000');

    fireEvent.change(dateInput, { target: { value: '2025-08-15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar investimento' }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/balance/investments/items', {
        name: 'CDB Liquidez Diária',
        category: 'Renda Fixa',
        amount: 10000,
        investedDate: '2025-08-15',
        source: 'external',
        notes: undefined,
      });
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders existing dated investment items and allows editing a record', async () => {
    const existingItem: InvestmentItem = {
      id: 'inv-1',
      name: 'Tesouro IPCA',
      category: 'Tesouro Direto',
      amount: 3500,
      investedDate: '2026-04-12',
      source: 'external',
      isOwn: true,
    };

    render(
      <InvestmentsModal
        isOpen={true}
        items={[existingItem]}
        ownAvailableBalance={2000}
        allocatedInvestments={0}
        externalInvestments={3500}
        onClose={jest.fn()}
        onRefresh={jest.fn()}
      />,
    );

    expect(screen.getByText('Tesouro IPCA')).toBeInTheDocument();
    expect(screen.getByText(/12\/04\/2026/)).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Editar investimento'));
    const nameInput = screen.getByPlaceholderText(
      'Ex: Tesouro Selic 2029, CDB 110% CDI, IVVB11',
    ) as HTMLInputElement;
    expect(nameInput.value).toBe('Tesouro IPCA');

    fireEvent.change(nameInput, { target: { value: 'Tesouro IPCA 2035' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alteração' }));

    await waitFor(() => {
      expect(mockedApi.patch).toHaveBeenCalledWith(
        '/balance/investments/items/inv-1',
        expect.objectContaining({ name: 'Tesouro IPCA 2035' }),
      );
    });
  });
});
