import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import api from '../../src/api';
import { AuthProvider } from '../../src/context/AuthContext';
import { ThemeProvider } from '../../src/context/ThemeContext';
import i18n from '../../src/i18n';
import Dashboard from '../../src/pages/Dashboard';
import * as biometricAuth from '../../src/utils/biometricAuth';
import {
  notifyDueExpenseOnDevice,
  notifyFamilyInviteOnDevice,
  requestDeviceNotificationPermission,
} from '../../src/utils/deviceNotifications';
import * as securityLockAuth from '../../src/utils/securityLockAuth';

jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => jest.fn(),
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

jest.mock('../../src/hooks/useFamilyRealtimeSync', () => ({
  useFamilyRealtimeSync: jest.fn(),
}));

jest.mock('../../src/utils/deviceNotifications', () => ({
  notifyFamilyInviteOnDevice: jest.fn().mockResolvedValue(undefined),
  notifyDueExpenseOnDevice: jest.fn().mockResolvedValue(false),
  requestDeviceNotificationPermission: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-chartjs-2', () => ({
  Doughnut: () => <div data-testid="mock-doughnut-chart" />,
  Line: () => <div data-testid="mock-line-chart" />,
}));

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}));

const mockedApi = api as unknown as {
  get: jest.Mock;
  post: jest.Mock;
};

function setupMockDashboardApis() {
  mockedApi.get.mockImplementation((url: string) => {
    if (url === '/family/status') {
      return Promise.resolve({
        data: {
          hasCpf: true,
          inFamily: false,
          hasGroup: false,
          members: [],
          pendingReceivedInvites: [],
          pendingSentInvites: [],
        },
      });
    }
    if (url === '/users/me') {
      return Promise.resolve({
        data: {
          id: 'u-google-1',
          name: 'Igor Gmail',
          maskedEmail: 'ig***@gmail.com',
          maskedCpf: '***.111.222-**',
          hasCpf: true,
          avatarUrl: null,
        },
      });
    }
    if (url === '/balance') {
      return Promise.resolve({
        data: {
          balance: 1000,
          totalIncome: 2000,
          scheduledIncome: 0,
          totalExpenses: 1000,
          emergencyFund: 0,
          investments: 0,
          foodAllowance: 0,
          ownBalance: 1000,
          ownEmergencyFund: 0,
          ownInvestments: 0,
          memberBreakdown: [],
        },
      });
    }
    if (url === '/balance/charts') {
      return Promise.resolve({
        data: {
          month: '2026-11',
          scope: 'individual',
          expensesByCategory: [],
          monthlyHistory: [],
          monthSummary: {
            month: '2026-11',
            totalIncome: 2000,
            scheduledIncome: 0,
            totalExpenses: 1000,
            netFlow: 1000,
          },
          availableMonths: ['2026-11'],
        },
      });
    }
    if (url === '/auth/biometric/credentials') {
      return Promise.resolve({
        data: [
          {
            id: 'cred-fp',
            credentialId: 'native-fp-lock',
            protocol: 'native_hmac',
            kind: 'fingerprint',
            platform: 'mobile_android',
            deviceLabel: 'Pixel Digital',
            isEnabled: true,
            createdAt: '2026-11-22T10:00:00Z',
            updatedAt: '2026-11-22T10:00:00Z',
          },
          {
            id: 'cred-face',
            credentialId: 'native-face-lock',
            protocol: 'native_hmac',
            kind: 'facial',
            platform: 'mobile_android',
            deviceLabel: 'Pixel Facial',
            isEnabled: true,
            createdAt: '2026-11-22T10:00:00Z',
            updatedAt: '2026-11-22T10:00:00Z',
          },
        ],
      });
    }
    return Promise.resolve({ data: [] });
  });

  mockedApi.post.mockImplementation((url: string) => {
    if (url === '/auth/security-pin/device-token') {
      return Promise.resolve({
        data: {
          hasPin: true,
          updatedAt: '2026-11-22T12:00:00Z',
          pinDeviceToken: 'signed.pin.device.token',
          authProvider: 'google',
        },
      });
    }
    if (url === '/auth/security-pin/verify') {
      return Promise.resolve({
        data: {
          access_token: 'fresh-pin-jwt',
          user: {
            id: 'u-google-1',
            name: 'Igor Gmail',
            maskedEmail: 'ig***@gmail.com',
            maskedCpf: '***.111.222-**',
            hasCpf: true,
            avatarUrl: null,
          },
        },
      });
    }
    return Promise.resolve({ data: {} });
  });
}

describe('Installed App Minimize Lock Overlay (Digital Priority -> Code Fallback + Facial Button)', () => {
  beforeEach(async () => {
    localStorage.clear();
    jest.clearAllMocks();
    (notifyFamilyInviteOnDevice as jest.Mock).mockResolvedValue(undefined);
    (notifyDueExpenseOnDevice as jest.Mock).mockResolvedValue(false);
    (requestDeviceNotificationPermission as jest.Mock).mockResolvedValue(undefined);
    (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView = {
      postMessage: jest.fn(),
    };
    localStorage.setItem('token', 'initial-jwt');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'u-google-1', name: 'Igor Gmail', hasCpf: true }),
    );
    await act(async () => {
      await i18n.changeLanguage('pt-BR');
    });
  });

  afterEach(() => {
    delete (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView;
    delete (window as unknown as { __PM_RUNNING_IN_APP__?: boolean }).__PM_RUNNING_IN_APP__;
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('locks Dashboard on app minimize/resume, prioritizes Digital automatically, reveals PIN on Digital failure, offers Facial button, and unlocks with verified PIN', async () => {
    setupMockDashboardApis();

    biometricAuth.saveLocalBiometricPointer({
      id: 'cred-fp',
      credentialId: 'native-fp-lock',
      protocol: 'native_hmac',
      kind: 'fingerprint',
      platform: 'mobile_android',
      deviceLabel: 'Pixel Digital',
    });
    biometricAuth.saveLocalBiometricPointer({
      id: 'cred-face',
      credentialId: 'native-face-lock',
      protocol: 'native_hmac',
      kind: 'facial',
      platform: 'mobile_android',
      deviceLabel: 'Pixel Facial',
    });

    const loginBioSpy = jest
      .spyOn(biometricAuth, 'loginWithBiometricCredential')
      .mockRejectedValueOnce(new Error('biometric_cancelled'));

    render(
      <ThemeProvider>
        <AuthProvider>
          <Dashboard />
        </AuthProvider>
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('app-sidebar')).toBeInTheDocument();
      expect(mockedApi.post).toHaveBeenCalledWith('/auth/security-pin/device-token', {});
    });

    expect(screen.queryByTestId('app-lock-overlay')).not.toBeInTheDocument();

    // Simulate minimizing & returning to app via RN lifecycle bridge
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('PM_APP_LIFECYCLE', { detail: { state: 'resume_lock' } }),
      );
    });

    // 1. Lock overlay visible and Digital auto-attempted first
    await waitFor(() => {
      expect(screen.getByTestId('app-lock-overlay')).toBeInTheDocument();
      expect(loginBioSpy).toHaveBeenCalledWith(
        expect.objectContaining({ preferredKind: 'fingerprint' }),
      );
    });

    // 2. When Digital fails/cancels, Code (PIN) input and dedicated Facial button appear
    await waitFor(() => {
      expect(screen.getByTestId('lock-pin-input')).toBeInTheDocument();
      expect(screen.getByTestId('lock-facial-btn')).toBeInTheDocument();
    });

    // 3. Entering valid numeric Code verifies via backend and unlocks dashboard
    fireEvent.change(screen.getByTestId('lock-pin-input'), {
      target: { value: '4829' },
    });
    fireEvent.click(screen.getByTestId('lock-pin-submit-btn'));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/auth/security-pin/verify', {
        pinDeviceToken: 'signed.pin.device.token',
        pin: '4829',
      });
      expect(screen.queryByTestId('app-lock-overlay')).not.toBeInTheDocument();
    });

    // Ensure Google auth provider hint remained intact
    expect(securityLockAuth.getAuthProviderHint()).toBe('google');

    // Minimize again -> auto Digital fails/cancels, then clicking dedicated Facial button unlocks
    loginBioSpy
      .mockRejectedValueOnce(new Error('fingerprint_cancelled'))
      .mockResolvedValueOnce({
        access_token: 'fresh-facial-jwt',
        user: {
          id: 'u-google-1',
          name: 'Igor Gmail',
          maskedEmail: 'ig***@gmail.com',
          maskedCpf: '***.111.222-**',
          hasCpf: true,
          avatarUrl: null,
        },
      });
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('PM_APP_LIFECYCLE', { detail: { state: 'resume_lock' } }),
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId('app-lock-overlay')).toBeInTheDocument();
      expect(screen.getByTestId('lock-facial-btn')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('lock-facial-btn'));
    await waitFor(() => {
      expect(loginBioSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ preferredKind: 'facial' }),
      );
      expect(screen.queryByTestId('app-lock-overlay')).not.toBeInTheDocument();
    });
  });
});
