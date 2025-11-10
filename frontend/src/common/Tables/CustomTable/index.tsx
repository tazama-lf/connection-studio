import { Box, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRowParams } from '@mui/x-data-grid';
import React from 'react';


interface CustomTableProps {
  uniqueId?: string;
  columns: GridColDef[];
  rows: any[];
  search?: boolean;
  pagination?: React.ReactNode;
  columnDivider?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  buttonsComponent?: React.ReactNode;
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
  search = false,
  pagination,
  columnDivider = false,
  pageSize = 10,
  pageSizeOptions = [10, 20, 50],
  buttonsComponent,
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

  const initialState = {
    pagination: { paginationModel: { pageSize } },
    rows: rows,
  };

  return (
    <Box sx={{ padding: tablePadding }}>
      {/* BUTTONS */}
      {search && !buttonsComponent && <Box sx={{ minHeight: '3rem' }}></Box>}
      {buttonsComponent && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginBottom: '12px',
          }}
        >
          {buttonsComponent}
        </Box>
      )}

      {/* TABLE */}
      <div
        style={{
          height: downSm ? '65%' : '80%',
          width: '100%',
          backgroundColor: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          // marginBottom: '16px',
        }}
      >
        <DataGrid
          getRowId={(row: any) => row[uniqueId]}
          rows={rows}
          columns={columns}
          onRowClick={onRowClick}
          onRowDoubleClick={onRowDoubleClick}
          initialState={initialState}
          hideFooter={true}
          rowHeight={52} // CHANGE ROW HEIGHT
          columnHeaderHeight={90}
          showCellVerticalBorder={columnDivider}
          disableRowSelectionOnClick={disableRowSelection}
          sx={{
            // TABLE
            border: 'none',
            '& .MuiDataGrid-columnHeaderTitle': {
              fontSize: '14px',
              fontWeight: '600',
            },
            '& .MuiDataGrid-cell': {
              fontSize: '12px',
            },

            ...(multilineHeader && {
              '& .MuiDataGrid-columnHeaderTitle': {
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                lineHeight: 1.2,
                textAlign: 'center',
                padding: '4px',
                fontSize: '9px',
              },
              '& .MuiDataGrid-cell': {
                fontSize: '10px',
              },
            }),
            ...(horizontalScroll && {
              // overflowX: 'scroll',
              '& .MuiDataGrid-columnHeaderTitle': {
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                lineHeight: 1.2,
                textAlign: 'center',
                padding: '4px',
                fontSize: '11.5px',
                fontWeight: '600',
              },
              '& .MuiDataGrid-cell': {
                fontSize: '11.5px',
                whiteSpace: 'normal !important',
                textAlign: horizontalScrollTextAlign,
              },
            }),
            '& .MuiDataGrid-columnHeader': {
              backgroundColor: '#fbf9fa',
              color: '#374151',
              textTransform: 'none',
              px: '12px',
            },
            '& .MuiDataGrid-columnHeader:focus-within, .MuiDataGrid-cell:focus, .MuiDataGrid-cell:focus-within':
              {
                outline: 'none',
              },
            '& .MuiDataGrid-row': {
              cursor: 'pointer',
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: '#f9fafb80',
            },
            '& .MuiDataGrid-row.Mui-selected, .MuiDataGrid-row.Mui-selected:hover':
              {
                backgroundColor: '#f9fbff',
              },
          }}
        />
        {pagination && <Box sx={{ marginTop: '0px' }}>{pagination}</Box>}
      </div>
    </Box>
  );
};

export default CustomTable;
