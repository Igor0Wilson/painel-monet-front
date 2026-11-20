import React from 'react';
import { render, screen } from '@testing-library/react';
import StatusBadge from '../../../src/components/dashboard/StatusBadge';

describe('StatusBadge', () => {
  it('renders Pago no Crédito for credit card settlements', () => {
    render(<StatusBadge status="pago" paymentMethod="credito" />);
    expect(screen.getByText('Pago no Crédito')).toBeInTheDocument();
  });

  it('renders Pago · Pix, VA, and VR labels for settled expenses', () => {
    const { rerender } = render(<StatusBadge status="pago" paymentMethod="pix" />);
    expect(screen.getByText('Pago · Pix')).toBeInTheDocument();

    rerender(<StatusBadge status="pago" paymentMethod="va" />);
    expect(screen.getByText('Pago · VA')).toBeInTheDocument();

    rerender(<StatusBadge status="pago" paymentMethod="vr" />);
    expect(screen.getByText('Pago · VR')).toBeInTheDocument();
  });

  it('renders Em atraso and Pendente states accurately', () => {
    const { rerender } = render(<StatusBadge status="em_atraso" />);
    expect(screen.getByText('Em atraso')).toBeInTheDocument();

    rerender(<StatusBadge status="pendente" />);
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });
});
