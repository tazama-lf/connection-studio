import { SftpError } from '../../features/exporter/services/sftpApi';

/**
 * Utility functions for handling and displaying user-friendly error messages
 */

const HTTP_STATUS_BAD_REQUEST = 400;
const HTTP_STATUS_UNAUTHORIZED = 401;
const HTTP_STATUS_FORBIDDEN = 403;
const HTTP_STATUS_NOT_FOUND = 404;
const HTTP_STATUS_CONFLICT = 409;
const HTTP_STATUS_TOO_MANY_REQUESTS = 429;
const HTTP_STATUS_SERVER_ERROR = 500;
const MAX_USER_FRIENDLY_MESSAGE_LENGTH = 100;

interface ErrorResponse {
  status?: number;
  data?: {
    message?: string;
  };
  statusText?: string;
}

interface ErrorConfig {
  url?: string;
  method?: string;
}

const isString = (value: unknown): value is string => typeof value === 'string';

const hasMessage = (error: unknown): error is { message: string } =>
  typeof error === 'object' &&
  error !== null &&
  'message' in error &&
  isString((error as { message: unknown }).message);

const hasResponse = (error: unknown): error is { response: ErrorResponse } =>
  typeof error === 'object' &&
  error !== null &&
  'response' in error &&
  typeof (error as { response: unknown }).response === 'object';

const getErrorStatus = (error: unknown): number | undefined => {
  if (hasResponse(error)) {
    return error.response.status;
  }
  return undefined;
};

const getErrorCode = (error: unknown): string | undefined => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    isString((error as { code: unknown }).code)
  ) {
    return (error as { code: string }).code;
  }
  return undefined;
};

const handleSftpError = (error: unknown): string | null => {
  if (error instanceof SftpError) {
    switch (error.errorType) {
      case 'CORRUPTED_FILE':
        return 'File appears to be corrupted or missing. The file or its integrity verification failed.';
      case 'NOT_FOUND':
        return 'File not found on the server. It may have been deleted or moved.';
      case 'UNAUTHORIZED':
        return 'Unauthorized access to the file. Please check your permissions.';
      default:
        return error.message;
    }
  }
  return null;
};

const handleFileCorruptionError = (error: unknown): string | null => {
  if (hasMessage(error)) {
    const corruptionMessage = 'File or its integrity file not found';
    if (
      error.message === corruptionMessage ||
      error.message.includes(corruptionMessage)
    ) {
      return 'File appears to be corrupted or missing. The file or its integrity verification failed.';
    }
  }
  return null;
};

const handleNetworkError = (error: unknown): string | null => {
  const code = getErrorCode(error);
  if (code === 'NETWORK_ERROR') {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }
  if (hasMessage(error) && error.message.includes('fetch')) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }
  return null;
};

const handleTimeoutError = (error: unknown): string | null => {
  const code = getErrorCode(error);
  if (code === 'TIMEOUT') {
    return 'The request timed out. Please try again.';
  }
  if (hasMessage(error) && error.message.includes('timeout')) {
    return 'The request timed out. Please try again.';
  }
  return null;
};

const HTTP_STATUS_MESSAGE_MAP: Record<number, string> = {
  [HTTP_STATUS_UNAUTHORIZED]:
    'You do not have permission to perform this action. Please contact your administrator.',
  [HTTP_STATUS_FORBIDDEN]:
    'You do not have permission to perform this action. Please contact your administrator.',
  [HTTP_STATUS_NOT_FOUND]:
    'The requested resource was not found. It may have been deleted or moved.',
  [HTTP_STATUS_CONFLICT]:
    'This action cannot be completed due to a conflict. The resource may have been modified by someone else.',
  [HTTP_STATUS_TOO_MANY_REQUESTS]:
    'Too many requests. Please wait a moment and try again.',
};

const handleHttpStatusError = (error: unknown): string | null => {
  const status = getErrorStatus(error);
  if (status === undefined) {
    return null;
  }

  const directMatch = HTTP_STATUS_MESSAGE_MAP[status];
  if (directMatch) {
    return directMatch;
  }

  if (status >= HTTP_STATUS_SERVER_ERROR) {
    return 'A server error occurred. Please try again later or contact support if the problem persists.';
  }

  return null;
};

interface ValidationPattern {
  keywords: string[];
  matchAll: boolean;
  result: string;
}

const VALIDATION_PATTERNS: ValidationPattern[] = [
  {
    keywords: ['should not exist', 'id'],
    matchAll: true,
    result: 'Unable to save changes. Please refresh the page and try again.',
  },
  {
    keywords: ['schedule_id', 'should not be empty'],
    matchAll: true,
    result:
      'A schedule must be selected for this job. Please choose a schedule and try again.',
  },
  {
    keywords: ['schedule_id', 'must be a UUID'],
    matchAll: true,
    result:
      'Invalid schedule selected. Please choose a valid schedule and try again.',
  },
  {
    keywords: ['endpoint_name', 'required'],
    matchAll: true,
    result:
      'Endpoint name is required. Please provide a name for the endpoint.',
  },
  {
    keywords: ['table_name', 'required'],
    matchAll: true,
    result: 'Table name is required. Please specify a table name.',
  },
  {
    keywords: ['connection', 'url'],
    matchAll: false,
    result:
      'Connection details are invalid. Please check the URL and connection settings.',
  },
  {
    keywords: ['file', 'path'],
    matchAll: false,
    result:
      'File configuration is invalid. Please check the file path and settings.',
  },
];

const matchValidationPattern = (message: string): string | null => {
  for (const pattern of VALIDATION_PATTERNS) {
    const matches = pattern.matchAll
      ? pattern.keywords.every((k) => message.includes(k))
      : pattern.keywords.some((k) => message.includes(k));
    if (matches) return pattern.result;
  }
  return null;
};

const handleValidationError = (error: unknown): string | null => {
  const status = getErrorStatus(error);
  if (status !== HTTP_STATUS_BAD_REQUEST || !hasResponse(error)) {
    return null;
  }

  const message = error.response.data?.message;
  if (!isString(message)) {
    return null;
  }

  const patternMatch = matchValidationPattern(message);
  if (patternMatch) return patternMatch;

  if (
    message.length < MAX_USER_FRIENDLY_MESSAGE_LENGTH &&
    !message.includes('Validation failed')
  ) {
    return message;
  }

  return null;
};

const getOperationFallbackMessage = (operation: string): string => {
  switch (operation.toLowerCase()) {
    case 'save':
    case 'update':
      return 'Unable to save changes. Please check your input and try again.';
    case 'create':
      return 'Unable to create the item. Please check your input and try again.';
    case 'delete':
      return 'Unable to delete the item. Please try again.';
    case 'load':
    case 'fetch':
      return 'Unable to load data. Please refresh the page and try again.';
    case 'activate':
      return 'Unable to activate the job. Please try again.';
    case 'deactivate':
      return 'Unable to deactivate the job. Please try again.';
    case 'approve':
      return 'Unable to approve the job. Please try again.';
    case 'reject':
      return 'Unable to reject the job. Please try again.';
    default:
      return 'An unexpected error occurred. Please try again or contact support.';
  }
};

/**
 * Converts backend API errors to user-friendly messages
 * @param error - The error object from API calls
 * @param operation - The operation being performed (for context)
 * @returns A user-friendly error message string
 */
export const getUserFriendlyErrorMessage = (
  error: unknown,
  operation = 'operation',
): string => {
  const handlers = [
    handleSftpError,
    handleFileCorruptionError,
    handleNetworkError,
    handleTimeoutError,
    handleHttpStatusError,
    handleValidationError,
  ];

  for (const handler of handlers) {
    const result = handler(error);
    if (result !== null) {
      return result;
    }
  }

  return getOperationFallbackMessage(operation);
};

/**
 * Extracts error details for logging purposes
 * @param error - The error object
 * @returns An object with error details for logging
 */
export const getErrorDetails = (
  error: unknown,
): {
  message: string;
  status?: number;
  statusText?: string;
  data?: unknown;
  url?: string;
  method?: string;
} => {
  const message = hasMessage(error) ? error.message : 'Unknown error';
  const status = getErrorStatus(error);
  const statusText = hasResponse(error) ? error.response.statusText : undefined;
  const data = hasResponse(error) ? error.response.data : undefined;

  let url: string | undefined;
  let method: string | undefined;

  if (
    typeof error === 'object' &&
    error !== null &&
    'config' in error &&
    typeof (error as { config: unknown }).config === 'object' &&
    (error as { config: unknown }).config !== null
  ) {
    const { config } = error as { config: ErrorConfig };
    ({ url, method } = config);
  }

  return {
    message,
    status,
    statusText,
    data,
    url,
    method,
  };
};
