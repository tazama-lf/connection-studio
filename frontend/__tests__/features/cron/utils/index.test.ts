import {
  getCronJobErrorMessage,
  formatScheduleForEdit,
  validationSchema,
} from '../../../../src/features/cron/utils/index';
import { CRON_JOB_ERROR_MESSAGES } from '../../../../src/features/cron/constants';

describe('features/cron/utils/index.ts', () => {
  describe('getCronJobErrorMessage', () => {
    it('should return status-based message for 400 error', () => {
      const error = { response: { status: 400 } };
      expect(getCronJobErrorMessage(error)).toBe(
        CRON_JOB_ERROR_MESSAGES.INVALID_INPUT,
      );
    });

    it('should return status-based message for 409 conflict error', () => {
      const error = { response: { status: 409 } };
      expect(getCronJobErrorMessage(error)).toBe(
        CRON_JOB_ERROR_MESSAGES.DUPLICATE_NAME,
      );
    });

    it('should return status-based message for 401 unauthorized error', () => {
      const error = { response: { status: 401 } };
      expect(getCronJobErrorMessage(error)).toBe(
        CRON_JOB_ERROR_MESSAGES.UNAUTHORIZED,
      );
    });

    it('should return status-based message for 403 forbidden error', () => {
      const error = { response: { status: 403 } };
      expect(getCronJobErrorMessage(error)).toBe(
        CRON_JOB_ERROR_MESSAGES.UNAUTHORIZED,
      );
    });

    it('should return status-based message for 500+ server error', () => {
      const error = { response: { status: 502 } };
      expect(getCronJobErrorMessage(error)).toBe(
        CRON_JOB_ERROR_MESSAGES.SERVER_ERROR,
      );
    });

    it('should return custom message from response.data.message when available', () => {
      const error = {
        response: {
          status: 499, // Use a status that doesn't have a predefined message
          data: { message: 'Custom validation error' },
        },
      };
      expect(getCronJobErrorMessage(error)).toBe('Custom validation error');
    });

    it('should return message from error.message for fetch errors', () => {
      const error = { message: 'Failed to fetch' };
      expect(getCronJobErrorMessage(error)).toBe(
        CRON_JOB_ERROR_MESSAGES.NETWORK_ERROR,
      );
    });

    it('should return message from error.message for network errors', () => {
      const error = { message: 'network timeout' }; // Use lowercase 'network'
      expect(getCronJobErrorMessage(error)).toBe(
        CRON_JOB_ERROR_MESSAGES.NETWORK_ERROR,
      );
    });

    it('should return error message directly if no fetch/network keywords', () => {
      const error = { message: 'Some other error' };
      expect(getCronJobErrorMessage(error)).toBe('Some other error');
    });

    it('should return GENERAL message for unknown error type', () => {
      expect(getCronJobErrorMessage(null)).toBe(
        CRON_JOB_ERROR_MESSAGES.GENERAL,
      );
      expect(getCronJobErrorMessage(undefined)).toBe(
        CRON_JOB_ERROR_MESSAGES.GENERAL,
      );
      expect(getCronJobErrorMessage({})).toBe(CRON_JOB_ERROR_MESSAGES.GENERAL);
    });

    it('should handle error without message field at response.data', () => {
      const error = { response: { status: 499, data: {} } };
      expect(getCronJobErrorMessage(error)).toBe(
        CRON_JOB_ERROR_MESSAGES.GENERAL,
      );
    });
  });

  describe('formatScheduleForEdit', () => {
    it('should format schedule with all fields present', () => {
      const schedule = {
        id: '123',
        name: 'Daily Job',
        cron: '0 0 * * *',
        iterations: 10,
        schedule_status: 'ACTIVE',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'APPROVED',
        comments: 'Test job',
      };

      const result = formatScheduleForEdit(schedule);

      expect(result).toEqual({
        id: '123',
        name: 'Daily Job',
        cronExpression: '0 0 * * *',
        iterations: 10,
        schedule_status: 'ACTIVE',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        status: 'APPROVED',
        comments: 'Test job',
      });
    });

    it('should use empty string for missing optional date fields', () => {
      const schedule = {
        id: '456',
        name: 'One-time Job',
        cron: '0 12 15 * *',
        iterations: 1,
        schedule_status: 'INACTIVE',
      };

      const result = formatScheduleForEdit(schedule as any);

      expect(result.startDate).toBe('');
      expect(result.endDate).toBe('');
      expect(result.status).toBe('');
      expect(result.comments).toBe('');
    });

    it('should handle undefined optional fields correctly', () => {
      const schedule = {
        id: '789',
        name: 'Test',
        cron: '0 0 * * *',
        iterations: 5,
        schedule_status: 'ACTIVE',
        start_date: undefined,
        end_date: null as any,
        status: undefined,
        comments: null as any,
      };

      const result = formatScheduleForEdit(schedule);

      expect(result).toEqual({
        id: '789',
        name: 'Test',
        cronExpression: '0 0 * * *',
        iterations: 5,
        schedule_status: 'ACTIVE',
        startDate: '',
        endDate: '',
        status: '',
        comments: '',
      });
    });
  });

  describe('validationSchema', () => {
    it('should validate correct job configuration', async () => {
      const validData = {
        name: 'Test Job',
        cronExpression: '0 0 * * *',
        iterations: 10,
      };

      await expect(validationSchema.validate(validData)).resolves.toEqual(
        validData,
      );
    });

    it('should reject empty name', async () => {
      const invalidData = {
        name: '',
        cronExpression: '0 0 * * *',
        iterations: 10,
      };

      await expect(validationSchema.validate(invalidData)).rejects.toThrow(
        'Job name is required',
      );
    });

    it('should reject name shorter than 2 characters', async () => {
      const invalidData = {
        name: 'A',
        cronExpression: '0 0 * * *',
        iterations: 10,
      };

      await expect(validationSchema.validate(invalidData)).rejects.toThrow(
        'Job name must be at least 2 characters',
      );
    });

    it('should reject name longer than 50 characters', async () => {
      const invalidData = {
        name: 'A'.repeat(51),
        cronExpression: '0 0 * * *',
        iterations: 10,
      };

      await expect(validationSchema.validate(invalidData)).rejects.toThrow(
        'Job name must not exceed 50 characters',
      );
    });

    it('should reject missing cronExpression', async () => {
      const invalidData = {
        name: 'Test Job',
        cronExpression: '',
        iterations: 10,
      };

      await expect(validationSchema.validate(invalidData)).rejects.toThrow(
        'Cron expression is required',
      );
    });

    it('should reject missing iterations', async () => {
      const invalidData = {
        name: 'Test Job',
        cronExpression: '0 0 * * *',
        iterations: undefined,
      };

      await expect(validationSchema.validate(invalidData)).rejects.toThrow(
        'Iterations is required',
      );
    });

    it('should reject iterations less than 1', async () => {
      const invalidData = {
        name: 'Test Job',
        cronExpression: '0 0 * * *',
        iterations: 0,
      };

      await expect(validationSchema.validate(invalidData)).rejects.toThrow(
        'Iterations must be at least 1',
      );
    });

    it('should reject iterations greater than 1000', async () => {
      const invalidData = {
        name: 'Test Job',
        cronExpression: '0 0 * * *',
        iterations: 1001,
      };

      await expect(validationSchema.validate(invalidData)).rejects.toThrow(
        'Iterations must not exceed 1000',
      );
    });

    it('should reject non-integer iterations', async () => {
      const invalidData = {
        name: 'Test Job',
        cronExpression: '0 0 * * *',
        iterations: 10.5,
      };

      await expect(validationSchema.validate(invalidData)).rejects.toThrow(
        'Iterations must be a whole number',
      );
    });

    it('should transform empty string iterations to undefined', async () => {
      const invalidData = {
        name: 'Test Job',
        cronExpression: '0 0 * * *',
        iterations: '' as any,
      };

      await expect(validationSchema.validate(invalidData)).rejects.toThrow(
        'Iterations is required',
      );
    });

    it('should transform null iterations to undefined', async () => {
      const invalidData = {
        name: 'Test Job',
        cronExpression: '0 0 * * *',
        iterations: null as any,
      };

      await expect(validationSchema.validate(invalidData)).rejects.toThrow(
        'Iterations is required',
      );
    });
  });
});
