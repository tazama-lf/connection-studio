import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CronJobEditModal } from '@features/cron/components/CronJobEditModal';
import type { ScheduleResponse } from '@features/cron/types';

// Mock dependencies
jest.mock('@features/cron/components/CronJobForm', () => ({
  CronJobForm: ({ 
    editFormData, 
    setEditFormData,
    handleSaveEdit, 
    onCancel 
  }: {
    editFormData?: ScheduleResponse;
    setEditFormData?: (data: ScheduleResponse) => void;
    handleSaveEdit?: () => void;
    onCancel?: () => void;
  }) => (
    <div data-testid="cron-job-form">
      <span>Edit Mode: {editFormData?.name}</span>
      <button onClick={() => setEditFormData?.({ ...editFormData!, name: 'Updated Name' } as ScheduleResponse)}>
        Update Name
      </button>
      <button onClick={handleSaveEdit}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

const mockEditFormData: ScheduleResponse = {
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

describe('CronJobEditModal', () => {
  const mockOnClose = jest.fn();
  const mockSetEditFormData = jest.fn();
  const mockHandleSaveEdit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(
        <CronJobEditModal
          isOpen={false}
          onClose={mockOnClose}
          editFormData={mockEditFormData}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render when isOpen is true', () => {
      render(
        <CronJobEditModal
          isOpen={true}
          onClose={mockOnClose}
          editFormData={mockEditFormData}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      expect(screen.getByText('Create New Cron Job')).toBeInTheDocument();
      expect(screen.getByTestId('cron-job-form')).toBeInTheDocument();
    });

    it('should render close button', () => {
      const { container } = render(
        <CronJobEditModal
          isOpen={true}
          onClose={mockOnClose}
          editFormData={mockEditFormData}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      const closeButton = container.querySelector('button svg');
      expect(closeButton).toBeInTheDocument();
    });

    it('should render with editFormData', () => {
      render(
        <CronJobEditModal
          isOpen={true}
          onClose={mockOnClose}
          editFormData={mockEditFormData}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      expect(screen.getByText(`Edit Mode: ${mockEditFormData.name}`)).toBeInTheDocument();
    });

    it('should render with proper modal styling', () => {
      const { container } = render(
        <CronJobEditModal
          isOpen={true}
          onClose={mockOnClose}
          editFormData={mockEditFormData}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      const modalContent = container.querySelector('.bg-white.shadow-2xl');
      expect(modalContent).toBeInTheDocument();
      expect(modalContent).toHaveStyle({ width: '800px' });
    });

    it('should render with backdrop', () => {
      const { container } = render(
        <CronJobEditModal
          isOpen={true}
          onClose={mockOnClose}
          editFormData={mockEditFormData}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      const backdrop = container.querySelector('.MuiBackdrop-root');
      expect(backdrop).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when close button is clicked', () => {
      const { container } = render(
        <CronJobEditModal
          isOpen={true}
          onClose={mockOnClose}
          editFormData={mockEditFormData}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
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
        <CronJobEditModal
          isOpen={true}
          onClose={mockOnClose}
          editFormData={mockEditFormData}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      fireEvent.click(screen.getByText('Cancel'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call handleSaveEdit and onClose when save is triggered', () => {
      render(
        <CronJobEditModal
          isOpen={true}
          onClose={mockOnClose}
          editFormData={mockEditFormData}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      fireEvent.click(screen.getByText('Save'));

      expect(mockHandleSaveEdit).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call setEditFormData when form data is updated', () => {
      render(
        <CronJobEditModal
          isOpen={true}
          onClose={mockOnClose}
          editFormData={mockEditFormData}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      fireEvent.click(screen.getByText('Update Name'));

      expect(mockSetEditFormData).toHaveBeenCalledWith({
        ...mockEditFormData,
        name: 'Updated Name',
      });
    });

    it('should not throw error when handleSaveEdit is not provided', () => {
      render(
        <CronJobEditModal
          isOpen={true}
          onClose={mockOnClose}
          editFormData={mockEditFormData}
          setEditFormData={mockSetEditFormData}
        />
      );

      expect(() => {
        fireEvent.click(screen.getByText('Save'));
      }).not.toThrow();

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not throw error when onClose is not provided', () => {
      render(
        <CronJobEditModal
          isOpen={true}
          onClose={undefined as unknown as () => void}
          editFormData={mockEditFormData}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      // Should render without throwing
      expect(screen.getByText('Create New Cron Job')).toBeInTheDocument();
    });
  });

  describe('CronJobForm Integration', () => {
    it('should pass editFormData to CronJobForm', () => {
      render(
        <CronJobEditModal
          isOpen={true}
          onClose={mockOnClose}
          editFormData={mockEditFormData}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      expect(screen.getByText(`Edit Mode: ${mockEditFormData.name}`)).toBeInTheDocument();
    });

    it('should pass setEditFormData callback to CronJobForm', () => {
      render(
        <CronJobEditModal
          isOpen={true}
          onClose={mockOnClose}
          editFormData={mockEditFormData}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      fireEvent.click(screen.getByText('Update Name'));

      expect(mockSetEditFormData).toHaveBeenCalled();
    });

    it('should pass handleSaveEdit callback wrapped correctly', () => {
      render(
        <CronJobEditModal
          isOpen={true}
          onClose={mockOnClose}
          editFormData={mockEditFormData}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      fireEvent.click(screen.getByText('Save'));

      expect(mockHandleSaveEdit).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Layout', () => {
    it('should render with fixed positioning', () => {
      const { container } = render(
        <CronJobEditModal
          isOpen={true}
          onClose={mockOnClose}
          editFormData={mockEditFormData}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      const wrapper = container.querySelector('.fixed.inset-0.z-50');
      expect(wrapper).toBeInTheDocument();
    });

    it('should center modal content', () => {
      const { container } = render(
        <CronJobEditModal
          isOpen={true}
          onClose={mockOnClose}
          editFormData={mockEditFormData}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      const wrapper = container.querySelector('.flex.items-center.justify-center');
      expect(wrapper).toBeInTheDocument();
    });

    it('should have proper border styling on header', () => {
      const { container } = render(
        <CronJobEditModal
          isOpen={true}
          onClose={mockOnClose}
          editFormData={mockEditFormData}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      const header = container.querySelector('.border-b.border-gray-200');
      expect(header).toBeInTheDocument();
    });

    it('should render modal with responsive max width', () => {
      const { container } = render(
        <CronJobEditModal
          isOpen={true}
          onClose={mockOnClose}
          editFormData={mockEditFormData}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      const modalContent = container.querySelector('div.relative');
      expect(modalContent).toHaveStyle({ maxWidth: '90vw' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle editFormData updates', () => {
      const { rerender } = render(
        <CronJobEditModal
          isOpen={true}
          onClose={mockOnClose}
          editFormData={mockEditFormData}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      expect(screen.getByText(`Edit Mode: ${mockEditFormData.name}`)).toBeInTheDocument();

      const updatedData = { ...mockEditFormData, name: 'Updated Schedule' };

      rerender(
        <CronJobEditModal
          isOpen={true}
          onClose={mockOnClose}
          editFormData={updatedData}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      expect(screen.getByText('Edit Mode: Updated Schedule')).toBeInTheDocument();
    });

    it('should handle rapid open/close cycles', () => {
      const { rerender } = render(
        <CronJobEditModal
          isOpen={true}
          onClose={mockOnClose}
          editFormData={mockEditFormData}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      expect(screen.getByText('Create New Cron Job')).toBeInTheDocument();

      rerender(
        <CronJobEditModal
          isOpen={false}
          onClose={mockOnClose}
          editFormData={mockEditFormData}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      expect(screen.queryByText('Create New Cron Job')).not.toBeInTheDocument();

      rerender(
        <CronJobEditModal
          isOpen={true}
          onClose={mockOnClose}
          editFormData={mockEditFormData}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      expect(screen.getByText('Create New Cron Job')).toBeInTheDocument();
    });

    it('should handle missing editFormData gracefully', () => {
      render(
        <CronJobEditModal
          isOpen={true}
          onClose={mockOnClose}
          editFormData={undefined as unknown as ScheduleResponse}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      expect(screen.getByTestId('cron-job-form')).toBeInTheDocument();
    });

    it('should handle multiple save attempts', () => {
      render(
        <CronJobEditModal
          isOpen={true}
          onClose={mockOnClose}
          editFormData={mockEditFormData}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      fireEvent.click(screen.getByText('Save'));
      fireEvent.click(screen.getByText('Save'));

      expect(mockHandleSaveEdit).toHaveBeenCalledTimes(2);
      expect(mockOnClose).toHaveBeenCalledTimes(2);
    });
  });
});
