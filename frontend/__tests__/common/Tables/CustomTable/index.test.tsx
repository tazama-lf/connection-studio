import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { useMediaQuery } from '@mui/material';

import CustomTable from '../../../../src/common/Tables/CustomTable';

let latestDataGridProps: any;
let latestTableWrapperProps: any;

jest.mock('@mui/material', () => {
  const actual = jest.requireActual('@mui/material');
  return {
    ...actual,
    useMediaQuery: jest.fn(() => false),
    Pagination: ({ onChange }: any) => (
      <button type="button" onClick={(event) => onChange(event, 2)}>
        Next
      </button>
    ),
  };
});

jest.mock('@mui/material/styles', () => {
  const actual = jest.requireActual('@mui/material/styles');
  return {
    ...actual,
    useTheme: () => ({
      breakpoints: {
        down: () => '(max-width:600px)',
      },
    }),
  };
});

jest.mock('@mui/x-data-grid', () => ({
  DataGrid: (props: any) => {
    latestDataGridProps = props;
    return <div data-testid="data-grid" />;
  },
}));

jest.mock('../../../../src/common/Tables/CustomTable/Table.styles', () => ({
  PaginationBold: ({ children }: any) => <strong>{children}</strong>,
  PaginationContainer: ({ children }: any) => <div data-testid="pagination-container">{children}</div>,
  PaginationText: ({ children }: any) => <div data-testid="pagination-text">{children}</div>,
  StyledDataGrid: (props: any) => {
    latestDataGridProps = props;
    return <div data-testid="data-grid" />;
  },
  TableOuter: ({ children }: any) => <div data-testid="table-outer">{children}</div>,
  TableWrapper: ({ children, ...props }: any) => {
    latestTableWrapperProps = props;
    return <div data-testid="table-wrapper">{children}</div>;
  },
}));

describe('common/Tables/CustomTable/index.tsx', () => {
  const baseProps = {
    columns: [{ field: 'id', headerName: 'ID' }],
    rows: [{ id: 11, name: 'A' }],
    pagination: {
      page: 0,
      limit: 10,
      totalRecords: 25,
      setPage: jest.fn(),
    },
  };

  beforeEach(() => {
    latestDataGridProps = undefined;
    latestTableWrapperProps = undefined;
    baseProps.pagination.setPage.mockClear();
    (useMediaQuery as jest.Mock).mockReturnValue(false);
  });

  it('renders the grid and summary text', () => {
    render(<CustomTable {...baseProps} />);

    expect(screen.getByTestId('data-grid')).toBeInTheDocument();
    expect(screen.getByText(/Showing/i)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('hides pagination section when there are no rows', () => {
    render(<CustomTable {...baseProps} rows={[]} />);

    expect(screen.queryByText(/Showing/i)).not.toBeInTheDocument();
  });

  it('uses uniqueId for getRowId and handles pagination change', () => {
    render(
      <CustomTable
        {...baseProps}
        uniqueId="uuid"
        rows={[{ uuid: 'row-1' }]}
      />
    );

    expect(latestDataGridProps.getRowId({ uuid: 'row-9' })).toBe('row-9');

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(baseProps.pagination.setPage).toHaveBeenCalledWith(2);
  });

  it('uses compact wrapper height on small screens', () => {
    (useMediaQuery as jest.Mock).mockReturnValue(true);

    render(<CustomTable {...baseProps} />);

    expect(latestTableWrapperProps.sx.height).toBe('65%');
  });
});