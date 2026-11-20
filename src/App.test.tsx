import React from 'react';
import { render, screen } from '@testing-library/react';
import ConfirmationModal from './components/ConfirmationModal';

describe('App core components', () => {
  it('renders ConfirmationModal cleanly when open', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Confirmar ação"
        message="Mensagem de verificação"
      />,
    );
    expect(screen.getByText('Confirmar ação')).toBeInTheDocument();
    expect(screen.getByText('Mensagem de verificação')).toBeInTheDocument();
  });
});
