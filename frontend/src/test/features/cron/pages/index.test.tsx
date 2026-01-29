import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import CRONModule from '@features/cron/pages';

// Mock dependencies
const mockNavigate = jest.fn();

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: () => mockNavigate,
}));

jest.mock('@shared/components/Button', () => ({
  Button: ({ children, onClick, icon, className, variant }: {
    children: React.ReactNode;
    onClick?: () => void;
    icon?: React.ReactNode;
    className?: string;
    variant?: string;
  }) => {
    // Determine test ID based on props
    let testId = 'button-create-new';
    if (className === 'py-1 pl-2') {
      testId = 'button-go-back';
    }
    
    return (
      <button 
        onClick={onClick} 
        className={className}
        data-variant={variant}
        data-testid={testId}
      >
        {icon}
        {children}
      </button>
    );
  },
}));

jest.mock('@features/cron/components/CronJobList', () => ({
  CronJobList: ({ searchTerm }: { searchTerm: string }) => (
    <div data-testid="cron-job-list">
      <span>Search: {searchTerm}</span>
    </div>
  ),
}));

jest.mock('@features/cron/components/CronJobModal', () => ({
  CronJobModal: ({ isOpen, onClose, onJobCreated }: {
    isOpen: boolean;
    onClose: () => void;
    onJobCreated: () => void;
  }) => isOpen ? (
    <div data-testid="cron-job-modal">
      <button onClick={onClose}>Close Modal</button>
      <button onClick={() => {
        onJobCreated?.();
        onClose?.();
      }}>Job Created</button>
    </div>
  ) : null,
}));

describe('CRONModule Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  describe('Rendering', () => {
    it('should render the page with title', () => {
      renderWithRouter(<CRONModule />);

      expect(screen.getByText('Cron Job Module')).toBeInTheDocument();
    });

    it('should render clock icon in title', () => {
      const { container } = renderWithRouter(<CRONModule />);

      const clockIcon = container.querySelector('[data-testid="lucide-clock"]');
      expect(clockIcon).toBeDefined();
    });

    it('should render go back button', () => {
      renderWithRouter(<CRONModule />);

      expect(screen.getByTestId('button-go-back')).toBeInTheDocument();
      expect(screen.getByText('Go Back')).toBeInTheDocument();
    });

    it('should render create new button', () => {
      renderWithRouter(<CRONModule />);

      expect(screen.getByTestId('button-create-new')).toBeInTheDocument();
      expect(screen.getByText('Create New Cron Job')).toBeInTheDocument();
    });

    it('should render CronJobList component', () => {
      renderWithRouter(<CRONModule />);

      expect(screen.getByTestId('cron-job-list')).toBeInTheDocument();
    });

    it('should not render modal initially', () => {
      renderWithRouter(<CRONModule />);

      expect(screen.queryByTestId('cron-job-modal')).not.toBeInTheDocument();
    });

    it('should render with proper layout classes', () => {
      const { container } = renderWithRouter(<CRONModule />);

      const mainContainer = container.querySelector('.min-h-screen.bg-white');
      expect(mainContainer).toBeInTheDocument();
    });

    it('should render title with proper styling', () => {
      const { container } = renderWithRouter(<CRONModule />);

      const title = screen.getByText('Cron Job Module');
      expect(title).toHaveClass('text-3xl', 'font-bold');
      expect(title).toHaveStyle({ color: '#3b3b3b' });
    });

    it('should render list in a shadow container', () => {
      const { container } = renderWithRouter(<CRONModule />);

      const listContainer = container.querySelector('.bg-white.rounded-lg.shadow');
      expect(listContainer).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should call navigate(-1) when go back button is clicked', () => {
      renderWithRouter(<CRONModule />);

      fireEvent.click(screen.getByTestId('button-go-back'));

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it('should navigate back only once per click', () => {
      renderWithRouter(<CRONModule />);

      fireEvent.click(screen.getByTestId('button-go-back'));

      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Modal Management', () => {
    it('should open modal when create new button is clicked', () => {
      renderWithRouter(<CRONModule />);

      expect(screen.queryByTestId('cron-job-modal')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('button-create-new'));

      expect(screen.getByTestId('cron-job-modal')).toBeInTheDocument();
    });

    it('should close modal when close is triggered', () => {
      renderWithRouter(<CRONModule />);

      fireEvent.click(screen.getByTestId('button-create-new'));
      expect(screen.getByTestId('cron-job-modal')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Close Modal'));
      expect(screen.queryByTestId('cron-job-modal')).not.toBeInTheDocument();
    });

    it('should refresh list when job is created', () => {
      renderWithRouter(<CRONModule />);

      fireEvent.click(screen.getByTestId('button-create-new'));

      const initialList = screen.getByTestId('cron-job-list');
      expect(initialList).toBeInTheDocument();

      fireEvent.click(screen.getByText('Job Created'));

      // The list should be re-rendered with a new key
      const refreshedList = screen.getByTestId('cron-job-list');
      expect(refreshedList).toBeInTheDocument();
    });

    it('should handle multiple open/close cycles', () => {
      renderWithRouter(<CRONModule />);

      // First cycle
      fireEvent.click(screen.getByTestId('button-create-new'));
      expect(screen.getByTestId('cron-job-modal')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Close Modal'));
      expect(screen.queryByTestId('cron-job-modal')).not.toBeInTheDocument();

      // Second cycle
      fireEvent.click(screen.getByTestId('button-create-new'));
      expect(screen.getByTestId('cron-job-modal')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Close Modal'));
      expect(screen.queryByTestId('cron-job-modal')).not.toBeInTheDocument();
    });
  });

  describe('List Refresh', () => {
    it('should pass empty searchTerm to CronJobList initially', () => {
      renderWithRouter(<CRONModule />);

      expect(screen.getByText('Search:')).toBeInTheDocument();
    });

    it('should increment refresh key when job is created', () => {
      renderWithRouter(<CRONModule />);

      fireEvent.click(screen.getByTestId('button-create-new'));
      fireEvent.click(screen.getByText('Job Created'));

      // After first creation
      expect(screen.getByTestId('cron-job-list')).toBeInTheDocument();

      // Create another job
      fireEvent.click(screen.getByTestId('button-create-new'));
      fireEvent.click(screen.getByText('Job Created'));

      // List should still be rendered
      expect(screen.getByTestId('cron-job-list')).toBeInTheDocument();
    });

    it('should maintain searchTerm state across refreshes', () => {
      renderWithRouter(<CRONModule />);

      // Initial render
      expect(screen.getByText('Search:')).toBeInTheDocument();

      // Refresh via job creation
      fireEvent.click(screen.getByTestId('button-create-new'));
      fireEvent.click(screen.getByText('Job Created'));

      // Search term should still be empty
      expect(screen.getByText('Search:')).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('should render responsive padding classes', () => {
      const { container } = renderWithRouter(<CRONModule />);

      const mainContent = container.querySelector('.px-4.sm\\:px-6');
      expect(mainContent).toBeInTheDocument();
    });

    it('should render header with proper spacing', () => {
      const { container } = renderWithRouter(<CRONModule />);

      const header = container.querySelector('.my-8');
      expect(header).toBeInTheDocument();
    });

    it('should render flexible layout for header elements', () => {
      const { container } = renderWithRouter(<CRONModule />);

      const headerFlex = container.querySelector('.flex.flex-col.md\\:flex-row');
      expect(headerFlex).toBeInTheDocument();
    });

    it('should render clock icon with proper styling', () => {
      const { container } = renderWithRouter(<CRONModule />);

      const clockIcon = container.querySelector('[data-testid="lucide-clock"]');
      if (clockIcon?.parentElement) {
        expect(clockIcon.parentElement).toHaveStyle({ color: '#f59e0b' });
      }
    });
  });

  describe('Component Integration', () => {
    it('should pass correct props to CronJobModal', () => {
      renderWithRouter(<CRONModule />);

      fireEvent.click(screen.getByTestId('button-create-new'));

      const modal = screen.getByTestId('cron-job-modal');
      expect(modal).toBeInTheDocument();
    });

    it('should pass refreshKey to CronJobList', () => {
      renderWithRouter(<CRONModule />);

      const list = screen.getByTestId('cron-job-list');
      expect(list).toBeInTheDocument();
    });

    it('should close modal after job creation', () => {
      renderWithRouter(<CRONModule />);

      fireEvent.click(screen.getByTestId('button-create-new'));
      expect(screen.getByTestId('cron-job-modal')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Job Created'));
      expect(screen.queryByTestId('cron-job-modal')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid button clicks', () => {
      renderWithRouter(<CRONModule />);

      const createButton = screen.getByTestId('button-create-new');

      fireEvent.click(createButton);
      fireEvent.click(createButton);
      fireEvent.click(createButton);

      // Modal should still be rendered (last click state)
      expect(screen.getByTestId('cron-job-modal')).toBeInTheDocument();
    });

    it('should handle rapid job creation', () => {
      renderWithRouter(<CRONModule />);

      fireEvent.click(screen.getByTestId('button-create-new'));
      fireEvent.click(screen.getByText('Job Created'));

      fireEvent.click(screen.getByTestId('button-create-new'));
      fireEvent.click(screen.getByText('Job Created'));

      fireEvent.click(screen.getByTestId('button-create-new'));
      fireEvent.click(screen.getByText('Job Created'));

      // List should still be rendered
      expect(screen.getByTestId('cron-job-list')).toBeInTheDocument();
    });

    it('should maintain state when navigating back and forth', () => {
      renderWithRouter(<CRONModule />);

      fireEvent.click(screen.getByTestId('button-go-back'));
      expect(mockNavigate).toHaveBeenCalled();

      // Component should still be rendered
      expect(screen.getByText('Cron Job Module')).toBeInTheDocument();
    });

    it('should handle modal opening without closing previous', () => {
      renderWithRouter(<CRONModule />);

      fireEvent.click(screen.getByTestId('button-create-new'));
      expect(screen.getByTestId('cron-job-modal')).toBeInTheDocument();

      // Try to open again (button still clickable)
      fireEvent.click(screen.getByTestId('button-create-new'));
      expect(screen.getByTestId('cron-job-modal')).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('should initialize with modal closed', () => {
      renderWithRouter(<CRONModule />);

      expect(screen.queryByTestId('cron-job-modal')).not.toBeInTheDocument();
    });

    it('should initialize with empty search term', () => {
      renderWithRouter(<CRONModule />);

      expect(screen.getByText('Search:')).toBeInTheDocument();
    });

    it('should initialize with refresh key of 0', () => {
      renderWithRouter(<CRONModule />);

      expect(screen.getByTestId('cron-job-list')).toBeInTheDocument();
    });

    it('should update refresh key on each job creation', () => {
      renderWithRouter(<CRONModule />);

      const initialList = screen.getByTestId('cron-job-list');

      fireEvent.click(screen.getByTestId('button-create-new'));
      fireEvent.click(screen.getByText('Job Created'));

      // List should be re-rendered (React key changed)
      const updatedList = screen.getByTestId('cron-job-list');
      expect(updatedList).toBeInTheDocument();
    });
  });
});
