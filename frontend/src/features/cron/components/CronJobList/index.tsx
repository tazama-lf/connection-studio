import CustomTable from '@common/Tables/CustomTable';
import type { GridColDef } from '@mui/x-data-grid';
import Loader from '@shared/components/ui/Loader';
import React, { useState } from 'react';
import { JobRejectionDialog } from '../../../../shared/components/JobRejectionDialog';
import { useCronJobList } from '../../hooks/useCronJobList';
import type { CronJobListProps, CronJobModalMode, ScheduleResponse } from '../../types';
import CronJobConfirmationDialog from '../ConfirmationDialog';
import CronJobModal from '../CronJobModal';
import { CronJobTableColumns } from '../CronJobTableColumns';

export const CronJobList: React.FC<CronJobListProps> = () => {
  const {
    schedules,
    loading,
    error,
    selectedSchedule,
    editForm,
    actionLoading,
    userIsEditor,
    userIsExporter,
    userIsApprover,
    userIsPublisher,
    userRole,
    pagination,
    searchingFilters,
    confirmDialog,
    setSearchingFilters,
    setEditForm,
    setConfirmDialog,
    handleRejectionConfirm,
    handleExportConfirm,
    handleView,
    handleEdit,
    handleSaveEdit,
    handleSendForApproval,
    handleApprovalConfirm,
    handleApproveClick,
    handleApproveConfirm,
  } = useCronJobList();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<CronJobModalMode>('view');
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);

  const columns = CronJobTableColumns({
    searchingFilters,
    setSearchingFilters,
    setPage: pagination.setPage,
    userRole: userRole as string,
    userIsEditor,
    userIsExporter,
    userIsApprover,
    userIsPublisher,
    onView: (schedule) => {
      handleView(schedule);
      setModalMode('view');
      setModalOpen(true);
    },
    onEdit: (schedule) => {
      handleEdit(schedule);
      setModalMode('edit');
      setModalOpen(true);
    },
    onExport: (schedule) => {
      setConfirmDialog({
        open: true,
        type: 'export',
        schedule,
      });
    },
  });

  const handleConfirmAction = async (type: 'export' | 'approval' | 'approve', comment?: string) => {
    if (type === 'export') {
      await handleExportConfirm();
    } else if (type === 'approval') {
      await handleApprovalConfirm();
    } else if (type === 'approve') {
      await handleApproveConfirm(comment);
      setModalOpen(false);
    }
  };

  const handleRejectionConfirmWithClose = async (reason: string) => {
    await handleRejectionConfirm(reason);
    setModalOpen(false);
    setShowRejectionDialog(false);
  };

  return (
    <>
      {error && (
        <div className="px-6 py-4 bg-red-50 border-l-4 border-red-400">
          <div className="text-red-800 text-sm">{error}</div>
        </div>
      )}

      {loading || actionLoading ? (
        <Loader />
      ) : (
        <CustomTable
          columns={columns as GridColDef[]}
          rows={schedules}
          disableRowSelection={true}
          pagination={pagination}
        />
      )}

      <CronJobModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); }}
        mode={modalMode}
        viewFormData={modalMode === 'view' && selectedSchedule ? selectedSchedule : undefined}
        editFormData={modalMode === 'edit' ? (editForm as unknown as ScheduleResponse) : undefined}
        setEditFormData={modalMode === 'edit' ? (data: ScheduleResponse) => { setEditForm({
          id: data.id,
          name: data.name,
          cronExpression: data.cronExpression ?? '',
          iterations: data.iterations,
          startDate: data.start_date ?? '',
          endDate: data.end_date ?? '',
          status: data.status ?? '',
          schedule_status: data.schedule_status ?? '',
          comments: data.comments ?? '',
        }); } : undefined}
        handleSendForApproval={modalMode === 'view' ? handleSendForApproval : undefined}
        handleSaveEdit={modalMode === 'edit' ? handleSaveEdit : undefined}
        onApprove={modalMode === 'view' ? handleApproveClick : undefined}
        onReject={modalMode === 'view' ? () => {
          setShowRejectionDialog(true);
        } : undefined}
      />

      <JobRejectionDialog
        isOpen={showRejectionDialog}
        onClose={() => { setShowRejectionDialog(false); }}
        onConfirm={handleRejectionConfirmWithClose}
        jobName={selectedSchedule?.name ?? 'Unknown Schedule'}
        jobType="Cron Job"
      />

      <CronJobConfirmationDialog
        open={confirmDialog.open}
        type={confirmDialog.type as 'export' | 'approval' | 'approve' | ''}
        jobName={confirmDialog.schedule?.name ?? 'this cron job'}
        actionLoading={actionLoading === 'export' || actionLoading === 'approval' || actionLoading === 'approve' ? actionLoading : ''}
        onClose={() =>
          { setConfirmDialog({ open: false, type: '', schedule: null }); }
        }
        onConfirm={handleConfirmAction}
      />
    </>
  );
};

export default CronJobList;
