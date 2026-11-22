import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import api from '../../src/api';
import { AuthProvider } from '../../src/context/AuthContext';
import UserEditModal from '../../src/components/UserEditModal';
import Login from '../../src/pages/Login';
import * as appEnv from '../../src/utils/appEnvironment';
import * as biometricAuth from '../../src/utils/biometricAuth';
import {
  DueExpenseReminderItem,
  notifyDueExpenseOnDevice,
} from '../../src/utils/deviceNotifications';
import i18n from '../../src/i18n';

const mockNavigate = jest.fn();
jest.mock(
  'react-router-dom',
  () => ({
    __esModule: true,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), jest.fn()],
    Link: ({
      children,
      to,
      ...rest
    }: {
      children: React.ReactNode;
      to: string;
    }) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
  }),
  { virtual: true },
);

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
    info: jest.fn(),
    warning: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockedApi = api as unknown as {
  get: jest.Mock;
  post: jest.Mock;
  patch: jest.Mock;
  delete: jest.Mock;
};

describe('Biometric Settings, Platform Login & Due-Date Notifications', () => {
  beforeEach(async () => {
    localStorage.clear();
    jest.clearAllMocks();
    await i18n.changeLanguage('pt-BR');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows Facial Recognition label on website web mode alongside mandatory password login', async () => {
    jest.spyOn(appEnv, 'isRunningInInstalledApp').mockReturnValue(false);
    jest
      .spyOn(biometricAuth, 'detectBiometricCapabilities')
      .mockResolvedValue({
        available: true,
        isNativeApp: false,
        isInstalledApp: false,
        protocol: 'webauthn',
        platform: 'web',
        hasFacial: true,
        hasFingerprint: false,
      });

    biometricAuth.saveLocalBiometricPointer({
      id: 'cred-1',
      credentialId: 'webauthn-face-1',
      protocol: 'webauthn',
      kind: 'facial',
      platform: 'web',
      deviceLabel: 'Navegador Web',
    });

    render(
      <AuthProvider>
        <Login />
      </AuthProvider>,
    );

    expect(screen.getByLabelText(/E-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Senha/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('biometric-login-btn')).toHaveTextContent(
        'Entrar com Reconhecimento Facial',
      );
    });
  });

  it('allows activating, configuring Digital/Facial on installed app, disabling, and removing biometric auth in UserEditModal', async () => {
    jest.spyOn(appEnv, 'isRunningInInstalledApp').mockReturnValue(true);
    jest
      .spyOn(biometricAuth, 'detectBiometricCapabilities')
      .mockResolvedValue({
        available: true,
        isNativeApp: true,
        isInstalledApp: true,
        protocol: 'native_hmac',
        platform: 'mobile_android',
        hasFacial: true,
        hasFingerprint: true,
      });

    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/users/me/profile') {
        return Promise.resolve({
          data: { name: 'Igor App', email: 'igor@test.com', cpf: '', phone: '' },
        });
      }
      if (url === '/auth/biometric/credentials') {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: {} });
    });

    const enrollSpy = jest
      .spyOn(biometricAuth, 'registerBiometricCredential')
      .mockResolvedValue({
        id: 'bio-id-1',
        credentialId: 'cred-uuid-1',
        protocol: 'native_hmac',
        kind: 'biometric',
        platform: 'mobile_android',
        deviceLabel: 'Aplicativo Mobile',
        isEnabled: true,
        createdAt: '2026-11-22T10:00:00Z',
        updatedAt: '2026-11-22T10:00:00Z',
        lastUsedAt: null,
      });

    mockedApi.patch.mockResolvedValue({
      data: {
        id: 'bio-id-1',
        credentialId: 'cred-uuid-1',
        protocol: 'native_hmac',
        kind: 'biometric',
        platform: 'mobile_android',
        deviceLabel: 'Aplicativo Mobile',
        isEnabled: false,
        createdAt: '2026-11-22T10:00:00Z',
        updatedAt: '2026-11-22T10:05:00Z',
        lastUsedAt: null,
      },
    });

    mockedApi.delete.mockResolvedValue({ data: { deleted: true } });

    render(
      <AuthProvider>
        <UserEditModal
          isOpen={true}
          onClose={jest.fn()}
          userData={{ name: 'Igor App', email: 'igor@test.com' }}
          onSuccess={jest.fn()}
        />
      </AuthProvider>,
    );

    const section = await screen.findByTestId('biometric-settings-section');
    expect(section).toHaveTextContent('Digital e Reconhecimento Facial');

    fireEvent.click(screen.getByTestId('biometric-activate-btn'));
    await waitFor(() => {
      expect(enrollSpy).toHaveBeenCalledTimes(1);
    });

    const toggleBtn = await screen.findByTestId('biometric-toggle-btn');
    expect(toggleBtn).toHaveTextContent('Desativar');
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(mockedApi.patch).toHaveBeenCalledWith(
        '/auth/biometric/credentials/bio-id-1',
        expect.objectContaining({ isEnabled: false }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('biometric-toggle-btn')).toHaveTextContent(
        'Reativar',
      );
      expect(screen.getByTestId('biometric-remove-btn')).not.toBeDisabled();
    });

    fireEvent.click(screen.getByTestId('biometric-remove-btn'));
    await waitFor(() => {
      expect(mockedApi.delete).toHaveBeenCalledWith(
        '/auth/biometric/credentials/bio-id-1',
      );
    });
  });

  it('dispatches native WebView / device due-date notification without duplicates', async () => {
    const postMessageSpy = jest.fn();
    (
      window as unknown as { ReactNativeWebView?: { postMessage: jest.Mock } }
    ).ReactNativeWebView = { postMessage: postMessageSpy };

    const reminder: DueExpenseReminderItem = {
      id: 'exp-1_2026-11-22_due_tomorrow',
      expenseId: 'exp-1',
      expenseName: 'Aluguel',
      amount: 1200,
      dueDate: '2026-11-22',
      kind: 'due_tomorrow',
      alreadyDeviceNotified: false,
      emailSent: true,
    };

    const first = await notifyDueExpenseOnDevice(reminder);
    expect(first).toBe(true);
    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    expect(postMessageSpy.mock.calls[0][0]).toContain('EXPENSE_DUE_NOTIFICATION');
    expect(postMessageSpy.mock.calls[0][0]).toContain('vence amanhã');

    const second = await notifyDueExpenseOnDevice(reminder);
    expect(second).toBe(false);
    expect(postMessageSpy).toHaveBeenCalledTimes(1);

    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
  });
});
