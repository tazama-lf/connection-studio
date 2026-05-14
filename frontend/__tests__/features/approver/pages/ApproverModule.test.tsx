import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

const navigateMock = jest.fn();
const showErrorMock = jest.fn();
const useAuthMock = jest.fn();
const isApproverMock = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

jest.mock('lucide-react', () => ({
  Settings: () => <span data-testid="settings-icon" />,
  Database: () => <span data-testid="database-icon" />,
  Clock: () => <span data-testid="clock-icon" />,
}));

jest.mock('../../../../src/shared/providers/ToastProvider', () => ({
  useToast: () => ({ showError: showErrorMock }),
}));

jest.mock('../../../../src/features/auth/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

jest.mock('../../../../src/utils/common/roleUtils', () => ({
  isApprover: (...args: any[]) => isApproverMock(...args),
}));

import ApproverModule from '../../../../src/features/approver/pages/ApproverModule';

describe('features/approver/pages/ApproverModule.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks unauthorized users and shows error for authenticated non-approver', () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      user: { claims: ['editor'] },
    });
    isApproverMock.mockReturnValue(false);

    render(<ApproverModule />);

    expect(
      screen.getByText('You do not have permission to access this page.'),
    ).toBeInTheDocument();
    expect(showErrorMock).toHaveBeenCalledWith(
      'You do not have permission to access the Approver Dashboard',
    );
  });

  it('renders module cards for approver and navigates on click', () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      user: { claims: ['approver'] },
    });
    isApproverMock.mockReturnValue(true);

    render(<ApproverModule />);

    fireEvent.click(screen.getByText('Dynamic Event Monitoring Service'));
    fireEvent.click(screen.getByText('Data Enrichment'));
    fireEvent.click(screen.getByText('Cron Job Management'));

    expect(navigateMock).toHaveBeenCalledWith('/approver/configs');
    expect(navigateMock).toHaveBeenCalledWith('/approver/jobs');
    expect(navigateMock).toHaveBeenCalledWith('/approver/cron-jobs');
  });

  it('does not trigger role error when user is unauthenticated', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false, user: null });
    isApproverMock.mockReturnValue(false);

    render(<ApproverModule />);

    expect(
      screen.getByText('You do not have permission to access this page.'),
    ).toBeInTheDocument();
    expect(showErrorMock).not.toHaveBeenCalled();
  });
});
