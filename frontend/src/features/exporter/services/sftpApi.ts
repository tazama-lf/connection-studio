import { API_CONFIG } from '../../../shared/config/api.config';
import { apiRequest } from '../../../shared/services/tokenManager';

// Custom error types for SFTP operations
export class SftpError extends Error {
  errorType: 'CORRUPTED_FILE' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'GENERAL';
  originalError?: any;

  constructor(
    message: string,
    errorType: 'CORRUPTED_FILE' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'GENERAL',
    originalError?: any
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
  // For DE jobs
  type?: 'PULL' | 'PUSH';
  // Add other fields that might be in DE format
  [key: string]: any;
}

export type SftpFormat = 'de' | 'cron';

// SFTP API service
export class SftpApiService {
  private baseURL: string;

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

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      localStorage.removeItem('authToken');
      throw new SftpError('Unauthorized - please log in again', 'UNAUTHORIZED');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle specific SFTP errors with user-friendly messages
      if (errorData.message === 'File or its integrity file not found' || 
          (errorData.message && errorData.message.includes('File or its integrity file not found'))) {
        throw new SftpError(
          'File appears to be corrupted or missing. The file or its integrity verification failed.',
          'CORRUPTED_FILE',
          errorData
        );
      }
      
      if (response.status === 404) {
        throw new SftpError('File not found', 'NOT_FOUND', errorData);
      }
      
      throw new SftpError(
        errorData.message || `HTTP error! status: ${response.status}`,
        'GENERAL',
        errorData
      );
    }

    return await response.json();
  }

  /**
   * Get all SFTP files by format (de or cron)
   * @param format - Filter files by format: 'de' for data enrichment, 'cron' for cron jobs
   */
  async getAllFiles(format: SftpFormat): Promise<SftpFileInfo[]> {
    try {
      console.log('Fetching SFTP files with format:', format);
      const response = await fetch(
        `${this.baseURL}/sftp/all?format=${format}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        },
      );

      const files = await this.handleResponse<SftpFileInfo[]>(response);
      console.log('SFTP files retrieved:', files.length);
      return files;
    } catch (error) {
      console.error('Failed to fetch SFTP files:', error);
      throw error;
    }
  }

  /**
   * Read a specific SFTP file by name
   * @param name - The filename (without .json extension if it's in the response)
   */
  async readFile(name: string): Promise<SftpFileContent> {
    try {
      console.log('Reading SFTP file:', name);
      
      // Remove .json extension if present
      const fileName = name.endsWith('.json') ? name.slice(0, -5) : name;
      
      const response = await fetch(
        `${this.baseURL}/sftp/read?name=${encodeURIComponent(fileName)}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        },
      );

      const content = await this.handleResponse<SftpFileContent>(response);
      console.log('SFTP file content retrieved:', content);
      return content;
    } catch (error) {
      console.error('Failed to read SFTP file:', error);
      throw error;
    }
  }

  /**
   * Extract ID from filename
   * Format: dev_cron_1234_<UUID>.json or dev_de_1234_<UUID>.json
   */
  extractIdFromFilename(filename: string): string | null {
    const match = filename.match(/_([\w-]{36})\.json$/);
    return match ? match[1] : null;
  }

  /**
   * Extract format type from filename
   */
  extractFormatFromFilename(filename: string): SftpFormat | null {
    if (filename.includes('_cron_')) return 'cron';
    if (filename.includes('_de_')) return 'de';
    return null;
  }

  /**
   * Publish (deploy) an exported item
   * This will update the status to 'deployed' in the respective service
   * For 'cron' format: updates schedule status via /api/scheduler/update/status/:id
   * For 'de' format: updates job status via /api/job/update/status/:id
   */
  async publishItem(id: string, format: SftpFormat, type?: 'PULL' | 'PUSH' | string): Promise<void> {
    try {
      console.log('Publishing item:', { id, format, type });
      
      if (format === 'cron') {
        // Update schedule status using the scheduler API endpoint
        const queryParams = new URLSearchParams();
        queryParams.append('status', 'deployed');
        
        await apiRequest<{ success: boolean; message: string }>(
          `${this.baseURL}/scheduler/update/status/${id}?${queryParams.toString()}`,
          {
            method: 'PATCH',
          },
        );
      } else {
        // Update job status - requires type parameter
        let jobType: string | undefined = type;
        
        // Normalize the type to uppercase
        if (jobType) {
          jobType = jobType.toUpperCase();
          if (jobType !== 'PULL' && jobType !== 'PUSH') {
            throw new Error(`Invalid job type: ${jobType}. Must be PULL or PUSH.`);
          }
        } else {
          throw new Error('Job type (PULL/PUSH) is required for data enrichment jobs');
        }
        
        const queryParams = new URLSearchParams();
        queryParams.append('status', 'deployed');
        queryParams.append('type', jobType.toLowerCase());
        
        await apiRequest<{ success: boolean; message: string }>(
          `${this.baseURL}/job/update/status/${id}?${queryParams.toString()}`,
          {
            method: 'PATCH',
          },
        );
      }
      
      console.log('Item published successfully:', id);
    } catch (error) {
      console.error('Failed to publish item:', error);
      throw error;
    }
  }
}

export const sftpApi = new SftpApiService();
