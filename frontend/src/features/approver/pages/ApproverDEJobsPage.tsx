import { useAuth } from '@features/auth';
import { Button } from '@shared';
import useFilters from '@shared/hooks/useFilters';
import { getPrimaryRole } from '@utils/common/roleUtils';
import { ChevronLeft, Database } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useToast } from '../../../shared/providers/ToastProvider';
import JobDetailsModal from '../../data-enrichment/components/JobDetailsModal';
import { JobList } from '../../data-enrichment/components/JobList';
import { loadJobs } from '../../data-enrichment/handlers';
import { dataEnrichmentJobApi as dataEnrichmentApi } from '../../data-enrichment/handlers/index';
import type { DataEnrichmentJobResponse } from '../../data-enrichment/types';

const INITIAL_PAGE = 1;
const SORT_DESCENDING = -1;

const ApproverDEJobsPage: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<DataEnrichmentJobResponse[]>([]);

  const { user } = useAuth();
  const userRole = user?.claims ? getPrimaryRole(user.claims) : undefined;

  const [showJobDetails, setShowJobDetails] = useState(false);
  const [selectedJob, setSelectedJob] =
    useState<DataEnrichmentJobResponse | null>(null);
  const [jobDetailsLoading, setJobDetailsLoading] = useState(false);

  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [searchingFilters, setSearchingFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    offset,
    limit,
    setOffset,
  } = useFilters();

  const pagination = useMemo(() => ({
    page: offset,
    limit,
    totalRecords,
    setPage: (page: number): void => { setOffset(page - INITIAL_PAGE); },
  }), [offset, limit, totalRecords, setOffset])

  const { showSuccess, showError } = useToast();

  const fetchDeJobs = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await loadJobs(
        offset,
        limit,
        userRole as string,
        searchingFilters,
      );

      setJobs(response.data);
      setTotalRecords(response.total);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch configurations';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [offset, limit, searchingFilters, userRole])

  useEffect(() => {
    setOffset(0);
  }, [searchingFilters]);

  useEffect(() => {
    void fetchDeJobs();
  }, [fetchDeJobs]);

  const handleJobRefresh = (): void => {
    void fetchDeJobs();
  };

  const handleApproveJob = async (
    jobId: string,
    jobType: 'PULL' | 'PUSH',
    reason?: string,
  ): Promise<void> => {
    try {
      await dataEnrichmentApi.updateStatus(
        jobId,
        'STATUS_04_APPROVED',
        jobType,
        reason,
      );
      showSuccess('Job approved successfully');
      handleJobRefresh();
      setShowJobDetails(false);
      setSelectedJob(null);
    } catch (error) {
      showError('Failed to approve job');
    }
  };

  const handleRejectJob = async (
    jobId: string,
    jobType: 'PULL' | 'PUSH',
    reason: string,
  ): Promise<void> => {
    try {
      await dataEnrichmentApi.updateStatus(
        jobId,
        'STATUS_05_REJECTED',
        jobType,
        reason,
      );
      showSuccess(`Job rejected successfully. Reason: ${reason}`);
      handleJobRefresh();
    } catch (error) {
      showError('Failed to reject job');
    }
  };

  const handleViewJobDetails = async (jobId: string): Promise<void> => {
    try {
      setJobDetailsLoading(true);
      setShowJobDetails(true);

      const job = jobs.find((j) => j.id === jobId);
      const jobType = job?.type ? (job.type.toUpperCase() as 'PULL' | 'PUSH') : undefined;

      const jobDetails = await dataEnrichmentApi.getById(jobId, jobType);
      setSelectedJob(jobDetails);
    } catch (error) {
      showError('Failed to load job details');
    } finally {
      setJobDetailsLoading(false);
    }
  };

  const handleCloseJobDetails = (): void => {
    setShowJobDetails(false);
    setSelectedJob(null);
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto px-4 sm:px-6 lg:px-[48px] py-[52px]">
        <Button
          variant="primary"
          className="py-1 pl-2"
          onClick={(): void => { navigate(SORT_DESCENDING); }}>
          <ChevronLeft size={20} /> <span>Go Back</span>
        </Button>
        {/* Search Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center my-8 gap-4">
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <h1
              className="text-3xl font-bold flex items-center gap-2"
              style={{ color: '#3b3b3b' }}
            >
              <Database size={28} style={{ color: '#10b981' }} />
              Data Enrichment
            </h1>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <JobList
            jobs={jobs}
            onViewLogs={(jobId: string): void => { void handleViewJobDetails(jobId); }}
            onRefresh={(): void => { handleJobRefresh(); }}
            pagination={pagination}
            searchingFilters={searchingFilters}
            setSearchingFilters={setSearchingFilters}
            error={error}
            loading={loading}
          />
        </div>
      </main>

      {/* Job Details Modal */}
      {showJobDetails && selectedJob && (
        <JobDetailsModal
          isOpen={showJobDetails}
          onClose={(): void => { handleCloseJobDetails(); }}
          job={selectedJob}
          isLoading={jobDetailsLoading}
          editMode={false}
          onApprove={(jobId: string, jobType: 'PULL' | 'PUSH', reason?: string): void => { void handleApproveJob(jobId, jobType, reason); }}
          onReject={(jobId: string, jobType: 'PULL' | 'PUSH', reason: string): void => { void handleRejectJob(jobId, jobType, reason); }}
        />
      )}
    </div>
  );
};

export default ApproverDEJobsPage;
