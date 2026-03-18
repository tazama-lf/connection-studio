import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import NotFoundPage from '../../src/pages/NotFoundPage';
import { ROUTES } from '../../src/shared/config/routes.config';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: jest.fn(),
  };
});

describe('NotFoundPage', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
  });

  const renderWithRouter = () =>
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );

  it('renders 404 code', () => {
    renderWithRouter();
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders "Page Not Found" heading', () => {
    renderWithRouter();
    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
  });

  it('renders helpful description text', () => {
    renderWithRouter();
    expect(
      screen.getByText(/The page you're looking for doesn't exist/i),
    ).toBeInTheDocument();
  });

  it('renders "Go to Login" button', () => {
    renderWithRouter();
    expect(screen.getByText('Go to Login')).toBeInTheDocument();
  });

  it('renders "Go Back" button', () => {
    renderWithRouter();
    expect(screen.getByText('Go Back')).toBeInTheDocument();
  });

  it('renders the logo image', () => {
    renderWithRouter();
    expect(screen.getByAltText('Tazama Logo')).toBeInTheDocument();
  });

  it('navigates to login when "Go to Login" is clicked', () => {
    renderWithRouter();
    fireEvent.click(screen.getByText('Go to Login'));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.LOGIN);
  });

  it('navigates back when "Go Back" is clicked', () => {
    renderWithRouter();
    fireEvent.click(screen.getByText('Go Back'));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
