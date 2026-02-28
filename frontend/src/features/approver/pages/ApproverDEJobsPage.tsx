import { useAuth } from '@features/auth';
import { Button } from '@shared';
import { UI_CONFIG } from '@shared/config/app.config';
import { getPrimaryRole } from '@utils/common/roleUtils';
import { ChevronLeft, Database } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useToast } from '../../../shared/providers/ToastProvider';
import JobDetailsModal from '../../data-enrichment/components/JobDetailsModal';
import { JobList } from '../../data-enrichment/components/JobList';
import { loadJobs } from '../../data-enrichment/handlers';
import type { DataEnrichmentJobResponse } from '../../data-enrichment/types';
import { dataEnrichmentJobApi as dataEnrichmentApi} from '../../data-enrichment/handlers/index';

const ApproverDEJobsPage: React.FC = () => {
  // Data Enrichment Job state
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<DataEnrichmentJobResponse[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobSearchTerm, setJobSearchTerm] = useState('');

  const { user } = useAuth();
  const userRole = getPrimaryRole(user?.claims!);

  const [itemsPerPage] = useState(UI_CONFIG.pagination.defaultPageSize);

  // Job details modal state
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [selectedJob, setSelectedJob] =
    useState<DataEnrichmentJobResponse | null>(null);
  const [jobDetailsLoading, setJobDetailsLoading] = useState(false);

  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [searchingFilters, setSearchingFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { showSuccess, showError } = useToast();

  const fetchDeJobs = async (pageNumber = 1): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await loadJobs(
        pageNumber,
        itemsPerPage,
        userRole as string,
        searchingFilters,
      );

      setJobs(response.data);
      setTotalPages(response.pages);
      setTotalRecords(response.total);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch configurations';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeJobs(page);
  }, [page, searchingFilters]);

  const handleJobRefresh = () => {
    console.log(
      'ApproverDEJobsPage: handleJobRefresh called - triggering loadJobs',
    );
    fetchDeJobs(page);
  };

  const handleApproveJob = async (
    jobId: string,
    jobType: 'PULL' | 'PUSH',
    reason?: string,
  ) => {
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
      console.error('Failed to approve job:', error);
      showError('Failed to approve job');
    }
  };

  const handleRejectJob = async (
    jobId: string,
    jobType: 'PULL' | 'PUSH',
    reason: string,
  ) => {
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
      console.error('Failed to reject job:', error);
      showError('Failed to reject job');
    }
  };

  const handleViewJobDetails = async (jobId: string) => {
    console.log('ApproverDEJobsPage: View job details clicked for:', jobId);
    try {
      setJobDetailsLoading(true);
      setShowJobDetails(true);

      // Find the job in the current list to determine its type
      const job = jobs.find((j) => j.id === jobId);
      const jobType = job?.type?.toUpperCase() as 'PULL' | 'PUSH' | undefined;

      // Fetch job details from the API
      const jobDetails = await dataEnrichmentApi.getById(jobId, jobType);
      setSelectedJob(jobDetails);
    } catch (error) {
      console.error('Failed to load job details:', error);
      showError('Failed to load job details');
    } finally {
      setJobDetailsLoading(false);
    }
  };

  const handleCloseJobDetails = () => {
    setShowJobDetails(false);
    setSelectedJob(null);
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto px-4 sm:px-6 lg:px-[48px] py-[52px]">
        <Button
          variant="primary"
          className="py-1 pl-2"
          onClick={async () => { await navigate(-1); }}
        >
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

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          <JobList
            jobs={jobs}
            isLoading={jobsLoading}
            onViewLogs={handleViewJobDetails}
            onRefresh={handleJobRefresh}
            page={page}
            setPage={setPage}
            totalPages={totalPages}
            totalRecords={totalRecords}
            itemsPerPage={itemsPerPage}
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
          onClose={handleCloseJobDetails}
          job={selectedJob}
          isLoading={jobDetailsLoading}
          editMode={false}
          onApprove={handleApproveJob}
          onReject={handleRejectJob}
        />
      )}
    </div>
  );
};

export default ApproverDEJobsPage;
