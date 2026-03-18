import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { CronTabNavigation } from '@/features/config/services/index.tsx';

jest.mock('lucide-react', () => ({
  ClockIcon: ({ size }: { size?: number }) => <svg data-testid="clock-icon" data-size={size} />,
  ListIcon: ({ size }: { size?: number }) => <svg data-testid="list-icon" data-size={size} />,
}));

describe('features/config/services/index.tsx', () => {
  it('renders create and manage tab buttons', () => {
    render(<CronTabNavigation activeTab="create" setActiveTab={jest.fn()} />);

    expect(screen.getByRole('button', { name: /create job/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /manage jobs/i })).toBeInTheDocument();
    expect(screen.getByTestId('clock-icon')).toHaveAttribute('data-size', '18');
    expect(screen.getByTestId('list-icon')).toHaveAttribute('data-size', '18');
  });

  it('highlights active create tab and switches when manage is clicked', () => {
    const setActiveTab = jest.fn();
    render(<CronTabNavigation activeTab="create" setActiveTab={setActiveTab} />);

    const createButton = screen.getByRole('button', { name: /create job/i });
    const manageButton = screen.getByRole('button', { name: /manage jobs/i });

    expect(createButton.className).toContain('border-blue-500');
    expect(manageButton.className).toContain('border-transparent');

    fireEvent.click(manageButton);
    expect(setActiveTab).toHaveBeenCalledWith('manage');
  });

  it('highlights manage tab when active tab is manage', () => {
    render(<CronTabNavigation activeTab="manage" setActiveTab={jest.fn()} />);

    const createButton = screen.getByRole('button', { name: /create job/i });
    const manageButton = screen.getByRole('button', { name: /manage jobs/i });

    expect(manageButton.className).toContain('border-blue-500');
    expect(createButton.className).toContain('border-transparent');
  });
});
