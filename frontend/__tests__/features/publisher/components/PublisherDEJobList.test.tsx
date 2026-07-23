import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import PublisherDEJobList from '../../../../src/features/publisher/components/PublisherDEJobList';

const statusColorMock = jest.fn((status: string) => `status-${status}`);
const statusLabelMock = jest.fn((status: string) => `label-${status}`);

jest.mock('../../../../src/shared/utils/statusColors', () => ({
  getStatusColor: (status: string) => statusColorMock(status),
  getStatusLabel: (status: string) => statusLabelMock(status),
}));

jest.mock(
  '../../../../src/shared/components/DropdownMenuWithAutoDirection',
  () => ({
    DropdownMenuWithAutoDirection: (props: any) => (
      <div data-testid={`dropdown-${props.forceDirection}`}>
        <button onClick={props.onClose}>close-dropdown</button>
        {props.children}
      </div>
    ),
  }),
);

describe('features/publisher/components/PublisherDEJobList.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const activeJob = {
    id: 'job-1',
    endpoint_name: 'endpoint-a',
    table_name: 'table_a',
    type: 'pull',
    status: 'exported',
    created_at: '2024-01-01T00:00:00.000Z',
    publishing_status: 'active',
  } as any;

  it('shows loading state', () => {
    render(<PublisherDEJobList jobs={[activeJob]} isLoading={true} />);
    expect(screen.getByText('Loading DE jobs...')).toBeInTheDocument();
  });

  it('shows empty state when there are no jobs', () => {
    render(<PublisherDEJobList jobs={[]} />);
    expect(screen.getByText('No Available DE Jobs')).toBeInTheDocument();
  });

  it('shows no-match state when search filters out all jobs', () => {
    render(
      <PublisherDEJobList jobs={[activeJob]} searchQuery="missing-value" />,
    );
    expect(
      screen.getByText('No DE jobs match your search'),
    ).toBeInTheDocument();
  });

  it('filters by endpoint, table name, and type', () => {
    const jobs = [
      {
        ...activeJob,
        id: 'endpoint-match',
        endpoint_name: 'alpha-endpoint',
        table_name: 'x_table',
        type: 'pull',
      },
      {
        ...activeJob,
        id: 'table-match',
        endpoint_name: 'beta',
        table_name: 'table-search',
        type: 'pull',
      },
      {
        ...activeJob,
        id: 'type-match',
        endpoint_name: 'gamma',
        table_name: 'misc',
        type: 'push',
      },
    ] as any;

    const { rerender } = render(
      <PublisherDEJobList jobs={jobs} searchQuery="alpha" />,
    );
    expect(screen.getByText('/tenant-alpha-/x_table')).toBeInTheDocument();

    rerender(<PublisherDEJobList jobs={jobs} searchQuery="table-search" />);
    expect(screen.getByText('/tenant-beta/table-search')).toBeInTheDocument();

    rerender(<PublisherDEJobList jobs={jobs} searchQuery="push" />);
    expect(screen.getByText('/tenant-gamma/misc')).toBeInTheDocument();
  });

  it('renders endpoint path fallbacks, table/date/status fallbacks, and type badge variants', () => {
    const fallbackPull = {
      id: 'job-fallback-pull',
      endpoint_name: undefined,
      table_name: '',
      type: undefined,
      config_type: undefined,
      status: undefined,
      created_at: undefined,
      publishing_status: 'in-active',
    };
    const pullWithNullTable = {
      id: 'job-pull-null-table',
      endpoint_name: 'pull-endpoint',
      table_name: undefined,
      type: 'pull',
      status: undefined,
      created_at: undefined,
      publishing_status: 'in-active',
    };
    const pushWithoutPath = {
      id: 'job-push-fallback',
      endpoint_name: 'push-endpoint',
      table_name: undefined,
      type: 'push',
      status: 'deployed',
      publishing_status: 'in-active',
    };
    const pushWithPath = {
      id: 'job-push-path',
      endpoint_name: 'push-real',
      table_name: 'tblx',
      type: 'push',
      path: '/custom/path',
      status: 'exported',
      created_at: '2024-02-02T00:00:00.000Z',
      publishing_status: 'in-active',
    };

    render(
      <PublisherDEJobList
        jobs={
          [
            fallbackPull,
            pullWithNullTable,
            pushWithoutPath,
            pushWithPath,
          ] as any
        }
      />,
    );

    expect(screen.getByText('/tenant-001/')).toBeInTheDocument();
    expect(
      screen.getByText('/tenant-pull-e/pull-endpoint'),
    ).toBeInTheDocument();
    expect(screen.getByText('/tenant-push-e/data')).toBeInTheDocument();
    expect(screen.getByText('/custom/path')).toBeInTheDocument();

    expect(screen.getAllByText('N/A').length).toBeGreaterThan(1);
    expect(screen.getByText('2/2/2024')).toBeInTheDocument();

    expect(statusColorMock).toHaveBeenCalledWith('in-progress');
    expect(statusLabelMock).toHaveBeenCalledWith('in-progress');

    const pushBadges = screen.getAllByText('PUSH');
    expect(pushBadges.length).toBeGreaterThan(0);
    const pullBadges = screen.getAllByText('PULL');
    expect(pullBadges.length).toBeGreaterThan(0);
  });

  it('opens actions, supports view callback, dropdown close paths, and status toggle variants', () => {
    const onViewDetails = jest.fn();
    const onToggleStatus = jest.fn();

    const jobs = [
      { ...activeJob, id: 'top-row', publishing_status: 'active' },
      {
        ...activeJob,
        id: 'middle-row',
        publishing_status: 'in-active',
        type: undefined,
        config_type: 'PUSH',
      },
      {
        ...activeJob,
        id: 'last-row',
        publishing_status: 'in-active',
        type: 'pull',
      },
    ] as any;

    render(
      <PublisherDEJobList
        jobs={jobs}
        onViewDetails={onViewDetails}
        onToggleStatus={onToggleStatus}
      />,
    );

    const actionButtons = screen.getAllByTitle('Actions');

    fireEvent.click(actionButtons[0]);
    expect(screen.getByTestId('dropdown-bottom')).toBeInTheDocument();

    fireEvent.click(screen.getByText('View'));
    expect(onViewDetails).toHaveBeenCalledWith('top-row');

    fireEvent.click(actionButtons[0]);
    fireEvent.click(screen.getByText('Deactivate'));
    expect(onToggleStatus).toHaveBeenCalledWith('top-row', 'in-active');

    fireEvent.click(actionButtons[1]);
    expect(screen.getByTestId('dropdown-auto')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Activate'));
    expect(onToggleStatus).toHaveBeenCalledWith('middle-row', 'active');

    fireEvent.click(actionButtons[2]);
    expect(screen.getByTestId('dropdown-top')).toBeInTheDocument();

    const insideElement = document.querySelector(
      '.actions-dropdown',
    ) as HTMLElement;
    fireEvent.click(insideElement);
    expect(screen.getByTestId('dropdown-top')).toBeInTheDocument();

    fireEvent.click(document.body);
    expect(screen.queryByTestId('dropdown-top')).not.toBeInTheDocument();

    fireEvent.click(actionButtons[2]);
    fireEvent.click(actionButtons[2]);
    expect(screen.queryByTestId('dropdown-top')).not.toBeInTheDocument();
  });

  it('renders view-only menu when toggle callback is not provided', () => {
    render(<PublisherDEJobList jobs={[activeJob]} onViewDetails={jest.fn()} />);

    fireEvent.click(screen.getByTitle('Actions'));
    expect(screen.getByText('View')).toBeInTheDocument();
    expect(screen.queryByText('Activate')).not.toBeInTheDocument();
    expect(screen.queryByText('Deactivate')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('close-dropdown'));
    expect(screen.queryByTestId('dropdown-bottom')).not.toBeInTheDocument();
  });
});
