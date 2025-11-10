import { useAuth } from '@features/auth/contexts/AuthContext';
import { AuthHeader } from '@shared/components/AuthHeader';
import { Button } from '@shared/components/Button';
import { DataEnrichmentFormModal } from '@shared/components/DataEnrichmentFormModal';
import { UI_CONFIG } from '@shared/config/app.config';
import { useToast } from '@shared/providers/ToastProvider';
import { getUserFriendlyErrorMessage } from '@shared/utils/errorUtils';
import {
  isApprover,
  isEditor,
  isExporter,
  isPublisher,
} from '@utils/roleUtils';
import { Plus } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import JobDetailsModal from '../components/JobDetailsModal';
import JobList from '../components/JobList';
import { dataEnrichmentApi } from '../services/dataEnrichmentApi';
import type {
  CreatePullJobDto,
  CreatePushJobDto,
  DataEnrichmentJobResponse,
  JobStatus,
} from '../types';

const DataEnrichmentModule: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [jobs, setJobs] = useState<DataEnrichmentJobResponse[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(UI_CONFIG.pagination.defaultPageSize);
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'push' | 'pull' | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [selectedJob, setSelectedJob] =
    useState<DataEnrichmentJobResponse | null>(null);
  const [jobDetailsLoading, setJobDetailsLoading] = useState(false);
  const [jobDetailsEditMode, setJobDetailsEditMode] = useState(false);
  const [editJob, setEditJob] = useState<DataEnrichmentJobResponse | null>(
    null,
  );
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [jobToClone, setJobToClone] =
    useState<DataEnrichmentJobResponse | null>(null);

  // User role detection
  const userIsEditor = user?.claims ? isEditor(user.claims) : false;
  const userIsApprover = user?.claims ? isApprover(user.claims) : false;
  const userIsExporter = user?.claims ? isExporter(user.claims) : false;
  const userIsPublisher = user?.claims ? isPublisher(user.claims) : false;

  // Load jobs on component mount only (no pagination dependency since we fetch all)
  useEffect(() => {
    loadJobs();
  }, []);

  // Reset to first page when search query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      setCurrentPage(1);
    }
  }, [searchQuery]);

  const loadJobs = async () => {
    console.log('=== LOAD JOBS DEBUG START ===');
    console.log('Time:', new Date().toISOString());
    console.log('loadJobs called - fetching ALL jobs for frontend filtering');
    console.log(
      '  - API Base URL:',
      import.meta.env.VITE_API_BASE_URL || 'Not set',
    );

    setJobsLoading(true);
    console.log('Loading state set to TRUE');

    try {
      let response;
      console.log('Starting API call...');

      // Fetch ALL jobs without pagination for frontend filtering
      console.log('Fetching ALL jobs from API...');
      console.log('API endpoint: /job/all');
      response = await dataEnrichmentApi.getAllJobs(); // Remove pagination parameters

      console.log('=== API RESPONSE RECEIVED ===');
      console.log('Response type:', typeof response);
      console.log('Response is null?:', response === null);
      console.log('Response is undefined?:', response === undefined);
      console.log('Full response object:', JSON.stringify(response, null, 2));

      if (response) {
        console.log('Response properties:');
        console.log('  - response.jobs:', response.jobs);
        console.log('  - response.jobs type:', typeof response.jobs);
        console.log(
          '  - response.jobs is Array?:',
          Array.isArray(response.jobs),
        );
        console.log(
          '  - response.jobs length:',
          response.jobs?.length || 'N/A',
        );
        console.log('  - response.total:', response.total);
        console.log('  - response.page:', response.page);
        console.log('  - response.limit:', response.limit);
        console.log('  - response.totalPages:', response.totalPages);

        if (response.jobs && response.jobs.length > 0) {
          console.log(
            'First job sample:',
            JSON.stringify(response.jobs[0], null, 2),
          );
        }
      }

      console.log('=== SETTING STATE ===');
      const jobsArray = response?.jobs || [];

      console.log(
        'Setting jobs to state:',
        jobsArray.length,
        'jobs (ALL jobs for frontend filtering)',
      );

      // TEMPORARY: Add mock data if API returns empty
      if (jobsArray.length === 0) {
        console.warn(
          '⚠️ API returned empty array. Check if backend has any jobs in database.',
        );
        console.warn('💡 TIP: Create a job using "Define New Endpoint" button');
        console.warn(
          '💡 TIP: Or check backend logs to see if the API endpoint is working',
        );
      }

      // Sort jobs by created_at descending (newest first)
      const sortedJobs = jobsArray.sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
        const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
        return dateB - dateA; // Descending order (newest first)
      });

      setJobs(sortedJobs);
      // Note: totalItems will be calculated from filtered results in pagination logic

      console.log('=== STATE SET COMPLETE ===');
      console.log(
        'Jobs array now contains:',
        jobsArray.length,
        'items (all jobs)',
      );

      console.log(
        '✅ Jobs loaded successfully for frontend filtering and pagination',
      );
    } catch (error) {
      console.error('=== ERROR LOADING JOBS ===');
      console.error('Error type:', error?.constructor?.name);
      console.error(
        'Error message:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      console.error(
        'Error stack:',
        error instanceof Error ? error.stack : 'No stack trace',
      );
      console.error('Full error object:', error);

      // Set empty state on error
      console.log('Setting empty state due to error');
      setJobs([]);

      // Show user-friendly error message
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn(
          '❌ Cannot connect to backend service. Check if backend is running.',
        );
        showError(
          'Cannot connect to the data enrichment service. Please ensure the backend is running.',
        );
      } else {
        const userFriendlyMessage = getUserFriendlyErrorMessage(error, 'load');
        showError(userFriendlyMessage);
      }
    } finally {
      setJobsLoading(false);
      console.log('Loading state set to FALSE');
      console.log('=== LOAD JOBS COMPLETE ===\n');
    }
  };

  const handleCreateJob = async (jobResponse: any) => {
    try {
      console.log('Job created successfully:', jobResponse);
      // The DataEnrichmentFormModal already shows its own success message
      // We just need to refresh the jobs list
      await loadJobs();

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
      console.log('=== VIEW JOB DETAILS DEBUG ===');
      console.log('handleViewJobDetails called with jobId:', jobId);
      console.log('User is approver:', userIsApprover);
      console.log('User is editor:', userIsEditor);

      try {
        setJobDetailsLoading(true);
        setShowJobDetails(true);
        console.log(
          'Modal state set - showJobDetails:',
          true,
          'loading:',
          true,
        );

        // Find the job in the current list to determine its type
        const job = jobs.find((j) => j.id === jobId);
        // Backend expects lowercase 'push' or 'pull' matching ConfigType enum
        const jobType = job?.type?.toUpperCase() as 'PULL' | 'PUSH' | undefined;

        console.log('Job found in list:', job);
        console.log('Job type from list:', job?.type);
        console.log('Job type uppercase for API:', jobType);

        // Fetch job details from the API
        console.log('Calling dataEnrichmentApi.getJob...');
        const jobDetails = await dataEnrichmentApi.getJob(jobId, jobType);
        console.log('Job details received:', jobDetails);
        setSelectedJob(jobDetails);
        console.log('Selected job set in state');
      } catch (error) {
        console.error('Failed to load job details:', error);
        showError('Failed to load job details');
      } finally {
        setJobDetailsLoading(false);
        console.log('Loading state set to false');
        console.log('=== VIEW JOB DETAILS DEBUG END ===');
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
      await loadJobs();
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
      await dataEnrichmentApi.updateJobStatus(jobId, 'under-review', jobType);
      showSuccess('Job sent for approval successfully!');

      // Refresh the jobs list
      await loadJobs();

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
      console.log('handleEditJob called with:', job);
      console.log('Job type:', job.type);
      console.log('Job ID:', job.id);
      console.log('Job status:', job.status);

      // Prevent editing approved jobs
      const jobStatus = job.status || 'in-progress';
      if (jobStatus === 'approved') {
        console.warn('Attempted to edit approved job - blocking action');
        showError(
          'Approved jobs cannot be edited. Please create a new job instead.',
        );
        return;
      }

      // Only allow editing pending or rejected jobs
      if (jobStatus !== 'in-progress' && jobStatus !== 'rejected') {
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

  const handleCloneJob = useCallback(async (job: DataEnrichmentJobResponse) => {
    console.log('🚀 handleCloneJob called - fetching complete job details...');

    try {
      // Fetch complete pull job details with all connection information
      const fullJobDetails = await dataEnrichmentApi.getJob(job.id, 'PULL');

      console.log('🚀 Complete job details fetched:', fullJobDetails);

      // Set the complete job data and open modal
      setJobToClone(fullJobDetails);
      setShowCloneModal(true);
    } catch (error) {
      console.error('Failed to fetch complete job details for clone:', error);
      showError('Failed to load job details for cloning');
    }
  }, []);

  const handleCloneSuccess = useCallback(() => {
    console.log('Clone operation successful, refreshing jobs...');
    setShowCloneModal(false);
    setJobToClone(null);
    loadJobs(); // Refresh the job list
  }, [loadJobs]);

  const handleActualClone = useCallback(
    async (job: DataEnrichmentJobResponse) => {
      try {
        console.log('� Cloning pull job:', job.endpoint_name);
        console.log('🚀 Job data:', job);

        // Validate required data
        if (!job.connection) {
          showError('Cannot clone job: Missing connection information');
          return;
        }

        if (!job.source_type) {
          showError('Cannot clone job: Missing source type information');
          return;
        }

        // Use existing schedule_id or find/create one
        let scheduleId = job.schedule_id;
        if (!scheduleId) {
          const schedules = await dataEnrichmentApi.getAllSchedules();
          const approvedSchedules = schedules.filter(
            (schedule: any) =>
              schedule.status === 'approved' ||
              schedule.status === 'exported' ||
              schedule.status === 'deployed',
          );

          if (approvedSchedules.length > 0) {
            scheduleId = approvedSchedules[0].id;
          } else {
            const defaultSchedule = await dataEnrichmentApi.createSchedule({
              name: `Schedule for ${job.endpoint_name}`,
              cron: '0 */6 * * *',
              iterations: -1,
            });
            if (defaultSchedule.success) {
              const createdSchedules =
                await dataEnrichmentApi.getAllSchedules();
              const newSchedule = createdSchedules.find((s: any) =>
                s.name.includes(job.endpoint_name),
              );
              scheduleId = newSchedule?.id;
            }
          }
        }

        if (!scheduleId) {
          showError('Could not find or create a schedule for the cloned job');
          return;
        }

        // Create the pull job with user-modified endpoint_name and version
        const pullJobData = {
          endpoint_name: job.endpoint_name, // This now comes from the modal with user modifications
          version: job.version, // This now comes from the modal with user modifications
          schedule_id: scheduleId,
          source_type: job.source_type as 'HTTP' | 'SFTP',
          description: job.description || '',
          connection: job.connection,
          table_name: job.table_name || '',
          mode: job.mode || ('append' as 'append' | 'replace'),
          ...(job.file && { file: job.file }),
        };

        console.log('🚀 Creating pull job with:', pullJobData);
        await dataEnrichmentApi.createPullJob(pullJobData);

        showSuccess(`Pull job "${job.endpoint_name}" created successfully!`);
        handleCloneSuccess();
      } catch (error) {
        console.error('Clone operation failed:', error);
        showError(
          `Failed to clone job: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    },
    [showSuccess, showError, handleCloneSuccess],
  );

  // Calculate filtered jobs based on all applied filters
  const filteredJobs = useMemo(() => {
    console.log('=== FRONTEND FILTERING DEBUG ===');
    console.log('Total jobs:', jobs.length);
    console.log('Applied filters:', {
      statusFilter,
      typeFilter,
      searchQuery: searchQuery.trim(),
    });

    let filtered = jobs;

    // Role-based filtering: exporters can only see approved, exported and deployed jobs
    if (userIsExporter) {
      console.log(
        'Applying exporter role filter - only showing approved, exported and deployed jobs',
      );
      filtered = filtered.filter((job) => {
        const jobStatus = job.status || 'in-progress';
        const allowedStatuses = ['approved', 'exported', 'deployed'];
        const isAllowed = allowedStatuses.includes(jobStatus);
        console.log(
          `Job ${job.id}: status="${jobStatus}", allowed=${isAllowed}`,
        );
        return isAllowed;
      });
      console.log('After exporter role filter:', filtered.length);
    }

    // Role-based filtering: publishers can only see exported and deployed jobs (exported shown as deployed)
    if (userIsPublisher) {
      console.log(
        'Applying publisher role filter - only showing exported and deployed jobs',
      );
      filtered = filtered.filter((job) => {
        const jobStatus = job.status || 'in-progress';
        const allowedStatuses = ['exported', 'deployed'];
        const isAllowed = allowedStatuses.includes(jobStatus);
        console.log(
          `Job ${job.id}: status="${jobStatus}", allowed=${isAllowed}`,
        );
        return isAllowed;
      });

      // Transform exported status to deployed for publishers
      filtered = filtered.map((job) => ({
        ...job,
        status: job.status === 'exported' ? 'deployed' : job.status,
      }));
      console.log(
        'After publisher role filter and status transformation:',
        filtered.length,
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (job) =>
          job.endpoint_name?.toLowerCase().includes(query) ||
          job.table_name?.toLowerCase().includes(query) ||
          job.description?.toLowerCase().includes(query) ||
          job.type?.toLowerCase().includes(query),
      );
      console.log('After search filter:', filtered.length);
    }

    // Status filter (AND operation)
    if (statusFilter !== 'ALL') {
      const beforeCount = filtered.length;
      filtered = filtered.filter((job) => {
        const jobStatus = job.status || 'in-progress'; // Default to in-progress if no status
        const matches = jobStatus === statusFilter;
        console.log(
          `Job ${job.id}: status="${jobStatus}", filter="${statusFilter}", matches=${matches}`,
        );
        return matches;
      });
      console.log(
        `After status filter (${statusFilter}): ${beforeCount} → ${filtered.length}`,
      );
    }

    // Type filter (AND operation)
    if (typeFilter !== 'ALL') {
      const beforeCount = filtered.length;
      filtered = filtered.filter((job) => {
        const rawJobType = job.type?.toLowerCase();
        const matches = rawJobType === typeFilter;
        return matches;
      });
      console.log(
        `After type filter (${typeFilter}): ${beforeCount} → ${filtered.length}`,
      );
    }

    return filtered;
  }, [
    jobs,
    searchQuery,
    statusFilter,
    typeFilter,
    userIsExporter,
    userIsPublisher,
  ]);

  // Calculate pagination based on filtered results
  const totalItems = filteredJobs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  // Get paginated subset of filtered jobs
  const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthHeader title="Data Enrichment" showBackButton={true} />

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
                  {
                    filteredJobs.filter((job) => job.status === 'in-progress')
                      .length
                  }{' '}
                  pending approvals
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('in-progress');
                    setCurrentPage(1);
                  }}
                >
                  View Pending Jobs
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Jobs Table with Total Count */}
        <div className="flex items-center justify-end mb-4"></div>

        {/* DEBUG: Log handlers before passing to JobList */}
        {(() => {
          console.log('=== DataEnrichmentModule RENDER DEBUG ===');
          console.log('About to render JobList component');
          console.log(
            'User role - Editor:',
            userIsEditor,
            'Approver:',
            userIsApprover,
          );
          console.log('Handler values:');
          console.log(
            '  - handleViewJobDetails:',
            typeof handleViewJobDetails,
            handleViewJobDetails,
          );
          console.log(
            '  - handleEditJob:',
            typeof handleEditJob,
            handleEditJob,
          );
          console.log('  - loadJobs:', typeof loadJobs, loadJobs);
          console.log('Props being passed to JobList:');
          console.log('  - onViewLogs:', typeof handleViewJobDetails);
          console.log('  - onEdit:', typeof handleEditJob);
          console.log('  - onRefresh:', typeof loadJobs);
          console.log('=== END RENDER DEBUG ===');
          return null;
        })()}

        <JobList
          jobs={paginatedJobs}
          isLoading={jobsLoading}
          onViewLogs={handleViewJobDetails}
          onEdit={handleEditJob}
          onClone={handleCloneJob}
          onRefresh={loadJobs}
          statusFilter={statusFilter}
          onStatusFilterChange={(newStatus) => {
            setStatusFilter(newStatus);
            setCurrentPage(1); // Reset to first page when filter changes
          }}
          searchQuery={searchQuery}
          typeFilter={typeFilter}
          onTypeFilterChange={(newType) => {
            setTypeFilter(newType);
            setCurrentPage(1); // Reset to first page when filter changes
          }}
        />

        {/* Pagination */}
        {totalItems > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-white rounded-b-md">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of{' '}
              {totalItems} results
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

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

        {/* Modal for cloning jobs - using JobDetailsModal in clone mode */}
        <JobDetailsModal
          isOpen={showCloneModal}
          onClose={() => {
            setShowCloneModal(false);
            setJobToClone(null);
          }}
          job={jobToClone}
          cloneMode={true}
          onClone={handleActualClone}
        />
      </div>
    </div>
  );
};

export default DataEnrichmentModule;
