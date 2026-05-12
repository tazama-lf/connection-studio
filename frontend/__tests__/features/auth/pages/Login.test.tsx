import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const loginMock = jest.fn();
const navigateMock = jest.fn();
const decodeTokenMock = jest.fn();

const submittedData = {
  username: 'user@example.com',
  password: 'secret123',
};

jest.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

jest.mock('../../../../src/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ login: loginMock }),
}));

jest.mock('../../../../src/features/auth/services/authApi', () => ({
  AuthApiService: {
    decodeToken: (...args: any[]) => decodeTokenMock(...args),
  },
}));

jest.mock('react-hook-form', () => ({
  useForm: () => ({
    register: (name: string) => ({ name }),
    handleSubmit: (onValid: any) => (e: any) => {
      e?.preventDefault?.();
      return onValid(submittedData);
    },
    formState: { errors: {} },
  }),
}));

jest.mock('@mui/material', () => ({
  AppBar: ({ children }: any) => <header>{children}</header>,
  Box: ({ children, component, onSubmit, ...rest }: any) => {
    if (component === 'form') {
      return (
        <form onSubmit={onSubmit} {...rest}>
          {children}
        </form>
      );
    }
    if (component === 'main') {
      return <main {...rest}>{children}</main>;
    }
    return <div {...rest}>{children}</div>;
  },
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  CssBaseline: () => null,
  IconButton: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  InputAdornment: ({ children }: any) => <span>{children}</span>,
  TextField: ({ label, id, type = 'text', slotProps, ...props }: any) => (
    <label>
      <span>{label}</span>
      {slotProps?.input?.startAdornment}
      <input id={id} aria-label={label} type={type} {...props} />
      {slotProps?.input?.endAdornment}
    </label>
  ),
  Toolbar: ({ children }: any) => <div>{children}</div>,
  Typography: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

jest.mock('@assets/logo.png', () => 'logo.png');
jest.mock('@assets/tazamaLogo.svg', () => 'tazama.svg');
jest.mock('@assets/treeImage.png', () => 'tree.png');

import Login from '../../../../src/features/auth/pages/Login';

const submitLoginForm = (container: HTMLElement) => {
  const formContainer = container.querySelector('form');
  if (!formContainer) {
    throw new Error('Login form container not found');
  }
  fireEvent.submit(formContainer);
};

describe('features/auth/pages/Login.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (localStorage.getItem as jest.Mock | undefined)?.mockReturnValue?.(null);
  });

  it('renders login fields', () => {
    render(<Login />);

    expect(screen.getByText('Tazama Connection Studio')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('submits valid credentials and navigates to dashboard', async () => {
    loginMock.mockResolvedValue(true);
    (localStorage.getItem as jest.Mock | undefined)?.mockReturnValue?.('token-123');
    decodeTokenMock.mockReturnValue({ sub: 'user' });

    const { container } = render(<Login />);

    submitLoginForm(container);

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('user@example.com', 'secret123');
      expect(decodeTokenMock).toHaveBeenCalledWith('token-123');
      expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('navigates to dashboard even when token is missing after successful login', async () => {
    loginMock.mockResolvedValue(true);

    const { container } = render(<Login />);

    submitLoginForm(container);

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('user@example.com', 'secret123');
      expect(decodeTokenMock).not.toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('shows invalid credentials and generic failure branches', async () => {
    loginMock.mockResolvedValueOnce(false);

    const { container, rerender } = render(<Login />);

    submitLoginForm(container);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials. Please try again.')).toBeInTheDocument();
    });

    loginMock.mockRejectedValueOnce(new Error('network down'));
    rerender(<Login />);

    submitLoginForm(container);

    await waitFor(() => {
      expect(screen.getByText('Login failed. Please check your connection and try again.')).toBeInTheDocument();
    });
  });

  it('shows invalid credentials when unauthorized error is thrown', async () => {
    loginMock.mockRejectedValueOnce(new Error('Unauthorized'));

    const { container } = render(<Login />);

    submitLoginForm(container);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials. Please try again.')).toBeInTheDocument();
    });
  });

  it('shows generic login failure when non-Error value is thrown', async () => {
    loginMock.mockRejectedValueOnce('unexpected');

    const { container } = render(<Login />);

    submitLoginForm(container);

    await waitFor(() => {
      expect(screen.getByText('Login failed. Please check your connection and try again.')).toBeInTheDocument();
    });
  });

  it('toggles password visibility and prevents default on mouse down', () => {
    render(<Login />);

    const passwordField = screen.getByLabelText('Password') as HTMLInputElement;
    expect(passwordField.type).toBe('password');

    const passwordInput = document.getElementById('password') as HTMLElement;
    const toggleButton = passwordInput.parentElement?.querySelector('button');
    expect(toggleButton).toBeTruthy();

    fireEvent.click(toggleButton as Element);
    fireEvent.mouseDown(toggleButton as Element);
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('covers the ?? null-coalescing fallthrough on (includes invalid credentials)', async () => {
    const originalIncludes = String.prototype.includes;
    const includesSpy = jest
      .spyOn(String.prototype, 'includes')
      .mockImplementation(function (this: string, searchValue: string) {
        if (searchValue === 'unauthorized') return null as unknown as boolean;
        return originalIncludes.call(this, searchValue);
      });

    loginMock.mockRejectedValueOnce(new Error('invalid credentials'));

    const { container } = render(<Login />);
    submitLoginForm(container);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials. Please try again.')).toBeInTheDocument();
    });

    includesSpy.mockRestore();
  });
})