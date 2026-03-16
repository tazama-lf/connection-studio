import CustomTable from '@common/Tables/CustomTable';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  Tooltip
} from '@mui/material';
import { Button } from '@shared';
import { handleInputFilter, handleSelectFilter } from '@shared/helpers';
import useFilters from '@shared/hooks/useFilters';
import { getDemsStatusLov } from '@shared/lovs';
import {
  CopyIcon,
  EditIcon,
  EyeIcon,
  Pause,
  Play,
  ShieldCheck,
  ShieldX,
  Upload
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../features/auth/contexts/AuthContext';
import { useToast } from '../../../shared/providers/ToastProvider';
import {
  getPrimaryRole,
  isApprover,
  isEditor,
  isExporter,
  isPublisher,
} from '../../../utils/common/roleUtils';
import { configApi } from '../services/configApi';

interface Config {
  id: number;
  msgFam: string;
  transactionType: string;
  endpointPath: string;
  version: string;
  contentType: string;
  status: string;
  tenantId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  mapping?: any[];
  schema?: any;
  publishing_status?: 'active' | 'inactive' | null;
}

interface ConfigListProps {
  onConfigSelect?: (config: Config) => void;
  onConfigEdit?: (config: Config) => void;
  onConfigClone?: (config: Config) => void;
  onViewDetails?: (config: Config) => void;
  onViewHistory?: (config: Config) => void;
  onRefresh?: () => void;
  showPendingApprovals?: boolean;
  showApprovedConfigs?: boolean;
  onApprove?: (configId: number) => void;
  onReject?: (config: Config) => void;
  onSendForDeployment?: (configId: number) => void;
}

interface PaginatedConfigResponse {
  success: boolean;
  configs: Config[];
  total: number;
  limit: number;
  offset: number;
  pages: number;
}

interface PaginationParams {
  limit: number;
  offset: number;
  userRole: string;
}

export const ConfigList: React.FC<ConfigListProps> = ({
  onConfigSelect,
  onConfigEdit,
  onConfigClone,
  onViewDetails,
  onRefresh,
  showPendingApprovals = false,
}) => {
  const [actionLoading, setActionLoading] = useState<
    '' | 'export' | 'pause' | 'resume' | 'activate' | 'deactivate'
  >('');
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showStatusFilter, setShowStatusFilter] = useState(false);

  const { user } = useAuth();
  const userIsEditor = user?.claims ? isEditor(user.claims) : false;
  const userIsExporter = user?.claims ? isExporter(user.claims) : false;
  const userIsPublisher = user?.claims ? isPublisher(user.claims) : false;
  const userIsApprover = user?.claims ? isApprover(user.claims) : false;
  const { showSuccess, showError } = useToast();

  const userRole = getPrimaryRole(user?.claims!);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showStatusFilter &&
        !(event.target as Element).closest('.status-filter-container')
      ) {
        setShowStatusFilter(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, [showStatusFilter]);

  const handleViewConfig = (config: Config) => {
    if (onViewDetails) {
      onViewDetails(config);
    } else if (onConfigSelect) {
      onConfigSelect(config);
    }
  };

  const handleExportConfig = async (config: Config) => {
    try {
      await configApi.exportConfig(config.id, 'Exported for deployment');
      showSuccess(
        'Success',
        `Config "${config.transactionType}" has been exported to SFTP and status updated to EXPORTED.`,
      );

      await fetchConfigsTemp();

      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      showError('Error', 'Failed to export config. Please try again.');
    }
  };

  const handleExportConfirm = async () => {
    if (confirmDialog.config) {
      setActionLoading('export');
      try {
        await handleExportConfig(confirmDialog.config);
        setConfirmDialog({ open: false, type: '', config: null });
      } finally {
        setActionLoading('');
      }
    }
  };

  const handlePauseConfirm = async () => {
    if (confirmDialog.config) {
      setActionLoading('pause');
      try {
        await handleUpdateConfigStatus(
          confirmDialog.config,
          'STATUS_02_ON_HOLD',
        );
        setConfirmDialog({ open: false, type: '', config: null });
      } finally {
        setActionLoading('');
      }
    }
  };

  const handleResumeConfirm = async () => {
    if (confirmDialog.config) {
      setActionLoading('resume');
      try {
        await handleUpdateConfigStatus(
          confirmDialog.config,
          'STATUS_01_IN_PROGRESS',
        );
        setConfirmDialog({ open: false, type: '', config: null });
      } finally {
        setActionLoading('');
      }
    }
  };

  const handleActivateConfirm = async () => {
    if (confirmDialog.config) {
      setActionLoading('activate');
      try {
        await handleTogglePublishingStatus(confirmDialog.config, 'active');
        setConfirmDialog({ open: false, type: '', config: null });
      } finally {
        setActionLoading('');
      }
    }
  };

  const handleDeactivateConfirm = async () => {
    if (confirmDialog.config) {
      setActionLoading('deactivate');
      try {
        await handleTogglePublishingStatus(confirmDialog.config, 'inactive');
        setConfirmDialog({ open: false, type: '', config: null });
      } finally {
        setActionLoading('');
      }
    }
  };

  const handleUpdateConfigStatus = async (config: Config, status: string) => {
    try {
      await configApi.updateConfigStatus(config.id, status);
      showSuccess(
        'Success',
        `Config status has been updated to ${status} successfully.`,
      );
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      showError('Error', 'Failed to publish config. Please try again.');
    }
  };

  const handleTogglePublishingStatus = async (
    config: Config,
    newStatus: 'active' | 'inactive',
  ) => {
    try {
      await configApi.updatePublishingStatus(config.id, newStatus);

      const statusLabel = newStatus === 'active' ? 'activated' : 'deactivated';
      showSuccess(
        'Success',
        `Config "${config.transactionType}" has been ${statusLabel} successfully.`,
      );

      fetchConfigsTemp();

      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      showError(
        'Error',
        'Failed to update publishing status. Please try again.',
      );
    }
  };

  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [searchingFilters, setSearchingFilters] = useState({});

  const {
    offset,
    limit,
    setOffset,
  } = useFilters();

  const pagination = useMemo(() => ({
    page: offset,
    limit,
    totalRecords,
    setPage: (page: number) => { setOffset(page - 1); },
  }), [offset, limit, totalRecords])

  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    type: '' as 'export' | 'pause' | 'resume' | 'activate' | 'deactivate' | '',
    config: null as Config | null,
  });

  const columns = [
    {
      field: 'endpointPath',
      headerName: 'Endpoint Path',
      minWidth: 400,
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
          <Box sx={{ fontSize: '14px', fontWeight: '600' }}>Endpoint Path</Box>
          {handleInputFilter({
            fieldName: 'endpointPath',
            searchingFilters,
            setSearchingFilters,
          })}
        </Box>
      ),
      renderCell: (params: any) => (
        <Box sx={{ fontSize: '13px' }}>{params.row.endpointPath}</Box>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 200,
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
              getDemsStatusLov[userRole!] ?? [],
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
      field: 'createdAt',
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
          {formatDate(params.row.createdAt)}
        </div>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
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
          <Box sx={{ fontSize: '14px', fontWeight: '600' }}>Actions</Box>
        </Box>
      ),
      renderCell: (params: any) => {
        const config = params.row;

        return (
          <div className=" flex items-center justify-center gap-2 h-full">
            <Tooltip title="View Details" arrow placement="top">
              <EyeIcon
                className="w-4 h-4 mr-2  cursor-pointer"
                style={{ color: '#2b7fff' }}
                onClick={() => {
                  handleViewConfig(config);
                }}
              />
            </Tooltip>
            {onConfigEdit &&
              (config.status === 'STATUS_01_IN_PROGRESS' ||
                config.status === 'STATUS_05_REJECTED') && (
                <Tooltip title="Edit Configuration" arrow placement="top">
                  <EditIcon
                    className="w-4 h-4 mr-2 text-yellow-600 hover:text-yellow-700 cursor-pointer"
                    onClick={() => {
                      onConfigEdit(config);
                    }}
                  />
                </Tooltip>
              )}
            {onConfigClone && !showPendingApprovals && (
              <Tooltip title="Clone Configuration" arrow placement="top">
                <CopyIcon
                  className="w-4 h-4 mr-2 text-cyan-600 hover:text-cyan-700 cursor-pointer"
                  onClick={() => {
                    onConfigClone(config);
                  }}
                />
              </Tooltip>
            )}
            {userIsEditor && config.status === 'STATUS_01_IN_PROGRESS' && (
              <Tooltip title="Pause" arrow placement="top">
                <Pause
                  className="w-4 h-4 mr-2 text-orange-600 hover:text-orange-700 cursor-pointer"
                  onClick={() => {
                    setConfirmDialog({
                      open: true,
                      type: 'pause',
                      config,
                    });
                  }}
                />
              </Tooltip>
            )}
            {userIsEditor && config.status === 'STATUS_02_ON_HOLD' && (
              <Tooltip title="Resume" arrow placement="top">
                <Play
                  className="w-4 h-4 mr-2 text-green-600 hover:text-green-700 cursor-pointer"
                  onClick={() => {
                    setConfirmDialog({
                      open: true,
                      type: 'resume',
                      config,
                    });
                  }}
                />
              </Tooltip>
            )}
            {userIsExporter &&
              (config.status === 'STATUS_04_APPROVED' ||
                config.status === 'STATUS_08_DEPLOYED') && (
                <Tooltip title="Export Configuration" arrow placement="top">
                  <Upload
                    className="w-4 h-4 mr-2 text-cyan-600 hover:text-cyan-700 cursor-pointer"
                    onClick={() => {
                      setConfirmDialog({
                        open: true,
                        type: 'export',
                        config,
                      });
                    }}
                  />
                </Tooltip>
              )}
            {(userIsApprover || userIsPublisher) &&
              ['STATUS_04_APPROVED', 'STATUS_06_EXPORTED', 'approved', 'exported'].includes(config.status) && (
                <>
                  {config.publishing_status === 'active' ? (
                    <Tooltip title="Deactivate" arrow placement="top">
                      <ShieldX
                        className="w-4 h-4 mr-1 text-red-600 hover:text-red-700 cursor-pointer"
                        onClick={() => {
                          setConfirmDialog({
                            open: true,
                            type: 'deactivate',
                            config,
                          });
                        }}
                      />
                    </Tooltip>
                  ) : (
                    <Tooltip title="Activate" arrow placement="top">
                      <ShieldCheck
                        className="w-4 h-4 mr-1 text-green-600 hover:text-green-700 cursor-pointer"
                        onClick={() => {
                          setConfirmDialog({
                            open: true,
                            type: 'activate',
                            config,
                          });
                        }}
                      />
                    </Tooltip>
                  )}
                </>
              )}
          </div>
        );
      },
    },
  ];

  const fetchConfigsTemp = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const params: PaginationParams = {
        limit,
        offset,
        userRole: userRole as string,
      };

      const response: PaginatedConfigResponse =
        await configApi.getConfigsPaginated(params, searchingFilters);

      setConfigs(response.configs);
      setTotalRecords(response.total);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch configurations';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userRole, pagination, searchingFilters])

  useEffect(() => {
    fetchConfigsTemp();
  }, [pagination, searchingFilters]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading configurations...</span>
      </div>
    );
  }


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
        <CustomTable
          columns={columns as any}
          rows={configs}
          disableRowSelection={true}
          pagination={pagination}
        />
      )}

      <Dialog
        open={confirmDialog.open}
        onClose={() => { setConfirmDialog({ open: false, type: '', config: null }); }
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
          {confirmDialog.type === 'export' && 'Export Confirmation Required!'}
          {confirmDialog.type === 'pause' && 'Pause Confirmation Required!'}
          {confirmDialog.type === 'resume' && 'Resume Confirmation Required!'}
          {confirmDialog.type === 'activate' &&
            'Activate Confirmation Required!'}
          {confirmDialog.type === 'deactivate' &&
            'Deactivate Confirmation Required!'}
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
            {confirmDialog.type === 'export' && 'export'}
            {confirmDialog.type === 'pause' && 'pause'}
            {confirmDialog.type === 'resume' && 'resume'}
            {confirmDialog.type === 'activate' && 'activate'}
            {confirmDialog.type === 'deactivate' && 'deactivate'}{' '}
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
              "{confirmDialog.config?.transactionType ?? 'this configuration'}"
            </Box>
            {confirmDialog.type === 'export' && ' to SFTP'}?
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
                '⚠️ Important: This will export the configuration to SFTP and update its status to EXPORTED.'}
              {confirmDialog.type === 'pause' &&
                '⚠️ This will put the configuration on hold. You can resume it later.'}
              {confirmDialog.type === 'resume' &&
                '⚠️ This will change the configuration status back to IN PROGRESS.'}
              {confirmDialog.type === 'activate' &&
                '⚠️ This will activate the configuration for publishing.'}
              {confirmDialog.type === 'deactivate' &&
                '⚠️ This will deactivate the configuration and stop publishing.'}
            </DialogContentText>
          </Box>
        </DialogContent>
        <DialogActions sx={{ padding: '12px 20px 16px 20px' }}>
          <Button
            onClick={() => { setConfirmDialog({ open: false, type: '', config: null }); }
            }
            variant="secondary"
            className="!pb-[6px] !pt-[5px]"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (confirmDialog.type === 'export') handleExportConfirm();
              else if (confirmDialog.type === 'pause') handlePauseConfirm();
              else if (confirmDialog.type === 'resume') handleResumeConfirm();
              else if (confirmDialog.type === 'activate') { handleActivateConfirm(); }
              else if (confirmDialog.type === 'deactivate') { handleDeactivateConfirm(); }
            }}
            variant="primary"
            className="!pb-[6px] !pt-[5px]"
            disabled={actionLoading === confirmDialog.type}
          >
            {['export', 'pause', 'resume', 'activate', 'deactivate'].map(
              (type) =>
                confirmDialog.type === type && (
                  <>
                    {actionLoading === type && (
                      <span className="w-4 h-4 flex items-center justify-center mr-2">
                        <svg
                          className="animate-spin"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="#fff"
                            strokeWidth="4"
                            fill="none"
                            opacity="0.2"
                          />
                          <path
                            d="M22 12a10 10 0 0 1-10 10"
                            stroke="#fff"
                            strokeWidth="4"
                            fill="none"
                          />
                        </svg>
                      </span>
                    )}
                    {actionLoading === type
                      ? (type === 'export' && 'Exporting...') ||
                      (type === 'pause' && 'Pausing...') ||
                      (type === 'resume' && 'Resuming...') ||
                      (type === 'activate' && 'Activating...') ||
                      (type === 'deactivate' && 'Deactivating...')
                      : (type === 'export' && 'Yes, Export Configuration') ||
                      (type === 'pause' && 'Yes, Pause Configuration') ||
                      (type === 'resume' && 'Yes, Resume Configuration') ||
                      (type === 'activate' &&
                        'Yes, Activate Configuration') ||
                      (type === 'deactivate' &&
                        'Yes, Deactivate Configuration')}
                  </>
                ),
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ConfigList;
