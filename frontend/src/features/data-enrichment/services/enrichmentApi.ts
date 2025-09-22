import { apiClient } from '../../../shared/services/apiClient';
import { API_CONFIG } from '../../../shared/config/api.config';

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
}

export const dataEnrichmentApi = new DataEnrichmentApiService();
