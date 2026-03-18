import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const navigateMock = jest.fn();
const showSuccessMock = jest.fn();
const showErrorMock = jest.fn();
const loadJobsMock = jest.fn();
const getByIdMock = jest.fn();
const updateStatusMock = jest.fn();
const setOffsetMock = jest.fn();
const useAuthMock = jest.fn(() => ({ user: { claims: ['approver'] } }));

jest.mock('react-router', () => ({
  useNavigate: () => navigateMock,
}));

jest.mock('../../../../src/features/auth', () => ({
  useAuth: (...args: any[]) => useAuthMock(...args),
}));

jest.mock('../../../../src/shared/providers/ToastProvider', () => ({
  useToast: () => ({
    showSuccess: showSuccessMock,
    showError: showErrorMock,
  }),
}));

jest.mock('../../../../src/utils/common/roleUtils', () => ({
  getPrimaryRole: () => 'approver',
}));

jest.mock('@shared/hooks/useFilters', () => ({
  __esModule: true,
  default: () => ({ offset: 0, limit: 10, setOffset: setOffsetMock }),
}));

jest.mock('../../../../src/features/data-enrichment/handlers', () => ({
  loadJobs: (...args: any[]) => loadJobsMock(...args),
  dataEnrichmentJobApi: {
    getById: (...args: any[]) => getByIdMock(...args),
    updateStatus: (...args: any[]) => updateStatusMock(...args),
  },
}));

jest.mock('../../../../src/features/data-enrichment/components/JobList', () => ({
  JobList: (props: any) => (
    <div>
      <button onClick={() => props.onViewLogs('job-1')}>view-logs</button>
      <button onClick={() => props.onViewLogs('job-2')}>view-logs-notype</button>
      <button onClick={() => props.onRefresh()}>refresh</button>
      <button onClick={() => props.pagination.setPage(2)}>set-page</button>
      <div data-testid="jobs-count">{props.jobs.length}</div>
      <div data-testid="jobs-error">{props.error || 'none'}</div>
    </div>
  ),
}));

jest.mock('../../../../src/features/data-enrichment/components/JobDetailsModal', () => (props: any) => (
  <div data-testid="job-modal">
    <button onClick={() => props.onApprove('job-1', 'PULL', 'looks good')}>approve</button>
    <button onClick={() => props.onReject('job-1', 'PULL', 'bad reason')}>reject</button>
    <button onClick={() => props.onClose()}>close-modal</button>
    <span>{String(props.isOpen)}</span>
  </div>
));

import ApproverDEJobsPage from '../../../../src/features/approver/pages/ApproverDEJobsPage';

describe('features/approver/pages/ApproverDEJobsPage.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthMock.mockReturnValue({ user: { claims: ['approver'] } });
    loadJobsMock.mockResolvedValue({ data: [{ id: 'job-1', type: 'pull' }, { id: 'job-2' }], total: 2 });
    getByIdMock.mockResolvedValue({ id: 'job-1', type: 'PULL' });
    updateStatusMock.mockResolvedValue({ success: true });
  });

  it('loads jobs and renders Go Back button', async () => {
    render(<ApproverDEJobsPage />);

    await waitFor(() => {
      expect(loadJobsMock).toHaveBeenCalled();
      expect(screen.getByTestId('jobs-count')).toHaveTextContent('2');
    });

    fireEvent.click(screen.getByText('Go Back'));
    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it('fetches details for selected job and renders modal', async () => {
    render(<ApproverDEJobsPage />);

    await waitFor(() => expect(screen.getByTestId('jobs-count')).toHaveTextContent('2'));

    fireEvent.click(screen.getByText('view-logs'));
    await waitFor(() => {
      expect(getByIdMock).toHaveBeenCalledWith('job-1', 'PULL');
      expect(screen.getByTestId('job-modal')).toBeInTheDocument();
    });
  });

  it('handles fetchDeJobs error (Error instance)', async () => {
    loadJobsMock.mockRejectedValueOnce(new Error('fetch-fail'));
    render(<ApproverDEJobsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('jobs-error')).toHaveTextContent('fetch-fail');
    });
  });

  it('handles fetchDeJobs error (non-Error)', async () => {
    loadJobsMock.mockRejectedValueOnce('string-error');
    render(<ApproverDEJobsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('jobs-error')).toHaveTextContent('Failed to fetch configurations');
    });
  });

  it('handles view job details failure', async () => {
    render(<ApproverDEJobsPage />);

    await waitFor(() => expect(screen.getByTestId('jobs-count')).toHaveTextContent('2'));

    getByIdMock.mockRejectedValueOnce(new Error('details-fail'));

    fireEvent.click(screen.getByText('view-logs'));
    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Failed to load job details');
    });
  });

  it('handles view job details for job without type', async () => {
    render(<ApproverDEJobsPage />);

    await waitFor(() => expect(screen.getByTestId('jobs-count')).toHaveTextContent('2'));

    fireEvent.click(screen.getByText('view-logs-notype'));
    await waitFor(() => {
      expect(getByIdMock).toHaveBeenCalledWith('job-2', undefined);
    });
  });

  it('handles approve job successfully', async () => {
    render(<ApproverDEJobsPage />);

    await waitFor(() => expect(screen.getByTestId('jobs-count')).toHaveTextContent('2'));

    fireEvent.click(screen.getByText('view-logs'));
    await waitFor(() => expect(screen.getByTestId('job-modal')).toBeInTheDocument());

    fireEvent.click(screen.getByText('approve'));
    await waitFor(() => {
      expect(updateStatusMock).toHaveBeenCalledWith('job-1', 'STATUS_04_APPROVED', 'PULL', 'looks good');
      expect(showSuccessMock).toHaveBeenCalledWith('Job approved successfully');
    });
  });

  it('handles approve job failure', async () => {
    render(<ApproverDEJobsPage />);

    await waitFor(() => expect(screen.getByTestId('jobs-count')).toHaveTextContent('2'));

    fireEvent.click(screen.getByText('view-logs'));
    await waitFor(() => expect(screen.getByTestId('job-modal')).toBeInTheDocument());

    updateStatusMock.mockRejectedValueOnce(new Error('approve-fail'));
    fireEvent.click(screen.getByText('approve'));
    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Failed to approve job');
    });
  });

  it('handles reject job successfully', async () => {
    render(<ApproverDEJobsPage />);

    await waitFor(() => expect(screen.getByTestId('jobs-count')).toHaveTextContent('2'));

    fireEvent.click(screen.getByText('view-logs'));
    await waitFor(() => expect(screen.getByTestId('job-modal')).toBeInTheDocument());

    fireEvent.click(screen.getByText('reject'));
    await waitFor(() => {
      expect(updateStatusMock).toHaveBeenCalledWith('job-1', 'STATUS_05_REJECTED', 'PULL', 'bad reason');
      expect(showSuccessMock).toHaveBeenCalledWith('Job rejected successfully. Reason: bad reason');
    });
  });

  it('handles reject job failure', async () => {
    render(<ApproverDEJobsPage />);

    await waitFor(() => expect(screen.getByTestId('jobs-count')).toHaveTextContent('2'));

    fireEvent.click(screen.getByText('view-logs'));
    await waitFor(() => expect(screen.getByTestId('job-modal')).toBeInTheDocument());

    updateStatusMock.mockRejectedValueOnce(new Error('reject-fail'));
    fireEvent.click(screen.getByText('reject'));
    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Failed to reject job');
    });
  });

  it('closes job details modal', async () => {
    render(<ApproverDEJobsPage />);

    await waitFor(() => expect(screen.getByTestId('jobs-count')).toHaveTextContent('2'));

    fireEvent.click(screen.getByText('view-logs'));
    await waitFor(() => expect(screen.getByTestId('job-modal')).toBeInTheDocument());

    fireEvent.click(screen.getByText('close-modal'));
    await waitFor(() => {
      expect(screen.queryByTestId('job-modal')).not.toBeInTheDocument();
    });
  });

  it('handles refresh', async () => {
    render(<ApproverDEJobsPage />);

    await waitFor(() => expect(screen.getByTestId('jobs-count')).toHaveTextContent('2'));

    const callsBefore = loadJobsMock.mock.calls.length;
    fireEvent.click(screen.getByText('refresh'));
    await waitFor(() => expect(loadJobsMock.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it('triggers pagination setPage', async () => {
    render(<ApproverDEJobsPage />);

    await waitFor(() => expect(screen.getByTestId('jobs-count')).toHaveTextContent('2'));

    fireEvent.click(screen.getByText('set-page'));
    expect(setOffsetMock).toHaveBeenCalledWith(1);
  });

  it('handles user without claims (userRole is undefined)', async () => {
    useAuthMock.mockReturnValueOnce({ user: {} });
    render(<ApproverDEJobsPage />);

    await waitFor(() => expect(screen.getByTestId('jobs-count')).toHaveTextContent('2'));
  });
});