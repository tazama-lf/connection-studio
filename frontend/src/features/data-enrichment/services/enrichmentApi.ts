import { apiClient } from '../../../shared/services/apiClient';
import { API_CONFIG } from '../../../shared/config/api.config';
import type {
  CreateDataEnrichmentJobRequest,
  DataEnrichmentJobResponse,
  JobListResponse,
  JobExecutionLog,
  ScheduleRequest,
  ScheduleResponse,
} from '../types';

// Types for Data Enrichment
export interface MappingRule {
  id: string;
  name: string;
  sourceField: string;
  targetField: string;
  transformation: string;
  isActive: boolean;
}

export interface EnrichmentTemplate {
  id: string;
  name: string;
  description: string;
  mappingRules: MappingRule[];
  createdAt: string;
}

export interface TransformationRequest {
  templateId: string;
  data: Record<string, unknown>;
}

export interface TransformationResponse {
  transformedData: Record<string, unknown>;
  appliedRules: string[];
  errors?: string[];
}

// Data Enrichment API service
export class DataEnrichmentApiService {
  // Mapping rules
  async getMappingRules(): Promise<MappingRule[]> {
    return apiClient.get<MappingRule[]>(
      API_CONFIG.ENDPOINTS.DATA_ENRICHMENT.MAPPINGS,
    );
  }

  async createMappingRule(rule: Omit<MappingRule, 'id'>): Promise<MappingRule> {
    return apiClient.post<MappingRule>(
      API_CONFIG.ENDPOINTS.DATA_ENRICHMENT.MAPPINGS,
      rule,
    );
  }

  async updateMappingRule(
    id: string,
    rule: Partial<MappingRule>,
  ): Promise<MappingRule> {
    return apiClient.put<MappingRule>(
      `${API_CONFIG.ENDPOINTS.DATA_ENRICHMENT.MAPPINGS}/${id}`,
      rule,
    );
  }

  async deleteMappingRule(id: string): Promise<void> {
    return apiClient.delete<void>(
      `${API_CONFIG.ENDPOINTS.DATA_ENRICHMENT.MAPPINGS}/${id}`,
    );
  }

  // Templates
  async getTemplates(): Promise<EnrichmentTemplate[]> {
    return apiClient.get<EnrichmentTemplate[]>(
      API_CONFIG.ENDPOINTS.DATA_ENRICHMENT.TEMPLATES,
    );
  }

  async createTemplate(
    template: Omit<EnrichmentTemplate, 'id' | 'createdAt'>,
  ): Promise<EnrichmentTemplate> {
    return apiClient.post<EnrichmentTemplate>(
      API_CONFIG.ENDPOINTS.DATA_ENRICHMENT.TEMPLATES,
      template,
    );
  }

  async updateTemplate(
    id: string,
    template: Partial<EnrichmentTemplate>,
  ): Promise<EnrichmentTemplate> {
    return apiClient.put<EnrichmentTemplate>(
      `${API_CONFIG.ENDPOINTS.DATA_ENRICHMENT.TEMPLATES}/${id}`,
      template,
    );
  }

  async deleteTemplate(id: string): Promise<void> {
    return apiClient.delete<void>(
      `${API_CONFIG.ENDPOINTS.DATA_ENRICHMENT.TEMPLATES}/${id}`,
    );
  }

  // Data transformation
  async transformData(
    request: TransformationRequest,
  ): Promise<TransformationResponse> {
    return apiClient.post<TransformationResponse>(
      API_CONFIG.ENDPOINTS.DATA_ENRICHMENT.TRANSFORM,
      request,
    );
  }

  // Schedule Management

  /**
   * Create a new schedule
   */
  async createSchedule(
    scheduleData: ScheduleRequest,
  ): Promise<ScheduleResponse> {
    return apiClient.post<ScheduleResponse>(
      API_CONFIG.ENDPOINTS.SCHEDULE.CREATE,
      scheduleData,
    );
  }

  /**
   * Get all available schedules
   */
  async getAllSchedules(): Promise<ScheduleResponse[]> {
    return apiClient.get<ScheduleResponse[]>(API_CONFIG.ENDPOINTS.SCHEDULE.ALL);
  }

  // Data Enrichment Job Management

  /**
   * Create a new data enrichment job
   */
  async createJob(
    jobData: CreateDataEnrichmentJobRequest,
  ): Promise<DataEnrichmentJobResponse> {
    return apiClient.post<DataEnrichmentJobResponse>(
      `${API_CONFIG.ENDPOINTS.DATA_ENRICHMENT.JOBS}/create`,
      jobData,
    );
  }

  /**
   * Get all data enrichment jobs with pagination
   */
  async getAllJobs(
    page: number = 1,
    limit: number = 10,
  ): Promise<JobListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    return apiClient.get<JobListResponse>(
      `${API_CONFIG.ENDPOINTS.DATA_ENRICHMENT.JOBS}/all?${params}`,
    );
  }

  /**
   * Get a specific job by ID
   */
  async getJobById(jobId: number): Promise<DataEnrichmentJobResponse> {
    return apiClient.get<DataEnrichmentJobResponse>(
      `${API_CONFIG.ENDPOINTS.DATA_ENRICHMENT.JOBS}/${jobId}`,
    );
  }

  /**
   * Update an existing job
   */
  async updateJob(
    jobId: number,
    jobData: Partial<CreateDataEnrichmentJobRequest>,
  ): Promise<DataEnrichmentJobResponse> {
    return apiClient.put<DataEnrichmentJobResponse>(
      `${API_CONFIG.ENDPOINTS.DATA_ENRICHMENT.JOBS}/${jobId}`,
      jobData,
    );
  }

  /**
   * Delete a job
   */
  async deleteJob(jobId: number): Promise<void> {
    return apiClient.delete<void>(
      `${API_CONFIG.ENDPOINTS.DATA_ENRICHMENT.JOBS}/${jobId}`,
    );
  }

  /**
   * Execute a job manually
   */
  async executeJob(jobId: number): Promise<JobExecutionLog> {
    return apiClient.post<JobExecutionLog>(
      `${API_CONFIG.ENDPOINTS.DATA_ENRICHMENT.JOBS}/${jobId}/execute`,
    );
  }

  /**
   * Get job execution logs
   */
  async getJobLogs(jobId: number): Promise<JobExecutionLog[]> {
    return apiClient.get<JobExecutionLog[]>(
      `${API_CONFIG.ENDPOINTS.DATA_ENRICHMENT.JOBS}/${jobId}/logs`,
    );
  }
}

export const dataEnrichmentApi = new DataEnrichmentApiService();
