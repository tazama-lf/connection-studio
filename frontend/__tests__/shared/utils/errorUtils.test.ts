import { getUserFriendlyErrorMessage } from '../../../src/shared/utils/errorUtils';
import { SftpError } from '../../../src/features/exporter/services/sftpApi';

describe('getUserFriendlyErrorMessage', () => {
  describe('SftpError handling', () => {
    it('should return corrupted file message for CORRUPTED_FILE type', () => {
      const error = new SftpError('file missing', 'CORRUPTED_FILE');
      expect(getUserFriendlyErrorMessage(error)).toBe(
        'File appears to be corrupted or missing. The file or its integrity verification failed.',
      );
    });

    it('should return not found message for NOT_FOUND type', () => {
      const error = new SftpError('not found', 'NOT_FOUND');
      expect(getUserFriendlyErrorMessage(error)).toBe(
        'File not found on the server. It may have been deleted or moved.',
      );
    });

    it('should return unauthorized message for UNAUTHORIZED type', () => {
      const error = new SftpError('unauthorized', 'UNAUTHORIZED');
      expect(getUserFriendlyErrorMessage(error)).toBe(
        'Unauthorized access to the file. Please check your permissions.',
      );
    });

    it('should return the error message for GENERAL type', () => {
      const error = new SftpError('Custom SFTP error', 'GENERAL');
      expect(getUserFriendlyErrorMessage(error)).toBe('Custom SFTP error');
    });
  });

  describe('File corruption error (message-based)', () => {
    it('should handle file corruption message from non-SftpError', () => {
      const error = { message: 'File or its integrity file not found' };
      expect(getUserFriendlyErrorMessage(error)).toBe(
        'File appears to be corrupted or missing. The file or its integrity verification failed.',
      );
    });

    it('should handle error message that includes the corruption text', () => {
      const error = { message: 'Error: File or its integrity file not found somewhere' };
      expect(getUserFriendlyErrorMessage(error)).toBe(
        'File appears to be corrupted or missing. The file or its integrity verification failed.',
      );
    });
  });

  describe('Network errors', () => {
    it('should detect NETWORK_ERROR code', () => {
      const error = { code: 'NETWORK_ERROR', message: 'network error' };
      expect(getUserFriendlyErrorMessage(error)).toContain(
        'Unable to connect to the server',
      );
    });

    it('should detect fetch-related messages', () => {
      const error = { message: 'Failed to fetch' };
      expect(getUserFriendlyErrorMessage(error)).toContain(
        'Unable to connect to the server',
      );
    });
  });

  describe('Timeout errors', () => {
    it('should detect TIMEOUT code', () => {
      const error = { code: 'TIMEOUT' };
      expect(getUserFriendlyErrorMessage(error)).toBe(
        'The request timed out. Please try again.',
      );
    });

    it('should detect timeout in message', () => {
      const error = { message: 'Request timeout after 30s' };
      expect(getUserFriendlyErrorMessage(error)).toBe(
        'The request timed out. Please try again.',
      );
    });
  });

  describe('HTTP status errors', () => {
    it('should return unauthorized message for 401 status', () => {
      const error = { response: { status: 401 } };
      expect(getUserFriendlyErrorMessage(error)).toContain(
        'You do not have permission',
      );
    });

    it('should return unauthorized message for 403 status', () => {
      const error = { response: { status: 403 } };
      expect(getUserFriendlyErrorMessage(error)).toContain(
        'You do not have permission',
      );
    });

    it('should return not found message for 404 status', () => {
      const error = { response: { status: 404 } };
      expect(getUserFriendlyErrorMessage(error)).toContain(
        'The requested resource was not found',
      );
    });

    it('should return conflict message for 409 status', () => {
      const error = { response: { status: 409 } };
      expect(getUserFriendlyErrorMessage(error)).toContain(
        'This action cannot be completed due to a conflict',
      );
    });

    it('should return too many requests message for 429 status', () => {
      const error = { response: { status: 429 } };
      expect(getUserFriendlyErrorMessage(error)).toContain(
        'Too many requests',
      );
    });

    it('should return server error message for 500+ status', () => {
      const error = { response: { status: 500 } };
      expect(getUserFriendlyErrorMessage(error)).toContain(
        'A server error occurred',
      );
    });

    it('should return server error message for 503 status', () => {
      const error = { response: { status: 503 } };
      expect(getUserFriendlyErrorMessage(error)).toContain(
        'A server error occurred',
      );
    });
  });

  describe('Validation errors (400 with specific messages)', () => {
    it('should handle "should not exist" id error', () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'id should not exist in the request body' },
        },
      };
      expect(getUserFriendlyErrorMessage(error)).toBe(
        'Unable to save changes. Please refresh the page and try again.',
      );
    });

    it('should handle schedule_id should not be empty', () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'schedule_id should not be empty' },
        },
      };
      expect(getUserFriendlyErrorMessage(error)).toBe(
        'A schedule must be selected for this job. Please choose a schedule and try again.',
      );
    });

    it('should handle schedule_id must be a UUID', () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'schedule_id must be a UUID string' },
        },
      };
      expect(getUserFriendlyErrorMessage(error)).toBe(
        'Invalid schedule selected. Please choose a valid schedule and try again.',
      );
    });

    it('should handle endpoint_name required', () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'endpoint_name is required field' },
        },
      };
      expect(getUserFriendlyErrorMessage(error)).toBe(
        'Endpoint name is required. Please provide a name for the endpoint.',
      );
    });

    it('should handle table_name required', () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'table_name is required' },
        },
      };
      expect(getUserFriendlyErrorMessage(error)).toBe(
        'Table name is required. Please specify a table name.',
      );
    });

    it('should handle connection/url message', () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'invalid connection url format' },
        },
      };
      expect(getUserFriendlyErrorMessage(error)).toBe(
        'Connection details are invalid. Please check the URL and connection settings.',
      );
    });

    it('should handle file/path message', () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'invalid file path' },
        },
      };
      expect(getUserFriendlyErrorMessage(error)).toBe(
        'File configuration is invalid. Please check the file path and settings.',
      );
    });

    it('should return short message directly if it is under 100 chars and not validation failed', () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'Name already taken' },
        },
      };
      expect(getUserFriendlyErrorMessage(error)).toBe('Name already taken');
    });

    it('should return null (fallback) for Validation failed message', () => {
      const error = {
        response: {
          status: 400,
          data: {
            message:
              'Validation failed: many fields have issues blah blah blah blah blah blah blah blah blah blah',
          },
        },
      };
      // Falls through to operation fallback
      const result = getUserFriendlyErrorMessage(error, 'save');
      expect(result).toBe(
        'Unable to save changes. Please check your input and try again.',
      );
    });

    it('should return null when 400 but no data field', () => {
      const error = { response: { status: 400 } };
      // Falls through to operation fallback
      const result = getUserFriendlyErrorMessage(error, 'load');
      expect(result).toBe(
        'Unable to load data. Please refresh the page and try again.',
      );
    });
  });

  describe('Operation fallback messages', () => {
    it('should return save message for "save" operation', () => {
      expect(getUserFriendlyErrorMessage({}, 'save')).toBe(
        'Unable to save changes. Please check your input and try again.',
      );
    });

    it('should return save message for "update" operation', () => {
      expect(getUserFriendlyErrorMessage({}, 'update')).toBe(
        'Unable to save changes. Please check your input and try again.',
      );
    });

    it('should return create message for "create" operation', () => {
      expect(getUserFriendlyErrorMessage({}, 'create')).toBe(
        'Unable to create the item. Please check your input and try again.',
      );
    });

    it('should return delete message for "delete" operation', () => {
      expect(getUserFriendlyErrorMessage({}, 'delete')).toBe(
        'Unable to delete the item. Please try again.',
      );
    });

    it('should return load message for "load" operation', () => {
      expect(getUserFriendlyErrorMessage({}, 'load')).toBe(
        'Unable to load data. Please refresh the page and try again.',
      );
    });

    it('should return load message for "fetch" operation', () => {
      expect(getUserFriendlyErrorMessage({}, 'fetch')).toBe(
        'Unable to load data. Please refresh the page and try again.',
      );
    });

    it('should return activate message for "activate" operation', () => {
      expect(getUserFriendlyErrorMessage({}, 'activate')).toBe(
        'Unable to activate the job. Please try again.',
      );
    });

    it('should return deactivate message for "deactivate" operation', () => {
      expect(getUserFriendlyErrorMessage({}, 'deactivate')).toBe(
        'Unable to deactivate the job. Please try again.',
      );
    });

    it('should return approve message for "approve" operation', () => {
      expect(getUserFriendlyErrorMessage({}, 'approve')).toBe(
        'Unable to approve the job. Please try again.',
      );
    });

    it('should return reject message for "reject" operation', () => {
      expect(getUserFriendlyErrorMessage({}, 'reject')).toBe(
        'Unable to reject the job. Please try again.',
      );
    });

    it('should return default message for unknown operation', () => {
      expect(getUserFriendlyErrorMessage({}, 'custom')).toBe(
        'An unexpected error occurred. Please try again or contact support.',
      );
    });

    it('should use "operation" as default operation name', () => {
      expect(getUserFriendlyErrorMessage({})).toBe(
        'An unexpected error occurred. Please try again or contact support.',
      );
    });
  });

  describe('getErrorDetails', () => {
    it('should return details from error with message and response', () => {
      const { getErrorDetails } = require('../../../src/shared/utils/errorUtils');

      const error = {
        message: 'Something went wrong',
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { detail: 'Resource not found' },
        },
      };

      const result = getErrorDetails(error);

      expect(result.message).toBe('Something went wrong');
      expect(result.status).toBe(404);
      expect(result.statusText).toBe('Not Found');
      expect(result.data).toEqual({ detail: 'Resource not found' });
      expect(result.url).toBeUndefined();
      expect(result.method).toBeUndefined();
    });

    it('should extract url and method from config', () => {
      const { getErrorDetails } = require('../../../src/shared/utils/errorUtils');

      const error = {
        message: 'Request failed',
        config: {
          url: '/api/resource',
          method: 'POST',
        },
      };

      const result = getErrorDetails(error);

      expect(result.url).toBe('/api/resource');
      expect(result.method).toBe('POST');
    });

    it('should return "Unknown error" when error has no message', () => {
      const { getErrorDetails } = require('../../../src/shared/utils/errorUtils');

      const result = getErrorDetails({});

      expect(result.message).toBe('Unknown error');
      expect(result.status).toBeUndefined();
      expect(result.url).toBeUndefined();
    });

    it('should return null for status and undefined for statusText when no response', () => {
      const { getErrorDetails } = require('../../../src/shared/utils/errorUtils');

      const result = getErrorDetails({ message: 'Network error' });

      expect(result.message).toBe('Network error');
      expect(result.status).toBeUndefined();
      expect(result.statusText).toBeUndefined();
      expect(result.data).toBeUndefined();
    });

    it('should handle error with null config gracefully', () => {
      const { getErrorDetails } = require('../../../src/shared/utils/errorUtils');

      const error = {
        message: 'Test error',
        config: null,
      };

      const result = getErrorDetails(error);

      expect(result.message).toBe('Test error');
      expect(result.url).toBeUndefined();
    });
  });
});
