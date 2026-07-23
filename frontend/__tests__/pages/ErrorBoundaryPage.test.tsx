import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundaryPage from '../../src/pages/ErrorBoundaryPage';

describe('ErrorBoundaryPage', () => {
  it('renders "Something went wrong" heading', () => {
    render(<ErrorBoundaryPage />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders the apology text', () => {
    render(<ErrorBoundaryPage />);
    expect(
      screen.getByText(/We apologize for the inconvenience/i),
    ).toBeInTheDocument();
  });

  it('renders "Go to Home" button', () => {
    render(<ErrorBoundaryPage />);
    expect(screen.getByText('Go to Home')).toBeInTheDocument();
  });

  it('renders error message when error prop is provided', () => {
    const testError = new Error('Something critical failed');
    render(<ErrorBoundaryPage error={testError} />);
    expect(screen.getByText('Something critical failed')).toBeInTheDocument();
    expect(screen.getByText('Error Details:')).toBeInTheDocument();
  });

  it('does not render error details when error prop is absent', () => {
    render(<ErrorBoundaryPage />);
    expect(screen.queryByText('Error Details:')).not.toBeInTheDocument();
  });

  it('renders "Try Again" button when resetError is provided', () => {
    const resetError = jest.fn();
    render(<ErrorBoundaryPage resetError={resetError} />);
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('calls resetError when "Try Again" is clicked', () => {
    const resetError = jest.fn();
    render(<ErrorBoundaryPage resetError={resetError} />);
    fireEvent.click(screen.getByText('Try Again'));
    expect(resetError).toHaveBeenCalledTimes(1);
  });

  it('hides "Try Again" button when resetError is not provided', () => {
    render(<ErrorBoundaryPage />);
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });

  it('navigates to home when "Go to Home" is clicked', () => {
    render(<ErrorBoundaryPage />);

    expect(() => {
      fireEvent.click(screen.getByText('Go to Home'));
    }).not.toThrow();
  });
});
