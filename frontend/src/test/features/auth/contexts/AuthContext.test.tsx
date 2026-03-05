import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  AuthProvider,
  useAuth,
} from '../../../../features/auth/contexts/AuthContext';

// Mock the authApi
jest.mock('../../../../features/auth/services/authApi', () => ({
  authApi: {
    login: jest.fn(),
    logout: jest.fn(),
    getUser: jest.fn(),
    decodeToken: jest.fn(),
  },
}));

// Test component to access auth context
const TestComponent: React.FC = () => {
  const { isAuthenticated, user, loading, login, logout } = useAuth();

  return (
    <div>
      <div data-testid="authenticated">{isAuthenticated.toString()}</div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="username">{user?.username || 'no-user'}</div>
      <button
        data-testid="login-btn"
        onClick={() => login('testuser', 'testpass')}
      >
        Login
      </button>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should start with unauthenticated state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('username')).toHaveTextContent('no-user');
  });
});
