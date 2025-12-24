import { useState, useEffect, useMemo, useCallback } from 'react';
import type { DataEnrichmentJobResponse, JobStatus } from '../types';
import { useToast } from '../../../shared/providers/ToastProvider';
import { UI_CONFIG } from '../../../shared/config/app.config';
import { useAuth } from '../../auth/contexts/AuthContext';
import {
  isEditor,
  isApprover,
  isExporter,
  isPublisher,
  getPrimaryRole,
} from '../../../utils/common/roleUtils';
import { dataEnrichmentApi } from '../handlers/index';

export const useDataEnrichmentList = () => {
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
  const [loading, setLoading] = useState(true);

  const [selectedJob, setSelectedJob] =
    useState<DataEnrichmentJobResponse | null>(null);

  const { showSuccess, showError } = useToast();
  const { user } = useAuth();

  const itemsPerPage = UI_CONFIG.pagination.defaultPageSize;

  const { userIsEditor, userIsApprover, userIsExporter, userIsPublisher, userRole } =
    useMemo(() => {
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
        setLoading(true);
        setError(null);

        const limit: number = itemsPerPage;
        const offset: number = pageNumber - 1;

        const params = { limit, offset, userRole: userRole as string };

        const response = await dataEnrichmentApi.getAllJobs(
          params,
          searchingFilters,
        );

        setJobs(response.jobs);
        setPagination({
          page: pageNumber,
          totalPages: response.pages,
          totalRecords: response.total,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to fetch data enrichment jobs';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [itemsPerPage, userRole, searchingFilters, pagination.page],
  );

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const loadJobWithScrollPreservation = useCallback(
    async (pageNumber = pagination.page) => {
      const scrollPosition = window.scrollY;
      try {
        await loadJobs(pageNumber);
        setTimeout(() => {
          if (
            scrollPosition > 0 &&
            scrollPosition < document.body.scrollHeight
          ) {
            window.scrollTo(0, scrollPosition);
          }
        }, 100);
      } catch (error) {
        setTimeout(() => {
          if (
            scrollPosition > 0 &&
            scrollPosition < document.body.scrollHeight
          ) {
            window.scrollTo(0, scrollPosition);
          }
        }, 100);
      }
    },
    [loadJobs, pagination.page],
  );

  const handleViewJob = useCallback(
    async (jobId: string) => {
      const job = jobs.find((j) => j.id === jobId);
      const jobType = job?.type?.toUpperCase() as 'PULL' | 'PUSH' | undefined;

      const jobDetails = await dataEnrichmentApi.getJob(jobId, jobType);
      setSelectedJob(jobDetails);
      return jobDetails;
    },
    [jobs],
  );

  const handleCreateJob = useCallback(
    async (isPull: boolean, data: any) => {
      if (isPull) {
        return await dataEnrichmentApi.createPullJob(data);
      } else {
        return await dataEnrichmentApi.createPushJob(data);
      }
    },
    [],
  );

  const handleUpdateJob = useCallback(async (jobId: string, updates: any) => {
    const jobType = updates.type || 'pull';
    if (jobType === 'pull') {
      return await dataEnrichmentApi.updatePullJob(jobId, updates);
    } else {
      return await dataEnrichmentApi.updatePushJob(jobId, updates);
    }
  }, []);

  const handleDeleteJob = useCallback(
    async (jobId: string, jobType: 'pull' | 'push') => {
      await dataEnrichmentApi.deleteJob(jobId, jobType);
      showSuccess('Job deleted successfully');
      loadJobs();
    },
    [loadJobs, showSuccess],
  );

  const handleUpdateJobStatus = useCallback(
    async (
      jobId: string,
      status: JobStatus,
      jobType: 'PULL' | 'PUSH',
      reason?: string,
    ) => {
      await dataEnrichmentApi.updateJobStatus(jobId, status, jobType, reason);
      loadJobs();
    },
    [loadJobs],
  );

  const handleUpdateJobActivation = useCallback(
    async (jobId: string, isActive: boolean, jobType: 'PULL' | 'PUSH') => {
      await dataEnrichmentApi.updateJobActivation(jobId, isActive, jobType);
      showSuccess(
        `Job ${isActive ? 'activated' : 'deactivated'} successfully`,
      );
      loadJobs();
    },
    [loadJobs, showSuccess],
  );

  const handleResumeJob = useCallback(
    async (job: DataEnrichmentJobResponse) => {
      try {
        await dataEnrichmentApi.updateJobStatus(
          job.id,
          'STATUS_01_IN_PROGRESS',
          job.type?.toUpperCase() as 'PULL' | 'PUSH',
        );
        showSuccess(`Job ${job.endpoint_name || job.id} resumed successfully`);
        loadJobs();
      } catch (error) {
        showError('Failed to resume job');
        throw error;
      }
    },
    [loadJobs, showSuccess, showError],
  );

  const handleUpdateStatus = useCallback(
    async (job: DataEnrichmentJobResponse, status: string) => {
      try {
        await dataEnrichmentApi.updateStatus(
          job.id,
          status,
          job.type?.toUpperCase() as 'PULL' | 'PUSH',
        );
        showSuccess(`Job status updated successfully`);
        loadJobs();
      } catch (error) {
        showError('Failed to update job status');
        throw error;
      }
    },
    [loadJobs, showSuccess, showError],
  );

  const handleTogglePublishingStatus = useCallback(
    async (job: DataEnrichmentJobResponse, newStatus: 'active' | 'in-active') => {
      try {
        const data = await dataEnrichmentApi.updatePublishingStatus(
          job.id,
          newStatus,
          job.type?.toUpperCase() as 'PULL' | 'PUSH',
        );

        if (data?.success) {
          const statusLabel = newStatus === 'active' ? 'activated' : 'deactivated';
          showSuccess(
            `Job ${job.endpoint_name || job.id} has been ${statusLabel} successfully`,
          );
          loadJobs();
        }
      } catch (error) {
        showError('Failed to update publishing status. Please try again.');
        throw error;
      }
    },
    [loadJobs, showSuccess, showError],
  );

  return {
    jobs,
    pagination,
    searchingFilters,
    selectedJob,
    error,
    loading,
    itemsPerPage,
    userIsEditor,
    userIsApprover,
    userIsExporter,
    userIsPublisher,
    userRole,

    setPage: (newPage: number) =>
      setPagination((p) => ({ ...p, page: newPage })),
    setSearchingFilters,
    setSelectedJob,

    loadJobs,
    loadJobWithScrollPreservation,
    handleViewJob,
    handleCreateJob,
    handleUpdateJob,
    handleDeleteJob,
    handleUpdateJobStatus,
    handleUpdateJobActivation,
    handleResumeJob,
    handleUpdateStatus,
    handleTogglePublishingStatus,
  };
};
