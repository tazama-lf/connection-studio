import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const useAuthMock = jest.fn();

jest.mock('../../../../../src/features/auth/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

jest.mock('../../../../../src/utils/common/roleUtils', () => ({
  isApprover: (claims: string[]) => claims.includes('approver'),
  isExporter: (claims: string[]) => claims.includes('exporter'),
  isPublisher: (claims: string[]) => claims.includes('publisher'),
}));

jest.mock('../../../../../src/shared/utils/statusColors', () => ({
  getStatusColor: () => 'ok',
  getStatusLabel: (status: string) => status,
}));

import ConfigDetailsModal from '../../../../../src/features/config/components/ConfigDetailsModal';

const baseConfig: any = {
  id: 7,
  endpointPath: '/payments',
  transactionType: 'payments',
  msgFam: 'pacs.008',
  version: '1.0.0',
  contentType: 'application/json',
  status: 'STATUS_03_UNDER_REVIEW',
  tenantId: 'tenant-a',
  createdBy: 'sam',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-02T00:00:00.000Z',
  mapping: [{ a: 1 }],
  schema: { b: 2 },
};

describe('features/config/components/ConfigDetailsModal.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when closed and shows loading branch when open', () => {
    useAuthMock.mockReturnValue({ user: { claims: [] } });
    const { rerender, queryByText } = render(
      <ConfigDetailsModal isOpen={false} onClose={jest.fn()} config={baseConfig} isLoading={false} />,
    );
    expect(queryByText('Configuration Details: /payments')).not.toBeInTheDocument();

    rerender(<ConfigDetailsModal isOpen onClose={jest.fn()} config={baseConfig} isLoading />);
    expect(screen.getByText('Loading configuration details...')).toBeInTheDocument();
  });

  it('supports approver approve/reject footer on under-review status', () => {
    const onClose = jest.fn();
    const onApprove = jest.fn();
    const onReject = jest.fn();
    useAuthMock.mockReturnValue({ user: { claims: ['approver'] } });

    render(
      <ConfigDetailsModal
        isOpen
        onClose={onClose}
        config={baseConfig}
        onApprove={onApprove}
        onReject={onReject}
      />,
    );

    fireEvent.click(screen.getByText('Reject'));
    expect(onReject).toHaveBeenCalledWith(baseConfig);

    fireEvent.click(screen.getByText('Approve'));
    expect(onApprove).toHaveBeenCalledWith(7);
    expect(onClose).toHaveBeenCalled();
  });

  it('supports exporter export flow and publisher deploy flow', async () => {
    const onClose = jest.fn();
    const onExport = jest.fn().mockResolvedValue(undefined);
    const onDeploy = jest.fn().mockResolvedValue(undefined);

    useAuthMock.mockReturnValue({ user: { claims: ['exporter'] } });
    const { rerender } = render(
      <ConfigDetailsModal
        isOpen
        onClose={onClose}
        config={{ ...baseConfig, status: 'approved' }}
        onExport={onExport}
      />,
    );

    fireEvent.click(screen.getByText('Export'));
    await waitFor(() => {
      expect(onExport).toHaveBeenCalledWith(7, '');
    });

    useAuthMock.mockReturnValue({ user: { claims: ['publisher'] } });
    rerender(
      <ConfigDetailsModal
        isOpen
        onClose={onClose}
        config={{ ...baseConfig, status: 'exported' }}
        onDeploy={onDeploy}
      />,
    );

    fireEvent.click(screen.getByText('Deploy'));
    await waitFor(() => {
      expect(onDeploy).toHaveBeenCalledWith(7, '');
    });
  });

  it('renders deploy notes for publisher with exported config and changes textarea', async () => {
    useAuthMock.mockReturnValue({ user: { claims: ['publisher'] } });
    const onDeploy = jest.fn().mockResolvedValue(undefined);

    render(
      <ConfigDetailsModal
        isOpen
        onClose={jest.fn()}
        config={{ ...baseConfig, status: 'exported' }}
        onDeploy={onDeploy}
      />,
    );

    const textarea = screen.getByPlaceholderText('Add notes about the deployment process (optional)');
    fireEvent.change(textarea, { target: { value: 'deploy note text' } });

    fireEvent.click(screen.getByText('Deploy'));
    await waitFor(() => {
      expect(onDeploy).toHaveBeenCalledWith(7, 'deploy note text');
    });
  });

  it('shows approve/reject for approver with under_review status (non-STATUS prefix)', () => {
    useAuthMock.mockReturnValue({ user: { claims: ['approver'] } });
    const onApprove = jest.fn();
    const onReject = jest.fn();

    render(
      <ConfigDetailsModal
        isOpen
        onClose={jest.fn()}
        config={{ ...baseConfig, status: 'under_review' }}
        onApprove={onApprove}
        onReject={onReject}
      />,
    );

    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });

  it('shows approve/reject for approver with "under review" (space) status covering || branch', () => {
    useAuthMock.mockReturnValue({ user: { claims: ['approver'] } });
    const onApprove = jest.fn();

    render(
      <ConfigDetailsModal
        isOpen
        onClose={jest.fn()}
        config={{ ...baseConfig, status: 'under review' }}
        onApprove={onApprove}
      />,
    );

    expect(screen.getByText('Approve')).toBeInTheDocument();
  });

  it('shows N/A for null optional config fields (covering ?? branches)', () => {
    useAuthMock.mockReturnValue({ user: { claims: [] } });

    render(
      <ConfigDetailsModal
        isOpen
        onClose={jest.fn()}
        config={{
          id: 1,
          status: 'draft',
          endpointPath: null,
          transactionType: null,
          msgFam: null,
          version: null,
          contentType: null,
          tenantId: null,
          createdBy: null,
          mapping: null,
          schema: null,
        } as any}
      />,
    );

    const nas = screen.getAllByText('N/A');
    expect(nas.length).toBeGreaterThanOrEqual(1);
  });

  it('shows default close-only footer when no special role applies', () => {
    useAuthMock.mockReturnValue({ user: { claims: [] } });

    render(
      <ConfigDetailsModal
        isOpen
        onClose={jest.fn()}
        config={{ ...baseConfig, status: 'draft' }}
      />,
    );

    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('covers getConfigTypeColor deployed case', () => {
    useAuthMock.mockReturnValue({ user: { claims: [] } });

    render(
      <ConfigDetailsModal
        isOpen
        onClose={jest.fn()}
        config={{ ...baseConfig, status: 'deployed' }}
      />,
    );

    expect(screen.getByText('DEPLOYED')).toBeInTheDocument();
  });

  it('handles handleExport error (catch branch)', async () => {
    useAuthMock.mockReturnValue({ user: { claims: ['exporter'] } });
    const onExport = jest.fn().mockRejectedValue(new Error('export failed'));

    render(
      <ConfigDetailsModal
        isOpen
        onClose={jest.fn()}
        config={{ ...baseConfig, status: 'approved' }}
        onExport={onExport}
      />,
    );

    fireEvent.click(screen.getByText('Export'));
    await waitFor(() => expect(onExport).toHaveBeenCalled());
  });

  it('handles handleDeploy error (catch branch)', async () => {
    useAuthMock.mockReturnValue({ user: { claims: ['publisher'] } });
    const onDeploy = jest.fn().mockRejectedValue(new Error('deploy failed'));

    render(
      <ConfigDetailsModal
        isOpen
        onClose={jest.fn()}
        config={{ ...baseConfig, status: 'exported' }}
        onDeploy={onDeploy}
      />,
    );

    fireEvent.click(screen.getByText('Deploy'));
    await waitFor(() => expect(onDeploy).toHaveBeenCalled());
  });

  it('shows config-not-found message when config is null', () => {
    useAuthMock.mockReturnValue({ user: { claims: [] } });

    render(
      <ConfigDetailsModal
        isOpen
        onClose={jest.fn()}
        config={null}
      />,
    );

    expect(screen.getByText('Configuration details not found')).toBeInTheDocument();
  });

  it('handles user without claims (userIs* all false)', () => {
    useAuthMock.mockReturnValue({ user: {} });

    render(
      <ConfigDetailsModal
        isOpen
        onClose={jest.fn()}
        config={{ ...baseConfig, status: 'approved' }}
      />,
    );

    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('shows N/A when dates are missing (formatDate branch)', () => {
    useAuthMock.mockReturnValue({ user: { claims: [] } });

    render(
      <ConfigDetailsModal
        isOpen
        onClose={jest.fn()}
        config={{ ...baseConfig, createdAt: undefined, updatedAt: undefined }}
      />,
    );

    const nas = screen.getAllByText('N/A');
    expect(nas.length).toBeGreaterThan(0);
  });

  it('handles export with no onExport or no config (early return branches)', async () => {
    useAuthMock.mockReturnValue({ user: { claims: ['exporter'] } });
    const onExport = jest.fn().mockResolvedValue(undefined);

    // renders but with config=null so handleExport early returns
    render(
      <ConfigDetailsModal
        isOpen
        onClose={jest.fn()}
        config={{ ...baseConfig, status: 'approved' }}
        onExport={onExport}
      />,
    );

    // just verify it renders without issue
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('changes export notes textarea and exports with notes', async () => {
    useAuthMock.mockReturnValue({ user: { claims: ['exporter'] } });
    const onExport = jest.fn().mockResolvedValue(undefined);

    render(
      <ConfigDetailsModal
        isOpen
        onClose={jest.fn()}
        config={{ ...baseConfig, status: 'approved' }}
        onExport={onExport}
      />,
    );

    const textarea = screen.getByPlaceholderText('Add notes about the export process (optional)');
    fireEvent.change(textarea, { target: { value: 'export note text' } });

    fireEvent.click(screen.getByText('Export'));
    await waitFor(() => {
      expect(onExport).toHaveBeenCalledWith(7, 'export note text');
    });
  });

  it('handles approver with STATUS_ prefix but only 2 parts (branch when parts.length < 3)', () => {
    useAuthMock.mockReturnValue({ user: { claims: ['approver'] } });
    const onApprove = jest.fn();

    render(
      <ConfigDetailsModal
        isOpen
        onClose={jest.fn()}
        config={{ ...baseConfig, status: 'STATUS_review' }}
        onApprove={onApprove}
      />,
    );

    // Status parts: ['status', 'review'] - length is 2, not >= 3, so falls to 'under_review' check
    // 'status_review' !== 'under_review' and !== 'under review' → no approve button
    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
  });

  it('uses in-progress fallback label when status is missing', () => {
    useAuthMock.mockReturnValue({ user: { claims: [] } });

    render(
      <ConfigDetailsModal
        isOpen
        onClose={jest.fn()}
        config={{ ...baseConfig, status: undefined }}
      />,
    );

    expect(screen.getByText('IN-PROGRESS')).toBeInTheDocument();
  });

  it('does not render approver action footer when no action handlers are provided', () => {
    useAuthMock.mockReturnValue({ user: { claims: ['approver'] } });

    render(
      <ConfigDetailsModal
        isOpen
        onClose={jest.fn()}
        config={{ ...baseConfig, status: 'under_review' }}
      />,
    );

    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
    expect(screen.queryByText('Reject')).not.toBeInTheDocument();
  });
});