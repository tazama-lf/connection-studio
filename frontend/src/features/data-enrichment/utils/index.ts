import * as yup from 'yup';
import type {
  DataEnrichmentJobResponse,
  CreatePullJobDto,
  CreatePushJobDto,
  FileType,
 ErrorWithResponse } from '../types';
import {
  DATA_ENRICHMENT_ERROR_MESSAGES,
  FILE_EXTENSION_FORMAT_MAP,
  SUPPORTED_FILE_EXTENSIONS,
} from '../constants';

export const buildPushPayload = (formValues: Record<string, unknown>): Partial<CreatePushJobDto> => ({
  endpoint_name: (formValues.name as string | undefined) ?? undefined,
  path: (formValues.endpointPath as string | undefined) ?? undefined,
  description: (formValues.description as string | undefined) ?? undefined,
  table_name: (formValues.targetTable as string | undefined) ?? undefined,
  mode: formValues.ingestMode as 'append' | 'replace',
  version:
    (formValues.version as string | undefined)?.replace(/^v?\/*/g, '').replace(/\/+$/g, '') ?? undefined,
});

export const buildPullPayload = (formValues: any) => {
  const base = {
    endpoint_name: (formValues.name as string | undefined) ?? undefined,
    source_type: (formValues.sourceType as string | undefined)?.toUpperCase() ?? undefined,
    description: (formValues.description as string | undefined) ?? undefined,
    table_name: (formValues.targetTable as string | undefined) ?? undefined,
    mode: formValues.ingestMode as 'append' | 'replace',
    version: (formValues.version as string | undefined) ?? undefined,
    schedule_id: (formValues.schedule as string | undefined) ?? undefined,
  };

  if (formValues.sourceType === 'http') {
    return {
      ...base,
      source_type: 'HTTP',
      connection: {
        url: formValues.url as string,
        headers: formValues.headers ? (JSON.parse(formValues.headers as string) as Record<string, unknown>) : {},
      },
    };
  }

  return {
    ...base,
    source_type: 'SFTP',
    connection: {
      host: formValues.host as string,
      port: Number(formValues.port as string | number) || null,
      auth_type:
        formValues.authType === 'key' ? 'PRIVATE_KEY' : 'USERNAME_PASSWORD',
      user_name: formValues.username as string,
      ...(formValues.authType === 'password'
        ? { password: formValues.password as string }
        : { private_key: (formValues.password as string).replace(/\\n/g, '\n') }),
    },
    file: {
      path: ((formValues.pathPattern as string | undefined) ?? '/data.csv').replace(/^\/+/g, ''),
      file_type: (formValues.fileFormat as string | undefined)?.toUpperCase() ?? undefined,
      delimiter: (formValues.delimiter as string | undefined) ?? ',',
    },
  };
};

export const generateEndpointUrl = (
  tenantId: string,
  version?: string,
  endpointPath?: string,
): string => {
  const cleanVersion =
    version?.replace(/^v?\/*/g, '').replace(/\/+$/g, '') ?? '';

  const cleanPath = endpointPath?.startsWith('/')
    ? endpointPath
    : `/${endpointPath ?? ''}`;

  if (!version && !endpointPath) {
    return `/${tenantId}/enrichment/{version}{path}`;
  }

  const versionPart = cleanVersion ? `/${cleanVersion}` : '/{version}';
  const pathPart = endpointPath ? cleanPath : '/{path}';

  return `/${tenantId}/enrichment${versionPart}${pathPart}`;
};

export const scrollToFirstError = (fieldName: string): void => {
  const errorElement = document.querySelector(
    `[name="${fieldName}"]`,
  );
  if (errorElement) {
    const modalContent =
      errorElement.closest('.MuiDialog-paper') ??
      errorElement.closest('.MuiModal-root') ??
      errorElement.closest('[role="dialog"]') ??
      document.querySelector('.MuiDialog-paper');

    if (modalContent) {
      errorElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    } else {
      errorElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }

    setTimeout(() => {
     (errorElement as HTMLElement).focus();
    }, 300);
  }
};

export const getJobType = (job: DataEnrichmentJobResponse): 'push' | 'pull' => {
  if (
    job.type.toLowerCase() === 'push' ||
    job.type.toLowerCase() === 'pull'
  ) {
    return job.type.toLowerCase() as 'push' | 'pull';
  }
  return job.path && !job.source_type ? 'push' : 'pull';
};
export const formatDateStructured = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
export const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
};
export const determineSourceType = (
  job: DataEnrichmentJobResponse,
): 'HTTP' | 'SFTP' => {
  if (job.source_type) {
    return job.source_type as 'HTTP' | 'SFTP';
  }

  if (job.connection) {
    let connectionObj: Record<string, unknown>;

    if (typeof job.connection === 'string') {
      try {
        connectionObj = JSON.parse(job.connection) as Record<string, unknown>;
      } catch (e) {
        return 'HTTP';
      }
    } else {
      connectionObj = job.connection as Record<string, unknown>;
    }

    if ('host' in connectionObj && connectionObj.host) {
      return 'SFTP';
    } else if ('url' in connectionObj && connectionObj.url) {
      return 'HTTP';
    }
  }

  return 'HTTP';
};

export const getDataEnrichmentErrorMessage = (error: unknown): string => {
  const err = error as ErrorWithResponse;

  if (err.response?.status === 400) {
    return DATA_ENRICHMENT_ERROR_MESSAGES.INVALID_INPUT;
  }

  if (err.response?.status === 409) {
    return DATA_ENRICHMENT_ERROR_MESSAGES.DUPLICATE_NAME;
  }

  if (err.response?.status === 401 || err.response?.status === 403) {
    return DATA_ENRICHMENT_ERROR_MESSAGES.UNAUTHORIZED;
  }

  if (err.response?.status !== undefined && err.response.status >= 500) {
    return DATA_ENRICHMENT_ERROR_MESSAGES.SERVER_ERROR;
  }

  const message = err.message ?? '';
  if (message.includes('fetch') || message.includes('network')) {
    return DATA_ENRICHMENT_ERROR_MESSAGES.NETWORK_ERROR;
  }

  if (err.message?.includes('not found or is not approved yet')) {
    return DATA_ENRICHMENT_ERROR_MESSAGES.SCHEDULE_DEPLOYED;
  }

  if (err.response?.data?.message) {
    const {message} = err.response.data;
    if (Array.isArray(message)) {
      return message.join(', ');
    }
    return message;
  }

  if (err.response?.data?.error) {
    return err.response.data.error;
  }

  if (err.message) {
    return err.message;
  }

  return DATA_ENRICHMENT_ERROR_MESSAGES.GENERAL;
};

export const formatJobForEdit = (
  job: DataEnrichmentJobResponse,
): Partial<CreatePullJobDto | CreatePushJobDto> => {
  const baseData: Partial<CreatePullJobDto | CreatePushJobDto> = {
    id: job.id,
    endpoint_name: job.endpoint_name,
    description: job.description,
    table_name: job.table_name,
    mode: job.mode,
    version: job.version,
  };

  if (job.type === 'push' || job.config_type === 'Push') {
    const pushData: Partial<CreatePushJobDto> = {
      ...baseData,
      path: job.path ?? '',
    };
    return pushData;
  } else {
    const pullData: Partial<CreatePullJobDto> = {
      ...baseData,
      source_type: job.source_type,
      schedule_id: job.schedule_id ?? '',
      connection: job.connection,
      file: job.file,
    };
    return pullData;
  }
};

export const validateFileFormat = (
  filePath: string,
  fileType: FileType,
): { isValid: boolean; error: string } => {
  if (!filePath.trim()) {
    return {
      isValid: false,
      error: 'Please specify a file path',
    };
  }

  const fileName = filePath.trim();
  const fileExtension = fileName.split('.').pop()?.toLowerCase();

  if (!fileExtension) {
    return {
      isValid: false,
      error:
        'Please specify a file with a valid extension (e.g., .csv, .tsv, .json)',
    };
  }

  if (
    !SUPPORTED_FILE_EXTENSIONS.includes(
      fileExtension as (typeof SUPPORTED_FILE_EXTENSIONS)[number],
    )
  ) {
    return {
      isValid: false,
      error: `Unsupported file extension: .${fileExtension}. Supported extensions: ${SUPPORTED_FILE_EXTENSIONS.join(', ')}`,
    };
  }

  const allowedFormats =
    FILE_EXTENSION_FORMAT_MAP[
      fileExtension as keyof typeof FILE_EXTENSION_FORMAT_MAP
    ];

  if (!(allowedFormats as readonly string[]).includes(fileType)) {
    const formatList = (allowedFormats as readonly string[]).join(' or ');
    return {
      isValid: false,
      error: `File format mismatch: .${fileExtension} files must use ${formatList} format, not ${fileType}`,
    };
  }

  return { isValid: true, error: '' };
};

export const baseJobValidationSchema = yup.object().shape({
  endpoint_name: yup
    .string()
    .required('Endpoint name is required')
    .min(2, 'Endpoint name must be at least 2 characters')
    .max(100, 'Endpoint name must not exceed 100 characters'),
  description: yup
    .string()
    .required('Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must not exceed 500 characters'),
  table_name: yup
    .string()
    .required('Table name is required')
    .matches(
      /^[a-zA-Z_][a-zA-Z0-9_]*$/,
      'Table name must start with a letter or underscore and contain only letters, numbers, and underscores',
    ),
  schedule_id: yup.string().required('Schedule selection is required'),
  version: yup.string().required('Version is required'),
});

export const httpJobValidationSchema = baseJobValidationSchema.shape({
  source_type: yup.string().oneOf(['HTTP']).required(),
  connection: yup.object().shape({
    url: yup.string().required('URL is required').url('Must be a valid URL'),
    headers: yup.object(),
  }),
});

export const sftpJobValidationSchema = baseJobValidationSchema.shape({
  source_type: yup.string().oneOf(['SFTP']).required(),
  connection: yup.object().shape({
    host: yup.string().required('Host is required'),
    port: yup
      .number()
      .required('Port is required')
      .min(1, 'Port must be between 1 and 65535')
      .max(65535, 'Port must be between 1 and 65535'),
    auth_type: yup
      .string()
      .oneOf(['USERNAME_PASSWORD', 'PRIVATE_KEY'])
      .required(),
    user_name: yup.string().required('Username is required'),
    password: yup.string().when('auth_type', {
      is: 'USERNAME_PASSWORD',
      then: (schema: yup.StringSchema) =>
        schema.required('Password is required'),
      otherwise: (schema: yup.StringSchema) => schema.optional(),
    }),
    private_key: yup.string().when('auth_type', {
      is: 'PRIVATE_KEY',
      then: (schema: yup.StringSchema) =>
        schema.required('Private key is required'),
      otherwise: (schema: yup.StringSchema) => schema.optional(),
    }),
  }),
  file: yup.object().shape({
    path: yup.string().required('File path is required'),
    file_type: yup
      .string()
      .oneOf(['CSV', 'JSON', 'TSV'])
      .required('File type is required'),
    delimiter: yup.string().required('Delimiter is required'),
  }),
});

export const pushJobValidationSchema = yup.object().shape({
  endpoint_name: yup
    .string()
    .required('Endpoint name is required')
    .min(2, 'Endpoint name must be at least 2 characters')
    .max(100, 'Endpoint name must not exceed 100 characters'),
  description: yup
    .string()
    .required('Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must not exceed 500 characters'),
  table_name: yup
    .string()
    .required('Table name is required')
    .matches(
      /^[a-zA-Z_][a-zA-Z0-9_]*$/,
      'Table name must start with a letter or underscore and contain only letters, numbers, and underscores',
    ),
  path: yup.string().required('Path is required'),
  version: yup.string().required('Version is required'),
});

export const getIterationText = (count: number): string => count === 1 ? '1 iteration' : `${count} iterations`;

export const generateVersionedTableName = (
  originalTableName: string,
): string => {
  const versionSuffix = `_v${Date.now()}`;
  return `${originalTableName}${versionSuffix}`;
};

export const getConnectionType = (job: DataEnrichmentJobResponse): 'HTTP' | 'SFTP' | null => {
  if (job.source_type) {
    return job.source_type as 'HTTP' | 'SFTP';
  }

  if (job.connection && typeof job.connection === 'object') {
    let connectionObj: Record<string, unknown>;
    if (typeof job.connection === 'string') {
      try {
        connectionObj = JSON.parse(job.connection) as Record<string, unknown>;
      } catch (e) {
        return null;
      }
    } else {
      connectionObj = job.connection as Record<string, unknown>;
    }

    if ('host' in connectionObj && connectionObj.host) {
      return 'SFTP';
    } else if ('url' in connectionObj && connectionObj.url) {
      return 'HTTP';
    }
  }

  return null;
};

export const formatJSON = (obj: unknown): string => {
  try {
    if (typeof obj === 'string') {
      return JSON.stringify(JSON.parse(obj), null, 2);
    }
    return JSON.stringify(obj, null, 2);
  } catch {
    return typeof obj === 'string' ? obj : JSON.stringify(obj);
  }
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    return false;
  }
};