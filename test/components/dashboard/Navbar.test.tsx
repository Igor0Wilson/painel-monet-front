import React from 'react';
import { render, screen } from '@testing-library/react';
import Navbar from '../../../src/components/dashboard/Navbar';

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}));

describe('Navbar', () => {
  it('renders logo icon without Finanças text or family controls in the top bar', () => {
    render(
      <Navbar
        userId="u-1"
        userName="Igor Wilson"
        userInitials="IW"
        userAvatarUrl={null}
        onOpenProfileModal={jest.fn()}
        onRequestLogout={jest.fn()}
      />,
    );

    expect(screen.getByAltText('Finanças')).toBeInTheDocument();
    expect(screen.queryByText('Finanças')).not.toBeInTheDocument();
    expect(screen.queryByText('Família')).not.toBeInTheDocument();
    expect(screen.queryByText('Individual')).not.toBeInTheDocument();
    expect(screen.getByText('Igor Wilson')).toBeInTheDocument();
  });
});
