import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '../../../shared/components/Button';
import { ChevronLeft, Plus, Database } from 'lucide-react';

import JobList from '../components/JobList';
import JobDetailsModal from '../components/JobDetailsModal';
import { DataEnrichmentFormModal } from '../components/DataEnrichmentFormModal';
import { dataEnrichmentApi } from '../handlers/index';
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
} from '../../../utils/common/roleUtils';
import { UI_CONFIG } from '../../../shared/config/app.config';
import { getUserFriendlyErrorMessage } from '../../../shared/utils/errorUtils';
import { DataEnrichmentEditModal } from '../components/DataEnrichmentEditModal';
import { useNavigate } from 'react-router';

const DataEnrichmentModule: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();

  const [uiState, setUiState] = useState({
    showJobForm: false,
    showJobDetails: false,
    jobDetailsEditMode: false,
    showCloneModal: false,
  });

  const [jobState, setJobState] = useState<{
    selectedJob: DataEnrichmentJobResponse | null;
    jobToClone: DataEnrichmentJobResponse | null;
    editJob: DataEnrichmentJobResponse | null;
  }>({
    selectedJob: null,
    jobToClone: null,
    editJob: null,
  });

  const [paginationState, setPaginationState] = useState({
    page: 1,
    totalPages: 0,
    totalRecords: 0,
    currentPage: 1,
  });

  const [filterState, setFilterState] = useState<{
    statusFilter: JobStatus | 'ALL';
    typeFilter: 'push' | 'pull' | 'ALL';
    searchQuery: string;
    searchingFilters: Record<string, any>;
  }>({
    statusFilter: 'ALL',
    typeFilter: 'ALL',
    searchQuery: '',
    searchingFilters: {},
  });

  const [loadingState, setLoadingState] = useState({
    jobsLoading: false,
    jobDetailsLoading: false,
    loading: true,
  });

  const [dataState, setDataState] = useState<{
    jobs: DataEnrichmentJobResponse[];
    error: string | null;
  }>({
    jobs: [],
    error: null,
  });

  const [itemsPerPage] = useState(UI_CONFIG.pagination.defaultPageSize);

  const userRoles = useMemo(() => ({
    isEditor: user?.claims ? isEditor(user.claims) : false,
    isApprover: user?.claims ? isApprover(user.claims) : false,
    isExporter: user?.claims ? isExporter(user.claims) : false,
    isPublisher: user?.claims ? isPublisher(user.claims) : false,
    primaryRole: getPrimaryRole(user?.claims as string[]),
  }), [user?.claims]);

  const { isEditor: userIsEditor, isApprover: userIsApprover, primaryRole: userRole } = userRoles;

  const fetchDeJobs = useCallback(async (pageNumber: number = 1): Promise<void> => {
    try {
      setLoadingState(prev => ({ ...prev, loading: true }));
      setDataState(prev => ({ ...prev, error: null }));

      const limit: number = itemsPerPage;
      const offset: number = pageNumber - 1;

      const params = { limit, offset, userRole: userRole as string };

      const response = await dataEnrichmentApi.getAllJobs(
        params,
        filterState.searchingFilters,
      );

      setDataState(prev => ({ ...prev, jobs: response.jobs }));
      setPaginationState(prev => ({
        ...prev,
        totalPages: response.pages,
        totalRecords: response.total,
      }));
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch configurations';
      setDataState(prev => ({ ...prev, error: errorMessage }));
    } finally {
      setLoadingState(prev => ({ ...prev, loading: false }));
    }
  }, [itemsPerPage, userRole, filterState.searchingFilters]);

  const fetchDeJobsWithScrollPreservation = useCallback((pageNumber: number = 1) => {
    const scrollPosition = window.scrollY;
    fetchDeJobs(pageNumber)
      .then(() => {
        setTimeout(() => {
          // Only restore scroll if it's a reasonable position
          if (
            scrollPosition > 0 &&
            scrollPosition < document.body.scrollHeight
          ) {
            window.scrollTo(0, scrollPosition);
          }
        }, 100);
      })
      .catch((error) => {
        // If there's an error, still try to restore scroll position
        console.warn('Error during fetchDeJobs, but preserving scroll:', error);
        setTimeout(() => {
          if (
            scrollPosition > 0 &&
            scrollPosition < document.body.scrollHeight
          ) {
            window.scrollTo(0, scrollPosition);
          }
        }, 100);
      });
  }, [fetchDeJobs]);

  useEffect(() => {
    fetchDeJobs(paginationState.page);
  }, [paginationState.page, filterState.searchingFilters, fetchDeJobs]);

  const handleCreateJob = useCallback(async (jobResponse: any) => {
    try {
      console.log('Job created successfully:', jobResponse);
      // The DataEnrichmentFormModal already shows its own success message
      // We just need to refresh the jobs list with scroll preservation
      fetchDeJobsWithScrollPreservation();

      // Show success message from backend if available
      const backendMessage = jobResponse?.message;
      const jobName = jobResponse?.endpoint_name || 'New endpoint';
      const successMessage = backendMessage || `${jobName} has been saved successfully! You can now send it for approval.`;
      showSuccess(successMessage);
    } catch (error) {
      console.error('Failed to handle job creation:', error);
      showError('Failed to handle job creation');
    }
  }, [fetchDeJobsWithScrollPreservation, showSuccess, showError]);

  const handleViewJobDetails = useCallback(
    async (jobId: string) => {
      try {
        setLoadingState(prev => ({ ...prev, jobDetailsLoading: true }));
        setUiState(prev => ({ ...prev, showJobDetails: true }));

        // Find the job in the current list to determine its type
        const job = dataState.jobs.find((j) => j.id === jobId);
        // Backend expects lowercase 'push' or 'pull' matching ConfigType enum
        const jobType = job?.type?.toUpperCase() as 'PULL' | 'PUSH' | undefined;

        // Fetch job details from the API
        const jobDetails = await dataEnrichmentApi.getJob(jobId, jobType);
        console.log('jobDetails', jobDetails);
        setJobState(prev => ({ ...prev, selectedJob: jobDetails }));
      } catch (error) {
        console.error('Failed to load job details:', error);
        showError('Failed to load job details');
      } finally {
        setLoadingState(prev => ({ ...prev, jobDetailsLoading: false }));
      }
    },
    [dataState.jobs, showError],
  );

  const handleSaveJobChanges = useCallback(async (
    updatedJob: Partial<DataEnrichmentJobResponse>,
  ) => {
    if (!jobState.selectedJob) return;

    try {
      const jobType = (updatedJob.type || jobState.selectedJob.type)?.toLowerCase() as
        | 'pull'
        | 'push';
      console.log('Final job type for API:', jobType);

      const typeChanged =
        updatedJob.type && updatedJob.type !== jobState.selectedJob.type;
      console.log(
        'Job type changed?',
        typeChanged,
        'from',
        jobState.selectedJob.type,
        'to',
        updatedJob.type,
      );

      if (typeChanged) {
        console.warn(
          '⚠️ Job type change detected. This may require creating a new job instead of updating.',
        );
        showError(
          'Changing job type is not supported. Please create a new job instead.',
        );
        return;
      }

      let response;
      if (jobType === 'push') {
        const originalTableName = jobState.selectedJob.table_name || '';
        const versionSuffix = `_v${Date.now()}`;
        const newTableName = updatedJob.table_name
          ? updatedJob.table_name 
          : `${originalTableName}${versionSuffix}`;

        const pushData: CreatePushJobDto = {
          endpoint_name:
            updatedJob.endpoint_name || jobState.selectedJob.endpoint_name || '',
          description: updatedJob.description || jobState.selectedJob.description,
          version: updatedJob.version || jobState.selectedJob.version || 'v1',
          path: updatedJob.path || jobState.selectedJob.path || '',
          table_name: newTableName,
          mode: (updatedJob.mode || jobState.selectedJob.mode || 'append') as
            | 'append'
            | 'replace',
        };

        response = await dataEnrichmentApi.createPushJob(pushData);
      } else {
        const sourceType = (
          updatedJob.source_type ||
          jobState.selectedJob.source_type ||
          'HTTP'
        ).toUpperCase() as 'HTTP' | 'SFTP';

        let connection;
        if (sourceType === 'HTTP') {
          connection = {
            url:
              (updatedJob.connection as any)?.url ||
              (jobState.selectedJob.connection as any)?.url ||
              '',
            headers:
              (updatedJob.connection as any)?.headers ||
              (jobState.selectedJob.connection as any)?.headers ||
              {},
          };
        } else {
          // SFTP
          connection = {
            host:
              (updatedJob.connection as any)?.host ||
              (jobState.selectedJob.connection as any)?.host ||
              '',
            port:
              (updatedJob.connection as any)?.port ||
              (jobState.selectedJob.connection as any)?.port ||
              22,
            auth_type:
              (updatedJob.connection as any)?.auth_type ||
              (jobState.selectedJob.connection as any)?.auth_type ||
              'USERNAME_PASSWORD',
            user_name:
              (updatedJob.connection as any)?.user_name ||
              (jobState.selectedJob.connection as any)?.user_name ||
              '',
            password:
              (updatedJob.connection as any)?.password ||
              (jobState.selectedJob.connection as any)?.password,
            private_key:
              (updatedJob.connection as any)?.private_key ||
              (jobState.selectedJob.connection as any)?.private_key,
          };
        }

        const originalTableName = jobState.selectedJob.table_name || '';
        const versionSuffix = `_v${Date.now()}`;
        const newTableName = updatedJob.table_name
          ? updatedJob.table_name // If user changed it, use their value
          : `${originalTableName}${versionSuffix}`; // Otherwise, create versioned name

        const pullData: CreatePullJobDto = {
          // id: selectedJob.id, // Remove ID - we're creating new jobs, not updating
          endpoint_name:
            updatedJob.endpoint_name || jobState.selectedJob.endpoint_name || '',
          description: updatedJob.description || jobState.selectedJob.description || '',
          version: updatedJob.version || jobState.selectedJob.version || 'v1',
          source_type: sourceType,
          table_name: newTableName,
          mode: (updatedJob.mode || jobState.selectedJob.mode || 'append') as
            | 'append'
            | 'replace',
          connection: connection,
          schedule_id: updatedJob.schedule_id || jobState.selectedJob.schedule_id || '',
          // Only include file for SFTP connections
          ...(sourceType === 'SFTP' && {
            file: updatedJob.file ||
              jobState.selectedJob.file || {
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

      // Refresh the jobs list with scroll preservation
      fetchDeJobsWithScrollPreservation();
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
  }, [jobState.selectedJob, showError, showSuccess, fetchDeJobsWithScrollPreservation]);

  const handleSendForApproval = useCallback(async (
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

      // Refresh the jobs list with scroll preservation
      fetchDeJobsWithScrollPreservation();

      // Close the modal
      handleCloseJobDetails();
    } catch (error) {
      console.error('Failed to send job for approval:', error);
      showError('Failed to send job for approval. Please try again.');
    }
  }, [showSuccess, showError, fetchDeJobsWithScrollPreservation]);

  const handleCloseJobDetails = useCallback(() => {
    setUiState(prev => ({
      ...prev,
      showJobDetails: false,
      jobDetailsEditMode: false,
    }));
    setJobState(prev => ({ ...prev, selectedJob: null }));
  }, []);

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
        setLoadingState(prev => ({ ...prev, jobDetailsLoading: true }));
        setUiState(prev => ({
          ...prev,
          jobDetailsEditMode: true,
          showJobDetails: true,
        }));

        // Find the job in the current list to determine its type
        const jobType = job?.type?.toUpperCase() as 'PULL' | 'PUSH' | undefined;

        console.log('Job type uppercase for API:', jobType);

        // Fetch job details from the API (same as view, but in edit mode)
        console.log('Calling dataEnrichmentApi.getJob for edit...');
        const jobDetails = await dataEnrichmentApi.getJob(job.id, jobType);
        console.log('Job details received for edit:', jobDetails);
        setJobState(prev => ({ ...prev, selectedJob: jobDetails }));
        console.log('Modal should now open in edit mode');
      } catch (error) {
        console.error('Failed to load job details for edit:', error);
        const userFriendlyMessage = getUserFriendlyErrorMessage(error, 'load');
        showError(userFriendlyMessage);
      } finally {
        setLoadingState(prev => ({ ...prev, jobDetailsLoading: false }));
      }
    },
    [showError],
  );

  const handleCloseEditJob = useCallback(() => {
    setJobState(prev => ({ ...prev, editJob: null }));
    setUiState(prev => ({ ...prev, showJobForm: false }));
  }, []);

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
        {/* Search and Create Button */}
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
          {userIsEditor && (
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => setUiState(prev => ({ ...prev, showJobForm: true }))}
            >
              Create New Enrichment Job
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
                    setFilterState(prev => ({ ...prev, statusFilter: 'STATUS_01_IN_PROGRESS' }));
                    setPaginationState(prev => ({ ...prev, page: 1 }));
                  }}
                >
                  View Pending Jobs
                </Button>
              </div>
            </div>
          </div>
        )}

        <JobList
          jobs={dataState.jobs}
          isLoading={loadingState.jobsLoading}
          onViewLogs={handleViewJobDetails}
          onEdit={handleEditJob}
          onRefresh={() => fetchDeJobsWithScrollPreservation(paginationState.page)}
          page={paginationState.page}
          setPage={(page) => setPaginationState(prev => ({ ...prev, page }))}
          itemsPerPage={itemsPerPage}
          totalPages={paginationState.totalPages}
          totalRecords={paginationState.totalRecords}
          searchingFilters={filterState.searchingFilters}
          setSearchingFilters={(filters: Record<string, any>) => setFilterState(prev => ({ ...prev, searchingFilters: filters }))}
          error={dataState.error}
          loading={loadingState.loading}
        />

        {/* Modal for creating new jobs */}
        {uiState.showJobForm && (
          <DataEnrichmentFormModal
            isOpen={uiState.showJobForm}
            onClose={jobState.editJob ? handleCloseEditJob : () => setUiState(prev => ({ ...prev, showJobForm: false }))}
            onSave={handleCreateJob}
            editMode={!!jobState.editJob}
            jobId={jobState.editJob?.id}
            jobType={
              jobState.editJob?.type?.toLowerCase() as 'pull' | 'push' | undefined
            }
          />
        )}

        {/* Modal for viewing job details */}
        {uiState.showJobDetails && !uiState.jobDetailsEditMode && (
          <JobDetailsModal
            isOpen={uiState.showJobDetails && !uiState.jobDetailsEditMode}
            onClose={handleCloseJobDetails}
            job={jobState.selectedJob}
            isLoading={loadingState.jobDetailsLoading}
            editMode={false}
            onSave={handleSaveJobChanges}
            onSendForApproval={handleSendForApproval}
          />
        )}

        {/* MODAL FOR EDITING JOB DETAILS */}
        {uiState.jobDetailsEditMode && (
          <DataEnrichmentEditModal
            isOpen={uiState.jobDetailsEditMode}
            onClose={handleCloseJobDetails}
            onCloseWithRefresh={() => {
              handleCloseJobDetails();
              fetchDeJobsWithScrollPreservation(paginationState.page);
            }}
            // onSave={handleCreateJob}
            editMode={true}
            selectedJob={jobState.selectedJob}
          />
        )}
      </div>
    </div>
  );
};

export default DataEnrichmentModule;
