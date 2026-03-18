import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { Pagination } from '../../../../src/common/Tables/Pagination';

const onPageChange = jest.fn();

jest.mock('@mui/material/Pagination', () => ({
  __esModule: true,
  default: ({ count, page, className, onChange }: any) => (
    <button
      type="button"
      data-testid="mui-pagination"
      data-count={count}
      data-page={page}
      className={className}
      onClick={(event) => onChange(event, 4)}
    >
      Page
    </button>
  ),
}));

jest.mock('@mui/x-data-grid', () => ({
  gridPageCountSelector: 'gridPageCountSelector',
  useGridApiContext: jest.fn(() => ({ current: {} })),
  useGridSelector: jest.fn(() => 8),
  GridPagination: ({ ActionsComponent, ...props }: any) => (
    <ActionsComponent {...props} />
  ),
}));

describe('common/Tables/Pagination/index.tsx', () => {
  it('renders pagination using grid page count and maps page index changes', () => {
    render(<Pagination page={1} onPageChange={onPageChange} className="pager" />);

    const pagination = screen.getByTestId('mui-pagination');
    expect(pagination).toHaveAttribute('data-count', '8');
    expect(pagination).toHaveAttribute('data-page', '2');
    expect(pagination).toHaveClass('pager');

    fireEvent.click(pagination);
    expect(onPageChange).toHaveBeenCalledWith(expect.anything(), 3);
  });
});