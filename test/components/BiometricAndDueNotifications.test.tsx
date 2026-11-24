import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import api from '../../src/api';
import { AuthProvider } from '../../src/context/AuthContext';
import UserEditModal from '../../src/components/UserEditModal';
import Login from '../../src/pages/Login';
import * as appEnv from '../../src/utils/appEnvironment';
import * as biometricAuth from '../../src/utils/biometricAuth';
import * as securityLockAuth from '../../src/utils/securityLockAuth';
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

  it('keeps separate Digital & Facial slots on Login, auto-reveals PIN on Digital failure, and allows Facial or PIN login for Gmail accounts', async () => {
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

    biometricAuth.saveLocalBiometricPointer({
      id: 'cred-fp',
      credentialId: 'native-fp-1',
      protocol: 'native_hmac',
      kind: 'fingerprint',
      platform: 'mobile_android',
      deviceLabel: 'Pixel Digital',
    });
    biometricAuth.saveLocalBiometricPointer({
      id: 'cred-face',
      credentialId: 'native-face-1',
      protocol: 'native_hmac',
      kind: 'facial',
      platform: 'mobile_android',
      deviceLabel: 'Pixel Facial',
    });
    securityLockAuth.saveLocalPinToken({
      pinDeviceToken: 'signed.pin.token',
      authProvider: 'google',
      userName: 'Usuario Gmail',
    });

    expect(biometricAuth.getLocalBiometricPointers()).toHaveLength(2);
    expect(biometricAuth.getLocalBiometricPointer('fingerprint')?.credentialId).toBe(
      'native-fp-1',
    );
    expect(biometricAuth.getLocalBiometricPointer('facial')?.credentialId).toBe(
      'native-face-1',
    );

    const loginBioSpy = jest
      .spyOn(biometricAuth, 'loginWithBiometricCredential')
      .mockRejectedValueOnce(new Error('fingerprint_cancelled'))
      .mockResolvedValueOnce({
        access_token: 'jwt-facial-google',
        user: {
          id: 'u-google-1',
          name: 'Usuario Gmail',
          maskedEmail: 'us***@gmail.com',
          maskedCpf: '***.111.222-**',
          hasCpf: true,
        },
      });

    render(
      <AuthProvider>
        <Login />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('biometric-login-btn')).toHaveTextContent(
        'Entrar com Digital',
      );
      expect(screen.getByTestId('facial-login-btn')).toHaveTextContent(
        'Entrar com Reconhecimento Facial',
      );
      expect(screen.getByTestId('pin-login-toggle-btn')).toBeInTheDocument();
      expect(screen.getByTestId('google-persist-quick-hint')).toBeInTheDocument();
    });

    // Failing Digital reveals PIN fallback form automatically
    fireEvent.click(screen.getByTestId('biometric-login-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('login-pin-form')).toBeInTheDocument();
    });

    // Explicit Facial button authenticates directly using the facial slot
    fireEvent.click(screen.getByTestId('facial-login-btn'));
    await waitFor(() => {
      expect(loginBioSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ preferredKind: 'facial' }),
      );
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('allows configuring and removing Access Code (PIN) inside UserEditModal alongside biometrics', async () => {
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
          data: { name: 'Igor Gmail', email: 'igor@gmail.com', cpf: '', phone: '' },
        });
      }
      if (url === '/auth/biometric/credentials') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/auth/security-pin/status') {
        return Promise.resolve({
          data: {
            hasPin: false,
            updatedAt: null,
            lockedUntilMs: null,
            authProvider: 'google',
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    mockedApi.post.mockImplementation((url: string) => {
      if (url === '/auth/security-pin') {
        return Promise.resolve({
          data: {
            hasPin: true,
            updatedAt: '2026-11-22T12:00:00Z',
            pinDeviceToken: 'signed.device.pin',
            authProvider: 'google',
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
    mockedApi.delete.mockResolvedValue({ data: { hasPin: false } });

    render(
      <AuthProvider>
        <UserEditModal
          isOpen={true}
          onClose={jest.fn()}
          userData={{ name: 'Igor Gmail', email: 'igor@gmail.com' }}
          onSuccess={jest.fn()}
        />
      </AuthProvider>,
    );

    const pinInput = await screen.findByTestId('pin-settings-input');
    fireEvent.change(pinInput, { target: { value: '4829' } });
    fireEvent.click(screen.getByTestId('pin-save-btn'));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/auth/security-pin', {
        pin: '4829',
      });
      expect(screen.getByTestId('pin-remove-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('pin-remove-btn'));
    await waitFor(() => {
      expect(mockedApi.delete).toHaveBeenCalledWith('/auth/security-pin');
    });
  });
});
