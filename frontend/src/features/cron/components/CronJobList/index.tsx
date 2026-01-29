import React from 'react';
import { Box, Pagination } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import CustomTable from '@common/Tables/CustomTable';
import { JobRejectionDialog } from '../../../../shared/components/JobRejectionDialog';
import CronJobEditModal from '../CronJobEditModal';
import CronJobViewModal from '../CronJobViewModal';
import CronJobConfirmationDialog from '../ConfirmationDialog';
import { CronJobTableColumns } from '../CronJobTableColumns';
import { useCronJobList } from '../../hooks/useCronJobList';
import { useCronJobModals } from '../../hooks/useCronJobModals';
import type { CronJobListProps, ScheduleResponse } from '../../types';

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
  } = useCronJobList();

  const {
    viewModalOpen,
    editModalOpen,
    showRejectionDialog,
    setViewModalOpen,
    setEditModalOpen,
    setShowRejectionDialog,
  } = useCronJobModals();

  const columns = CronJobTableColumns({
    searchingFilters,
    setSearchingFilters,
    setPage,
    userRole: userRole as string,
    userIsEditor,
    userIsExporter,
    onView: (schedule) => {
      handleView(schedule);
      setViewModalOpen(true);
    },
    onEdit: (schedule) => {
      handleEdit(schedule);
      setEditModalOpen(true);
    },
    onExport: (schedule) => {
      setConfirmDialog({
        open: true,
        type: 'export',
        schedule,
      });
    },
  });

  const handleConfirmAction = (type: 'export' | 'approval') => {
    if (type === 'export') handleExportConfirm();
    else if (type === 'approval') handleApprovalConfirm();
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

        {selectedSchedule && (
          <CronJobViewModal
            isOpen={viewModalOpen}
            onClose={() => setViewModalOpen(false)}
            viewFormData={selectedSchedule}
            handleSendForApproval={handleSendForApproval}
          />
        )}

        <CronJobEditModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          editFormData={editForm as unknown as ScheduleResponse}
          setEditFormData={(data: ScheduleResponse) => setEditForm({
            id: data.id,
            name: data.name,
            cronExpression: data.cronExpression ?? '',
            iterations: data.iterations,
            startDate: data.start_date ?? '',
            endDate: data.end_date ?? '',
            status: data.status ?? '',
            schedule_status: data.schedule_status ?? '',
            comments: data.comments ?? '',
          })}
          handleSaveEdit={handleSaveEdit}
        />

        <JobRejectionDialog
          isOpen={showRejectionDialog}
          onClose={() => setShowRejectionDialog(false)}
          onConfirm={handleRejectionConfirm}
          jobName={selectedSchedule?.name ?? 'Unknown Schedule'}
          jobType="Cron Job"
        />

        <CronJobConfirmationDialog
          open={confirmDialog.open}
          type={confirmDialog.type as 'export' | 'approval' | ''}
          jobName={confirmDialog.schedule?.name ?? 'this cron job'}
          actionLoading={actionLoading === 'export' || actionLoading === 'approval' ? actionLoading : ''}
          onClose={() =>
            setConfirmDialog({ open: false, type: '', schedule: null })
          }
          onConfirm={handleConfirmAction}
        />
    </>
  );
};

export default CronJobList;
