import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import api from '../../src/api';
import { AuthProvider } from '../../src/context/AuthContext';
import { ThemeProvider } from '../../src/context/ThemeContext';
import i18n from '../../src/i18n';
import Dashboard from '../../src/pages/Dashboard';
import {
  notifyFamilyInviteOnDevice,
  requestDeviceNotificationPermission,
} from '../../src/utils/deviceNotifications';

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

function mockDashboardRequests(inFamily: boolean) {
  mockedApi.get.mockImplementation((url: string) => {
    if (url === '/family/status') {
      return Promise.resolve({
        data: {
          hasCpf: true,
          maskedCpf: '***.456.789-**',
          inFamily,
          hasGroup: inFamily,
          group: inFamily ? { id: 'fam-1', name: 'Família Silva' } : null,
          members: inFamily
            ? [
                { userId: 'u-1', name: 'Igor Wilson', maskedCpf: '***.456.789-**', role: 'owner', isSelf: true },
                { userId: 'u-2', name: 'Ana Silva', maskedCpf: '***.111.222-**', role: 'member', isSelf: false },
              ]
            : [],
          pendingReceivedInvites: [],
          pendingSentInvites: [],
        },
      });
    }
    if (url === '/balance') {
      return Promise.resolve({
        data: {
          balance: 2500,
          totalIncome: 5000,
          scheduledIncome: 0,
          totalExpenses: 2500,
          emergencyFund: 500,
          investments: 1000,
          foodAllowance: 300,
          ownBalance: 2500,
          ownEmergencyFund: 500,
          ownInvestments: 1000,
          memberBreakdown: [],
        },
      });
    }
    if (url === '/users/me') {
      return Promise.resolve({
        data: {
          id: 'u-1',
          name: 'Igor Wilson',
          maskedEmail: 'ig***@empresa.com',
          maskedCpf: '***.456.789-**',
          hasCpf: true,
          avatarUrl: null,
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
          monthSummary: { month: '2026-11', totalIncome: 5000, scheduledIncome: 0, totalExpenses: 2500, netFlow: 2500 },
          availableMonths: ['2026-11'],
        },
      });
    }
    if (url === '/expenses' || url === '/income' || url === '/balance/investments/items' || url === '/account-types') {
      return Promise.resolve({ data: [] });
    }
    if (url === '/users/me/profile') {
      return Promise.resolve({
        data: {
          id: 'u-1',
          name: 'Igor Wilson',
          email: 'igor@empresa.com',
          cpf: '12345678900',
          phone: '11999999999',
          avatarUrl: null,
        },
      });
    }
    return Promise.resolve({ data: {} });
  });
}

describe('Dashboard Website vs Installed App Sidebar behavior', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    (notifyFamilyInviteOnDevice as jest.Mock).mockResolvedValue(undefined);
    (requestDeviceNotificationPermission as jest.Mock).mockResolvedValue(undefined);
    localStorage.clear();
    localStorage.setItem('token', 'fake-jwt-token');
    localStorage.setItem('user', JSON.stringify({ id: 'u-1', name: 'Igor Wilson', hasCpf: true }));
    document.documentElement.classList.remove('dark');
    document.documentElement.removeAttribute('data-theme');
    delete (window as unknown as { __PM_RUNNING_IN_APP__?: boolean }).__PM_RUNNING_IN_APP__;
    delete (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView;
    window.history.replaceState({}, '', '/dashboard');
    await act(async () => {
      await i18n.changeLanguage('pt-BR');
    });
  });

  afterEach(async () => {
    delete (window as unknown as { __PM_RUNNING_IN_APP__?: boolean }).__PM_RUNNING_IN_APP__;
    delete (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView;
    window.history.replaceState({}, '', '/dashboard');
    document.documentElement.classList.remove('dark');
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
    await act(async () => {
      await i18n.changeLanguage('pt-BR');
    });
  });

  it('keeps the original Navbar and layout when accessed as a regular website', async () => {
    mockDashboardRequests(true);

    render(
      <ThemeProvider>
        <AuthProvider>
          <Dashboard />
        </AuthProvider>
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-family-btn')).toBeInTheDocument();
      expect(mockedApi.get).toHaveBeenCalledWith('/users/me');
      expect(mockedApi.get).toHaveBeenCalledWith('/family/status');
      expect(mockedApi.get).toHaveBeenCalledWith('/balance/charts', expect.any(Object));
    });

    expect(screen.queryByTestId('app-sidebar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-open-btn')).not.toBeInTheDocument();
    expect(screen.getByTestId('navbar-user-initials')).toHaveTextContent('IW');

    // Verify Website lateral module sidebar & WSS Prime footer
    expect(screen.getByTestId('web-module-sidebar')).toBeInTheDocument();
    const footer = screen.getByTestId('dashboard-footer');
    expect(footer).toHaveTextContent(/WSS Prime/i);
    expect(footer).not.toHaveTextContent(/Painel Monet/i);
    expect(screen.getByAltText('WSS Prime')).toHaveAttribute('src', '/wss-prime-logo.png');

    // Verify full module menu navigation in Website mode
    expect(screen.getByTestId('overview-session-hub')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nav-tab-finances'));
    const combinedFinances = screen.getByTestId('finances-combined-section');
    expect(combinedFinances).toBeInTheDocument();
    expect(within(combinedFinances).getByText('Receitas & Salários')).toBeInTheDocument();
    expect(within(combinedFinances).getByText('Contas & Despesas')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nav-tab-expenses'));
    expect(screen.queryByTestId('finances-combined-section')).not.toBeInTheDocument();
    expect(screen.getByText('Controle de vencimentos, soma por período e pagamento em lote')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nav-tab-incomes'));
    expect(screen.getByText('Receitas & Salários')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nav-tab-cards'));
    expect(screen.getByTestId('credit-card-invoice-panel')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nav-tab-food'));
    expect(screen.getByTestId('food-voucher-section')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nav-tab-investments'));
    expect(screen.getByTestId('emergency-reserve-yield-card')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nav-tab-overview'));
    expect(screen.getByTestId('overview-session-hub')).toBeInTheDocument();
  });

  it('renders the lateral navigation sidebar when running as an installed Android/iPhone app', async () => {
    (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView = {
      postMessage: jest.fn(),
    };
    mockDashboardRequests(true);

    render(
      <ThemeProvider>
        <AuthProvider>
          <Dashboard />
        </AuthProvider>
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('app-sidebar')).toBeInTheDocument();
      expect(mockedApi.get).toHaveBeenCalledWith('/users/me');
      expect(mockedApi.get).toHaveBeenCalledWith('/family/status');
      expect(mockedApi.get).toHaveBeenCalledWith('/balance/charts', expect.any(Object));
    });

    expect(screen.getByTestId('sidebar-open-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-family-btn')).not.toBeInTheDocument();
    expect(screen.getByTestId('sidebar-user-name')).toHaveTextContent('Igor Wilson');
    expect(screen.getByTestId('sidebar-nav-individual')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-nav-family')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-nav-finances')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-nav-incomes')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-nav-expenses')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-nav-cards')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-nav-food')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-nav-investments')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-nav-history')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-nav-connect')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-logout-btn')).toBeInTheDocument();

    // Open mobile drawer and verify Android hardware back button closes it
    fireEvent.click(screen.getByTestId('sidebar-open-btn'));
    expect(screen.getByTestId('app-sidebar')).toHaveAttribute('data-open', 'true');
    const win = window as Window & { __PM_HANDLE_BACK__?: () => boolean };
    act(() => {
      win.__PM_HANDLE_BACK__?.();
    });
    expect(screen.getByTestId('app-sidebar')).toHaveAttribute('data-open', 'false');

    // Switch to Family Panel via sidebar
    fireEvent.click(screen.getByTestId('sidebar-nav-family'));
    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/balance', { params: { scope: 'family' } });
    });

    // Switch to History via sidebar
    fireEvent.click(screen.getByTestId('sidebar-nav-history'));
    await waitFor(() => {
      expect(screen.getByText(/Histórico Completo & Extrato/)).toBeInTheDocument();
    });

    // Switch back to Individual Panel via sidebar
    fireEvent.click(screen.getByTestId('sidebar-nav-individual'));
    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/balance', { params: { scope: 'individual' } });
    });

    // Switch language & dark mode from sidebar
    fireEvent.click(screen.getByTestId('lang-btn-en-US'));
    expect(screen.getByTestId('sidebar-nav-individual')).toHaveTextContent('Individual Panel');
    fireEvent.click(screen.getByTestId('theme-toggle-btn'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Open Connect / Family modal via sidebar
    fireEvent.click(screen.getByTestId('sidebar-nav-connect'));
    await waitFor(() => {
      expect(screen.getByText('Invite spouse or relative by CPF')).toBeInTheDocument();
    });
  });

  it('hides Family Panel button in installed app sidebar when user is not in a family and triggers logout confirm', async () => {
    window.history.replaceState({}, '', '/dashboard?app=1');
    mockDashboardRequests(false);

    render(
      <ThemeProvider>
        <AuthProvider>
          <Dashboard />
        </AuthProvider>
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('app-sidebar')).toBeInTheDocument();
      expect(mockedApi.get).toHaveBeenCalledWith('/users/me');
      expect(mockedApi.get).toHaveBeenCalledWith('/family/status');
      expect(mockedApi.get).toHaveBeenCalledWith('/balance/charts', expect.any(Object));
    });

    expect(screen.getByTestId('sidebar-nav-individual')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-nav-family')).not.toBeInTheDocument();
    expect(screen.getByTestId('sidebar-nav-connect')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-nav-history')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('sidebar-logout-btn'));
    expect(screen.getByText('Sair do Painel Financeiro?')).toBeInTheDocument();
  });
});
