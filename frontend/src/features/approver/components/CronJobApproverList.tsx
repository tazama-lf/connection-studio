import React, { useState } from 'react';
import { Eye, EyeIcon, MoreVertical } from 'lucide-react';
import type { ScheduleResponse } from '../../data-enrichment/types';
import { Button } from '../../../shared/components/Button';
import { DropdownMenuWithAutoDirection } from '../../../features/data-enrichment/components/DropdownMenuWithAutoDirection';
import { useAuth } from '../../auth/contexts/AuthContext';
import { getPrimaryRole, isApprover } from '../../../utils/roleUtils';
import {
  getStatusColor,
  getStatusLabel,
} from '../../../shared/utils/statusColors';
import { Box, Pagination } from '@mui/material';
import { handleInputFilter, handleSelectFilter } from '@shared/helpers';
import { getDemsStatusLov } from '@shared/lovs';
import CustomTable from '@common/Tables/CustomTable';

interface CronJobApproverListProps {
  schedules: ScheduleResponse[];
  isLoading?: boolean;
  onViewDetails?: (scheduleId: string) => void;
  onRefresh?: () => void;
  searchQuery?: string;
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

export const CronJobApproverList: React.FC<CronJobApproverListProps> = (
  props,
) => {
  const {
    schedules,
    isLoading = false,
    onViewDetails,
    onRefresh,
    searchQuery = '',
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
  const userRole = getPrimaryRole(user?.claims as string[]);
  const userIsApprover = user?.claims ? isApprover(user.claims) : false;

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
                onViewDetails?.(schedule.id);
              }}
              className="w-[75px] inline-flex justify-center items-center rounded-md bg-[#2b7fff] px-3 py-1.5 text-xs font-medium text-white shadow-sm focus:outline-none transition-colors cursor-pointer"
            >
              <EyeIcon className="w-4 h-4 mr-2" />
              View
            </button>
          </div>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading cron jobs...</span>
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

export default CronJobApproverList;
