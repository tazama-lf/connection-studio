import { API_CONFIG } from '../config/api.config';

// Types matching backend interfaces
export interface SimulatePayloadRequest {
  configId: number;
  payloadType: 'json' | 'xml';
  testPayload: string;
}

export interface SimulationError {
  field: string;
  message: string;
  path?: string;
  value?: unknown;
}

export interface ValidationStage {
  name: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  message: string;
  errors?: SimulationError[];
  details?: any;
}

export interface SimulationResult {
  status: 'PASSED' | 'FAILED';
  errors: SimulationError[];
  stages: ValidationStage[];
  tcsResult: any | null; // TCS mapping result from tcs-lib
  transformedPayload: Record<string, unknown>;
  summary: {
    endpointId: number;
    tenantId: string;
    timestamp: string;
    validatedBy?: string;
    mappingsApplied: number;
    totalStages: number;
    passedStages: number;
    failedStages: number;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: SimulationError[];
}

export class SimulationApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_CONFIG.AUTH_BASE_URL; // Using same base URL as other services
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      // Handle token expiration
      if (response.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        throw new Error('Unauthorized - Token expired');
      }

      const errorData = await response.json().catch(() => ({}));
      // For validation errors (4xx), return the error response instead of throwing
      if (response.status >= 400 && response.status < 500) {
        return errorData as T;
      }
      // For server errors (5xx), still throw
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`,
      );
    }

    return await response.json();
  }

  /**
   * Run complete simulation including schema validation, mapping execution, and Tazama validation
   */
  async runSimulation(data: SimulatePayloadRequest): Promise<SimulationResult> {
    try {
      console.log('Running simulation for config:', data.configId);
      console.log('Payload type:', data.payloadType);
      console.log('Test payload:', data.testPayload);

      const response = await fetch(`${this.baseURL}/simulation/run`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      });

      const result = await this.handleResponse<SimulationResult>(response);
      console.log('Simulation result:', result);
      return result;
    } catch (error) {
      console.error('Simulation failed:', error);
      throw error;
    }
  }

  /**
   * Validate payload against schema only (no mapping execution)
   * Useful for quick schema validation checks
   */
  async validatePayload(
    data: SimulatePayloadRequest,
  ): Promise<ValidationResult> {
    try {
      console.log(
        'Validating payload against schema for config:',
        data.configId,
      );

      const response = await fetch(`${this.baseURL}/simulation/validate`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      });

      const result = await this.handleResponse<ValidationResult>(response);
      console.log('Validation result:', result);
      return result;
    } catch (error) {
      console.error('Validation failed:', error);
      throw error;
    }
  }
}

export const simulationApi = new SimulationApiService();
