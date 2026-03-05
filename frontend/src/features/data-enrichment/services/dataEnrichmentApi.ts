import { getDemsStatusLov } from '@shared/lovs';
import { ENV } from '../../../shared/config/environment.config';

import type {
  CreatePullJobDto,
  CreatePushJobDto,
  UpdatePullJobDto,
  UpdatePushJobDto,
  DataEnrichmentJobResponse,
  JobListResponse,
  ScheduleResponse,
  ScheduleCreateResponse,
  ScheduleRequest,
} from '../types';

const DATA_ENRICHMENT_BASE_URL = ENV.DATA_ENRICHMENT_SERVICE_URL;
const {API_BASE_URL} = ENV;
const HTTP_UNAUTHORIZED = 401;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const DEFAULT_OFFSET = 0;
const DEFAULT_SCHEDULER_LIMIT = 50;

interface PaginatedJobResponse {
  success: boolean;
  data: DataEnrichmentJobResponse[];
  total: number;
  limit: number;
  offset: number;
  pages: number;
}

interface PaginatedScheduleResponse {
  success: boolean;
  data: ScheduleResponse[];
  total: number;
  limit: number;
  offset: number;
  pages: number;
}

interface PaginationParams {
  limit: number;
  offset: number;
  userRole: string;
}

// Helper function for API requests
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const apiRequest = async <T>(
  url: string,
  options: RequestInit = {},
): Promise<T> => {
  const authHeaders = getAuthHeaders() as Record<string, string>;
  const optionsHeaders = (options.headers ?? {}) as Record<string, string>;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders,
      ...optionsHeaders,
    },
  });

  if (response.status === HTTP_UNAUTHORIZED) {
    localStorage.removeItem('authToken');
    throw new Error('Authentication failed');
  }

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(
      errorData.message ?? `HTTP error! status: ${response.status}`,
    );
  }

  return (await response.json()) as T;
};

export const dataEnrichmentApi = {
  // Job endpoints
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
    searchingFilters?: Record<string, unknown>,
  ): Promise<PaginatedJobResponse> => {
    const url = `${API_BASE_URL}/job/all?offset=${params.offset}&limit=${params.limit}`;

    const { status, ...otherFilters } = searchingFilters ?? {};
    let statusFilter;

    if (!status) {
      const userRole = params.userRole as keyof typeof getDemsStatusLov;
      const statusList = getDemsStatusLov[userRole];
      statusFilter = statusList.map((item) => item.value).join(',');
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        ...otherFilters,
        status: status ?? statusFilter,
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
    // Backend expects lowercase 'push' or 'pull' matching ConfigType enum
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

    // Backend returns flat array, transform to paginated format
    if (Array.isArray(result)) {
      const jobs = result;
      const pageNum = page ?? DEFAULT_PAGE;
      const limitNum = limit ?? DEFAULT_LIMIT;
      return {
        jobs,
        page: pageNum,
        limit: limitNum,
        total: jobs.length,
        totalPages: Math.ceil(jobs.length / limitNum),
      };
    }

    return result;
  },

  // Update full pull job configuration (using PATCH endpoint)
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

  // Update full push job configuration (using PATCH endpoint)
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

  // Delete a job
  deleteJob: async (
    id: string,
    type: 'pull' | 'push',
  ): Promise<{ success: boolean; message: string }> => 
    // Backend expects lowercase 'push' or 'pull' matching ConfigType enum
    await apiRequest<{ success: boolean; message: string }>(
      `${API_BASE_URL}/job/${id}?type=${type.toLowerCase()}`,
      {
        method: 'DELETE',
      },
    ),

  // Legacy generic update (for backward compatibility)
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
    queryParams.append('type', type.toLowerCase()); // Convert to lowercase to match backend ConfigType enum

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
    queryParams.append('type', type.toLowerCase()); // Convert to lowercase to match backend ConfigType enum

    const requestBody: { reason?: string, type: 'PULL' | 'PUSH', status: string } = { type, status };
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
    queryParams.append('type', type.toLowerCase()); // Convert to lowercase to match backend ConfigType enum

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

    return await apiRequest<{ success: boolean; message: string }>(
      url,
      {
        method: 'PATCH',
      },
    );
  },

  // Schedule endpoints
  createSchedule: async (
    data: ScheduleRequest,
  ): Promise<ScheduleCreateResponse> => 
    await apiRequest<ScheduleCreateResponse>(
      `${API_BASE_URL}/scheduler/create`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    ),

  getAllSchedules: async (
    offset = DEFAULT_OFFSET,
    limit = DEFAULT_SCHEDULER_LIMIT,
  ): Promise<ScheduleResponse[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('offset', offset.toString());
    queryParams.append('limit', limit.toString());

    const schedulerBody = {
      status: 'STATUS_04_APPROVED,STATUS_06_EXPORTED',
    };

    return await apiRequest<ScheduleResponse[]>(
      `${API_BASE_URL}/scheduler/all?${queryParams.toString()}`,
      {
        method: 'POST',
        body: JSON.stringify(schedulerBody),
      },
    );
  },

  // Fetch job history / last runs for an endpoint/job
  getJobHistory: async (
    jobId?: string,
    offset = DEFAULT_OFFSET,
    limit = DEFAULT_LIMIT,
    searchingFilters?: Record<string, unknown>,
  ): Promise<{ success: boolean; data: unknown[]; total?: number; pages?: number }> => {
    const url = `http://10.10.80.34:3000/job/history?offset=${offset}&limit=${limit}`;

    // Only send body if jobId is provided
    const requestOptions: RequestInit = {
      method: 'POST',
      headers: getAuthHeaders(),
    };

    const body: Record<string, unknown> = { ...searchingFilters };
    if (jobId) body.job_id = jobId;

    requestOptions.body = JSON.stringify(body);

    const res = await fetch(url, requestOptions);

    if (!res.ok) {
      throw new Error('Failed to fetch job history');
    }

    const json = (await res.json()) as { success?: boolean; data?: unknown[]; jobs?: unknown[]; total?: number; count?: number; pages?: number; totalPages?: number };
    // Ensure we return a consistent shape
    return {
      success: json.success ?? true,
      data: json.data ?? json.jobs ?? [],
      total: json.total ?? json.count ?? undefined,
      pages: json.pages ?? json.totalPages ?? undefined,
    };
  },

  getSchedule: async (id: string): Promise<ScheduleResponse> => 
    await apiRequest<ScheduleResponse>(
      `${API_BASE_URL}/scheduler/${id}`,
    ),

  updateSchedule: async (
    id: string,
    updates: Partial<{
      name?: string;
      startDate?: string;
      iterations?: number;
      cronExpression?: string;
      cron?: string;
    }>,
  ): Promise<{ success: boolean; message: string }> => 
    await apiRequest<{ success: boolean; message: string }>(
      `${API_BASE_URL}/scheduler/update/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          name: updates.name,
          start_date: updates.startDate,
          iterations: Number(updates.iterations),
          cron: updates.cronExpression ?? updates.cron,
        }),
      },
    ),

  updateScheduleStatus: async (
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

  // Test endpoints for validation
  testConnection: async (
    connectionData: Partial<CreatePullJobDto | CreatePushJobDto>,
  ): Promise<{ success: boolean; message: string }> => 
    await apiRequest<{ success: boolean; message: string }>(
      `${DATA_ENRICHMENT_BASE_URL}/job/test/connection`,
      {
        method: 'POST',
        body: JSON.stringify(connectionData),
      },
    ),

  previewData: async (
    connectionData: Partial<CreatePullJobDto | CreatePushJobDto>,
  ): Promise<{
    totalRows: number;
    validRows: number;
    invalidRows: number;
    previewRows: Array<Record<string, unknown>>;
    validationErrors: Array<{ row: number; field: string; error: string }>;
  }> => 
    await apiRequest<{
      totalRows: number;
      validRows: number;
      invalidRows: number;
      previewRows: Array<Record<string, unknown>>;
      validationErrors: Array<{ row: number; field: string; error: string }>;
    }>(`${DATA_ENRICHMENT_BASE_URL}/job/preview/data`, {
      method: 'POST',
      body: JSON.stringify(connectionData),
    }),

  getCronJobList: async (
    params: PaginationParams,
    searchingFilters?: Record<string, unknown>,
  ): Promise<PaginatedScheduleResponse> => {
    const url = `${API_BASE_URL}/scheduler/all?offset=${params.offset}&limit=${params.limit}`;

    const { status, ...otherFilters } = searchingFilters ?? {};
    let statusFilter;

    if (!status) {
      const userRole = params.userRole as keyof typeof getDemsStatusLov;
      const statusList = getDemsStatusLov[userRole];
      statusFilter = statusList.map((item) => item.value).join(',');
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        ...otherFilters,
        status: status ?? statusFilter,
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to fetch paginated schedules');
    }
    return (await res.json()) as PaginatedScheduleResponse;
  },
};
