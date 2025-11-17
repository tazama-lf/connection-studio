import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '../../../shared/components/Button';
import { Plus } from 'lucide-react';

// New job management components
import JobList from '../components/JobList';
import JobDetailsModal from '../components/JobDetailsModal';
import { DataEnrichmentFormModal } from '../components/DataEnrichmentFormModal';
// CloneJobModal removed - now using JobDetailsModal in clone mode
import { dataEnrichmentApi } from '../services/dataEnrichmentApi';
import type {
  DataEnrichmentJobResponse,
  JobStatus,
  CreatePushJobDto,
  CreatePullJobDto,
} from '../types';
import { useToast } from '../../../shared/providers/ToastProvider';
import { useAuth } from '../../auth/contexts/AuthContext';
import {
  isEditor,
  isApprover,
  isExporter,
  isPublisher,
  getPrimaryRole,
} from '../../../utils/roleUtils';
import { UI_CONFIG } from '../../../shared/config/app.config';
import { getUserFriendlyErrorMessage } from '../../../shared/utils/errorUtils';

const DataEnrichmentModule: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();

  // User role detection
  const userIsEditor = user?.claims ? isEditor(user.claims) : false;
  const userIsApprover = user?.claims ? isApprover(user.claims) : false;
  const userIsExporter = user?.claims ? isExporter(user.claims) : false;
  const userIsPublisher = user?.claims ? isPublisher(user.claims) : false;

  const userRole = getPrimaryRole(user?.claims as string[]);

  // Job management state
  const [jobs, setJobs] = useState<DataEnrichmentJobResponse[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(UI_CONFIG.pagination.defaultPageSize);
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'push' | 'pull' | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Job details modal state
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [selectedJob, setSelectedJob] =
    useState<DataEnrichmentJobResponse | null>(null);
  const [jobDetailsLoading, setJobDetailsLoading] = useState(false);
  const [jobDetailsEditMode, setJobDetailsEditMode] = useState(false);

  // Edit job state - keep for backwards compatibility but use JobDetailsModal instead
  const [editJob, setEditJob] = useState<DataEnrichmentJobResponse | null>(
    null,
  );

  // Clone job state - now using JobDetailsModal in clone mode
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [jobToClone, setJobToClone] =
    useState<DataEnrichmentJobResponse | null>(null);

  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [searchingFilters, setSearchingFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleCreateJob = async (jobResponse: any) => {
    try {
      console.log('Job created successfully:', jobResponse);
      // The DataEnrichmentFormModal already shows its own success message
      // We just need to refresh the jobs list
      fetchDeJobs();

      // Show success message
      const jobName = jobResponse?.endpoint_name || 'New endpoint';
      showSuccess(
        `${jobName} has been saved successfully! You can now send it for approval.`,
      );
    } catch (error) {
      console.error('Failed to handle job creation:', error);
      showError('Failed to handle job creation');
    }
  };

  const handleViewJobDetails = useCallback(
    async (jobId: string) => {
      try {
        setJobDetailsLoading(true);
        setShowJobDetails(true);

        // Find the job in the current list to determine its type
        const job = jobs.find((j) => j.id === jobId);
        // Backend expects lowercase 'push' or 'pull' matching ConfigType enum
        const jobType = job?.type?.toUpperCase() as 'PULL' | 'PUSH' | undefined;

        // Fetch job details from the API
        const jobDetails = await dataEnrichmentApi.getJob(jobId, jobType);
        console.log('jobDetails', jobDetails);
        setSelectedJob(jobDetails);
      } catch (error) {
        console.error('Failed to load job details:', error);
        showError('Failed to load job details');
      } finally {
        setJobDetailsLoading(false);
      }
    },
    [jobs, showError],
  ); // Removed userIsApprover and userIsEditor from deps - they're just for logging

  const handleSaveJobChanges = async (
    updatedJob: Partial<DataEnrichmentJobResponse>,
  ) => {
    if (!selectedJob) return;

    try {
      console.log('=== SAVE JOB CHANGES DEBUG ===');
      console.log('Original job:', selectedJob);
      console.log('Updated job data:', updatedJob);

      // Determine job type for API call (use updated type if changed, otherwise original)
      const jobType = (updatedJob.type || selectedJob.type)?.toLowerCase() as
        | 'pull'
        | 'push';
      console.log('Final job type for API:', jobType);

      // Check if job type changed
      const typeChanged =
        updatedJob.type && updatedJob.type !== selectedJob.type;
      console.log(
        'Job type changed?',
        typeChanged,
        'from',
        selectedJob.type,
        'to',
        updatedJob.type,
      );

      if (typeChanged) {
        console.warn(
          '⚠️ Job type change detected. This may require creating a new job instead of updating.',
        );
        // For now, we'll prevent type changes since backend might not support it
        showError(
          'Changing job type is not supported. Please create a new job instead.',
        );
        return;
      }

      // Use the create API methods to create new jobs (editing creates new versions)
      let response;
      if (jobType === 'push') {
        // Generate a unique table name for the new version by appending timestamp
        const originalTableName = selectedJob.table_name || '';
        const versionSuffix = `_v${Date.now()}`;
        const newTableName = updatedJob.table_name
          ? updatedJob.table_name // If user changed it, use their value
          : `${originalTableName}${versionSuffix}`; // Otherwise, create versioned name

        // Build push job data - explicitly only include fields needed for PUSH jobs
        const pushData: CreatePushJobDto = {
          endpoint_name:
            updatedJob.endpoint_name || selectedJob.endpoint_name || '',
          description: updatedJob.description || selectedJob.description,
          version: updatedJob.version || selectedJob.version || 'v1',
          path: updatedJob.path || selectedJob.path || '',
          table_name: newTableName,
          mode: (updatedJob.mode || selectedJob.mode || 'append') as
            | 'append'
            | 'replace',
        };

        console.log(
          'Push data to send (creating new job with versioned table):',
          pushData,
        );
        console.log('Excluded fields from updatedJob:', {
          schedule_id: updatedJob.schedule_id,
          source_type: updatedJob.source_type,
          connection: updatedJob.connection,
        });
        response = await dataEnrichmentApi.createPushJob(pushData);
      } else {
        // Determine source type - ensure it's uppercase to match backend enum
        const sourceType = (
          updatedJob.source_type ||
          selectedJob.source_type ||
          'HTTP'
        ).toUpperCase() as 'HTTP' | 'SFTP';

        // Build connection object based on source type
        let connection;
        if (sourceType === 'HTTP') {
          connection = {
            url:
              (updatedJob.connection as any)?.url ||
              (selectedJob.connection as any)?.url ||
              '',
            headers:
              (updatedJob.connection as any)?.headers ||
              (selectedJob.connection as any)?.headers ||
              {},
          };
        } else {
          // SFTP
          connection = {
            host:
              (updatedJob.connection as any)?.host ||
              (selectedJob.connection as any)?.host ||
              '',
            port:
              (updatedJob.connection as any)?.port ||
              (selectedJob.connection as any)?.port ||
              22,
            auth_type:
              (updatedJob.connection as any)?.auth_type ||
              (selectedJob.connection as any)?.auth_type ||
              'USERNAME_PASSWORD',
            user_name:
              (updatedJob.connection as any)?.user_name ||
              (selectedJob.connection as any)?.user_name ||
              '',
            password:
              (updatedJob.connection as any)?.password ||
              (selectedJob.connection as any)?.password,
            private_key:
              (updatedJob.connection as any)?.private_key ||
              (selectedJob.connection as any)?.private_key,
          };
        }

        // Generate a unique table name for the new version by appending timestamp
        const originalTableName = selectedJob.table_name || '';
        const versionSuffix = `_v${Date.now()}`;
        const newTableName = updatedJob.table_name
          ? updatedJob.table_name // If user changed it, use their value
          : `${originalTableName}${versionSuffix}`; // Otherwise, create versioned name

        const pullData: CreatePullJobDto = {
          // id: selectedJob.id, // Remove ID - we're creating new jobs, not updating
          endpoint_name:
            updatedJob.endpoint_name || selectedJob.endpoint_name || '',
          description: updatedJob.description || selectedJob.description || '',
          version: updatedJob.version || selectedJob.version || 'v1',
          source_type: sourceType,
          table_name: newTableName,
          mode: (updatedJob.mode || selectedJob.mode || 'append') as
            | 'append'
            | 'replace',
          connection: connection,
          schedule_id: updatedJob.schedule_id || selectedJob.schedule_id || '',
          // Only include file for SFTP connections
          ...(sourceType === 'SFTP' && {
            file: updatedJob.file ||
              selectedJob.file || {
                path: '',
                file_type: 'CSV' as const,
                delimiter: ',',
              },
          }),
        };

        console.log(
          'Pull data to send (creating new job with versioned table):',
          pullData,
        );
        response = await dataEnrichmentApi.createPullJob(pullData);
      }

      console.log('Job creation response:', response);
      showSuccess('New job version created successfully!');

      // Refresh the jobs list
      fetchDeJobs();
    } catch (error) {
      console.error('=== SAVE JOB ERROR ===');
      console.error('Error type:', error?.constructor?.name);
      console.error(
        'Error message:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      console.error('Full error object:', error);

      // Check for specific schedule status error
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('not found or is not approved yet')) {
        showError(
          'Cannot edit this job: The associated schedule has been deployed and cannot be used for creating new job versions. The backend requires schedules to be in "approved" status for new jobs.',
        );
        throw error;
      }

      // Show user-friendly error message
      const userFriendlyMessage = getUserFriendlyErrorMessage(error, 'save');
      showError(userFriendlyMessage);

      throw error; // Re-throw to let modal handle the error state
    }
  };

  const handleSendForApproval = async (
    jobId: string,
    jobType: 'PULL' | 'PUSH',
  ) => {
    try {
      console.log('Sending job for approval:', jobId, jobType);
      await dataEnrichmentApi.updateJobStatus(
        jobId,
        'STATUS_03_UNDER_REVIEW',
        jobType,
      );
      showSuccess('Job sent for approval successfully!');

      // Refresh the jobs list
      fetchDeJobs();

      // Close the modal
      handleCloseJobDetails();
    } catch (error) {
      console.error('Failed to send job for approval:', error);
      showError('Failed to send job for approval. Please try again.');
    }
  };

  const handleCloseJobDetails = () => {
    setShowJobDetails(false);
    setSelectedJob(null);
    setJobDetailsEditMode(false);
  };

  const handleEditJob = useCallback(
    async (job: DataEnrichmentJobResponse) => {
      // Prevent editing approved jobs
      const jobStatus = job.status || 'STATUS_01_IN_PROGRESS';
      if (jobStatus === 'STATUS_04_APPROVED') {
        console.warn('Attempted to edit approved job - blocking action');
        showError(
          'Approved jobs cannot be edited. Please create a new job instead.',
        );
        return;
      }

      // Only allow editing pending or rejected jobs
      if (
        jobStatus !== 'STATUS_01_IN_PROGRESS' &&
        jobStatus !== 'STATUS_05_REJECTED'
      ) {
        console.warn(
          `Attempted to edit job with status: ${jobStatus} - blocking action`,
        );
        showError(`Jobs with status "${jobStatus}" cannot be edited.`);
        return;
      }

      try {
        setJobDetailsLoading(true);
        setJobDetailsEditMode(true);
        setShowJobDetails(true);

        // Find the job in the current list to determine its type
        const jobType = job?.type?.toUpperCase() as 'PULL' | 'PUSH' | undefined;

        console.log('Job type uppercase for API:', jobType);

        // Fetch job details from the API (same as view, but in edit mode)
        console.log('Calling dataEnrichmentApi.getJob for edit...');
        const jobDetails = await dataEnrichmentApi.getJob(job.id, jobType);
        console.log('Job details received for edit:', jobDetails);
        setSelectedJob(jobDetails);
        console.log('Modal should now open in edit mode');
      } catch (error) {
        console.error('Failed to load job details for edit:', error);
        const userFriendlyMessage = getUserFriendlyErrorMessage(error, 'load');
        showError(userFriendlyMessage);
      } finally {
        setJobDetailsLoading(false);
      }
    },
    [showError],
  );

  const handleCloseEditJob = () => {
    setEditJob(null);
    setShowJobForm(false);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Create Button */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search endpoints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          {userIsEditor && (
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => setShowJobForm(true)}
            >
              New Data Enrichment Job
            </Button>
          )}
        </div>

        {/* Approver Section - Only for Approvers */}
        {userIsApprover && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-blue-900">
                    Approver Dashboard
                  </h3>
                  <p className="text-sm text-blue-700">
                    Review and approve pending data enrichment jobs
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                  {/* {
                    filteredJobs.filter((job) => job.status === 'in-progress')
                      .length
                  }{' '} */}
                  pending approvals
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('STATUS_01_IN_PROGRESS');
                    setCurrentPage(1);
                  }}
                >
                  View Pending Jobs
                </Button>
              </div>
            </div>
          </div>
        )}

        <JobList
          jobs={jobs}
          isLoading={jobsLoading}
          onViewLogs={handleViewJobDetails}
          onEdit={handleEditJob}
          onRefresh={fetchDeJobs}
          page={page}
          setPage={setPage}
          itemsPerPage={itemsPerPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          searchingFilters={searchingFilters}
          setSearchingFilters={setSearchingFilters}
          error={error}
          loading={loading}
        />

        {/* Modal for creating new jobs */}
        {showJobForm && (
          <DataEnrichmentFormModal
            isOpen={showJobForm}
            onClose={editJob ? handleCloseEditJob : () => setShowJobForm(false)}
            onSave={handleCreateJob}
            editMode={!!editJob}
            jobId={editJob?.id}
            jobType={
              editJob?.type?.toLowerCase() as 'pull' | 'push' | undefined
            }
          />
        )}

        {/* Modal for viewing job details */}
        <JobDetailsModal
          isOpen={showJobDetails}
          onClose={handleCloseJobDetails}
          job={selectedJob}
          isLoading={jobDetailsLoading}
          editMode={jobDetailsEditMode}
          onSave={handleSaveJobChanges}
          onSendForApproval={handleSendForApproval}
        />
      </div>
    </div>
  );
};

export default DataEnrichmentModule;
