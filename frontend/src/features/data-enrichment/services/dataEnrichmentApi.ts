import { ENV } from '../../../shared/config/environment.config';
import { apiRequest } from '../../../shared/services/tokenManager';
import type {
  CreatePullJobDto,
  CreatePushJobDto,
  DataEnrichmentJobResponse,
  JobListResponse,
  ScheduleResponse,
  ScheduleCreateResponse,
  ScheduleRequest,
} from '../types';

const DATA_ENRICHMENT_BASE_URL = ENV.DATA_ENRICHMENT_SERVICE_URL;
const API_BASE_URL = ENV.API_BASE_URL;

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
    console.log('=== getAllJobs API CALL ===');
    console.log('Input parameters - page:', page, 'limit:', limit);

    const queryParams = new URLSearchParams();
    if (page) queryParams.append('page', page.toString());
    if (limit) queryParams.append('limit', limit.toString());

    const url = `${API_BASE_URL}/job/all${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    console.log('Base URL:', API_BASE_URL);
    console.log('Final request URL:', url);

    try {
      const result = await apiRequest<JobListResponse>(url);
      console.log('Raw API response:', result);
      console.log('Jobs in response:', result?.jobs?.length || 0);
      console.log('Total in response:', result?.total);
      return result;
    } catch (error) {
      console.error('Get all jobs error:', error);
      throw error;
    }
  },

  getJob: async (id: string): Promise<DataEnrichmentJobResponse> => {
    try {
      return await apiRequest<DataEnrichmentJobResponse>(
        `${API_BASE_URL}/job/${id}`,
      );
    } catch (error) {
      console.error(`Failed to fetch job ${id}:`, error);
      throw error;
    }
  },

  getJobsByStatus: async (
    status: 'PENDING' | 'IN-PROGRESS' | 'SUSPENDED' | 'CLONED',
    page?: number,
    limit?: number,
  ): Promise<JobListResponse> => {
    const queryParams = new URLSearchParams();
    queryParams.append('status', status);
    if (page) queryParams.append('page', page.toString());
    if (limit) queryParams.append('limit', limit.toString());

    try {
      return await apiRequest<JobListResponse>(
        `${API_BASE_URL}/job/get/status?${queryParams.toString()}`,
      );
    } catch (error) {
      console.error(`Failed to fetch jobs by status ${status}:`, error);
      throw error;
    }
  },

  updateJob: async (
    id: string,
    updates: Partial<{
      job_status: 'PENDING' | 'IN-PROGRESS' | 'SUSPENDED' | 'CLONED';
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
    status: 'PENDING' | 'IN-PROGRESS' | 'SUSPENDED' | 'CLONED',
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('status', status);
      queryParams.append('type', 'PULL'); // Assuming PULL type for now

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
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('status', isActive ? 'active' : 'in-active');
      queryParams.append('type', 'PULL'); // Assuming PULL type for now

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

  getSchedule: async (id: number): Promise<ScheduleResponse> => {
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
    id: number,
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

  // Preview data from connection
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
      }>(`${DATA_ENRICHMENT_BASE_URL}/job/preview`, {
        method: 'POST',
        body: JSON.stringify(connectionData),
      });
    } catch (error) {
      console.error('Data preview failed:', error);
      throw error;
    }
  },
};
