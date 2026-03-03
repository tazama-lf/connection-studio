import { API_CONFIG } from '../config/api.config';

const HTTP_STATUS_BAD_REQUEST = 400;
const HTTP_STATUS_UNAUTHORIZED = 401;
const HTTP_STATUS_SERVER_ERROR = 500;

export interface FlowableTask {
  id: string;
  name: string;
  assignee?: string;
  owner?: string;
  processInstanceId: string;
  processDefinitionId: string;
  taskDefinitionKey: string;
  created: string;
  dueDate?: string;
  description?: string;
  priority: number;
  suspended: boolean;
  tenantId?: string;
  category?: string;
  formKey?: string;
  parentTaskId?: string;
  executionId: string;
  variables?: Record<string, unknown>;
  processVariables?: Record<string, unknown>;
}

export interface TaskResponse {
  success: boolean;
  message: string;
  tasks?: FlowableTask[];
  task?: FlowableTask;
}

export interface CompleteTaskRequest {
  taskId: string;
  variables?: Record<string, unknown>;
  comment?: string;
}

export class FlowableApiService {
  private readonly baseURL: string;

  constructor() {
    this.baseURL = API_CONFIG.AUTH_BASE_URL;
  }

  private readonly getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  private readonly handleResponse = async <T>(response: Response): Promise<T> => {
    if (response.status === HTTP_STATUS_UNAUTHORIZED) {
      localStorage.removeItem('authToken');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      const errorData = (await response
        .json()
        .catch(() => ({ success: false, message: 'Unauthorized' }))) as { success: boolean; message: string };
      return errorData as T;
    }

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as { message?: string };
      if (response.status >= HTTP_STATUS_BAD_REQUEST && response.status < HTTP_STATUS_SERVER_ERROR) {
        return errorData as T;
      }
      const message = errorData.message ?? `HTTP error! status: ${response.status}`;
      throw new Error(message);
    }

    return (await response.json()) as T;
  };

  /**
   * Get tasks for a specific role (editor/approver)
   */
  async getTasksForRole(role: string): Promise<TaskResponse> {
    const response = await fetch(`${this.baseURL}/flowable/tasks/${role}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return await this.handleResponse<TaskResponse>(response);
  }

  /**
   * Complete a task and progress the workflow
   */
  async completeTask(request: CompleteTaskRequest): Promise<TaskResponse> {
    const response = await fetch(`${this.baseURL}/flowable/tasks/complete`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });

    return await this.handleResponse<TaskResponse>(response);
  }

  /**
   * Get tasks for the current user
   */
  async getMyTasks(): Promise<TaskResponse> {
    const response = await fetch(`${this.baseURL}/flowable/tasks/my`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return await this.handleResponse<TaskResponse>(response);
  }
}

export const flowableApi = new FlowableApiService();
