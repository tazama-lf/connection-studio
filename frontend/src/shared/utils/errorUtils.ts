import { SftpError } from '../../features/exporter/services/sftpApi';

/**
 * Utility functions for handling and displaying user-friendly error messages
 */

/**
 * Converts backend API errors to user-friendly messages
 * @param error - The error object from API calls
 * @param operation - The operation being performed (for context)
 * @returns A user-friendly error message string
 */
export const getUserFriendlyErrorMessage = (error: any, operation: string = 'operation'): string => {
  // Handle SFTP-specific errors
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

  // Handle file corruption errors from backend messages
  if (error?.message === 'File or its integrity file not found' ||
      (error?.message && error.message.includes('File or its integrity file not found'))) {
    return 'File appears to be corrupted or missing. The file or its integrity verification failed.';
  }

  // Handle network/connection errors
  if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('fetch')) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }

  // Handle timeout errors
  if (error?.code === 'TIMEOUT' || error?.message?.includes('timeout')) {
    return 'The request timed out. Please try again.';
  }

  // Handle authentication errors
  if (error?.response?.status === 401 || error?.response?.status === 403) {
    return 'You do not have permission to perform this action. Please contact your administrator.';
  }

  // Handle not found errors
  if (error?.response?.status === 404) {
    return 'The requested resource was not found. It may have been deleted or moved.';
  }

  // Handle validation errors (400 status)
  if (error?.response?.status === 400) {
    const errorData = error.response?.data;

    // Handle specific validation messages
    if (errorData?.message) {
      const message = errorData.message;

      // Common validation error patterns
      if (message.includes('should not exist') && message.includes('id')) {
        return 'Unable to save changes. Please refresh the page and try again.';
      }

      if (message.includes('schedule_id') && message.includes('should not be empty')) {
        return 'A schedule must be selected for this job. Please choose a schedule and try again.';
      }

      if (message.includes('schedule_id') && message.includes('must be a UUID')) {
        return 'Invalid schedule selected. Please choose a valid schedule and try again.';
      }

      if (message.includes('endpoint_name') && message.includes('required')) {
        return 'Endpoint name is required. Please provide a name for the endpoint.';
      }

      if (message.includes('table_name') && message.includes('required')) {
        return 'Table name is required. Please specify a table name.';
      }

      if (message.includes('connection') || message.includes('url')) {
        return 'Connection details are invalid. Please check the URL and connection settings.';
      }

      if (message.includes('file') || message.includes('path')) {
        return 'File configuration is invalid. Please check the file path and settings.';
      }

      // Return the backend message if it's already user-friendly
      if (message.length < 100 && !message.includes('Validation failed')) {
        return message;
      }
    }
  }

  // Handle server errors (500+)
  if (error?.response?.status >= 500) {
    return 'A server error occurred. Please try again later or contact support if the problem persists.';
  }

  // Handle conflict errors (409)
  if (error?.response?.status === 409) {
    return 'This action cannot be completed due to a conflict. The resource may have been modified by someone else.';
  }

  // Handle rate limiting (429)
  if (error?.response?.status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  // Generic fallback messages based on operation
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
 * Extracts error details for logging purposes
 * @param error - The error object
 * @returns An object with error details for logging
 */
export const getErrorDetails = (error: any) => {
  return {
    message: error?.message || 'Unknown error',
    status: error?.response?.status,
    statusText: error?.response?.statusText,
    data: error?.response?.data,
    url: error?.config?.url,
    method: error?.config?.method,
  };
};