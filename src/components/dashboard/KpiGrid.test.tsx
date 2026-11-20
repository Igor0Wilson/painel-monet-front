import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import KpiGrid from './KpiGrid';
import { BalanceData } from '../../types/finance';

const mockBalance: BalanceData = {
  balance: 2500,
  totalIncome: 5000,
  scheduledIncome: 1500,
  totalExpenses: 1000,
  emergencyFund: 500,
  investments: 1000,
  ownBalance: 2500,
  ownEmergencyFund: 500,
  ownInvestments: 1000,
  memberBreakdown: [],
};

describe('KpiGrid', () => {
  it('renders individual KPIs, scheduled income, and triggers Guardar actions', () => {
    const onEmergency = jest.fn();
    const onInvestment = jest.fn();

    render(
      <KpiGrid
        balance={mockBalance}
        incomesCount={2}
        isFamilyMode={false}
        onOpenEmergencyModal={onEmergency}
        onOpenInvestmentModal={onInvestment}
      />,
    );

    expect(screen.getByText('Patrimônio Disponível')).toBeInTheDocument();
    expect(screen.getByText('Reserva de Emergência')).toBeInTheDocument();
    expect(screen.getByText('Investimentos')).toBeInTheDocument();
    expect(screen.getByText(/A receber:/)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Guardar na reserva de emergência'));
    fireEvent.click(screen.getByLabelText('Guardar em investimentos'));

    expect(onEmergency).toHaveBeenCalledTimes(1);
    expect(onInvestment).toHaveBeenCalledTimes(1);
  });

  it('renders Family Mode consolidated labels when isFamilyMode is true', () => {
    render(
      <KpiGrid
        balance={mockBalance}
        incomesCount={4}
        isFamilyMode={true}
        onOpenEmergencyModal={jest.fn()}
        onOpenInvestmentModal={jest.fn()}
      />,
    );

    expect(screen.getByText('Patrimônio Disponível da Família')).toBeInTheDocument();
    expect(screen.getByText('Investimentos da Família')).toBeInTheDocument();
  });
});
