import { Button } from '@shared';
import useFilters from '@shared/hooks/useFilters';
import { ChevronLeft, Database } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useToast } from '../../../shared/providers/ToastProvider';
import { getPrimaryRole, isExporter } from '../../../utils/common/roleUtils';
import { useAuth } from '../../auth/contexts/AuthContext';
import JobDetailsModal from '../../data-enrichment/components/JobDetailsModal';
import { JobList } from '../../data-enrichment/components/JobList';
import { dataEnrichmentJobApi as dataEnrichmentApi } from '../../data-enrichment/handlers';
import type { DataEnrichmentJobResponse } from '../../data-enrichment/types';

export const ExporterDEJobsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { user, isAuthenticated } = useAuth();

  const userIsExporter = user?.claims ? isExporter(user.claims) : false;
  const userRole = getPrimaryRole(user?.claims!);

  const [jobs, setJobs] = useState<DataEnrichmentJobResponse[]>([]);

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
    setPage: (page: number) => { setOffset(page - 1); },
  }), [offset, limit, totalRecords])

  useEffect(() => {
    if (isAuthenticated && user?.claims && !userIsExporter) {
      showError('You do not have permission to access this page');
    }
  }, [isAuthenticated, user, userIsExporter, showError]);

  const fetchDeJobs = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const params = { limit, offset, userRole: userRole as string };

      const response = await dataEnrichmentApi.getList(
        params,
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
  };

  useEffect(() => {
    fetchDeJobs();
  }, [searchingFilters]);

  const handleViewJobDetails = async (jobId: string) => {
    try {
      setJobDetailsLoading(true);
      setShowJobDetails(true);

      const job = jobs.find((j) => j.id === jobId);
      const jobType = job?.type?.toUpperCase() as 'PULL' | 'PUSH' | undefined;

      const jobDetails = await dataEnrichmentApi.getById(jobId, jobType);
      setSelectedJob(jobDetails);
    } catch (error) {
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
    try {
      await dataEnrichmentApi.updateStatus(
        jobId,
        'STATUS_06_EXPORTED',
        jobType,
      );
      showSuccess('Job exported successfully!');

      fetchDeJobs();

      handleCloseJobDetails();
    } catch (error) {
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

        {/* DE Jobs Table */}
        <JobList
          jobs={jobs}
          onRefresh={async () => { await fetchDeJobs(); }}
          onViewLogs={handleViewJobDetails}
          searchingFilters={searchingFilters}
          setSearchingFilters={setSearchingFilters}
          error={error}
          loading={loading}
          pagination={pagination}
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
