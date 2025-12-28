import { buildPushPayload, buildPullPayload } from '../utils';
import type { SaveJobOptions } from '../types';


import { ENV } from '@shared/config/environment.config';
import { getDemsStatusLov } from '@shared/lovs';
import { apiRequest } from '@utils/common/apiHelper';
import type { NavigateFunction } from 'react-router';

import {
  getDataEnrichmentErrorMessage,
  formatJobForEdit,
} from '../utils';
import type {
  CreatePullJobDto,
  CreatePushJobDto,
  UpdatePullJobDto,
  UpdatePushJobDto,
  DataEnrichmentJobResponse,
  ScheduleResponse,
  ScheduleCreateResponse,
  ScheduleRequest,
} from '../types';
import {
  DATA_ENRICHMENT_SUCCESS_MESSAGES,
  DATA_ENRICHMENT_JOB_STATUSES,
} from '../constants';
import { DATA_ENRICHMENT_JOB_STATUSES as STATUS } from '../constants';
import { getJobType } from '../utils';

const { API_BASE_URL } = ENV;

import type { PaginatedJobResponse, PaginationParams } from '../types';

// ============================================================================
// API LAYER
// ============================================================================

export const dataEnrichmentJobApi = {
  // Job CRUD operations
  createPullJob: async (
    data: CreatePullJobDto,
  ): Promise<DataEnrichmentJobResponse> => {
    console.log('Creating pull job with data:', JSON.stringify(data, null, 2));
    return await apiRequest<DataEnrichmentJobResponse>(
      `${API_BASE_URL}/job/create/pull`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
  },

  createPushJob: async (
    data: CreatePushJobDto,
  ): Promise<DataEnrichmentJobResponse> => {
    console.log('Creating push job with data:', JSON.stringify(data, null, 2));
    return await apiRequest<DataEnrichmentJobResponse>(
      `${API_BASE_URL}/job/create/push`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
  },

  getList: async (
    params: PaginationParams,
    searchingFilters?: Record<string, unknown>,
  ): Promise<PaginatedJobResponse> => {
    const url = `${API_BASE_URL}/job/all?${params?.offset !== undefined ? `offset=${params.offset}&` : ''}${params?.limit !== undefined ? `limit=${params.limit}` : ''}`;

    const { status, ...otherFilters } = searchingFilters ?? {};
    let statusFilter;

    if (!status) {
      const userRole = params.userRole as keyof typeof getDemsStatusLov;
      statusFilter =
        getDemsStatusLov[userRole]?.map((item) => item.value)?.join(',') ?? '';
    }

    const requestBody = {
      ...otherFilters,
      status: status ?? statusFilter,
    };

    return await apiRequest<PaginatedJobResponse>(url, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  },

  getById: async (
    id: string,
    type?: 'PULL' | 'PUSH',
  ): Promise<DataEnrichmentJobResponse> => {
    const queryParams = type ? `?type=${type.toLowerCase()}` : '';
    return await apiRequest<DataEnrichmentJobResponse>(
      `${API_BASE_URL}/job/${id}${queryParams}`,
    );
  },

  updatePullJob: async (
    id: string,
    updates: UpdatePullJobDto,
  ): Promise<DataEnrichmentJobResponse> => {
    return await apiRequest<DataEnrichmentJobResponse>(
      `${API_BASE_URL}/job/update/${id}?type=pull`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      },
    );
  },

  updatePushJob: async (
    id: string,
    updates: UpdatePushJobDto,
  ): Promise<DataEnrichmentJobResponse> => {
    return await apiRequest<DataEnrichmentJobResponse>(
      `${API_BASE_URL}/job/update/${id}?type=push`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      },
    );
  },

  updateStatus: async (
    id: string,
    status: string,
    type: 'PULL' | 'PUSH',
    reason?: string,
  ): Promise<{ success: boolean; message: string }> => {
    const queryParams = new URLSearchParams();
    queryParams.append('status', status);
    queryParams.append('type', type.toLowerCase());

    const requestBody: { reason?: string } = {};
    if (reason) {
      requestBody.reason = reason;
    }

    return await apiRequest<{ success: boolean; message: string }>(
      `${API_BASE_URL}/job/update/status/${id}?${queryParams.toString()}`,
      {
        method: 'PATCH',
        body: reason ? JSON.stringify(requestBody) : undefined,
      },
    );
  },

  updatePublishingStatus: async (
    id: string,
    publishingStatus: 'active' | 'in-active',
    type: 'PULL' | 'PUSH',
  ): Promise<{ success: boolean; message: string }> => {
    const url = `${API_BASE_URL}/job/update/activation/${id}?status=${publishingStatus.toLowerCase()}&type=${type.toLowerCase()}`;

    return await apiRequest<{ success: boolean; message: string }>(url, {
      method: 'PATCH',
    });
  },

  deleteJob: async (
    id: string,
    type: 'pull' | 'push',
  ): Promise<{ success: boolean; message: string }> => {
    return await apiRequest<{ success: boolean; message: string }>(
      `${API_BASE_URL}/job/${id}?type=${type.toLowerCase()}`,
      {
        method: 'DELETE',
      },
    );
  },
};

export const scheduleApi = {
  create: async (data: ScheduleRequest): Promise<ScheduleCreateResponse> => {
    return await apiRequest<ScheduleCreateResponse>(
      `${API_BASE_URL}/scheduler/create`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
  },

  getAll: async (offset = 0, limit = 50): Promise<ScheduleResponse[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('offset', offset.toString());
    queryParams.append('limit', limit.toString());

    const scheduler_body = {
      status: `${DATA_ENRICHMENT_JOB_STATUSES.APPROVED},${DATA_ENRICHMENT_JOB_STATUSES.EXPORTED}`,
    };

    return await apiRequest<ScheduleResponse[]>(
      `${API_BASE_URL}/scheduler/all?${queryParams.toString()}`,
      {
        method: 'POST',
        body: JSON.stringify(scheduler_body),
      },
    );
  },

  getById: async (id: string): Promise<ScheduleResponse> => {
    return await apiRequest<ScheduleResponse>(
      `${API_BASE_URL}/scheduler/${id}`,
    );
  },

  update: async (
    id: string,
    updates: Partial<ScheduleRequest>,
  ): Promise<{ success: boolean; message: string }> => {
    return await apiRequest<{ success: boolean; message: string }>(
      `${API_BASE_URL}/scheduler/update/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          name: updates?.name,
          start_date: updates?.start_date,
          iterations: Number(updates?.iterations),
          cron: updates?.cron,
        }),
      },
    );
  },

  updateStatus: async (
    id: string,
    status: string,
    reason?: string,
  ): Promise<{ success: boolean; message: string }> => {
    const queryParams = new URLSearchParams();
    queryParams.append('status', status);

    return await apiRequest<{ success: boolean; message: string }>(
      `${API_BASE_URL}/scheduler/update/status/${id}?${queryParams.toString()}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          reason: reason ?? '',
        }),
      },
    );
  },
};

// ============================================================================
// JOB DETAILS HANDLERS
// ============================================================================

export const handleRejectionConfirm = (
  reason: string,
  job: DataEnrichmentJobResponse | null,
  onReject: ((jobId: string, jobType: 'PULL' | 'PUSH', reason: string) => void) | undefined,
  onClose: () => void
) => {
  if (onReject && job) {
    const jobType = getJobType(job) === 'push' ? 'PUSH' : 'PULL';
    onReject(job.id, jobType, reason);
    onClose();
  }
};

export const handleSendForApprovalConfirm = (
  job: DataEnrichmentJobResponse | null,
  onSendForApproval: ((jobId: string, jobType: 'PULL' | 'PUSH') => void) | undefined,
  onClose: () => void,
  setShowApprovalConfirmDialog: (show: boolean) => void
) => {
  if (onSendForApproval && job) {
    const jobType = getJobType(job) === 'push' ? 'PUSH' : 'PULL';
    onSendForApproval(job.id, jobType);
    onClose();
  }
  setShowApprovalConfirmDialog(false);
};

export const handleApproveConfirm = (
  job: DataEnrichmentJobResponse | null,
  onApprove: ((jobId: string, jobType: 'PULL' | 'PUSH', comment?: string) => void) | undefined,
  onClose: () => void,
  setShowApproveConfirmDialog: (show: boolean) => void
) => {
  if (onApprove && job) {
    const jobType = getJobType(job) === 'push' ? 'PUSH' : 'PULL';
    onApprove(job.id, jobType);
    onClose();
  }
  setShowApproveConfirmDialog(false);
};

export const handleInputChange = (
  field: keyof DataEnrichmentJobResponse,
  value: any,
  setEditedJob: React.Dispatch<React.SetStateAction<Partial<DataEnrichmentJobResponse>>>
) => {
  setEditedJob((prev) => ({
    ...prev,
    [field]: value,
  }));
};

export const handleSaveJob = async (
  job: DataEnrichmentJobResponse | null,
  editedJob: Partial<DataEnrichmentJobResponse>,
  onSave: ((data: Partial<DataEnrichmentJobResponse>) => Promise<void>) | undefined,
  onClose: () => void,
  setIsSaving: (saving: boolean) => void
) => {
  if (!onSave || !job) return;

  try {
    setIsSaving(true);
    // Filter out schedule_id for push jobs since they don't use schedules
    const jobType = getJobType(job);
    const dataToSave = { ...editedJob };

    // Remove type field - we don't allow changing job type
    delete dataToSave.type;

    // Note: table_name is intentionally excluded from this update
    // The parent component will handle versioning if needed
    delete dataToSave.table_name;

    if (jobType === 'push') {
      delete dataToSave.schedule_id;
      delete dataToSave.source_type;
      delete dataToSave.connection;
      delete dataToSave.file;
    }

    await onSave(dataToSave);
    onClose();
  } catch (error) {
    console.error('Failed to save job:', error);
  } finally {
    setIsSaving(false);
  }
};

export const handleExportConfirm = async (
  job: DataEnrichmentJobResponse | null,
  onExport: ((jobId: string, jobType: 'PULL' | 'PUSH') => Promise<void>) | undefined,
  setShowExportConfirmDialog: (show: boolean) => void,
  setIsSaving: (saving: boolean) => void
) => {
  if (onExport && job) {
    setIsSaving(true);
    try {
      const jobType = getJobType(job) === 'push' ? 'PUSH' : 'PULL';
      await onExport(job.id, jobType);
      setShowExportConfirmDialog(false);
    } finally {
      setIsSaving(false);
    }
  }
};

export const handleApproveWithComment = async (
  job: DataEnrichmentJobResponse | null,
  approveComment: string,
  onApprove: ((jobId: string, jobType: 'PULL' | 'PUSH', comment?: string) => Promise<void>) | undefined,
  setShowApproveConfirmDialog: (show: boolean) => void,
  setIsSaving: (saving: boolean) => void
) => {
  if (onApprove && job) {
    setIsSaving(true);
    try {
      await onApprove(
        job.id,
        getJobType(job).toUpperCase() as 'PULL' | 'PUSH',
        approveComment,
      );
      setShowApproveConfirmDialog(false);
    } finally {
      setIsSaving(false);
    }
  }
};

// ============================================================================
// CLONE JOB HANDLERS
// ============================================================================

// Helper function to determine source type from job data
export const determineSourceType = (job: DataEnrichmentJobResponse): 'HTTP' | 'SFTP' => {
  // First check explicit source_type
  if (job.source_type) {
    console.log('🔍 Using explicit source_type:', job.source_type);
    return job.source_type as 'HTTP' | 'SFTP';
  }

  if (job.connection) {
    let connectionObj = job.connection;
    
    // If connection is a string, try to parse it
    if (typeof job.connection === 'string') {
      try {
        connectionObj = JSON.parse(job.connection);
      } catch (e) {
        return 'HTTP'; // Default fallback
      }
    }
    
    // Check parsed or direct object
    if (connectionObj && typeof connectionObj === 'object') {
      if ('host' in connectionObj && connectionObj.host) {
        console.log('🔍 Auto-detected SFTP from connection.host:', connectionObj.host);
        return 'SFTP';
      } else if ('url' in connectionObj && connectionObj.url) {
        console.log('🔍 Auto-detected HTTP from connection.url:', connectionObj.url);
        return 'HTTP';
      }
    }
  }
  
  // Default fallback
  console.log('🔍 Defaulting to HTTP - no clear indicators');
  return 'HTTP';
};

export const handleCloneJob = async (
  job: DataEnrichmentJobResponse | null,
  newVersion: string,
  newEndpointName: string,
  setIsCloning: (cloning: boolean) => void,
  showSuccess: (message: string) => void,
  showError: (message: string) => void,
  onSuccess: (() => void) | undefined,
  onClose: () => void
) => {
  if (!job || !newVersion.trim()) {
    showError('Version is required');
    return;
  }

  // For pull jobs, connector name is required
  if (job.type === 'pull' && !newEndpointName.trim()) {
    showError('Connector name is required for pull jobs');
    return;
  }

  setIsCloning(true);
  try {
    let result;
    
    if (job.type === 'pull') {
      // Clone pull job with version and endpoint name
      const sourceType = determineSourceType(job);
      console.log('🔍 Final determined source_type for cloning:', sourceType);

      // Handle connection data - create default if missing
      let connectionData = job.connection;
      if (!connectionData) {
        console.log('No connection data found, creating default based on source type...');
        if (sourceType === 'SFTP') {
          connectionData = {
            host: '',
            port: 22,
            user_name: '',
            auth_type: 'USERNAME_PASSWORD' as const,
            password: ''
          };
          showError('This pull job is missing connection information. Please check the original job and ensure it has proper SFTP connection details.');
          setIsCloning(false);
          return;
        } else {
          connectionData = {
            url: '',
            headers: {}
          };
          showError('This pull job is missing connection information. Please check the original job and ensure it has proper HTTP connection details.');
          setIsCloning(false);
          return;
        }
      }

      // Handle schedule_id - either use existing or get available schedules
      let scheduleId = job.schedule_id;
      
      if (!scheduleId) {
        console.log('No schedule_id found on job, attempting to get available schedules...');
        showSuccess('Finding or creating schedule for cloned job...');
        try {
          const schedules = await scheduleApi.getAll();
          const approvedSchedules = schedules.filter((schedule: any) => 
            schedule.status === 'approved' || schedule.status === 'exported' || schedule.status === 'deployed'
          );
          
          if (approvedSchedules.length > 0) {
            scheduleId = approvedSchedules[0].id;
            console.log('Using first available approved schedule:', scheduleId);
          } else {
            console.log('No approved schedules found, creating a default schedule...');
            const defaultSchedule = await scheduleApi.create({
              name: `Schedule for ${newEndpointName} (Cloned)`,
              cron: '0 */6 * * *',
              iterations: -1,
              status: 'approved'
            });
            
            if (defaultSchedule.success) {
              const createdSchedules = await scheduleApi.getAll();
              const newSchedule = createdSchedules.find((s: any) => s.name === `Schedule for ${newEndpointName} (Cloned)`);
              scheduleId = newSchedule?.id;
              console.log('Created new schedule with ID:', scheduleId);
            }
          }
        } catch (scheduleError) {
          console.error('Failed to handle schedule:', scheduleError);
          showError('Failed to create or find a schedule for the cloned job. Please try again.');
          setIsCloning(false);
          return;
        }
      }

      if (!scheduleId) {
        showError('Could not determine a valid schedule for the cloned job. Please contact support.');
        setIsCloning(false);
        return;
      }

      const pullJobData = {
        endpoint_name: newEndpointName.trim(),
        version: newVersion.trim(),
        schedule_id: scheduleId,
        source_type: sourceType as 'HTTP' | 'SFTP',
        description: job.description ? `${job.description}` : 'Cloned job',
        connection: connectionData,
        table_name: job.table_name || '',
        mode: job.mode || 'append' as 'append' | 'replace',
        ...(job.file && { file: job.file })
      };

      console.log('🔄 Cloning pull job with data:', JSON.stringify(pullJobData, null, 2));
      result = await dataEnrichmentJobApi.createPullJob(pullJobData);
      
    } else {
      // Clone push job with only version
      const pushJobData = {
        endpoint_name: job.endpoint_name,
        version: newVersion.trim(),
        path: job.path || '',
        description: job.description ? `${job.description}` : 'Cloned job',
        table_name: job.table_name || '',
        mode: job.mode || 'append' as 'append' | 'replace'
      };

      console.log('🔄 Cloning push job with data:', pushJobData);
      result = await dataEnrichmentJobApi.createPushJob(pushJobData);
    }
    
    if (result && result.id) {
      showSuccess(`${job.type === 'pull' ? 'Pull' : 'Push'} job cloned successfully as version ${newVersion}`);
      onSuccess?.();
      onClose();
    } else {
      showError('Failed to clone job - no ID returned');
    }
  } catch (error) {
    console.error('❌ Clone failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to clone job';
    showError(errorMessage);
  } finally {
    setIsCloning(false);
  }
};

// ============================================================================
// JOB LIST HANDLERS
// ============================================================================

export const handleResumeJob = async (
  job: DataEnrichmentJobResponse,
  showSuccess: (message: string) => void,
  showError: (message: string) => void,
  onJobUpdate: () => void
) => {
  try {
    const jobType = job.type === 'push' ? 'PUSH' : 'PULL';
    await dataEnrichmentJobApi.updateStatus(job.id, DATA_ENRICHMENT_JOB_STATUSES.IN_PROGRESS, jobType);
    showSuccess('Job resumed successfully');
    onJobUpdate();
  } catch (error) {
    console.error('Failed to resume job:', error);
    showError('Failed to resume job');
  }
};

export const handleUpdateJobStatus = async (
  jobId: string,
  jobType: 'PULL' | 'PUSH',
  newStatus: string,
  showSuccess: (message: string) => void,
  showError: (message: string) => void,
  onJobUpdate: () => void
) => {
  try {
    await dataEnrichmentJobApi.updateStatus(jobId, newStatus, jobType);
    
    const statusLabels: Record<string, string> = {
      STATUS_01_IN_PROGRESS: 'in-progress',
      STATUS_02_ON_HOLD: 'on-hold',
      STATUS_03_UNDER_REVIEW: 'under review',
      STATUS_04_APPROVED: 'approved',
      STATUS_05_REJECTED: 'rejected',
      STATUS_06_EXPORTED: 'exported',
      STATUS_07_READY_FOR_DEPLOYMENT: 'ready for deployment',
      STATUS_08_DEPLOYED: 'deployed',
    };
    
    const statusLabel = statusLabels[newStatus] || newStatus;
    showSuccess(`Job status updated to ${statusLabel}`);
    onJobUpdate();
  } catch (error) {
    console.error('Failed to update job status:', error);
    showError('Failed to update job status');
  }
};

export const handleTogglePublishingStatus = async (
  job: DataEnrichmentJobResponse,
  showSuccess: (message: string) => void,
  showError: (message: string) => void,
  onJobUpdate: () => void
) => {
  try {
    const newStatus = job.publishing_status === 'active' ? 'in-active' : 'active';
    const jobType = job.type === 'push' ? 'PUSH' : 'PULL';
    
    await dataEnrichmentJobApi.updatePublishingStatus(job.id, newStatus, jobType);
    
    const actionWord = newStatus === 'active' ? 'activated' : 'deactivated';
    showSuccess(`Job ${actionWord} successfully`);
    onJobUpdate();
  } catch (error) {
    console.error('Failed to toggle publishing status:', error);
    showError('Failed to update publishing status');
  }
};

// ============================================================================
// CRON JOB HANDLERS
// ============================================================================

export const handleSubmitForApproval = async (
  scheduleId: string,
  showSuccess: (message: string) => void,
  showError: (message: string) => void,
  onUpdate: () => void
) => {
  try {
    await scheduleApi.updateStatus(scheduleId, DATA_ENRICHMENT_JOB_STATUSES.UNDER_REVIEW);
    showSuccess('Schedule submitted for approval');
    onUpdate();
  } catch (error) {
    console.error('Failed to submit schedule for approval:', error);
    showError('Failed to submit schedule for approval');
  }
};

export const handleApproveSchedule = async (
  scheduleId: string,
  showSuccess: (message: string) => void,
  showError: (message: string) => void,
  onUpdate: () => void
) => {
  try {
    await scheduleApi.updateStatus(scheduleId, DATA_ENRICHMENT_JOB_STATUSES.APPROVED);
    showSuccess('Schedule approved successfully');
    onUpdate();
  } catch (error) {
    console.error('Failed to approve schedule:', error);
    showError('Failed to approve schedule');
  }
};

export const handleRejectSchedule = async (
  scheduleId: string,
  showSuccess: (message: string) => void,
  showError: (message: string) => void,
  onUpdate: () => void
) => {
  try {
    await scheduleApi.updateStatus(scheduleId, DATA_ENRICHMENT_JOB_STATUSES.REJECTED);
    showSuccess('Schedule rejected');
    onUpdate();
  } catch (error) {
    console.error('Failed to reject schedule:', error);
    showError('Failed to reject schedule');
  }
};

// ============================================================================
// DATA ENRICHMENT FORM HANDLERS
// ============================================================================

export const handleFormInputChange = (
  field: string,
  value: any,
  setFormData: React.Dispatch<React.SetStateAction<any>>
) => {
  setFormData((prev: any) => ({
    ...prev,
    [field]: value,
  }));
};

export const handleContinue = (
  setShowConfigForm: React.Dispatch<React.SetStateAction<boolean>>
) => {
  setShowConfigForm(true);
};

export const handleSaveForm = async (
  formData: any,
  onSave: ((data: any) => Promise<void>) | undefined,
  setIsSaving: (saving: boolean) => void,
  showSuccess: (message: string) => void,
  showError: (message: string) => void
) => {
  if (!onSave) return;

  try {
    setIsSaving(true);
    await onSave(formData);
    showSuccess('Form saved successfully');
  } catch (error) {
    console.error('Failed to save form:', error);
    showError('Failed to save form');
  } finally {
    setIsSaving(false);
  }
};

// ============================================================================
// DATA ENRICHMENT EDIT HANDLERS
// ============================================================================

export const handleSaveEdit = async (
  job: DataEnrichmentJobResponse | null,
  editedData: Partial<DataEnrichmentJobResponse>,
  setIsSaving: (saving: boolean) => void,
  showSuccess: (message: string) => void,
  showError: (message: string) => void,
  onSuccess: (() => void) | undefined,
  onClose: () => void
) => {
  if (!job) return;

  try {
    setIsSaving(true);
    const jobType = job.type === 'push' ? 'PUSH' : 'PULL';
    
    // Remove null values from editedData before sending
    const cleanedData = Object.fromEntries(
      Object.entries(editedData).filter(([_, value]) => value !== null)
    );
    
    if (jobType === 'PUSH') {
      await dataEnrichmentJobApi.updatePushJob(job.id, cleanedData as any);
    } else {
      await dataEnrichmentJobApi.updatePullJob(job.id, cleanedData as any);
    }
    
    showSuccess('Job updated successfully');
    onSuccess?.();
    onClose();
  } catch (error) {
    console.error('Failed to save job:', error);
    showError('Failed to save job');
  } finally {
    setIsSaving(false);
  }
};

export const handleUpdateConfirm = (
  onUpdate: (() => void) | undefined,
  setShowUpdateDialog: (show: boolean) => void
) => {
  onUpdate?.();
  setShowUpdateDialog(false);
};

export const handleEditSendForApprovalConfirm = async (
  job: DataEnrichmentJobResponse | null,
  showSuccess: (message: string) => void,
  showError: (message: string) => void,
  onSuccess: (() => void) | undefined,
  setShowApprovalDialog: (show: boolean) => void
) => {
  if (!job) return;

  try {
    const jobType = job.type === 'push' ? 'PUSH' : 'PULL';
    await dataEnrichmentJobApi.updateStatus(job.id, DATA_ENRICHMENT_JOB_STATUSES.UNDER_REVIEW, jobType);
    showSuccess('Job sent for approval');
    onSuccess?.();
    setShowApprovalDialog(false);
  } catch (error) {
    console.error('Failed to send for approval:', error);
    showError('Failed to send job for approval');
  }
};

// ============================================================================
// NAVIGATION HANDLERS
// ============================================================================

export const handleNavigateToHistory = (
  navigate: NavigateFunction,
  jobId?: string,
  historyRoute?: string
) => {
  const url = jobId
    ? `${historyRoute}?jobId=${encodeURIComponent(jobId)}`
    : historyRoute;
  
  if (url) {
    navigate(url);
  }
};

// ============================================================================
// HIGH-LEVEL JOB OPERATIONS
// ============================================================================

export const submitPullJob = async (data: CreatePullJobDto) => {
  return await dataEnrichmentJobApi.createPullJob(data);
};

export const submitPushJob = async (data: CreatePushJobDto) => {
  return await dataEnrichmentJobApi.createPushJob(data);
};

export const rejectJob = async (
  jobId: string,
  jobType: 'PULL' | 'PUSH',
  reason?: string,
) =>
  await dataEnrichmentJobApi.updateStatus(
    jobId,
    DATA_ENRICHMENT_JOB_STATUSES.REJECTED,
    jobType,
    reason,
  );

export const approveJob = async (jobId: string, jobType: 'PULL' | 'PUSH') =>
  await dataEnrichmentJobApi.updateStatus(
    jobId,
    DATA_ENRICHMENT_JOB_STATUSES.APPROVED,
    jobType,
  );

export const exportJob = async (jobId: string, jobType: 'PULL' | 'PUSH') =>
  await dataEnrichmentJobApi.updateStatus(
    jobId,
    DATA_ENRICHMENT_JOB_STATUSES.EXPORTED,
    jobType,
  );

export const sendForApproval = async (jobId: string, jobType: 'PULL' | 'PUSH') =>
  await dataEnrichmentJobApi.updateStatus(
    jobId,
    DATA_ENRICHMENT_JOB_STATUSES.UNDER_REVIEW,
    jobType,
  );

export const updateJobData = async (
  jobId: string,
  jobType: 'PULL' | 'PUSH',
  payload: UpdatePullJobDto | UpdatePushJobDto,
) => {
  if (jobType === 'PUSH') {
    return await dataEnrichmentJobApi.updatePushJob(
      jobId,
      payload as UpdatePushJobDto,
    );
  } else {
    return await dataEnrichmentJobApi.updatePullJob(
      jobId,
      payload as UpdatePullJobDto,
    );
  }
};

export const activateJob = async (jobId: string, jobType: 'PULL' | 'PUSH') =>
  await dataEnrichmentJobApi.updatePublishingStatus(jobId, 'active', jobType);

export const deactivateJob = async (jobId: string, jobType: 'PULL' | 'PUSH') =>
  await dataEnrichmentJobApi.updatePublishingStatus(
    jobId,
    'in-active',
    jobType,
  );

export const prepareJobForEdit = (job: DataEnrichmentJobResponse) =>
  formatJobForEdit(job);

export const getErrorMessage = (error: unknown) =>
  getDataEnrichmentErrorMessage(error);

export const loadJobs = async (
  pageNumber: number,
  itemsPerPage: number,
  userRole: string,
  searchingFilters: Record<string, unknown>,
): Promise<PaginatedJobResponse> => {
  const limit: number = itemsPerPage;
  const offset: number = pageNumber - 1;
  const params = { limit, offset, userRole };

  return await dataEnrichmentJobApi.getList(params, searchingFilters);
};

export const loadSchedules = async (): Promise<ScheduleResponse[]> => {
  return await scheduleApi.getAll();
};
export const saveDataEnrichmentJob = async (options: SaveJobOptions) => {
  const {
    formValues,
    configurationType,
    editMode,
    selectedJob,
    onSave,
    onCloseWithRefresh,
    onClose,
    showSuccess,
    setShowSendForApproval,
    setIsCreating,
  } = options;

  setIsCreating(true);
  try {
    let payload: any;
    if (configurationType === 'push') {
      payload = buildPushPayload(formValues);
    } else {
      payload = buildPullPayload(formValues);
    }

    let response;
    if (editMode && selectedJob?.id) {
      response =
        configurationType === 'pull'
            ? await dataEnrichmentJobApi.updatePullJob(selectedJob.id, payload)
            : await dataEnrichmentJobApi.updatePushJob(selectedJob.id, payload);
      if (selectedJob?.status === DATA_ENRICHMENT_JOB_STATUSES.REJECTED) {
        setShowSendForApproval(true);
      } else {
        if (onSave) onSave(response);
        if (onCloseWithRefresh) onCloseWithRefresh();
        else if (onClose) onClose();
        return;
      }
    } else {
      response =
        configurationType === 'pull'
          ? await dataEnrichmentJobApi.createPullJob(payload)
          : await dataEnrichmentJobApi.createPushJob(payload);
    }

    const backendMessage = (response as any)?.message;
    const successMessage =
      backendMessage ||
      (editMode
        ? `Data enrichment endpoint "${formValues.name}" updated successfully!`
        : `Data enrichment endpoint "${formValues.name}" created successfully! You can now send it for approval.`);

    showSuccess('Success', successMessage);
    if (!response?.status || selectedJob?.status === DATA_ENRICHMENT_JOB_STATUSES.REJECTED) {
      if (onSave) onSave(response);
    }
  } catch (error) {
    console.error('=== CREATE ENDPOINT ERROR ===', error);
    throw error;
  } finally {
    setIsCreating(false);
  }
};

export { DATA_ENRICHMENT_SUCCESS_MESSAGES, DATA_ENRICHMENT_JOB_STATUSES };
