import { Box, Tooltip } from '@mui/material';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { EditIcon, EyeIcon, Upload } from 'lucide-react';
import { getDemsStatusLov } from '@shared/lovs';
import { handleInputFilter, handleSelectFilter } from '@shared/helpers';
import { formatDate } from '@utils/common/helper';
import { getStatusBadge } from '@utils/common/functions';
import type { CronJobTableColumnsProps, ScheduleResponse } from '../../types';

export const CronJobTableColumns = ({
  searchingFilters,
  setSearchingFilters,
  setPage,
  userRole,
  userIsEditor,
  userIsExporter,
  onView,
  onEdit,
  onExport,
}: CronJobTableColumnsProps): Array<GridColDef<ScheduleResponse>> => {

  const handleViewClick = (schedule: ScheduleResponse) => {
    onView(schedule);
  };

  const handleEditClick = (schedule: ScheduleResponse) => {
    onEdit(schedule);
  };

  const handleExportClick = (schedule: ScheduleResponse) => {
    onExport(schedule);
  };

  return [
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
            setPage,
          })}
        </Box>
      ),
      renderCell: (params: GridRenderCellParams<ScheduleResponse>) => (
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
              getDemsStatusLov[userRole as keyof typeof getDemsStatusLov] ?? []
            ).filter((opt: unknown) => {
              const target = 'status_02_on_hold';
              if (typeof opt === 'string') {
                return opt.toLowerCase() !== target;
              } else if (opt && typeof opt === 'object' && 'value' in opt && typeof opt.value === 'string') {
                if (opt.value.toLowerCase() === target) return false;
              }
              if (opt && typeof opt === 'object' && 'label' in opt && typeof opt.label === 'string') {
                if (opt.label.toLowerCase() === target) return false;
              }
              return true;
            }),
            searchingFilters,
            setSearchingFilters,
            setPage,
          })}
        </Box>
      ),
      renderCell: (params: GridRenderCellParams<ScheduleResponse>) => (
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(params.row.status ?? '')}`}
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
      renderCell: (params: GridRenderCellParams<ScheduleResponse>) => (
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
      renderCell: (params: GridRenderCellParams<ScheduleResponse>) => {
        const schedule = params.row;

        return (
          <div className=" flex items-center justify-center gap-2 h-full">
            <Tooltip title="View Details" arrow placement="top">
              <EyeIcon
                className="w-4 h-4 mr-2 cursor-pointer"
                style={{ color: '#2b7fff' }}
                onClick={() => handleViewClick(schedule)}
              />
            </Tooltip>
            {userIsEditor &&
              (schedule.status === 'STATUS_01_IN_PROGRESS' ||
                schedule.status === 'STATUS_05_REJECTED') && (
                <Tooltip title="Edit Cron Job" arrow placement="top">
                  <EditIcon
                    className="w-4 h-4 mr-2 text-yellow-600 hover:text-yellow-700 cursor-pointer"
                    onClick={() => handleEditClick(schedule)}
                  />
                </Tooltip>
              )}
            {userIsExporter && schedule.status === 'STATUS_04_APPROVED' && (
              <Tooltip title="Export Configuration" arrow placement="top">
                <Upload
                  className="w-4 h-4 mr-2 text-cyan-600 hover:text-cyan-700 cursor-pointer"
                  onClick={() => handleExportClick(schedule)}
                />
              </Tooltip>
            )}
          </div>
        );
      },
    },
  ];
};
