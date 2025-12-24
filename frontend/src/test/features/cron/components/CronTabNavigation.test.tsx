import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CronTabNavigation } from '../../../../features/cron/components/CronTabNavigation';

describe('CronTabNavigation', () => {
  const mockSetActiveTab = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render both tabs', () => {
    render(
      <CronTabNavigation activeTab="create" setActiveTab={mockSetActiveTab} />
    );

    expect(screen.getByText('Create Job')).toBeInTheDocument();
    expect(screen.getByText('Manage Jobs')).toBeInTheDocument();
  });

  it('should highlight active tab', () => {
    const { container } = render(
      <CronTabNavigation activeTab="create" setActiveTab={mockSetActiveTab} />
    );

    const createButton = screen.getByText('Create Job').closest('button');
    const manageButton = screen.getByText('Manage Jobs').closest('button');

    expect(createButton).toHaveClass('border-blue-500');
    expect(createButton).toHaveClass('text-blue-600');
    expect(manageButton).toHaveClass('border-transparent');
    expect(manageButton).toHaveClass('text-gray-500');
  });

  it('should highlight manage tab when active', () => {
    render(
      <CronTabNavigation activeTab="manage" setActiveTab={mockSetActiveTab} />
    );

    const createButton = screen.getByText('Create Job').closest('button');
    const manageButton = screen.getByText('Manage Jobs').closest('button');

    expect(manageButton).toHaveClass('border-blue-500');
    expect(manageButton).toHaveClass('text-blue-600');
    expect(createButton).toHaveClass('border-transparent');
    expect(createButton).toHaveClass('text-gray-500');
  });

  it('should call setActiveTab when Create Job is clicked', () => {
    render(
      <CronTabNavigation activeTab="manage" setActiveTab={mockSetActiveTab} />
    );

    const createButton = screen.getByText('Create Job').closest('button');
    fireEvent.click(createButton!);

    expect(mockSetActiveTab).toHaveBeenCalledWith('create');
  });

  it('should call setActiveTab when Manage Jobs is clicked', () => {
    render(
      <CronTabNavigation activeTab="create" setActiveTab={mockSetActiveTab} />
    );

    const manageButton = screen.getByText('Manage Jobs').closest('button');
    fireEvent.click(manageButton!);

    expect(mockSetActiveTab).toHaveBeenCalledWith('manage');
  });

  it('should not call setActiveTab when clicking already active tab', () => {
    render(
      <CronTabNavigation activeTab="create" setActiveTab={mockSetActiveTab} />
    );

    const createButton = screen.getByText('Create Job').closest('button');
    fireEvent.click(createButton!);

    expect(mockSetActiveTab).toHaveBeenCalledWith('create');
  });

  it('should render icons for both tabs', () => {
    const { container } = render(
      <CronTabNavigation activeTab="create" setActiveTab={mockSetActiveTab} />
    );

    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThanOrEqual(2);
  });

  it('should apply hover styles on non-active tabs', () => {
    render(
      <CronTabNavigation activeTab="create" setActiveTab={mockSetActiveTab} />
    );

    const manageButton = screen.getByText('Manage Jobs').closest('button');

    expect(manageButton).toHaveClass('hover:text-gray-700');
    expect(manageButton).toHaveClass('hover:border-gray-300');
  });

  it('should maintain tab order', () => {
    render(
      <CronTabNavigation activeTab="create" setActiveTab={mockSetActiveTab} />
    );

    const buttons = screen.getAllByRole('button');
    
    expect(buttons[0]).toHaveTextContent('Create Job');
    expect(buttons[1]).toHaveTextContent('Manage Jobs');
  });

  it('should have proper ARIA attributes', () => {
    render(
      <CronTabNavigation activeTab="create" setActiveTab={mockSetActiveTab} />
    );

    const createButton = screen.getByText('Create Job').closest('button');
    const manageButton = screen.getByText('Manage Jobs').closest('button');

    expect(createButton).toBeInstanceOf(HTMLButtonElement);
    expect(manageButton).toBeInstanceOf(HTMLButtonElement);
  });
});
