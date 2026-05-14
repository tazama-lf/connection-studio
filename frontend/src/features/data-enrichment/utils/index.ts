import * as yup from 'yup';
import type {
  DataEnrichmentJobResponse,
  CreatePullJobDto,
  CreatePushJobDto,
  FileType,
  HttpConnection,
  SftpConnection,
  FileConfig,
  ErrorWithResponse,
} from '../types';
import {
  DATA_ENRICHMENT_ERROR_MESSAGES,
  FILE_EXTENSION_FORMAT_MAP,
  SUPPORTED_FILE_EXTENSIONS,
} from '../constants';

const DEFAULT_SFTP_PORT = 22;
const FOCUS_DELAY_MS = 300;

const HTTP_BAD_REQUEST = 400;
const HTTP_CONFLICT = 409;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_SERVER_ERROR_MIN = 500;

const MIN_ENDPOINT_NAME_LENGTH = 2;
const MAX_ENDPOINT_NAME_LENGTH = 100;
const MIN_DESCRIPTION_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 500;
const MIN_PORT = 1;
const MAX_PORT = 65535;
const JSON_INDENT = 2;
const ITERATION_SINGLE = 1;

export const buildPushPayload = (
  formValues: Record<string, unknown>,
): Partial<CreatePushJobDto> => ({
  endpoint_name: (formValues.name as string | undefined) ?? undefined,
  path: (formValues.endpointPath as string | undefined) ?? undefined,
  description: (formValues.description as string | undefined) ?? undefined,
  table_name: (formValues.targetTable as string | undefined) ?? undefined,
  mode: formValues.ingestMode as 'append' | 'replace',
  version:
    (formValues.version as string | undefined)
      ?.replace(/^v?\/*/g, '')
      .replace(/\/+$/g, '') ?? undefined,
});

const buildHttpConnection = (
  formValues: Record<string, unknown>,
): HttpConnection => ({
  url: formValues.url as string,
  headers: formValues.headers
    ? (JSON.parse(formValues.headers as string) as Record<string, string>)
    : {},
});

const buildSftpConnection = (
  formValues: Record<string, unknown>,
): SftpConnection => ({
  host: formValues.host as string,
  port: Number(formValues.port as string | number) || DEFAULT_SFTP_PORT,
  auth_type:
    formValues.authType === 'key' ? 'PRIVATE_KEY' : 'USERNAME_PASSWORD',
  user_name: formValues.username as string,
  ...(formValues.authType === 'password'
    ? { password: formValues.password as string }
    : { private_key: (formValues.password as string).replace(/\\n/g, '\n') }),
});

const buildFileConfig = (formValues: Record<string, unknown>): FileConfig => ({
  path: ((formValues.pathPattern as string | undefined) ?? '/data.csv').replace(
    /^\//g,
    '',
  ),
  file_type: ((formValues.fileFormat as string | undefined)?.toUpperCase() ??
    'CSV') as FileType,
  delimiter:
    ((formValues.delimiter as string | undefined) ?? '').trim() !== ''
      ? (formValues.delimiter as string)
      : ',',
});

export const buildPullPayload = (
  formValues: Record<string, unknown>,
): Partial<CreatePullJobDto> => {
  const base = {
    endpoint_name: (formValues.name as string | undefined) ?? undefined,
    source_type:
      (formValues.sourceType as string | undefined)?.toUpperCase() ?? undefined,
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
      connection: buildHttpConnection(formValues),
    };
  }

  return {
    ...base,
    source_type: 'SFTP',
    connection: buildSftpConnection(formValues),
    file: buildFileConfig(formValues),
  };
};

export const generateEndpointUrl = (
  tenantId: string,
  version?: string,
  endpointPath?: string,
): string => {
  const cleanVersion =
    version?.replace(/^v?\/*/g, '').replace(/\/$/g, '') ?? '';

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
  const errorElement = document.querySelector(`[name="${fieldName}"]`);
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
    }, FOCUS_DELAY_MS);
  }
};

export const getJobType = (job: DataEnrichmentJobResponse): 'push' | 'pull' => {
  if (
    job.type &&
    (job.type.toLowerCase() === 'push' || job.type.toLowerCase() === 'pull')
  ) {
    return job.type.toLowerCase() as 'push' | 'pull';
  }
  return job.path && !job.source_type ? 'push' : 'pull';
};
export const formatDateStructured = (
  dateString: string | undefined,
): string => {
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
    if (typeof job.connection === 'string') {
      try {
        const connectionObj = JSON.parse(job.connection) as Record<
          string,
          unknown
        >;
        if ('host' in connectionObj && connectionObj.host) {
          return 'SFTP';
        } else if ('url' in connectionObj && connectionObj.url) {
          return 'HTTP';
        }
      } catch (e) {
        return 'HTTP';
      }
    } else if ('host' in job.connection && job.connection.host) {
      return 'SFTP';
    } else if ('url' in job.connection && job.connection.url) {
      return 'HTTP';
    }
  }

  return 'HTTP';
};

const DE_STATUS_ERROR_MAP: Record<number, string> = {
  [HTTP_BAD_REQUEST]: DATA_ENRICHMENT_ERROR_MESSAGES.INVALID_INPUT,
  [HTTP_CONFLICT]: DATA_ENRICHMENT_ERROR_MESSAGES.DUPLICATE_NAME,
  [HTTP_UNAUTHORIZED]: DATA_ENRICHMENT_ERROR_MESSAGES.UNAUTHORIZED,
  [HTTP_FORBIDDEN]: DATA_ENRICHMENT_ERROR_MESSAGES.UNAUTHORIZED,
};

const getResponseStatusMessage = (err: ErrorWithResponse): string | null => {
  const status = err.response?.status;
  if (status === undefined) return null;

  const directMatch = DE_STATUS_ERROR_MAP[status];
  if (directMatch) return directMatch;

  if (status >= HTTP_SERVER_ERROR_MIN) {
    return DATA_ENRICHMENT_ERROR_MESSAGES.SERVER_ERROR;
  }
  return null;
};

const getResponseDataMessage = (err: ErrorWithResponse): string | null => {
  if (err.response?.data?.message) {
    const { message } = err.response.data;
    return Array.isArray(message) ? message.join(', ') : message;
  }
  if (err.response?.data?.error) {
    return err.response.data.error;
  }
  return null;
};

export const getDataEnrichmentErrorMessage = (error: unknown): string => {
  const err = error as ErrorWithResponse;

  const statusMessage = getResponseStatusMessage(err);
  if (statusMessage) return statusMessage;

  const message = err.message ?? '';
  if (message.includes('fetch') || message.includes('network')) {
    return DATA_ENRICHMENT_ERROR_MESSAGES.NETWORK_ERROR;
  }

  if (err.message?.includes('not found or is not approved yet')) {
    return DATA_ENRICHMENT_ERROR_MESSAGES.SCHEDULE_DEPLOYED;
  }

  const dataMessage = getResponseDataMessage(err);
  if (dataMessage) return dataMessage;

  if (err.message) return err.message;

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
    .min(
      MIN_ENDPOINT_NAME_LENGTH,
      `Endpoint name must be at least ${MIN_ENDPOINT_NAME_LENGTH} characters`,
    )
    .max(
      MAX_ENDPOINT_NAME_LENGTH,
      `Endpoint name must not exceed ${MAX_ENDPOINT_NAME_LENGTH} characters`,
    ),
  description: yup
    .string()
    .required('Description is required')
    .min(
      MIN_DESCRIPTION_LENGTH,
      `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters`,
    )
    .max(
      MAX_DESCRIPTION_LENGTH,
      `Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`,
    ),
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
      .min(MIN_PORT, `Port must be between ${MIN_PORT} and ${MAX_PORT}`)
      .max(MAX_PORT, `Port must be between ${MIN_PORT} and ${MAX_PORT}`),
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
    .min(
      MIN_ENDPOINT_NAME_LENGTH,
      `Endpoint name must be at least ${MIN_ENDPOINT_NAME_LENGTH} characters`,
    )
    .max(
      MAX_ENDPOINT_NAME_LENGTH,
      `Endpoint name must not exceed ${MAX_ENDPOINT_NAME_LENGTH} characters`,
    ),
  description: yup
    .string()
    .required('Description is required')
    .min(
      MIN_DESCRIPTION_LENGTH,
      `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters`,
    )
    .max(
      MAX_DESCRIPTION_LENGTH,
      `Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`,
    ),
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

export const getIterationText = (count: number): string =>
  count === ITERATION_SINGLE ? '1 iteration' : `${count} iterations`;

export const generateVersionedTableName = (
  originalTableName: string,
): string => {
  const versionSuffix = `_v${Date.now()}`;
  return `${originalTableName}${versionSuffix}`;
};

export const getConnectionType = (
  job: DataEnrichmentJobResponse,
): 'HTTP' | 'SFTP' | null => {
  if (job.source_type) {
    return job.source_type as 'HTTP' | 'SFTP';
  }

  if (job.connection && typeof job.connection === 'object') {
    if (typeof job.connection === 'string') {
      try {
        const connectionObj = JSON.parse(job.connection) as Record<
          string,
          unknown
        >;
        if ('host' in connectionObj && connectionObj.host) {
          return 'SFTP';
        } else if ('url' in connectionObj && connectionObj.url) {
          return 'HTTP';
        }
      } catch (e) {
        return null;
      }
    } else if ('host' in job.connection && job.connection.host) {
      return 'SFTP';
    } else if ('url' in job.connection && job.connection.url) {
      return 'HTTP';
    }
  }

  return null;
};

export const formatJSON = (obj: unknown): string => {
  try {
    if (typeof obj === 'string') {
      return JSON.stringify(JSON.parse(obj), null, JSON_INDENT);
    }
    return JSON.stringify(obj, null, JSON_INDENT);
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
