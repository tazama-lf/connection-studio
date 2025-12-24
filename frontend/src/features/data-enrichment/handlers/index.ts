import { getDemsStatusLov } from '@shared/lovs';
import { ENV } from '../../../shared/config/environment.config';
import { getAuthHeaders, apiRequest } from '@utils/common/apiHelper';
import { getDataEnrichmentErrorMessage, formatJobForEdit } from '../utils';
import type {
  CreatePullJobDto,
  CreatePushJobDto,
  UpdatePullJobDto,
  UpdatePushJobDto,
  DataEnrichmentJobResponse,
  JobListResponse,
  PaginationParams,
  PaginatedJobResponse,
} from '../types';
import {
  DE_JOB_SUCCESS_MESSAGES,
  DE_JOB_STATUSES,
} from '../constants';

const DATA_ENRICHMENT_BASE_URL = ENV.DATA_ENRICHMENT_SERVICE_URL;
const { API_BASE_URL } = ENV;


export const dataEnrichmentApi = {
  createPullJob: async (
    data: CreatePullJobDto,
  ): Promise<DataEnrichmentJobResponse> =>
    await apiRequest<DataEnrichmentJobResponse>(
      `${API_BASE_URL}/job/create/pull`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    ),

  createPushJob: async (
    data: CreatePushJobDto,
  ): Promise<DataEnrichmentJobResponse> =>
    await apiRequest<DataEnrichmentJobResponse>(
      `${API_BASE_URL}/job/create/push`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    ),

  getAllJobs: async (
    params: PaginationParams,
    searchingFilters?: Record<any, any>,
  ): Promise<PaginatedJobResponse> => {
    const url = `${API_BASE_URL}/job/all?${params?.offset !== undefined ? `offset=${params.offset}&` : ''}${params?.limit !== undefined ? `limit=${params.limit}` : ''}`;

    const { status, ...otherFilters } = searchingFilters || {};
    let statusFilter;

    if (!status) {
      const userRole = params.userRole as keyof typeof getDemsStatusLov;
      statusFilter =
        getDemsStatusLov[userRole]?.map((item) => item.value)?.join(',') || '';
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        ...otherFilters,
        status: status || statusFilter,
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to fetch data enrichment jobs');
    }

    return (await res.json()) as PaginatedJobResponse;
  },

  getJob: async (
    id: string,
    type?: 'PULL' | 'PUSH',
  ): Promise<DataEnrichmentJobResponse> => {
    const queryParams = type ? `?type=${type.toLowerCase()}` : '';
    return await apiRequest<DataEnrichmentJobResponse>(
      `${API_BASE_URL}/job/${id}${queryParams}`,
    );
  },

  getJobsByStatus: async (
    status: 'pending' | 'approved' | 'in-progress' | 'rejected',
    page?: number,
    limit?: number,
  ): Promise<JobListResponse> => {
    const queryParams = new URLSearchParams();
    queryParams.append('status', status);
    if (page) queryParams.append('page', page.toString());
    if (limit) queryParams.append('limit', limit.toString());

    const result = await apiRequest<
      DataEnrichmentJobResponse[] | JobListResponse
    >(`${API_BASE_URL}/job/get/status?${queryParams.toString()}`);

    if (Array.isArray(result)) {
      const jobs = result;
      return {
        jobs,
        page: page || 1,
        limit: limit || 10,
        total: jobs.length,
        totalPages: Math.ceil(jobs.length / (limit || 10)),
      };
    }

    return result;
  },

  updatePullJob: async (
    id: string,
    updates: UpdatePullJobDto,
  ): Promise<DataEnrichmentJobResponse> =>
    await apiRequest<DataEnrichmentJobResponse>(
      `${API_BASE_URL}/job/update/${id}?type=pull`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      },
    ),

  updatePushJob: async (
    id: string,
    updates: UpdatePushJobDto,
  ): Promise<DataEnrichmentJobResponse> =>
    await apiRequest<DataEnrichmentJobResponse>(
      `${API_BASE_URL}/job/update/${id}?type=push`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      },
    ),

  deleteJob: async (
    id: string,
    type: 'pull' | 'push',
  ): Promise<{ success: boolean; message: string }> =>
    await apiRequest<{ success: boolean; message: string }>(
      `${API_BASE_URL}/job/${id}?type=${type.toLowerCase()}`,
      {
        method: 'DELETE',
      },
    ),

  updateJob: async (
    id: string,
    updates: Partial<{
      job_status:
        | 'STATUS_01_IN_PROGRESS'
        | 'STATUS_02_ON_HOLD'
        | 'STATUS_03_UNDER_REVIEW'
        | 'STATUS_04_APPROVED'
        | 'STATUS_05_REJECTED'
        | 'STATUS_06_EXPORTED'
        | 'STATUS_07_READY_FOR_DEPLOYMENT'
        | 'STATUS_08_DEPLOYED';
    }>,
  ): Promise<{ success: boolean; message: string }> =>
    await apiRequest<{ success: boolean; message: string }>(
      `${API_BASE_URL}/job/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      },
    ),

  updateJobStatus: async (
    id: string,
    status:
      | 'STATUS_01_IN_PROGRESS'
      | 'STATUS_02_ON_HOLD'
      | 'STATUS_03_UNDER_REVIEW'
      | 'STATUS_04_APPROVED'
      | 'STATUS_05_REJECTED'
      | 'STATUS_06_EXPORTED'
      | 'STATUS_07_READY_FOR_DEPLOYMENT'
      | 'STATUS_08_DEPLOYED',
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

  updateJobActivation: async (
    id: string,
    isActive: boolean,
    type: 'PULL' | 'PUSH',
  ): Promise<{ success: boolean; message: string }> => {
    const queryParams = new URLSearchParams();
    queryParams.append('status', isActive ? 'active' : 'in-active');
    queryParams.append('type', type.toLowerCase());

    return await apiRequest<{ success: boolean; message: string }>(
      `${API_BASE_URL}/job/update/activation/${id}?${queryParams.toString()}`,
      {
        method: 'PATCH',
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

  previewData: async (
    connectionData: Partial<CreatePullJobDto | CreatePushJobDto>,
  ): Promise<{
    totalRows: number;
    validRows: number;
    invalidRows: number;
    previewRows: Array<Record<string, any>>;
    validationErrors: Array<{ row: number; field: string; error: string }>;
  }> =>
    await apiRequest<{
      totalRows: number;
      validRows: number;
      invalidRows: number;
      previewRows: Array<Record<string, any>>;
      validationErrors: Array<{ row: number; field: string; error: string }>;
    }>(`${DATA_ENRICHMENT_BASE_URL}/job/preview/data`, {
      method: 'POST',
      body: JSON.stringify(connectionData),
    }),

  getJobHistory: async (
    jobId?: string,
    offset = 0,
    limit = 10,
    searchingFilters?: Record<string, any>,
  ): Promise<{
    success: boolean;
    data: any[];
    total?: number;
    pages?: number;
  }> => {
    const url = `http://10.10.80.34:3000/job/history?offset=${offset}&limit=${limit}`;

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: getAuthHeaders(),
    };

    const body: Record<string, any> = { ...searchingFilters };
    if (jobId) body.job_id = jobId;

    requestOptions.body = JSON.stringify(body);

    const res = await fetch(url, requestOptions);

    if (!res.ok) {
      throw new Error('Failed to fetch job history');
    }

    const json = await res.json();
    return {
      success: json.success ?? true,
      data: json.data ?? json.jobs ?? [],
      total: json.total ?? json.count ?? undefined,
      pages: json.pages ?? json.totalPages ?? undefined,
    };
  },
};

export const submitPullJob = async (data: CreatePullJobDto) =>
  await dataEnrichmentApi.createPullJob(data);

export const submitPushJob = async (data: CreatePushJobDto) =>
  await dataEnrichmentApi.createPushJob(data);

export const loadJobs = async (
  pageNumber: number,
  itemsPerPage: number,
  userRole: string,
  searchingFilters: Record<string, unknown>,
): Promise<PaginatedJobResponse> => {
  const limit: number = itemsPerPage;
  const offset: number = pageNumber - 1;
  const params = { limit, offset, userRole };

  return await dataEnrichmentApi.getAllJobs(params, searchingFilters);
};

export const updatePullJobData = async (
  jobId: string,
  updates: UpdatePullJobDto,
) => await dataEnrichmentApi.updatePullJob(jobId, updates);

export const updatePushJobData = async (
  jobId: string,
  updates: UpdatePushJobDto,
) => await dataEnrichmentApi.updatePushJob(jobId, updates);

export const deleteJobData = async (jobId: string, type: 'pull' | 'push') =>
  await dataEnrichmentApi.deleteJob(jobId, type);

export const sendForApproval = async (
  jobId: string,
  type: 'PULL' | 'PUSH',
) =>
  await dataEnrichmentApi.updateStatus(
    jobId,
    DE_JOB_STATUSES.UNDER_REVIEW,
    type,
  );

export const approveJob = async (jobId: string, type: 'PULL' | 'PUSH') =>
  await dataEnrichmentApi.updateStatus(jobId, DE_JOB_STATUSES.APPROVED, type);

export const rejectJob = async (
  jobId: string,
  type: 'PULL' | 'PUSH',
  reason?: string,
) => await dataEnrichmentApi.updateStatus(jobId, DE_JOB_STATUSES.REJECTED, type, reason);

export const exportJob = async (jobId: string, type: 'PULL' | 'PUSH') =>
  await dataEnrichmentApi.updateStatus(jobId, DE_JOB_STATUSES.EXPORTED, type);

export const deployJob = async (jobId: string, type: 'PULL' | 'PUSH') =>
  await dataEnrichmentApi.updateStatus(jobId, DE_JOB_STATUSES.DEPLOYED, type);

export const activateJob = async (jobId: string, type: 'PULL' | 'PUSH') =>
  await dataEnrichmentApi.updateJobActivation(jobId, true, type);

export const deactivateJob = async (jobId: string, type: 'PULL' | 'PUSH') =>
  await dataEnrichmentApi.updateJobActivation(jobId, false, type);

export const prepareJobForEdit = (job: DataEnrichmentJobResponse) =>
  formatJobForEdit(job);

export const getErrorMessage = (error: unknown) =>
  getDataEnrichmentErrorMessage(error);

export { DE_JOB_SUCCESS_MESSAGES, DE_JOB_STATUSES };
