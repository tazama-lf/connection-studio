import { API_CONFIG } from '../config/api.config';

// Types for Flowable API
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
  variables?: Record<string, any>;
  processVariables?: Record<string, any>;
}

export interface TaskResponse {
  success: boolean;
  message: string;
  tasks?: FlowableTask[];
  task?: FlowableTask;
}

export interface CompleteTaskRequest {
  taskId: string;
  variables?: Record<string, any>;
  comment?: string;
}

// Flowable API service
export class FlowableApiService {
  private readonly baseURL: string;

  constructor() {
    this.baseURL = API_CONFIG.AUTH_BASE_URL; // Using same base URL as auth
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      localStorage.removeItem('authToken');
      if (
        typeof window !== 'undefined' &&
        window.location &&
        !window.location.href.includes('localhost')
      ) {
        window.location.href = '/login';
      }
      const errorData = await response
        .json()
        .catch(() => ({ success: false, message: 'Unauthorized' }));
      return errorData as T;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status >= 400 && response.status < 500) {
        return errorData as T;
      }
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`,
      );
    }

    return await response.json();
  }

  /**
   * Get tasks for a specific role (editor/approver)
   */
  async getTasksForRole(role: string): Promise<TaskResponse> {
    try {
      console.log(`🚀 FlowableApiService - Getting tasks for role: ${role}`);
      const response = await fetch(`${this.baseURL}/flowable/tasks/${role}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const result = await this.handleResponse<TaskResponse>(response);
      console.log(`✅ FlowableApiService - Tasks for role ${role}:`, result);
      return result;
    } catch (error) {
      console.error(
        `❌ FlowableApiService - Failed to get tasks for role ${role}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Complete a task and progress the workflow
   */
  async completeTask(request: CompleteTaskRequest): Promise<TaskResponse> {
    try {
      console.log(`🚀 FlowableApiService - Completing task: ${request.taskId}`);
      const response = await fetch(`${this.baseURL}/flowable/tasks/complete`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      const result = await this.handleResponse<TaskResponse>(response);
      console.log('✅ FlowableApiService - Task completed:', result);
      return result;
    } catch (error) {
      console.error(
        `❌ FlowableApiService - Failed to complete task ${request.taskId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get tasks for the current user
   */
  async getMyTasks(): Promise<TaskResponse> {
    try {
      console.log('🚀 FlowableApiService - Getting my tasks');
      const response = await fetch(`${this.baseURL}/flowable/tasks/my`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const result = await this.handleResponse<TaskResponse>(response);
      console.log('✅ FlowableApiService - My tasks:', result);
      return result;
    } catch (error) {
      console.error('❌ FlowableApiService - Failed to get my tasks:', error);
      throw error;
    }
  }
}

export const flowableApi = new FlowableApiService();
