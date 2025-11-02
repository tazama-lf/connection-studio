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

// Helper function for API requests
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const apiRequest = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
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
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
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
    page?: number,
    limit?: number,
  ): Promise<JobListResponse> => {
    console.log('\n=== getAllJobs API CALL START ===');
    console.log('Time:', new Date().toISOString());
    console.log('Input parameters:');
    console.log('  - page:', page);
    console.log('  - limit:', limit);

    const queryParams = new URLSearchParams();
    if (page) queryParams.append('page', page.toString());
    if (limit) queryParams.append('limit', limit.toString());

    const url = `${API_BASE_URL}/job/all${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    console.log('API Configuration:');
    console.log('  - API_BASE_URL:', API_BASE_URL);
    console.log('  - Query params:', queryParams.toString() || 'none');
    console.log('  - Full URL:', url);

    try {
      console.log('Making API request...');
      const result = await apiRequest<DataEnrichmentJobResponse[] | JobListResponse>(url);
      
      console.log('=== API RESPONSE RECEIVED ===');
      console.log('Response type:', typeof result);
      console.log('Response is Array?:', Array.isArray(result));
      console.log('Raw response:', JSON.stringify(result, null, 2));
      
      // Backend returns flat array, transform to paginated format
      if (Array.isArray(result)) {
        console.log('⚠️ Backend returned flat array, transforming to paginated format');
        const jobs = result as DataEnrichmentJobResponse[];
        const transformedResponse: JobListResponse = {
          jobs: jobs,
          page: page || 1,
          limit: limit || 10,
          total: jobs.length,
          totalPages: Math.ceil(jobs.length / (limit || 10))
        };
        console.log('Transformed response:', transformedResponse);
        console.log('=== getAllJobs API CALL SUCCESS (transformed) ===\n');
        return transformedResponse;
      }
      
      // If already in correct format, return as is
      console.log('Response already in paginated format');
      console.log('=== getAllJobs API CALL SUCCESS ===\n');
      return result as JobListResponse;
    } catch (error) {
      console.error('=== getAllJobs API CALL FAILED ===');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Full error:', error);
      console.error('=== getAllJobs API CALL END ===\n');
      throw error;
    }
  },

  getJob: async (id: string, type?: 'PULL' | 'PUSH'): Promise<DataEnrichmentJobResponse> => {
    try {
      // Backend expects lowercase 'push' or 'pull' matching ConfigType enum
      const queryParams = type ? `?type=${type.toLowerCase()}` : '';
      console.log(`Fetching job ${id} with type=${type?.toLowerCase() || 'not specified'}`);
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
      const result = await apiRequest<DataEnrichmentJobResponse[] | JobListResponse>(
        `${API_BASE_URL}/job/get/status?${queryParams.toString()}`,
      );
      
      // Backend returns flat array, transform to paginated format
      if (Array.isArray(result)) {
        console.log('⚠️ Backend returned flat array for status filter, transforming...');
        const jobs = result as DataEnrichmentJobResponse[];
        return {
          jobs: jobs,
          page: page || 1,
          limit: limit || 10,
          total: jobs.length,
          totalPages: Math.ceil(jobs.length / (limit || 10))
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
    console.log('Updating pull job with data:', JSON.stringify(updates, null, 2));
    try {
      return await apiRequest<DataEnrichmentJobResponse>(
        `${API_BASE_URL}/job/update/pull/${id}`,
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
    console.log('Updating push job with data:', JSON.stringify(updates, null, 2));
    try {
      return await apiRequest<DataEnrichmentJobResponse>(
        `${API_BASE_URL}/job/update/push/${id}`,
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
  deleteJob: async (id: string, type: 'pull' | 'push'): Promise<{ success: boolean; message: string }> => {
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
      job_status: 'pending' | 'approved' | 'in-progress' | 'rejected';
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
    status: 'pending' | 'approved' | 'in-progress' | 'rejected' | 'exported' | 'under-review' | 'ready-for-deployment' | 'deployed' | 'suspended',
    type: 'PULL' | 'PUSH',
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('status', status);
      queryParams.append('type', type.toLowerCase()); // Convert to lowercase to match backend ConfigType enum

      console.log(`Updating job ${id} status to ${status} for type ${type} (sent as ${type.toLowerCase()})`);
      
      return await apiRequest<{ success: boolean; message: string }>(
        `${API_BASE_URL}/job/update/status/${id}?${queryParams.toString()}`,
        {
          method: 'PATCH',
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

      console.log(`Updating job ${id} activation to ${isActive ? 'active' : 'inactive'} for type ${type} (sent as ${type.toLowerCase()})`);

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
    page = 1,
    limit = 50,
  ): Promise<ScheduleResponse[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());

    try {
      return await apiRequest<ScheduleResponse[]>(
        `${API_BASE_URL}/scheduler/all?${queryParams.toString()}`,
      );
    } catch (error) {
      console.error('Get all schedules error:', error);
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
    updates: Partial<ScheduleRequest>,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      return await apiRequest<{ success: boolean; message: string }>(
        `${API_BASE_URL}/scheduler/update/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(updates),
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
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('status', status);

      console.log(`Updating schedule ${id} status to ${status}`);
      
      return await apiRequest<{ success: boolean; message: string }>(
        `${API_BASE_URL}/scheduler/update/status/${id}?${queryParams.toString()}`,
        {
          method: 'PATCH',
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
      }>(
        `${DATA_ENRICHMENT_BASE_URL}/job/preview/data`,
        {
          method: 'POST',
          body: JSON.stringify(connectionData),
        },
      );
    } catch (error) {
      console.error('Data preview failed:', error);
      throw error;
    }
  },

};