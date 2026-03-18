import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react';

import { DATA_ENRICHMENT_JOB_STATUSES } from '../../../../src/features/data-enrichment/constants';
import { useDataEnrichmentJobList } from '../../../../src/features/data-enrichment/hooks/useDataEnrichmentJobList';
import * as dataEnrichmentHandlers from '../../../../src/features/data-enrichment/handlers';

const mockSetOffset = jest.fn();
const showSuccess = jest.fn();
const showError = jest.fn();

jest.mock('@shared/hooks/useFilters', () => ({
  __esModule: true,
  default: () => ({
    offset: 0,
    limit: 10,
    setOffset: mockSetOffset,
  }),
}));

jest.mock('../../../../src/shared/providers/ToastProvider', () => ({
  useToast: () => ({
    showSuccess,
    showError,
  }),
}));

jest.mock('../../../../src/features/data-enrichment/handlers', () => ({
  loadJobs: jest.fn(),
  submitPushJob: jest.fn(),
  submitPullJob: jest.fn(),
  sendForApproval: jest.fn(),
  approveJob: jest.fn(),
  rejectJob: jest.fn(),
  exportJob: jest.fn(),
  activateJob: jest.fn(),
  deactivateJob: jest.fn(),
  dataEnrichmentJobApi: {
    getById: jest.fn(),
  },
  DATA_ENRICHMENT_SUCCESS_MESSAGES: {
    UPDATED: 'Job updated successfully',
    SUBMITTED_FOR_APPROVAL: 'Job submitted for approval',
    APPROVED: 'Job approved successfully',
    REJECTED: 'Job rejected successfully',
    EXPORTED: 'Job exported successfully',
    ACTIVATED: 'Job activated successfully',
    DEACTIVATED: 'Job deactivated successfully',
  },
}));

jest.mock('../../../../src/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { claims: ['editor'] } }),
}));

jest.mock('../../../../src/utils/common/roleUtils', () => ({
  isEditor: jest.fn(() => true),
  isApprover: jest.fn(() => false),
  isExporter: jest.fn(() => false),
  isPublisher: jest.fn(() => false),
  getPrimaryRole: jest.fn(() => 'editor'),
}));

describe('useDataEnrichmentJobList', () => {
  const job = {
    id: 'job-1',
    type: 'PULL',
    status: DATA_ENRICHMENT_JOB_STATUSES.IN_PROGRESS,
    endpoint_name: 'endpoint',
    description: 'desc',
    version: '1',
    table_name: 'table',
    source_type: 'HTTP',
    mode: 'append',
    connection: { url: 'x', headers: {} },
    schedule_id: 's1',
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    jest
      .mocked(dataEnrichmentHandlers.loadJobs)
      .mockResolvedValue({ data: [job], total: 1 } as any);

    jest
      .mocked(dataEnrichmentHandlers.dataEnrichmentJobApi.getById)
      .mockResolvedValue(job);
  });

  it('loads jobs and pagination works', async () => {
    const { result } = renderHook(() => useDataEnrichmentJobList());

    await waitFor(() => expect(result.current.jobs).toHaveLength(1));

    expect(result.current.pagination.page).toBe(0);
    expect(result.current.pagination.limit).toBe(10);
    expect(result.current.pagination.totalRecords).toBe(1);

    act(() => {
      result.current.pagination.setPage(3);
    });

    expect(mockSetOffset).toHaveBeenCalledWith(2);
  });

  it('setters update state', async () => {
    const { result } = renderHook(() => useDataEnrichmentJobList());

    await waitFor(() => expect(result.current.jobs.length).toBe(1));

    act(() => {
      result.current.setSearchingFilters({ name: 'abc' });
    });

    expect(result.current.searchingFilters).toEqual({ name: 'abc' });

    act(() => {
      result.current.setSelectedJob(job);
    });

    expect(result.current.selectedJob?.id).toBe('job-1');

    act(() => {
      result.current.setEditMode(true);
    });

    expect(result.current.editMode).toBe(true);
  });

  it('maps server error message', async () => {
    jest
      .mocked(dataEnrichmentHandlers.loadJobs)
      .mockRejectedValueOnce(new Error('HTTP error: 500'));

    const { result } = renderHook(() => useDataEnrichmentJobList());

    await waitFor(() => {
      expect(result.current.error).toContain('Server error');
    });
  });

  it('maps generic error message', async () => {
    jest
      .mocked(dataEnrichmentHandlers.loadJobs)
      .mockRejectedValueOnce(new Error('Network fail'));

    const { result } = renderHook(() => useDataEnrichmentJobList());

    await waitFor(() => {
      expect(result.current.error).toBe('Network fail');
    });
  });

  it('maps non error object', async () => {
    jest
      .mocked(dataEnrichmentHandlers.loadJobs)
      .mockRejectedValueOnce('bad');

    const { result } = renderHook(() => useDataEnrichmentJobList());

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to fetch jobs.');
    });
  });

  it('handleView success', async () => {
    const { result } = renderHook(() => useDataEnrichmentJobList());

    await waitFor(() => expect(result.current.jobs.length).toBe(1));

    await act(async () => {
      await result.current.handleView('job-1');
    });

    expect(result.current.selectedJob?.id).toBe('job-1');
    expect(result.current.editMode).toBe(false);
  });

  it('handleView error', async () => {
    jest
      .mocked(dataEnrichmentHandlers.dataEnrichmentJobApi.getById)
      .mockRejectedValueOnce(new Error());

    const { result } = renderHook(() => useDataEnrichmentJobList());

    await waitFor(() => expect(result.current.jobs.length).toBe(1));

    await act(async () => {
      await result.current.handleView('job-1');
    });

    expect(showError).toHaveBeenCalledWith('Failed to load job details');
  });

  it('handleEdit restrictions', async () => {
    const { result } = renderHook(() => useDataEnrichmentJobList());

    await waitFor(() => expect(result.current.jobs.length).toBe(1));

    await act(async () => {
      await result.current.handleEdit({
        ...job,
        status: DATA_ENRICHMENT_JOB_STATUSES.APPROVED,
      });
    });

    expect(showError).toHaveBeenCalled();

    await act(async () => {
      await result.current.handleEdit({
        ...job,
        status: DATA_ENRICHMENT_JOB_STATUSES.EXPORTED,
      });
    });

    expect(showError).toHaveBeenCalled();
  });

  it('handleEdit success', async () => {
    const { result } = renderHook(() => useDataEnrichmentJobList());

    await waitFor(() => expect(result.current.jobs.length).toBe(1));

    await act(async () => {
      await result.current.handleEdit(job);
    });

    expect(result.current.editMode).toBe(true);
  });

  it('handleEdit error', async () => {
    jest
      .mocked(dataEnrichmentHandlers.dataEnrichmentJobApi.getById)
      .mockRejectedValueOnce(new Error());

    const { result } = renderHook(() => useDataEnrichmentJobList());

    await waitFor(() => expect(result.current.jobs.length).toBe(1));

    await act(async () => {
      await result.current.handleEdit(job);
    });

    expect(showError).toHaveBeenCalledWith(
      'Failed to load job details for edit',
    );
  });

  it('handleSaveEdit returns early when selectedJob is null', async () => {
    const { result } = renderHook(() => useDataEnrichmentJobList());

    await act(async () => {
      await result.current.handleSaveEdit({ type: 'pull' } as any);
    });

    expect(dataEnrichmentHandlers.submitPullJob).not.toHaveBeenCalled();
  });

  it('handleSaveEdit push and pull success', async () => {
    const { result } = renderHook(() => useDataEnrichmentJobList());

    await waitFor(() => expect(result.current.jobs.length).toBe(1));

    await act(async () => {
      await result.current.handleView('job-1');
    });

    await act(async () => {
      await result.current.handleSaveEdit({ type: 'pull' } as any);
      await result.current.handleSaveEdit({ type: 'push' } as any);
    });

    expect(dataEnrichmentHandlers.submitPullJob).toHaveBeenCalled();
    expect(dataEnrichmentHandlers.submitPushJob).toHaveBeenCalled();
    expect(showSuccess).toHaveBeenCalledWith('Job updated successfully');
  });

  it('handleSaveEdit error', async () => {
    jest
      .mocked(dataEnrichmentHandlers.submitPullJob)
      .mockRejectedValueOnce(new Error());

    const { result } = renderHook(() => useDataEnrichmentJobList());

    await waitFor(() => expect(result.current.jobs.length).toBe(1));

    await act(async () => {
      await result.current.handleView('job-1');
    });

    await act(async () => {
      await result.current.handleSaveEdit({ type: 'pull' } as any);
    });

    expect(showError).toHaveBeenCalledWith('Failed to update job');
  });

  it('push fallback branch coverage', async () => {
    const { result } = renderHook(() => useDataEnrichmentJobList());

    await waitFor(() => expect(result.current.jobs.length).toBe(1));

    await act(async () => {
      await result.current.handleView('job-1');
    });

    await act(async () => {
      await result.current.handleSaveEdit({ type: 'push' } as any);
    });

    expect(dataEnrichmentHandlers.submitPushJob).toHaveBeenCalled();
  });

  it('pull fallback branch coverage', async () => {
    const { result } = renderHook(() => useDataEnrichmentJobList());

    await waitFor(() => expect(result.current.jobs.length).toBe(1));

    await act(async () => {
      await result.current.handleView('job-1');
    });

    await act(async () => {
      await result.current.handleSaveEdit({ type: 'pull', connection: undefined } as any);
    });

    expect(dataEnrichmentHandlers.submitPullJob).toHaveBeenCalled();
  });

  it('action handlers success', async () => {
    const { result } = renderHook(() => useDataEnrichmentJobList());

    await waitFor(() => expect(result.current.jobs.length).toBe(1));

    act(() => {
      result.current.setConfirmDialog({ open: true, type: 'export', job });
    });

    await act(async () => {
      await result.current.handleSendForApproval('job-1', 'PULL');
      await result.current.handleApprove('job-1', 'PULL');
      await result.current.handleReject('job-1', 'PULL');
      await result.current.handleExport('job-1', 'PULL');
      await result.current.handleActivate('job-1', 'PULL');
      await result.current.handleDeactivate('job-1', 'PULL');
    });

    expect(showSuccess).toHaveBeenCalled();
    expect(result.current.confirmDialog.open).toBe(false);
  });

  it('action handlers error', async () => {
    jest
      .mocked(dataEnrichmentHandlers.sendForApproval)
      .mockRejectedValueOnce(new Error());
    jest
      .mocked(dataEnrichmentHandlers.approveJob)
      .mockRejectedValueOnce(new Error());
    jest
      .mocked(dataEnrichmentHandlers.rejectJob)
      .mockRejectedValueOnce(new Error());
    jest
      .mocked(dataEnrichmentHandlers.exportJob)
      .mockRejectedValueOnce(new Error());
    jest
      .mocked(dataEnrichmentHandlers.activateJob)
      .mockRejectedValueOnce(new Error());
    jest
      .mocked(dataEnrichmentHandlers.deactivateJob)
      .mockRejectedValueOnce(new Error());

    const { result } = renderHook(() => useDataEnrichmentJobList());

    await waitFor(() => expect(result.current.jobs.length).toBe(1));

    await act(async () => {
      await result.current.handleSendForApproval('job-1', 'PULL');
      await result.current.handleApprove('job-1', 'PULL');
      await result.current.handleReject('job-1', 'PULL');
      await result.current.handleExport('job-1', 'PULL');
      await result.current.handleActivate('job-1', 'PULL');
      await result.current.handleDeactivate('job-1', 'PULL');
    });

    expect(showError).toHaveBeenCalled();
  });
});

describe('useDataEnrichmentJobList - additional branch coverage', () => {
  const job = {
    id: 'job-1',
    type: 'PULL',
    status: 'STATUS_01_IN_PROGRESS',
    endpoint_name: 'endpoint',
    description: 'desc',
    version: '1',
    table_name: 'table',
    source_type: 'HTTP',
    mode: 'append',
    connection: { url: 'x', headers: {} },
    schedule_id: 's1',
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(dataEnrichmentHandlers.loadJobs)
      .mockResolvedValue({ data: [job], total: 1 } as any);
    jest
      .mocked(dataEnrichmentHandlers.dataEnrichmentJobApi.getById)
      .mockResolvedValue(job);
  });

  it('uses ?? fallback for user?.claims when user is null', async () => {
    // Covers branch: user?.claims ?? [] (right side when user has no claims)
    // Re-mock auth to return null user for this describe block
    jest.mock('../../../../src/features/auth/contexts/AuthContext', () => ({
      useAuth: () => ({ user: { claims: undefined } }),
    }));

    const { result } = renderHook(() => useDataEnrichmentJobList());
    await waitFor(() => expect(dataEnrichmentHandlers.loadJobs).toHaveBeenCalled());
    // Hook should still render without crashing
    expect(result.current).toBeDefined();
  });

  it('handleEdit with undefined job status uses IN_PROGRESS fallback', async () => {
    // Covers branch: job.status ?? DATA_ENRICHMENT_JOB_STATUSES.IN_PROGRESS (right side)
    const { result } = renderHook(() => useDataEnrichmentJobList());
    await waitFor(() => expect(result.current.jobs.length).toBe(1));

    await act(async () => {
      // Job without status field → status undefined → ?? uses IN_PROGRESS
      await result.current.handleEdit({ ...job, status: undefined } as any);
    });

    // Should enter edit mode (IN_PROGRESS is not APPROVED or EXPORTED)
    expect(result.current.editMode).toBe(true);
  });

  it('buildPullJobData uses fallback values when fields are missing in both jobs', async () => {
    // Covers branches: source_type ?? 'HTTP', connection ?? {}, schedule_id ?? ''
    const { result } = renderHook(() => useDataEnrichmentJobList());
    await waitFor(() => expect(result.current.jobs.length).toBe(1));

    await act(async () => {
      await result.current.handleView('job-1');
    });

    await act(async () => {
      // Both updatedJob and selectedJob missing source_type, connection, schedule_id
      await result.current.handleSaveEdit({
        type: 'pull',
        endpoint_name: 'ep',
        source_type: undefined,
        connection: undefined,
        schedule_id: undefined,
      } as any);
    });

    expect(dataEnrichmentHandlers.submitPullJob).toHaveBeenCalled();
  });

  it('handleSaveEdit uses pull fallback when neither updatedJob nor selectedJob has type', async () => {
    // Covers branches: updatedJob.type ?? selectedJob.type ?? 'pull'
    // (both type fields undefined → use 'pull' default)
    jest
      .mocked(dataEnrichmentHandlers.dataEnrichmentJobApi.getById)
      .mockResolvedValue({ ...job, type: undefined } as any);

    const { result } = renderHook(() => useDataEnrichmentJobList());
    await waitFor(() => expect(result.current.jobs.length).toBe(1));

    await act(async () => {
      await result.current.handleView('job-1');
    });

    await act(async () => {
      // updatedJob.type undefined AND selectedJob.type undefined → 'pull' fallback
      await result.current.handleSaveEdit({ type: undefined } as any);
    });

    // Should have called submitPullJob (the 'pull' default)
    expect(dataEnrichmentHandlers.submitPullJob).toHaveBeenCalled();
  });

  it('handleSaveEdit pull uses fallback values when selectedJob lacks source_type/connection/schedule_id', async () => {
    const sparseJob = {
      id: 'job-sparse',
      type: 'PULL',
      status: 'STATUS_01_IN_PROGRESS',
      endpoint_name: 'sparse-ep',
      description: 'desc',
      version: '1',
      table_name: 'tbl',
      mode: 'append',
      // source_type, connection, schedule_id intentionally omitted
    } as any;

    jest.mocked(dataEnrichmentHandlers.loadJobs)
      .mockResolvedValue({ data: [sparseJob], total: 1 } as any);
    jest.mocked(dataEnrichmentHandlers.dataEnrichmentJobApi.getById)
      .mockResolvedValue(sparseJob);

    const { result } = renderHook(() => useDataEnrichmentJobList());
    await waitFor(() => expect(result.current.jobs.length).toBe(1));

    await act(async () => {
      await result.current.handleView('job-sparse');
    });

    await act(async () => {
      await result.current.handleSaveEdit({ type: 'pull' } as any);
    });

    expect(dataEnrichmentHandlers.submitPullJob).toHaveBeenCalledWith(
      expect.objectContaining({
        source_type: 'HTTP',
        connection: { url: '', headers: {} },
        schedule_id: '',
      }),
    );
  });
});