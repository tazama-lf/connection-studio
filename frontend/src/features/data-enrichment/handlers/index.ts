import { buildPushPayload, buildPullPayload, getDataEnrichmentErrorMessage, formatJobForEdit, getJobType } from '../utils';
import type {
  SaveJobOptions,
  CreatePullJobDto,
  CreatePushJobDto,
  UpdatePullJobDto,
  UpdatePushJobDto,
  DataEnrichmentJobResponse,
  ScheduleResponse,
  ScheduleCreateResponse,
  ScheduleRequest,
  PaginatedJobResponse,
  PaginationParams,
  HttpConnection,
  SftpConnection,
} from '../types';

import { ENV } from '@shared/config/environment.config';
import { getDemsStatusLov } from '@shared/lovs';
import { apiRequest } from '@utils/common/apiHelper';
import type { NavigateFunction } from 'react-router';

import {
  DATA_ENRICHMENT_SUCCESS_MESSAGES,
  DATA_ENRICHMENT_JOB_STATUSES,
} from '../constants';

const { API_BASE_URL } = ENV;
const DEFAULT_OFFSET = 0;
const DEFAULT_HISTORY_LIMIT = 10;
const DEFAULT_SCHEDULE_OFFSET = 0;
const DEFAULT_SCHEDULE_LIMIT = 50;
const FIRST_ITEM_INDEX = 0;

export const dataEnrichmentJobApi = {
  createPullJob: async (
    data: CreatePullJobDto,
  ): Promise<DataEnrichmentJobResponse> => await apiRequest<DataEnrichmentJobResponse>(
    `${API_BASE_URL}/job/create/pull`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  ),

  createPushJob: async (
    data: CreatePushJobDto,
  ): Promise<DataEnrichmentJobResponse> => await apiRequest<DataEnrichmentJobResponse>(
    `${API_BASE_URL}/job/create/push`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  ),

  getList: async (
    params: PaginationParams,
    searchingFilters?: Record<string, unknown>,
  ): Promise<PaginatedJobResponse> => {
    const url = `${API_BASE_URL}/job/all?offset=${params.offset}&limit=${params.limit}`;

    const { status, ...otherFilters } = searchingFilters ?? {};
    let statusFilter;

    if (!status) {
      const userRole = params.userRole as keyof typeof getDemsStatusLov;
      const statusLov = getDemsStatusLov[userRole];
      statusFilter = statusLov.map((item) => item.value).join(',');
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

  getJobHistory: async (
    jobId: string | undefined,
    offset = DEFAULT_OFFSET,
    limit = DEFAULT_HISTORY_LIMIT,
    searchingFilters?: Record<string, unknown>,
  ): Promise<{ data: unknown[]; total: number; limit: number; offset: number }> => {
    const queryParams = new URLSearchParams();
    queryParams.append('offset', offset.toString());
    queryParams.append('limit', limit.toString());

    const body: Record<string, unknown> = searchingFilters ? { ...(searchingFilters) } : {};
    if (jobId) {
      body.jobId = jobId;
    }

    return await apiRequest<{ data: unknown[]; total: number; limit: number; offset: number }>(
      `${API_BASE_URL}/job/history?${queryParams.toString()}`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );
  },

  updatePullJob: async (
    id: string,
    updates: UpdatePullJobDto,
  ): Promise<DataEnrichmentJobResponse> => await apiRequest<DataEnrichmentJobResponse>(
    `${API_BASE_URL}/job/update/${id}?type=pull`,
    {
      method: 'PATCH',
      body: JSON.stringify(updates),
    },
  ),

  updatePushJob: async (
    id: string,
    updates: UpdatePushJobDto,
  ): Promise<DataEnrichmentJobResponse> => await apiRequest<DataEnrichmentJobResponse>(
    `${API_BASE_URL}/job/update/${id}?type=push`,
    {
      method: 'PATCH',
      body: JSON.stringify(updates),
    },
  ),

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
  ): Promise<{ success: boolean; message: string }> => await apiRequest<{ success: boolean; message: string }>(
    `${API_BASE_URL}/job/${id}?type=${type.toLowerCase()}`,
    {
      method: 'DELETE',
    },
  ),
};

export const scheduleApi = {
  create: async (data: ScheduleRequest): Promise<ScheduleCreateResponse> => await apiRequest<ScheduleCreateResponse>(
    `${API_BASE_URL}/scheduler/create`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  ),

  getAll: async (offset = DEFAULT_SCHEDULE_OFFSET, limit = DEFAULT_SCHEDULE_LIMIT): Promise<ScheduleResponse[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('offset', offset.toString());
    queryParams.append('limit', limit.toString());

    const schedulerBody = {
      status: `${DATA_ENRICHMENT_JOB_STATUSES.APPROVED},${DATA_ENRICHMENT_JOB_STATUSES.EXPORTED}`,
    };

    return await apiRequest<ScheduleResponse[]>(
      `${API_BASE_URL}/scheduler/all?${queryParams.toString()}`,
      {
        method: 'POST',
        body: JSON.stringify(schedulerBody),
      },
    );
  },

  getById: async (id: string): Promise<ScheduleResponse> => await apiRequest<ScheduleResponse>(
    `${API_BASE_URL}/scheduler/${id}`,
  ),

  update: async (
    id: string,
    updates: Partial<ScheduleRequest>,
  ): Promise<{ success: boolean; message: string }> => await apiRequest<{ success: boolean; message: string }>(
    `${API_BASE_URL}/scheduler/update/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        name: updates.name,
        start_date: updates.start_date,
        iterations: Number(updates.iterations),
        cron: updates.cron,
      }),
    },
  ),

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

export const handleRejectionConfirm = (
  reason: string,
  job: DataEnrichmentJobResponse | null,
  onReject:
    | ((jobId: string, jobType: 'PULL' | 'PUSH', reason: string) => void)
    | undefined,
  onClose: () => void,
): void => {
  if (onReject && job) {
    const jobType = getJobType(job) === 'push' ? 'PUSH' : 'PULL';
    onReject(job.id, jobType, reason);
    onClose();
  }
};

export const handleSendForApprovalConfirm = (
  job: DataEnrichmentJobResponse | null,
  onSendForApproval:
    | ((jobId: string, jobType: 'PULL' | 'PUSH') => void)
    | undefined,
  onClose: () => void,
  setShowApprovalConfirmDialog: (show: boolean) => void,
): void => {
  if (onSendForApproval && job) {
    const jobType = getJobType(job) === 'push' ? 'PUSH' : 'PULL';
    onSendForApproval(job.id, jobType);
    onClose();
  }
  setShowApprovalConfirmDialog(false);
};

export const handleApproveConfirm = (
  job: DataEnrichmentJobResponse | null,
  onApprove:
    | ((jobId: string, jobType: 'PULL' | 'PUSH', comment?: string) => void)
    | undefined,
  onClose: () => void,
  setShowApproveConfirmDialog: (show: boolean) => void,
): void => {
  if (onApprove && job) {
    const jobType = getJobType(job) === 'push' ? 'PUSH' : 'PULL';
    onApprove(job.id, jobType);
    onClose();
  }
  setShowApproveConfirmDialog(false);
};

export const handleInputChange = (
  field: keyof DataEnrichmentJobResponse,
  value: unknown,
  setEditedJob: React.Dispatch<
    React.SetStateAction<Partial<DataEnrichmentJobResponse>>
  >,
): void => {
  setEditedJob((prev) => ({
    ...prev,
    [field]: value,
  }));
};

export const handleSaveJob = async (
  job: DataEnrichmentJobResponse | null,
  editedJob: Partial<DataEnrichmentJobResponse>,
  onSave:
    | ((data: Partial<DataEnrichmentJobResponse>) => Promise<void>)
    | undefined,
  onClose: () => void,
  setIsSaving: (saving: boolean) => void,
): Promise<void> => {
  if (!onSave || !job) return;

  try {
    setIsSaving(true);

    const jobType = getJobType(job);
    const dataToSave = { ...editedJob };

    delete dataToSave.type;

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
  } finally {
    setIsSaving(false);
  }
};

export const handleExportConfirm = async (
  job: DataEnrichmentJobResponse | null,
  onExport:
    | ((jobId: string, jobType: 'PULL' | 'PUSH') => Promise<void>)
    | undefined,
  setShowExportConfirmDialog: (show: boolean) => void,
  setIsSaving: (saving: boolean) => void,
): Promise<void> => {
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
  onApprove:
    | ((
      jobId: string,
      jobType: 'PULL' | 'PUSH',
      comment?: string,
    ) => Promise<void>)
    | undefined,
  setShowApproveConfirmDialog: (show: boolean) => void,
  setIsSaving: (saving: boolean) => void,
): Promise<void> => {
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

export const determineSourceType = (
  job: DataEnrichmentJobResponse,
): 'HTTP' | 'SFTP' => {
  if (job.source_type) {
    return job.source_type as 'HTTP' | 'SFTP';
  }

  if (job.connection) {
    let connectionObj: unknown = job.connection;

    if (typeof job.connection === 'string') {
      try {
        connectionObj = JSON.parse(job.connection);
      } catch (e) {
        return 'HTTP';
      }
    }

    if (typeof connectionObj === 'object' && connectionObj !== null) {
      if ('host' in connectionObj && (connectionObj as Record<string, unknown>).host) {
        return 'SFTP';
      } else if ('url' in connectionObj && (connectionObj as Record<string, unknown>).url) {
        return 'HTTP';
      }
    }
  }

  return 'HTTP';
};

interface CloneJobOptions {
  job: DataEnrichmentJobResponse | null;
  newVersion: string;
  newEndpointName: string;
  setIsCloning: (cloning: boolean) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  onSuccess: (() => void) | undefined;
  onClose: () => void;
}

const findOrCreateSchedule = async (
  newEndpointName: string,
  showSuccess: (message: string) => void,
): Promise<string | undefined> => {
  showSuccess('Finding or creating schedule for cloned job...');
  const schedules = await scheduleApi.getAll();
  const approvedSchedules = schedules.filter(
    (schedule: ScheduleResponse) =>
      schedule.schedule_status === 'approved' ||
      schedule.schedule_status === 'exported' ||
      schedule.schedule_status === 'deployed',
  );

  if (approvedSchedules.length > FIRST_ITEM_INDEX) {
    return approvedSchedules[FIRST_ITEM_INDEX].id;
  }

  const defaultSchedule = await scheduleApi.create({
    name: `Schedule for ${newEndpointName} (Cloned)`,
    cron: '0 */6 * * *',
    iterations: -1,
    status: 'approved',
  });

  if (defaultSchedule.success) {
    const createdSchedules = await scheduleApi.getAll();
    const newSchedule = createdSchedules.find(
      (s: ScheduleResponse) =>
        s.name === `Schedule for ${newEndpointName} (Cloned)`,
    );
    return newSchedule?.id;
  }

  return undefined;
};

const validatePullJobConnection = (
  job: DataEnrichmentJobResponse,
  sourceType: 'HTTP' | 'SFTP',
  showError: (message: string) => void,
  setIsCloning: (cloning: boolean) => void,
): HttpConnection | SftpConnection | null => {
  const connectionData = job.connection;
  
  if (!connectionData) {
    if (sourceType === 'SFTP') {
      showError(
        'This pull job is missing connection information. Please check the original job and ensure it has proper SFTP connection details.',
      );
    } else {
      showError(
        'This pull job is missing connection information. Please check the original job and ensure it has proper HTTP connection details.',
      );
    }
    setIsCloning(false);
    return null;
  }
  
  return connectionData;
};

const createPullJobData = (
  job: DataEnrichmentJobResponse,
  newEndpointName: string,
  newVersion: string,
  scheduleId: string,
  sourceType: 'HTTP' | 'SFTP',
  connectionData: HttpConnection | SftpConnection,
): CreatePullJobDto => ({
  endpoint_name: newEndpointName.trim(),
  version: newVersion.trim(),
  schedule_id: scheduleId,
  source_type: sourceType,
  description: job.description || 'Cloned job',
  connection: connectionData,
  table_name: job.table_name,
  mode: job.mode,
  ...(job.file && { file: job.file }),
});

const createPushJobData = (
  job: DataEnrichmentJobResponse,
  newVersion: string,
): CreatePushJobDto => ({
  endpoint_name: job.endpoint_name,
  version: newVersion.trim(),
  path: job.path ?? '',
  description: job.description || 'Cloned job',
  table_name: job.table_name,
  mode: job.mode,
});

const clonePullJob = async (
  job: DataEnrichmentJobResponse,
  newEndpointName: string,
  newVersion: string,
  showSuccess: (message: string) => void,
  showError: (message: string) => void,
  setIsCloning: (cloning: boolean) => void,
): Promise<DataEnrichmentJobResponse | null> => {
  const sourceType = determineSourceType(job);
  const connectionData = validatePullJobConnection(job, sourceType, showError, setIsCloning);
  
  if (!connectionData) {
    return null;
  }

  let scheduleId = job.schedule_id;

  if (!scheduleId) {
    try {
      scheduleId = await findOrCreateSchedule(newEndpointName, showSuccess);
    } catch (scheduleError) {
      showError(
        'Failed to create or find a schedule for the cloned job. Please try again.',
      );
      setIsCloning(false);
      return null;
    }
  }

  if (!scheduleId) {
    showError(
      'Could not determine a valid schedule for the cloned job. Please contact support.',
    );
    setIsCloning(false);
    return null;
  }

  const pullJobData = createPullJobData(job, newEndpointName, newVersion, scheduleId, sourceType, connectionData);
  return await dataEnrichmentJobApi.createPullJob(pullJobData);
};

const clonePushJob = async (
  job: DataEnrichmentJobResponse,
  newVersion: string,
): Promise<DataEnrichmentJobResponse> => {
  const pushJobData = createPushJobData(job, newVersion);
  return await dataEnrichmentJobApi.createPushJob(pushJobData);
};

export const handleCloneJob = async (
  options: CloneJobOptions,
): Promise<void> => {
  const {
    job,
    newVersion,
    newEndpointName,
    setIsCloning,
    showSuccess,
    showError,
    onSuccess,
    onClose,
  } = options;
  if (!job || !newVersion.trim()) {
    showError('Version is required');
    return;
  }

  if (job.type === 'pull' && !newEndpointName.trim()) {
    showError('Connector name is required for pull jobs');
    return;
  }

  setIsCloning(true);
  try {
    const result = job.type === 'pull'
      ? await clonePullJob(job, newEndpointName, newVersion, showSuccess, showError, setIsCloning)
      : await clonePushJob(job, newVersion);

    if (!result) {
      return;
    }

    if (result.id) {
      showSuccess(
        `${job.type === 'pull' ? 'Pull' : 'Push'} job cloned successfully as version ${newVersion}`,
      );
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } else {
      showError('Failed to clone job - no ID returned');
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to clone job';
    showError(errorMessage);
  } finally {
    setIsCloning(false);
  }
};

export const handleResumeJob = async (
  job: DataEnrichmentJobResponse,
  showSuccess: (message: string) => void,
  showError: (message: string) => void,
  onJobUpdate: () => void,
): Promise<void> => {
  try {
    const jobType = job.type === 'push' ? 'PUSH' : 'PULL';
    await dataEnrichmentJobApi.updateStatus(
      job.id,
      DATA_ENRICHMENT_JOB_STATUSES.IN_PROGRESS,
      jobType,
    );
    showSuccess('Job resumed successfully');
    onJobUpdate();
  } catch (error) {
    showError('Failed to resume job');
  }
};

export const handleUpdateJobStatus = async (
  jobId: string,
  jobType: 'PULL' | 'PUSH',
  newStatus: string,
  showSuccess: (message: string) => void,
  showError: (message: string) => void,
  onJobUpdate: () => void,
): Promise<void> => {
  try {
    await dataEnrichmentJobApi.updateStatus(jobId, newStatus, jobType);

    const statusLabelMap: Record<string, string> = {
      [DATA_ENRICHMENT_JOB_STATUSES.IN_PROGRESS]: 'in-progress',
      [DATA_ENRICHMENT_JOB_STATUSES.ON_HOLD]: 'on-hold',
      [DATA_ENRICHMENT_JOB_STATUSES.UNDER_REVIEW]: 'under review',
      [DATA_ENRICHMENT_JOB_STATUSES.APPROVED]: 'approved',
      [DATA_ENRICHMENT_JOB_STATUSES.REJECTED]: 'rejected',
      [DATA_ENRICHMENT_JOB_STATUSES.EXPORTED]: 'exported',
      [DATA_ENRICHMENT_JOB_STATUSES.READY_FOR_DEPLOYMENT]: 'ready for deployment',
      [DATA_ENRICHMENT_JOB_STATUSES.DEPLOYED]: 'deployed',
    };

    const statusLabel = statusLabelMap[newStatus] || newStatus;
    showSuccess(`Job status updated to ${statusLabel}`);
    onJobUpdate();
  } catch (error) {
    showError('Failed to update job status');
  }
};

export const handleTogglePublishingStatus = async (
  job: DataEnrichmentJobResponse,
  showSuccess: (message: string) => void,
  showError: (message: string) => void,
  onJobUpdate: () => void,
): Promise<void> => {
  try {
    const newStatus =
      job.publishing_status === 'active' ? 'in-active' : 'active';
    const jobType = job.type === 'push' ? 'PUSH' : 'PULL';

    await dataEnrichmentJobApi.updatePublishingStatus(
      job.id,
      newStatus,
      jobType,
    );

    const actionWord = newStatus === 'active' ? 'activated' : 'deactivated';
    showSuccess(`Job ${actionWord} successfully`);
    onJobUpdate();
  } catch (error) {
    showError('Failed to update publishing status');
  }
};

export const handleSubmitForApproval = async (
  scheduleId: string,
  showSuccess: (message: string) => void,
  showError: (message: string) => void,
  onUpdate: () => void,
): Promise<void> => {
  try {
    await scheduleApi.updateStatus(
      scheduleId,
      DATA_ENRICHMENT_JOB_STATUSES.UNDER_REVIEW,
    );
    showSuccess('Schedule submitted for approval');
    onUpdate();
  } catch (error) {
    showError('Failed to submit schedule for approval');
  }
};

export const handleApproveSchedule = async (
  scheduleId: string,
  showSuccess: (message: string) => void,
  showError: (message: string) => void,
  onUpdate: () => void,
): Promise<void> => {
  try {
    await scheduleApi.updateStatus(
      scheduleId,
      DATA_ENRICHMENT_JOB_STATUSES.APPROVED,
    );
    showSuccess('Schedule approved successfully');
    onUpdate();
  } catch (error) {
    showError('Failed to approve schedule');
  }
};

export const handleRejectSchedule = async (
  scheduleId: string,
  showSuccess: (message: string) => void,
  showError: (message: string) => void,
  onUpdate: () => void,
): Promise<void> => {
  try {
    await scheduleApi.updateStatus(
      scheduleId,
      DATA_ENRICHMENT_JOB_STATUSES.REJECTED,
    );
    showSuccess('Schedule rejected');
    onUpdate();
  } catch (error) {
    showError('Failed to reject schedule');
  }
};

export const handleFormInputChange = (
  field: string,
  value: unknown,
  setFormData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>,
): void => {
  setFormData((prev: Record<string, unknown>) => ({
    ...prev,
    [field]: value,
  }));
};

export const handleContinue = (
  setShowConfigForm: React.Dispatch<React.SetStateAction<boolean>>,
): void => {
  setShowConfigForm(true);
};

export const handleSaveForm = async (
  formData: Record<string, unknown>,
  onSave: ((data: Record<string, unknown>) => Promise<void>) | undefined,
  setIsSaving: (saving: boolean) => void,
  showSuccess: (message: string) => void,
  showError: (message: string) => void,
): Promise<void> => {
  if (!onSave) return;

  try {
    setIsSaving(true);
    await onSave(formData);
    showSuccess('Form saved successfully');
  } catch (error) {
    showError('Failed to save form');
  } finally {
    setIsSaving(false);
  }
};

interface SaveEditOptions {
  job: DataEnrichmentJobResponse | null;
  editedData: Partial<DataEnrichmentJobResponse>;
  setIsSaving: (saving: boolean) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  onSuccess: (() => void) | undefined;
  onClose: () => void;
}

export const handleSaveEdit = async (
  options: SaveEditOptions,
): Promise<void> => {
  const {
    job,
    editedData,
    setIsSaving,
    showSuccess,
    showError,
    onSuccess,
    onClose,
  } = options;

  if (!job) return;

  try {
    setIsSaving(true);
    const jobType = job.type === 'push' ? 'PUSH' : 'PULL';

    const cleanedData = Object.fromEntries(
      Object.entries(editedData).filter(([_, value]) => value !== null),
    ) as Partial<UpdatePushJobDto & UpdatePullJobDto>;

    if (jobType === 'PUSH') {
      await dataEnrichmentJobApi.updatePushJob(job.id, cleanedData as UpdatePushJobDto);
    } else {
      await dataEnrichmentJobApi.updatePullJob(job.id, cleanedData as UpdatePullJobDto);
    }

    showSuccess('Job updated successfully');
    if (onSuccess) {
      onSuccess();
    }
    onClose();
  } catch (error) {
    showError('Failed to save job');
  } finally {
    setIsSaving(false);
  }
};

export const handleUpdateConfirm = (
  onUpdate: (() => void) | undefined,
  setShowUpdateDialog: (show: boolean) => void,
): void => {
  if (onUpdate) {
    onUpdate();
  }
  setShowUpdateDialog(false);
};

export const handleEditSendForApprovalConfirm = async (
  job: DataEnrichmentJobResponse | null,
  showSuccess: (message: string) => void,
  showError: (message: string) => void,
  onSuccess: (() => void) | undefined,
  setShowApprovalDialog: (show: boolean) => void,
): Promise<void> => {
  if (!job) return;

  try {
    const jobType = job.type === 'push' ? 'PUSH' : 'PULL';
    await dataEnrichmentJobApi.updateStatus(
      job.id,
      DATA_ENRICHMENT_JOB_STATUSES.UNDER_REVIEW,
      jobType,
    );
    showSuccess('Job sent for approval');
    onSuccess?.();
    setShowApprovalDialog(false);
  } catch (error) {
    showError('Failed to send job for approval');
  }
};

export const handleNavigateToHistory = (
  navigate: NavigateFunction,
  jobId?: string,
  historyRoute?: string,
): void => {
  const url = jobId
    ? `${historyRoute}?jobId=${encodeURIComponent(jobId)}`
    : historyRoute;

  if (url) {
    navigate(url);
  }
};

export const submitPullJob = async (data: CreatePullJobDto): Promise<DataEnrichmentJobResponse> => await dataEnrichmentJobApi.createPullJob(data);

export const submitPushJob = async (data: CreatePushJobDto): Promise<DataEnrichmentJobResponse> => await dataEnrichmentJobApi.createPushJob(data);

export const rejectJob = async (
  jobId: string,
  jobType: 'PULL' | 'PUSH',
  reason?: string,
): Promise<{ success: boolean; message: string }> =>
  await dataEnrichmentJobApi.updateStatus(
    jobId,
    DATA_ENRICHMENT_JOB_STATUSES.REJECTED,
    jobType,
    reason,
  );

export const approveJob = async (jobId: string, jobType: 'PULL' | 'PUSH'): Promise<{ success: boolean; message: string }> =>
  await dataEnrichmentJobApi.updateStatus(
    jobId,
    DATA_ENRICHMENT_JOB_STATUSES.APPROVED,
    jobType,
  );

export const exportJob = async (jobId: string, jobType: 'PULL' | 'PUSH'): Promise<{ success: boolean; message: string }> =>
  await dataEnrichmentJobApi.updateStatus(
    jobId,
    DATA_ENRICHMENT_JOB_STATUSES.EXPORTED,
    jobType,
  );

export const sendForApproval = async (
  jobId: string,
  jobType: 'PULL' | 'PUSH',
): Promise<{ success: boolean; message: string }> =>
  await dataEnrichmentJobApi.updateStatus(
    jobId,
    DATA_ENRICHMENT_JOB_STATUSES.UNDER_REVIEW,
    jobType,
  );

export const updateJobData = async (
  jobId: string,
  jobType: 'PULL' | 'PUSH',
  payload: UpdatePullJobDto | UpdatePushJobDto,
): Promise<DataEnrichmentJobResponse> => {
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

export const activateJob = async (jobId: string, jobType: 'PULL' | 'PUSH'): Promise<{ success: boolean; message: string }> =>
  await dataEnrichmentJobApi.updatePublishingStatus(jobId, 'active', jobType);

export const deactivateJob = async (jobId: string, jobType: 'PULL' | 'PUSH'): Promise<{ success: boolean; message: string }> =>
  await dataEnrichmentJobApi.updatePublishingStatus(
    jobId,
    'in-active',
    jobType,
  );

export const prepareJobForEdit = (job: DataEnrichmentJobResponse): Partial<DataEnrichmentJobResponse> =>
  formatJobForEdit(job);

export const getErrorMessage = (error: unknown): string =>
  getDataEnrichmentErrorMessage(error);

export const loadJobs = async (
  pageNumber: number,
  itemsPerPage: number,
  userRole: string,
  searchingFilters: Record<string, unknown>,
): Promise<PaginatedJobResponse> => {
  const limit: number = itemsPerPage;
  const offset: number = pageNumber;
  const params = { limit, offset, userRole };

  return await dataEnrichmentJobApi.getList(params, searchingFilters);
};

export const loadSchedules = async (): Promise<ScheduleResponse[]> => await scheduleApi.getAll();

const buildJobPayload = (
  configurationType: 'push' | 'pull',
  formValues: Record<string, unknown>,
): Partial<CreatePullJobDto> | Partial<CreatePushJobDto> => {
  if (configurationType === 'push') {
    return buildPushPayload(formValues);
  }
  return buildPullPayload(formValues);
};

const updateExistingJob = async (
  configurationType: 'push' | 'pull',
  selectedJobId: string,
  payload: Partial<CreatePullJobDto> | Partial<CreatePushJobDto>,
): Promise<DataEnrichmentJobResponse> => {
  if (configurationType === 'pull') {
    return await dataEnrichmentJobApi.updatePullJob(selectedJobId, payload as UpdatePullJobDto);
  }
  return await dataEnrichmentJobApi.updatePushJob(selectedJobId, payload as UpdatePushJobDto);
};

const createNewJob = async (
  configurationType: 'push' | 'pull',
  payload: Partial<CreatePullJobDto> | Partial<CreatePushJobDto>,
): Promise<DataEnrichmentJobResponse> => {
  if (configurationType === 'pull') {
    return await dataEnrichmentJobApi.createPullJob(payload as CreatePullJobDto);
  }
  return await dataEnrichmentJobApi.createPushJob(payload as CreatePushJobDto);
};

export const saveDataEnrichmentJob = async (options: SaveJobOptions): Promise<void> => {
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
    const payload = buildJobPayload(configurationType, formValues);

    let response: DataEnrichmentJobResponse;
    if (editMode && selectedJob?.id) {
      response = await updateExistingJob(configurationType, selectedJob.id, payload);
      if (selectedJob.status === DATA_ENRICHMENT_JOB_STATUSES.REJECTED) {
        setShowSendForApproval(true);
      } else {
        if (onSave) {
          onSave(response);
        }
        if (onCloseWithRefresh) {
          onCloseWithRefresh();
        } else if (onClose) {
          onClose();
        }
        return;
      }
    } else {
      response = await createNewJob(configurationType, payload);
    }

    const responseWithMessage = response as DataEnrichmentJobResponse & { message?: string };
    const endpointName = typeof formValues.name === 'string' ? formValues.name : 'endpoint';
    const successMessage =
      responseWithMessage.message ??
      (editMode
        ? `Data enrichment endpoint "${endpointName}" updated successfully!`
        : `Data enrichment endpoint "${endpointName}" created successfully! You can now send it for approval.`);

    showSuccess('Success', successMessage);
    if (
      !responseWithMessage.status ||
      selectedJob?.status === DATA_ENRICHMENT_JOB_STATUSES.REJECTED
    ) {
      if (onSave) {
        onSave(response);
      }
    }
  } finally {
    setIsCreating(false);
  }
};

export { DATA_ENRICHMENT_SUCCESS_MESSAGES, DATA_ENRICHMENT_JOB_STATUSES };
