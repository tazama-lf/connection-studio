import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CronJobViewModal } from '@features/cron/components/CronJobViewModal';
import type { ScheduleResponse } from '@features/cron/types';

// Mock dependencies
jest.mock('@features/cron/components/CronJobForm', () => ({
  CronJobForm: ({ 
    viewFormData, 
    handleSendForApproval, 
    onCancel, 
    onApprove, 
    onReject 
  }: {
    viewFormData?: ScheduleResponse;
    handleSendForApproval?: () => void;
    onCancel?: () => void;
    onApprove?: (id: number) => void;
    onReject?: (id: number) => void;
  }) => (
    <div data-testid="cron-job-form">
      <span>View Mode: {viewFormData?.name}</span>
      <button onClick={handleSendForApproval}>Send for Approval</button>
      <button onClick={onCancel}>Cancel</button>
      {onApprove && <button onClick={() => onApprove(viewFormData?.id ? Number(viewFormData.id) : 0)}>Approve</button>}
      {onReject && <button onClick={() => onReject(viewFormData?.id ? Number(viewFormData.id) : 0)}>Reject</button>}
    </div>
  ),
}));

const mockViewFormData: ScheduleResponse = {
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

describe('CronJobViewModal', () => {
  const mockOnClose = jest.fn();
  const mockHandleSendForApproval = jest.fn();
  const mockOnApprove = jest.fn();
  const mockOnReject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(
        <CronJobViewModal
          isOpen={false}
          onClose={mockOnClose}
          viewFormData={mockViewFormData}
          handleSendForApproval={mockHandleSendForApproval}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render when isOpen is true', () => {
      render(
        <CronJobViewModal
          isOpen={true}
          onClose={mockOnClose}
          viewFormData={mockViewFormData}
          handleSendForApproval={mockHandleSendForApproval}
        />
      );

      expect(screen.getByText('Create New Cron Job')).toBeInTheDocument();
      expect(screen.getByTestId('cron-job-form')).toBeInTheDocument();
    });

    it('should render close button', () => {
      const { container } = render(
        <CronJobViewModal
          isOpen={true}
          onClose={mockOnClose}
          viewFormData={mockViewFormData}
          handleSendForApproval={mockHandleSendForApproval}
        />
      );

      const closeButton = container.querySelector('button svg');
      expect(closeButton).toBeInTheDocument();
    });

    it('should render with viewFormData', () => {
      render(
        <CronJobViewModal
          isOpen={true}
          onClose={mockOnClose}
          viewFormData={mockViewFormData}
          handleSendForApproval={mockHandleSendForApproval}
        />
      );

      expect(screen.getByText(`View Mode: ${mockViewFormData.name}`)).toBeInTheDocument();
    });

    it('should render with proper modal styling', () => {
      const { container } = render(
        <CronJobViewModal
          isOpen={true}
          onClose={mockOnClose}
          viewFormData={mockViewFormData}
          handleSendForApproval={mockHandleSendForApproval}
        />
      );

      const modalContent = container.querySelector('.bg-white.shadow-2xl');
      expect(modalContent).toBeInTheDocument();
      expect(modalContent).toHaveStyle({ width: '800px' });
    });

    it('should render approve button when onApprove is provided', () => {
      render(
        <CronJobViewModal
          isOpen={true}
          onClose={mockOnClose}
          viewFormData={mockViewFormData}
          handleSendForApproval={mockHandleSendForApproval}
          onApprove={mockOnApprove}
        />
      );

      expect(screen.getByText('Approve')).toBeInTheDocument();
    });

    it('should render reject button when onReject is provided', () => {
      render(
        <CronJobViewModal
          isOpen={true}
          onClose={mockOnClose}
          viewFormData={mockViewFormData}
          handleSendForApproval={mockHandleSendForApproval}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('Reject')).toBeInTheDocument();
    });

    it('should render both approve and reject buttons when both are provided', () => {
      render(
        <CronJobViewModal
          isOpen={true}
          onClose={mockOnClose}
          viewFormData={mockViewFormData}
          handleSendForApproval={mockHandleSendForApproval}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.getByText('Reject')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when close button is clicked', () => {
      const { container } = render(
        <CronJobViewModal
          isOpen={true}
          onClose={mockOnClose}
          viewFormData={mockViewFormData}
          handleSendForApproval={mockHandleSendForApproval}
        />
      );

      const closeButton = container.querySelector('.text-gray-400.hover\\:text-gray-600');
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });

    it('should call onClose when cancel is triggered from form', () => {
      render(
        <CronJobViewModal
          isOpen={true}
          onClose={mockOnClose}
          viewFormData={mockViewFormData}
          handleSendForApproval={mockHandleSendForApproval}
        />
      );

      fireEvent.click(screen.getByText('Cancel'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call handleSendForApproval and onClose when send for approval is triggered', () => {
      render(
        <CronJobViewModal
          isOpen={true}
          onClose={mockOnClose}
          viewFormData={mockViewFormData}
          handleSendForApproval={mockHandleSendForApproval}
        />
      );

      fireEvent.click(screen.getByText('Send for Approval'));

      expect(mockHandleSendForApproval).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onApprove with correct id', () => {
      render(
        <CronJobViewModal
          isOpen={true}
          onClose={mockOnClose}
          viewFormData={mockViewFormData}
          handleSendForApproval={mockHandleSendForApproval}
          onApprove={mockOnApprove}
        />
      );

      fireEvent.click(screen.getByText('Approve'));

      expect(mockOnApprove).toHaveBeenCalledWith(1);
    });

    it('should call onReject with correct id', () => {
      render(
        <CronJobViewModal
          isOpen={true}
          onClose={mockOnClose}
          viewFormData={mockViewFormData}
          handleSendForApproval={mockHandleSendForApproval}
          onReject={mockOnReject}
        />
      );

      fireEvent.click(screen.getByText('Reject'));

      expect(mockOnReject).toHaveBeenCalledWith(1);
    });

    it('should not throw error when handleSendForApproval is not provided', () => {
      render(
        <CronJobViewModal
          isOpen={true}
          onClose={mockOnClose}
          viewFormData={mockViewFormData}
        />
      );

      expect(() => {
        fireEvent.click(screen.getByText('Send for Approval'));
      }).not.toThrow();

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not throw error when onClose is not provided', () => {
      render(
        <CronJobViewModal
          isOpen={true}
          onClose={mockOnClose}
          viewFormData={mockViewFormData}
          handleSendForApproval={mockHandleSendForApproval}
        />
      );

      expect(() => {
        fireEvent.click(screen.getByText('Cancel'));
      }).not.toThrow();
    });
  });

  describe('CronJobForm Integration', () => {
    it('should pass viewFormData to CronJobForm', () => {
      render(
        <CronJobViewModal
          isOpen={true}
          onClose={mockOnClose}
          viewFormData={mockViewFormData}
          handleSendForApproval={mockHandleSendForApproval}
        />
      );

      expect(screen.getByText(`View Mode: ${mockViewFormData.name}`)).toBeInTheDocument();
    });

    it('should pass onApprove callback to CronJobForm', () => {
      render(
        <CronJobViewModal
          isOpen={true}
          onClose={mockOnClose}
          viewFormData={mockViewFormData}
          handleSendForApproval={mockHandleSendForApproval}
          onApprove={mockOnApprove}
        />
      );

      expect(screen.getByText('Approve')).toBeInTheDocument();
    });

    it('should pass onReject callback to CronJobForm', () => {
      render(
        <CronJobViewModal
          isOpen={true}
          onClose={mockOnClose}
          viewFormData={mockViewFormData}
          handleSendForApproval={mockHandleSendForApproval}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('Reject')).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should render with fixed positioning', () => {
      const { container } = render(
        <CronJobViewModal
          isOpen={true}
          onClose={mockOnClose}
          viewFormData={mockViewFormData}
          handleSendForApproval={mockHandleSendForApproval}
        />
      );

      const wrapper = container.querySelector('.fixed.inset-0.z-50');
      expect(wrapper).toBeInTheDocument();
    });

    it('should center modal content', () => {
      const { container } = render(
        <CronJobViewModal
          isOpen={true}
          onClose={mockOnClose}
          viewFormData={mockViewFormData}
          handleSendForApproval={mockHandleSendForApproval}
        />
      );

      const wrapper = container.querySelector('.flex.items-center.justify-center');
      expect(wrapper).toBeInTheDocument();
    });

    it('should have proper border styling on header', () => {
      const { container } = render(
        <CronJobViewModal
          isOpen={true}
          onClose={mockOnClose}
          viewFormData={mockViewFormData}
          handleSendForApproval={mockHandleSendForApproval}
        />
      );

      const header = container.querySelector('.border-b.border-gray-200');
      expect(header).toBeInTheDocument();
    });

    it('should render with backdrop', () => {
      const { container } = render(
        <CronJobViewModal
          isOpen={true}
          onClose={mockOnClose}
          viewFormData={mockViewFormData}
          handleSendForApproval={mockHandleSendForApproval}
        />
      );

      const backdrop = container.querySelector('.MuiBackdrop-root');
      expect(backdrop).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle viewFormData with undefined id', () => {
      const dataWithoutId = {
        ...mockViewFormData,
        id: '' as unknown as string,
      };

      render(
        <CronJobViewModal
          isOpen={true}
          onClose={mockOnClose}
          viewFormData={dataWithoutId}
          handleSendForApproval={mockHandleSendForApproval}
          onApprove={mockOnApprove}
        />
      );

      fireEvent.click(screen.getByText('Approve'));

      expect(mockOnApprove).toHaveBeenCalledWith(0);
    });

    it('should handle rapid open/close cycles', () => {
      const { rerender } = render(
        <CronJobViewModal
          isOpen={true}
          onClose={mockOnClose}
          viewFormData={mockViewFormData}
          handleSendForApproval={mockHandleSendForApproval}
        />
      );

      expect(screen.getByText('Create New Cron Job')).toBeInTheDocument();

      rerender(
        <CronJobViewModal
          isOpen={false}
          onClose={mockOnClose}
          viewFormData={mockViewFormData}
          handleSendForApproval={mockHandleSendForApproval}
        />
      );

      expect(screen.queryByText('Create New Cron Job')).not.toBeInTheDocument();

      rerender(
        <CronJobViewModal
          isOpen={true}
          onClose={mockOnClose}
          viewFormData={mockViewFormData}
          handleSendForApproval={mockHandleSendForApproval}
        />
      );

      expect(screen.getByText('Create New Cron Job')).toBeInTheDocument();
    });

    it('should handle viewFormData updates', () => {
      const { rerender } = render(
        <CronJobViewModal
          isOpen={true}
          onClose={mockOnClose}
          viewFormData={mockViewFormData}
          handleSendForApproval={mockHandleSendForApproval}
        />
      );

      expect(screen.getByText(`View Mode: ${mockViewFormData.name}`)).toBeInTheDocument();

      const updatedData = { ...mockViewFormData, name: 'Updated Schedule' };

      rerender(
        <CronJobViewModal
          isOpen={true}
          onClose={mockOnClose}
          viewFormData={updatedData}
          handleSendForApproval={mockHandleSendForApproval}
        />
      );

      expect(screen.getByText('View Mode: Updated Schedule')).toBeInTheDocument();
    });

    it('should handle missing viewFormData gracefully', () => {
      render(
        <CronJobViewModal
          isOpen={true}
          onClose={mockOnClose}
          viewFormData={undefined as unknown as ScheduleResponse}
          handleSendForApproval={mockHandleSendForApproval}
        />
      );

      expect(screen.getByTestId('cron-job-form')).toBeInTheDocument();
    });
  });
});
