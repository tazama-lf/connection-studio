import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ExportedItemDetailsModal from '../../../../src/features/exporter/components/ExportedItemDetailsModal';
import { dataEnrichmentJobApi } from '../../../../src/features/data-enrichment/handlers';

jest.mock('@mui/material', () => ({
  Backdrop: ({ open, sx, children }: any) => {
    if (typeof sx === 'function') {
      sx({ zIndex: { drawer: 10 } });
    }
    if (sx && typeof sx.zIndex === 'function') {
      sx.zIndex({ zIndex: { drawer: 10 } });
    }
    return open ? <div data-testid="backdrop">{children}</div> : null;
  },
  Box: ({ children }: any) => <div>{children}</div>,
  Dialog: ({ open, onClose, children }: any) =>
    open ? (
      <div>
        <button onClick={onClose}>Dialog Close Hook</button>
        {children}
      </div>
    ) : null,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogActions: ({ children }: any) => <div>{children}</div>,
  DialogContentText: ({ children }: any) => <div>{children}</div>,
  CircularProgress: () => <div>LoadingSpinner</div>,
}));

jest.mock('../../../../src/features/data-enrichment/handlers', () => ({
  dataEnrichmentJobApi: {
    getById: jest.fn(),
  },
}));

describe('features/exporter/components/ExportedItemDetailsModal.tsx', () => {
  const baseContent = {
    id: 'job-1',
    tenant_id: 'tenant-1',
    type: 'PUSH',
    name: 'push-job',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render when closed', () => {
    render(
      <ExportedItemDetailsModal
        content={baseContent}
        isOpen={false}
        onClose={jest.fn()}
        onPublish={jest.fn()}
        format="de"
      />,
    );

    expect(screen.queryByText('Data Enrichment Job Details')).not.toBeInTheDocument();
  });

  it('renders loading state when isLoading is true', () => {
    render(
      <ExportedItemDetailsModal
        content={baseContent}
        isOpen={true}
        onClose={jest.fn()}
        onPublish={jest.fn()}
        format="de"
        isLoading={true}
      />,
    );

    expect(screen.getByText('Loading details...')).toBeInTheDocument();
  });

  it('deploys item and calls publish, close and refresh', async () => {
    const onClose = jest.fn();
    const onRefresh = jest.fn();
    const onPublish = jest.fn().mockResolvedValue(undefined);

    render(
      <ExportedItemDetailsModal
        content={baseContent}
        isOpen={true}
        onClose={onClose}
        onPublish={onPublish}
        format="de"
        onRefresh={onRefresh}
      />,
    );

    fireEvent.click(screen.getByText('Deploy'));
    fireEvent.click(screen.getByText('Yes, Deploy'));

    await waitFor(() => {
      expect(onPublish).toHaveBeenCalledWith('job-1', 'de', 'PUSH');
      expect(onClose).toHaveBeenCalled();
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it('falls back to source_type and infers PULL for de jobs', async () => {
    const onPublish = jest.fn().mockResolvedValue(undefined);

    render(
      <ExportedItemDetailsModal
        content={{
          id: 'job-pull-1',
          tenant_id: 'tenant-1',
          name: 'job-with-source',
          source_type: 'sftp',
        } as any}
        isOpen={true}
        onClose={jest.fn()}
        onPublish={onPublish}
        format="de"
      />,
    );

    fireEvent.click(screen.getByText('Deploy'));
    fireEvent.click(screen.getByText('Yes, Deploy'));

    await waitFor(() => {
      expect(onPublish).toHaveBeenCalledWith('job-pull-1', 'de', 'PULL');
    });
  });

  it('infers push from path when type metadata is missing', async () => {
    const onPublish = jest.fn().mockResolvedValue(undefined);

    render(
      <ExportedItemDetailsModal
        content={{
          id: 'job-push-path',
          tenant_id: 'tenant-1',
          path: '/de/push/path',
          name: 'path-push',
        } as any}
        isOpen={true}
        onClose={jest.fn()}
        onPublish={onPublish}
        format="de"
      />,
    );

    fireEvent.click(screen.getByText('Deploy'));
    fireEvent.click(screen.getByText('Yes, Deploy'));

    await waitFor(() => {
      expect(onPublish).toHaveBeenCalledWith('job-push-path', 'de', 'PUSH');
    });
  });

  it('infers job type from config_type when type is missing', async () => {
    const onPublish = jest.fn().mockResolvedValue(undefined);

    render(
      <ExportedItemDetailsModal
        content={{
          id: 'job-push-2',
          tenant_id: 'tenant-1',
          config_type: 'push',
          name: 'job-config-type',
        } as any}
        isOpen={true}
        onClose={jest.fn()}
        onPublish={onPublish}
        format="de"
      />,
    );

    fireEvent.click(screen.getByText('Deploy'));
    fireEvent.click(screen.getByText('Yes, Deploy'));

    await waitFor(() => {
      expect(onPublish).toHaveBeenCalledWith('job-push-2', 'de', 'PUSH');
    });
  });

  it('infers job type from name when metadata is missing', async () => {
    const onPublish = jest.fn().mockResolvedValue(undefined);

    render(
      <ExportedItemDetailsModal
        content={{
          id: 'job-name-pull',
          tenant_id: 'tenant-1',
          name: 'nightly-pull-job',
        } as any}
        isOpen={true}
        onClose={jest.fn()}
        onPublish={onPublish}
        format="de"
      />,
    );

    fireEvent.click(screen.getByText('Deploy'));
    fireEvent.click(screen.getByText('Yes, Deploy'));

    await waitFor(() => {
      expect(onPublish).toHaveBeenCalledWith('job-name-pull', 'de', 'PULL');
    });
  });

  it('infers push job type from name when metadata is missing', async () => {
    const onPublish = jest.fn().mockResolvedValue(undefined);

    render(
      <ExportedItemDetailsModal
        content={{
          id: 'job-name-push',
          tenant_id: 'tenant-1',
          name: 'nightly-push-job',
        } as any}
        isOpen={true}
        onClose={jest.fn()}
        onPublish={onPublish}
        format="de"
      />,
    );

    fireEvent.click(screen.getByText('Deploy'));
    fireEvent.click(screen.getByText('Yes, Deploy'));

    await waitFor(() => {
      expect(onPublish).toHaveBeenCalledWith('job-name-push', 'de', 'PUSH');
    });
  });

  it('falls back to API lookup for missing type', async () => {
    (dataEnrichmentJobApi.getById as jest.Mock).mockResolvedValue({ type: 'PULL' });
    const onPublish = jest.fn().mockResolvedValue(undefined);

    render(
      <ExportedItemDetailsModal
        content={{
          id: 'job-2',
          tenant_id: 'tenant-1',
          name: 'job-without-type',
        } as any}
        isOpen={true}
        onClose={jest.fn()}
        onPublish={onPublish}
        format="de"
      />,
    );

    fireEvent.click(screen.getByText('Deploy'));
    fireEvent.click(screen.getByText('Yes, Deploy'));

    await waitFor(() => {
      expect(dataEnrichmentJobApi.getById).toHaveBeenCalledWith('job-2', 'PULL');
      expect(onPublish).toHaveBeenCalledWith('job-2', 'de', 'PULL');
    });
  });

  it('falls back to PUSH API lookup when PULL lookup fails', async () => {
    (dataEnrichmentJobApi.getById as jest.Mock)
      .mockRejectedValueOnce(new Error('not pull'))
      .mockResolvedValueOnce({ type: 'PUSH' });

    const onPublish = jest.fn().mockResolvedValue(undefined);

    render(
      <ExportedItemDetailsModal
        content={{
          id: 'job-3',
          tenant_id: 'tenant-1',
          name: 'job-without-type',
        } as any}
        isOpen={true}
        onClose={jest.fn()}
        onPublish={onPublish}
        format="de"
      />,
    );

    fireEvent.click(screen.getByText('Deploy'));
    fireEvent.click(screen.getByText('Yes, Deploy'));

    await waitFor(() => {
      expect(dataEnrichmentJobApi.getById).toHaveBeenCalledWith('job-3', 'PULL');
      expect(dataEnrichmentJobApi.getById).toHaveBeenCalledWith('job-3', 'PUSH');
      expect(onPublish).toHaveBeenCalledWith('job-3', 'de', 'PUSH');
    });
  });

  it('handles unresolved de job type without calling publish', async () => {
    (dataEnrichmentJobApi.getById as jest.Mock)
      .mockRejectedValueOnce(new Error('not pull'))
      .mockRejectedValueOnce(new Error('not push'));

    const onPublish = jest.fn().mockResolvedValue(undefined);

    render(
      <ExportedItemDetailsModal
        content={{
          id: 'job-4',
          tenant_id: 'tenant-1',
          name: 'unknown-job',
        } as any}
        isOpen={true}
        onClose={jest.fn()}
        onPublish={onPublish}
        format="de"
      />,
    );

    fireEvent.click(screen.getByText('Deploy'));
    fireEvent.click(screen.getByText('Yes, Deploy'));

    await waitFor(() => {
      expect(onPublish).not.toHaveBeenCalled();
    });
  });

  it('publishes cron format without de job type resolution', async () => {
    const onPublish = jest.fn().mockResolvedValue(undefined);

    render(
      <ExportedItemDetailsModal
        content={{
          id: 'cron-1',
          tenant_id: 'tenant-1',
          name: 'cron-job',
          cron: '0 0 * * *',
          iterations: 3,
          end_date: '2024-02-01T00:00:00.000Z',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        } as any}
        isOpen={true}
        onClose={jest.fn()}
        onPublish={onPublish}
        format="cron"
      />,
    );

    expect(screen.getByText('Cron Expression')).toBeInTheDocument();
    expect(screen.getByText('Retry Count')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Deploy'));
    fireEvent.click(screen.getByText('Yes, Deploy'));

    await waitFor(() => {
      expect(onPublish).toHaveBeenCalledWith('cron-1', 'cron', undefined);
    });
  });

  it('renders dems-specific fields and handles non-function refresh safely', async () => {
    const onPublish = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();

    render(
      <ExportedItemDetailsModal
        content={{
          id: 'dems-1',
          tenant_id: 'tenant-1',
          endpointPath: '/path/a',
          transactionType: 'credit',
          version: '1.0.0',
          contentType: 'application/json',
          start_date: '2024-01-01T00:00:00.000Z',
          created_at: undefined,
          updated_at: undefined,
        } as any}
        isOpen={true}
        onClose={onClose}
        onPublish={onPublish}
        format="dems"
        onRefresh={'not-a-function' as any}
      />,
    );

    expect(screen.getByText('Endpoint Path')).toBeInTheDocument();
    expect(screen.getByText('Transaction Type')).toBeInTheDocument();
    expect(screen.getByText('Content Type')).toBeInTheDocument();
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText('Deploy'));
    fireEvent.click(screen.getByText('Yes, Deploy'));

    await waitFor(() => {
      expect(onPublish).toHaveBeenCalledWith('dems-1', 'dems', undefined);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('does not render when content is null', () => {
    render(
      <ExportedItemDetailsModal
        content={null}
        isOpen={true}
        onClose={jest.fn()}
        onPublish={jest.fn()}
        format="de"
      />,
    );

    expect(screen.queryByText('Data Enrichment Job Details')).not.toBeInTheDocument();
  });

  it('renders msgFam and endpoint_name fields when present', () => {
    render(
      <ExportedItemDetailsModal
        content={{
          ...baseContent,
          msgFam: 'pacs008',
          endpoint_name: 'my-endpoint',
        } as any}
        isOpen={true}
        onClose={jest.fn()}
        onPublish={jest.fn()}
        format="de"
      />,
    );

    expect(screen.getByText('Event Type')).toBeInTheDocument();
    expect(screen.getByText('pacs008')).toBeInTheDocument();
    expect(screen.getByText('Endpoint Name')).toBeInTheDocument();
    expect(screen.getByText('my-endpoint')).toBeInTheDocument();
  });

  it('renders N/A for missing tenant_id', () => {
    render(
      <ExportedItemDetailsModal
        content={{
          id: 'job-no-tenant',
          name: 'some-job',
          type: 'PUSH',
        } as any}
        isOpen={true}
        onClose={jest.fn()}
        onPublish={jest.fn()}
        format="de"
      />,
    );

    expect(screen.getByText('Tenant ID')).toBeInTheDocument();
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
  });

  it('shows Unknown job type when no type, path, source_type, or connection', () => {
    render(
      <ExportedItemDetailsModal
        content={{
          id: 'job-unknown',
          tenant_id: 'tenant-1',
          name: 'no-type-job',
        } as any}
        isOpen={true}
        onClose={jest.fn()}
        onPublish={jest.fn()}
        format="de"
      />,
    );

    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('renders dems fields as N/A when optional fields absent', () => {
    render(
      <ExportedItemDetailsModal
        content={{
          id: 'dems-2',
          tenant_id: 'tenant-1',
        } as any}
        isOpen={true}
        onClose={jest.fn()}
        onPublish={jest.fn()}
        format="dems"
      />,
    );

    expect(screen.getByText('Endpoint Path')).toBeInTheDocument();
    expect(screen.getByText('Transaction Type')).toBeInTheDocument();
    expect(screen.getByText('Version')).toBeInTheDocument();
    expect(screen.getByText('Content Type')).toBeInTheDocument();
    const naItems = screen.getAllByText('N/A');
    expect(naItems.length).toBeGreaterThanOrEqual(4);
  });

  it('renders dialog with this item fallback when content has no id', () => {
    render(
      <ExportedItemDetailsModal
        content={{
          tenant_id: 'tenant-1',
          type: 'PUSH',
          name: 'nameless-job',
        } as any}
        isOpen={true}
        onClose={jest.fn()}
        onPublish={jest.fn()}
        format="de"
      />,
    );

    fireEvent.click(screen.getByText('Deploy'));
    expect(screen.getByText('this item')).toBeInTheDocument();
  });

  it('infers PULL from config_type that is neither PUSH nor PULL falls through to name', async () => {
    const onPublish = jest.fn().mockResolvedValue(undefined);

    render(
      <ExportedItemDetailsModal
        content={{
          id: 'job-cron-type',
          tenant_id: 'tenant-1',
          config_type: 'CRON',
          name: 'my-pull-job',
        } as any}
        isOpen={true}
        onClose={jest.fn()}
        onPublish={onPublish}
        format="de"
      />,
    );

    fireEvent.click(screen.getByText('Deploy'));
    fireEvent.click(screen.getByText('Yes, Deploy'));

    await waitFor(() => {
      expect(onPublish).toHaveBeenCalledWith('job-cron-type', 'de', 'PULL');
    });
  });

  it('closes confirmation dialog via dialog onClose hook and Cancel action', async () => {
    render(
      <ExportedItemDetailsModal
        content={baseContent}
        isOpen={true}
        onClose={jest.fn()}
        onPublish={jest.fn().mockResolvedValue(undefined)}
        format="de"
      />,
    );

    fireEvent.click(screen.getByText('Deploy'));
    expect(screen.getByText('Deployment Confirmation Required!')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Dialog Close Hook'));
    await waitFor(() => {
      expect(screen.queryByText('Deployment Confirmation Required!')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Deploy'));
    const cancelButtons = screen.getAllByText('Cancel');
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);

    await waitFor(() => {
      expect(screen.queryByText('Deployment Confirmation Required!')).not.toBeInTheDocument();
    });
  });
});

  it('uses foundType fallback when jobDetails has no type property (BRDA:118)', async () => {
    // Simulate: PULL lookup succeeds but returns jobDetails without a type field
    (dataEnrichmentJobApi.getById as jest.Mock).mockResolvedValueOnce({ id: 'job-x' });

    const onPublish = jest.fn().mockResolvedValue(undefined);

    render(
      <ExportedItemDetailsModal
        content={{
          id: 'job-x',
          tenant_id: 'tenant-1',
        } as any}
        isOpen={true}
        onClose={jest.fn()}
        onPublish={onPublish}
        format="de"
      />,
    );

    fireEvent.click(screen.getByText('Deploy'));
    fireEvent.click(screen.getByText('Yes, Deploy'));

    // jobDetails.type is undefined, so (jobDetails.type?.toUpperCase() || foundType) => foundType = 'PULL'
    await waitFor(() => {
      expect(onPublish).toHaveBeenCalledWith('job-x', 'de', 'PULL');
    });
  });
})
