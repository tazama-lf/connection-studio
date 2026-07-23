import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import PublisherDEJobDetailsModal from '../../../../src/features/publisher/components/PublisherDEJobDetailsModal';
import {
  getStatusColor,
  getStatusLabel,
} from '../../../../src/shared/utils/statusColors';

jest.mock('../../../../src/shared/utils/statusColors', () => ({
  getStatusColor: jest.fn(() => 'status-badge'),
  getStatusLabel: jest.fn((status: string) => status),
}));

describe('features/publisher/components/PublisherDEJobDetailsModal.tsx', () => {
  const baseJob = {
    id: 'job-1',
    endpoint_name: 'endpoint-a',
    table_name: 'table_a',
    status: 'exported',
    created_at: '2024-01-01T00:00:00.000Z',
  } as any;

  it('does not render when closed', () => {
    render(
      <PublisherDEJobDetailsModal
        isOpen={false}
        onClose={jest.fn()}
        job={baseJob}
      />,
    );
    expect(
      screen.queryByText('Data Enrichment Job Details'),
    ).not.toBeInTheDocument();
  });

  it('does not render when job is null', () => {
    render(
      <PublisherDEJobDetailsModal
        isOpen={true}
        onClose={jest.fn()}
        job={null}
      />,
    );
    expect(
      screen.queryByText('Data Enrichment Job Details'),
    ).not.toBeInTheDocument();
  });

  it('renders details and closes modal', () => {
    const onClose = jest.fn();
    render(
      <PublisherDEJobDetailsModal
        isOpen={true}
        onClose={onClose}
        job={baseJob}
      />,
    );

    expect(screen.getByText('Data Enrichment Job Details')).toBeInTheDocument();
    expect(screen.getByText('endpoint-a')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders push details when job type is explicitly push', () => {
    render(
      <PublisherDEJobDetailsModal
        isOpen={true}
        onClose={jest.fn()}
        job={
          {
            ...baseJob,
            type: 'PUSH',
            path: '/custom/push/path',
            status: 'deployed',
          } as any
        }
      />,
    );

    expect(screen.getByText('/custom/push/path')).toBeInTheDocument();
    expect(screen.getByText('PUSH')).toBeInTheDocument();
  });

  it('renders pull details when job type is explicitly pull', () => {
    render(
      <PublisherDEJobDetailsModal
        isOpen={true}
        onClose={jest.fn()}
        job={
          {
            ...baseJob,
            type: 'PULL',
            source_type: 'sftp',
          } as any
        }
      />,
    );

    expect(screen.getByText('/tenant-endpoi/table_a')).toBeInTheDocument();
    expect(screen.getByText('PULL')).toBeInTheDocument();
  });

  it('uses explicit push fallback endpoint path when path is missing', () => {
    render(
      <PublisherDEJobDetailsModal
        isOpen={true}
        onClose={jest.fn()}
        job={
          {
            ...baseJob,
            type: 'PUSH',
            path: '',
            source_type: undefined,
            endpoint_name: 'alpha-endpoint',
            table_name: undefined,
          } as any
        }
      />,
    );

    expect(screen.getByText('/tenant-alpha-/data')).toBeInTheDocument();
    expect(screen.getByText('PUSH')).toBeInTheDocument();
  });

  it('uses push fallback path when type is inferred from path and no source_type', () => {
    render(
      <PublisherDEJobDetailsModal
        isOpen={true}
        onClose={jest.fn()}
        job={
          {
            ...baseJob,
            type: undefined,
            path: '/tenant-path/inferred',
            source_type: undefined,
            table_name: undefined,
          } as any
        }
      />,
    );

    expect(screen.getByText('/tenant-path/inferred')).toBeInTheDocument();
    expect(screen.getByText('PUSH')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('uses pull fallback path when source_type exists or path is missing', () => {
    render(
      <PublisherDEJobDetailsModal
        isOpen={true}
        onClose={jest.fn()}
        job={
          {
            ...baseJob,
            endpoint_name: undefined,
            table_name: undefined,
            type: undefined,
            path: '',
            source_type: 'sftp',
            created_at: undefined,
            status: undefined,
          } as any
        }
      />,
    );

    expect(screen.getByText('/tenant-001/undefined')).toBeInTheDocument();
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
    expect(screen.getByText('PULL')).toBeInTheDocument();
    expect(getStatusColor).toHaveBeenCalledWith('exported');
    expect(getStatusLabel).toHaveBeenCalledWith('exported');
  });

  it('does not close when publishing is in progress', () => {
    const useStateSpy = jest.spyOn(React, 'useState');
    useStateSpy
      .mockImplementationOnce(() => [true, jest.fn()] as any)
      .mockImplementationOnce(() => [null, jest.fn()] as any)
      .mockImplementationOnce(() => [false, jest.fn()] as any);

    const onClose = jest.fn();
    const { container } = render(
      <PublisherDEJobDetailsModal
        isOpen={true}
        onClose={onClose}
        job={baseJob}
      />,
    );

    const backdrop = container.querySelector(
      '[class*="bg-black"]',
    ) as HTMLElement;
    fireEvent.click(backdrop);
    fireEvent.click(screen.getByText('Close'));

    expect(onClose).not.toHaveBeenCalled();
    useStateSpy.mockRestore();
  });

  it('renders publish success banner from state and closes from header button', () => {
    const useStateSpy = jest.spyOn(React, 'useState');
    useStateSpy
      .mockImplementationOnce(() => [false, jest.fn()] as any)
      .mockImplementationOnce(() => [null, jest.fn()] as any)
      .mockImplementationOnce(() => [true, jest.fn()] as any);

    const onClose = jest.fn();
    const { container } = render(
      <PublisherDEJobDetailsModal
        isOpen={true}
        onClose={onClose}
        job={baseJob}
      />,
    );

    expect(screen.getByText('Published Successfully')).toBeInTheDocument();

    const buttons = container.querySelectorAll('button');
    fireEvent.click(buttons[0]);
    expect(onClose).toHaveBeenCalled();
    useStateSpy.mockRestore();
  });

  it('renders publish error banner from state', () => {
    const useStateSpy = jest.spyOn(React, 'useState');
    useStateSpy
      .mockImplementationOnce(() => [false, jest.fn()] as any)
      .mockImplementationOnce(() => ['Network failed', jest.fn()] as any)
      .mockImplementationOnce(() => [false, jest.fn()] as any);

    render(
      <PublisherDEJobDetailsModal
        isOpen={true}
        onClose={jest.fn()}
        job={baseJob}
      />,
    );

    expect(screen.getByText('Publish Failed')).toBeInTheDocument();
    expect(screen.getByText('Network failed')).toBeInTheDocument();
    useStateSpy.mockRestore();
  });
});
