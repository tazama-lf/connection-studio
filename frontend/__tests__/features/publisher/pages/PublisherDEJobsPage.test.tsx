// PublisherDEJobsPage.test.tsx
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PublisherDEJobsPage from '../../../../src/features/publisher/pages/PublisherDEJobsPage';
import { useToast } from '../../../../src/shared/providers/ToastProvider';
import { useAuth } from '../../../../src/features/auth';
import { getPrimaryRole } from '../../../../src/utils/common/roleUtils';
import useFilters from '../../../../src/shared/hooks/useFilters';
import { useNavigate } from 'react-router';
import { dataEnrichmentJobApi as dataEnrichmentApi } from '../../../../src/features/data-enrichment/handlers';

const mockShowError = jest.fn();
const mockNavigate = jest.fn();
const mockSetOffset = jest.fn();
const mockGetList = jest.fn();
const mockGetById = jest.fn();

let capturedJobListProps: any = null;
let capturedJobDetailsModalProps: any = null;

jest.mock('lucide-react', () => ({
  ChevronLeft: () => <svg data-testid="chevron-left-icon" />,
  Database: () => <svg data-testid="database-icon" />,
}));

jest.mock('@mui/material', () => ({
  Tooltip: ({ children, title }: any) => (
    <div data-testid="tooltip" data-title={title}>
      {children}
    </div>
  ),
}));

jest.mock('../../../../src/shared/providers/ToastProvider', () => ({
  useToast: jest.fn(),
}));

jest.mock('../../../../src/features/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../../src/utils/common/roleUtils', () => ({
  getPrimaryRole: jest.fn(),
}));

jest.mock('../../../../src/shared/hooks/useFilters', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('react-router', () => ({
  useNavigate: jest.fn(),
}));

jest.mock('../../../../src/features/data-enrichment/handlers', () => ({
  dataEnrichmentJobApi: {
    getList: jest.fn(),
    getById: jest.fn(),
  },
}));

jest.mock(
  '@shared',
  () => ({
    Button: ({ children, onClick, ...props }: any) => (
      <button onClick={onClick} {...props}>
        {children}
      </button>
    ),
  }),
  { virtual: true },
);

jest.mock(
  '../../../../src/features/data-enrichment/components/EndpointHistoryButton',
  () => () => <button>Endpoint History</button>,
);

jest.mock(
  '../../../../src/features/data-enrichment/components/JobDetailsModal',
  () => (props: any) => {
    capturedJobDetailsModalProps = props;

    if (!props.isOpen) return null;

    return (
      <div data-testid="job-details-modal">
        <div>Mock JobDetailsModal</div>
        <div data-testid="modal-loading">{String(props.isLoading)}</div>
        <div data-testid="modal-job-id">{props.job?.id ?? 'no-job'}</div>
        <button onClick={props.onClose}>Close Job Details</button>
      </div>
    );
  },
);

jest.mock(
  '../../../../src/features/data-enrichment/components/JobList',
  () => (props: any) => {
    capturedJobListProps = props;

    return (
      <div data-testid="job-list">
        <div data-testid="job-count">{props.jobs.length}</div>
        <div data-testid="job-list-loading">{String(props.loading)}</div>
        <div data-testid="job-list-error">{props.error ?? 'no-error'}</div>
        <div data-testid="pagination-page">{props.pagination.page}</div>
        <div data-testid="pagination-limit">{props.pagination.limit}</div>
        <div data-testid="pagination-total">
          {props.pagination.totalRecords}
        </div>
        <div data-testid="searching-filters">
          {JSON.stringify(props.searchingFilters)}
        </div>

        <button onClick={props.onRefresh}>Refresh Jobs</button>
        <button onClick={() => props.onViewLogs('job-1')}>View Logs</button>
        <button onClick={() => props.pagination.setPage(3)}>Set Page 3</button>
        <button
          onClick={() =>
            props.setSearchingFilters({
              status: 'SUCCESS',
              endpoint: 'publisher-endpoint',
            })
          }
        >
          Update Filters
        </button>
      </div>
    );
  },
);

describe('PublisherDEJobsPage', () => {
  const mockJobs = [
    {
      id: 'job-1',
      type: 'pull',
      status: 'SUCCESS',
      endpointName: 'Endpoint A',
    },
    {
      id: 'job-2',
      type: 'push',
      status: 'FAILED',
      endpointName: 'Endpoint B',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    capturedJobListProps = null;
    capturedJobDetailsModalProps = null;

    (useToast as jest.Mock).mockReturnValue({
      showError: mockShowError,
    });

    (useAuth as jest.Mock).mockReturnValue({
      user: {
        claims: {
          role: 'publisher',
        },
      },
    });

    (getPrimaryRole as jest.Mock).mockReturnValue('publisher');

    (useFilters as jest.Mock).mockReturnValue({
      offset: 0,
      limit: 10,
      setOffset: mockSetOffset,
    });

    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);

    mockNavigate.mockResolvedValue(undefined);
    mockGetList.mockResolvedValue({
      data: mockJobs,
      total: 0,
    });
    mockGetById.mockResolvedValue({
      id: 'job-1',
      type: 'PULL',
      status: 'SUCCESS',
      details: 'Job detail payload',
    });

    (dataEnrichmentApi.getList as jest.Mock).mockImplementation(mockGetList);
    (dataEnrichmentApi.getById as jest.Mock).mockImplementation(mockGetById);
  });

  it('renders page header, action button, endpoint history button, and job list', async () => {
    render(<PublisherDEJobsPage />);

    expect(
      screen.getByRole('button', { name: /go back/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Data Enrichment')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /endpoint history/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveAttribute(
      'data-title',
      'View Endpoint Last Runs',
    );

    await waitFor(() => {
      expect(screen.getByTestId('job-list')).toBeInTheDocument();
    });
  });

  it('fetches jobs on mount with expected params and empty filters', async () => {
    render(<PublisherDEJobsPage />);

    await waitFor(() => {
      expect(mockGetList).toHaveBeenCalledWith(
        {
          limit: 10,
          offset: 0,
          userRole: 'publisher',
        },
        {},
      );
    });
  });

  it('passes fetched jobs, loading state, error state, and pagination to JobList', async () => {
    render(<PublisherDEJobsPage />);

    await waitFor(() => {
      expect(capturedJobListProps).toBeTruthy();
      expect(capturedJobListProps.jobs).toEqual(mockJobs);
      expect(capturedJobListProps.loading).toBe(false);
      expect(capturedJobListProps.error).toBeNull();
      expect(capturedJobListProps.searchingFilters).toEqual({});
      expect(capturedJobListProps.onRefresh).toEqual(expect.any(Function));
      expect(capturedJobListProps.onViewLogs).toEqual(expect.any(Function));
      expect(capturedJobListProps.setSearchingFilters).toEqual(
        expect.any(Function),
      );
      expect(capturedJobListProps.pagination).toMatchObject({
        page: 0,
        limit: 10,
        totalRecords: 0,
        setPage: expect.any(Function),
      });
    });

    expect(screen.getByTestId('job-count')).toHaveTextContent('2');
    expect(screen.getByTestId('job-list-loading')).toHaveTextContent('false');
    expect(screen.getByTestId('job-list-error')).toHaveTextContent('no-error');
    expect(screen.getByTestId('pagination-page')).toHaveTextContent('0');
    expect(screen.getByTestId('pagination-limit')).toHaveTextContent('10');
  });

  it('navigates back when Go Back is clicked', async () => {
    render(<PublisherDEJobsPage />);

    fireEvent.click(screen.getByRole('button', { name: /go back/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  it('shows error in JobList when fetching jobs fails', async () => {
    mockGetList.mockRejectedValueOnce(new Error('Unable to fetch jobs'));

    render(<PublisherDEJobsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('job-list-error')).toHaveTextContent(
        'Unable to fetch jobs',
      );
    });

    expect(screen.getByTestId('job-list-loading')).toHaveTextContent('false');
  });

  it('uses fallback error message when fetching jobs fails with non-Error value', async () => {
    mockGetList.mockRejectedValueOnce('unknown failure');

    render(<PublisherDEJobsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('job-list-error')).toHaveTextContent(
        'Failed to fetch configurations',
      );
    });
  });

  it('refreshes jobs when JobList onRefresh is triggered', async () => {
    render(<PublisherDEJobsPage />);

    await waitFor(() => {
      expect(mockGetList).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: /refresh jobs/i }));

    await waitFor(() => {
      expect(mockGetList).toHaveBeenCalledTimes(2);
    });
  });

  it('updates page through pagination.setPage and converts page to zero-based offset', async () => {
    render(<PublisherDEJobsPage />);

    await waitFor(() => {
      expect(capturedJobListProps?.pagination?.setPage).toEqual(
        expect.any(Function),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: /set page 3/i }));

    expect(mockSetOffset).toHaveBeenCalledWith(2);
  });

  it('updates searching filters and refetches jobs with new filters', async () => {
    render(<PublisherDEJobsPage />);

    await waitFor(() => {
      expect(mockGetList).toHaveBeenCalledWith(
        { limit: 10, offset: 0, userRole: 'publisher' },
        {},
      );
    });

    fireEvent.click(screen.getByRole('button', { name: /update filters/i }));

    await waitFor(() => {
      expect(mockGetList).toHaveBeenLastCalledWith(
        { limit: 10, offset: 0, userRole: 'publisher' },
        {
          status: 'SUCCESS',
          endpoint: 'publisher-endpoint',
        },
      );
    });

    expect(screen.getByTestId('searching-filters')).toHaveTextContent(
      JSON.stringify({
        status: 'SUCCESS',
        endpoint: 'publisher-endpoint',
      }),
    );
  });

  it('opens JobDetailsModal and loads selected job details when onViewLogs is triggered', async () => {
    render(<PublisherDEJobsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('job-list')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /view logs/i }));

    expect(screen.getByTestId('job-details-modal')).toBeInTheDocument();
    expect(screen.getByTestId('modal-loading')).toHaveTextContent('true');

    await waitFor(() => {
      expect(mockGetById).toHaveBeenCalledWith('job-1', 'PULL');
    });

    await waitFor(() => {
      expect(screen.getByTestId('modal-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('modal-job-id')).toHaveTextContent('job-1');
    });

    expect(capturedJobDetailsModalProps).toMatchObject({
      isOpen: true,
      onClose: expect.any(Function),
      isLoading: false,
      job: expect.objectContaining({
        id: 'job-1',
        type: 'PULL',
      }),
    });
  });

  it('passes uppercase PUSH type to getById for push jobs', async () => {
    mockGetList.mockResolvedValueOnce({
      data: [
        {
          id: 'job-1',
          type: 'push',
          status: 'SUCCESS',
        },
      ],
      total: 0,
    });

    render(<PublisherDEJobsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('job-list')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /view logs/i }));

    await waitFor(() => {
      expect(mockGetById).toHaveBeenCalledWith('job-1', 'PUSH');
    });
  });

  it('calls getById with undefined type when matching job type is missing', async () => {
    mockGetList.mockResolvedValueOnce({
      data: [
        {
          id: 'job-1',
          status: 'SUCCESS',
        },
      ],
      total: 0,
    });

    render(<PublisherDEJobsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('job-list')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /view logs/i }));

    await waitFor(() => {
      expect(mockGetById).toHaveBeenCalledWith('job-1', undefined);
    });
  });

  it('shows toast error and stops loading when job details fetch fails', async () => {
    mockGetById.mockRejectedValueOnce(new Error('details failed'));

    render(<PublisherDEJobsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('job-list')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /view logs/i }));

    expect(screen.getByTestId('job-details-modal')).toBeInTheDocument();
    expect(screen.getByTestId('modal-loading')).toHaveTextContent('true');

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Failed to load job details');
    });

    await waitFor(() => {
      expect(screen.getByTestId('modal-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('modal-job-id')).toHaveTextContent('no-job');
    });
  });

  it('closes JobDetailsModal and clears selected job when onClose is triggered', async () => {
    render(<PublisherDEJobsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('job-list')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /view logs/i }));

    await waitFor(() => {
      expect(screen.getByTestId('modal-job-id')).toHaveTextContent('job-1');
    });

    fireEvent.click(screen.getByRole('button', { name: /close job details/i }));

    await waitFor(() => {
      expect(screen.queryByTestId('job-details-modal')).not.toBeInTheDocument();
    });
  });

  it('uses role from getPrimaryRole when fetching jobs', async () => {
    (getPrimaryRole as jest.Mock).mockReturnValueOnce('admin');

    render(<PublisherDEJobsPage />);

    await waitFor(() => {
      expect(mockGetList).toHaveBeenCalledWith(
        {
          limit: 10,
          offset: 0,
          userRole: 'admin',
        },
        {},
      );
    });
  });
});
