import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ExporterJobList from '../../../../src/features/exporter/components/ExporterJobList';

jest.mock('../../../../src/shared/utils/statusColors', () => ({
  getStatusColor: () => 'bg-green-100 text-green-700',
  getStatusLabel: (status: string) => status,
}));

describe('features/exporter/components/ExporterJobList.tsx', () => {
  const jobs = [
    {
      id: 'job-11',
      endpoint_name: 'endpoint-a',
      type: 'PULL',
      table_name: 'table_a',
      status: 'approved',
      description: 'desc',
      created_at: '2024-01-01T00:00:00.000Z',
    },
  ] as any;

  it('shows loading state', () => {
    render(<ExporterJobList jobs={jobs} isLoading={true} />);
    expect(screen.getByText('Loading jobs...')).toBeInTheDocument();
  });

  it('shows empty state for unmatched search and supports refresh', () => {
    const onRefresh = jest.fn();
    render(
      <ExporterJobList
        jobs={jobs}
        searchQuery="unknown"
        onRefresh={onRefresh}
      />,
    );

    expect(screen.getByText('No jobs match your search')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Refresh'));
    expect(onRefresh).toHaveBeenCalled();
  });

  it('opens actions menu and invokes onViewDetails', () => {
    const onViewDetails = jest.fn();
    const { container } = render(
      <ExporterJobList jobs={jobs} onViewDetails={onViewDetails} />,
    );

    const actionButton = container.querySelector(
      '.actions-dropdown button',
    ) as HTMLButtonElement;
    fireEvent.click(actionButton);

    fireEvent.click(screen.getByText('View'));
    expect(onViewDetails).toHaveBeenCalledWith('job-11');
  });

  it('shows empty state without search query (lines 73-76 false branches)', () => {
    render(<ExporterJobList jobs={[]} />);
    expect(screen.getByText('No approved jobs yet')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Approved data enrichment jobs will appear here when they are ready for export',
      ),
    ).toBeInTheDocument();
  });

  it('renders multiple jobs covering forceDirection and PUSH type branches', () => {
    const multipleJobs = [
      {
        id: 'j1',
        endpoint_name: 'a',
        type: 'PUSH',
        table_name: null,
        status: null,
        created_at: null,
      },
      {
        id: 'j2',
        endpoint_name: 'b',
        type: undefined,
        table_name: 'tbl',
        status: 'approved',
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'j3',
        endpoint_name: 'c',
        type: 'PULL',
        table_name: 'tbl2',
        status: 'approved',
        created_at: '2024-01-01T00:00:00Z',
      },
    ] as any;

    const { container } = render(<ExporterJobList jobs={multipleJobs} />);
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(container.querySelector('.bg-purple-100')).toBeInTheDocument();
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
  });

  it('closes dropdown when clicking outside (handleClickOutside lines 37,39,43)', () => {
    const { container } = render(<ExporterJobList jobs={jobs} />);

    // Open the dropdown
    const actionButton = container.querySelector(
      '.actions-dropdown button',
    ) as HTMLButtonElement;
    fireEvent.click(actionButton);
    expect(screen.getByText('View')).toBeInTheDocument();

    // Click outside any .actions-dropdown element - closes the dropdown
    fireEvent.click(document.body);
    expect(screen.queryByText('View')).not.toBeInTheDocument();
  });

  it('stays open when clicking inside actions-dropdown (handleClickOutside line 40)', () => {
    const { container } = render(<ExporterJobList jobs={jobs} />);

    // Open the dropdown
    const actionButton = container.querySelector(
      '.actions-dropdown button',
    ) as HTMLButtonElement;
    fireEvent.click(actionButton);
    expect(screen.getByText('View')).toBeInTheDocument();

    // Click inside .actions-dropdown - stays open (early return)
    const dropdown = container.querySelector(
      '.actions-dropdown',
    ) as HTMLElement;
    fireEvent.click(dropdown);
    expect(screen.getByText('View')).toBeInTheDocument();
  });

  it('toggles dropdown closed when clicking button again (line 171 branch)', () => {
    const { container } = render(<ExporterJobList jobs={jobs} />);

    const actionButton = container.querySelector(
      '.actions-dropdown button',
    ) as HTMLButtonElement;
    // Open dropdown
    fireEvent.click(actionButton);
    expect(screen.getByText('View')).toBeInTheDocument();
    // Close by clicking again (dropdownOpen === job.id ? null : ...)
    fireEvent.click(actionButton);
    expect(screen.queryByText('View')).not.toBeInTheDocument();
  });
});
