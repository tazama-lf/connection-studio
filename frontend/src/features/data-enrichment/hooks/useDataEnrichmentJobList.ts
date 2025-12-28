import { useState, useEffect, useMemo, useCallback } from 'react';
import type { DataEnrichmentJobResponse } from '../types';
import { DATA_ENRICHMENT_JOB_STATUSES } from '../constants';
import { useToast } from '../../../shared/providers/ToastProvider';
import { UI_CONFIG } from '../../../shared/config/app.config';
import { useAuth } from '../../auth/contexts/AuthContext';
import {
  isEditor,
  isExporter,
  isApprover,
  isPublisher,
  getPrimaryRole,
} from '../../../utils/common/roleUtils';
import * as dataEnrichmentHandlers from '../handlers';

export const useDataEnrichmentJobList = () => {
  const [jobs, setJobs] = useState<DataEnrichmentJobResponse[]>([]);

  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 0,
    totalRecords: 0,
  });

  const [searchingFilters, setSearchingFilters] = useState<
    Record<string, unknown>
  >({});

  const [error, setError] = useState<string | null>(null);

  const [loadingState, setLoadingState] = useState<{
    page: boolean;
    action: 'export' | 'approval' | 'activate' | 'deactivate' | 'edit' | '';
  }>({
    page: true,
    action: '',
  });

  const [selectedJob, setSelectedJob] =
    useState<DataEnrichmentJobResponse | null>(null);
  const [editMode, setEditMode] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'export' | 'approval' | 'activate' | 'deactivate' | '';
    job: DataEnrichmentJobResponse | null;
  }>({
    open: false,
    type: '',
    job: null,
  });

  const { showSuccess, showError } = useToast();
  const { user } = useAuth();

  const itemsPerPage = UI_CONFIG.pagination.defaultPageSize;

  const {
    userIsEditor,
    userIsApprover,
    userIsExporter,
    userIsPublisher,
    userRole,
  } = useMemo(() => {
    const claims = user?.claims ?? [];
    return {
      userIsEditor: isEditor(claims),
      userIsApprover: isApprover(claims),
      userIsExporter: isExporter(claims),
      userIsPublisher: isPublisher(claims),
      userRole: getPrimaryRole(claims),
    };
  }, [user]);

  const loadJobs = useCallback(
    async (pageNumber = pagination.page) => {
      try {
        setLoadingState((s) => ({ ...s, page: true as boolean }));
        setError(null);

        const response = await dataEnrichmentHandlers.loadJobs(
          pageNumber,
          itemsPerPage,
          userRole as string,
          searchingFilters,
        );

        setJobs(response?.jobs || []);
        setPagination({
          page: pageNumber,
          totalPages: response.pages,
          totalRecords: response.total,
        });
      } catch (err) {
        let message = 'Failed to fetch jobs.';
        if (err instanceof Error) {
          if (
            err.message.includes('500') ||
            err.message.includes('HTTP error')
          ) {
            message =
              'Server error: Unable to load jobs. Please try again later.';
          } else {
            message = err.message;
          }
        }
        setError(message);
      } finally {
        setLoadingState((s) => ({ ...s, page: false as boolean }));
      }
    },
    [itemsPerPage, userRole, searchingFilters, pagination.page],
  );

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleView = useCallback(
    async (jobId: string) => {
      try {
        setLoadingState((s) => ({ ...s, page: true as boolean }));
        const job = jobs.find((j: DataEnrichmentJobResponse) => j.id === jobId);
        const jobType = job?.type?.toUpperCase() as 'PULL' | 'PUSH' | undefined;

        const jobDetails =
          await dataEnrichmentHandlers.dataEnrichmentJobApi.getById(
            jobId,
            jobType,
          );
        setSelectedJob(jobDetails);
        setEditMode(false);
      } catch (err) {
        showError('Failed to load job details');
      } finally {
        setLoadingState((s) => ({ ...s, page: false as boolean }));
      }
    },
    [jobs, showError],
  );

  const handleEdit = useCallback(
    async (job: DataEnrichmentJobResponse) => {
      const jobStatus = job.status || DATA_ENRICHMENT_JOB_STATUSES.IN_PROGRESS;
      if (jobStatus === DATA_ENRICHMENT_JOB_STATUSES.APPROVED) {
        showError(
          'Approved jobs cannot be edited. Please create a new job instead.',
        );
        return;
      }

      if (
        jobStatus !== DATA_ENRICHMENT_JOB_STATUSES.IN_PROGRESS &&
        jobStatus !== DATA_ENRICHMENT_JOB_STATUSES.REJECTED
      ) {
        showError(`Jobs with status "${jobStatus}" cannot be edited.`);
        return;
      }

      try {
        setLoadingState((s) => ({ ...s, page: true as boolean }));
        const jobType = job?.type?.toUpperCase() as 'PULL' | 'PUSH' | undefined;

        const jobDetails =
          await dataEnrichmentHandlers.dataEnrichmentJobApi.getById(
            job.id,
            jobType,
          );
        setSelectedJob(jobDetails);
        setEditMode(true);
      } catch (err) {
        showError('Failed to load job details for edit');
      } finally {
        setLoadingState((s) => ({ ...s, page: false as boolean }));
      }
    },
    [showError],
  );

  const handleSaveEdit = useCallback(
    async (updatedJob: Partial<DataEnrichmentJobResponse>) => {
      if (!selectedJob) return;

      try {
        setLoadingState((s) => ({ ...s, action: 'edit' }));

        const jobType = (updatedJob.type || selectedJob.type)?.toLowerCase() as
          | 'pull'
          | 'push';

        if (jobType === 'push') {
          const pushData = {
            endpoint_name:
              updatedJob.endpoint_name || selectedJob.endpoint_name || '',
            description: updatedJob.description || selectedJob.description,
            version: updatedJob.version || selectedJob.version || 'v1',
            path: updatedJob.path || selectedJob.path || '',
            table_name: updatedJob.table_name || selectedJob.table_name || '',
            mode: (updatedJob.mode || selectedJob.mode || 'append'),
          };
          await dataEnrichmentHandlers.submitPushJob(pushData);
        } else {
          const pullData = {
            endpoint_name:
              updatedJob.endpoint_name || selectedJob.endpoint_name || '',
            description:
              updatedJob.description || selectedJob.description || '',
            version: updatedJob.version || selectedJob.version || 'v1',
            source_type:
              updatedJob.source_type || selectedJob.source_type || 'HTTP',
            table_name: updatedJob.table_name || selectedJob.table_name || '',
            mode: (updatedJob.mode || selectedJob.mode || 'append'),
            connection: updatedJob.connection ||
              selectedJob.connection || { url: '', headers: {} },
            schedule_id:
              updatedJob.schedule_id || selectedJob.schedule_id || '',
            file: updatedJob.file || selectedJob.file,
          };
          await dataEnrichmentHandlers.submitPullJob(pullData);
        }

        showSuccess(
          dataEnrichmentHandlers.DATA_ENRICHMENT_SUCCESS_MESSAGES.UPDATED,
        );
        loadJobs();
      } catch (err) {
        showError('Failed to update job');
      } finally {
        setLoadingState((s) => ({ ...s, action: '' }));
      }
    },
    [selectedJob, loadJobs, showSuccess, showError],
  );

  const handleSendForApproval = useCallback(
    async (jobId: string, jobType: 'PULL' | 'PUSH') => {
      try {
        setLoadingState((s) => ({ ...s, action: 'approval' }));
        await dataEnrichmentHandlers.sendForApproval(jobId, jobType);
        showSuccess(
          dataEnrichmentHandlers.DATA_ENRICHMENT_SUCCESS_MESSAGES
            .SUBMITTED_FOR_APPROVAL,
        );
        loadJobs();
      } catch (err) {
        showError('Failed to send job for approval');
      } finally {
        setLoadingState((s) => ({ ...s, action: '' }));
      }
    },
    [loadJobs, showSuccess, showError],
  );

  const handleApprove = useCallback(
    async (jobId: string, jobType: 'PULL' | 'PUSH') => {
      try {
        setLoadingState((s) => ({ ...s, action: 'approval' }));
        await dataEnrichmentHandlers.approveJob(jobId, jobType);
        showSuccess(
          dataEnrichmentHandlers.DATA_ENRICHMENT_SUCCESS_MESSAGES.APPROVED,
        );
        loadJobs();
      } catch (err) {
        showError('Failed to approve job');
      } finally {
        setLoadingState((s) => ({ ...s, action: '' }));
      }
    },
    [loadJobs, showSuccess, showError],
  );

  const handleReject = useCallback(
    async (jobId: string, jobType: 'PULL' | 'PUSH', reason?: string) => {
      try {
        setLoadingState((s) => ({ ...s, action: 'approval' }));
        await dataEnrichmentHandlers.rejectJob(jobId, jobType, reason);
        showSuccess(
          dataEnrichmentHandlers.DATA_ENRICHMENT_SUCCESS_MESSAGES.REJECTED,
        );
        loadJobs();
      } catch (err) {
        showError('Failed to reject job');
      } finally {
        setLoadingState((s) => ({ ...s, action: '' }));
      }
    },
    [loadJobs, showSuccess, showError],
  );

  const handleExport = useCallback(
    async (jobId: string, jobType: 'PULL' | 'PUSH') => {
      try {
        setLoadingState((s) => ({ ...s, action: 'export' }));
        await dataEnrichmentHandlers.exportJob(jobId, jobType);
        showSuccess(
          dataEnrichmentHandlers.DATA_ENRICHMENT_SUCCESS_MESSAGES.EXPORTED,
        );
        loadJobs();
        setConfirmDialog({ open: false, type: '', job: null });
      } catch (err) {
        showError('Failed to export job');
      } finally {
        setLoadingState((s) => ({ ...s, action: '' }));
      }
    },
    [loadJobs, showSuccess, showError],
  );

  const handleActivate = useCallback(
    async (jobId: string, jobType: 'PULL' | 'PUSH') => {
      try {
        setLoadingState((s) => ({ ...s, action: 'activate' }));
        await dataEnrichmentHandlers.activateJob(jobId, jobType);
        showSuccess(
          dataEnrichmentHandlers.DATA_ENRICHMENT_SUCCESS_MESSAGES.ACTIVATED,
        );
        loadJobs();
        setConfirmDialog({ open: false, type: '', job: null });
      } catch (err) {
        showError('Failed to activate job');
      } finally {
        setLoadingState((s) => ({ ...s, action: '' }));
      }
    },
    [loadJobs, showSuccess, showError],
  );

  const handleDeactivate = useCallback(
    async (jobId: string, jobType: 'PULL' | 'PUSH') => {
      try {
        setLoadingState((s) => ({ ...s, action: 'deactivate' }));
        await dataEnrichmentHandlers.deactivateJob(jobId, jobType);
        showSuccess(
          dataEnrichmentHandlers.DATA_ENRICHMENT_SUCCESS_MESSAGES.DEACTIVATED,
        );
        loadJobs();
        setConfirmDialog({ open: false, type: '', job: null });
      } catch (err) {
        showError('Failed to deactivate job');
      } finally {
        setLoadingState((s) => ({ ...s, action: '' }));
      }
    },
    [loadJobs, showSuccess, showError],
  );

  return {
    jobs,
    pagination,
    searchingFilters,
    selectedJob,
    editMode,
    confirmDialog,
    error,
    loading: loadingState.page,
    actionLoading: loadingState.action,
    itemsPerPage,
    userIsEditor,
    userIsApprover,
    userIsExporter,
    userIsPublisher,
    userRole,

    setPage: (newPage: number) =>
      { setPagination((p) => ({ ...p, page: newPage })); },
    setSearchingFilters,
    setSelectedJob,
    setEditMode,
    setConfirmDialog,

    loadJobs,
    handleView,
    handleEdit,
    handleSaveEdit,
    handleSendForApproval,
    handleApprove,
    handleReject,
    handleExport,
    handleActivate,
    handleDeactivate,
  };
};
