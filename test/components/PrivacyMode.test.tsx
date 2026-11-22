import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import PrivacyToggleButton from '../../src/components/PrivacyToggleButton';
import KpiGrid from '../../src/components/dashboard/KpiGrid';
import { PrivacyModeProvider } from '../../src/context/PrivacyModeContext';
import i18n from '../../src/i18n';

describe('PrivacyMode ("Olho Mágico") Toggle', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('pt-BR');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('hides and reveals all displayed monetary values when toggled', () => {
    const mockBalance = {
      balance: 3120.5,
      totalIncome: 5000,
      scheduledIncome: 0,
      totalExpenses: 2549.25,
      emergencyFund: 12000,
      investments: 8500,
      foodAllowance: 600,
      ownBalance: 3120.5,
      ownEmergencyFund: 12000,
      ownInvestments: 8500,
      memberBreakdown: [],
    };

    render(
      <PrivacyModeProvider>
        <div>
          <PrivacyToggleButton variant="sidebar" />
          <KpiGrid
            balance={mockBalance}
            incomesCount={2}
            isFamilyMode={false}
            onOpenEmergencyModal={jest.fn()}
            onOpenInvestmentModal={jest.fn()}
          />
        </div>
      </PrivacyModeProvider>,
    );

    expect(screen.getByText(/3\.120,50/)).toBeInTheDocument();
    expect(screen.getByText(/5\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/12\.000,00/)).toBeInTheDocument();

    const eyeBtn = screen.getByTestId('privacy-eye-btn');
    fireEvent.click(eyeBtn);

    expect(localStorage.getItem('pm_hide_values')).toBe('true');
    expect(eyeBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText(/3\.120,50/)).not.toBeInTheDocument();
    expect(screen.queryByText(/5\.000,00/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/R\$\s*•••••/).length).toBeGreaterThanOrEqual(4);

    fireEvent.click(eyeBtn);
    expect(localStorage.getItem('pm_hide_values')).toBe('false');
    expect(screen.getByText(/3\.120,50/)).toBeInTheDocument();
    expect(screen.getByText(/5\.000,00/)).toBeInTheDocument();
  });
});
