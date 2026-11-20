import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import KpiGrid from '../../../src/components/dashboard/KpiGrid';
import { BalanceData } from '../../../src/types/finance';

const mockBalance: BalanceData = {
  balance: 2500,
  totalIncome: 5000,
  scheduledIncome: 1500,
  totalExpenses: 1000,
  emergencyFund: 500,
  investments: 1000,
  foodAllowance: 650,
  foodAllowanceTotal: 800,
  foodAllowanceScheduled: 400,
  foodAllowanceUsed: 150,
  ownBalance: 2500,
  ownEmergencyFund: 500,
  ownInvestments: 1000,
  ownFoodAllowance: 650,
  ownFoodAllowanceNextDate: '2026-12-01',
  memberBreakdown: [],
};

describe('KpiGrid', () => {
  it('renders individual KPIs, VA/VR card, scheduled income, and triggers action buttons', () => {
    const onEmergency = jest.fn();
    const onInvestment = jest.fn();
    const onFoodAllowance = jest.fn();

    render(
      <KpiGrid
        balance={mockBalance}
        incomesCount={2}
        isFamilyMode={false}
        onOpenEmergencyModal={onEmergency}
        onOpenInvestmentModal={onInvestment}
        onOpenFoodAllowanceModal={onFoodAllowance}
      />,
    );

    expect(screen.getByText('Patrimônio Disponível')).toBeInTheDocument();
    expect(screen.getByText('Reserva de Emergência')).toBeInTheDocument();
    expect(screen.getByText('Investimentos')).toBeInTheDocument();
    expect(screen.getByText('Vale Alimentação / Refeição')).toBeInTheDocument();
    expect(screen.getByText(/A receber:/)).toBeInTheDocument();
    expect(screen.getByText(/A cair/)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Guardar na reserva de emergência'));
    fireEvent.click(screen.getByLabelText('Guardar em investimentos'));
    fireEvent.click(screen.getByLabelText('Inserir Vale Alimentação ou Refeição'));

    expect(onEmergency).toHaveBeenCalledTimes(1);
    expect(onInvestment).toHaveBeenCalledTimes(1);
    expect(onFoodAllowance).toHaveBeenCalledTimes(1);
  });

  it('renders Family Mode consolidated labels when isFamilyMode is true', () => {
    render(
      <KpiGrid
        balance={mockBalance}
        incomesCount={4}
        isFamilyMode={true}
        onOpenEmergencyModal={jest.fn()}
        onOpenInvestmentModal={jest.fn()}
        onOpenFoodAllowanceModal={jest.fn()}
      />,
    );

    expect(screen.getByText('Patrimônio Disponível da Família')).toBeInTheDocument();
    expect(screen.getByText('Investimentos da Família')).toBeInTheDocument();
    expect(screen.getByText('Vale Alimentação / Refeição (Família)')).toBeInTheDocument();
  });

  it('renders pre-existing vs balance-allocated investment breakdown when provided', () => {
    render(
      <KpiGrid
        balance={{
          ...mockBalance,
          investments: 12000,
          allocatedInvestments: 2000,
          externalInvestments: 10000,
        }}
        incomesCount={1}
        isFamilyMode={false}
        onOpenEmergencyModal={jest.fn()}
        onOpenInvestmentModal={jest.fn()}
      />,
    );

    expect(screen.getByText(/Carteira anterior:/)).toBeInTheDocument();
    expect(screen.getByText(/Do saldo:/)).toBeInTheDocument();
  });

  it('displays total patrimony and corrective guidance when monthly allocations cause negative available balance', () => {
    render(
      <KpiGrid
        balance={{
          ...mockBalance,
          balance: -500,
          emergencyFund: 500,
          investments: 1000,
          ownAllocatedInvestments: 1000,
        }}
        incomesCount={1}
        isFamilyMode={false}
        onOpenEmergencyModal={jest.fn()}
        onOpenInvestmentModal={jest.fn()}
      />,
    );

    expect(screen.getByText(/Patrimônio total/)).toBeInTheDocument();
    expect(screen.getByText(/Parte do saldo foi retida em guardado do mês/)).toBeInTheDocument();
  });
});
