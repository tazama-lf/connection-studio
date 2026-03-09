import { API_CONFIG } from '../config/api.config';

const HTTP_STATUS_BAD_REQUEST = 400;
const HTTP_STATUS_UNAUTHORIZED = 401;
const HTTP_STATUS_SERVER_ERROR = 500;
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
  details?: unknown;
}

export interface SimulationResult {
  status: 'PASSED' | 'FAILED';
  errors: SimulationError[];
  stages: ValidationStage[];
  tcsResult: unknown;
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

interface ErrorResponse {
  message?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: SimulationError[];
}

export class SimulationApiService {
  private readonly baseURL: string;

  constructor() {
    this.baseURL = API_CONFIG.AUTH_BASE_URL;
  }

  private static readonly getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      if (response.status === HTTP_STATUS_UNAUTHORIZED) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        throw new Error('Unauthorized - Token expired');
      }

      const errorData = await response.json().catch((): ErrorResponse => ({})) as ErrorResponse;
      if (response.status >= HTTP_STATUS_BAD_REQUEST && response.status < HTTP_STATUS_SERVER_ERROR) {
        return errorData as T;
      }
      const message = errorData.message ?? `HTTP error! status: ${response.status}`;
      throw new Error(message);
    }

    return await response.json() as T;
  }

  /**
   * Run complete simulation including schema validation, mapping execution, and Tazama validation
   */
  async runSimulation(data: SimulatePayloadRequest): Promise<SimulationResult> {
    const response = await fetch(`${this.baseURL}/simulation/run`, {
      method: 'POST',
      headers: SimulationApiService.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return await SimulationApiService.handleResponse<SimulationResult>(response);
  }

  /**
   * Validate payload against schema only (no mapping execution)
   * Useful for quick schema validation checks
   */
  async validatePayload(
    data: SimulatePayloadRequest,
  ): Promise<ValidationResult> {
    const response = await fetch(`${this.baseURL}/simulation/validate`, {
      method: 'POST',
      headers: SimulationApiService.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return await SimulationApiService.handleResponse<ValidationResult>(response);
  }
}

export const simulationApi = new SimulationApiService();
