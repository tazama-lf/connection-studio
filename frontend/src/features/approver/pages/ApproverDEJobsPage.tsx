import React, { useState, useEffect } from 'react';
import { SearchIcon } from 'lucide-react';
import { JobList } from '../../data-enrichment/components/JobList';
import JobDetailsModal from '../../data-enrichment/components/JobDetailsModal';
import type {
  DataEnrichmentJobResponse,
  JobStatus,
} from '../../data-enrichment/types';
import { dataEnrichmentApi } from '../../data-enrichment/services/dataEnrichmentApi';
import { useToast } from '../../../shared/providers/ToastProvider';
import { AuthHeader } from '../../../shared/components/AuthHeader';
import { UI_CONFIG } from '@shared/config/app.config';
import { getPrimaryRole } from '@utils/roleUtils';
import { useAuth } from '@features/auth';

const ApproverDEJobsPage: React.FC = () => {
  // Data Enrichment Job state
  const [jobs, setJobs] = useState<DataEnrichmentJobResponse[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobSearchTerm, setJobSearchTerm] = useState('');

  const { user } = useAuth();
  const userRole = getPrimaryRole(user?.claims as string[]);

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

  const fetchDeJobs = async (pageNumber: number = 1): Promise<void> => {
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

  const handleApproveJob = async (jobId: string, jobType: 'PULL' | 'PUSH') => {
    try {
      await dataEnrichmentApi.updateJobStatus(jobId, 'approved', jobType);
      showSuccess('Job approved successfully');
      handleJobRefresh();
    } catch (error) {
      console.error('Failed to approve job:', error);
      showError('Failed to approve job');
    }
  };

  const handleRejectJob = async (jobId: string, jobType: 'PULL' | 'PUSH') => {
    try {
      await dataEnrichmentApi.updateJobStatus(jobId, 'rejected', jobType);
      showSuccess('Job rejected successfully');
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
      const jobDetails = await dataEnrichmentApi.getJob(jobId, jobType);
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
    <div className="min-h-screen bg-gray-50">
      <AuthHeader title="Data Enrichment" showBackButton={true} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search data enrichment jobs..."
                value={jobSearchTerm}
                onChange={(e) => setJobSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
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
