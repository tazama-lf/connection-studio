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
  PaginatedJobResponse, PaginationParams
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

  getJobHistory: async (
    jobId: string | undefined,
    offset = 0,
    limit = 10,
    searchingFilters?: Record<string, unknown>,
  ): Promise<{ data: any[]; total: number; limit: number; offset: number }> => {
    const queryParams = new URLSearchParams();
    queryParams.append('offset', offset.toString());
    queryParams.append('limit', limit.toString());

    const body: Record<string, unknown> = searchingFilters ? { ...(searchingFilters) } : {};
    if (jobId) {
      body.jobId = jobId;
    }

    return await apiRequest<any>(
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
        name: updates?.name,
        start_date: updates?.start_date,
        iterations: Number(updates?.iterations),
        cron: updates?.cron,
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
) => {
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
  onApprove:
    | ((jobId: string, jobType: 'PULL' | 'PUSH', comment?: string) => void)
    | undefined,
  onClose: () => void,
  setShowApproveConfirmDialog: (show: boolean) => void,
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
  setEditedJob: React.Dispatch<
    React.SetStateAction<Partial<DataEnrichmentJobResponse>>
  >,
) => {
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
) => {
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
  onApprove:
    | ((
      jobId: string,
      jobType: 'PULL' | 'PUSH',
      comment?: string,
    ) => Promise<void>)
    | undefined,
  setShowApproveConfirmDialog: (show: boolean) => void,
  setIsSaving: (saving: boolean) => void,
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

export const determineSourceType = (
  job: DataEnrichmentJobResponse,
): 'HTTP' | 'SFTP' => {
  if (job.source_type) {
    return job.source_type as 'HTTP' | 'SFTP';
  }

  if (job.connection) {
    let connectionObj = job.connection;

    if (typeof job.connection === 'string') {
      try {
        connectionObj = JSON.parse(job.connection);
      } catch (e) {
        return 'HTTP';
      }
    }

    if (connectionObj && typeof connectionObj === 'object') {
      if ('host' in connectionObj && connectionObj.host) {
        return 'SFTP';
      } else if ('url' in connectionObj && connectionObj.url) {
        return 'HTTP';
      }
    }
  }

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
  onClose: () => void,
) => {
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
    let result;

    if (job.type === 'pull') {
      const sourceType = determineSourceType(job);
      let connectionData = job.connection;
      if (!connectionData) {
        if (sourceType === 'SFTP') {
          connectionData = {
            host: '',
            port: 22,
            user_name: '',
            auth_type: 'USERNAME_PASSWORD' as const,
            password: '',
          };
          showError(
            'This pull job is missing connection information. Please check the original job and ensure it has proper SFTP connection details.',
          );
          setIsCloning(false);
          return;
        } else {
          connectionData = {
            url: '',
            headers: {},
          };
          showError(
            'This pull job is missing connection information. Please check the original job and ensure it has proper HTTP connection details.',
          );
          setIsCloning(false);
          return;
        }
      }

      let scheduleId = job.schedule_id;

      if (!scheduleId) {
        showSuccess('Finding or creating schedule for cloned job...');
        try {
          const schedules = await scheduleApi.getAll();
          const approvedSchedules = schedules.filter(
            (schedule: any) =>
              schedule.status === 'approved' ||
              schedule.status === 'exported' ||
              schedule.status === 'deployed',
          );

          if (approvedSchedules.length > 0) {
            scheduleId = approvedSchedules[0].id;
          } else {
            const defaultSchedule = await scheduleApi.create({
              name: `Schedule for ${newEndpointName} (Cloned)`,
              cron: '0 */6 * * *',
              iterations: -1,
              status: 'approved',
            });

            if (defaultSchedule.success) {
              const createdSchedules = await scheduleApi.getAll();
              const newSchedule = createdSchedules.find(
                (s: any) =>
                  s.name === `Schedule for ${newEndpointName} (Cloned)`,
              );
              scheduleId = newSchedule?.id;
            }
          }
        } catch (scheduleError) {
          showError(
            'Failed to create or find a schedule for the cloned job. Please try again.',
          );
          setIsCloning(false);
          return;
        }
      }

      if (!scheduleId) {
        showError(
          'Could not determine a valid schedule for the cloned job. Please contact support.',
        );
        setIsCloning(false);
        return;
      }

      const pullJobData = {
        endpoint_name: newEndpointName.trim(),
        version: newVersion.trim(),
        schedule_id: scheduleId,
        source_type: sourceType,
        description: job.description ? job.description : 'Cloned job',
        connection: connectionData,
        table_name: job.table_name || '',
        mode: job.mode || ('append' as 'append' | 'replace'),
        ...(job.file && { file: job.file }),
      };

      result = await dataEnrichmentJobApi.createPullJob(pullJobData);
    } else {
      const pushJobData = {
        endpoint_name: job.endpoint_name,
        version: newVersion.trim(),
        path: job.path || '',
        description: job.description ? job.description : 'Cloned job',
        table_name: job.table_name || '',
        mode: job.mode || ('append' as 'append' | 'replace'),
      };

      result = await dataEnrichmentJobApi.createPushJob(pushJobData);
    }

    if (result && result.id) {
      showSuccess(
        `${job.type === 'pull' ? 'Pull' : 'Push'} job cloned successfully as version ${newVersion}`,
      );
      onSuccess?.();
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
) => {
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
) => {
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
) => {
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
) => {
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
) => {
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
) => {
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
  value: any,
  setFormData: React.Dispatch<React.SetStateAction<any>>,
) => {
  setFormData((prev: any) => ({
    ...prev,
    [field]: value,
  }));
};

export const handleContinue = (
  setShowConfigForm: React.Dispatch<React.SetStateAction<boolean>>,
) => {
  setShowConfigForm(true);
};

export const handleSaveForm = async (
  formData: any,
  onSave: ((data: any) => Promise<void>) | undefined,
  setIsSaving: (saving: boolean) => void,
  showSuccess: (message: string) => void,
  showError: (message: string) => void,
) => {
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

export const handleSaveEdit = async (
  job: DataEnrichmentJobResponse | null,
  editedData: Partial<DataEnrichmentJobResponse>,
  setIsSaving: (saving: boolean) => void,
  showSuccess: (message: string) => void,
  showError: (message: string) => void,
  onSuccess: (() => void) | undefined,
  onClose: () => void,
) => {
  if (!job) return;

  try {
    setIsSaving(true);
    const jobType = job.type === 'push' ? 'PUSH' : 'PULL';

    const cleanedData = Object.fromEntries(
      Object.entries(editedData).filter(([_, value]) => value !== null),
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
    showError('Failed to save job');
  } finally {
    setIsSaving(false);
  }
};

export const handleUpdateConfirm = (
  onUpdate: (() => void) | undefined,
  setShowUpdateDialog: (show: boolean) => void,
) => {
  onUpdate?.();
  setShowUpdateDialog(false);
};

export const handleEditSendForApprovalConfirm = async (
  job: DataEnrichmentJobResponse | null,
  showSuccess: (message: string) => void,
  showError: (message: string) => void,
  onSuccess: (() => void) | undefined,
  setShowApprovalDialog: (show: boolean) => void,
) => {
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
) => {
  const url = jobId
    ? `${historyRoute}?jobId=${encodeURIComponent(jobId)}`
    : historyRoute;

  if (url) {
    navigate(url);
  }
};

export const submitPullJob = async (data: CreatePullJobDto) => await dataEnrichmentJobApi.createPullJob(data);

export const submitPushJob = async (data: CreatePushJobDto) => await dataEnrichmentJobApi.createPushJob(data);

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

export const sendForApproval = async (
  jobId: string,
  jobType: 'PULL' | 'PUSH',
) =>
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
  const offset: number = pageNumber;
  const params = { limit, offset, userRole };

  return await dataEnrichmentJobApi.getList(params, searchingFilters);
};

export const loadSchedules = async (): Promise<ScheduleResponse[]> => await scheduleApi.getAll();

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
    if (
      !response?.status ||
      selectedJob?.status === DATA_ENRICHMENT_JOB_STATUSES.REJECTED
    ) {
      if (onSave) onSave(response);
    }
  } catch (error) {
    throw error;
  } finally {
    setIsCreating(false);
  }
};

export { DATA_ENRICHMENT_SUCCESS_MESSAGES, DATA_ENRICHMENT_JOB_STATUSES };
