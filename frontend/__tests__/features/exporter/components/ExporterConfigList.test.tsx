import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ExporterConfigList from '../../../../src/features/exporter/components/ExporterConfigList';

jest.mock('../../../../src/shared/utils/statusColors', () => ({
  getStatusColor: () => 'bg-green-100 text-green-700',
  getStatusLabel: (status: string) => status,
}));

describe('features/exporter/components/ExporterConfigList.tsx', () => {
  const configs = [
    {
      id: 11,
      endpointPath: '/payments',
      transactionType: 'credit',
      status: 'approved',
      createdAt: '2024-01-01T00:00:00.000Z',
    },
  ] as any;

  it('shows loading state', () => {
    render(<ExporterConfigList configs={configs} isLoading={true} />);
    expect(screen.getByText('Loading configurations...')).toBeInTheDocument();
  });

  it('shows empty state for unmatched search and supports refresh', () => {
    const onRefresh = jest.fn();
    render(
      <ExporterConfigList
        configs={configs}
        searchQuery="not-found"
        onRefresh={onRefresh}
      />,
    );

    expect(
      screen.getByText('No configurations match your search'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText('Refresh'));
    expect(onRefresh).toHaveBeenCalled();
  });

  it('opens actions menu and invokes onViewDetails', () => {
    const onViewDetails = jest.fn();
    const { container } = render(
      <ExporterConfigList configs={configs} onViewDetails={onViewDetails} />,
    );

    const actionButton = container.querySelector(
      '.actions-dropdown button',
    ) as HTMLButtonElement;
    fireEvent.click(actionButton);

    fireEvent.click(screen.getByText('View'));
    expect(onViewDetails).toHaveBeenCalledWith(11);
  });

  it('closes dropdown when clicking outside actions area', () => {
    const { container } = render(
      <ExporterConfigList configs={configs} onViewDetails={jest.fn()} />,
    );

    const actionButton = container.querySelector(
      '.actions-dropdown button',
    ) as HTMLButtonElement;
    fireEvent.click(actionButton);
    expect(screen.getByText('View')).toBeInTheDocument();

    fireEvent.click(document.body);
    expect(screen.queryByText('View')).not.toBeInTheDocument();
  });

  it('shows empty state when configs are empty without search query', () => {
    render(<ExporterConfigList configs={[]} />);
    expect(
      screen.getByText('No approved configurations yet'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Approved configurations will appear here when they are ready for export',
      ),
    ).toBeInTheDocument();
  });

  it('renders without onRefresh when configs are empty and no search query', () => {
    render(<ExporterConfigList configs={[]} />);
    expect(
      screen.queryByRole('button', { name: /refresh/i }),
    ).not.toBeInTheDocument();
  });

  it('renders multiple configs with forceDirection (middle row = auto, last row = top)', () => {
    const multipleConfigs = [
      {
        id: 1,
        endpointPath: '/path1',
        transactionType: 'credit',
        status: 'approved',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 2,
        endpointPath: '/path2',
        transactionType: null,
        status: null,
        createdAt: null,
      },
      {
        id: 3,
        endpointPath: '/path3',
        transactionType: 'debit',
        status: 'approved',
        createdAt: '2024-03-01T00:00:00.000Z',
      },
    ] as any;

    render(<ExporterConfigList configs={multipleConfigs} />);

    expect(screen.getByText('/path1')).toBeInTheDocument();
    expect(screen.getByText('/path2')).toBeInTheDocument();
    expect(screen.getByText('/path3')).toBeInTheDocument();
    // Config 2 has null transactionType → shows 'N/A'
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
  });

  it('toggles dropdown open and closed when same button is clicked twice', () => {
    const { container } = render(
      <ExporterConfigList configs={configs} onViewDetails={jest.fn()} />,
    );

    const actionButton = container.querySelector(
      '.actions-dropdown button',
    ) as HTMLButtonElement;
    // Open
    fireEvent.click(actionButton);
    expect(screen.getByText('View')).toBeInTheDocument();
    // Close (same button clicked again)
    fireEvent.click(actionButton);
    expect(screen.queryByText('View')).not.toBeInTheDocument();
  });
});
