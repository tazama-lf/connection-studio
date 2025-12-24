import * as yup from 'yup';
import { DE_JOB_ERROR_MESSAGES } from '../constants';
import type { DataEnrichmentJobResponse } from '../types';

interface ErrorWithResponse {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
  message?: string;
}

export const getDataEnrichmentErrorMessage = (error: unknown): string => {
  const err = error as ErrorWithResponse;

  if (err?.response?.status === 400) {
    return DE_JOB_ERROR_MESSAGES.INVALID_INPUT;
  }

  if (err?.response?.status === 409) {
    return DE_JOB_ERROR_MESSAGES.DUPLICATE_NAME;
  }

  if (err?.response?.status === 401 || err?.response?.status === 403) {
    return DE_JOB_ERROR_MESSAGES.UNAUTHORIZED;
  }

  if (err?.response?.status !== undefined && err.response.status >= 500) {
    return DE_JOB_ERROR_MESSAGES.SERVER_ERROR;
  }

  if (err?.message?.includes('fetch') ?? err?.message?.includes('network')) {
    return DE_JOB_ERROR_MESSAGES.NETWORK_ERROR;
  }

  if (err?.response?.data?.message) {
    return err.response.data.message;
  }

  if (err?.message) {
    return err.message;
  }

  return DE_JOB_ERROR_MESSAGES.GENERAL;
};

// Helper function to determine job type
export const getJobType = (job: DataEnrichmentJobResponse): 'push' | 'pull' => {
  if (
    job.type?.toLowerCase() === 'push' ||
    job.type?.toLowerCase() === 'pull'
  ) {
    return job.type.toLowerCase() as 'push' | 'pull';
  }
  // Fallback: if job has path but no source_type, it's PUSH; otherwise it's PULL
  return job.path && !job.source_type ? 'push' : 'pull';
};

// Helper function to determine source type consistently
export const determineSourceType = (
  job: DataEnrichmentJobResponse,
): 'HTTP' | 'SFTP' => {
  // First check if source_type is explicitly set
  if (job.source_type) {
    return job.source_type as 'HTTP' | 'SFTP';
  }

  // Auto-detect from connection object
  if (job.connection && typeof job.connection === 'object') {
    // Handle case where connection might be a string (JSON string)
    let connectionObj = job.connection;
    if (typeof job.connection === 'string') {
      try {
        connectionObj = JSON.parse(job.connection);
      } catch (e) {
        return 'HTTP'; // Default fallback
      }
    }

    // Check parsed or direct object
    if (connectionObj && typeof connectionObj === 'object') {
      if ('host' in connectionObj && connectionObj.host) {
        return 'SFTP';
      } else if ('url' in connectionObj && connectionObj.url) {
        return 'HTTP';
      }
    }
  }

  // Default fallback
  return 'HTTP';
};

 export const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

export const formatJobForEdit = (
  job: DataEnrichmentJobResponse,
): Record<string, any> => {
  const isPullJob = job.type === 'pull';

  if (isPullJob) {
    const connection = job.connection as any;
    const isSftpSource = job.source_type === 'SFTP';

    return {
      name: job.endpoint_name,
      version: job.version,
      sourceType: job.source_type?.toLowerCase() || 'http',
      description: job.description,
      schedule: job.schedule_id,
      ingestMode: job.mode,
      targetTable: job.table_name,
      ...(isSftpSource
        ? {
            host: connection?.host || '',
            port: connection?.port?.toString() || '',
            authType:
              connection?.auth_type === 'PRIVATE_KEY' ? 'key' : 'password',
            username: connection?.user_name || '',
            password: connection?.password || '',
            privateKey: connection?.private_key || '',
            pathPattern: job.file?.path || '',
            fileFormat: job.file?.file_type?.toLowerCase() || 'csv',
            delimiter: job.file?.delimiter || ',',
          }
        : {
            url: connection?.url || '',
            headers: connection?.headers
              ? JSON.stringify(connection.headers, null, 2)
              : '{}',
          }),
    };
  } else {
    return {
      name: job.endpoint_name,
      version: job.version,
      description: job.description,
      targetTable: job.table_name,
      ingestMode: job.mode,
      endpointPath: job.path || '',
    };
  }
};
