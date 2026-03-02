import { API_CONFIG } from '../../../shared/config/api.config';

export class SftpError extends Error {
  errorType: 'CORRUPTED_FILE' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'GENERAL';
  originalError?: any;

  constructor(
    message: string,
    errorType: 'CORRUPTED_FILE' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'GENERAL',
    originalError?: any,
  ) {
    super(message);
    this.name = 'SftpError';
    this.errorType = errorType;
    this.originalError = originalError;
  }
}

// Types for SFTP API responses
export interface SftpFileInfo {
  type: string;
  name: string;
  size: number;
  modifyTime: number;
  accessTime: number;
  rights: {
    user: string;
    group: string;
    other: string;
  };
  owner: number;
  group: number;
  longname: string;
}

export interface SftpFileContent {
  id: string;
  tenant_id: string;
  name: string;
  cron?: string;
  iterations?: number;
  status: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  type?: 'PULL' | 'PUSH';
  [key: string]: any;
}

export type SftpFormat = 'de' | 'cron' | 'dems';

export class SftpApiService {
  private readonly baseURL: string;

  constructor() {
    this.baseURL = API_CONFIG.AUTH_BASE_URL;
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async apiRequest<T>(
    url: string,
    options: RequestInit = {},
  ): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });

    if (response.status === 401) {
      localStorage.removeItem('authToken');
      throw new Error('Authentication failed');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message ?? `HTTP error! status: ${response.status}`,
      );
    }

    return await response.json();
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      localStorage.removeItem('authToken');
      throw new SftpError('Unauthorized - please log in again', 'UNAUTHORIZED');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (
        errorData.message === 'File or its integrity file not found' ||
        errorData.message?.includes('File or its integrity file not found')
      ) {
        throw new SftpError(
          'File appears to be corrupted or missing. The file or its integrity verification failed.',
          'CORRUPTED_FILE',
          errorData,
        );
      }

      if (response.status === 404) {
        throw new SftpError('File not found', 'NOT_FOUND', errorData);
      }

      throw new SftpError(
        errorData.message || `HTTP error! status: ${response.status}`,
        'GENERAL',
        errorData,
      );
    }

    return await response.json();
  }

  async getAllFiles(format: SftpFormat): Promise<SftpFileInfo[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/sftp/all?format=${format}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        },
      );

      const files = await this.handleResponse<SftpFileInfo[]>(response);
      return files;
    } catch (error) {
      throw error;
    }
  }

  async readFile(name: string): Promise<SftpFileContent> {
    try {
      const fileName = name.endsWith('.json') ? name.slice(0, -5) : name;

      const response = await fetch(
        `${this.baseURL}/sftp/read?name=${encodeURIComponent(fileName)}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        },
      );

      const content = await this.handleResponse<SftpFileContent>(response);
      return content;
    } catch (error) {
      throw error;
    }
  }

  extractIdFromFilename(filename: string): string | null {
    const match = /_([\w-]{36})\.json$/.exec(filename);
    return match ? match[1] : null;
  }

  extractFormatFromFilename(filename: string): SftpFormat | null {
    if (filename.includes('_cron_')) return 'cron';
    if (filename.includes('_de_')) return 'de';
    if (filename.includes('_dems_')) return 'dems';
    return null;
  }

  async publishItem(
    id: string,
    format: SftpFormat,
    type?: 'PULL' | 'PUSH' | string,
  ): Promise<void> {
    try {
      if (format === 'cron') {
        const queryParams = new URLSearchParams();
        queryParams.append('status', 'STATUS_08_DEPLOYED');

        await this.apiRequest<{ success: boolean; message: string }>(
          `${this.baseURL}/scheduler/update/status/${id}?${queryParams.toString()}`,
          {
            method: 'PATCH',
          },
        );
      } else if (format === 'dems') {
        await this.apiRequest<{ success: boolean; message: string }>(
          `${this.baseURL}/config/${id}/workflow?action=deploy`,
          {
            method: 'POST',
            body: JSON.stringify({
              configId: parseInt(id),
              userId: 'publisher',
              deploymentNotes: 'Published via SFTP',
              deploymentEnvironment: 'production',
            }),
          },
        );
      } else {
        let jobType: string | undefined = type;
        if (jobType) {
          jobType = jobType.toUpperCase();
          if (jobType !== 'PULL' && jobType !== 'PUSH') {
            throw new Error(
              `Invalid job type: ${jobType}. Must be PULL or PUSH.`,
            );
          }
        } else {
          throw new Error(
            'Job type (PULL/PUSH) is required for data enrichment jobs',
          );
        }

        const queryParams = new URLSearchParams();
        queryParams.append('status', 'STATUS_08_DEPLOYED');
        queryParams.append('type', jobType.toLowerCase());

        await this.apiRequest<{ success: boolean; message: string }>(
          `${this.baseURL}/job/update/status/${id}?${queryParams.toString()}`,
          {
            method: 'PATCH',
          },
        );
      }
    } catch (error) {
      throw error;
    }
  }
}

export const sftpApi = new SftpApiService();
