import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

const dropdownPropsHistory: any[] = [];

jest.mock('lucide-react', () => ({
  Eye: () => <span data-testid="eye-icon" />,
  MoreVertical: () => <span data-testid="more-icon" />,
  Package: () => <span data-testid="package-icon" />,
}));

jest.mock('../../../../src/shared/utils/statusColors', () => ({
  getStatusColor: (status: string) => `status-${status}`,
  getStatusLabel: (status: string) => `label-${status}`,
}));

jest.mock('../../../../src/shared/components/DropdownMenuWithAutoDirection', () => ({
  DropdownMenuWithAutoDirection: (props: any) => {
    dropdownPropsHistory.push(props);
    return <div data-testid="dropdown-menu">{props.children}</div>;
  },
}));

import ExportedDEJobList from '../../../../src/features/publisher/components/ExportedDEJobList';

const jobs = [
  {
    id: 'job-1-aaaaaaaa',
    endpoint_name: 'Payments Endpoint',
    table_name: 'payments',
    type: 'push',
    status: 'exported',
    created_at: '2024-01-01T00:00:00.000Z',
    path: '/v1/payments',
    source_type: undefined,
  },
  {
    id: 'job-2-bbbbbbbb',
    endpoint_name: 'Alerts Endpoint',
    table_name: 'alerts',
    type: 'PULL',
    status: 'failed',
    created_at: undefined,
    path: '',
    source_type: 'sftp',
  },
  {
    id: 'job-3-cccccccc',
    endpoint_name: undefined,
    table_name: undefined,
    status: undefined,
    created_at: '2024-01-03T00:00:00.000Z',
    path: '/fallback/push',
    source_type: undefined,
  },
  {
    id: 'job-4-dddddddd',
    endpoint_name: 'No Path Job',
    table_name: 'none',
    status: 'ok',
    created_at: undefined,
    path: '',
    source_type: 'http',
  },
] as any;

describe('features/publisher/components/ExportedDEJobList.tsx', () => {
  beforeEach(() => {
    dropdownPropsHistory.length = 0;
  });

  it('renders loading state', () => {
    render(<ExportedDEJobList jobs={[]} isLoading />);
    expect(screen.getByText('Loading exported DE jobs...')).toBeInTheDocument();
  });

  it('renders empty states with and without search query', () => {
    const { rerender } = render(<ExportedDEJobList jobs={[]} />);
    expect(screen.getByText('There are no DE jobs ready for deployment.')).toBeInTheDocument();

    rerender(<ExportedDEJobList jobs={[]} searchQuery="abc" />);
    expect(screen.getByText('No DE jobs match your search criteria.')).toBeInTheDocument();
  });

  it('renders rows, filters search, opens dropdown, and calls view action', () => {
    const onViewDetails = jest.fn();

    const { rerender } = render(
      <ExportedDEJobList jobs={jobs} onViewDetails={onViewDetails} searchQuery="payments" />
    );

    expect(screen.getByText('Payments Endpoint')).toBeInTheDocument();
    expect(screen.queryByText('Alerts Endpoint')).not.toBeInTheDocument();

    rerender(<ExportedDEJobList jobs={jobs} onViewDetails={onViewDetails} />);

    expect(screen.getAllByText('PUSH').length).toBeGreaterThan(0);
    expect(screen.getAllByText('PULL').length).toBeGreaterThan(0);
    expect(screen.getByText('Unnamed Endpoint')).toBeInTheDocument();
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByTitle('Actions')[0]);
    expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
    expect(dropdownPropsHistory.at(-1)?.forceDirection).toBe('bottom');

    fireEvent.click(screen.getAllByTitle('Actions')[0]);
    expect(screen.queryByTestId('dropdown-menu')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByTitle('Actions')[0]);
    expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();

    fireEvent.click(screen.getByText('View'));
    expect(onViewDetails).toHaveBeenCalledWith('job-1-aaaaaaaa');

    fireEvent.click(screen.getAllByTitle('Actions')[1]);
    expect(dropdownPropsHistory.at(-1)?.forceDirection).toBe('auto');

    fireEvent.click(screen.getAllByTitle('Actions')[3]);
    expect(dropdownPropsHistory.at(-1)?.forceDirection).toBe('top');

    expect(screen.getByText('No Path Job')).toBeInTheDocument();
    expect(screen.getAllByText('PULL').length).toBeGreaterThan(0);
  });

  it('invokes dropdown onClose callback', () => {
    render(<ExportedDEJobList jobs={jobs} onViewDetails={jest.fn()} />);

    fireEvent.click(screen.getAllByTitle('Actions')[0]);
    expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();

    act(() => {
      dropdownPropsHistory.at(-1)?.onClose();
    });

    expect(screen.queryByTestId('dropdown-menu')).not.toBeInTheDocument();
  });
});