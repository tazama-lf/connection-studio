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
import { Box, Pagination } from '@mui/material';
import { getDemsStatusLov } from '@shared/lovs';
import CustomTable from '@common/Tables/CustomTable';
import { handleInputFilter, handleSelectFilter } from '@shared/helpers';

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
    cron: '',
    iterations: 1,
    start_date: '',
    end_date: '',
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

  // Handle view schedule
  const handleView = (schedule: ScheduleResponse) => {
    setSelectedSchedule(schedule);
    setViewModalOpen(true);
  };

  // Handle edit schedule
  const handleEdit = (schedule: ScheduleResponse) => {
    setSelectedSchedule(schedule);
    setEditForm({
      name: schedule.name,
      cron: schedule.cron,
      iterations: schedule.iterations,
      start_date: schedule.start_date || '',
      end_date: schedule.end_date || '',
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
      const cleanedForm = {
        ...editForm,
        end_date:
          editForm.end_date && editForm.end_date.trim() !== ''
            ? editForm.end_date
            : undefined,
      };

      await dataEnrichmentApi.updateSchedule(selectedSchedule.id, cleanedForm);

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

    try {
      setIsActionInProgress(true);
      await dataEnrichmentApi.updateScheduleStatus(
        selectedSchedule.id,
        'under-review',
      );
      showSuccess('Cron job submitted for approval');
      setEditModalOpen(false);
      loadSchedules();
    } catch (error) {
      console.error('Failed to submit for approval:', error);
      showError('Failed to submit cron job for approval');
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
            options:
              getDemsStatusLov[userRole as keyof typeof getDemsStatusLov] || [],
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
            <button
              onClick={() => {
                handleView(schedule);
              }}
              className="w-[75px] inline-flex justify-center items-center rounded-md bg-[#2b7fff] px-3 py-1.5 text-xs font-medium text-white shadow-sm focus:outline-none transition-colors cursor-pointer"
            >
              <EyeIcon className="w-4 h-4 mr-2" />
              View
            </button>
            {/* Edit - Only for Editors/Approvers and only for in-progress jobs (not suspended) */}
            {(userIsEditor || userIsApprover) && (
              <button
                onClick={() => {
                  handleEdit(schedule);
                }}
                disabled={
                  schedule.status !== 'STATUS_01_IN_PROGRESS' ||
                  isActionInProgress
                }
                className={`w-[75px] inline-flex justify-center items-center rounded-md bg-[#2b7fff] px-3 py-1.5 text-xs font-medium text-white shadow-sm focus:outline-none transition-colors cursor-pointer`}
                title={
                  schedule.status !== 'STATUS_01_IN_PROGRESS'
                    ? 'Can only edit jobs with in-progress status'
                    : isActionInProgress
                      ? 'Action in progress...'
                      : ''
                }
              >
                <EditIcon className="w-4 h-4 mr-2" />
                Edit
              </button>
            )}
            {/* Export - Only for approved and non-suspended items */}
            {userIsExporter && schedule.status === 'STATUS_05_APPROVED' && (
              <button
                onClick={async () => {
                  try {
                    setIsActionInProgress(true);
                    await dataEnrichmentApi.updateScheduleStatus(
                      schedule.id,
                      'STATUS_06_EXPORTED',
                    );
                    showSuccess('Cron job exported successfully');
                    loadSchedules();
                  } catch (error) {
                    console.error('Failed to export cron job:', error);
                    showError('Failed to export cron job');
                  } finally {
                    setIsActionInProgress(false);
                  }
                }}
                disabled={isActionInProgress}
                className={`w-[75px] inline-flex justify-center items-center rounded-md bg-[#2b7fff] px-3 py-1.5 text-xs font-medium text-white shadow-sm focus:outline-none transition-colors cursor-pointer`}
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Export
              </button>
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

          {/* View Modal */}
          {viewModalOpen && selectedSchedule && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Enhanced blurred backdrop */}
              <div
                className="fixed inset-0 backdrop-blur-sm backdrop-saturate-150 z-40"
                onClick={() => setViewModalOpen(false)}
              />

              {/* Modal Content */}
              <div className="relative z-50 p-5 border w-full max-w-2xl shadow-2xl rounded-lg bg-white">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    View Cron Job
                  </h3>
                  <button
                    onClick={() => setViewModalOpen(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XIcon size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Job Name
                      </label>
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900">
                        {selectedSchedule.name}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CRON Expression
                      </label>
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900 font-mono">
                        {selectedSchedule.cron}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        No. of Iterations
                      </label>
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900">
                        {selectedSchedule.iterations}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900">
                        {formatDate(selectedSchedule.start_date)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date
                      </label>
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900">
                        {formatDate(selectedSchedule.end_date)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedSchedule.status)}`}
                        >
                          <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
                          {getStatusLabel(selectedSchedule.status)}
                        </span>
                      </div>
                    </div>
                    {selectedSchedule.next_time && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Next Run
                        </label>
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900">
                          {formatDate(selectedSchedule.next_time)}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedSchedule.created_at && (
                    <div className="grid grid-cols-1 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Created At
                        </label>
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900">
                          {formatDate(selectedSchedule.created_at)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-between space-x-3">
                  <button
                    onClick={() => setViewModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <div className="flex space-x-3">
                    {userIsExporter &&
                      selectedSchedule.status?.toLowerCase() === 'approved' && (
                        <button
                          onClick={async () => {
                            try {
                              setIsActionInProgress(true);
                              await dataEnrichmentApi.updateScheduleStatus(
                                selectedSchedule.id,
                                'exported',
                              );
                              showSuccess('Cron job exported successfully');
                              setViewModalOpen(false);
                              await loadSchedules();
                            } catch (error) {
                              console.error(
                                'Failed to export cron job:',
                                error,
                              );
                              showError('Failed to export cron job');
                            } finally {
                              setIsActionInProgress(false);
                            }
                          }}
                          disabled={isActionInProgress}
                          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isActionInProgress ? 'Exporting...' : 'Export'}
                        </button>
                      )}
                    {(userIsEditor || userIsApprover) &&
                      selectedSchedule.status?.toLowerCase() ===
                        'in-progress' && (
                        <button
                          onClick={async () => {
                            try {
                              setIsActionInProgress(true);
                              await dataEnrichmentApi.updateScheduleStatus(
                                selectedSchedule.id,
                                'under-review',
                              );
                              showSuccess('Cron job submitted for approval');
                              setViewModalOpen(false);
                              await loadSchedules();
                            } catch (error) {
                              console.error(
                                'Failed to submit for approval:',
                                error,
                              );
                              showError(
                                'Failed to submit cron job for approval',
                              );
                            } finally {
                              setIsActionInProgress(false);
                            }
                          }}
                          disabled={isActionInProgress}
                          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isActionInProgress
                            ? 'Submitting...'
                            : 'Send for Approval'}
                        </button>
                      )}

                    {/* Approve/Reject buttons for under-review status - Only for Approvers */}
                    {userIsApprover &&
                      selectedSchedule.status?.toLowerCase() ===
                        'under-review' && (
                        <>
                          <button
                            onClick={() => setShowRejectionDialog(true)}
                            disabled={isActionInProgress}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isActionInProgress ? 'Rejecting...' : 'Reject'}
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                setIsActionInProgress(true);
                                await dataEnrichmentApi.updateScheduleStatus(
                                  selectedSchedule.id,
                                  'approved',
                                );
                                showSuccess('Cron job approved successfully');
                                setViewModalOpen(false);
                                await loadSchedules();
                              } catch (error) {
                                console.error(
                                  'Failed to approve cron job:',
                                  error,
                                );
                                showError('Failed to approve cron job');
                              } finally {
                                setIsActionInProgress(false);
                              }
                            }}
                            disabled={isActionInProgress}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isActionInProgress ? 'Approving...' : 'Approve'}
                          </button>
                        </>
                      )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Edit Modal */}
          {editModalOpen && selectedSchedule && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Enhanced blurred backdrop */}
              <div
                className="fixed inset-0 backdrop-blur-sm backdrop-saturate-150 z-40"
                onClick={() => setEditModalOpen(false)}
              />

              {/* Modal Content */}
              <div className="relative z-50 p-5 border w-full max-w-2xl shadow-2xl rounded-lg bg-white">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Edit Cron Job
                  </h3>
                  <button
                    onClick={() => setEditModalOpen(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XIcon size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Job Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter job name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CRON Expression <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.cron}
                        onChange={(e) =>
                          setEditForm({ ...editForm, cron: e.target.value })
                        }
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., 45 * * * * *"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        No. of Iterations{' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={editForm.iterations}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            iterations: parseInt(e.target.value) || 1,
                          })
                        }
                        min="1"
                        step="1"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter number of iterations"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={
                          editForm.start_date
                            ? new Date(editForm.start_date)
                                .toISOString()
                                .split('T')[0]
                            : ''
                        }
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            start_date: e.target.value,
                          })
                        }
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={
                          editForm.end_date
                            ? new Date(editForm.end_date)
                                .toISOString()
                                .split('T')[0]
                            : ''
                        }
                        onChange={(e) =>
                          setEditForm({ ...editForm, end_date: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-between space-x-3">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={isActionInProgress}
                      className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                        isActionInProgress
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                      }`}
                    >
                      {isActionInProgress ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSendForApproval}
                      disabled={!isEditJobSaved || isActionInProgress}
                      className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                        !isEditJobSaved || isActionInProgress
                          ? 'bg-gray-400 cursor-not-allowed opacity-50'
                          : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                      }`}
                      title={
                        !isEditJobSaved ? 'Please save the changes first' : ''
                      }
                    >
                      {isActionInProgress
                        ? 'Submitting...'
                        : 'Send for Approval'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rejection Dialog */}
          <JobRejectionDialog
            isOpen={showRejectionDialog}
            onClose={() => setShowRejectionDialog(false)}
            onConfirm={handleRejectionConfirm}
            jobName={selectedSchedule?.name || 'Unknown Schedule'}
            jobType="Cron Job"
          />
        </>
      )}
    </>
  );
};

export default CronJobList;
