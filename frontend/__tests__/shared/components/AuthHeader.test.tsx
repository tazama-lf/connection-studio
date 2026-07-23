import { render, screen, fireEvent } from '@testing-library/react';
import { AuthHeader } from '../../../shared/components/AuthHeader';

// Mock the useAuth hook
const mockLogout = jest.fn();
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { username: 'Test User', claims: ['user'] },
    logout: mockLogout,
  }),
}));

describe('AuthHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders user name and title when authenticated', () => {
    render(<AuthHeader title="Test Page" />);
    expect(screen.getByText('Test Page')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('renders logout button when authenticated', () => {
    render(<AuthHeader title="Test Page" />);
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    expect(logoutButton).toBeInTheDocument();
  });

  it('calls logout and navigate when logout button is clicked', () => {
    render(<AuthHeader title="Test Page" />);
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    fireEvent.click(logoutButton);
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('renders back button when showBackButton is true', () => {
    render(<AuthHeader title="Test Page" showBackButton={true} />);
    const backButton = screen.getByRole('button', { name: /back/i });
    expect(backButton).toBeInTheDocument();
  });

  it('calls navigate with -1 when back button is clicked', () => {
    render(<AuthHeader title="Test Page" showBackButton={true} />);
    const backButton = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backButton);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('displays user role when user has approver claim', () => {
    // Temporarily override the mock
    const useAuthMock = jest.requireMock(
      '../../../features/auth/contexts/AuthContext',
    );
    useAuthMock.useAuth = jest.fn(() => ({
      user: { username: 'Test User', claims: ['approver'] },
      logout: mockLogout,
    }));

    render(<AuthHeader title="Test Page" />);
    expect(screen.getByText('Approver')).toBeInTheDocument();
  });
});
