import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { CronJobTableColumns } from '@features/cron/components/CronJobTableColumns';
import type { GridRenderCellParams } from '@mui/x-data-grid';
import type { ScheduleResponse } from '@features/cron/types';

jest.mock('@shared/lovs', () => ({ getDemsStatusLov: {} }));
jest.mock('@shared/helpers', () => ({
  handleInputFilter: () => null,
  handleSelectFilter: () => null,
}));
jest.mock('@utils/common/helper', () => ({ formatDate: (d: string) => d }));
jest.mock('@utils/common/functions', () => ({ getStatusBadge: () => '' }));

const mockSchedule: ScheduleResponse = {
  id: '1', name: 'Test', cron: '0 0 * * *', cronExpression: '0 0 * * *',
  iterations: 1, start_date: '2024-01-01', end_date: '2024-12-31',
  status: 'STATUS_01_IN_PROGRESS', schedule_status: 'pending',
  comments: '', created_at: '2024-01-01T00:00:00Z',
} as any;

describe('features/cron/components/CronJobTableColumns/index.tsx', () => {
  const mockOnView = jest.fn();
  const mockOnEdit = jest.fn();
  const mockOnExport = jest.fn();

  const baseProps = {
    searchingFilters: {}, setSearchingFilters: jest.fn(), setPage: jest.fn(),
    userRole: 'admin', userIsEditor: true, userIsExporter: true,
    onView: mockOnView, onEdit: mockOnEdit, onExport: mockOnExport,
  };

  beforeEach(() => jest.clearAllMocks());

  it('calls onView when EyeIcon is clicked (line 142)', () => {
    const columns = CronJobTableColumns(baseProps as any);
    const actionsCol = columns.find(c => c.field === 'actions');
    const params = { row: mockSchedule } as GridRenderCellParams<ScheduleResponse>;
    const { container } = render(<div>{actionsCol?.renderCell?.(params)}</div>);

    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
    fireEvent.click(svgs[0]);
    expect(mockOnView).toHaveBeenCalledWith(mockSchedule);
  });

  it('calls onEdit when EditIcon is clicked (line 152)', () => {
    const columns = CronJobTableColumns(baseProps as any);
    const actionsCol = columns.find(c => c.field === 'actions');
    const params = { row: { ...mockSchedule, status: 'STATUS_01_IN_PROGRESS' } } as GridRenderCellParams<ScheduleResponse>;
    const { container } = render(<div>{actionsCol?.renderCell?.(params)}</div>);

    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(svgs[1]);
    expect(mockOnEdit).toHaveBeenCalledWith({ ...mockSchedule, status: 'STATUS_01_IN_PROGRESS' });
  });

  it('calls onExport when Upload is clicked (line 161)', () => {
    const columns = CronJobTableColumns(baseProps as any);
    const actionsCol = columns.find(c => c.field === 'actions');
    const params = { row: { ...mockSchedule, status: 'STATUS_04_APPROVED' } } as GridRenderCellParams<ScheduleResponse>;
    const { container } = render(<div>{actionsCol?.renderCell?.(params)}</div>);

    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(2);
    // Export icon is last when only view + export are shown
    fireEvent.click(svgs[svgs.length - 1]);
    expect(mockOnExport).toHaveBeenCalledWith({ ...mockSchedule, status: 'STATUS_04_APPROVED' });
  });
});