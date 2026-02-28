import React, { useState, useEffect } from 'react';
import { ChevronLeft, Database } from 'lucide-react';
import { dataEnrichmentJobApi as dataEnrichmentApi } from '../../data-enrichment/handlers';
import { useToast } from '../../../shared/providers/ToastProvider';
import type { DataEnrichmentJobResponse } from '../../data-enrichment/types';

import { useAuth } from '@features/auth';
import { getPrimaryRole } from '@utils/common/roleUtils';
import { UI_CONFIG } from '@shared/config/app.config';
import JobList from '@features/data-enrichment/components/JobList';
import { Button } from '@shared';
import { useNavigate } from 'react-router';
import JobDetailsModal from '@features/data-enrichment/components/JobDetailsModal';
import { Tooltip } from '@mui/material';
import EndpointHistoryButton from '@features/data-enrichment/components/EndpointHistoryButton';

const PublisherDEJobsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = getPrimaryRole(user?.claims!);

  const [itemsPerPage] = useState(UI_CONFIG.pagination.defaultPageSize);
  const [jobs, setJobs] = useState<DataEnrichmentJobResponse[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const { showError } = useToast();

  const fetchDeJobs = async (pageNumber = 1): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const limit: number = itemsPerPage;
      const offset: number = pageNumber - 1;

      const params = { limit, offset, userRole: userRole as string };

      const response = await dataEnrichmentApi.getList(
        params,
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

  const handleViewJobDetails = async (jobId: string) => {
    console.log('Exporter viewing job details:', jobId);
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

  const handlePublishSuccess = () => {
    fetchDeJobs(page); // Refresh the list after successful publish
  };

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
          <div className="mb-4 flex justify-end">
            <Tooltip title="View Endpoint Last Runs" arrow placement="top">
              <div>
                <EndpointHistoryButton />
              </div>
            </Tooltip>
          </div>
        </div>

        {/* DE Jobs Table */}
        {/* <PublisherDEJobList
          jobs={jobs}
          isLoading={jobsLoading}
          onViewDetails={handleViewDetails}
          onRefresh={() => fetchDeJobs(page)}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          itemsPerPage={itemsPerPage}
          searchingFilters={searchingFilters}
          setSearchingFilters={setSearchingFilters}
          error={error}
          loading={loading}
        /> */}

        {/* DE Jobs Table */}
        <JobList
          jobs={jobs}
          isLoading={jobsLoading}
          onRefresh={async () => { await fetchDeJobs(page); }}
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

      {/* DE Job Details Modal */}
      {/* <PublisherDEJobDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        job={selectedJob}
        onPublishSuccess={handlePublishSuccess}
      /> */}

      {/* Modal for viewing job details */}
      <JobDetailsModal
        isOpen={showJobDetails}
        onClose={handleCloseJobDetails}
        job={selectedJob}
        isLoading={jobDetailsLoading}
        // onExport={handleExportJob}
      />
    </div>
  );
};

export default PublisherDEJobsPage;
