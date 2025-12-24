import { useState, useEffect, useMemo, useCallback } from 'react';
import type { ScheduleResponse, ActionType } from '../types';
import { useToast } from '../../../shared/providers/ToastProvider';
import { UI_CONFIG } from '../../../shared/config/app.config';
import { useAuth } from '../../auth/contexts/AuthContext';
import {
  isEditor,
  isExporter,
  getPrimaryRole,
} from '../../../utils/common/roleUtils';
import { CRON_JOB_EDIT_FORM_DEFAULTS } from '../constants';
import * as cronHandlers from '../handlers';
import { loadSchedules as apiLoadSchedules } from '../handlers';

export const useCronJobList = () => {
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 0,
    totalRecords: 0,
  });
  
  const [searchingFilters, setSearchingFilters] =
    useState<Record<string, unknown>>({});

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

  const { showSuccess, showError } = useToast();
  const { user } = useAuth();

  const itemsPerPage = UI_CONFIG.pagination.defaultPageSize;

  const { userIsEditor, userIsExporter, userRole } = useMemo(() => {
    const claims = user?.claims ?? [];
    return {
      userIsEditor: isEditor(claims),
      userIsExporter: isExporter(claims),
      userRole: getPrimaryRole(claims),
    };
  }, [user]);

  const loadSchedules = useCallback(
    async (pageNumber = pagination.page) => {
      try {
        setLoadingState((s) => ({ ...s, page: true }));
        setError(null);

        const response = await apiLoadSchedules(
          pageNumber,
          itemsPerPage,
          userRole as string,
          searchingFilters,
        );

        setSchedules(response?.data || []);
        setPagination({
          page: pageNumber,
          totalPages: response.pages,
          totalRecords: response.total,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch schedules',
        );
      } finally {
        setLoadingState((s) => ({ ...s, page: false }));
      }
    },
    [itemsPerPage, userRole, searchingFilters, pagination.page],
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
    itemsPerPage,
    userIsEditor,
    userIsExporter,
    userRole,

    setPage: (newPage: number) => setPagination((p) => ({ ...p, page: newPage })),
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
  };
};
