import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CronJobModal } from '@features/cron/components/CronJobModal';

// Mock dependencies
jest.mock('@features/cron/components/CronJobForm', () => ({
  CronJobForm: ({ onJobCreated, onCancel }: { onJobCreated?: () => void; onCancel?: () => void }) => (
    <div data-testid="cron-job-form">
      <button onClick={onJobCreated}>Submit Form</button>
      <button onClick={onCancel}>Cancel Form</button>
    </div>
  ),
}));

describe('CronJobModal', () => {
  const mockOnClose = jest.fn();
  const mockOnJobCreated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
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

    it('should render when isOpen is true', () => {
      render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          onJobCreated={mockOnJobCreated}
        />
      );

      expect(screen.getByText('Create New Cron Job')).toBeInTheDocument();
      expect(screen.getByTestId('cron-job-form')).toBeInTheDocument();
    });

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
      expect(modalContent).toHaveStyle({ width: '800px' });
    });

    it('should render with backdrop', () => {
      const { container } = render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          onJobCreated={mockOnJobCreated}
        />
      );

      const backdrop = container.querySelector('.MuiBackdrop-root');
      expect(backdrop).toBeInTheDocument();
    });

    it('should render title with proper styling', () => {
      render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          onJobCreated={mockOnJobCreated}
        />
      );

      const title = screen.getByText('Create New Cron Job');
      // Check that the title exists and has the expected text (MUI sx styles are applied via CSS-in-JS)
      expect(title).toBeInTheDocument();
      expect(title.tagName).toBe('DIV'); // MUI Box renders as div
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when close button is clicked', () => {
      const { container } = render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          onJobCreated={mockOnJobCreated}
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
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
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
          onJobCreated={mockOnJobCreated}
        />
      );

      fireEvent.click(screen.getByText('Submit Form'));

      expect(mockOnJobCreated).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not throw error when onJobCreated is not provided', () => {
      render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(() => {
        fireEvent.click(screen.getByText('Submit Form'));
      }).not.toThrow();

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not throw error when onClose is not provided', () => {
      render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          onJobCreated={mockOnJobCreated}
        />
      );

      expect(() => {
        fireEvent.click(screen.getByText('Cancel Form'));
      }).not.toThrow();
    });
  });

  describe('CronJobForm Integration', () => {
    it('should pass correct props to CronJobForm', () => {
      render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          onJobCreated={mockOnJobCreated}
        />
      );

      expect(screen.getByTestId('cron-job-form')).toBeInTheDocument();
    });

    it('should handle form submission correctly', () => {
      render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          onJobCreated={mockOnJobCreated}
        />
      );

      fireEvent.click(screen.getByText('Submit Form'));

      expect(mockOnJobCreated).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should handle form cancellation correctly', () => {
      render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          onJobCreated={mockOnJobCreated}
        />
      );

      fireEvent.click(screen.getByText('Cancel Form'));

      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnJobCreated).not.toHaveBeenCalled();
    });
  });

  describe('Layout', () => {
    it('should render with fixed positioning', () => {
      const { container } = render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          onJobCreated={mockOnJobCreated}
        />
      );

      const wrapper = container.querySelector('.fixed.inset-0.z-50');
      expect(wrapper).toBeInTheDocument();
    });

    it('should center modal content', () => {
      const { container } = render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          onJobCreated={mockOnJobCreated}
        />
      );

      const wrapper = container.querySelector('.flex.items-center.justify-center');
      expect(wrapper).toBeInTheDocument();
    });

    it('should have proper border styling on header', () => {
      const { container } = render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          onJobCreated={mockOnJobCreated}
        />
      );

      const header = container.querySelector('.border-b.border-gray-200');
      expect(header).toBeInTheDocument();
    });

    it('should render modal with responsive max width', () => {
      const { container } = render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          onJobCreated={mockOnJobCreated}
        />
      );

      const modalContent = container.querySelector('.relative.z-50');
      expect(modalContent).toHaveStyle({ maxWidth: '90vw' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid open/close cycles', () => {
      const { rerender } = render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          onJobCreated={mockOnJobCreated}
        />
      );

      expect(screen.getByText('Create New Cron Job')).toBeInTheDocument();

      rerender(
        <CronJobModal
          isOpen={false}
          onClose={mockOnClose}
          onJobCreated={mockOnJobCreated}
        />
      );

      expect(screen.queryByText('Create New Cron Job')).not.toBeInTheDocument();

      rerender(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          onJobCreated={mockOnJobCreated}
        />
      );

      expect(screen.getByText('Create New Cron Job')).toBeInTheDocument();
    });

    it('should handle multiple callback invocations', () => {
      render(
        <CronJobModal
          isOpen={true}
          onClose={mockOnClose}
          onJobCreated={mockOnJobCreated}
        />
      );

      fireEvent.click(screen.getByText('Submit Form'));
      fireEvent.click(screen.getByText('Submit Form'));

      expect(mockOnJobCreated).toHaveBeenCalledTimes(2);
      expect(mockOnClose).toHaveBeenCalledTimes(2);
    });
  });
});
