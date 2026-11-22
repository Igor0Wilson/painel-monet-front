import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import AppSidebar from '../../../src/components/dashboard/AppSidebar';
import { ThemeProvider } from '../../../src/context/ThemeContext';
import i18n, { LANGUAGE_STORAGE_KEY } from '../../../src/i18n';

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}));

describe('AppSidebar (Installed Android & iPhone App Menu)', () => {
  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.removeAttribute('data-theme');
    await act(async () => {
      await i18n.changeLanguage('pt-BR');
    });
  });

  afterEach(async () => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.removeAttribute('data-theme');
    await act(async () => {
      await i18n.changeLanguage('pt-BR');
    });
  });

  it('displays user name, photo, modules without Family Panel when user is not in a family, plus translation, dark mode, and logout', () => {
    const onSelectIndividualPanel = jest.fn();
    const onSelectFamilyPanel = jest.fn();
    const onSelectHistory = jest.fn();
    const onOpenFamilyModal = jest.fn();
    const onOpenProfileModal = jest.fn();
    const onRequestLogout = jest.fn();
    const onClose = jest.fn();

    render(
      <ThemeProvider>
        <AppSidebar
          isOpen={true}
          onClose={onClose}
          userId="u-1"
          userName="Igor Wilson"
          userInitials="IW"
          userAvatarUrl="https://cdn.example.com/avatar.png"
          activeTab="overview"
          panelScope="individual"
          isCategoryDetailOpen={false}
          inFamily={false}
          familyMembersCount={0}
          pendingInvitesCount={1}
          onSelectIndividualPanel={onSelectIndividualPanel}
          onSelectFamilyPanel={onSelectFamilyPanel}
          onSelectHistory={onSelectHistory}
          onOpenFamilyModal={onOpenFamilyModal}
          onOpenProfileModal={onOpenProfileModal}
          onRequestLogout={onRequestLogout}
        />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('sidebar-user-name')).toHaveTextContent('Igor Wilson');
    expect(screen.getByTestId('sidebar-user-avatar-img')).toHaveAttribute(
      'src',
      'https://cdn.example.com/avatar.png',
    );
    expect(screen.getByTestId('sidebar-nav-individual')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-nav-family')).not.toBeInTheDocument();
    expect(screen.getByTestId('sidebar-nav-history')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-nav-connect')).toHaveTextContent('Conectar com alguém');
    expect(screen.getByTestId('sidebar-logout-btn')).toHaveTextContent('Sair da conta');

    fireEvent.click(screen.getByTestId('sidebar-nav-history'));
    expect(onSelectHistory).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('sidebar-nav-connect'));
    expect(onOpenFamilyModal).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('sidebar-profile-btn'));
    expect(onOpenProfileModal).toHaveBeenCalledTimes(1);

    // Test translation and dark mode controls inside sidebar
    fireEvent.click(screen.getByTestId('lang-btn-en-US'));
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en-US');
    expect(screen.getByTestId('sidebar-nav-individual')).toHaveTextContent('Individual Panel');
    expect(screen.getByTestId('sidebar-nav-connect')).toHaveTextContent('Connect with someone');
    expect(screen.getByTestId('sidebar-logout-btn')).toHaveTextContent('Sign out');

    fireEvent.click(screen.getByTestId('theme-toggle-btn'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('pm_theme')).toBe('dark');

    fireEvent.click(screen.getByTestId('sidebar-logout-btn'));
    expect(onRequestLogout).toHaveBeenCalledTimes(1);
  });

  it('shows Family Panel option in sidebar when user belongs to a family group', () => {
    const onSelectFamilyPanel = jest.fn();
    const onClose = jest.fn();

    render(
      <ThemeProvider>
        <AppSidebar
          isOpen={true}
          onClose={onClose}
          userId="u-1"
          userName="Maria Clara"
          userInitials="MC"
          userAvatarUrl={null}
          activeTab="overview"
          panelScope="individual"
          isCategoryDetailOpen={false}
          inFamily={true}
          familyMembersCount={3}
          pendingInvitesCount={0}
          onSelectIndividualPanel={jest.fn()}
          onSelectFamilyPanel={onSelectFamilyPanel}
          onSelectHistory={jest.fn()}
          onOpenFamilyModal={jest.fn()}
          onOpenProfileModal={jest.fn()}
          onRequestLogout={jest.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('sidebar-user-initials')).toHaveTextContent('MC');
    const familyBtn = screen.getByTestId('sidebar-nav-family');
    expect(familyBtn).toBeInTheDocument();
    expect(familyBtn).toHaveTextContent('Painel Família');
    expect(familyBtn).toHaveTextContent('3');

    fireEvent.click(familyBtn);
    expect(onSelectFamilyPanel).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
