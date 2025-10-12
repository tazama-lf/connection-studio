import { ENV } from '../../../shared/config/environment.config';
import { apiRequest } from '../../../shared/services/tokenManager';
import type {
  CreatePullJobDto,
  CreatePushJobDto,
  DataEnrichmentJobResponse,
  JobListResponse,
  ScheduleResponse,
  ScheduleRequest,
} from '../types';

const DATA_ENRICHMENT_BASE_URL = ENV.DATA_ENRICHMENT_SERVICE_URL;

export const dataEnrichmentApi = {
  // Job endpoints
  createPullJob: async (
    data: CreatePullJobDto,
  ): Promise<DataEnrichmentJobResponse> => {
    console.log('Creating pull job with data:', JSON.stringify(data, null, 2));
    try {
      return await apiRequest<DataEnrichmentJobResponse>(
        `${DATA_ENRICHMENT_BASE_URL}/job/create/pull`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
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
        `${DATA_ENRICHMENT_BASE_URL}/job/create/push`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
    } catch (error) {
      console.error('Create push job error:', error);
      throw error;
    }
  },

  getAllJobs: async (page?: number, limit?: number): Promise<JobListResponse> => {
    console.log('=== getAllJobs API CALL ===');
    console.log('Input parameters - page:', page, 'limit:', limit);
    
    const queryParams = new URLSearchParams();
    if (page) queryParams.append('page', page.toString());
    if (limit) queryParams.append('limit', limit.toString());
    
    const url = `${DATA_ENRICHMENT_BASE_URL}/job/all${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    console.log('Base URL:', DATA_ENRICHMENT_BASE_URL);
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
      return await apiRequest<DataEnrichmentJobResponse>(`${DATA_ENRICHMENT_BASE_URL}/job/${id}`);
    } catch (error) {
      console.error(`Failed to fetch job ${id}:`, error);
      throw error;
    }
  },

  // Schedule endpoints
  createSchedule: async (data: ScheduleRequest): Promise<ScheduleResponse> => {
    const url = `${DATA_ENRICHMENT_BASE_URL}/schedule/create`;
    console.log('Creating schedule at:', url, 'with data:', data);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    console.log('Create schedule API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Create schedule API error:', errorData);
      throw new Error(
        errorData.message || `Failed to create schedule: ${response.status}`,
      );
    }

    const responseData = await response.json();
    console.log('Create schedule API response data:', responseData);
    return responseData;
  },

  getAllSchedules: async (
    page = 1,
    limit = 50,
  ): Promise<ScheduleResponse[]> => {
    const url = `${DATA_ENRICHMENT_BASE_URL}/schedule/all?page=${page}&limit=${limit}`;
    console.log('Fetching schedules from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Schedule API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Schedule API error:', errorText);
      throw new Error(
        `Failed to fetch schedules: ${response.status} - ${errorText}`,
      );
    }

    const data = await response.json();
    console.log('Schedule API response data:', data);
    return data;
  },

  getSchedule: async (id: number): Promise<ScheduleResponse> => {
    const response = await fetch(`${DATA_ENRICHMENT_BASE_URL}/schedule/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch schedule: ${response.status}`);
    }

    return response.json();
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
        }
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
      }>(
        `${DATA_ENRICHMENT_BASE_URL}/job/preview`,
        {
          method: 'POST',
          body: JSON.stringify(connectionData),
        }
      );
    } catch (error) {
      console.error('Data preview failed:', error);
      throw error;
    }
  },
};
