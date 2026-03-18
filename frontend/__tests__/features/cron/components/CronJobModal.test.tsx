import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CronJobModal } from '@features/cron/components/CronJobModal';
import type { ScheduleResponse } from '@features/cron/types';

// Mock dependencies
jest.mock('@features/cron/components/CronJobForm', () => ({
  CronJobForm: ({ 
    onJobCreated, 
    onCancel,
    viewFormData,
    editFormData,
    handleSendForApproval,
    handleSaveEdit,
    onApprove,
    onReject,
  }: any) => (
    <div data-testid="cron-job-form">
      {viewFormData && <div data-testid="view-mode">View Mode</div>}
      {editFormData && <div data-testid="edit-mode">Edit Mode</div>}
      {!viewFormData && !editFormData && <div data-testid="create-mode">Create Mode</div>}
      {onJobCreated && <button onClick={onJobCreated}>Submit Form</button>}
      {onCancel && <button onClick={onCancel}>Cancel Form</button>}
      {handleSendForApproval && <button onClick={handleSendForApproval}>Send for Approval</button>}
      {handleSaveEdit && <button onClick={handleSaveEdit}>Save Edit</button>}
      {onApprove && <button onClick={() => onApprove('test-id')}>Approve</button>}
      {onReject && <button onClick={() => onReject('test-id')}>Reject</button>}
    </div>
  ),
}));

describe('CronJobModal', () => {
  const mockOnClose = jest.fn();
  const mockOnJobCreated = jest.fn();
  const mockHandleSendForApproval = jest.fn();
  const mockHandleSaveEdit = jest.fn();
  const mockOnApprove = jest.fn();
  const mockOnReject = jest.fn();
  const mockSetEditFormData = jest.fn();

  const mockViewFormData: ScheduleResponse = {
    id: 'test-123',
    name: 'Test Cron Job',
    cron: '0 0 * * *',
    cronExpression: '0 0 * * *',
    iterations: 3,
    schedule_status: 'active',
    status: 'STATUS_03_UNDER_REVIEW',
  };

  const mockEditFormData: ScheduleResponse = {
    id: 'test-456',
    name: 'Edit Cron Job',
    cron: '0 12 * * *',
    cronExpression: '0 12 * * *',
    iterations: 5,
    schedule_status: 'active',
    status: 'STATUS_01_IN_PROGRESS',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering - Closed State', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(
        <CronJobModal
          isOpen={false}
          onClose={mockOnClose}
          onJobCreated={mockOnJobCreated}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Rendering - Create Mode', () => {
    it('should render create mode by default', () => {
      render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          onJobCreated={mockOnJobCreated}
        />
      );

      expect(screen.getByText('Create New Cron Job')).toBeInTheDocument();
      expect(screen.getByTestId('create-mode')).toBeInTheDocument();
    });

    it('should render create mode when explicitly set', () => {
      render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          mode="create"
          onJobCreated={mockOnJobCreated}
        />
      );

      expect(screen.getByText('Create New Cron Job')).toBeInTheDocument();
      expect(screen.getByTestId('create-mode')).toBeInTheDocument();
    });

    it('should render form with create handlers', () => {
      render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          mode="create"
          onJobCreated={mockOnJobCreated}
        />
      );

      expect(screen.getByText('Submit Form')).toBeInTheDocument();
      expect(screen.getByText('Cancel Form')).toBeInTheDocument();
    });
  });

  describe('Rendering - Edit Mode', () => {
    it('should render edit mode with correct title', () => {
      render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          mode="edit"
          editFormData={mockEditFormData}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      expect(screen.getByText('Edit Cron Job')).toBeInTheDocument();
      expect(screen.getByTestId('edit-mode')).toBeInTheDocument();
    });

    it('should render form with edit handlers', () => {
      render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          mode="edit"
          editFormData={mockEditFormData}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      expect(screen.getByText('Save Edit')).toBeInTheDocument();
      expect(screen.getByText('Cancel Form')).toBeInTheDocument();
    });
  });

  describe('Rendering - View Mode', () => {
    it('should render view mode with correct title', () => {
      render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          mode="view"
          viewFormData={mockViewFormData}
          handleSendForApproval={mockHandleSendForApproval}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('View Cron Job')).toBeInTheDocument();
      expect(screen.getByTestId('view-mode')).toBeInTheDocument();
    });

    it('should render form with view/approval handlers', () => {
      render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          mode="view"
          viewFormData={mockViewFormData}
          handleSendForApproval={mockHandleSendForApproval}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('Send for Approval')).toBeInTheDocument();
      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.getByText('Reject')).toBeInTheDocument();
      expect(screen.getByText('Cancel Form')).toBeInTheDocument();
    });
  });

  describe('Modal UI Elements', () => {
    it('should render close button', () => {
      const { container } = render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          onJobCreated={mockOnJobCreated}
        />
      );

      const closeButton = container.querySelector('button svg');
      expect(closeButton).toBeInTheDocument();
    });

    it('should render with proper modal styling', () => {
      const { container } = render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          onJobCreated={mockOnJobCreated}
        />
      );

      const modalContent = container.querySelector('.bg-white.shadow-2xl');
      expect(modalContent).toBeInTheDocument();
    });

    it('should render with backdrop', () => {
      const { container } = render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          onJobCreated={mockOnJobCreated}
        />
      );

      const backdrop = container.querySelector('[data-testid="mui-backdrop"]');
      expect(backdrop).toBeInTheDocument();
    });
  });

  describe('User Interactions - Create Mode', () => {
    it('should call onClose when close button is clicked', () => {
      const { container } = render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          mode="create"
          onJobCreated={mockOnJobCreated}
        />
      );

      const closeButton = container.querySelector('.text-gray-400');
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });

    it('should call onClose when cancel is triggered from form', () => {
      render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          mode="create"
          onJobCreated={mockOnJobCreated}
        />
      );

      fireEvent.click(screen.getByText('Cancel Form'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onJobCreated and onClose when form is submitted', () => {
      render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          mode="create"
          onJobCreated={mockOnJobCreated}
        />
      );

      fireEvent.click(screen.getByText('Submit Form'));

      expect(mockOnJobCreated).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('User Interactions - Edit Mode', () => {
    it('should call handleSaveEdit and onClose when save is triggered', () => {
      render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          mode="edit"
          editFormData={mockEditFormData}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      fireEvent.click(screen.getByText('Save Edit'));

      expect(mockHandleSaveEdit).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when cancel is triggered', () => {
      render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          mode="edit"
          editFormData={mockEditFormData}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      fireEvent.click(screen.getByText('Cancel Form'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('User Interactions - View Mode', () => {
    it('should call handleSendForApproval and onClose when send for approval is triggered', () => {
      render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          mode="view"
          viewFormData={mockViewFormData}
          handleSendForApproval={mockHandleSendForApproval}
        />
      );

      fireEvent.click(screen.getByText('Send for Approval'));

      expect(mockHandleSendForApproval).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onApprove when approve button is clicked', () => {
      render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          mode="view"
          viewFormData={mockViewFormData}
          onApprove={mockOnApprove}
        />
      );

      fireEvent.click(screen.getByText('Approve'));
      expect(mockOnApprove).toHaveBeenCalledWith('test-id');
    });

    it('should call onReject when reject button is clicked', () => {
      render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          mode="view"
          viewFormData={mockViewFormData}
          onReject={mockOnReject}
        />
      );

      fireEvent.click(screen.getByText('Reject'));
      expect(mockOnReject).toHaveBeenCalledWith('test-id');
    });
  });

  describe('Edge Cases', () => {
    it('should not throw error when onJobCreated is not provided', () => {
      expect(() => {
        render(
          <CronJobModal
            isOpen={true}
            onClose={mockOnClose}
            mode="create"
          />
        );
      }).not.toThrow();
    });

    it('should not throw error when optional handlers are not provided in edit mode', () => {
      expect(() => {
        render(
          <CronJobModal
            isOpen={true}
            onClose={mockOnClose}
            mode="edit"
            editFormData={mockEditFormData}
          />
        );
      }).not.toThrow();
    });

    it('should not throw error when optional handlers are not provided in view mode', () => {
      expect(() => {
        render(
          <CronJobModal
            isOpen={true}
            onClose={mockOnClose}
            mode="view"
            viewFormData={mockViewFormData}
          />
        );
      }).not.toThrow();
    });

    it('should handle missing viewFormData in view mode', () => {
      render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          mode="view"
        />
      );

      expect(screen.getByText('View Cron Job')).toBeInTheDocument();
    });

    it('should handle missing editFormData in edit mode', () => {
      render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          mode="edit"
        />
      );

      expect(screen.getByText('Edit Cron Job')).toBeInTheDocument();
    });

    it('should call handleSendForApproval and onClose when Send for Approval is clicked in view mode', () => {
      // Tests the else-if (mode === 'view') branch in handleJobCreated
      render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          mode="view"
          viewFormData={mockViewFormData}
          handleSendForApproval={mockHandleSendForApproval}
        />
      );

      // In view mode CronJobModal passes handleJobCreated as handleSendForApproval to CronJobForm,
      // so the mock renders "Send for Approval" button (not "Submit Form").
      fireEvent.click(screen.getByText('Send for Approval'));

      expect(mockHandleSendForApproval).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });
});
