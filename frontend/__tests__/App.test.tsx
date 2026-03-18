import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../src/App';

jest.mock('../src/shared/providers/AppProviders', () => ({
  AppProviders: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-providers">{children}</div>
  ),
}));

jest.mock('../src/router', () => ({
  AppRoutes: () => <div data-testid="app-routes">Routes Content</div>,
}));

describe('App.tsx', () => {
  it('wraps routes with AppProviders', () => {
    render(<App />);

    const providers = screen.getByTestId('app-providers');
    expect(providers).toBeInTheDocument();
    expect(screen.getByTestId('app-routes')).toBeInTheDocument();
    expect(providers).toContainElement(screen.getByTestId('app-routes'));
  });
});