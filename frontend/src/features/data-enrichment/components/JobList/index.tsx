import CustomTable from '@common/Tables/CustomTable';
import type { GridColDef } from '@mui/x-data-grid';
import {
  EditIcon,
  EyeIcon,
  Pause,
  Play,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

import {
  ActionIcon,
  ActionsWrapper,
  CellText,
  ConfirmActions,
  ConfirmContent,
  ConfirmDialog,
  ConfirmText,
  DateCell,
  DateIcon,
  DescriptionText,
  DialogBody,
  DialogHeader,
  HeaderTitle,
  HeaderWrapper,
  HighlightText,
  InfoBox,
  InfoText,
  PauseDescription,
  PauseDialog,
  PauseDialogActions,
  PauseDialogContent,
  PauseDialogHeader,
  PauseHighlight,
  PauseWarningBox,
  PauseWarningText,
  StyledDialog,
  TypeCell
} from './JobList.styles';



import Loader from '@shared/components/ui/Loader';
import { handleInputFilter, handleSelectFilter, } from '@shared/helpers';
import { getDemsStatusLov } from '@shared/lovs';
import { getStatusBadge } from '../../../../utils/common/functions';
import {
  isApprover,
  isEditor,
  isExporter,
  isPublisher,
} from '../../../../utils/common/roleUtils';
import { useAuth } from '../../../auth/contexts/AuthContext';
import { DATA_ENRICHMENT_JOB_STATUSES } from '../../constants';
import type { DataEnrichmentJobResponse, JobListProps } from '../../types';
import { formatDate } from '../../utils';
import { Button } from '@shared';
import {
  handleTogglePublishingStatus as togglePublishing,
  handleUpdateJobStatus as updateJobStatus,
} from '../../handlers';
import { useToast } from '@shared/providers/ToastProvider';
import { DialogActions, Tooltip } from '@mui/material';

export const JobList: React.FC<JobListProps> = (props) => {
  const {
    jobs,
    loading,
    error,
    pagination,
    searchingFilters,
    setSearchingFilters,
    onViewLogs,
    onEdit,
  } = props;

  const { user } = useAuth();

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

  const roles = {
    editor: user?.claims && isEditor(user.claims),
    approver: user?.claims && isApprover(user.claims),
    exporter: user?.claims && isExporter(user.claims),
    publisher: user?.claims && isPublisher(user.claims),
  };

  const { showSuccess, showError } = useToast();

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
      }
    );
  };

  const handleTogglePublishingStatus = async (
    job: DataEnrichmentJobResponse,
  ) => {
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
      }
    );
  };


  const userRole =
    roles.publisher ? 'publisher' :
      roles.exporter ? 'exporter' :
        roles.approver ? 'approver' :
          'editor';

  const columns: GridColDef[] = useMemo(() => [
    {
      field: 'endpoint_name',
      headerName: 'Connector Name',
      flex: 1.5,
      sortable: false,
      align: 'center',
      disableColumnMenu: true,
      renderHeader: () => (
        <HeaderWrapper>
          <HeaderTitle>Connector Name</HeaderTitle>
          {handleInputFilter({
            fieldName: 'endpointName',
            searchingFilters,
            setSearchingFilters,
          })}
        </HeaderWrapper>
      ),
      renderCell: ({ row }) => <CellText>{row.endpoint_name}</CellText>,
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      sortable: false,
      align: 'center',
      disableColumnMenu: true,
      renderHeader: () => (
        <HeaderWrapper>
          <HeaderTitle>Status</HeaderTitle>
          {handleSelectFilter({
            fieldName: 'status',
            options: getDemsStatusLov[userRole] || [],
            searchingFilters,
            setSearchingFilters,
            setPage: pagination.setPage,
          })}
        </HeaderWrapper>
      ),
      renderCell: ({ row }) => (
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
            row.status ?? ''
          )}`}
        >
          <span className="w-2 h-2 rounded-full bg-current mr-2" />
          {row.status}
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
        <HeaderWrapper>
          <HeaderTitle>Cron Job Name</HeaderTitle>
        </HeaderWrapper>
      ),
    },
    {
      field: 'created_at',
      headerName: 'Created At',
      flex: 1,
      sortable: false,
      align: 'center',
      disableColumnMenu: true,
      renderHeader: () => (
        <HeaderWrapper>
          <HeaderTitle>Created At</HeaderTitle>
        </HeaderWrapper>
      ),
      renderCell: ({ row }) => (
        <DateCell>
          <DateIcon viewBox="0 0 20 20" fill="currentColor">
            <path d="M6 2a1 1 0 00-1 1v1H4..." />
          </DateIcon>
          {formatDate(row.created_at)}
        </DateCell>
      ),
    },
    {
      field: 'type',
      headerName: 'Type',
      flex: 0.5,
      align: 'center',
      sortable: false,
      disableColumnMenu: true,
      renderHeader: () => (
        <HeaderWrapper>
          <HeaderTitle>Type</HeaderTitle>
        </HeaderWrapper>
      ),
      renderCell: ({ row }) => {
        const pull = (row.type ?? 'PULL').toUpperCase() === 'PULL';
        return <TypeCell pull={pull}>{pull ? 'PULL' : 'PUSH'}</TypeCell>;
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1.2,
      align: 'center',
      sortable: false,
      disableColumnMenu: true,
      renderHeader: () => (
        <HeaderWrapper>
          <HeaderTitle>Actions</HeaderTitle>
        </HeaderWrapper>
      ),
      renderCell: ({ row }) => (
        <ActionsWrapper>
          <Tooltip title="View">
            <ActionIcon color="#2b7fff">
              <EyeIcon size={16} onClick={() => onViewLogs?.(row.id)} />
            </ActionIcon>
          </Tooltip>

          {roles.editor &&
            onEdit &&
            (row.status === DATA_ENRICHMENT_JOB_STATUSES.IN_PROGRESS ||
              row.status === DATA_ENRICHMENT_JOB_STATUSES.REJECTED) && (
              <Tooltip title="Edit Job" arrow placement="top">
                <EditIcon
                  className="w-4 h-4 mr-2 text-yellow-600 hover:text-yellow-700 cursor-pointer"
                  onClick={() => {
                    onEdit(row);
                  }}
                />
              </Tooltip>
            )}

          {roles.editor && row.status === DATA_ENRICHMENT_JOB_STATUSES.IN_PROGRESS && (
            <Tooltip title="Pause">
              <ActionIcon color="#f97316">
                <Pause size={16} onClick={() => { setShowPauseConfirmDialog({ open: true, job: row }); }} />
              </ActionIcon>
            </Tooltip>
          )}

          {roles.editor && row.status === DATA_ENRICHMENT_JOB_STATUSES.ON_HOLD && (
            <Tooltip title="Resume">
              <ActionIcon color="#22c55e">
                <Play size={16} onClick={() => { setShowResumeConfirmDialog({ open: true, job: row }); }} />
              </ActionIcon>
            </Tooltip>
          )}

          {roles.publisher && (
            <>
              {row.publishing_status === 'active' ? (
                <Tooltip title="Deactivate" arrow placement="top">
                  <ShieldX
                    className="w-4 h-4 mr-1 text-red-600 hover:text-red-700 cursor-pointer"
                    onClick={() => {
                      setShowDeactivateConfirmDialog({ open: true, job: row });
                    }}
                  />
                </Tooltip>
              ) : (
                <Tooltip title="Activate" arrow placement="top">
                  <ShieldCheck
                    className="w-4 h-4 mr-1 text-green-600 hover:text-green-700 cursor-pointer"
                    onClick={() => {
                      setShowActivateConfirmDialog({ open: true, job: row });
                    }}
                  />
                </Tooltip>
              )}
            </>
          )}
        </ActionsWrapper>
      ),
    },
  ], [roles, searchingFilters, pagination]);

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
            columns={columns}
            rows={jobs}
            disableRowSelection={true}
            pagination={pagination}
          />
        </>
      )}

      <PauseDialog
        open={showPauseConfirmDialog.open}
        onClose={() =>
          { setShowPauseConfirmDialog({ open: false, job: null }); }
        }
        aria-labelledby="pause-confirmation-dialog-title"
        aria-describedby="pause-confirmation-dialog-description"
        slotProps={{
          backdrop: {
            sx: { backgroundColor: 'rgba(0,0,0,0.8)' },
          },
        }}
      >
        <PauseDialogHeader>
          Pause Confirmation Required!
        </PauseDialogHeader>

        <PauseDialogContent>
          <PauseDescription id="pause-confirmation-dialog-description">
            Are you sure you want to pause{' '}
            <PauseHighlight>
              "{showPauseConfirmDialog.job?.endpoint_name || 'this job'}"
            </PauseHighlight>
            ?
          </PauseDescription>

          <PauseWarningBox>
            <PauseWarningText>
              ⚠️ This will put the job on hold.
            </PauseWarningText>
          </PauseWarningBox>
        </PauseDialogContent>

        <PauseDialogActions>
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
                  DATA_ENRICHMENT_JOB_STATUSES.ON_HOLD
                );
              }
              setShowPauseConfirmDialog({ open: false, job: null });
            }}
            variant="primary"
            className="!pb-[6px] !pt-[5px]"
          >
            Yes, Pause Job
          </Button>
        </PauseDialogActions>
      </PauseDialog>

      <StyledDialog
        open={showResumeConfirmDialog.open}
        onClose={() =>
          { setShowResumeConfirmDialog({ open: false, job: null }); }
        }
        aria-labelledby="resume-confirmation-dialog-title"
        aria-describedby="resume-confirmation-dialog-description"
        slotProps={{
          backdrop: {
            sx: { backgroundColor: 'rgba(0,0,0,0.8)' },
          },
        }}
      >
        <DialogHeader>
          Resume Confirmation Required!
        </DialogHeader>

        <DialogBody>
          <DescriptionText id="resume-confirmation-dialog-description">
            Are you sure you want to resume{' '}
            <HighlightText>
              "{showResumeConfirmDialog.job?.endpoint_name || 'this job'}"
            </HighlightText>
            ?
          </DescriptionText>

          <InfoBox>
            <InfoText>
              ✅ This will resume the job and set it to in-progress.
            </InfoText>
          </InfoBox>
        </DialogBody>

        <DialogActions sx={{ padding: '12px 20px 16px' }}>
          <Button
            variant="secondary"
            onClick={() =>
              { setShowResumeConfirmDialog({ open: false, job: null }); }
            }
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            onClick={async () => {
              if (showResumeConfirmDialog.job) {
                await handleUpdateJobStatus(
                  showResumeConfirmDialog.job,
                  DATA_ENRICHMENT_JOB_STATUSES.IN_PROGRESS
                );
              }
              setShowResumeConfirmDialog({ open: false, job: null });
            }}
          >
            Yes, Resume Job
          </Button>
        </DialogActions>
      </StyledDialog>

      <ConfirmDialog
        open={showActivateConfirmDialog.open}
        onClose={() =>
          { setShowActivateConfirmDialog({ open: false, job: null }); }
        }
        aria-labelledby="activate-confirmation-dialog-title"
        aria-describedby="activate-confirmation-dialog-description"
        slotProps={{
          backdrop: {
            sx: { backgroundColor: 'rgba(0,0,0,0.8)' },
          },
        }}
      >
        <DialogHeader>
          Activate Confirmation Required!
        </DialogHeader>

        <ConfirmContent>
          <ConfirmText id="activate-confirmation-dialog-description">
            Are you sure you want to activate{' '}
            <HighlightText color="#33AD74">
              "{showActivateConfirmDialog.job?.endpoint_name || 'this job'}"
            </HighlightText>
            ?
          </ConfirmText>

          <InfoBox bg="#F0FDF4" border="1px solid #BBF7D0">
            <InfoText color="#15803D">
              ✅ Once activated, this job will be available for deployment.
            </InfoText>
          </InfoBox>
        </ConfirmContent>

        <ConfirmActions>
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
                  showActivateConfirmDialog.job
                );
              }
            }}
            variant="primary"
            className="!pb-[6px] !pt-[5px]"
          >
            Yes, Activate Job
          </Button>
        </ConfirmActions>
      </ConfirmDialog>

      <ConfirmDialog
        open={showDeactivateConfirmDialog.open}
        onClose={() =>
          { setShowDeactivateConfirmDialog({ open: false, job: null }); }
        }
        aria-labelledby="deactivate-confirmation-dialog-title"
        aria-describedby="deactivate-confirmation-dialog-description"
        slotProps={{
          backdrop: { sx: { backgroundColor: 'rgba(0,0,0,0.8)' } },
        }}
      >
        <DialogHeader>
          Deactivate Confirmation Required!
        </DialogHeader>

        <ConfirmContent>
          <ConfirmText id="deactivate-confirmation-dialog-description">
            Are you sure you want to deactivate{' '}
            <HighlightText color="#FF474D">
              "{showDeactivateConfirmDialog.job?.endpoint_name || 'this job'}"
            </HighlightText>
            ?
          </ConfirmText>

          <InfoBox bg="#FFF1F2" border="1px solid #FFCDD2">
            <InfoText color="#FF474D">
              ⚠️ Once deactivated, this job will not be available for deployment.
            </InfoText>
          </InfoBox>
        </ConfirmContent>

        <ConfirmActions>
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
                  showDeactivateConfirmDialog.job
                );
              }
            }}
            variant="primary"
            className="!pb-[6px] !pt-[5px]"
          >
            Yes, Deactivate Job
          </Button>
        </ConfirmActions>
      </ConfirmDialog>

    </>
  );
};

export default JobList;
