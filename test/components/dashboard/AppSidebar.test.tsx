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

  it('tracks finger touch gestures smoothly to open from left edge and close by swiping left, without hijacking vertical scroll', () => {
    const onOpen = jest.fn();
    const onClose = jest.fn();
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });

    const { rerender } = render(
      <ThemeProvider>
        <AppSidebar
          isOpen={false}
          onOpen={onOpen}
          onClose={onClose}
          userId="u-1"
          userName="Igor"
          userInitials="IG"
          activeTab="overview"
          panelScope="individual"
          isCategoryDetailOpen={false}
          inFamily={false}
          familyMembersCount={0}
          pendingInvitesCount={0}
          onSelectIndividualPanel={jest.fn()}
          onSelectFamilyPanel={jest.fn()}
          onSelectHistory={jest.fn()}
          onOpenFamilyModal={jest.fn()}
          onOpenProfileModal={jest.fn()}
          onRequestLogout={jest.fn()}
        />
      </ThemeProvider>,
    );

    const edgeHandle = screen.getByTestId('sidebar-edge-handle');
    const sidebar = screen.getByTestId('app-sidebar');

    // Vertical scroll gesture must NOT trigger drawer drag
    fireEvent.touchStart(edgeHandle, {
      touches: [{ identifier: 1, clientX: 12, clientY: 120 }],
    });
    fireEvent.touchMove(edgeHandle, {
      touches: [{ identifier: 1, clientX: 15, clientY: 180 }],
    });
    expect(sidebar).toHaveAttribute('data-dragging', 'false');
    fireEvent.touchEnd(edgeHandle, {
      changedTouches: [{ identifier: 1, clientX: 15, clientY: 180 }],
    });
    expect(onOpen).not.toHaveBeenCalled();

    // Horizontal swipe from left edge tracks finger via translate3d and opens past threshold
    fireEvent.touchStart(edgeHandle, {
      touches: [{ identifier: 2, clientX: 10, clientY: 200 }],
    });
    fireEvent.touchMove(edgeHandle, {
      touches: [{ identifier: 2, clientX: 100, clientY: 202 }],
    });
    expect(sidebar).toHaveAttribute('data-dragging', 'true');
    expect(sidebar.style.transform).toContain('translate3d(-195px, 0, 0)');
    fireEvent.touchEnd(edgeHandle, {
      changedTouches: [{ identifier: 2, clientX: 190, clientY: 202 }],
    });
    expect(onOpen).toHaveBeenCalledTimes(1);

    // When open, swipe left tracks finger and closes when past threshold
    rerender(
      <ThemeProvider>
        <AppSidebar
          isOpen={true}
          onOpen={onOpen}
          onClose={onClose}
          userId="u-1"
          userName="Igor"
          userInitials="IG"
          activeTab="overview"
          panelScope="individual"
          isCategoryDetailOpen={false}
          inFamily={false}
          familyMembersCount={0}
          pendingInvitesCount={0}
          onSelectIndividualPanel={jest.fn()}
          onSelectFamilyPanel={jest.fn()}
          onSelectHistory={jest.fn()}
          onOpenFamilyModal={jest.fn()}
          onOpenProfileModal={jest.fn()}
          onRequestLogout={jest.fn()}
        />
      </ThemeProvider>,
    );

    const openSidebar = screen.getByTestId('app-sidebar');
    fireEvent.touchStart(openSidebar, {
      touches: [{ identifier: 3, clientX: 250, clientY: 180 }],
    });
    fireEvent.touchMove(openSidebar, {
      touches: [{ identifier: 3, clientX: 150, clientY: 182 }],
    });
    expect(openSidebar).toHaveAttribute('data-dragging', 'true');
    expect(openSidebar.style.transform).toContain('translate3d(-100px, 0, 0)');
    fireEvent.touchEnd(openSidebar, {
      changedTouches: [{ identifier: 3, clientX: 90, clientY: 182 }],
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
