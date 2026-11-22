import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import api from '../../src/api';
import { AuthProvider, useAuth } from '../../src/context/AuthContext';
import { signOutFirebase } from '../../src/services/firebaseAuth';
import { downloadUserFinancialData } from '../../src/utils/downloadUserData';

jest.mock('../../src/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

jest.mock('../../src/services/firebaseAuth', () => ({
  signOutFirebase: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const SessionProbe: React.FC = () => {
  const { user, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="user-name">{user?.name || 'anon'}</span>
      <button
        type="button"
        onClick={() =>
          login('jwt-token-test', {
            id: 'u-1',
            name: 'Alice Teste',
            maskedEmail: 'al***@empresa.com',
            maskedCpf: '***.456.789-**',
            maskedPhone: '(11) *****-9999',
            hasCpf: true,
            // Campos legados injetados propositalmente em tempo de teste via shape extendido
            ...({
              cpf: '12345678900',
              phone: '11999999999',
              email: 'alice@empresa.com',
            } as unknown as Record<string, string>),
          })
        }
      >
        login
      </button>
      <button type="button" onClick={logout}>
        logout
      </button>
    </div>
  );
};

describe('Frontend LGPD Session & Data Export Security', () => {
  const mockedApi = api as unknown as {
    post: jest.Mock;
    get: jest.Mock;
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.clearAllMocks();
    mockedApi.post.mockResolvedValue({ data: {} });
    (signOutFirebase as jest.Mock).mockResolvedValue(undefined);
  });

  it('never stores raw CPF, phone, or email in localStorage and revokes backend token on logout', async () => {
    render(
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>,
    );

    userEvent.click(screen.getByText('login'));

    await waitFor(() => {
      expect(screen.getByTestId('user-name')).toHaveTextContent('Alice Teste');
    });

    const persisted = localStorage.getItem('user') || '';
    expect(persisted).toContain('Alice Teste');
    expect(persisted).not.toContain('12345678900');
    expect(persisted).not.toContain('11999999999');
    expect(persisted).not.toContain('alice@empresa.com');

    userEvent.click(screen.getByText('logout'));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/auth/logout',
        {},
        expect.objectContaining({
          headers: { Authorization: 'Bearer jwt-token-test' },
        }),
      );
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  it('exports financial backup via POST /users/me/export without exposing CPF in URL query params', async () => {
    const createObjectURL = jest.fn(() => 'blob:mock');
    const revokeObjectURL = jest.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      value: createObjectURL,
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: revokeObjectURL,
      configurable: true,
    });

    mockedApi.post.mockResolvedValueOnce({
      data: {
        securityVerification: { userId: 'u-1' },
        summary: { patrimonioDisponivel: 1000 },
      },
    });

    const ok = await downloadUserFinancialData({ userId: 'u-1' });
    expect(ok).toBe(true);
    expect(mockedApi.post).toHaveBeenCalledWith('/users/me/export', {});
    expect(mockedApi.get).not.toHaveBeenCalled();
  });
});
