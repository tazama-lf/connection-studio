import {
  cronJobApi,
  submitCronJob,
  rejectSchedule,
  exportSchedule,
  updateScheduleData,
  sendForApproval,
  prepareScheduleForEdit,
  loadSchedules,
  CRON_JOB_SUCCESS_MESSAGES,
  CRON_JOB_STATUSES,
} from '../../../../features/cron/handlers';
import { apiRequest } from '@utils/common/apiHelper';
import { ENV } from '@shared/config/environment.config';
import type {
  ScheduleResponse,
  PaginatedScheduleResponse,
  ScheduleCreateResponse,
} from '../../../../features/cron/types';

jest.mock('@utils/common/apiHelper');
jest.mock('@shared/lovs', () => ({
  getDemsStatusLov: {
    editor: [
      { value: 'STATUS_01_IN_PROGRESS', label: 'In Progress' },
      { value: 'STATUS_05_REJECTED', label: 'Rejected' },
    ],
    approver: [{ value: 'STATUS_03_UNDER_REVIEW', label: 'Under Review' }],
  },
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe('Cron Job Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('cronJobApi.getList', () => {
    it('should fetch paginated schedules with correct parameters', async () => {
      const mockResponse: PaginatedScheduleResponse = {
        data: [
          {
            id: '1',
            name: 'Test Schedule',
            cron: '0 0 * * *',
            cronExpression: '0 0 * * *',
            iterations: 5,
            schedule_status: 'active',
            status: 'STATUS_04_APPROVED',
            created_at: '2025-01-01',
          },
        ],
        total: 1,
        limit: 10,
        offset: 0,
        pages: 1,
      };

      mockApiRequest.mockResolvedValue(mockResponse);

      const result = await cronJobApi.getList(
        { offset: 0, limit: 10, userRole: 'editor' },
        { status: 'STATUS_04_APPROVED' },
      );

      expect(mockApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('/scheduler/all'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('STATUS_04_APPROVED'),
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it('should use default status filter when no status provided', async () => {
      const mockResponse: PaginatedScheduleResponse = {
        data: [],
        total: 0,
        limit: 10,
        offset: 0,
        pages: 0,
      };

      mockApiRequest.mockResolvedValue(mockResponse);

      await cronJobApi.getList({ offset: 0, limit: 10, userRole: 'editor' });

      expect(mockApiRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('STATUS_01_IN_PROGRESS'),
        }),
      );
    });
  });

  describe('cronJobApi.create', () => {
    it('should create a new cron job successfully', async () => {
      const mockRequest = {
        name: 'Daily Backup',
        cron: '0 0 * * *',
        iterations: 10,
      };

      const mockResponse: ScheduleCreateResponse = {
        success: true,
        message: 'Schedule created successfully',
      };

      mockApiRequest.mockResolvedValue(mockResponse);

      const result = await cronJobApi.create(mockRequest);

      expect(mockApiRequest).toHaveBeenCalledWith(
        `${ENV.API_BASE_URL}/scheduler/create`,
        {
          method: 'POST',
          body: JSON.stringify(mockRequest),
        },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('cronJobApi.getAll', () => {
    it('should fetch all approved and exported schedules', async () => {
      const mockSchedules: ScheduleResponse[] = [
        {
          id: '1',
          name: 'Schedule 1',
          cron: '0 0 * * *',
          cronExpression: '0 0 * * *',
          iterations: 5,
          schedule_status: 'active',
          status: 'STATUS_04_APPROVED',
          created_at: '2025-01-01',
        },
        {
          id: '2',
          name: 'Schedule 2',
          cron: '0 12 * * *',
          cronExpression: '0 12 * * *',
          iterations: 3,
          schedule_status: 'active',
          status: 'STATUS_06_EXPORTED',
          created_at: '2025-01-02',
        },
      ];

      mockApiRequest.mockResolvedValue(mockSchedules);

      const result = await cronJobApi.getAll();

      expect(mockApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('/scheduler/all'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(
            'STATUS_04_APPROVED,STATUS_06_EXPORTED',
          ),
        }),
      );
      expect(result).toEqual(mockSchedules);
    });

    it('should accept custom offset and limit parameters', async () => {
      mockApiRequest.mockResolvedValue([]);

      await cronJobApi.getAll(10, 25);

      expect(mockApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('offset=10&limit=25'),
        expect.any(Object),
      );
    });
  });

  describe('cronJobApi.getById', () => {
    it('should fetch a schedule by ID', async () => {
      const mockSchedule: ScheduleResponse = {
        id: 'schedule-123',
        name: 'Test Schedule',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 5,
        schedule_status: 'active',
        status: 'STATUS_04_APPROVED',
        created_at: '2025-01-01',
      };

      mockApiRequest.mockResolvedValue(mockSchedule);

      const result = await cronJobApi.getById('schedule-123');

      expect(mockApiRequest).toHaveBeenCalledWith(
        `${ENV.API_BASE_URL}/scheduler/schedule-123`,
      );
      expect(result).toEqual(mockSchedule);
    });
  });

  describe('cronJobApi.update', () => {
    it('should update a schedule with valid data', async () => {
      const mockResponse = { success: true, message: 'Schedule updated' };

      mockApiRequest.mockResolvedValue(mockResponse);

      const updates = {
        name: 'Updated Schedule',
        cron: '0 12 * * *',
        iterations: 15,
      };

      const result = await cronJobApi.update('schedule-123', updates);

      expect(mockApiRequest).toHaveBeenCalledWith(
        `${ENV.API_BASE_URL}/scheduler/update/schedule-123`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            name: updates.name,
            start_date: undefined,
            iterations: updates.iterations,
            cron: updates.cron,
          }),
        },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('cronJobApi.updateStatus', () => {
    it('should update schedule status without reason', async () => {
      const mockResponse = { success: true, message: 'Status updated' };

      mockApiRequest.mockResolvedValue(mockResponse);

      const result = await cronJobApi.updateStatus(
        'schedule-123',
        'STATUS_04_APPROVED',
      );

      expect(mockApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('status=STATUS_04_APPROVED'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ reason: '' }),
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it('should update schedule status with reason', async () => {
      const mockResponse = { success: true, message: 'Status updated' };

      mockApiRequest.mockResolvedValue(mockResponse);

      await cronJobApi.updateStatus(
        'schedule-123',
        'STATUS_05_REJECTED',
        'Invalid configuration',
      );

      expect(mockApiRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ reason: 'Invalid configuration' }),
        }),
      );
    });
  });

  describe('submitCronJob', () => {
    it('should submit a cron job with trimmed data', async () => {
      const mockResponse: ScheduleCreateResponse = {
        success: true,
        message: 'Schedule created successfully',
      };

      mockApiRequest.mockResolvedValue(mockResponse);

      const data = {
        name: '  New Job  ',
        cronExpression: '  0 0 * * *  ',
        iterations: 5,
      };

      const result = await submitCronJob(data);

      expect(mockApiRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            name: 'New Job',
            cron: '0 0 * * *',
            iterations: 5,
          }),
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle data with cron property instead of cronExpression', async () => {
      mockApiRequest.mockResolvedValue({
        success: true,
        message: 'Created',
      });

      const data = {
        name: 'Job',
        cron: '0 0 * * *',
        iterations: 1,
      };

      await submitCronJob(data);

      expect(mockApiRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('0 0 * * *'),
        }),
      );
    });
  });

  describe('rejectSchedule', () => {
    it('should reject a schedule with reason', async () => {
      const mockResponse = { success: true, message: 'Schedule rejected' };
      mockApiRequest.mockResolvedValue(mockResponse);

      const result = await rejectSchedule(
        'schedule-123',
        'Does not meet requirements',
      );

      expect(mockApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('status=STATUS_05_REJECTED'),
        expect.objectContaining({
          body: JSON.stringify({ reason: 'Does not meet requirements' }),
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it('should reject a schedule without reason', async () => {
      const mockResponse = { success: true, message: 'Schedule rejected' };
      mockApiRequest.mockResolvedValue(mockResponse);

      await rejectSchedule('schedule-123');

      expect(mockApiRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ reason: '' }),
        }),
      );
    });
  });

  describe('exportSchedule', () => {
    it('should export a schedule successfully', async () => {
      const mockResponse = { success: true, message: 'Schedule exported' };
      mockApiRequest.mockResolvedValue(mockResponse);

      const result = await exportSchedule('schedule-123');

      expect(mockApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('status=STATUS_06_EXPORTED'),
        expect.any(Object),
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateScheduleData', () => {
    it('should update schedule data', async () => {
      const mockResponse = { success: true, message: 'Updated' };
      mockApiRequest.mockResolvedValue(mockResponse);

      const payload = {
        name: 'Updated Name',
        cron: '0 12 * * *',
        iterations: 20,
      };

      const result = await updateScheduleData('schedule-123', payload);

      expect(result).toEqual(mockResponse);
    });
  });

  describe('sendForApproval', () => {
    it('should send schedule for approval', async () => {
      const mockResponse = { success: true, message: 'Sent for approval' };
      mockApiRequest.mockResolvedValue(mockResponse);

      const result = await sendForApproval('schedule-123');

      expect(mockApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('status=STATUS_03_UNDER_REVIEW'),
        expect.any(Object),
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('prepareScheduleForEdit', () => {
    it('should format schedule data for editing', () => {
      const schedule: ScheduleResponse = {
        id: 'schedule-123',
        name: 'Test Schedule',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 5,
        status: 'STATUS_04_APPROVED',
        schedule_status: 'active',
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        comments: 'Test comment',
        created_at: '2025-01-01',
      };

      const result = prepareScheduleForEdit(schedule);

      expect(result).toEqual({
        id: 'schedule-123',
        name: 'Test Schedule',
        cronExpression: '0 0 * * *',
        iterations: 5,
        schedule_status: 'active',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        status: 'STATUS_04_APPROVED',
        comments: 'Test comment',
      });
    });

    it('should use default dates when not provided', () => {
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

      const result = prepareScheduleForEdit(schedule);

      expect(result.startDate).toBe('2025-11-18');
      expect(result.endDate).toBe('2025-12-31');
      expect(result.status).toBe('STATUS_01_IN_PROGRESS');
      expect(result.comments).toBe('');
    });
  });

  describe('loadSchedules', () => {
    it('should load schedules with correct parameters', async () => {
      const mockResponse: PaginatedScheduleResponse = {
        data: [],
        total: 0,
        limit: 10,
        offset: 0,
        pages: 0,
      };

      mockApiRequest.mockResolvedValue(mockResponse);

      const result = await loadSchedules(2, 20, 'editor', {
        status: 'STATUS_04_APPROVED',
      });

      expect(mockApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('offset=1&limit=20'),
        expect.any(Object),
      );
      expect(result).toEqual(mockResponse);
    });

    it('should calculate offset from page number correctly', async () => {
      mockApiRequest.mockResolvedValue({
        data: [],
        total: 0,
        limit: 10,
        offset: 0,
        pages: 0,
      });

      await loadSchedules(5, 10, 'editor', {});

      expect(mockApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('offset=4&limit=10'),
        expect.any(Object),
      );
    });
  });

  describe('Constants Export', () => {
    it('should export CRON_JOB_SUCCESS_MESSAGES', () => {
      expect(CRON_JOB_SUCCESS_MESSAGES.CREATED('Test')).toBe(
        'Schedule "Test" created successfully!',
      );
      expect(CRON_JOB_SUCCESS_MESSAGES.UPDATED).toBe(
        'Schedule updated successfully',
      );
    });

    it('should export CRON_JOB_STATUSES', () => {
      expect(CRON_JOB_STATUSES.IN_PROGRESS).toBe('STATUS_01_IN_PROGRESS');
      expect(CRON_JOB_STATUSES.APPROVED).toBe('STATUS_04_APPROVED');
      expect(CRON_JOB_STATUSES.REJECTED).toBe('STATUS_05_REJECTED');
    });
  });
});
