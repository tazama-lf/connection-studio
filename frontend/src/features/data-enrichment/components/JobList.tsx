import CustomTable from '@common/Tables/CustomTable';
import {
  Backdrop,
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  Pagination,
  Tooltip,
} from '@mui/material';
import { handleInputFilter, handleSelectFilter } from '@shared/helpers';
import { getDemsStatusLov } from '@shared/lovs';
import {
  EditIcon,
  EyeIcon,
  Pause,
  Play,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';
import React, { useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { useToast } from '../../../shared/providers/ToastProvider';
import { getStatusLabel } from '../../../shared/utils/statusColors';
import {
  isApprover,
  isEditor,
  isExporter,
  isPublisher,
} from '../../../utils/common/roleUtils';
import { useAuth } from '../../auth/contexts/AuthContext';
import { dataEnrichmentApi } from '../services';
import type { DataEnrichmentJobResponse } from '../types';

interface JobListProps {
  jobs: DataEnrichmentJobResponse[];
  isLoading?: boolean;
  onViewLogs?: (jobId: string) => void;
  onEdit?: (job: DataEnrichmentJobResponse) => void;
  onClone?: (job: DataEnrichmentJobResponse) => void;
  onRefresh?: () => void;
  page?: number;
  setPage?: (page: number) => void;
  totalPages?: number;
  totalRecords?: number;
  itemsPerPage?: number;
  searchingFilters?: any;
  setSearchingFilters?: any;
  error?: string | null;
  loading?: boolean;
}

export const JobList: React.FC<JobListProps> = (props) => {
  const [openLoader, setOpenLoader] = useState(false);
  // State for Pause/Resume confirmation dialogs (must be inside component)
  const [showPauseConfirmDialog, setShowPauseConfirmDialog] = useState<{
    open: boolean;
    job: DataEnrichmentJobResponse | null;
  }>({ open: false, job: null });
  const [showResumeConfirmDialog, setShowResumeConfirmDialog] = useState<{
    open: boolean;
    job: DataEnrichmentJobResponse | null;
  }>({ open: false, job: null });
  // State for Activate/Deactivate confirmation dialogs (must be inside component)
  const [showActivateConfirmDialog, setShowActivateConfirmDialog] = useState<{
    open: boolean;
    job: DataEnrichmentJobResponse | null;
  }>({ open: false, job: null });
  const [showDeactivateConfirmDialog, setShowDeactivateConfirmDialog] =
    useState<{ open: boolean; job: DataEnrichmentJobResponse | null }>({
      open: false,
      job: null,
    });
  // Destructure after logging
  const {
    jobs,
    isLoading = false,
    onViewLogs,
    onEdit,
    onRefresh,
    page = 1,
    setPage,
    totalPages = 0,
    totalRecords = 0,
    itemsPerPage = 10,
    searchingFilters,
    setSearchingFilters,
    error,
    loading,
  } = props;
  const { user } = useAuth();
  const userIsEditor = user?.claims ? isEditor(user.claims) : false;
  const userIsApprover = user?.claims ? isApprover(user.claims) : false;
  const userIsExporter = user?.claims ? isExporter(user.claims) : false;
  const userIsPublisher = user?.claims ? isPublisher(user.claims) : false;

  const closeLoader = () => {
    setOpenLoader(false);
  };

  // Determine user role for status filter
  const userRole = userIsPublisher
    ? 'publisher'
    : userIsExporter
      ? 'exporter'
      : userIsApprover
        ? 'approver'
        : 'editor';

  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Toast hook
  const { showSuccess, showError } = useToast();

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Don't close if clicking on dropdown buttons or dropdown content
      if (
        target.closest('.filter-dropdown') ||
        target.closest('.dropdown-menu') ||
        target.closest('.actions-dropdown')
      ) {
        return;
      }

      setStatusDropdownOpen(false);
      setTypeDropdownOpen(false);
      setDropdownOpen(null);
    };

    if (statusDropdownOpen || dropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => { document.removeEventListener('click', handleClickOutside); };
    }
  }, [statusDropdownOpen, dropdownOpen]);

  const handleResumeJob = async (job: DataEnrichmentJobResponse) => {
    try {
      setUpdatingStatus(job.id);
      await dataEnrichmentApi.updateJobStatus(
        job.id,
        'STATUS_01_IN_PROGRESS',
        job.type?.toUpperCase() as 'PULL' | 'PUSH',
      );
      showSuccess(`Job ${job.endpoint_name || job.id} resumed successfully`);
      if (props.onRefresh) {
        props.onRefresh();
      }
    } catch (error) {
      console.error('Failed to resume job:', error);
      showError('Failed to resume job');
    } finally {
      setUpdatingStatus(null);
      setDropdownOpen(null);
    }
  };

  const handleUpdateJobStatus = async (
    job: DataEnrichmentJobResponse,
    status: string,
  ) => {
    try {
      setUpdatingStatus(job.id);
      await dataEnrichmentApi.updateStatus(
        job.id,
        status,
        job.type?.toUpperCase() as 'PULL' | 'PUSH',
      );
      showSuccess(
        `Job status updated to ${getStatusLabel(status)} successfully`,
      );
      if (props.onRefresh) {
        props.onRefresh();
      }
    } catch (error) {
      console.error('Failed to update job status:', error);
      showError('Failed to update job status');
    } finally {
      setUpdatingStatus(null);
      setDropdownOpen(null);
    }
  };

  const handleTogglePublishingStatus = async (
    job: DataEnrichmentJobResponse,
    newStatus: 'active' | 'in-active',
  ) => {
    setOpenLoader(true);
    setShowActivateConfirmDialog({
      open: false,
      job: null,
    });
    setShowDeactivateConfirmDialog({
      open: false,
      job: null,
    });

    try {
      const data = await dataEnrichmentApi.updatePublishingStatus(
        job.id,
        newStatus,
        job.type?.toUpperCase() as 'PULL' | 'PUSH',
      );

      if (data?.success) {
        const statusLabel =
          newStatus === 'active' ? 'activated' : 'deactivated';
        showSuccess(
          `Job ${job.endpoint_name || job.id} has been ${statusLabel} successfully`,
        );
        // Refresh the job list
        if (props.onRefresh) {
          props.onRefresh();
        }
      }
    } catch (error) {
      console.error('Error toggling job publishing status:', error);
      showError('Failed to update publishing status. Please try again.');
    } finally {
      setDropdownOpen(null);
      setOpenLoader(false);
    }
  };

  if (isLoading) {
    console.log('🔄 Rendering LOADING state');
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading jobs...</span>
      </div>
    );
  }

  // const getStatusText = (status: string) => {
  //   const normalizedStatus = status.toLowerCase();

  //   // Handle STATUS_XX_NAME format from database
  //   if (normalizedStatus.startsWith('status_')) {
  //     // Extract the name part after the number (e.g., STATUS_03_UNDER_REVIEW -> UNDER_REVIEW)
  //     const parts = normalizedStatus.split('_');
  //     if (parts.length >= 3) {
  //       const statusName = parts.slice(2).join('_'); // Get everything after STATUS_XX_
  //       switch (statusName) {
  //         case 'in_progress':
  //           return 'IN-PROGRESS';
  //         case 'under_review':
  //           return 'UNDER REVIEW';
  //         case 'approved':
  //           return 'APPROVED';
  //         case 'rejected':
  //           return 'REJECTED';
  //         case 'changes_requested':
  //           return 'CHANGES REQUESTED';
  //         case 'exported':
  //           return 'EXPORTED';
  //         case 'ready_for_deployment':
  //           return 'READY FOR DEPLOYMENT';
  //         case 'deployed':
  //           return 'DEPLOYED';
  //         case 'suspended':
  //           return 'SUSPENDED';
  //         default:
  //           return statusName.toUpperCase().replace(/_/g, ' ');
  //       }
  //     }
  //   }

  //   // Handle legacy status formats
  //   switch (normalizedStatus) {
  //     case 'active':
  //       return 'READY FOR APPROVAL';
  //     case 'draft':
  //     case 'in-progress':
  //     case 'in_progress':
  //       return 'IN-PROGRESS';
  //     case 'suspended':
  //       return 'SUSPENDED';
  //     case 'status_01_in_progress':
  //       return 'IN-PROGRESS';
  //     case 'cloned':
  //       return 'CLONED';
  //     case 'approved':
  //       return 'APPROVED';
  //     case 'under review':
  //     case 'under_review':
  //       return 'UNDER REVIEW';
  //     case 'deployed':
  //       return 'DEPLOYED';
  //     case 'rejected':
  //       return 'REJECTED';
  //     case 'changes_requested':
  //     case 'changes requested':
  //       return 'CHANGES REQUESTED';
  //     case 'exported':
  //       return 'EXPORTED';
  //     case 'ready_for_deployment':
  //     case 'ready for deployment':
  //       return 'READY FOR DEPLOYMENT';
  //     default:
  //       return status.toUpperCase().replace(/_/g, ' ');
  //   }
  // };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

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

  // Helper function to normalize status for comparisons
  const normalizeStatus = (status: string): string => {
    const normalizedStatus = status.toLowerCase();

    // Handle STATUS_XX_NAME format from database
    if (normalizedStatus.startsWith('status_')) {
      const parts = normalizedStatus.split('_');
      if (parts.length >= 3) {
        return parts.slice(2).join('_'); // Get everything after STATUS_XX_
      }
    }

    return normalizedStatus;
  };

  // CustomTable columns configuration
  const columns = [
    {
      field: 'endpoint_name',
      headerName: 'Endpoint Path',
      flex: 1.5,
      minWidth: 280,
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
          <Box sx={{ fontSize: '14px', fontWeight: '600' }}>Connector Name</Box>
          {handleInputFilter({
            fieldName: 'endpointName',
            searchingFilters,
            setSearchingFilters,
          })}
        </Box>
      ),
      renderCell: (params: any) => (
        <Box sx={{ fontSize: '13px' }}>{params.row.endpoint_name}</Box>
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
              getDemsStatusLov[userRole] || [],
            searchingFilters,
            setSearchingFilters,
            setPage
          })}
        </Box>
      ),
      renderCell: (_params: any) => (
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(_params.row.status)}`}
        >
          <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
          {_params.row.status}
        </span>
      ),
    },
    {
      field: 'cron_job_name',
      headerName: 'Cron Job Name',
      minWidth: 200,
      flex: 0.5,
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
          <Box sx={{ fontSize: '14px', fontWeight: '600' }}>Cron Job Name</Box>
        </Box>
      ),
    },
    {
      field: 'created_at',
      headerName: 'Created Time',
      minWidth: 200,
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
      renderCell: (_params: any) => (
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
          {formatDate(_params.row.created_at)}
        </div>
      ),
    },
    {
      field: 'type',
      headerName: 'Type',
      minWidth: 140,
      flex: 0.5,
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
          <Box sx={{ fontSize: '14px', fontWeight: '600' }}>Type</Box>
        </Box>
      ),
      renderCell: (params: any) => {
        const jobType = params.row.type || (params.row.path ? 'PUSH' : 'PULL');
        const isPull = jobType?.toUpperCase() === 'PULL';
        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: '600',
              color: isPull ? '#2563eb' : '#7c3aed',
            }}
          >
            {isPull ? (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
                PULL
              </>
            ) : (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
                </svg>
                PUSH
              </>
            )}
          </Box>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      minWidth: 140,
      flex: 1.2,
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
      renderCell: (_params: any) => {
        const job = _params.row;

        return (
          <div className="flex items-center justify-center gap-2 h-full">
            {/* View Details - Available to all roles that have view permissions */}
            {((userIsEditor && onViewLogs) ||
              userIsApprover ||
              (userIsExporter &&
                (job.status === 'STATUS_04_APPROVED' ||
                  job.status === 'STATUS_06_EXPORTED' ||
                  job.status === 'STATUS_08_DEPLOYED')) ||
              (userIsPublisher &&
                (job.status === 'STATUS_06_EXPORTED' ||
                  job.status === 'STATUS_04_APPROVED' ||
                  job.status === 'STATUS_08_DEPLOYED'))) && (
                <Tooltip title="View Details" arrow placement="top">
                  <EyeIcon
                    className="w-4 h-4 mr-2  cursor-pointer"
                    style={{ color: '#2b7fff' }}
                    onClick={() => {
                      if (onViewLogs) {
                        onViewLogs(job.id);
                      } else {
                        // Fallback for approvers/exporters without handler
                        console.log('Opening job details for user with roles:', {
                          userIsEditor,
                          userIsApprover,
                          userIsExporter,
                        });
                        alert('Opening job details...');
                      }
                      setDropdownOpen(null);
                    }}
                  />
                </Tooltip>
              )}

            {/* Edit - Only for Editors and only for in-progress or rejected jobs */}
            {userIsEditor &&
              onEdit &&
              (job.status === 'STATUS_01_IN_PROGRESS' ||
                job.status === 'STATUS_05_REJECTED') && (
                <Tooltip title="Edit Job" arrow placement="top">
                  <EditIcon
                    className="w-4 h-4 mr-2 text-yellow-600 hover:text-yellow-700 cursor-pointer"
                    onClick={() => {
                      onEdit(job);
                      setDropdownOpen(null);
                    }}
                  />
                </Tooltip>
              )}
            {userIsEditor && job.status === 'STATUS_01_IN_PROGRESS' && (
              <Tooltip title="Pause" arrow placement="top">
                <Pause
                  className="w-4 h-4 mr-2 text-orange-600 hover:text-orange-700 cursor-pointer"
                  onClick={() => {
                    setShowPauseConfirmDialog({ open: true, job });
                  }}
                />
              </Tooltip>
            )}
            {userIsEditor && job.status === 'STATUS_02_ON_HOLD' && (
              <Tooltip title="Resume" arrow placement="top">
                <Play
                  className="w-4 h-4 mr-2 text-green-600 hover:text-green-700 cursor-pointer"
                  onClick={() => {
                    setShowResumeConfirmDialog({ open: true, job });
                  }}
                />
              </Tooltip>
            )}
            {/* Pause Confirmation Dialog */}
            <Dialog
              open={showPauseConfirmDialog.open}
              onClose={() =>
                { setShowPauseConfirmDialog({ open: false, job: null }); }
              }
              aria-labelledby="pause-confirmation-dialog-title"
              aria-describedby="pause-confirmation-dialog-description"
              sx={{
                '& .MuiPaper-root': {
                  borderRadius: '6px',
                  minWidth: 400,
                },
              }}
              PaperProps={{ sx: { boxShadow: 'none' } }}
              slotProps={{
                backdrop: {
                  sx: { backgroundColor: 'rgba(0,0,0,0.15)' },
                },
              }}
            >
              <Box
                sx={{
                  color: '#3B3B3B',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  padding: '16px 20px',
                  borderBottom: '1px solid #CECECE',
                }}
              >
                Pause Confirmation Required!
              </Box>
              <DialogContent sx={{ padding: '20px 20px' }}>
                <DialogContentText
                  id="pause-confirmation-dialog-description"
                  sx={{
                    fontSize: '16px',
                    lineHeight: '1.6',
                    color: '#374151',
                    marginBottom: '16px',
                  }}
                >
                  Are you sure you want to pause{' '}
                  <Box
                    component="span"
                    sx={{
                      fontWeight: 'bold',
                      color: '#FF9800',
                      backgroundColor: '#FFF7ED',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '15px',
                    }}
                  >
                    "{showPauseConfirmDialog.job?.endpoint_name || 'this job'}"
                  </Box>
                  ?
                </DialogContentText>
                <Box
                  sx={{
                    backgroundColor: '#FFF7ED',
                    border: '1px solid #FFE0B2',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginTop: '16px',
                  }}
                >
                  <DialogContentText
                    sx={{
                      fontSize: '16px',
                      color: '#FF9800',
                      margin: 0,
                      fontWeight: '500',
                    }}
                  >
                    ⚠️ This will put the job on hold.
                  </DialogContentText>
                </Box>
              </DialogContent>
              <DialogActions sx={{ padding: '12px 20px 16px 20px' }}>
                <Button
                  onClick={() =>
                    { setShowPauseConfirmDialog({ open: false, job: null }); }
                  }
                  variant="secondary"
                  className="!pb-[6px] !pt-[5px]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (showPauseConfirmDialog.job) {
                      await handleUpdateJobStatus(
                        showPauseConfirmDialog.job,
                        'STATUS_02_ON_HOLD',
                      );
                    }
                    setShowPauseConfirmDialog({ open: false, job: null });
                  }}
                  variant="primary"
                  className="!pb-[6px] !pt-[5px]"
                  autoFocus
                >
                  Yes, Pause Job
                </Button>
              </DialogActions>
            </Dialog>

            {/* Resume Confirmation Dialog */}
            <Dialog
              open={showResumeConfirmDialog.open}
              onClose={() =>
                { setShowResumeConfirmDialog({ open: false, job: null }); }
              }
              aria-labelledby="resume-confirmation-dialog-title"
              aria-describedby="resume-confirmation-dialog-description"
              sx={{
                '& .MuiPaper-root': {
                  borderRadius: '6px',
                  minWidth: 400,
                },
              }}
              PaperProps={{ sx: { boxShadow: 'none' } }}
              slotProps={{
                backdrop: {
                  sx: { backgroundColor: 'rgba(0,0,0,0.15)' },
                },
              }}
            >
              <Box
                sx={{
                  color: '#3B3B3B',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  padding: '16px 20px',
                  borderBottom: '1px solid #CECECE',
                }}
              >
                Resume Confirmation Required!
              </Box>
              <DialogContent sx={{ padding: '20px 20px' }}>
                <DialogContentText
                  id="resume-confirmation-dialog-description"
                  sx={{
                    fontSize: '16px',
                    lineHeight: '1.6',
                    color: '#374151',
                    marginBottom: '16px',
                  }}
                >
                  Are you sure you want to resume{' '}
                  <Box
                    component="span"
                    sx={{
                      fontWeight: 'bold',
                      color: '#33AD74',
                      backgroundColor: '#F0FDF4',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '15px',
                    }}
                  >
                    "{showResumeConfirmDialog.job?.endpoint_name || 'this job'}"
                  </Box>
                  ?
                </DialogContentText>
                <Box
                  sx={{
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginTop: '16px',
                  }}
                >
                  <DialogContentText
                    sx={{
                      fontSize: '16px',
                      color: '#33AD74',
                      margin: 0,
                      fontWeight: '500',
                    }}
                  >
                    ✅ This will resume the job and set it to in-progress.
                  </DialogContentText>
                </Box>
              </DialogContent>
              <DialogActions sx={{ padding: '12px 20px 16px 20px' }}>
                <Button
                  onClick={() =>
                    { setShowResumeConfirmDialog({ open: false, job: null }); }
                  }
                  variant="secondary"
                  className="!pb-[6px] !pt-[5px]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (showResumeConfirmDialog.job) {
                      await handleUpdateJobStatus(
                        showResumeConfirmDialog.job,
                        'STATUS_01_IN_PROGRESS',
                      );
                    }
                    setShowResumeConfirmDialog({ open: false, job: null });
                  }}
                  variant="primary"
                  className="!pb-[6px] !pt-[5px]"
                  autoFocus
                >
                  Yes, Resume Job
                </Button>
              </DialogActions>
            </Dialog>

            {/* Active/Inactive - Available to Publishers only for deployed jobs */}
            {userIsPublisher && (
              <>
                {job.publishing_status === 'active' ? (
                  <Tooltip title="Deactivate" arrow placement="top">
                    <ShieldX
                      className="w-4 h-4 mr-1 text-red-600 hover:text-red-700 cursor-pointer"
                      onClick={() => {
                        setShowDeactivateConfirmDialog({ open: true, job });
                        setDropdownOpen(null);
                      }}
                    />
                  </Tooltip>
                ) : (
                  <Tooltip title="Activate" arrow placement="top">
                    <ShieldCheck
                      className="w-4 h-4 mr-1 text-green-600 hover:text-green-700 cursor-pointer"
                      onClick={() => {
                        setShowActivateConfirmDialog({ open: true, job });
                        setDropdownOpen(null);
                      }}
                    />
                  </Tooltip>
                )}
              </>
            )}
            {/* Activate Confirmation Dialog */}
            <Dialog
              open={showActivateConfirmDialog.open}
              onClose={() =>
                { setShowActivateConfirmDialog({ open: false, job: null }); }
              }
              aria-labelledby="activate-confirmation-dialog-title"
              aria-describedby="activate-confirmation-dialog-description"
              sx={{
                '& .MuiPaper-root': {
                  borderRadius: '12px',
                  minWidth: 400,
                },
              }}
              PaperProps={{ sx: { boxShadow: 'none' } }}
              slotProps={{
                backdrop: {
                  sx: { backgroundColor: 'rgba(0,0,0,0.15)' },
                },
              }}
            >
              <Box
                sx={{
                  color: '#3B3B3B',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  padding: '16px 20px',
                  borderBottom: '1px solid #CECECE',
                }}
              >
                Activate Confirmation Required!
              </Box>
              <DialogContent sx={{ padding: '20px 20px' }}>
                <DialogContentText
                  id="activate-confirmation-dialog-description"
                  sx={{
                    fontSize: '16px',
                    lineHeight: '1.6',
                    color: '#374151',
                    marginBottom: '16px',
                  }}
                >
                  Are you sure you want to activate{' '}
                  <Box
                    component="span"
                    sx={{
                      fontWeight: 'bold',
                      color: '#33AD74',
                      backgroundColor: '#F0FDF4',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '15px',
                    }}
                  >
                    "
                    {showActivateConfirmDialog.job?.endpoint_name || 'this job'}
                    "
                  </Box>
                  ?
                </DialogContentText>
                <Box
                  sx={{
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginTop: '16px',
                  }}
                >
                  <DialogContentText
                    sx={{
                      fontSize: '16px',
                      color: '#15803D',
                      margin: 0,
                      fontWeight: '500',
                    }}
                  >
                    ✅ Once activated, this job will be available for
                    deployment.
                  </DialogContentText>
                </Box>
              </DialogContent>
              <DialogActions sx={{ padding: '12px 20px 16px 20px' }}>
                <Button
                  onClick={() =>
                    { setShowActivateConfirmDialog({ open: false, job: null }); }
                  }
                  variant="secondary"
                  className="!pb-[6px] !pt-[5px]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (showActivateConfirmDialog.job) {
                      await handleTogglePublishingStatus(
                        showActivateConfirmDialog.job,
                        'active',
                      );
                    }
                  }}
                  variant="primary"
                  className="!pb-[6px] !pt-[5px]"
                >
                  Yes, Activate Job
                </Button>
              </DialogActions>
            </Dialog>

            {/* Deactivate Confirmation Dialog */}
            <Dialog
              open={showDeactivateConfirmDialog.open}
              onClose={() =>
                { setShowDeactivateConfirmDialog({ open: false, job: null }); }
              }
              aria-labelledby="deactivate-confirmation-dialog-title"
              aria-describedby="deactivate-confirmation-dialog-description"
              sx={{
                '& .MuiPaper-root': {
                  borderRadius: '12px',
                  minWidth: 400,
                },
              }}
              PaperProps={{ sx: { boxShadow: 'none' } }}
              slotProps={{
                backdrop: {
                  sx: { backgroundColor: 'rgba(0,0,0,0.15)' },
                },
              }}
            >
              <Box
                sx={{
                  color: '#3B3B3B',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  padding: '16px 20px',
                  borderBottom: '1px solid #CECECE',
                }}
              >
                Deactivate Confirmation Required!
              </Box>
              <DialogContent sx={{ padding: '20px 20px' }}>
                <DialogContentText
                  id="deactivate-confirmation-dialog-description"
                  sx={{
                    fontSize: '16px',
                    lineHeight: '1.6',
                    color: '#374151',
                    marginBottom: '16px',
                  }}
                >
                  Are you sure you want to deactivate{' '}
                  <Box
                    component="span"
                    sx={{
                      fontWeight: 'bold',
                      color: '#FF474D',
                      backgroundColor: '#FFF1F2',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '15px',
                    }}
                  >
                    "
                    {showDeactivateConfirmDialog.job?.endpoint_name ||
                      'this job'}
                    "
                  </Box>
                  ?
                </DialogContentText>
                <Box
                  sx={{
                    backgroundColor: '#FFF1F2',
                    border: '1px solid #FFCDD2',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginTop: '16px',
                  }}
                >
                  <DialogContentText
                    sx={{
                      fontSize: '16px',
                      color: '#FF474D',
                      margin: 0,
                      fontWeight: '500',
                    }}
                  >
                    ⚠️ Once deactivated, this job will not be available for
                    deployment.
                  </DialogContentText>
                </Box>
              </DialogContent>
              <DialogActions sx={{ padding: '12px 20px 16px 20px' }}>
                <Button
                  onClick={() =>
                    { setShowDeactivateConfirmDialog({ open: false, job: null }); }
                  }
                  variant="secondary"
                  className="!pb-[6px] !pt-[5px]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (showDeactivateConfirmDialog.job) {
                      await handleTogglePublishingStatus(
                        showDeactivateConfirmDialog.job,
                        'in-active',
                      );
                    }
                  }}
                  variant="primary"
                  className="!pb-[6px] !pt-[5px]"
                >
                  Yes, Deactivate Job
                </Button>
              </DialogActions>
            </Dialog>
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
          <span className="ml-2 text-gray-600">Loading configurations...</span>
        </div>
      ) : (
        <>
          <CustomTable
            columns={columns as any}
            rows={jobs}
            search={true}
            pageSize={itemsPerPage}
            pageSizeOptions={[10, 20, 50]}
            // onRowClick={(params) => handleViewConfig(params.row)}
            disableRowSelection={true}
            pagination={
              jobs.length > 0 && (
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
                        onChange={(_, newPage: number) => setPage?.(newPage)}
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
        </>
      )}

      <Backdrop
        sx={(theme) => ({ color: '#fff', zIndex: theme.zIndex.drawer + 100 })}
        open={openLoader}
        onClick={closeLoader}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </>
  );
};
export default JobList;
