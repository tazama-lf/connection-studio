import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingPage from '../../src/pages/LoadingPage';

describe('LoadingPage', () => {
  it('renders the loading text', () => {
    render(<LoadingPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders the wait message', () => {
    render(<LoadingPage />);
    expect(
      screen.getByText('Please wait while we prepare your workspace'),
    ).toBeInTheDocument();
  });

  it('renders the Tazama logo', () => {
    render(<LoadingPage />);
    const logo = screen.getByAltText('Tazama Logo');
    expect(logo).toBeInTheDocument();
  });

  it('renders a spinner element', () => {
    const { container } = render(<LoadingPage />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});
