import React, { useState, useEffect } from 'react';
import {
  EyeIcon,
  MoreVerticalIcon,
  EditIcon,
  CopyIcon,
  HistoryIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  FilterIcon,
  Upload,
  Rocket,
} from 'lucide-react';
import { configApi } from '../services/configApi';
import { sftpApi } from '../../../features/exporter/services/sftpApi';
import { UI_CONFIG } from '../../../shared/config/app.config';
import { DropdownMenuWithAutoDirection } from '../../../shared/components/DropdownMenuWithAutoDirection';
import { useAuth } from '../../../features/auth/contexts/AuthContext';
import {
  getPrimaryRole,
  isExporter,
  isPublisher,
} from '../../../utils/roleUtils';
import { useToast } from '../../../shared/providers/ToastProvider';
import CustomTable from '@common/Tables/CustomTable';
import { Box, Pagination } from '@mui/material';
import { handleInputFilter, handleSelectFilter } from '@shared/helpers';
import { getDemsStatusLov } from '@shared/lovs';

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
}

interface ConfigListProps {
  onConfigSelect?: (config: Config) => void;
  onConfigEdit?: (config: Config) => void;
  onConfigClone?: (config: Config) => void;
  onViewDetails?: (config: Config) => void;
  onViewHistory?: (config: Config) => void;
  onRefresh?: () => void;
  searchTerm?: string;
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
  onViewHistory,
  onRefresh,
  searchTerm: externalSearchTerm,
  showPendingApprovals = false,
  showApprovedConfigs = false,
  onApprove,
  onReject,
  onSendForDeployment,
}) => {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsPerPage] = useState(UI_CONFIG.pagination.defaultPageSize);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  // Status filtering state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showStatusFilter, setShowStatusFilter] = useState(false);

  // Use external search term if provided, otherwise use empty string
  const searchTerm = externalSearchTerm || '';

  // Auth context for role-based filtering
  const { user } = useAuth();
  const userIsExporter = user?.claims ? isExporter(user.claims) : false;
  const userIsPublisher = user?.claims ? isPublisher(user.claims) : false;
  const { showSuccess, showError } = useToast();

  const userRole =  getPrimaryRole(user?.claims as string[]);

  // Fetch configs based on flags
  const fetchConfigs = async () => {
    try {
      setLoading(true);
      setError(null);

      let response;
      if (showPendingApprovals) {
        response = await configApi.getPendingApprovals();

        // Debug: Log each config's status
        if (response.configs && Array.isArray(response.configs)) {
          response.configs.forEach((config: any, index: number) => {});
        }
      } else if (showApprovedConfigs) {
        // Fetch both approved and exported configs
        const [approvedResponse, exportedResponse] = await Promise.all([
          configApi.getConfigsByStatus('approved'),
          configApi.getConfigsByStatus('exported'),
        ]);

        // Combine both arrays
        const combinedConfigs = [
          ...(Array.isArray(approvedResponse.configs)
            ? approvedResponse.configs
            : []),
          ...(Array.isArray(exportedResponse.configs)
            ? exportedResponse.configs
            : []),
        ];

        response = { configs: combinedConfigs };
      } else {
        response = await configApi.getAllConfigs();
      }

      const configsArray = Array.isArray(response.configs)
        ? response.configs
        : [];
      setConfigs(configsArray);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch configurations';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
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

  // Filter configs by search term and status
  const filteredConfigs = (Array.isArray(configs) ? configs : []).filter(
    (config) => {
      const matchesSearch =
        searchTerm === '' ||
        config.transactionType
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        config.endpointPath.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (config.msgFam &&
          config.msgFam.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all' || config.status === statusFilter;

      // Role-based filtering: exporters can only see approved and deployed configs
      let matchesRole = true;
      if (userIsExporter) {
        const allowedStatuses = ['approved', 'deployed'];
        const normalizedConfigStatus = normalizeStatus(config.status);
        matchesRole = allowedStatuses.includes(normalizedConfigStatus);
      }

      return matchesSearch && matchesStatus && matchesRole;
    },
  );

  // Load configs when component mounts
  // useEffect(() => {
  // fetchConfigs();
  // }, []);

  // Close status filter dropdown when clicking outside
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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showStatusFilter]);

  const handleViewConfig = (config: Config) => {
    console.log('Viewing config:', config);
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
        `Config "${config.msgFam}" has been exported to SFTP and status updated to EXPORTED.`,
      );

      // Refetch configs to update the UI
      await fetchConfigs();

      // Trigger parent refresh if available
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error exporting config:', error);
      showError('Error', 'Failed to export config. Please try again.');
    }
  };

  const handlePublishConfig = async (config: Config) => {
    try {
      await sftpApi.publishItem(config.msgFam, 'dems');
      await configApi.updateConfigStatus(config.id, 'deployed');
      showSuccess(
        'Success',
        `Config "${config.msgFam}" has been published successfully.`,
      );
      // Trigger refresh if available
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error publishing config:', error);
      showError('Error', 'Failed to publish config. Please try again.');
    }
  };

  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [searchingFilters, setSearchingFilters] = useState({});

  // CustomTable columns configuration
  const columns = [
    {
      field: 'endpointPath',
      headerName: 'Endpoint Path',
      flex: 1,
      minWidth: 400,
      sortable: false,
      disableColumnMenu: true,
      renderHeader: () => (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
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
    },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 260,
      flex: 1,
      sortable: false,
      disableColumnMenu: true,
      renderHeader: () => (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
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
      field: 'createdAt',
      headerName: 'Created Time',
      minWidth: 260,
      flex: 1,
      sortable: false,
      disableColumnMenu: true,
      renderHeader: () => (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
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
        <div className="flex items-center">
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
      minWidth: 280,
      flex: 1,
      sortable: false,
      disableColumnMenu: true,
      renderHeader: () => (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
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
          <div className=" flex items-center gap-2 h-full">
            {/* <div className="relative dropdown-container"> */}
            {/* <button
                onClick={() =>
                  setOpenDropdown(openDropdown === config.id ? null : config.id)
                }
                className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              >
                <MoreVerticalIcon className="w-4 h-4" />
              </button> */}
            {/* {openDropdown === config.id && (
                <DropdownMenuWithAutoDirection
                  onClose={() => setOpenDropdown(null)}
                > */}
            <button
              onClick={() => {
                handleViewConfig(config);
                setOpenDropdown(null);
              }}
              // className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none transition-colors cursor-pointer"
            >
              <EyeIcon className="w-4 h-4 mr-2" />
              View
            </button>
            {onConfigEdit && (
              <button
                onClick={() => {
                  onConfigEdit(config);
                  setOpenDropdown(null);
                }}
                disabled={(() => {
                  const normalizedStatus = normalizeStatus(config.status);
                  return (
                    normalizedStatus === 'STATUS_03_UNDER_REVIEW' ||
                    normalizedStatus === 'STATUS_04_APPROVED'
                  );
                })()}
                className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium shadow-sm focus:outline-none transition-colors cursor-pointer ${
                  (() => {
                    const normalizedStatus = normalizeStatus(config.status);
                    return (
                      normalizedStatus === 'STATUS_03_UNDER_REVIEW' ||
                      normalizedStatus === 'STATUS_04_APPROVED'
                    );
                  })()
                    ? 'bg-yellow-50 text-yellow-700 cursor-not-allowed border border-yellow-300 hover:bg-yellow-50'
                    : 'bg-yellow-500 text-white border border-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500'
                }`}
              >
                <EditIcon className="w-4 h-4 mr-2" />
                Edit
              </button>
            )}
            {onConfigClone && !showPendingApprovals && (
              <button
                onClick={() => {
                  onConfigClone(config);
                  setOpenDropdown(null);
                }}
                className="inline-flex items-center rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none transition-colors cursor-pointer"
              >
                <CopyIcon className="w-4 h-4 mr-2" />
                Clone
              </button>
            )}
            {userIsExporter &&
              (config.status === 'STATUS_04_APPROVED' || config.status === 'STATUS_08_DEPLOYED') && (
                <button
                  onClick={() => {
                    handleExportConfig(config);
                    setOpenDropdown(null);
                  }}
                  className="inline-flex items-center rounded-md bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-cyan-700 focus:outline-none transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Export
                </button>
              )}
            {/* {userIsPublisher &&
              config.status === 'STATUS_06_EXPORTED' && (
                <button
                  onClick={() => {
                    handlePublishConfig(config);
                    setOpenDropdown(null);
                  }}
                  className="inline-flex items-center rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none transition-colors cursor-pointer"
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  Publish
                </button>
              )} */}

            {/* </DropdownMenuWithAutoDirection> */}
            {/* )}
            </div> */}
          </div>
        );
      },
    },
  ];

  const fetchConfigsTemp = async (pageNumber: number = 1): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const limit: number = itemsPerPage;
      const offset: number = pageNumber - 1;

      const params: PaginationParams = { limit, offset, userRole: userRole as string };

      const response: PaginatedConfigResponse =
        await configApi.getConfigsPaginated(params, searchingFilters);

      setConfigs(response.configs);
      setTotalPages(response.pages);
      setTotalRecords(response.total);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch configurations';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigsTemp(page);
  }, [page, searchingFilters]);

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
          columns={columns}
          rows={configs}
          search={true}
          pageSize={itemsPerPage}
          pageSizeOptions={[10, 20, 50]}
          // onRowClick={(params) => handleViewConfig(params.row)}
          disableRowSelection={true}
          pagination={
            configs.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-white rounded-b-lg flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">
                    {(page - 1) * itemsPerPage + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(page * itemsPerPage, totalRecords)}
                  </span>{' '}
                  of <span className="font-medium">{totalRecords}</span> results
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
      )}
    </>
  );
};

export default ConfigList;
