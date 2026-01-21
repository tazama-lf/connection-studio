import CustomTable from '@common/Tables/CustomTable';
import {
  Backdrop,
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  Tooltip
} from '@mui/material';
import Loader from '@shared/components/ui/Loader';
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
import { Button } from '../../../../shared/components/Button';
import { useToast } from '../../../../shared/providers/ToastProvider';
import { getStatusBadge } from '../../../../utils/common/functions';
import {
  isApprover,
  isEditor,
  isExporter,
  isPublisher,
} from '../../../../utils/common/roleUtils';
import { useAuth } from '../../../auth/contexts/AuthContext';
import { DATA_ENRICHMENT_JOB_STATUSES } from '../../constants';
import {
  handleTogglePublishingStatus as togglePublishing,
  handleUpdateJobStatus as updateJobStatus,
} from '../../handlers';
import type { DataEnrichmentJobResponse, JobListProps } from '../../types';
import { formatDate } from '../../utils';
import type { GridColDef } from '@mui/x-data-grid';

export const JobList: React.FC<JobListProps> = (props) => {
  const [openLoader, setOpenLoader] = useState(false);
  const [showPauseConfirmDialog, setShowPauseConfirmDialog] = useState<{
    open: boolean;
    job: DataEnrichmentJobResponse | null;
  }>({ open: false, job: null });
  const [showResumeConfirmDialog, setShowResumeConfirmDialog] = useState<{
    open: boolean;
    job: DataEnrichmentJobResponse | null;
  }>({ open: false, job: null });
  const [showActivateConfirmDialog, setShowActivateConfirmDialog] = useState<{
    open: boolean;
    job: DataEnrichmentJobResponse | null;
  }>({ open: false, job: null });
  const [showDeactivateConfirmDialog, setShowDeactivateConfirmDialog] =
    useState<{ open: boolean; job: DataEnrichmentJobResponse | null }>({
      open: false,
      job: null,
    });
  const {
    jobs,
    isLoading = false,
    onViewLogs,
    onEdit,
    pagination,
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

  const userRole = userIsPublisher
    ? 'publisher'
    : userIsExporter
      ? 'exporter'
      : userIsApprover
        ? 'approver'
        : 'editor';

  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const { showSuccess, showError } = useToast();

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.closest('.filter-dropdown') ||
        target.closest('.dropdown-menu') ||
        target.closest('.actions-dropdown')
      ) {
        return;
      }
      setStatusDropdownOpen(false);
      setDropdownOpen(null);
    };

    if (statusDropdownOpen || dropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [statusDropdownOpen, dropdownOpen]);

  const handleUpdateJobStatus = async (
    job: DataEnrichmentJobResponse,
    status: string,
  ) => {
    const jobType = job.type?.toUpperCase() as 'PULL' | 'PUSH';
    await updateJobStatus(
      job.id,
      jobType,
      status,
      showSuccess,
      showError,
      () => {
        if (props.onRefresh) props.onRefresh();
        setDropdownOpen(null);
      }
    );
  };

  const handleTogglePublishingStatus = async (
    job: DataEnrichmentJobResponse,
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

    await togglePublishing(
      job,
      showSuccess,
      showError,
      () => {
        if (props.onRefresh) {
          props.onRefresh();
        }
        setDropdownOpen(null);
        setOpenLoader(false);
      }
    );
  };

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
              getDemsStatusLov[userRole as keyof typeof getDemsStatusLov] || [],
            searchingFilters,
            setSearchingFilters,
            setPage: pagination.setPage
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

            {(
              (userIsEditor && onViewLogs) ||
              userIsApprover ||
              (userIsExporter &&
                (job.status === DATA_ENRICHMENT_JOB_STATUSES.APPROVED ||
                  job.status === DATA_ENRICHMENT_JOB_STATUSES.EXPORTED ||
                  job.status === DATA_ENRICHMENT_JOB_STATUSES.DEPLOYED)) ||
              (userIsPublisher &&
                (job.status === DATA_ENRICHMENT_JOB_STATUSES.EXPORTED ||
                  job.status === DATA_ENRICHMENT_JOB_STATUSES.DEPLOYED))
            ) && (
                <Tooltip title="View Details" arrow placement="top">
                  <EyeIcon
                    className="w-4 h-4 mr-2  cursor-pointer"
                    style={{ color: '#2b7fff' }}
                    onClick={() => {
                      if (onViewLogs) {
                        onViewLogs(job.id);
                      } else {

                        alert('Opening job details...');
                      }
                      setDropdownOpen(null);
                    }}
                  />
                </Tooltip>
              )}


            {userIsEditor &&
              onEdit &&
              (job.status === DATA_ENRICHMENT_JOB_STATUSES.IN_PROGRESS ||
                job.status === DATA_ENRICHMENT_JOB_STATUSES.REJECTED) && (
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
            {userIsEditor && job.status === DATA_ENRICHMENT_JOB_STATUSES.IN_PROGRESS && (
              <Tooltip title="Pause" arrow placement="top">
                <Pause
                  className="w-4 h-4 mr-2 text-orange-600 hover:text-orange-700 cursor-pointer"
                  onClick={() => {
                    setShowPauseConfirmDialog({ open: true, job });
                  }}
                />
              </Tooltip>
            )}
            {userIsEditor && job.status === DATA_ENRICHMENT_JOB_STATUSES.ON_HOLD && (
              <Tooltip title="Resume" arrow placement="top">
                <Play
                  className="w-4 h-4 mr-2 text-green-600 hover:text-green-700 cursor-pointer"
                  onClick={() => {
                    setShowResumeConfirmDialog({ open: true, job });
                  }}
                />
              </Tooltip>
            )}

            <Dialog
              open={showPauseConfirmDialog.open}
              onClose={() =>
                setShowPauseConfirmDialog({ open: false, job: null })
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
                    setShowPauseConfirmDialog({ open: false, job: null })
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
                        DATA_ENRICHMENT_JOB_STATUSES.ON_HOLD,
                      );
                    }
                    setShowPauseConfirmDialog({ open: false, job: null });
                  }}
                  variant="primary"
                  className="!pb-[6px] !pt-[5px]"
                >
                  Yes, Pause Job
                </Button>
              </DialogActions>
            </Dialog>


            <Dialog
              open={showResumeConfirmDialog.open}
              onClose={() =>
                setShowResumeConfirmDialog({ open: false, job: null })
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
                    setShowResumeConfirmDialog({ open: false, job: null })
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
                        DATA_ENRICHMENT_JOB_STATUSES.IN_PROGRESS,
                      );
                    }
                    setShowResumeConfirmDialog({ open: false, job: null });
                  }}
                  variant="primary"
                  className="!pb-[6px] !pt-[5px]"
                >
                  Yes, Resume Job
                </Button>
              </DialogActions>
            </Dialog>


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

            <Dialog
              open={showActivateConfirmDialog.open}
              onClose={() =>
                setShowActivateConfirmDialog({ open: false, job: null })
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
                    setShowActivateConfirmDialog({ open: false, job: null })
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


            <Dialog
              open={showDeactivateConfirmDialog.open}
              onClose={() =>
                setShowDeactivateConfirmDialog({ open: false, job: null })
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
                    setShowDeactivateConfirmDialog({ open: false, job: null })
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
        <Loader />
      ) : (
        <>
          <CustomTable
            columns={columns as GridColDef[]}
            rows={jobs}
            disableRowSelection={true}
            pagination={pagination}
          />
        </>
      )}
    </>
  );
};
export default JobList;
