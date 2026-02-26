import { Pagination, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { GridColDef, GridRowParams } from '@mui/x-data-grid';
import React from 'react';

import {
  PaginationBold,
  PaginationContainer,
  PaginationText,
  StyledDataGrid,
  TableOuter,
  TableWrapper,
} from './Table.styles';

interface CustomTableProps {
  uniqueId?: string;
  columns: GridColDef[];
  rows: any[];
  pagination: {
    page: number;
    limit: number;
    totalRecords: number;
    setPage: (page: number) => void;
  };
  columnDivider?: boolean;
  onRowClick?: (params: GridRowParams) => void;
  onRowDoubleClick?: (params: GridRowParams) => void;
  multilineHeader?: boolean;
  horizontalScroll?: boolean;
  horizontalScrollTextAlign?: 'left' | 'center' | 'right';
  disableRowSelection?: boolean;
  tablePadding?: string;
}

const CustomTable: React.FC<CustomTableProps> = ({
  uniqueId = 'id',
  columns,
  rows,
  pagination,
  columnDivider = false,
  onRowClick,
  onRowDoubleClick,
  multilineHeader = false,
  horizontalScroll = false,
  horizontalScrollTextAlign = 'center',
  disableRowSelection = true,
  tablePadding = '0 0px',
}) => {
  const theme = useTheme();
  const downSm = useMediaQuery(theme.breakpoints.down('sm'));

  const totalPages = Math.max(
    1,
    Math.ceil(pagination.totalRecords / pagination.limit)
  );

  const from = pagination.page * pagination.limit + 1;
  const to = Math.min(
    (pagination.page + 1) * pagination.limit,
    pagination.totalRecords
  );

  return (
    <TableOuter paddingValue={tablePadding}>
      <TableWrapper sx={{ height: downSm ? '65%' : '80%' }}>
        <StyledDataGrid
          getRowId={(row) => row[uniqueId]}
          rows={rows}
          columns={columns}
          onRowClick={onRowClick}
          onRowDoubleClick={onRowDoubleClick}
          hideFooter
          rowHeight={52}
          columnHeaderHeight={90}
          showCellVerticalBorder={columnDivider}
          disableRowSelectionOnClick={disableRowSelection}
          multilineHeader={multilineHeader}
          horizontalScroll={horizontalScroll}
          horizontalScrollTextAlign={horizontalScrollTextAlign}
          initialState={{
            pagination: { paginationModel: { pageSize: pagination.limit } },
          }}
        />

        {rows.length > 0 && (
          <PaginationContainer>
            <PaginationText>
              Showing <PaginationBold>{from}</PaginationBold> to{' '}
              <PaginationBold>{to}</PaginationBold> of{' '}
              <PaginationBold>{pagination.totalRecords}</PaginationBold> results
            </PaginationText>

            <Pagination
              page={pagination.page + 1}
              count={totalPages}
              onChange={(_, newPage) => { pagination.setPage(newPage); }}
              variant="outlined"
            />
          </PaginationContainer>
        )}
      </TableWrapper>
    </TableOuter>
  );
};

export default CustomTable;
