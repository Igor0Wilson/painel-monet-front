import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import AllocationModal from '../../../src/components/dashboard/AllocationModal';

describe('AllocationModal', () => {
  it('supports pre-existing vs monthly balance toggle, thousand separators, and live projected balance', () => {
    const onChangeValue = jest.fn();
    const onChangeSavingsFromBalance = jest.fn();
    const onReclassifyToExternal = jest.fn();

    render(
      <AllocationModal
        isOpen={true}
        variant="investment"
        value="400"
        maxLimit={2500}
        ownAvailableBalance={1500}
        savingsFromBalance={true}
        allocatedSavings={1000}
        externalSavings={5000}
        loading={false}
        onChangeValue={onChangeValue}
        onChangeSavingsFromBalance={onChangeSavingsFromBalance}
        onReclassifyToExternal={onReclassifyToExternal}
        onClose={jest.fn()}
        onSubmit={jest.fn((e) => e.preventDefault())}
      />,
    );

    // With allocatedSavings = 1000, new input = 400 releases +600 to spend -> projected = 2100
    expect(screen.getByText(/liberado para gastar/)).toBeInTheDocument();
    expect(screen.getByText(/Carteira já existente/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Carteira já existente'));
    expect(onChangeSavingsFromBalance).toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByText('Mover para carteira já existente'));
    expect(onReclassifyToExternal).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText(/Resgatar tudo para o saldo/));
    expect(onChangeValue).toHaveBeenCalledWith('0');

    const input = screen.getByPlaceholderText('0,00');
    fireEvent.change(input, { target: { value: '12500' } });
    expect(onChangeValue).toHaveBeenCalledWith('12.500');
  });

  it('supports unlimited pre-existing emergency fund without reducing monthly balance', () => {
    render(
      <AllocationModal
        isOpen={true}
        variant="emergency"
        value="15.000"
        maxLimit={0}
        ownAvailableBalance={200}
        savingsFromBalance={false}
        allocatedSavings={0}
        externalSavings={15000}
        loading={false}
        onChangeValue={jest.fn()}
        onClose={jest.fn()}
        onSubmit={jest.fn((e) => e.preventDefault())}
      />,
    );

    expect(screen.getByText('Reserva já existente')).toBeInTheDocument();
    expect(screen.getByText(/Modo ilimitado/)).toBeInTheDocument();
  });
});
