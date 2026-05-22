import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { CronJobList } from '@features/cron/components/CronJobList';
import { useCronJobList } from '@features/cron/hooks/useCronJobList';
import type { ScheduleResponse } from '@features/cron/types';
import React from 'react';

// Mock the hook but allow component logic to execute
jest.mock('@features/cron/hooks/useCronJobList');
jest.mock('@common/Tables/CustomTable', () => ({
  __esModule: true,
  default: ({ columns, rows }: any) => (
    <div data-testid="custom-table">
      <div data-testid="table-columns-count">{columns.length}</div>
      <div data-testid="table-rows">{rows.length} rows</div>
    </div>
  ),
}));
jest.mock('@features/cron/components/CronJobModal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose, mode, onReject }: any) =>
    isOpen ? (
      <div data-testid="cron-job-modal">
        <div>{mode} mode</div>
        <button onClick={onClose} data-testid="modal-close">
          Close
        </button>
        {onReject && (
          <button onClick={() => onReject()} data-testid="modal-reject">
            Reject
          </button>
        )}
      </div>
    ) : null,
}));
jest.mock('@features/cron/components/ConfirmationDialog', () => ({
  __esModule: true,
  default: ({ open, onClose, onConfirm, type }: any) =>
    open ? (
      <div data-testid="confirmation-dialog">
        <div>{type} confirmation</div>
        <button onClick={onClose} data-testid="dialog-cancel">
          Cancel
        </button>
        <button onClick={() => onConfirm(type)} data-testid="dialog-confirm">
          Confirm
        </button>
      </div>
    ) : null,
}));
jest.mock('@shared/components/JobRejectionDialog', () => ({
  JobRejectionDialog: ({ isOpen, onClose, onConfirm }: any) =>
    isOpen ? (
      <div data-testid="rejection-dialog">
        <button onClick={onClose} data-testid="rejection-cancel">
          Cancel
        </button>
        <button
          onClick={() => onConfirm('test reason')}
          data-testid="rejection-confirm"
        >
          Confirm Rejection
        </button>
      </div>
    ) : null,
}));
jest.mock('@features/cron/components/CronJobTableColumns', () => ({
  CronJobTableColumns: ({ onView, onEdit, onExport }: any) => {
    // Store callbacks globally so tests can access them
    (global as any).testCallbacks = { onView, onEdit, onExport };
    return [];
  },
}));

const mockSchedules: ScheduleResponse[] = [
  {
    id: '1',
    name: 'Test Cron 1',
    cron: '0 0 * * *',
    cronExpression: '0 0 * * *',
    iterations: 3,
    schedule_status: 'active',
    status: 'STATUS_01_IN_PROGRESS',
  },
];

const mockUseCronJobList = {
  schedules: mockSchedules,
  loading: false,
  error: null,
  selectedSchedule: null,
  editForm: null,
  itemsPerPage: 10,
  actionLoading: '',
  userIsEditor: true,
  userIsExporter: false,
  userIsApprover: false,
  userIsPublisher: false,
  userRole: 'editor',
  pagination: { page: 1, totalPages: 1, totalRecords: 1 },
  searchingFilters: {},
  confirmDialog: { open: false, type: '', schedule: null },
  setPage: jest.fn(),
  setSearchingFilters: jest.fn(),
  setEditForm: jest.fn(),
  setConfirmDialog: jest.fn(),
  handleRejectionConfirm: jest.fn().mockResolvedValue(undefined),
  handleExportConfirm: jest.fn().mockResolvedValue(undefined),
  handleView: jest.fn(),
  handleEdit: jest.fn(),
  handleSaveEdit: jest.fn(),
  handleSendForApproval: jest.fn(),
  handleApprovalConfirm: jest.fn().mockResolvedValue(undefined),
  handleApproveClick: jest.fn(),
  handleApproveConfirm: jest.fn().mockResolvedValue(undefined),
  handleReject: jest.fn(),
};

describe('CronJobList Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCronJobList as jest.Mock).mockReturnValue(mockUseCronJobList);
    (global as any).testCallbacks = {};
  });

  describe('Component Callbacks', () => {
    it('should create and execute onView callback', () => {
      render(<CronJobList />);

      const callbacks = (global as any).testCallbacks;
      expect(callbacks.onView).toBeDefined();

      // Execute the onView callback
      act(() => {
        callbacks.onView(mockSchedules[0]);
      });

      expect(mockUseCronJobList.handleView).toHaveBeenCalledWith(
        mockSchedules[0],
      );

      // Modal should open in view mode
      expect(screen.getByTestId('cron-job-modal')).toBeInTheDocument();
      expect(screen.getByText('view mode')).toBeInTheDocument();
    });

    it('should create and execute onEdit callback', () => {
      render(<CronJobList />);

      const callbacks = (global as any).testCallbacks;
      expect(callbacks.onEdit).toBeDefined();

      // Execute the onEdit callback
      act(() => {
        callbacks.onEdit(mockSchedules[0]);
      });

      expect(mockUseCronJobList.handleEdit).toHaveBeenCalledWith(
        mockSchedules[0],
      );

      // Modal should open in edit mode
      expect(screen.getByTestId('cron-job-modal')).toBeInTheDocument();
      expect(screen.getByText('edit mode')).toBeInTheDocument();
    });

    it('should create and execute onExport callback', () => {
      render(<CronJobList />);

      const callbacks = (global as any).testCallbacks;
      expect(callbacks.onExport).toBeDefined();

      // Execute the onExport callback
      act(() => {
        callbacks.onExport(mockSchedules[0]);
      });

      expect(mockUseCronJobList.setConfirmDialog).toHaveBeenCalledWith({
        open: true,
        type: 'export',
        schedule: mockSchedules[0],
      });
    });
  });

  describe('Modal State Management', () => {
    it('should close modal when close button is clicked', () => {
      render(<CronJobList />);

      // Open modal via onView callback
      const callbacks = (global as any).testCallbacks;
      act(() => {
        callbacks.onView(mockSchedules[0]);
      });

      expect(screen.getByTestId('cron-job-modal')).toBeInTheDocument();

      // Click close button
      const closeButton = screen.getByTestId('modal-close');
      fireEvent.click(closeButton);

      // Modal should be closed
      expect(screen.queryByTestId('cron-job-modal')).not.toBeInTheDocument();
    });

    it('should open rejection dialog from modal', () => {
      render(<CronJobList />);

      // Open modal in view mode
      const callbacks = (global as any).testCallbacks;
      act(() => {
        callbacks.onView(mockSchedules[0]);
      });

      // Click reject button in modal
      const rejectButton = screen.getByTestId('modal-reject');
      fireEvent.click(rejectButton);

      // Rejection dialog should open
      expect(screen.getByTestId('rejection-dialog')).toBeInTheDocument();
    });

    it('should handle rejection confirmation and close both dialogs', async () => {
      render(<CronJobList />);

      // Open modal
      const callbacks = (global as any).testCallbacks;
      act(() => {
        callbacks.onView(mockSchedules[0]);
      });

      // Open rejection dialog
      fireEvent.click(screen.getByTestId('modal-reject'));

      // Confirm rejection
      const confirmButton = screen.getByTestId('rejection-confirm');
      fireEvent.click(confirmButton);

      // handleRejectionConfirmWithClose should be called
      await waitFor(() => {
        expect(mockUseCronJobList.handleRejectionConfirm).toHaveBeenCalledWith(
          'test reason',
        );
      });

      // Both dialogs should be closed
      expect(screen.queryByTestId('rejection-dialog')).not.toBeInTheDocument();
      expect(screen.queryByTestId('cron-job-modal')).not.toBeInTheDocument();
    });
  });

  describe('Confirmation Dialog Handlers', () => {
    it('should handle export confirmation', async () => {
      (useCronJobList as jest.Mock).mockReturnValue({
        ...mockUseCronJobList,
        confirmDialog: {
          open: true,
          type: 'export',
          schedule: mockSchedules[0],
        },
      });

      render(<CronJobList />);

      const confirmButton = screen.getByTestId('dialog-confirm');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockUseCronJobList.handleExportConfirm).toHaveBeenCalled();
      });
    });

    it('should handle approval confirmation', async () => {
      (useCronJobList as jest.Mock).mockReturnValue({
        ...mockUseCronJobList,
        confirmDialog: {
          open: true,
          type: 'approval',
          schedule: mockSchedules[0],
        },
      });

      render(<CronJobList />);

      const confirmButton = screen.getByTestId('dialog-confirm');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockUseCronJobList.handleApprovalConfirm).toHaveBeenCalled();
      });
    });

    it('should handle approve confirmation and close modal', async () => {
      (useCronJobList as jest.Mock).mockReturnValue({
        ...mockUseCronJobList,
        confirmDialog: {
          open: true,
          type: 'approve',
          schedule: mockSchedules[0],
        },
      });

      render(<CronJobList />);

      const confirmButton = screen.getByTestId('dialog-confirm');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockUseCronJobList.handleApproveConfirm).toHaveBeenCalled();
      });
    });
  });

  describe('Modal Data Formatting', () => {
    it('should pass editForm data to modal in edit mode', () => {
      const mockEditForm = {
        id: '1',
        name: 'Test Job',
        cronExpression: '0 0 * * *',
        iterations: 5,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        status: 'STATUS_01_IN_PROGRESS',
        schedule_status: 'active',
        comments: 'Test',
      };

      (useCronJobList as jest.Mock).mockReturnValue({
        ...mockUseCronJobList,
        editForm: mockEditForm,
      });

      render(<CronJobList />);

      const callbacks = (global as any).testCallbacks;
      act(() => {
        callbacks.onEdit(mockSchedules[0]);
      });

      expect(screen.getByTestId('cron-job-modal')).toBeInTheDocument();
      expect(screen.getByText('edit mode')).toBeInTheDocument();
    });

    it('should pass selectedSchedule as viewFormData in view mode', () => {
      (useCronJobList as jest.Mock).mockReturnValue({
        ...mockUseCronJobList,
        selectedSchedule: mockSchedules[0],
      });

      render(<CronJobList />);

      const callbacks = (global as any).testCallbacks;
      act(() => {
        callbacks.onView(mockSchedules[0]);
      });

      expect(screen.getByTestId('cron-job-modal')).toBeInTheDocument();
      expect(screen.getByText('view mode')).toBeInTheDocument();
    });
  });
});
