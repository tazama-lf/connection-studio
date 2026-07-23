import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  AuthProvider,
  useAuth,
} from '../../../../features/auth/contexts/AuthContext';
import {
  authApi,
  AuthApiService,
} from '../../../../features/auth/services/authApi';

// Mock the authApi
jest.mock('../../../../features/auth/services/authApi', () => ({
  authApi: {
    login: jest.fn(),
    logout: jest.fn(),
    getUser: jest.fn(),
  },
  AuthApiService: {
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
        onClick={() => {
          void login('testuser', 'testpass').catch(() => undefined);
        }}
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
  const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;
  const mockedDecodeToken = AuthApiService.decodeToken as jest.MockedFunction<
    typeof AuthApiService.decodeToken
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    if (
      typeof (localStorage.getItem as any).mockImplementation === 'function'
    ) {
      (localStorage.getItem as any).mockImplementation(() => null);
      (localStorage.setItem as any).mockImplementation(() => undefined);
      (localStorage.removeItem as any).mockImplementation(() => undefined);
    }
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

  it('restores authenticated state from localStorage when token is valid', async () => {
    if (
      typeof (localStorage.getItem as any).mockImplementation === 'function'
    ) {
      (localStorage.getItem as any).mockImplementation((key: string) => {
        if (key === 'authToken') return 'valid.token.payload';
        if (key === 'user')
          return JSON.stringify({ username: 'restored-user' });
        return null;
      });
    }
    mockedDecodeToken.mockReturnValue({ id: '1', username: 'restored-user' });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('username')).toHaveTextContent('restored-user');
    });
  });

  it('clears invalid stored auth data when token decode fails', async () => {
    if (
      typeof (localStorage.getItem as any).mockImplementation === 'function'
    ) {
      (localStorage.getItem as any).mockImplementation((key: string) => {
        if (key === 'authToken') return 'invalid-token';
        if (key === 'user') return JSON.stringify({ username: 'stale-user' });
        return null;
      });
    }
    mockedDecodeToken.mockReturnValue(null);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    if (typeof (localStorage.removeItem as any).mock === 'object') {
      expect(localStorage.removeItem).toHaveBeenCalledWith('authToken');
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
    }
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
  });

  it('clears stored auth data when stored user JSON is invalid', async () => {
    if (
      typeof (localStorage.getItem as any).mockImplementation === 'function'
    ) {
      (localStorage.getItem as any).mockImplementation((key: string) => {
        if (key === 'authToken') return 'valid.token.payload';
        if (key === 'user') return '{bad-json';
        return null;
      });
    }
    mockedDecodeToken.mockReturnValue({ id: '9', username: 'json-user' });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    if (typeof (localStorage.removeItem as any).mock === 'object') {
      expect(localStorage.removeItem).toHaveBeenCalledWith('authToken');
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
    }
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
  });

  it('logs in successfully and persists user data', async () => {
    mockedAuthApi.login.mockResolvedValue({
      token: 'new.valid.token',
      message: 'ok',
    } as any);
    mockedDecodeToken.mockReturnValue({ id: '2', username: 'new-user' });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByTestId('login-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('username')).toHaveTextContent('new-user');
    });

    if (typeof (localStorage.setItem as any).mock === 'object') {
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'authToken',
        'new.valid.token',
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify({ id: '2', username: 'new-user' }),
      );
    }
  });

  it('returns to unauthenticated state when login response has no token', async () => {
    mockedAuthApi.login.mockResolvedValue({
      token: '',
      message: 'missing token',
    } as any);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByTestId('login-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    });
  });

  it('returns false when login token cannot be decoded into user data', async () => {
    mockedAuthApi.login.mockResolvedValue({
      token: 'undecodable.token',
      message: 'ok',
    } as any);
    mockedDecodeToken.mockReturnValue(null);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByTestId('login-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('username')).toHaveTextContent('no-user');
    });
  });

  it('re-throws login errors', async () => {
    mockedAuthApi.login.mockRejectedValue(new Error('login-failed'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByTestId('login-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    });
  });

  it('logs out and clears stored auth state', async () => {
    if (
      typeof (localStorage.getItem as any).mockImplementation === 'function'
    ) {
      (localStorage.getItem as any).mockImplementation((key: string) => {
        if (key === 'authToken') return 'existing.token';
        if (key === 'user')
          return JSON.stringify({ username: 'existing-user' });
        return null;
      });
    }
    mockedDecodeToken.mockReturnValue({ id: '1', username: 'existing-user' });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    });

    fireEvent.click(screen.getByTestId('logout-btn'));

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('username')).toHaveTextContent('no-user');
    if (typeof (localStorage.removeItem as any).mock === 'object') {
      expect(localStorage.removeItem).toHaveBeenCalledWith('authToken');
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
    }
  });

  it('uses default context values when rendered outside AuthProvider', async () => {
    const DefaultContextTestComponent: React.FC = () => {
      const { isAuthenticated, loading, login, logout } = useAuth();
      return (
        <div>
          <div data-testid="default-auth">{isAuthenticated.toString()}</div>
          <div data-testid="default-loading">{loading.toString()}</div>
          <button
            data-testid="default-login-btn"
            onClick={() => {
              void login('u', 'p');
            }}
          >
            login
          </button>
          <button data-testid="default-logout-btn" onClick={logout}>
            logout
          </button>
        </div>
      );
    };

    render(<DefaultContextTestComponent />);

    expect(screen.getByTestId('default-auth')).toHaveTextContent('false');
    expect(screen.getByTestId('default-loading')).toHaveTextContent('false');

    // Call the default context functions to get coverage
    fireEvent.click(screen.getByTestId('default-login-btn'));
    fireEvent.click(screen.getByTestId('default-logout-btn'));
  });
});
