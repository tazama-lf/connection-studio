import React, { useState, useEffect } from 'react';
import {
  EditIcon,
  EyeIcon,
  XIcon,
  MoreVerticalIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronDownIcon as ChevronDownIconAlias,
  PlayIcon,
  PauseIcon,
  Upload,
} from 'lucide-react';
import { dataEnrichmentApi } from '../../data-enrichment/services';
import type { ScheduleResponse } from '../../data-enrichment/types';
import { useToast } from '../../../shared/providers/ToastProvider';
import { UI_CONFIG } from '../../../shared/config/app.config';
import { DropdownMenuWithAutoDirection } from '../../../features/data-enrichment/components/DropdownMenuWithAutoDirection';
import { useAuth } from '../../auth/contexts/AuthContext';
import {
  isEditor,
  isExporter,
  isApprover,
  isPublisher,
  getPrimaryRole,
} from '../../../utils/roleUtils';
import {
  getStatusColor,
  getStatusLabel,
} from '../../../shared/utils/statusColors';
import { JobRejectionDialog } from '../../../shared/components/JobRejectionDialog';
import { Button } from '../../../shared/components/Button';
import {
  Box,
  Pagination,
  Tooltip,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button as MuiButton,
} from '@mui/material';
import { getDemsStatusLov } from '@shared/lovs';

// Debug: log getDemsStatusLov
console.log('getDemsStatusLov:', getDemsStatusLov);
import CustomTable from '@common/Tables/CustomTable';
import { handleInputFilter, handleSelectFilter } from '@shared/helpers';
import CronJobEditModal from './CronJobEditModal';
import CronJobViewModal from './CronJobViewModal';

interface CronJobListProps {
  searchTerm?: string;
}

export const CronJobList: React.FC<CronJobListProps> = ({
  searchTerm = '',
}) => {
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] =
    useState<ScheduleResponse | null>(null);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    cronExpression: '',
    iterations: 1,
    startDate: '',
    endDate: '',
    status: '',
  });
  const [isEditJobSaved, setIsEditJobSaved] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(UI_CONFIG.pagination.defaultPageSize);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Action state for debouncing
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Helper function for pluralization
  const getIterationText = (count: number) => {
    return count === 1 ? '1 iteration' : `${count} iterations`;
  };

  const { user } = useAuth();
  const userIsEditor = user?.claims ? isEditor(user.claims) : false;
  const userIsExporter = user?.claims ? isExporter(user.claims) : false;
  const userIsApprover = user?.claims ? isApprover(user.claims) : false;
  const userIsPublisher = user?.claims ? isPublisher(user.claims) : false;

  const userRole = getPrimaryRole(user?.claims as string[]);

  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [searchingFilters, setSearchingFilters] = useState({});

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    type: '' as 'export' | 'approval' | '',
    schedule: null as any | null,
  });

  const loadSchedules = async (pageNumber: number = 1): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const limit: number = itemsPerPage;
      const offset: number = pageNumber - 1;

      const params = { limit, offset, userRole: userRole as string };

      const response = await dataEnrichmentApi.getCronJobList(
        params,
        searchingFilters,
      );

      setSchedules(response?.data || []);
      setTotalPages(response.pages);
      setTotalRecords(response.total);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch schedules';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules(page);
  }, [page, searchingFilters]);

  // Handle rejection with reason
  const handleRejectionConfirm = async (reason: string) => {
    if (selectedSchedule) {
      try {
        setIsActionInProgress(true);
        // TODO: When backend supports rejection reasons, pass the reason parameter
        await dataEnrichmentApi.updateScheduleStatus(
          selectedSchedule.id,
          'rejected',
        );
        console.log('Cron job rejected with reason:', reason); // For now, just log the reason
        showSuccess('Cron job rejected successfully');
        setViewModalOpen(false);
        loadSchedules();
      } catch (error) {
        console.error('Failed to reject cron job:', error);
        showError('Failed to reject cron job');
      } finally {
        setIsActionInProgress(false);
      }
    }
  };

  // Handle export with confirmation
  const handleExportConfirm = async () => {
    if (confirmDialog.schedule) {
      try {
        setIsActionInProgress(true);
        await dataEnrichmentApi.updateScheduleStatus(
          confirmDialog.schedule.id,
          'STATUS_06_EXPORTED',
        );
        showSuccess('Cron job exported successfully');
        loadSchedules();
        setConfirmDialog({ open: false, type: '', schedule: null });
      } catch (error) {
        console.error('Failed to export cron job:', error);
        showError('Failed to export cron job');
        setConfirmDialog({ open: false, type: '', schedule: null });
      } finally {
        setIsActionInProgress(false);
      }
    }
  };

  // Handle view schedule
  const handleView = (schedule: any) => {
    console.log('schedule', schedule);
    setSelectedSchedule(schedule);
    setEditForm({
      name: schedule.name,
      cronExpression: schedule.cron,
      iterations: schedule.iterations,
      startDate: schedule.startDate || '2025-11-18',
      endDate: schedule.endDate || '2025-12-31',
      status: schedule.status || '',
      comments: schedule.comments || '',
    });
    setViewModalOpen(true);
  };

  // Handle edit schedule
  const handleEdit = (schedule: any) => {
    setSelectedSchedule(schedule);
    setEditForm({
      name: schedule.name,
      cronExpression: schedule.cron,
      iterations: schedule.iterations,
      startDate: schedule.startDate || '2025-11-18',
      endDate: schedule.endDate || '2025-12-31',
      status: schedule.status || '',
    });
    setIsEditJobSaved(false); // Reset the saved state when opening edit modal
    setEditModalOpen(true);
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!selectedSchedule) return;

    try {
      setIsActionInProgress(true);

      // Clean up the form data: remove empty strings for optional date fields
      // const cleanedForm = {
      //   ...editForm,
      //   end_date:
      //     editForm.end_date && editForm.end_date.trim() !== ''
      //       ? editForm.end_date
      //       : undefined,
      // };

      console.log('ssss', editForm);

      await dataEnrichmentApi.updateSchedule(selectedSchedule.id, editForm);

      showSuccess('Schedule updated successfully');
      setIsEditJobSaved(true);
      loadSchedules();
    } catch (err) {
      console.error('Failed to update schedule:', err);
      showError('Failed to update schedule');
    } finally {
      setIsActionInProgress(false);
    }
  };

  // Handle send for approval
  const handleSendForApproval = async () => {
    if (!selectedSchedule) return;

    // Show confirmation dialog first
    setConfirmDialog({
      open: true,
      type: 'approval',
      schedule: selectedSchedule,
    });
  };

  // Handle approval confirmation
  const handleApprovalConfirm = async () => {
    if (!confirmDialog.schedule) return;

    try {
      setIsActionInProgress(true);
      await dataEnrichmentApi.updateScheduleStatus(
        confirmDialog.schedule.id,
        'STATUS_03_UNDER_REVIEW',
      );
      showSuccess('Cron job submitted for approval');
      setEditModalOpen(false);
      setViewModalOpen(false);
      loadSchedules();
      setConfirmDialog({ open: false, type: '', schedule: null });
    } catch (error) {
      console.error('Failed to submit for approval:', error);
      showError('Failed to submit cron job for approval');
      setConfirmDialog({ open: false, type: '', schedule: null });
    } finally {
      setIsActionInProgress(false);
    }
  };

  // Format date for display (date only, no time)
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status.toLowerCase();

    // Handle STATUS_XX_NAME format from database
    if (normalizedStatus.startsWith('status_')) {
      const parts = normalizedStatus.split('_');
      if (parts.length >= 3) {
        const statusName = parts.slice(2).join('_'); // Get everything after STATUS_XX_
        switch (statusName) {
          case 'in_progress':
            return 'bg-yellow-50 text-yellow-600 border border-yellow-200';
          case 'under_review':
            return 'bg-blue-50 text-blue-600 border border-blue-200';
          case 'approved':
            return 'bg-green-50 text-green-600 border border-green-200';
          case 'rejected':
            return 'bg-red-50 text-red-600 border border-red-200';
          case 'changes_requested':
            return 'bg-orange-50 text-orange-600 border border-orange-200';
          case 'exported':
            return 'bg-cyan-50 text-cyan-600 border border-cyan-200';
          case 'ready_for_deployment':
            return 'bg-emerald-50 text-emerald-600 border border-emerald-200';
          case 'deployed':
            return 'bg-indigo-50 text-indigo-600 border border-indigo-200';
          case 'suspended':
            return 'bg-red-50 text-red-600 border border-red-200';
          default:
            return 'bg-gray-50 text-gray-600 border border-gray-200';
        }
      }
    }

    // Handle legacy status formats
    switch (normalizedStatus) {
      case 'active':
      case 'ready for approval':
      case 'approved':
        return 'bg-green-50 text-green-600 border border-green-200';
      case 'in-progress':
      case 'in_progress':
      case 'draft':
      case 'status_01_in_progress':
        return 'bg-yellow-50 text-yellow-600 border border-yellow-200';
      case 'suspended':
      case 'rejected':
        return 'bg-red-50 text-red-600 border border-red-200';
      case 'cloned':
        return 'bg-purple-50 text-purple-600 border border-purple-200';
      case 'under_review':
      case 'under review':
        return 'bg-blue-50 text-blue-600 border border-blue-200';
      case 'deployed':
        return 'bg-indigo-50 text-indigo-600 border border-indigo-200';
      case 'changes_requested':
      case 'changes requested':
        return 'bg-orange-50 text-orange-600 border border-orange-200';
      case 'exported':
        return 'bg-cyan-50 text-cyan-600 border border-cyan-200';
      case 'ready_for_deployment':
      case 'ready for deployment':
        return 'bg-emerald-50 text-emerald-600 border border-emerald-200';
      default:
        return 'bg-gray-50 text-gray-600 border border-gray-200';
    }
  };

  const columns = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 400,
      sortable: false,
      align: 'center',
      disableColumnMenu: true,
      renderHeader: () => (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            py: '12px',
          }}
        >
          <Box sx={{ fontSize: '14px', fontWeight: '600' }}>Name</Box>
          {handleInputFilter({
            fieldName: 'name',
            searchingFilters,
            setSearchingFilters,
          })}
        </Box>
      ),
      renderCell: (params: any) => (
        <Box sx={{ fontSize: '13px' }}>{params.row.name}</Box>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 260,
      flex: 1,
      sortable: false,
      align: 'center',
      disableColumnMenu: true,
      renderHeader: () => (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            py: '12px',
          }}
        >
          <Box sx={{ fontSize: '14px', fontWeight: '600' }}>Status</Box>
          {handleSelectFilter({
            fieldName: 'status',
            options: (
              getDemsStatusLov[userRole as keyof typeof getDemsStatusLov] || []
            ).filter((opt: any) => {
              // Remove 'STATUS_02_ON_HOLD' (case-insensitive) by value or label
              const target = 'status_02_on_hold';
              if (typeof opt === 'string') {
                return opt.toLowerCase() !== target;
              } else if (opt && typeof opt.value === 'string') {
                if (opt.value.toLowerCase() === target) return false;
              }
              if (opt && typeof opt.label === 'string') {
                if (opt.label.toLowerCase() === target) return false;
              }
              return true;
            }),
            searchingFilters,
            setSearchingFilters,
          })}
        </Box>
      ),
      renderCell: (params: any) => (
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(params.row.status)}`}
        >
          <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
          {params.row.status}
        </span>
      ),
    },
    {
      field: 'created_at',
      headerName: 'Created Time',
      minWidth: 260,
      flex: 1,
      sortable: false,
      disableColumnMenu: true,
      align: 'center',
      renderHeader: () => (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            height: '100%',
            py: '12px',
          }}
        >
          <Box sx={{ fontSize: '14px', fontWeight: '600' }}>Created At</Box>
        </Box>
      ),
      renderCell: (params: any) => (
        <div className="flex items-center justify-center w-full text-[13px]">
          <svg
            className="w-4 h-4 mr-1 text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
              clipRule="evenodd"
            />
          </svg>
          {formatDate(params.row.created_at)}
        </div>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      minWidth: 280,
      flex: 1,
      sortable: false,
      disableColumnMenu: true,
      align: 'center',
      renderHeader: () => (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            height: '100%',
            py: '12px',
          }}
        >
          <Box sx={{ fontSize: '14px', fontWeight: '600' }}>Actions</Box>
        </Box>
      ),
      renderCell: (params: any) => {
        const schedule = params.row;

        return (
          <div className=" flex items-center justify-center gap-2 h-full">
            <Tooltip title="View Details" arrow placement="top">
              <EyeIcon
                className="w-4 h-4 mr-2 text-blue-600 hover:text-blue-700 cursor-pointer"
                onClick={() => {
                  handleView(schedule);
                }}
              />
            </Tooltip>
            {/* Edit - Only for Editors/Approvers and only for in-progress jobs (not suspended) */}
            {userIsEditor &&
              (schedule.status === 'STATUS_01_IN_PROGRESS' ||
                schedule.status === 'STATUS_05_REJECTED') && (
                <Tooltip title="Edit Cron Job" arrow placement="top">
                  <EditIcon
                    className="w-4 h-4 mr-2 text-yellow-600 hover:text-yellow-700 cursor-pointer"
                    onClick={() => {
                      handleEdit(schedule);
                    }}
                  />
                </Tooltip>
              )}
            {/* Export - Only for approved and non-suspended items */}
            {userIsExporter && schedule.status === 'STATUS_04_APPROVED' && (
              <Tooltip title="Export Configuration" arrow placement="top">
                <Upload
                  className="w-4 h-4 mr-2 text-cyan-600 hover:text-cyan-700 cursor-pointer"
                  onClick={() => {
                    setConfirmDialog({
                      open: true,
                      type: 'export',
                      schedule: schedule,
                    });
                  }}
                />
              </Tooltip>
            )}

            {userIsPublisher && (
              <>
                {/* Publisher actions removed - activation functionality moved to publisher end */}
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      {error && (
        <div className="px-6 py-4 bg-red-50 border-l-4 border-red-400">
          <div className="text-red-800 text-sm">{error}</div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading schedules...</span>
        </div>
      ) : (
        <>
          <CustomTable
            columns={columns as any}
            rows={schedules}
            search={true}
            pageSize={itemsPerPage}
            pageSizeOptions={[10, 20, 50]}
            // onRowClick={(params) => handleViewConfig(params.row)}
            disableRowSelection={true}
            pagination={
              schedules.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-white rounded-b-lg flex items-center justify-between">
                  <div className="text-sm text-gray-700 font-medium">
                    Showing{' '}
                    <span className="font-bold">
                      {(page - 1) * itemsPerPage + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-bold">
                      {Math.min(page * itemsPerPage, totalRecords)}
                    </span>{' '}
                    of <span className="font-bold">{totalRecords}</span> results
                  </div>
                  <div className="flex items-center space-x-3">
                    <Box>
                      <Pagination
                        page={page}
                        count={totalPages}
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

          <CronJobViewModal
            isOpen={viewModalOpen}
            onClose={() => setViewModalOpen(false)}
            viewFormData={editForm}
            handleSendForApproval={handleSendForApproval}
          />

          <CronJobEditModal
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            editFormData={editForm}
            setEditFormData={setEditForm}
            handleSaveEdit={handleSaveEdit}
          />

          {/* Rejection Dialog */}
          <JobRejectionDialog
            isOpen={showRejectionDialog}
            onClose={() => setShowRejectionDialog(false)}
            onConfirm={handleRejectionConfirm}
            jobName={selectedSchedule?.name || 'Unknown Schedule'}
            jobType="Cron Job"
          />

          {/* Export Confirmation Dialog */}
          <Dialog
            open={confirmDialog.open}
            onClose={() =>
              setConfirmDialog({ open: false, type: '', schedule: null })
            }
            aria-labelledby="confirmation-dialog-title"
            aria-describedby="confirmation-dialog-description"
            sx={{ borderRadius: '6px' }}
          >
            <Box
              sx={{
                color: '#3b3b3b',
                fontSize: '20px',
                fontWeight: 'bold',
                padding: '16px 20px',
                borderBottom: '1px solid #cecece',
              }}
            >
              {confirmDialog.type === 'export' &&
                'Export Confirmation Required!'}
              {confirmDialog.type === 'approval' &&
                'Approval Confirmation Required!'}
            </Box>
            <DialogContent sx={{ padding: '20px 20px' }}>
              <DialogContentText
                id="confirmation-dialog-description"
                sx={{
                  fontSize: '16px',
                  lineHeight: '1.6',
                  color: '#374151',
                  marginBottom: '16px',
                }}
              >
                Are you sure you want to{' '}
                {confirmDialog.type === 'export'
                  ? 'export'
                  : 'submit for approval'}{' '}
                <Box
                  component="span"
                  sx={{
                    fontWeight: 'bold',
                    color: '#2b7fff',
                    backgroundColor: '#f0f7ff',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '15px',
                  }}
                >
                  "{confirmDialog.schedule?.name || 'this cron job'}"
                </Box>
                ?
              </DialogContentText>
              <Box
                sx={{
                  backgroundColor: '#dceeff',
                  border: '1px solid #dceeff',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginTop: '16px',
                }}
              >
                <DialogContentText
                  sx={{
                    fontSize: '16px',
                    color: '#2b7fff',
                    margin: 0,
                    fontWeight: '500',
                  }}
                >
                  {confirmDialog.type === 'export' &&
                    '⚠️ Important: This will update the cron job status to EXPORTED.'}
                  {confirmDialog.type === 'approval' &&
                    '⚠️ Important: This will submit the cron job for approval and update its status to UNDER REVIEW.'}
                </DialogContentText>
              </Box>
            </DialogContent>
            <DialogActions sx={{ padding: '12px 20px 16px 20px' }}>
              <Button
                onClick={() =>
                  setConfirmDialog({ open: false, type: '', schedule: null })
                }
                variant="secondary"
                className="!pb-[6px] !pt-[5px]"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (confirmDialog.type === 'export') handleExportConfirm();
                  else if (confirmDialog.type === 'approval')
                    handleApprovalConfirm();
                }}
                variant="primary"
                className="!pb-[6px] !pt-[5px] bg-[#2b7fff]"
              >
                {confirmDialog.type === 'export' && 'Yes, Export Cron Job'}
                {confirmDialog.type === 'approval' &&
                  'Yes, Submit for Approval'}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </>
  );
};

export default CronJobList;
