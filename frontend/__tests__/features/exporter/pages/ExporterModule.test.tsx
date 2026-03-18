import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

const navigateMock = jest.fn(async () => undefined);
const showErrorMock = jest.fn();
const useAuthMock = jest.fn();
const isExporterMock = jest.fn();

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
  isExporter: (...args: any[]) => isExporterMock(...args),
}));

import ExporterModule from '../../../../src/features/exporter/pages/ExporterModule';

describe('features/exporter/pages/ExporterModule.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks unauthorized users and shows role error', () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      user: { claims: ['editor'] },
    });
    isExporterMock.mockReturnValue(false);

    render(<ExporterModule />);

    expect(screen.getByText('You do not have permission to access this page.')).toBeInTheDocument();
    expect(showErrorMock).toHaveBeenCalledWith('You do not have permission to access the Exporter Dashboard');
  });

  it('renders exporter modules and navigates on card click', async () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      user: { claims: ['exporter'] },
    });
    isExporterMock.mockReturnValue(true);

    render(<ExporterModule />);

    fireEvent.click(screen.getByText('Dynamic Event Monitoring Service'));
    fireEvent.click(screen.getByText('Data Enrichment'));
    fireEvent.click(screen.getByText('Cron Job Management'));

    expect(navigateMock).toHaveBeenCalledWith('/exporter/configs');
    expect(navigateMock).toHaveBeenCalledWith('/exporter/jobs');
    expect(navigateMock).toHaveBeenCalledWith('/exporter/cron-jobs');
  });

  it('does not show role error when unauthenticated', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false, user: null });
    isExporterMock.mockReturnValue(false);

    render(<ExporterModule />);

    expect(screen.getByText('You do not have permission to access this page.')).toBeInTheDocument();
    expect(showErrorMock).not.toHaveBeenCalled();
  });
});