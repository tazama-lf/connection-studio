import React, { useState, useEffect } from 'react';
import { useToast } from '../../../shared/providers/ToastProvider';
import { useAuth } from '../../auth/contexts/AuthContext';
import { dataEnrichmentApi } from '../../data-enrichment/services';
import { JobList } from '../../data-enrichment/components/JobList';
import JobDetailsModal from '../../data-enrichment/components/JobDetailsModal';
import type { DataEnrichmentJobResponse } from '../../data-enrichment/types';
import { getPrimaryRole, isExporter } from '../../../utils/roleUtils';
import { UI_CONFIG } from '@shared/config/app.config';
import { Button } from '@shared';
import { ChevronLeft, Database } from 'lucide-react';
import { useNavigate } from 'react-router';

export const ExporterDEJobsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { user, isAuthenticated } = useAuth();

  const [itemsPerPage] = useState(UI_CONFIG.pagination.defaultPageSize);

  // Role check
  const userIsExporter = user?.claims ? isExporter(user.claims) : false;
  const userRole = getPrimaryRole(user?.claims as string[]);

  // State
  const [jobs, setJobs] = useState<DataEnrichmentJobResponse[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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

  // Role-based access check
  useEffect(() => {
    if (isAuthenticated && user?.claims && !userIsExporter) {
      showError('You do not have permission to access this page');
    }
  }, [isAuthenticated, user, userIsExporter, showError]);

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

  const handleViewJobDetails = async (jobId: string) => {
    console.log('Exporter viewing job details:', jobId);
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

  const handleExportJob = async (jobId: string, jobType: 'PULL' | 'PUSH') => {
    console.log('Exporter exporting job:', jobId, jobType);
    try {
      await dataEnrichmentApi.updateJobStatus(
        jobId,
        'STATUS_06_EXPORTED',
        jobType,
      );
      showSuccess('Job exported successfully!');

      // Refresh the jobs list
      fetchDeJobs(page);

      // Close the modal
      handleCloseJobDetails();
    } catch (error) {
      console.error('Failed to export job:', error);
      showError('Failed to export job. Please try again.');
    }
  };

  if (!isAuthenticated || !userIsExporter) {
    return (
      <div className="min-h-screen bg-white">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-600">
              You do not have permission to access this page.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto px-4 sm:px-6 lg:px-[48px] py-[52px]">
        <Button
          variant="primary"
          className="py-1 pl-2"
          onClick={() => navigate(-1)}
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

        {/* DE Jobs Table */}
        <JobList
          jobs={jobs}
          isLoading={jobsLoading}
          onRefresh={() => fetchDeJobs(page)}
          onViewLogs={handleViewJobDetails}
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

      {/* Modal for viewing job details */}
      <JobDetailsModal
        isOpen={showJobDetails}
        onClose={handleCloseJobDetails}
        job={selectedJob}
        isLoading={jobDetailsLoading}
        onExport={handleExportJob}
      />
    </div>
  );
};

export default ExporterDEJobsPage;
