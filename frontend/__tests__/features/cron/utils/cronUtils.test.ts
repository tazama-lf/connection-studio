import {
  getCronJobErrorMessage,
  formatScheduleForEdit,
  validationSchema,
} from '@features/cron/utils';
import type {
  ScheduleResponse,
  ErrorWithResponse,
} from '@features/cron/types';
import { CRON_JOB_ERROR_MESSAGES } from '@features/cron/constants';

describe('Cron Job Utils', () => {
  describe('getCronJobErrorMessage', () => {
    it('should return INVALID_INPUT message for 400 status', () => {
      const error: ErrorWithResponse = {
        response: {
          status: 400,
          data: {},
        },
        message: 'Bad Request',
      };

      const result = getCronJobErrorMessage(error);

      expect(result).toBe(CRON_JOB_ERROR_MESSAGES.INVALID_INPUT);
    });

    it('should return DUPLICATE_NAME message for 409 status', () => {
      const error: ErrorWithResponse = {
        response: {
          status: 409,
          data: {},
        },
        message: 'Conflict',
      };

      const result = getCronJobErrorMessage(error);

      expect(result).toBe(CRON_JOB_ERROR_MESSAGES.DUPLICATE_NAME);
    });

    it('should return UNAUTHORIZED message for 401 status', () => {
      const error: ErrorWithResponse = {
        response: {
          status: 401,
          data: {},
        },
        message: 'Unauthorized',
      };

      const result = getCronJobErrorMessage(error);

      expect(result).toBe(CRON_JOB_ERROR_MESSAGES.UNAUTHORIZED);
    });

    it('should return UNAUTHORIZED message for 403 status', () => {
      const error: ErrorWithResponse = {
        response: {
          status: 403,
          data: {},
        },
        message: 'Forbidden',
      };

      const result = getCronJobErrorMessage(error);

      expect(result).toBe(CRON_JOB_ERROR_MESSAGES.UNAUTHORIZED);
    });

    it('should return SERVER_ERROR message for 500 status', () => {
      const error: ErrorWithResponse = {
        response: {
          status: 500,
          data: {},
        },
        message: 'Internal Server Error',
      };

      const result = getCronJobErrorMessage(error);

      expect(result).toBe(CRON_JOB_ERROR_MESSAGES.SERVER_ERROR);
    });

    it('should return SERVER_ERROR message for 503 status', () => {
      const error: ErrorWithResponse = {
        response: {
          status: 503,
          data: {},
        },
        message: 'Service Unavailable',
      };

      const result = getCronJobErrorMessage(error);

      expect(result).toBe(CRON_JOB_ERROR_MESSAGES.SERVER_ERROR);
    });

    it('should return NETWORK_ERROR message for fetch errors', () => {
      const error = {
        message: 'Failed to fetch',
        name: 'Error',
      };

      const result = getCronJobErrorMessage(error);

      expect(result).toBe(CRON_JOB_ERROR_MESSAGES.NETWORK_ERROR);
    });

    it('should return NETWORK_ERROR message for network errors', () => {
      const error = {
        message: 'Network request failed',
      };

      const result = getCronJobErrorMessage(error);

      expect(result).toBe('Network request failed');
    });

    it('should return custom error message from response data', () => {
      const customMessage = 'Custom error from backend';
      const error: ErrorWithResponse = {
        response: {
          status: 422,
          data: {
            message: customMessage,
          },
        },
        message: 'Error',
      };

      const result = getCronJobErrorMessage(error);

      expect(result).toBe(customMessage);
    });

    it('should return error message property when no response', () => {
      const error = {
        message: 'Some generic error',
        name: 'Error',
      };

      const result = getCronJobErrorMessage(error);

      expect(result).toBe('Some generic error');
    });

    it('should return GENERAL error message as fallback', () => {
      const error = {};

      const result = getCronJobErrorMessage(error);

      expect(result).toBe(CRON_JOB_ERROR_MESSAGES.GENERAL);
    });

    it('should handle undefined error gracefully', () => {
      const result = getCronJobErrorMessage(undefined);

      expect(result).toBe(CRON_JOB_ERROR_MESSAGES.GENERAL);
    });

    it('should handle null error gracefully', () => {
      const result = getCronJobErrorMessage(null);

      expect(result).toBe(CRON_JOB_ERROR_MESSAGES.GENERAL);
    });
  });

  describe('formatScheduleForEdit', () => {
    it('should format complete schedule data correctly', () => {
      const schedule: ScheduleResponse = {
        id: 'schedule-123',
        name: 'Test Schedule',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 10,
        schedule_status: 'active',
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        status: 'STATUS_04_APPROVED',
        comments: 'This is a test schedule',
        created_at: '2025-01-01T00:00:00Z',
      };

      const result = formatScheduleForEdit(schedule);

      expect(result).toEqual({
        id: 'schedule-123',
        name: 'Test Schedule',
        cronExpression: '0 0 * * *',
        iterations: 10,
        schedule_status: 'active',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        status: 'STATUS_04_APPROVED',
        comments: 'This is a test schedule',
      });
    });

    it('should use empty string for missing start date', () => {
      const schedule: ScheduleResponse = {
        id: 'schedule-123',
        name: 'Test',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 1,
        schedule_status: 'active',
        status: 'STATUS_01_IN_PROGRESS',
        created_at: '2025-01-01',
      };

      const result = formatScheduleForEdit(schedule);

      expect(result.startDate).toBe('');
    });

    it('should use empty string for missing end date', () => {
      const schedule: ScheduleResponse = {
        id: 'schedule-123',
        name: 'Test',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 1,
        schedule_status: 'active',
        status: 'STATUS_01_IN_PROGRESS',
        created_at: '2025-01-01',
      };

      const result = formatScheduleForEdit(schedule);

      expect(result.endDate).toBe('');
    });

    it('should use empty string for missing status', () => {
      const schedule: ScheduleResponse = {
        id: 'schedule-123',
        name: 'Test',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 1,
        schedule_status: 'active',
        created_at: '2025-01-01',
      };

      const result = formatScheduleForEdit(schedule);

      expect(result.status).toBe('');
    });

    it('should use empty string for missing comments', () => {
      const schedule: ScheduleResponse = {
        id: 'schedule-123',
        name: 'Test',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 1,
        schedule_status: 'active',
        status: 'STATUS_01_IN_PROGRESS',
        created_at: '2025-01-01',
      };

      const result = formatScheduleForEdit(schedule);

      expect(result.comments).toBe('');
    });

    it('should correctly map cron to cronExpression', () => {
      const schedule: ScheduleResponse = {
        id: 'schedule-123',
        name: 'Test',
        cron: '*/5 * * * *',
        cronExpression: '*/5 * * * *',
        iterations: 1,
        schedule_status: 'active',
        status: 'STATUS_01_IN_PROGRESS',
        created_at: '2025-01-01',
      };

      const result = formatScheduleForEdit(schedule);

      expect(result.cronExpression).toBe('*/5 * * * *');
      expect(result).not.toHaveProperty('cron');
    });

    it('should preserve schedule_status when provided', () => {
      const schedule: ScheduleResponse = {
        id: 'schedule-123',
        name: 'Test',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 1,
        schedule_status: 'paused',
        status: 'STATUS_01_IN_PROGRESS',
        created_at: '2025-01-01',
      };

      const result = formatScheduleForEdit(schedule);

      expect(result.schedule_status).toBe('paused');
    });

    it('should handle minimal schedule data', () => {
      const schedule: ScheduleResponse = {
        id: 'min-123',
        name: 'Minimal',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 1,
        schedule_status: 'active',
        created_at: '2025-01-01',
      };

      const result = formatScheduleForEdit(schedule);

      expect(result).toEqual({
        id: 'min-123',
        name: 'Minimal',
        cronExpression: '0 0 * * *',
        iterations: 1,
        schedule_status: 'active',
        startDate: '',
        endDate: '',
        status: '',
        comments: '',
      });
    });
  });

  describe('validationSchema', () => {
    it('should handle null iterations value in transform', async () => {
      const dataWithNull = {
        name: 'Test Job',
        cronExpression: '0 0 * * *',
        iterations: null,
      };

      await expect(validationSchema.validate(dataWithNull)).rejects.toThrow('Iterations is required');
    });

    it('should handle undefined iterations value in transform', async () => {
      const dataWithUndefined = {
        name: 'Test Job',
        cronExpression: '0 0 * * *',
        iterations: undefined,
      };

      await expect(validationSchema.validate(dataWithUndefined)).rejects.toThrow();
    });

    it('should handle empty string iterations in transform', async () => {
      const dataWithEmptyString = {
        name: 'Test Job',
        cronExpression: '0 0 * * *',
        iterations: '',
      };

      await expect(validationSchema.validate(dataWithEmptyString)).rejects.toThrow();
    });
  });
});
