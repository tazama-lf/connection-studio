import useFilters from '@shared/hooks/useFilters';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '../../../shared/providers/ToastProvider';
import {
  getPrimaryRole,
  isApprover,
  isEditor,
  isExporter,
  isPublisher,
} from '../../../utils/common/roleUtils';
import { useAuth } from '../../auth/contexts/AuthContext';
import { CRON_JOB_EDIT_FORM_DEFAULTS } from '../constants';
import * as cronHandlers from '../handlers';
import { loadSchedules as apiLoadSchedules, CRON_JOB_STATUSES } from '../handlers';
import type { ActionType, ScheduleResponse } from '../types';

export const useCronJobList = () => {
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();
  const [total, setTotal] = useState(0);
  const [searchingFilters, setSearchingFilters] = useState<
    Record<string, unknown>
  >({});

  const {
    offset,
    limit,
    setOffset,
  } = useFilters();

  const pagination = useMemo(() => {
    return {
      page: offset,
      limit,
      totalRecords: total,
      setPage: (page: number) => setOffset(page - 1),
    };
  }, [offset, limit, total])  

  const [error, setError] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<{
    page: boolean;
    action: ActionType;
  }>({
    page: true,
    action: '',
  });
  const [selectedSchedule, setSelectedSchedule] =
    useState<ScheduleResponse | null>(null);
  const [editForm, setEditForm] = useState(CRON_JOB_EDIT_FORM_DEFAULTS);
  const [isEditJobSaved, setIsEditJobSaved] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: ActionType;
    schedule: ScheduleResponse | null;
  }>({
    open: false,
    type: '',
    schedule: null,
  });

  const { userIsEditor, userIsExporter, userIsApprover, userIsPublisher, userRole } = useMemo(() => {
    const claims = user?.claims ?? [];
    return {
      userIsEditor: isEditor(claims),
      userIsExporter: isExporter(claims),
      userIsApprover: isApprover(claims),
      userIsPublisher: isPublisher(claims),
      userRole: getPrimaryRole(claims),
    };
  }, [user?.claims]);

  const loadSchedules = useCallback(
    async () => {
      try {
        setLoadingState((s) => ({ ...s, page: true }));
        setError(null);

        const response = await apiLoadSchedules(
          pagination.page,
          pagination.limit,
          userRole as string,
          searchingFilters,
        );

        setSchedules(response?.data || []);
        setTotal(response.total)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch schedules',
        );
      } finally {
        setLoadingState((s) => ({ ...s, page: false }));
      }
    },
    [pagination, userRole, searchingFilters],
  );

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const handleView = useCallback((schedule: ScheduleResponse) => {
    setSelectedSchedule(schedule);
    setEditForm(cronHandlers.prepareScheduleForEdit(schedule));
  }, []);

  const handleEdit = useCallback((schedule: ScheduleResponse) => {
    setSelectedSchedule(schedule);
    setEditForm(cronHandlers.prepareScheduleForEdit(schedule));
    setIsEditJobSaved(false);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!selectedSchedule) return;

    try {
      setLoadingState((s) => ({ ...s, action: 'edit' }));

      await cronHandlers.updateScheduleData(selectedSchedule.id, {
        name: editForm.name,
        cron: editForm.cronExpression,
        iterations: editForm.iterations,
      });
      showSuccess(cronHandlers.CRON_JOB_SUCCESS_MESSAGES.UPDATED);
      setIsEditJobSaved(true);
      loadSchedules();
    } catch {
      showError('Failed to update schedule');
    } finally {
      setLoadingState((s) => ({ ...s, action: '' }));
    }
  }, [selectedSchedule, editForm, loadSchedules, showSuccess, showError]);

  const handleRejectionConfirm = useCallback(
    async (reason: string) => {
      if (!selectedSchedule) return;
      try {
        setLoadingState((s) => ({ ...s, action: 'edit' }));
        await cronHandlers.rejectSchedule(selectedSchedule.id, reason);
        showSuccess(cronHandlers.CRON_JOB_SUCCESS_MESSAGES.REJECTED);
        loadSchedules();
      } catch {
        showError('Failed to reject cron job');
      } finally {
        setLoadingState((s) => ({ ...s, action: '' }));
      }
    },
    [selectedSchedule, loadSchedules, showSuccess, showError],
  );

  const handleExportConfirm = useCallback(async () => {
    if (!confirmDialog.schedule) return;

    try {
      setLoadingState((s) => ({ ...s, action: 'export' }));
      await cronHandlers.exportSchedule(confirmDialog.schedule.id);
      showSuccess(cronHandlers.CRON_JOB_SUCCESS_MESSAGES.EXPORTED);
      loadSchedules();
      setConfirmDialog({ open: false, type: '', schedule: null });
    } catch {
      showError('Failed to export cron job');
    } finally {
      setLoadingState((s) => ({ ...s, action: '' }));
    }
  }, [confirmDialog.schedule, loadSchedules, showSuccess, showError]);

  const handleSendForApproval = useCallback(() => {
    if (!selectedSchedule) return;
    setConfirmDialog({
      open: true,
      type: 'approval',
      schedule: selectedSchedule,
    });
  }, [selectedSchedule]);

  const handleApprovalConfirm = useCallback(async () => {
    if (!confirmDialog.schedule) return;

    try {
      setLoadingState((s) => ({ ...s, action: 'approval' }));
      await cronHandlers.sendForApproval(confirmDialog.schedule.id);
      showSuccess(
        cronHandlers.CRON_JOB_SUCCESS_MESSAGES.SUBMITTED_FOR_APPROVAL,
      );
      loadSchedules();
      setConfirmDialog({ open: false, type: '', schedule: null });
    } catch {
      showError('Failed to submit cron job for approval');
    } finally {
      setLoadingState((s) => ({ ...s, action: '' }));
    }
  }, [confirmDialog.schedule, loadSchedules, showSuccess, showError]);

  const handleApproveClick = useCallback((scheduleId: string) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;
    setConfirmDialog({
      open: true,
      type: 'approve',
      schedule,
    });
  }, [schedules]);

  const handleApproveConfirm = useCallback(
    async () => {
      if (!confirmDialog.schedule) return;

      try {
        setLoadingState((s) => ({ ...s, action: 'approve' }));
        await cronHandlers.cronJobApi.updateStatus(confirmDialog.schedule.id, CRON_JOB_STATUSES.APPROVED, '');
        showSuccess('Cron job approved successfully');
        loadSchedules();
        setConfirmDialog({ open: false, type: '', schedule: null });
      } catch {
        showError('Failed to approve cron job');
      } finally {
        setLoadingState((s) => ({ ...s, action: '' }));
      }
    },
    [confirmDialog.schedule, loadSchedules, showSuccess, showError],
  );

  const handleReject = useCallback(
    async (scheduleId: string, reason: string) => {
      try {
        setLoadingState((s) => ({ ...s, action: 'reject' }));
        await cronHandlers.cronJobApi.updateStatus(scheduleId, CRON_JOB_STATUSES.REJECTED, reason);
        showSuccess('Cron job rejected successfully');
        loadSchedules();
      } catch {
        showError('Failed to reject cron job');
      } finally {
        setLoadingState((s) => ({ ...s, action: '' }));
      }
    },
    [loadSchedules, showSuccess, showError],
  );

  return {
    schedules,
    pagination,
    searchingFilters,
    selectedSchedule,
    editForm,
    isEditJobSaved,
    confirmDialog,
    error,
    loading: loadingState.page,
    actionLoading: loadingState.action,
    userIsEditor,
    userIsExporter,
    userIsApprover,
    userIsPublisher,
    userRole,
    setSearchingFilters,
    setSelectedSchedule,
    setEditForm,
    setConfirmDialog,
    loadSchedules,
    handleView,
    handleEdit,
    handleSaveEdit,
    handleRejectionConfirm,
    handleExportConfirm,
    handleSendForApproval,
    handleApprovalConfirm,
    handleApproveClick,
    handleApproveConfirm,
    handleReject,
  };
};
