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
const API_BASE_URL = ENV.API_BASE_URL;

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
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    localStorage.removeItem('authToken');
    throw new Error('Authentication failed');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `HTTP error! status: ${response.status}`,
    );
  }

  return await response.json();
};

export const dataEnrichmentApi = {
  // Job endpoints
  createPullJob: async (
    data: CreatePullJobDto,
  ): Promise<DataEnrichmentJobResponse> => {
    console.log('Creating pull job with data:', JSON.stringify(data, null, 2));
    try {
      return await apiRequest<DataEnrichmentJobResponse>(
        `${API_BASE_URL}/job/create/pull`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
      );
    } catch (error) {
      console.error('Create pull job error:', error);
      throw error;
    }
  },

  createPushJob: async (
    data: CreatePushJobDto,
  ): Promise<DataEnrichmentJobResponse> => {
    console.log('Creating push job with data:', JSON.stringify(data, null, 2));
    try {
      return await apiRequest<DataEnrichmentJobResponse>(
        `${API_BASE_URL}/job/create/push`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
      );
    } catch (error) {
      console.error('Create push job error:', error);
      throw error;
    }
  },

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
    try {
      // Backend expects lowercase 'push' or 'pull' matching ConfigType enum
      const queryParams = type ? `?type=${type.toLowerCase()}` : '';
      console.log(
        `Fetching job ${id} with type=${type?.toLowerCase() || 'not specified'}`,
      );
      return await apiRequest<DataEnrichmentJobResponse>(
        `${API_BASE_URL}/job/${id}${queryParams}`,
      );
    } catch (error) {
      console.error(`Failed to fetch job ${id}:`, error);
      throw error;
    }
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

    try {
      const result = await apiRequest<
        DataEnrichmentJobResponse[] | JobListResponse
      >(`${API_BASE_URL}/job/get/status?${queryParams.toString()}`);

      // Backend returns flat array, transform to paginated format
      if (Array.isArray(result)) {
        console.log(
          '⚠️ Backend returned flat array for status filter, transforming...',
        );
        const jobs = result as DataEnrichmentJobResponse[];
        return {
          jobs: jobs,
          page: page || 1,
          limit: limit || 10,
          total: jobs.length,
          totalPages: Math.ceil(jobs.length / (limit || 10)),
        };
      }

      return result as JobListResponse;
    } catch (error) {
      console.error(`Failed to fetch jobs by status ${status}:`, error);
      throw error;
    }
  },

  // Update full pull job configuration (using PATCH endpoint)
  updatePullJob: async (
    id: string,
    updates: UpdatePullJobDto,
  ): Promise<DataEnrichmentJobResponse> => {
    console.log(
      'Updating pull job with data:',
      JSON.stringify(updates, null, 2),
    );
    try {
      return await apiRequest<DataEnrichmentJobResponse>(
        `${API_BASE_URL}/job/update/${id}?type=pull`,
        {
          method: 'PATCH',
          body: JSON.stringify(updates),
        },
      );
    } catch (error) {
      console.error(`Failed to update pull job ${id}:`, error);
      throw error;
    }
  },

  // Update full push job configuration (using PATCH endpoint)
  updatePushJob: async (
    id: string,
    updates: UpdatePushJobDto,
  ): Promise<DataEnrichmentJobResponse> => {
    console.log(
      'Updating push job with data:',
      JSON.stringify(updates, null, 2),
    );
    try {
      return await apiRequest<DataEnrichmentJobResponse>(
        `${API_BASE_URL}/job/update/${id}?type=push`,
        {
          method: 'PATCH',
          body: JSON.stringify(updates),
        },
      );
    } catch (error) {
      console.error(`Failed to update push job ${id}:`, error);
      throw error;
    }
  },

  // Delete a job
  deleteJob: async (
    id: string,
    type: 'pull' | 'push',
  ): Promise<{ success: boolean; message: string }> => {
    try {
      // Backend expects lowercase 'push' or 'pull' matching ConfigType enum
      return await apiRequest<{ success: boolean; message: string }>(
        `${API_BASE_URL}/job/${id}?type=${type.toLowerCase()}`,
        {
          method: 'DELETE',
        },
      );
    } catch (error) {
      console.error(`Failed to delete job ${id}:`, error);
      throw error;
    }
  },

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
  ): Promise<{ success: boolean; message: string }> => {
    try {
      return await apiRequest<{ success: boolean; message: string }>(
        `${API_BASE_URL}/job/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(updates),
        },
      );
    } catch (error) {
      console.error(`Failed to update job ${id}:`, error);
      throw error;
    }
  },

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
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('status', status);
      queryParams.append('type', type.toLowerCase()); // Convert to lowercase to match backend ConfigType enum

      const requestBody: { reason?: string } = {};
      if (reason) {
        requestBody.reason = reason;
      }

      console.log(
        `Updating job ${id} status to ${status} for type ${type} (sent as ${type.toLowerCase()})${reason ? ` with reason: ${reason}` : ''}`,
      );

      return await apiRequest<{ success: boolean; message: string }>(
        `${API_BASE_URL}/job/update/status/${id}?${queryParams.toString()}`,
        {
          method: 'PATCH',
          body: reason ? JSON.stringify(requestBody) : undefined,
        },
      );
    } catch (error) {
      console.error(`Failed to update job status ${id}:`, error);
      throw error;
    }
  },

  updateStatus: async (
    id: string,
    status: string,
    type: 'PULL' | 'PUSH',
    reason?: string,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('status', status);
      queryParams.append('type', type.toLowerCase()); // Convert to lowercase to match backend ConfigType enum

      const requestBody: { reason?: string, type: 'PULL' | 'PUSH', status: string } = { type, status };
      if (reason) {
        requestBody.reason = reason;
      }

      console.log(
        `Updating job ${id} status to ${status} for type ${type} (sent as ${type.toLowerCase()})${reason ? ` with reason: ${reason}` : ''}`,
      );

      return await apiRequest<{ success: boolean; message: string }>(
        `${API_BASE_URL}/job/update/status/${id}?${queryParams.toString()}`,
        {
          method: 'PATCH',
          body: reason ? JSON.stringify(requestBody) : undefined,
        },
      );
    } catch (error) {
      console.error(`Failed to update job status ${id}:`, error);
      throw error;
    }
  },

  updateJobActivation: async (
    id: string,
    isActive: boolean,
    type: 'PULL' | 'PUSH',
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('status', isActive ? 'active' : 'in-active');
      queryParams.append('type', type.toLowerCase()); // Convert to lowercase to match backend ConfigType enum

      console.log(
        `Updating job ${id} activation to ${isActive ? 'active' : 'inactive'} for type ${type} (sent as ${type.toLowerCase()})`,
      );

      return await apiRequest<{ success: boolean; message: string }>(
        `${API_BASE_URL}/job/update/activation/${id}?${queryParams.toString()}`,
        {
          method: 'PATCH',
        },
      );
    } catch (error) {
      console.error(`Failed to update job activation ${id}:`, error);
      throw error;
    }
  },

  updatePublishingStatus: async (
    id: string,
    publishingStatus: 'active' | 'in-active',
    type: 'PULL' | 'PUSH',
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const url = `${API_BASE_URL}/job/update/activation/${id}?status=${publishingStatus.toLowerCase()}&type=${type.toLowerCase()}`;

      const response = await apiRequest<{ success: boolean; message: string }>(
        url,
        {
          method: 'PATCH',
        },
      );

      console.log('✅ Job publishing status updated:', response);
      return response;
    } catch (error) {
      console.error('💥 Job publishing status update failed:', error);
      throw error;
    }
  },

  // Schedule endpoints
  createSchedule: async (
    data: ScheduleRequest,
  ): Promise<ScheduleCreateResponse> => {
    try {
      return await apiRequest<ScheduleCreateResponse>(
        `${API_BASE_URL}/scheduler/create`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
      );
    } catch (error) {
      console.error('Create schedule error:', error);
      throw error;
    }
  },

  getAllSchedules: async (
    offset = 0,
    limit = 50,
  ): Promise<ScheduleResponse[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('offset', offset.toString());
    queryParams.append('limit', limit.toString());

    const scheduler_body = {
      status: 'STATUS_04_APPROVED,STATUS_06_EXPORTED',
    };

    try {
      return await apiRequest<ScheduleResponse[]>(
        `${API_BASE_URL}/scheduler/all?${queryParams.toString()}`,
        {
          method: 'POST',
          body: JSON.stringify(scheduler_body),
        },
      );
    } catch (error) {
      console.error('Get all schedules error:', error);
      throw error;
    }
  },

  // Fetch job history / last runs for an endpoint/job
  getJobHistory: async (
    jobId?: string,
    offset = 0,
    limit = 10,
    searchingFilters?: Record<string, any>,
  ): Promise<{ success: boolean; data: any[]; total?: number; pages?: number }> => {
    try {
      const url = `http://10.10.80.34:3000/job/history?offset=${offset}&limit=${limit}`;

      // Only send body if jobId is provided
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

      const json = (await res.json()) as any;
      // Ensure we return a consistent shape
      return {
        success: json.success ?? true,
        data: json.data ?? json.jobs ?? [],
        total: json.total ?? json.count ?? undefined,
        pages: json.pages ?? json.totalPages ?? undefined,
      };
    } catch (error) {
      console.error('Failed to fetch job history:', error);
      throw error;
    }
  },

  getSchedule: async (id: string): Promise<ScheduleResponse> => {
    try {
      return await apiRequest<ScheduleResponse>(
        `${API_BASE_URL}/scheduler/${id}`,
      );
    } catch (error) {
      console.error(`Failed to fetch schedule ${id}:`, error);
      throw error;
    }
  },

  updateSchedule: async (
    id: string,
    updates: Partial<any>,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      return await apiRequest<{ success: boolean; message: string }>(
        `${API_BASE_URL}/scheduler/update/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            name: updates?.name,
            start_date: updates?.startDate,
            iterations: Number(updates?.iterations),
            cron: updates?.cronExpression || updates?.cron,
          }),
        },
      );
    } catch (error) {
      console.error(`Failed to update schedule ${id}:`, error);
      throw error;
    }
  },

  updateScheduleStatus: async (
    id: string,
    status: string,
    reason?: string,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('status', status);

      console.log(`Updating schedule ${id} status to ${status}`);

      return await apiRequest<{ success: boolean; message: string }>(
        `${API_BASE_URL}/scheduler/update/status/${id}?${queryParams.toString()}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            reason: reason || '',
          }),
        },
      );
    } catch (error) {
      console.error(`Failed to update schedule status ${id}:`, error);
      throw error;
    }
  },

  // Test endpoints for validation
  testConnection: async (
    connectionData: Partial<CreatePullJobDto | CreatePushJobDto>,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      return await apiRequest<{ success: boolean; message: string }>(
        `${DATA_ENRICHMENT_BASE_URL}/job/test/connection`,
        {
          method: 'POST',
          body: JSON.stringify(connectionData),
        },
      );
    } catch (error) {
      console.error('Connection test failed:', error);
      throw error;
    }
  },

  previewData: async (
    connectionData: Partial<CreatePullJobDto | CreatePushJobDto>,
  ): Promise<{
    totalRows: number;
    validRows: number;
    invalidRows: number;
    previewRows: Record<string, any>[];
    validationErrors: Array<{ row: number; field: string; error: string }>;
  }> => {
    try {
      return await apiRequest<{
        totalRows: number;
        validRows: number;
        invalidRows: number;
        previewRows: Record<string, any>[];
        validationErrors: Array<{ row: number; field: string; error: string }>;
      }>(`${DATA_ENRICHMENT_BASE_URL}/job/preview/data`, {
        method: 'POST',
        body: JSON.stringify(connectionData),
      });
    } catch (error) {
      console.error('Data preview failed:', error);
      throw error;
    }
  },

  getCronJobList: async (
    params: PaginationParams,
    searchingFilters?: Record<any, any>,
  ): Promise<PaginatedScheduleResponse> => {
    const url = `${API_BASE_URL}/scheduler/all?${params?.offset !== undefined ? `offset=${params.offset}&` : ''}${params?.limit !== undefined ? `limit=${params.limit}` : ''}`;

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
      throw new Error('Failed to fetch paginated schedules');
    }
    return (await res.json()) as PaginatedScheduleResponse;
  },
};
