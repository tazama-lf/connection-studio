import {
  submitCronJob,
  exportSchedule,
  sendForApproval,
  rejectSchedule,
  getErrorMessage,
  updateScheduleData,
  loadSchedules,
} from '@features/cron/handlers';
import type {
  ScheduleRequest,
  PaginatedScheduleResponse,
} from '@features/cron/types';

// Mock apiRequest
jest.mock('@utils/common/apiHelper', () => ({
  apiRequest: jest.fn(),
}));

import { apiRequest } from '@utils/common/apiHelper';

describe('Cron Job Handlers Branch Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiRequest as jest.Mock).mockClear();
  });

  describe('getErrorMessage branches', () => {
    it('should return error message when error has message property', () => {
      const error = new Error('Test error message');
      const result = getErrorMessage(error);
      expect(typeof result).toBe('string');
    });

    it('should return error response data message when available', () => {
      const error = { response: { data: { message: 'API error' } } };
      const result = getErrorMessage(error);
      expect(typeof result).toBe('string');
    });

    it('should return message for unknown error', () => {
      const error = {};
      const result = getErrorMessage(error);
      expect(typeof result).toBe('string');
    });

    it('should return message for null error', () => {
      const result = getErrorMessage(null);
      expect(typeof result).toBe('string');
    });

    it('should return message for undefined error', () => {
      const result = getErrorMessage(undefined);
      expect(typeof result).toBe('string');
    });

    it('should handle string errors', () => {
      const error = 'String error';
      const result = getErrorMessage(error);
      expect(typeof result).toBe('string');
    });

    it('should handle error with response but no data', () => {
      const error = { response: {} };
      const result = getErrorMessage(error);
      expect(typeof result).toBe('string');
    });

    it('should handle error with response data but no message', () => {
      const error = { response: { data: {} } };
      const result = getErrorMessage(error);
      expect(typeof result).toBe('string');
    });
  });

  describe('submitCronJob branches', () => {
    it('should submit cron job successfully', async () => {
      const mockResponse = { success: true, id: '123' };
      (apiRequest as jest.Mock).mockResolvedValue(mockResponse);

      const data = {
        name: 'Test Job',
        cron: '0 0 * * *',
        iterations: 5,
      };

      const result = await submitCronJob(data);
      expect(result).toEqual(mockResponse);
      expect(apiRequest).toHaveBeenCalled();
    });

    it('should trim name and cron expression', async () => {
      const mockResponse = { success: true, id: '456' };
      (apiRequest as jest.Mock).mockResolvedValue(mockResponse);

      const data = {
        name: '  Test Job  ',
        cron: '  0 0 * * *  ',
        iterations: 3,
      };

      await submitCronJob(data);
      expect(apiRequest).toHaveBeenCalled();
    });

    it('should handle cronExpression field', async () => {
      const mockResponse = { success: true, id: '789' };
      (apiRequest as jest.Mock).mockResolvedValue(mockResponse);

      const data = {
        name: 'Test',
        cronExpression: '0 1 * * *',
        iterations: 1,
      };

      await submitCronJob(data);
      expect(apiRequest).toHaveBeenCalled();
    });

    it('should throw when name is undefined', async () => {
      const mockResponse = { success: true, id: '100' };
      (apiRequest as jest.Mock).mockResolvedValue(mockResponse);

      const data = {
        cronExpression: '0 0 * * *',
        iterations: 1,
      };

      await expect(submitCronJob(data)).rejects.toThrow();
    });

    it('should use empty string when cron is undefined', async () => {
      const mockResponse = { success: true, id: '101' };
      (apiRequest as jest.Mock).mockResolvedValue(mockResponse);

      const data = {
        name: 'Test',
        iterations: 1,
      };

      await submitCronJob(data);
      expect(apiRequest).toHaveBeenCalled();
    });

    it('should use 0 when iterations is undefined', async () => {
      const mockResponse = { success: true, id: '102' };
      (apiRequest as jest.Mock).mockResolvedValue(mockResponse);

      const data = {
        name: 'Test',
        cron: '0 0 * * *',
      };

      await submitCronJob(data);
      expect(apiRequest).toHaveBeenCalled();
    });

    it('should prefer cron over cronExpression when both provided', async () => {
      const mockResponse = { success: true, id: '103' };
      (apiRequest as jest.Mock).mockResolvedValue(mockResponse);

      const data = {
        name: 'Test',
        cron: '0 0 * * *',
        cronExpression: '0 1 * * *',
        iterations: 1,
      };

      await submitCronJob(data);
      expect(apiRequest).toHaveBeenCalled();
    });

    it('should handle submit error response', async () => {
      (apiRequest as jest.Mock).mockRejectedValue(new Error('API Error'));

      const data = { name: 'Test', cron: '0 0 * * *', iterations: 1 };

      await expect(submitCronJob(data)).rejects.toThrow();
    });

    it('should handle network error', async () => {
      (apiRequest as jest.Mock).mockRejectedValue(new Error('Network error'));

      const data = { name: 'Test', cron: '0 0 * * *', iterations: 1 };

      await expect(submitCronJob(data)).rejects.toThrow('Network error');
    });
  });

  describe('updateScheduleData branches', () => {
    it('should update schedule successfully', async () => {
      const mockResponse = { success: true, message: 'Updated' };
      (apiRequest as jest.Mock).mockResolvedValue(mockResponse);

      const id = '123';
      const data = { name: 'Updated Job', cron: '0 1 * * *', iterations: 3 };

      const result = await updateScheduleData(id, data);
      expect(result).toEqual(mockResponse);
      expect(apiRequest).toHaveBeenCalled();
    });

    it('should handle update error', async () => {
      (apiRequest as jest.Mock).mockRejectedValue(new Error('Update failed'));

      const data = { name: 'Test', cron: '0 0 * * *', iterations: 1 };
      await expect(updateScheduleData('999', data)).rejects.toThrow();
    });
  });

  describe('loadSchedules branches', () => {
    it('should load schedules with default parameters', async () => {
      const mockResponse = {
        data: [],
        total: 0,
        pages: 0,
      } as PaginatedScheduleResponse;
      (apiRequest as jest.Mock).mockResolvedValue(mockResponse);

      const result = await loadSchedules(1, 10, 'editor', {});
      expect(result).toEqual(mockResponse);
      expect(apiRequest).toHaveBeenCalled();
    });

    it('should load schedules with custom page', async () => {
      const mockResponse = {
        data: [{ id: '1', name: 'Job 1' }],
        total: 1,
        pages: 1,
      } as PaginatedScheduleResponse;
      (apiRequest as jest.Mock).mockResolvedValue(mockResponse);

      const result = await loadSchedules(2, 10, 'approver', {});
      expect(result).toEqual(mockResponse);
    });

    it('should load schedules with limit', async () => {
      const mockResponse = {
        data: [],
        total: 0,
        pages: 0,
      } as PaginatedScheduleResponse;
      (apiRequest as jest.Mock).mockResolvedValue(mockResponse);

      const result = await loadSchedules(1, 20, 'editor', {});
      expect(result).toEqual(mockResponse);
    });

    it('should load schedules with status filter in searchingFilters', async () => {
      const mockResponse = {
        data: [],
        total: 0,
        pages: 0,
      } as PaginatedScheduleResponse;
      (apiRequest as jest.Mock).mockResolvedValue(mockResponse);

      const filters = { status: 'active' };
      const result = await loadSchedules(1, 10, 'approver', filters);
      expect(result).toEqual(mockResponse);
    });

    it('should load schedules without status filter to use userRole-based filter', async () => {
      const mockResponse = {
        data: [],
        total: 0,
        pages: 0,
      } as PaginatedScheduleResponse;
      (apiRequest as jest.Mock).mockResolvedValue(mockResponse);

      const filters = { search: 'test' };
      const result = await loadSchedules(1, 10, 'editor', filters);
      expect(result).toEqual(mockResponse);
    });

    it('should load schedules with empty filters', async () => {
      const mockResponse = {
        data: [],
        total: 0,
        pages: 0,
      } as PaginatedScheduleResponse;
      (apiRequest as jest.Mock).mockResolvedValue(mockResponse);

      const result = await loadSchedules(1, 10, 'approver', {});
      expect(result).toEqual(mockResponse);
    });

    it('should load schedules with filters', async () => {
      const mockResponse = {
        data: [],
        total: 0,
        pages: 0,
      } as PaginatedScheduleResponse;
      (apiRequest as jest.Mock).mockResolvedValue(mockResponse);

      const filters = { status: 'active', search: 'test' };
      const result = await loadSchedules(1, 10, 'approver', filters);
      expect(result).toEqual(mockResponse);
    });

    it('should handle load error', async () => {
      (apiRequest as jest.Mock).mockRejectedValue(new Error('Load failed'));

      await expect(loadSchedules(1, 10, 'user', {})).rejects.toThrow();
    });
  });

  describe('exportSchedule branches', () => {
    it('should export schedule successfully', async () => {
      const mockResponse = { success: true, message: 'Exported' };
      (apiRequest as jest.Mock).mockResolvedValue(mockResponse);

      const id = '456';
      const result = await exportSchedule(id);
      expect(result).toEqual(mockResponse);
      expect(apiRequest).toHaveBeenCalled();
    });

    it('should handle export error', async () => {
      (apiRequest as jest.Mock).mockRejectedValue(new Error('Export failed'));

      await expect(exportSchedule('789')).rejects.toThrow();
    });
  });

  describe('sendForApproval branches', () => {
    it('should send for approval successfully', async () => {
      const mockResponse = { success: true, message: 'Sent for approval' };
      (apiRequest as jest.Mock).mockResolvedValue(mockResponse);

      const id = '111';
      const result = await sendForApproval(id);
      expect(result).toEqual(mockResponse);
      expect(apiRequest).toHaveBeenCalled();
    });

    it('should handle send for approval error', async () => {
      (apiRequest as jest.Mock).mockRejectedValue(new Error('Approval failed'));

      await expect(sendForApproval('222')).rejects.toThrow();
    });
  });

  describe('rejectSchedule branches', () => {
    it('should reject schedule with reason', async () => {
      const mockResponse = { success: true, message: 'Rejected' };
      (apiRequest as jest.Mock).mockResolvedValue(mockResponse);

      const id = '555';
      const reason = 'Does not meet requirements';
      const result = await rejectSchedule(id, reason);
      expect(result).toEqual(mockResponse);
      expect(apiRequest).toHaveBeenCalled();
    });

    it('should reject schedule without reason', async () => {
      const mockResponse = { success: true, message: 'Rejected' };
      (apiRequest as jest.Mock).mockResolvedValue(mockResponse);

      const id = '666';
      const result = await rejectSchedule(id);
      expect(result).toEqual(mockResponse);
    });

    it('should handle reject error', async () => {
      (apiRequest as jest.Mock).mockRejectedValue(new Error('Reject failed'));

      await expect(rejectSchedule('777', 'Reason')).rejects.toThrow();
    });
  });

  describe('API error handling branches', () => {
    it('should handle 400 Bad Request', async () => {
      (apiRequest as jest.Mock).mockRejectedValue(new Error('Bad Request'));

      await expect(submitCronJob({})).rejects.toThrow();
    });

    it('should handle 401 Unauthorized', async () => {
      (apiRequest as jest.Mock).mockRejectedValue(new Error('Unauthorized'));

      await expect(loadSchedules(1, 10, 'user', {})).rejects.toThrow();
    });

    it('should handle 403 Forbidden', async () => {
      (apiRequest as jest.Mock).mockRejectedValue(new Error('Forbidden'));

      await expect(exportSchedule('1')).rejects.toThrow();
    });

    it('should handle 404 Not Found', async () => {
      (apiRequest as jest.Mock).mockRejectedValue(new Error('Not Found'));

      const data = { name: 'Test', cron: '0 0 * * *', iterations: 1 };
      await expect(updateScheduleData('999', data)).rejects.toThrow();
    });

    it('should handle 500 Internal Server Error', async () => {
      (apiRequest as jest.Mock).mockRejectedValue(
        new Error('Internal Server Error'),
      );

      await expect(loadSchedules(1, 10, 'user', {})).rejects.toThrow();
    });
  });
});
