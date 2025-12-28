import { renderHook, act } from '@testing-library/react';
import { waitFor } from '@testing-library/dom';
import { useCronJobList } from '../../../../features/cron/hooks/useCronJobList';
import * as cronHandlers from '../../../../features/cron/handlers';
import { useToast } from '@shared/providers/ToastProvider';
import { useAuth } from '@features/auth/contexts/AuthContext';
import type { ScheduleResponse } from '../../../../features/cron/types';

jest.mock('@shared/providers/ToastProvider');
jest.mock('@features/auth/contexts/AuthContext');
jest.mock('../../../../features/cron/handlers');

const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();
const mockLoadSchedules = cronHandlers.loadSchedules as jest.MockedFunction<
  typeof cronHandlers.loadSchedules
>;

describe('useCronJobList', () => {
  const mockSchedule: ScheduleResponse = {
    id: 'schedule-1',
    name: 'Test Schedule',
    cron: '0 0 * * *',
    cronExpression: '0 0 * * *',
    iterations: 5,
    schedule_status: 'active',
    status: 'STATUS_04_APPROVED',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useToast as jest.Mock).mockReturnValue({
      showSuccess: mockShowSuccess,
      showError: mockShowError,
    });

    (useAuth as jest.Mock).mockReturnValue({
      user: {
        claims: ['ROLE_EDITOR'],
      },
    });

    mockLoadSchedules.mockResolvedValue({
      data: [mockSchedule],
      total: 1,
      pages: 1,
      offset: 0,
      limit: 10,
    });
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useCronJobList());

    expect(result.current.schedules).toEqual([]);
    expect(result.current.pagination).toEqual({
      page: 1,
      totalPages: 0,
      totalRecords: 0,
    });
    expect(result.current.selectedSchedule).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it('should load schedules on mount', async () => {
    const { result } = renderHook(() => useCronJobList());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockLoadSchedules).toHaveBeenCalled();
    expect(result.current.schedules).toHaveLength(1);
    expect(result.current.pagination.totalRecords).toBe(1);
  });

  it('should handle load schedules error', async () => {
    const errorMessage = 'Failed to fetch schedules';
    mockLoadSchedules.mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useCronJobList());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
  });

  it('should set page correctly', async () => {
    const { result } = renderHook(() => useCronJobList());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setPage(2);
    });

    expect(result.current.pagination.page).toBe(2);
  });

  it('should update searching filters', async () => {
    const { result } = renderHook(() => useCronJobList());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const filters = { status: 'STATUS_04_APPROVED' };

    act(() => {
      result.current.setSearchingFilters(filters);
    });

    expect(result.current.searchingFilters).toEqual(filters);
  });

  describe('handleView', () => {
    it('should set selected schedule and prepare edit form', async () => {
      const mockPreparedData = {
        id: mockSchedule.id,
        name: mockSchedule.name,
        cronExpression: mockSchedule.cron,
        iterations: mockSchedule.iterations,
        schedule_status: mockSchedule.schedule_status,
        status: mockSchedule.status,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        comments: '',
      };

      (cronHandlers.prepareScheduleForEdit as jest.Mock).mockReturnValue(
        mockPreparedData,
      );

      const { result } = renderHook(() => useCronJobList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleView(mockSchedule);
      });

      expect(result.current.selectedSchedule).toEqual(mockSchedule);
      expect(result.current.editForm).toEqual(mockPreparedData);
    });
  });

  describe('handleEdit', () => {
    it('should set selected schedule and reset save status', async () => {
      const mockPreparedData = {
        id: mockSchedule.id,
        name: mockSchedule.name,
        cronExpression: mockSchedule.cron,
        iterations: mockSchedule.iterations,
        schedule_status: mockSchedule.schedule_status,
        status: mockSchedule.status,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        comments: '',
      };

      (cronHandlers.prepareScheduleForEdit as jest.Mock).mockReturnValue(
        mockPreparedData,
      );

      const { result } = renderHook(() => useCronJobList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleEdit(mockSchedule);
      });

      expect(result.current.selectedSchedule).toEqual(mockSchedule);
      expect(result.current.isEditJobSaved).toBe(false);
    });
  });

  describe('handleSaveEdit', () => {
    it('should save schedule edits successfully', async () => {
      (cronHandlers.updateScheduleData as jest.Mock).mockResolvedValue({});
      (cronHandlers.prepareScheduleForEdit as jest.Mock).mockReturnValue({
        id: mockSchedule.id,
        name: 'Updated Name',
        cronExpression: '0 12 * * *',
        iterations: 10,
        schedule_status: 'active',
        status: 'STATUS_04_APPROVED',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        comments: '',
      });

      const { result } = renderHook(() => useCronJobList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleEdit(mockSchedule);
      });

      act(() => {
        result.current.setEditForm({
          ...result.current.editForm,
          name: 'Updated Name',
        });
      });

      await act(async () => {
        await result.current.handleSaveEdit();
      });

      expect(cronHandlers.updateScheduleData).toHaveBeenCalledWith(
        mockSchedule.id,
        expect.objectContaining({
          name: 'Updated Name',
        }),
      );
      expect(mockShowSuccess).toHaveBeenCalled();
      expect(result.current.isEditJobSaved).toBe(true);
    });

    it('should handle save error', async () => {
      (cronHandlers.updateScheduleData as jest.Mock).mockRejectedValue(
        new Error('Save failed'),
      );
      (cronHandlers.prepareScheduleForEdit as jest.Mock).mockReturnValue({
        id: mockSchedule.id,
        name: mockSchedule.name,
        cronExpression: mockSchedule.cron,
        iterations: mockSchedule.iterations,
        schedule_status: mockSchedule.schedule_status,
        status: mockSchedule.status,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        comments: '',
      });

      const { result } = renderHook(() => useCronJobList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleEdit(mockSchedule);
      });

      await act(async () => {
        await result.current.handleSaveEdit();
      });

      expect(mockShowError).toHaveBeenCalledWith('Failed to update schedule');
    });

    it('should not save if no schedule selected', async () => {
      const { result } = renderHook(() => useCronJobList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.handleSaveEdit();
      });

      expect(cronHandlers.updateScheduleData).not.toHaveBeenCalled();
    });
  });

  describe('handleExportConfirm', () => {
    it('should export schedule successfully', async () => {
      (cronHandlers.exportSchedule as jest.Mock).mockResolvedValue({});

      const { result } = renderHook(() => useCronJobList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setConfirmDialog({
          open: true,
          type: 'export',
          schedule: mockSchedule,
        });
      });

      await act(async () => {
        await result.current.handleExportConfirm();
      });

      expect(cronHandlers.exportSchedule).toHaveBeenCalledWith(mockSchedule.id);
      expect(mockShowSuccess).toHaveBeenCalled();
      expect(result.current.confirmDialog.open).toBe(false);
    });

    it('should handle export error', async () => {
      (cronHandlers.exportSchedule as jest.Mock).mockRejectedValue(
        new Error('Export failed'),
      );

      const { result } = renderHook(() => useCronJobList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setConfirmDialog({
          open: true,
          type: 'export',
          schedule: mockSchedule,
        });
      });

      await act(async () => {
        await result.current.handleExportConfirm();
      });

      expect(mockShowError).toHaveBeenCalledWith('Failed to export cron job');
    });
  });

  describe('handleSendForApproval', () => {
    it('should open confirmation dialog', async () => {
      (cronHandlers.prepareScheduleForEdit as jest.Mock).mockReturnValue({
        id: mockSchedule.id,
        name: mockSchedule.name,
        cronExpression: mockSchedule.cron,
        iterations: mockSchedule.iterations,
        schedule_status: mockSchedule.schedule_status,
        status: mockSchedule.status,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        comments: '',
      });

      const { result } = renderHook(() => useCronJobList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleView(mockSchedule);
      });

      act(() => {
        result.current.handleSendForApproval();
      });

      expect(result.current.confirmDialog).toEqual({
        open: true,
        type: 'approval',
        schedule: mockSchedule,
      });
    });
  });

  describe('handleApprovalConfirm', () => {
    it('should send schedule for approval successfully', async () => {
      (cronHandlers.sendForApproval as jest.Mock).mockResolvedValue({});

      const { result } = renderHook(() => useCronJobList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setConfirmDialog({
          open: true,
          type: 'approval',
          schedule: mockSchedule,
        });
      });

      await act(async () => {
        await result.current.handleApprovalConfirm();
      });

      expect(cronHandlers.sendForApproval).toHaveBeenCalledWith(
        mockSchedule.id,
      );
      expect(mockShowSuccess).toHaveBeenCalled();
      expect(result.current.confirmDialog.open).toBe(false);
    });
  });

  describe('handleRejectionConfirm', () => {
    it('should reject schedule with reason', async () => {
      (cronHandlers.rejectSchedule as jest.Mock).mockResolvedValue({});
      (cronHandlers.prepareScheduleForEdit as jest.Mock).mockReturnValue({
        id: mockSchedule.id,
        name: mockSchedule.name,
        cronExpression: mockSchedule.cron,
        iterations: mockSchedule.iterations,
        schedule_status: mockSchedule.schedule_status,
        status: mockSchedule.status,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        comments: '',
      });

      const { result } = renderHook(() => useCronJobList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleView(mockSchedule);
      });

      const reason = 'Does not meet requirements';

      await act(async () => {
        await result.current.handleRejectionConfirm(reason);
      });

      expect(cronHandlers.rejectSchedule).toHaveBeenCalledWith(
        mockSchedule.id,
        reason,
      );
      expect(mockShowSuccess).toHaveBeenCalled();
    });
  });
});
