import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ExporterConfigsPage from '../../../../src/features/exporter/pages/ExporterConfigsPage';
import { configApi } from '../../../../src/features/config/services/configApi';

const mockNavigate = jest.fn();
const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();
const mockUseAuth = jest.fn();
const mockIsExporter = jest.fn();

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../../src/shared/providers/ToastProvider', () => ({
  useToast: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));

jest.mock('../../../../src/features/auth/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../../../src/utils/common/roleUtils', () => ({
  isExporter: (...args: any[]) => mockIsExporter(...args),
}));

jest.mock('../../../../src/features/config/components/ConfigList', () => ({
  ConfigList: ({ onViewDetails, onRefresh }: any) => (
    <div>
      <button onClick={() => onViewDetails({ id: 101 })}>Open Config</button>
      <button onClick={onRefresh}>Refresh Configs</button>
    </div>
  ),
}));

jest.mock('../../../../src/shared/components/EditEndpointModal', () => ({
  __esModule: true,
  default: ({ onSendForDeployment, onClose, onSuccess }: any) => (
    <div>
      <div>EditEndpointModal</div>
      <button onClick={() => { void onSendForDeployment().catch(() => {}); }}>Deploy Config</button>
      <button onClick={onSuccess}>Success Callback</button>
      <button onClick={onClose}>Close Modal</button>
    </div>
  ),
}));

jest.mock('../../../../src/features/config/services/configApi', () => ({
  configApi: {
    exportConfig: jest.fn(),
  },
}));

describe('features/exporter/pages/ExporterConfigsPage.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { claims: ['exporter'] } });
    mockIsExporter.mockReturnValue(true);
    (configApi.exportConfig as jest.Mock).mockResolvedValue({ success: true });
  });

  it('renders permission message for non-exporter users', () => {
    mockIsExporter.mockReturnValue(false);
    render(<ExporterConfigsPage />);
    expect(screen.getByText('You do not have permission to access this page.')).toBeInTheDocument();
    expect(mockShowError).toHaveBeenCalledWith('You do not have permission to access this page');
  });

  it('renders permission message for unauthenticated users without side effects', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });
    mockIsExporter.mockReturnValue(false);

    render(<ExporterConfigsPage />);

    expect(screen.getByText('You do not have permission to access this page.')).toBeInTheDocument();
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('opens modal and exports selected config', async () => {
    render(<ExporterConfigsPage />);

    fireEvent.click(screen.getByText('Go Back'));
    expect(mockNavigate).toHaveBeenCalledWith(-1);

    fireEvent.click(screen.getByText('Refresh Configs'));

    fireEvent.click(screen.getByText('Open Config'));
    expect(screen.getByText('EditEndpointModal')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Success Callback'));
    fireEvent.click(screen.getByText('Close Modal'));

    fireEvent.click(screen.getByText('Open Config'));
    fireEvent.click(screen.getByText('Deploy Config'));

    await waitFor(() => {
      expect(configApi.exportConfig).toHaveBeenCalledWith(101, 'Exported for deployment');
      expect(mockShowSuccess).toHaveBeenCalled();
    });
  });

  it('shows export error and rethrows when deployment fails', async () => {
    (configApi.exportConfig as jest.Mock).mockRejectedValueOnce('down');

    render(<ExporterConfigsPage />);

    fireEvent.click(screen.getByText('Open Config'));
    fireEvent.click(screen.getByText('Deploy Config'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Failed to export configuration');
    });
  });

  it('shows explicit error message when export rejects with Error', async () => {
    (configApi.exportConfig as jest.Mock).mockRejectedValueOnce(new Error('SFTP down'));

    render(<ExporterConfigsPage />);

    fireEvent.click(screen.getByText('Open Config'));
    fireEvent.click(screen.getByText('Deploy Config'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('SFTP down');
    });
  });
});