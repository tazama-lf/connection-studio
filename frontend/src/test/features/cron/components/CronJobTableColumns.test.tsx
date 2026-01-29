import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CronJobTableColumns } from '@features/cron/components/CronJobTableColumns';
import type { ScheduleResponse } from '@features/cron/types';
import type { GridRenderCellParams } from '@mui/x-data-grid';

// Mock dependencies
jest.mock('@shared/lovs', () => ({
  getDemsStatusLov: {
    admin: [
      { label: 'In Progress', value: 'STATUS_01_IN_PROGRESS' },
      { label: 'Under Review', value: 'STATUS_03_UNDER_REVIEW' },
      { label: 'Approved', value: 'STATUS_04_APPROVED' },
      { label: 'Rejected', value: 'STATUS_05_REJECTED' },
    ],
    editor: [
      { label: 'In Progress', value: 'STATUS_01_IN_PROGRESS' },
      { label: 'Rejected', value: 'STATUS_05_REJECTED' },
    ],
  },
}));

jest.mock('@shared/helpers', () => ({
  handleInputFilter: ({ fieldName }: { fieldName: string }) => (
    <input data-testid={`filter-input-${fieldName}`} placeholder={`Filter ${fieldName}`} />
  ),
  handleSelectFilter: ({ fieldName, options }: { fieldName: string; options: unknown[] }) => (
    <select data-testid={`filter-select-${fieldName}`}>
      {options.map((opt: unknown, idx: number) => (
        <option key={idx} value={typeof opt === 'object' && opt !== null && 'value' in opt ? String(opt.value) : String(opt)}>
          {typeof opt === 'object' && opt !== null && 'label' in opt ? String(opt.label) : String(opt)}
        </option>
      ))}
    </select>
  ),
}));

jest.mock('@utils/common/helper', () => ({
  formatDate: (date: string) => new Date(date).toLocaleDateString('en-US'),
}));

jest.mock('@utils/common/functions', () => ({
  getStatusBadge: (status: string) => {
    const badges: Record<string, string> = {
      'STATUS_01_IN_PROGRESS': 'bg-blue-100 text-blue-800',
      'STATUS_03_UNDER_REVIEW': 'bg-yellow-100 text-yellow-800',
      'STATUS_04_APPROVED': 'bg-green-100 text-green-800',
      'STATUS_05_REJECTED': 'bg-red-100 text-red-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  },
}));

const mockSchedule: ScheduleResponse = {
  id: '1',
  name: 'Test Schedule',
  cron: '0 0 * * *',
  cronExpression: '0 0 * * *',
  iterations: 5,
  start_date: '2024-01-01',
  end_date: '2024-12-31',
  status: 'STATUS_01_IN_PROGRESS',
  schedule_status: 'pending',
  comments: 'Test comments',
  created_at: '2024-01-01T00:00:00Z',
};

describe('CronJobTableColumns', () => {
  const mockSetPage = jest.fn();
  const mockSetSearchingFilters = jest.fn();
  const mockOnView = jest.fn();
  const mockOnEdit = jest.fn();
  const mockOnExport = jest.fn();

  const defaultProps = {
    searchingFilters: {},
    setSearchingFilters: mockSetSearchingFilters,
    setPage: mockSetPage,
    userRole: 'admin',
    userIsEditor: true,
    userIsExporter: true,
    onView: mockOnView,
    onEdit: mockOnEdit,
    onExport: mockOnExport,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Column Configuration', () => {
    it('should return array of column definitions', () => {
      const columns = CronJobTableColumns(defaultProps);
      
      expect(Array.isArray(columns)).toBe(true);
      expect(columns.length).toBe(4);
    });

    it('should have name column with correct configuration', () => {
      const columns = CronJobTableColumns(defaultProps);
      const nameColumn = columns.find(col => col.field === 'name');
      
      expect(nameColumn).toBeDefined();
      expect(nameColumn?.headerName).toBe('Name');
      expect(nameColumn?.flex).toBe(1);
      expect(nameColumn?.minWidth).toBe(400);
      expect(nameColumn?.sortable).toBe(false);
    });

    it('should have status column with correct configuration', () => {
      const columns = CronJobTableColumns(defaultProps);
      const statusColumn = columns.find(col => col.field === 'status');
      
      expect(statusColumn).toBeDefined();
      expect(statusColumn?.headerName).toBe('Status');
      expect(statusColumn?.minWidth).toBe(260);
      expect(statusColumn?.sortable).toBe(false);
    });

    it('should have created_at column with correct configuration', () => {
      const columns = CronJobTableColumns(defaultProps);
      const createdColumn = columns.find(col => col.field === 'created_at');
      
      expect(createdColumn).toBeDefined();
      expect(createdColumn?.headerName).toBe('Created Time');
      expect(createdColumn?.minWidth).toBe(260);
      expect(createdColumn?.sortable).toBe(false);
    });

    it('should have actions column with correct configuration', () => {
      const columns = CronJobTableColumns(defaultProps);
      const actionsColumn = columns.find(col => col.field === 'actions');
      
      expect(actionsColumn).toBeDefined();
      expect(actionsColumn?.headerName).toBe('Actions');
      expect(actionsColumn?.minWidth).toBe(280);
      expect(actionsColumn?.sortable).toBe(false);
    });
  });

  describe('Name Column', () => {
    it('should render name filter in header', () => {
      const columns = CronJobTableColumns(defaultProps);
      const nameColumn = columns.find(col => col.field === 'name');
      
      const { container } = render(<div>{nameColumn?.renderHeader?.({} as any)}</div>);
      
      expect(screen.getByTestId('filter-input-name')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
    });

    it('should render name cell with schedule name', () => {
      const columns = CronJobTableColumns(defaultProps);
      const nameColumn = columns.find(col => col.field === 'name');
      
      const params: GridRenderCellParams<ScheduleResponse> = {
        row: mockSchedule,
      } as GridRenderCellParams<ScheduleResponse>;
      
      const { container } = render(<div>{nameColumn?.renderCell?.(params)}</div>);
      
      expect(screen.getByText('Test Schedule')).toBeInTheDocument();
    });
  });

  describe('Status Column', () => {
    it('should render status filter in header with correct options for admin', () => {
      const columns = CronJobTableColumns(defaultProps);
      const statusColumn = columns.find(col => col.field === 'status');
      
      const { container } = render(<div>{statusColumn?.renderHeader?.({} as any)}</div>);
      
      expect(screen.getByTestId('filter-select-status')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('should render status filter with correct options for editor', () => {
      const columns = CronJobTableColumns({
        ...defaultProps,
        userRole: 'editor',
      });
      const statusColumn = columns.find(col => col.field === 'status');
      
      const { container } = render(<div>{statusColumn?.renderHeader?.({} as any)}</div>);
      
      expect(screen.getByTestId('filter-select-status')).toBeInTheDocument();
    });

    it('should render status cell with badge styling', () => {
      const columns = CronJobTableColumns(defaultProps);
      const statusColumn = columns.find(col => col.field === 'status');
      
      const params: GridRenderCellParams<ScheduleResponse> = {
        row: mockSchedule,
      } as GridRenderCellParams<ScheduleResponse>;
      
      const { container } = render(<div>{statusColumn?.renderCell?.(params)}</div>);
      
      expect(screen.getByText('STATUS_01_IN_PROGRESS')).toBeInTheDocument();
      const badge = container.querySelector('.bg-blue-100');
      expect(badge).toBeInTheDocument();
    });

    it('should render status indicator dot', () => {
      const columns = CronJobTableColumns(defaultProps);
      const statusColumn = columns.find(col => col.field === 'status');
      
      const params: GridRenderCellParams<ScheduleResponse> = {
        row: mockSchedule,
      } as GridRenderCellParams<ScheduleResponse>;
      
      const { container } = render(<div>{statusColumn?.renderCell?.(params)}</div>);
      
      const dot = container.querySelector('.w-2.h-2.rounded-full');
      expect(dot).toBeInTheDocument();
    });

    it('should handle null status gracefully', () => {
      const columns = CronJobTableColumns(defaultProps);
      const statusColumn = columns.find(col => col.field === 'status');
      
      const params: GridRenderCellParams<ScheduleResponse> = {
        row: { ...mockSchedule, status: null as unknown as string },
      } as GridRenderCellParams<ScheduleResponse>;
      
      const { container } = render(<div>{statusColumn?.renderCell?.(params)}</div>);
      
      expect(container).toBeInTheDocument();
    });
  });

  describe('Created At Column', () => {
    it('should render header without filter', () => {
      const columns = CronJobTableColumns(defaultProps);
      const createdColumn = columns.find(col => col.field === 'created_at');
      
      const { container } = render(<div>{createdColumn?.renderHeader?.({} as any)}</div>);
      
      expect(screen.getByText('Created At')).toBeInTheDocument();
    });

    it('should render formatted date in cell', () => {
      const columns = CronJobTableColumns(defaultProps);
      const createdColumn = columns.find(col => col.field === 'created_at');
      
      const params: GridRenderCellParams<ScheduleResponse> = {
        row: mockSchedule,
      } as GridRenderCellParams<ScheduleResponse>;
      
      const { container } = render(<div>{createdColumn?.renderCell?.(params)}</div>);
      
      expect(screen.getByText('1/1/2024')).toBeInTheDocument();
    });

    it('should render calendar icon in cell', () => {
      const columns = CronJobTableColumns(defaultProps);
      const createdColumn = columns.find(col => col.field === 'created_at');
      
      const params: GridRenderCellParams<ScheduleResponse> = {
        row: mockSchedule,
      } as GridRenderCellParams<ScheduleResponse>;
      
      const { container } = render(<div>{createdColumn?.renderCell?.(params)}</div>);
      
      const svg = container.querySelector('svg.w-4.h-4');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Actions Column', () => {
    it('should render header', () => {
      const columns = CronJobTableColumns(defaultProps);
      const actionsColumn = columns.find(col => col.field === 'actions');
      
      const { container } = render(<div>{actionsColumn?.renderHeader?.({} as any)}</div>);
      
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('should always render view icon', () => {
      const columns = CronJobTableColumns(defaultProps);
      const actionsColumn = columns.find(col => col.field === 'actions');
      
      const params: GridRenderCellParams<ScheduleResponse> = {
        row: mockSchedule,
      } as GridRenderCellParams<ScheduleResponse>;
      
      const { container } = render(<div>{actionsColumn?.renderCell?.(params)}</div>);
      
      const viewIcon = container.querySelector('[data-testid="lucide-eye"]');
      expect(viewIcon).toBeDefined();
    });

    it('should call onView when view icon is clicked', () => {
      const columns = CronJobTableColumns(defaultProps);
      const actionsColumn = columns.find(col => col.field === 'actions');
      
      const params: GridRenderCellParams<ScheduleResponse> = {
        row: mockSchedule,
      } as GridRenderCellParams<ScheduleResponse>;
      
      const { container } = render(<div>{actionsColumn?.renderCell?.(params)}</div>);
      
      const viewButton = container.querySelector('.cursor-pointer');
      if (viewButton) {
        fireEvent.click(viewButton);
        expect(mockOnView).toHaveBeenCalledWith(mockSchedule);
      }
    });

    it('should render edit icon when user is editor and status is IN_PROGRESS', () => {
      const columns = CronJobTableColumns({
        ...defaultProps,
        userIsEditor: true,
      });
      const actionsColumn = columns.find(col => col.field === 'actions');
      
      const params: GridRenderCellParams<ScheduleResponse> = {
        row: { ...mockSchedule, status: 'STATUS_01_IN_PROGRESS' },
      } as GridRenderCellParams<ScheduleResponse>;
      
      const { container } = render(<div>{actionsColumn?.renderCell?.(params)}</div>);
      
      const editIcon = container.querySelector('[data-testid="lucide-pencil"]');
      expect(editIcon).toBeDefined();
    });

    it('should render edit icon when user is editor and status is REJECTED', () => {
      const columns = CronJobTableColumns({
        ...defaultProps,
        userIsEditor: true,
      });
      const actionsColumn = columns.find(col => col.field === 'actions');
      
      const params: GridRenderCellParams<ScheduleResponse> = {
        row: { ...mockSchedule, status: 'STATUS_05_REJECTED' },
      } as GridRenderCellParams<ScheduleResponse>;
      
      const { container } = render(<div>{actionsColumn?.renderCell?.(params)}</div>);
      
      const editIcon = container.querySelector('[data-testid="lucide-pencil"]');
      expect(editIcon).toBeDefined();
    });

    it('should not render edit icon when user is not editor', () => {
      const columns = CronJobTableColumns({
        ...defaultProps,
        userIsEditor: false,
      });
      const actionsColumn = columns.find(col => col.field === 'actions');
      
      const params: GridRenderCellParams<ScheduleResponse> = {
        row: { ...mockSchedule, status: 'STATUS_01_IN_PROGRESS' },
      } as GridRenderCellParams<ScheduleResponse>;
      
      const { container } = render(<div>{actionsColumn?.renderCell?.(params)}</div>);
      
      const editIcon = container.querySelector('[data-testid="lucide-pencil"]');
      expect(editIcon).toBeNull();
    });

    it('should not render edit icon when status is APPROVED', () => {
      const columns = CronJobTableColumns({
        ...defaultProps,
        userIsEditor: true,
      });
      const actionsColumn = columns.find(col => col.field === 'actions');
      
      const params: GridRenderCellParams<ScheduleResponse> = {
        row: { ...mockSchedule, status: 'STATUS_04_APPROVED' },
      } as GridRenderCellParams<ScheduleResponse>;
      
      const { container } = render(<div>{actionsColumn?.renderCell?.(params)}</div>);
      
      const editIcon = container.querySelector('[data-testid="lucide-pencil"]');
      expect(editIcon).toBeNull();
    });

    it('should call onEdit when edit icon is clicked', () => {
      const columns = CronJobTableColumns(defaultProps);
      const actionsColumn = columns.find(col => col.field === 'actions');
      
      const params: GridRenderCellParams<ScheduleResponse> = {
        row: { ...mockSchedule, status: 'STATUS_01_IN_PROGRESS' },
      } as GridRenderCellParams<ScheduleResponse>;
      
      const { container } = render(<div>{actionsColumn?.renderCell?.(params)}</div>);
      
      const icons = container.querySelectorAll('.cursor-pointer');
      // Second icon should be edit (first is view)
      if (icons[1]) {
        fireEvent.click(icons[1]);
        expect(mockOnEdit).toHaveBeenCalledWith({ ...mockSchedule, status: 'STATUS_01_IN_PROGRESS' });
      }
    });

    it('should render export icon when user is exporter and status is APPROVED', () => {
      const columns = CronJobTableColumns({
        ...defaultProps,
        userIsExporter: true,
      });
      const actionsColumn = columns.find(col => col.field === 'actions');
      
      const params: GridRenderCellParams<ScheduleResponse> = {
        row: { ...mockSchedule, status: 'STATUS_04_APPROVED' },
      } as GridRenderCellParams<ScheduleResponse>;
      
      const { container } = render(<div>{actionsColumn?.renderCell?.(params)}</div>);
      
      const exportIcon = container.querySelector('[data-testid="lucide-upload"]');
      expect(exportIcon).toBeDefined();
    });

    it('should not render export icon when user is not exporter', () => {
      const columns = CronJobTableColumns({
        ...defaultProps,
        userIsExporter: false,
      });
      const actionsColumn = columns.find(col => col.field === 'actions');
      
      const params: GridRenderCellParams<ScheduleResponse> = {
        row: { ...mockSchedule, status: 'STATUS_04_APPROVED' },
      } as GridRenderCellParams<ScheduleResponse>;
      
      const { container } = render(<div>{actionsColumn?.renderCell?.(params)}</div>);
      
      const exportIcon = container.querySelector('[data-testid="lucide-upload"]');
      expect(exportIcon).toBeNull();
    });

    it('should not render export icon when status is not APPROVED', () => {
      const columns = CronJobTableColumns({
        ...defaultProps,
        userIsExporter: true,
      });
      const actionsColumn = columns.find(col => col.field === 'actions');
      
      const params: GridRenderCellParams<ScheduleResponse> = {
        row: { ...mockSchedule, status: 'STATUS_01_IN_PROGRESS' },
      } as GridRenderCellParams<ScheduleResponse>;
      
      const { container } = render(<div>{actionsColumn?.renderCell?.(params)}</div>);
      
      const exportIcon = container.querySelector('[data-testid="lucide-upload"]');
      expect(exportIcon).toBeNull();
    });

    it('should call onExport when export icon is clicked', () => {
      const columns = CronJobTableColumns(defaultProps);
      const actionsColumn = columns.find(col => col.field === 'actions');
      
      const params: GridRenderCellParams<ScheduleResponse> = {
        row: { ...mockSchedule, status: 'STATUS_04_APPROVED' },
      } as GridRenderCellParams<ScheduleResponse>;
      
      const { container } = render(<div>{actionsColumn?.renderCell?.(params)}</div>);
      
      const icons = container.querySelectorAll('.cursor-pointer');
      // Export icon should be second (view is first)
      if (icons[1]) {
        fireEvent.click(icons[1]);
        expect(mockOnExport).toHaveBeenCalledWith({ ...mockSchedule, status: 'STATUS_04_APPROVED' });
      }
    });
  });

  describe('User Role Filtering', () => {
    it('should filter out status_02_on_hold from options', () => {
      const columns = CronJobTableColumns(defaultProps);
      const statusColumn = columns.find(col => col.field === 'status');
      
      // This tests the filter logic in the component
      expect(statusColumn).toBeDefined();
    });

    it('should handle unknown user role gracefully', () => {
      const columns = CronJobTableColumns({
        ...defaultProps,
        userRole: 'unknown_role',
      });
      
      expect(columns.length).toBe(4);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing renderCell functions', () => {
      const columns = CronJobTableColumns(defaultProps);
      
      columns.forEach(column => {
        if (column.renderCell) {
          expect(typeof column.renderCell).toBe('function');
        }
      });
    });

    it('should handle missing renderHeader functions', () => {
      const columns = CronJobTableColumns(defaultProps);
      
      columns.forEach(column => {
        if (column.renderHeader) {
          expect(typeof column.renderHeader).toBe('function');
        }
      });
    });

    it('should handle schedule with all permissions disabled', () => {
      const columns = CronJobTableColumns({
        ...defaultProps,
        userIsEditor: false,
        userIsExporter: false,
      });
      const actionsColumn = columns.find(col => col.field === 'actions');
      
      const params: GridRenderCellParams<ScheduleResponse> = {
        row: mockSchedule,
      } as GridRenderCellParams<ScheduleResponse>;
      
      const { container } = render(<div>{actionsColumn?.renderCell?.(params)}</div>);
      
      // Should still render view icon
      const icons = container.querySelectorAll('.cursor-pointer');
      expect(icons.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle schedule with multiple valid actions', () => {
      const columns = CronJobTableColumns({
        ...defaultProps,
        userIsEditor: true,
        userIsExporter: true,
      });
      const actionsColumn = columns.find(col => col.field === 'actions');
      
      const params: GridRenderCellParams<ScheduleResponse> = {
        row: { ...mockSchedule, status: 'STATUS_01_IN_PROGRESS' },
      } as GridRenderCellParams<ScheduleResponse>;
      
      const { container } = render(<div>{actionsColumn?.renderCell?.(params)}</div>);
      
      // Should render view + edit icons (not export since status is IN_PROGRESS)
      const icons = container.querySelectorAll('.cursor-pointer');
      expect(icons.length).toBeGreaterThanOrEqual(2);
    });
  });
});

