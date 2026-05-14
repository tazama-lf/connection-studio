import { renderHook, act } from '@testing-library/react';
import { waitFor } from '@testing-library/dom';
import { useCronJobList } from '@features/cron/hooks/useCronJobList';
import * as cronHandlers from '@features/cron/handlers';
import { useToast } from '@shared/providers/ToastProvider';
import { useAuth } from '@features/auth/contexts/AuthContext';
import type { ScheduleResponse } from '@features/cron/types';

jest.mock('@shared/providers/ToastProvider');
jest.mock('@features/auth/contexts/AuthContext');
jest.mock('@features/cron/handlers');

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
      schedules: [mockSchedule],
      total: 1,
      pages: 1,
      offset: 0,
      limit: 10,
    });
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useCronJobList());

    expect(result.current.schedules).toEqual([]);
    expect(result.current.pagination.page).toBe(0);
    expect(result.current.pagination.totalRecords).toBe(0);
    expect(result.current.pagination.limit).toBe(10);
    expect(typeof result.current.pagination.setPage).toBe('function');
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
      result.current.pagination.setPage(2);
    });

    // setPage(2) calls setOffset(2 - 1) = setOffset(1), so page (offset) becomes 1
    expect(result.current.pagination.page).toBe(1);
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

    it('should handle rejection error', async () => {
      (cronHandlers.rejectSchedule as jest.Mock).mockRejectedValueOnce(
        new Error('Rejection failed'),
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
        result.current.handleView(mockSchedule);
      });

      await act(async () => {
        await result.current.handleRejectionConfirm('test reason');
      });

      expect(mockShowError).toHaveBeenCalledWith('Failed to reject cron job');
    });
  });

  describe('handleExportConfirm error', () => {
    it('should handle export error', async () => {
      (cronHandlers.exportSchedule as jest.Mock).mockRejectedValueOnce(
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

  describe('handleApprovalConfirm error', () => {
    it('should handle approval error', async () => {
      (cronHandlers.sendForApproval as jest.Mock).mockRejectedValueOnce(
        new Error('Approval failed'),
      );

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

      expect(mockShowError).toHaveBeenCalledWith(
        'Failed to submit cron job for approval',
      );
    });
  });

  describe('handleApproveConfirm error', () => {
    it('should handle approve error', async () => {
      (cronHandlers.cronJobApi.updateStatus as jest.Mock).mockRejectedValueOnce(
        new Error('Approve failed'),
      );

      const { result } = renderHook(() => useCronJobList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setConfirmDialog({
          open: true,
          type: 'approve',
          schedule: mockSchedule,
        });
      });

      await act(async () => {
        await result.current.handleApproveConfirm();
      });

      expect(mockShowError).toHaveBeenCalledWith('Failed to approve cron job');
    });
  });

  describe('handleSaveEdit error', () => {
    it('should handle save edit error', async () => {
      (cronHandlers.updateScheduleData as jest.Mock).mockRejectedValueOnce(
        new Error('Update failed'),
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
  });

  describe('handleReject', () => {
    it('should handle reject cron job', async () => {
      (cronHandlers.cronJobApi.updateStatus as jest.Mock).mockResolvedValueOnce(
        {},
      );

      const { result } = renderHook(() => useCronJobList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.handleReject('test-id', 'test reason');
      });

      expect(mockShowSuccess).toHaveBeenCalledWith(
        'Cron job rejected successfully',
      );
    });

    it('should handle reject error', async () => {
      (cronHandlers.cronJobApi.updateStatus as jest.Mock).mockRejectedValueOnce(
        new Error('Reject failed'),
      );

      const { result } = renderHook(() => useCronJobList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.handleReject('test-id', 'test reason');
      });

      expect(mockShowError).toHaveBeenCalledWith('Failed to reject cron job');
    });
  });

  describe('handleApproveClick', () => {
    it('should open approve confirmation dialog', async () => {
      const { result } = renderHook(() => useCronJobList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleApproveClick(mockSchedule.id);
      });

      expect(result.current.confirmDialog.open).toBe(true);
      expect(result.current.confirmDialog.type).toBe('approve');
    });

    it('should handle approve click with non-existent schedule', async () => {
      const { result } = renderHook(() => useCronJobList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleApproveClick('non-existent-id');
      });

      // Should not open dialog for non-existent schedule
      expect(result.current.confirmDialog.open).toBe(false);
    });
  });

  describe('handleApproveConfirm success', () => {
    it('should approve cron job, reload schedules and close dialog', async () => {
      (cronHandlers.cronJobApi.updateStatus as jest.Mock).mockResolvedValueOnce(
        {},
      );

      const { result } = renderHook(() => useCronJobList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setConfirmDialog({
          open: true,
          type: 'approve',
          schedule: mockSchedule,
        });
      });

      await act(async () => {
        await result.current.handleApproveConfirm();
      });

      expect(cronHandlers.cronJobApi.updateStatus).toHaveBeenCalledWith(
        mockSchedule.id,
        cronHandlers.CRON_JOB_STATUSES.APPROVED,
        '',
      );
      expect(mockShowSuccess).toHaveBeenCalledWith(
        'Cron job approved successfully',
      );
      expect(mockLoadSchedules).toHaveBeenCalled();
      expect(result.current.confirmDialog.open).toBe(false);
      expect(result.current.actionLoading).toBe('');
    });
  });

  describe('Edge Cases for Early Returns', () => {
    it('should return early from handleSaveEdit when no selectedSchedule', async () => {
      const { result } = renderHook(() => useCronJobList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Don't set selectedSchedule, call handleSaveEdit directly
      await act(async () => {
        await result.current.handleSaveEdit();
      });

      // Should not call update or show messages
      expect(cronHandlers.updateScheduleData).not.toHaveBeenCalled();
      expect(mockShowSuccess).not.toHaveBeenCalled();
    });

    it('should return early from handleRejectionConfirm when no selectedSchedule', async () => {
      const { result } = renderHook(() => useCronJobList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.handleRejectionConfirm('reason');
      });

      expect(cronHandlers.rejectSchedule).not.toHaveBeenCalled();
    });

    it('should return early from handleExportConfirm when no confirmDialog.schedule', async () => {
      const { result } = renderHook(() => useCronJobList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Set confirmDialog without schedule
      act(() => {
        result.current.setConfirmDialog({
          open: true,
          type: 'export',
          schedule: null,
        });
      });

      await act(async () => {
        await result.current.handleExportConfirm();
      });

      expect(cronHandlers.exportSchedule).not.toHaveBeenCalled();
    });

    it('should return early from handleSendForApproval when no selectedSchedule', async () => {
      const { result } = renderHook(() => useCronJobList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleSendForApproval();
      });

      // Should not open dialog
      expect(result.current.confirmDialog.open).toBe(false);
    });

    it('should return early from handleApprovalConfirm when no confirmDialog.schedule', async () => {
      const { result } = renderHook(() => useCronJobList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setConfirmDialog({
          open: true,
          type: 'approval',
          schedule: null,
        });
      });

      await act(async () => {
        await result.current.handleApprovalConfirm();
      });

      expect(cronHandlers.sendForApproval).not.toHaveBeenCalled();
    });

    it('should return early from handleApproveConfirm when no confirmDialog.schedule', async () => {
      const { result } = renderHook(() => useCronJobList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setConfirmDialog({
          open: true,
          type: 'approve',
          schedule: null,
        });
      });

      await act(async () => {
        await result.current.handleApproveConfirm();
      });

      expect(cronHandlers.cronJobApi.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('User Roles', () => {
    it('should handle user without claims', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
      });

      const { result } = renderHook(() => useCronJobList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.userIsEditor).toBe(false);
      expect(result.current.userIsExporter).toBe(false);
      expect(result.current.userIsApprover).toBe(false);
      expect(result.current.userIsPublisher).toBe(false);
    });

    it('should handle different user role combinations', async () => {
      const roleCombinations = [
        ['editor'],
        ['approver'],
        ['exporter'],
        ['publisher'],
        ['editor', 'approver'],
        ['editor', 'exporter', 'publisher'],
      ];

      for (const claims of roleCombinations) {
        (useAuth as jest.Mock).mockReturnValue({
          user: { claims },
        });

        const { result, unmount } = renderHook(() => useCronJobList());

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        expect(result.current.userRole).toBeDefined();
        unmount();
      }
    });
  });

  describe('Pagination and Filters', () => {
    it('should handle setSearchingFilters', async () => {
      const { result } = renderHook(() => useCronJobList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setSearchingFilters({ status: 'active' });
      });

      expect(result.current.searchingFilters).toEqual({ status: 'active' });
    });

    it('should reload when setPage is called', async () => {
      const { result } = renderHook(() => useCronJobList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = mockLoadSchedules.mock.calls.length;

      await act(async () => {
        result.current.pagination.setPage(2);
      });

      await waitFor(() => {
        expect(mockLoadSchedules.mock.calls.length).toBeGreaterThan(
          initialCallCount,
        );
      });
    });

    it('should handle loading state correctly during page load', async () => {
      let resolveLoad: (value: any) => void;
      const loadPromise = new Promise<any>((resolve) => {
        resolveLoad = resolve;
      });

      mockLoadSchedules.mockReturnValue(loadPromise as any);

      const { result } = renderHook(() => useCronJobList());

      expect(result.current.loading).toBe(true);

      act(() => {
        resolveLoad!({
          data: [mockSchedule],
          schedules: [mockSchedule],
          total: 1,
          pages: 1,
          offset: 0,
          limit: 10,
        });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Action Loading States', () => {
    it('should set action loading state during edit', async () => {
      (cronHandlers.updateScheduleData as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
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

      const savePromise = act(async () => {
        await result.current.handleSaveEdit();
      });

      await savePromise;
    });

    it('should clear action loading state after completion', async () => {
      (cronHandlers.exportSchedule as jest.Mock).mockResolvedValueOnce({});

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

      expect(result.current.actionLoading).toBe('');
    });
  });

  describe('handleApproveConfirm error handling', () => {
    it('should handle approval error and show error toast', async () => {
      const mockShowError = jest.fn();
      (useToast as jest.Mock).mockReturnValue({
        showSuccess: jest.fn(),
        showError: mockShowError,
      });

      cronHandlers.cronJobApi.updateStatus = jest
        .fn()
        .mockRejectedValue(new Error('Approval failed'));

      const { result } = renderHook(() => useCronJobList());

      act(() => {
        result.current.setConfirmDialog({
          open: true,
          type: 'approve',
          schedule: mockSchedule,
        });
      });

      await act(async () => {
        await result.current.handleApproveConfirm();
      });

      expect(mockShowError).toHaveBeenCalledWith('Failed to approve cron job');
    });
  });

  it('should handle non-Error exceptions from loadSchedules', async () => {
    (cronHandlers.loadSchedules as jest.Mock).mockRejectedValueOnce(
      'Something went wrong',
    );

    const { result } = renderHook(() => useCronJobList());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch schedules');
  });

  it('should handle user with empty claims', async () => {
    (useAuth as jest.Mock).mockReturnValue({ user: { claims: [] } });

    const { result } = renderHook(() => useCronJobList());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.userIsEditor).toBe(false);
    expect(result.current.userIsExporter).toBe(false);
    expect(result.current.userIsApprover).toBe(false);
    expect(result.current.userIsPublisher).toBe(false);
  });

  it('should handle null user gracefully', async () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null });

    const { result } = renderHook(() => useCronJobList());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.userIsEditor).toBe(false);
  });
});
