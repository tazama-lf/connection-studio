import { Tooltip } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { EditIcon, EyeIcon, Upload } from 'lucide-react';
import { getDemsStatusLov } from '@shared/lovs';
import { handleInputFilter, handleSelectFilter } from '@shared/helpers';
import { formatDate } from '@utils/common/helper';
import { getStatusBadge } from '@utils/common/functions';
import type { CronJobTableColumnsProps, ScheduleResponse } from '../../types';
import { CRON_JOB_STATUSES } from '@features/cron/constants';

import {
  HeaderWrapper,
  HeaderTitle,
  CellText,
  ActionsContainer,
  ViewIconStyle,
  EditIconStyle,
  ExportIconStyle,
  DateContainer,
  DateIcon,
} from './Columns.styles';

const STATUS_ON_HOLD = 'status_02_on_hold';

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
  const statusOptions =
    (getDemsStatusLov[userRole as keyof typeof getDemsStatusLov] ?? []).filter(
      (opt) =>
        ![opt?.value, opt?.label, opt]
          .filter(Boolean)
          .some(
            (v) => typeof v === 'string' && v.toLowerCase() === STATUS_ON_HOLD
          )
    );

  return [
    {
      field: 'name',
      headerName: 'Name',
      minWidth: 400,
      flex: 1,
      sortable: false,
      align: 'center',
      disableColumnMenu: true,
      renderHeader: () => (
        <HeaderWrapper>
          <HeaderTitle>Name</HeaderTitle>
          {handleInputFilter({
            fieldName: 'name',
            searchingFilters,
            setSearchingFilters,
            setPage,
          })}
        </HeaderWrapper>
      ),
      renderCell: ({ row }) => <CellText>{row.name}</CellText>,
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
        <HeaderWrapper>
          <HeaderTitle>Status</HeaderTitle>
          {handleSelectFilter({
            fieldName: 'status',
            options: statusOptions,
            searchingFilters,
            setSearchingFilters,
            setPage,
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
      field: 'created_at',
      headerName: 'Created Time',
      minWidth: 260,
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
        <DateContainer>
          <DateIcon fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
            />
          </DateIcon>
          {formatDate(row.created_at)}
        </DateContainer>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      minWidth: 280,
      flex: 1,
      sortable: false,
      align: 'center',
      disableColumnMenu: true,
      renderHeader: () => (
        <HeaderWrapper>
          <HeaderTitle>Actions</HeaderTitle>
        </HeaderWrapper>
      ),
      renderCell: ({ row }) => (
        <ActionsContainer>
          <Tooltip title="View Details" arrow>
            <ViewIconStyle>
              <EyeIcon size={16} onClick={() => { onView(row); }} />
            </ViewIconStyle>
          </Tooltip>

          {userIsEditor &&
            [CRON_JOB_STATUSES.IN_PROGRESS, CRON_JOB_STATUSES.REJECTED].includes(
              row.status
            ) && (
              <Tooltip title="Edit Cron Job" arrow>
                <EditIconStyle>
                  <EditIcon size={16} onClick={() => { onEdit(row); }} />
                </EditIconStyle>
              </Tooltip>
            )}

          {userIsExporter &&
            row.status === CRON_JOB_STATUSES.APPROVED && (
              <Tooltip title="Export Configuration" arrow>
                <ExportIconStyle>
                  <Upload size={16} onClick={() => { onExport(row); }} />
                </ExportIconStyle>
              </Tooltip>
            )}
        </ActionsContainer>
      ),
    },
  ];
};
