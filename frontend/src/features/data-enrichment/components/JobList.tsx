import React, { useState } from 'react';
import {
  Eye,
  MoreVertical,
  ChevronDown,
  FilterIcon,
  Edit,
  ChevronDownIcon,
  ChevronUpIcon,
  Copy,
  Play,
  Pause,
} from 'lucide-react';
import type { DataEnrichmentJobResponse, JobStatus } from '../types';
import { Button } from '../../../shared/components/Button';
import { useAuth } from '../../auth/contexts/AuthContext';
import {
  isEditor,
  isApprover,
  isExporter,
  isPublisher,
} from '../../../utils/roleUtils';
import { DropdownMenuWithAutoDirection } from './DropdownMenuWithAutoDirection';
import {
  getStatusColor,
  getStatusLabel,
} from '../../../shared/utils/statusColors';
import { useToast } from '../../../shared/providers/ToastProvider';
import { dataEnrichmentApi } from '../services';
import { Box, Pagination } from '@mui/material';
import { handleInputFilter, handleSelectFilter } from '@shared/helpers';
import { getDemsStatusLov } from '@shared/lovs';
import CustomTable from '@common/Tables/CustomTable';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'approved', label: 'Approved' },
  { value: 'exported', label: 'Exported' },
  { value: 'deployed', label: 'Deployed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
] as const;

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
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [statusDropdownOpen, dropdownOpen]);

  const handleResumeJob = async (job: DataEnrichmentJobResponse) => {
    try {
      setUpdatingStatus(job.id);
      await dataEnrichmentApi.updateJobStatus(
        job.id,
        'in-progress',
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

  // CustomTable columns configuration
  const columns = [
    {
      field: 'endpoint_name',
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
            fieldName: 'endpointName',
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
      field: 'created_at',
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
      renderCell: (_params: any) => (
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
          {formatDate(_params.row.created_at)}
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
      renderCell: (_params: any) => {
        const job = _params.row;

        return (
          <div className=" flex items-center gap-2 h-full">
            {/* View Details - Available to all roles that have view permissions */}
            {((userIsEditor && onViewLogs) ||
              userIsApprover ||
              (userIsExporter &&
                (job.status === 'approved' ||
                  job.status === 'exported' ||
                  job.status === 'deployed')) ||
              (userIsPublisher &&
                (job.status === 'exported' || job.status === 'deployed'))) && (
              <button
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
                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none transition-colors cursor-pointer"
              >
                <Eye className="w-4 h-4 mr-2" />
                View
              </button>
            )}

            {/* Edit - Only for Editors and only for in-progress jobs (not suspended) */}
            {userIsEditor && onEdit && job.status === 'in-progress' && (
              <button
                onClick={() => {
                  onEdit(job);
                  setDropdownOpen(null);
                }}
                className="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium shadow-sm focus:outline-none transition-colors cursor-pointer bg-yellow-500 text-white border border-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </button>
            )}

            {/* Suspend/Resume - Available to Editors and Approvers */}
            {(userIsEditor || userIsApprover) && job.status === 'rejected' && (
              <button
                onClick={() => handleResumeJob(job)}
                disabled={updatingStatus === job.id}
                className={`inline-flex items-center rounded-md  px-3 py-1.5 text-xs font-medium text-white shadow-sm focus:outline-none transition-colors cursor-pointer ${
                  updatingStatus === job.id
                    ? ' bg-gray-400 cursor-not-allowed'
                    : 'bg-cyan-600 hover:bg-cyan-700'
                }`}
              >
                <Play className="w-4 h-4 mr-2" />
                {updatingStatus === job.id ? 'Resuming...' : 'Resume Job'}
              </button>
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
          <span className="ml-2 text-gray-600">Loading configurations...</span>
        </div>
      ) : (
        <CustomTable
          columns={columns}
          rows={jobs}
          search={true}
          pageSize={itemsPerPage}
          pageSizeOptions={[10, 20, 50]}
          // onRowClick={(params) => handleViewConfig(params.row)}
          disableRowSelection={true}
          pagination={
            jobs.length > 0 && (
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
      )}
    </>
  );
};
export default JobList;
