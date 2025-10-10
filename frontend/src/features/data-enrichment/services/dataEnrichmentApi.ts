import { ENV } from '../../../shared/config/environment.config';
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
    const response = await fetch(
      `${DATA_ENRICHMENT_BASE_URL}/job/create/pull`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Create pull job error response:', errorText);
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(
          errorData.message || `Failed to create pull job: ${response.status} - ${errorText}`,
        );
      } catch (parseError) {
        throw new Error(
          `Failed to create pull job: ${response.status} - ${errorText}`,
        );
      }
    }

    return response.json();
  },

  createPushJob: async (
    data: CreatePushJobDto,
  ): Promise<DataEnrichmentJobResponse> => {
    console.log('Creating push job with data:', JSON.stringify(data, null, 2));
    const response = await fetch(
      `${DATA_ENRICHMENT_BASE_URL}/job/create/push`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Create push job error response:', errorText);
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(
          errorData.message || `Failed to create push job: ${response.status} - ${errorText}`,
        );
      } catch (parseError) {
        throw new Error(
          `Failed to create push job: ${response.status} - ${errorText}`,
        );
      }
    }

    return response.json();
  },

  getAllJobs: async (page?: number, limit?: number): Promise<JobListResponse> => {
    const queryParams = new URLSearchParams();
    if (page) queryParams.append('page', page.toString());
    if (limit) queryParams.append('limit', limit.toString());
    
    const url = `${DATA_ENRICHMENT_BASE_URL}/job/all${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    console.log('Fetching all jobs from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Get all jobs error response:', errorText);
      throw new Error(`Failed to fetch jobs: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Jobs fetched successfully:', result);
    return result;
  },

  getJob: async (id: string): Promise<DataEnrichmentJobResponse> => {
    const response = await fetch(`${DATA_ENRICHMENT_BASE_URL}/job/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch job: ${response.status}`);
    }

    return response.json();
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
    // This would be a test endpoint to validate connection before creating job
    const response = await fetch(
      `${DATA_ENRICHMENT_BASE_URL}/job/test/connection`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(connectionData),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Connection test failed: ${response.status}`,
      );
    }

    return response.json();
  },
};
