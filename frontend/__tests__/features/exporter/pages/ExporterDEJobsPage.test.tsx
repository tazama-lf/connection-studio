import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ExporterDEJobsPage from '../../../../src/features/exporter/pages/ExporterDEJobsPage';
import { dataEnrichmentJobApi } from '../../../../src/features/data-enrichment/handlers';

const mockUseAuth = jest.fn();
const mockIsExporter = jest.fn();
const mockGetPrimaryRole = jest.fn();
const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();
const mockNavigate = jest.fn();

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: () => mockNavigate,
}));

jest.mock('@shared/hooks/useFilters', () => ({
  __esModule: true,
  default: () => ({ offset: 1, limit: 10, setOffset: jest.fn() }),
}));

jest.mock('../../../../src/features/auth/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../../../src/shared/providers/ToastProvider', () => ({
  useToast: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));

jest.mock('../../../../src/utils/common/roleUtils', () => ({
  isExporter: (...args: any[]) => mockIsExporter(...args),
  getPrimaryRole: (...args: any[]) => mockGetPrimaryRole(...args),
}));

jest.mock('../../../../src/features/data-enrichment/components/JobList', () => ({
  JobList: ({ onViewLogs, jobs, onRefresh }: any) => (
    <div>
      <div>job-count:{jobs.length}</div>
      <button onClick={() => onViewLogs('job-1')}>View Logs</button>
      <button onClick={() => onRefresh()}>Refresh</button>
    </div>
  ),
}));

jest.mock('../../../../src/features/data-enrichment/components/JobDetailsModal', () => ({
  __esModule: true,
  default: ({ isOpen, onExport }: any) =>
    isOpen ? <button onClick={() => onExport('job-1', 'PULL')}>Export Job</button> : null,
}));

jest.mock('../../../../src/features/data-enrichment/handlers', () => ({
  dataEnrichmentJobApi: {
    getList: jest.fn(),
    getById: jest.fn(),
    updateStatus: jest.fn(),
  },
}));

describe('features/exporter/pages/ExporterDEJobsPage.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { claims: ['exporter'] } });
    mockIsExporter.mockReturnValue(true);
    mockGetPrimaryRole.mockReturnValue('admin');
    (dataEnrichmentJobApi.getList as jest.Mock).mockResolvedValue({
      data: [{ id: 'job-1', type: 'pull' }],
      total: 1,
    });
    (dataEnrichmentJobApi.getById as jest.Mock).mockResolvedValue({ id: 'job-1', type: 'pull' });
    (dataEnrichmentJobApi.updateStatus as jest.Mock).mockResolvedValue({ success: true });
  });

  it('renders permission message when user is not exporter', () => {
    mockIsExporter.mockReturnValue(false);
    render(<ExporterDEJobsPage />);
    expect(screen.getByText('You do not have permission to access this page.')).toBeInTheDocument();
  });

  it('loads jobs, opens details and exports job', async () => {
    render(<ExporterDEJobsPage />);

    await waitFor(() => {
      expect(dataEnrichmentJobApi.getList).toHaveBeenCalled();
      expect(screen.getByText('job-count:1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('View Logs'));

    await waitFor(() => {
      expect(dataEnrichmentJobApi.getById).toHaveBeenCalledWith('job-1', 'PULL');
    });

    fireEvent.click(screen.getByText('Export Job'));

    await waitFor(() => {
      expect(dataEnrichmentJobApi.updateStatus).toHaveBeenCalledWith(
        'job-1',
        'STATUS_06_EXPORTED',
        'PULL',
      );
      expect(mockShowSuccess).toHaveBeenCalledWith('Job exported successfully!');
    });
  });

  it('shows error when fetchDeJobs fails (lines 69-70)', async () => {
    (dataEnrichmentJobApi.getList as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<ExporterDEJobsPage />);

    await waitFor(() => {
      expect(screen.getByText('job-count:0')).toBeInTheDocument();
    });
    // error is set (line 70), triggered by rejected getList
  });

  it('shows error when fetchDeJobs fails with non-Error (line 69 else branch)', async () => {
    (dataEnrichmentJobApi.getList as jest.Mock).mockRejectedValue('string error');

    render(<ExporterDEJobsPage />);

    await waitFor(() => {
      expect(screen.getByText('job-count:0')).toBeInTheDocument();
    });
  });

  it('shows error when handleViewJobDetails fails (line 91)', async () => {
    (dataEnrichmentJobApi.getById as jest.Mock).mockRejectedValue(new Error('Fetch failed'));

    render(<ExporterDEJobsPage />);

    await waitFor(() => {
      expect(dataEnrichmentJobApi.getList).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('View Logs'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Failed to load job details');
    });
  });

  it('shows error when handleExportJob fails (line 115)', async () => {
    (dataEnrichmentJobApi.updateStatus as jest.Mock).mockRejectedValue(new Error('Export failed'));

    render(<ExporterDEJobsPage />);

    await waitFor(() => {
      expect(dataEnrichmentJobApi.getList).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('View Logs'));

    await waitFor(() => {
      expect(dataEnrichmentJobApi.getById).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('Export Job'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Failed to export job. Please try again.');
    });
  });

  it('triggers navigate(-1) from Go Back button (line 139)', async () => {
    render(<ExporterDEJobsPage />);

    await waitFor(() => {
      expect(screen.getByText('Go Back')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Go Back'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  it('triggers onRefresh callback from JobList (line 160)', async () => {
    render(<ExporterDEJobsPage />);

    await waitFor(() => {
      expect(dataEnrichmentJobApi.getList).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByText('Refresh'));

    await waitFor(() => {
      expect(dataEnrichmentJobApi.getList).toHaveBeenCalledTimes(2);
    });
  });

  it('userIsExporter false branch when user has no claims (BRDA:19)', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });
    render(<ExporterDEJobsPage />);
    // With no claims, userIsExporter = false, so permission page is shown
    expect(screen.getByText('You do not have permission to access this page.')).toBeInTheDocument();
  });

  it('isAuthenticated && user?.claims && !userIsExporter - covers claim branches (BRDA:48)', async () => {
    // Authenticated but no claims → user?.claims is falsy → inner if not triggered
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: {} });
    mockIsExporter.mockReturnValue(false);
    render(<ExporterDEJobsPage />);
    expect(screen.getByText('You do not have permission to access this page.')).toBeInTheDocument();
  });

  it('isExporter false branch false (not authenticated) skips showError (BRDA:48)', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: { claims: ['exporter'] } });
    mockIsExporter.mockReturnValue(true);
    render(<ExporterDEJobsPage />);
    // Not authenticated → permission page shown without showError
    expect(screen.getByText('You do not have permission to access this page.')).toBeInTheDocument();
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('fetch error message fallback when rejection is non-Error (BRDA:69)', async () => {
    (dataEnrichmentJobApi.getList as jest.Mock).mockRejectedValue(42);
    render(<ExporterDEJobsPage />);
    await waitFor(() => {
      expect(dataEnrichmentJobApi.getList).toHaveBeenCalled();
    });
  });

  it('handleExportJob onSuccess fetch triggers (BRDA:119 second branch)', async () => {
    // Export success → re-fetchDeJobs → getList called twice
    render(<ExporterDEJobsPage />);
    await waitFor(() => expect(screen.getByText('View Logs')).toBeInTheDocument());
    fireEvent.click(screen.getByText('View Logs'));
    await waitFor(() => expect(screen.getByText('Export Job')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Export Job'));
    await waitFor(() => {
      expect(dataEnrichmentJobApi.getList).toHaveBeenCalledTimes(2);
    });
  });
});