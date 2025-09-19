import { apiClient } from "../../shared/services/apiClient";
import { API_CONFIG } from "../../../config/api.config";

// Types for DEMS
export interface Endpoint {
  id: string;
  name: string;
  url: string;
  method: string;
  status: "active" | "inactive";
  lastValidated: string;
}

export interface ValidationLog {
  id: string;
  endpointId: string;
  timestamp: string;
  status: "success" | "failure";
  responseTime: number;
  message?: string;
}

export interface EndpointHistory {
  id: string;
  endpointId: string;
  change: string;
  timestamp: string;
  user: string;
}

// DEMS API service
export class DemsApiService {
  // Endpoint management
  async getEndpoints(): Promise<Endpoint[]> {
    return apiClient.get<Endpoint[]>(API_CONFIG.ENDPOINTS.DEMS.ENDPOINTS);
  }

  async createEndpoint(endpoint: Omit<Endpoint, "id">): Promise<Endpoint> {
    return apiClient.post<Endpoint>(
      API_CONFIG.ENDPOINTS.DEMS.ENDPOINTS,
      endpoint,
    );
  }

  async updateEndpoint(
    id: string,
    endpoint: Partial<Endpoint>,
  ): Promise<Endpoint> {
    return apiClient.put<Endpoint>(
      `${API_CONFIG.ENDPOINTS.DEMS.ENDPOINTS}/${id}`,
      endpoint,
    );
  }

  async deleteEndpoint(id: string): Promise<void> {
    return apiClient.delete<void>(
      `${API_CONFIG.ENDPOINTS.DEMS.ENDPOINTS}/${id}`,
    );
  }

  // Validation
  async validateEndpoint(id: string): Promise<ValidationLog> {
    return apiClient.post<ValidationLog>(
      `${API_CONFIG.ENDPOINTS.DEMS.VALIDATE}/${id}`,
    );
  }

  // Logs
  async getValidationLogs(endpointId?: string): Promise<ValidationLog[]> {
    const url = endpointId
      ? `${API_CONFIG.ENDPOINTS.DEMS.LOGS}?endpointId=${endpointId}`
      : API_CONFIG.ENDPOINTS.DEMS.LOGS;
    return apiClient.get<ValidationLog[]>(url);
  }

  // History
  async getEndpointHistory(endpointId: string): Promise<EndpointHistory[]> {
    return apiClient.get<EndpointHistory[]>(
      `${API_CONFIG.ENDPOINTS.DEMS.HISTORY}/${endpointId}`,
    );
  }
}

export const demsApi = new DemsApiService();
