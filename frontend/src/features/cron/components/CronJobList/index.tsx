import React, { useState } from 'react';
import { Box, Pagination } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import CustomTable from '@common/Tables/CustomTable';
import { JobRejectionDialog } from '../../../../shared/components/JobRejectionDialog';
import CronJobModal from '../CronJobModal';
import CronJobConfirmationDialog from '../ConfirmationDialog';
import { CronJobTableColumns } from '../CronJobTableColumns';
import { useCronJobList } from '../../hooks/useCronJobList';
import type { CronJobListProps, ScheduleResponse, CronJobModalMode } from '../../types';

export const CronJobList: React.FC<CronJobListProps> = () => {
  const {
    schedules,
    loading,
    error,
    selectedSchedule,
    editForm,
    itemsPerPage,
    actionLoading,
    userIsEditor,
    userIsExporter,
    userIsApprover,
    userIsPublisher,
    userRole,
    pagination,
    searchingFilters,
    confirmDialog,
    setPage,
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
    setPage,
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

  const handleConfirmAction = async (type: 'export' | 'approval' | 'approve') => {
    if (type === 'export') {
      await handleExportConfirm();
    } else if (type === 'approval') {
      await handleApprovalConfirm();
    } else if (type === 'approve') {
      await handleApproveConfirm();
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
        <div className="flex items-center justify-center p-8 fixed inset-0 z-50 bg-white bg-opacity-60">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">
            {loading ? 'Loading schedules...' : 'Processing...'}
          </span>
        </div>
      ) : (
        <CustomTable
          columns={columns as GridColDef[]}
          rows={schedules}
          search={true}
          pageSize={itemsPerPage}
          pageSizeOptions={[10, 20, 50]}
          disableRowSelection={true}
          pagination={
            schedules.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-white rounded-b-lg flex items-center justify-between">
                  <div className="text-sm text-gray-700 font-medium">
                    Showing{' '}
                    <span className="font-bold">
                      {(pagination.page - 1) * itemsPerPage + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-bold">
                      {Math.min(pagination.page * itemsPerPage, pagination.totalRecords)}
                    </span>{' '}
                    of <span className="font-bold">{pagination.totalRecords}</span> results
                  </div>
                  <div className="flex items-center space-x-3">
                    <Box>
                      <Pagination
                        page={pagination.page}
                        count={pagination.totalPages}
                        onChange={(_, newPage: number) => setPage(newPage)}
                        variant="outlined"
                        sx={{
                          '& .MuiPaginationItem-page.Mui-selected': {
                            backgroundColor: '#fbf9fa',
                          },
                        }}
                      />
                    </Box>
                  </div>
                </div>
              )
            }
            />
        )}

        <CronJobModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          mode={modalMode}
          viewFormData={modalMode === 'view' && selectedSchedule ? selectedSchedule : undefined}
          editFormData={modalMode === 'edit' ? (editForm as unknown as ScheduleResponse) : undefined}
          setEditFormData={modalMode === 'edit' ? (data: ScheduleResponse) => setEditForm({
            id: data.id,
            name: data.name,
            cronExpression: data.cronExpression ?? '',
            iterations: data.iterations,
            startDate: data.start_date ?? '',
            endDate: data.end_date ?? '',
            status: data.status ?? '',
            schedule_status: data.schedule_status ?? '',
            comments: data.comments ?? '',
          }) : undefined}
          handleSendForApproval={modalMode === 'view' ? handleSendForApproval : undefined}
          handleSaveEdit={modalMode === 'edit' ? handleSaveEdit : undefined}
          onApprove={modalMode === 'view' ? handleApproveClick : undefined}
          onReject={modalMode === 'view' ? () => {
            setShowRejectionDialog(true);
          } : undefined}
        />

        <JobRejectionDialog
          isOpen={showRejectionDialog}
          onClose={() => setShowRejectionDialog(false)}
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
            setConfirmDialog({ open: false, type: '', schedule: null })
          }
          onConfirm={handleConfirmAction}
        />
    </>
  );
};

export default CronJobList;
