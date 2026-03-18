import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApproverConfigDetailsModal } from '@/features/approver/components/ApproverConfigDetailsModal';

jest.mock('lucide-react', () => ({
  X: () => <svg data-testid="icon-x" />,
  CheckCircle: () => <svg data-testid="icon-check" />,
  XCircle: () => <svg data-testid="icon-xcircle" />,
}));

describe('features/approver/components/ApproverConfigDetailsModal.tsx', () => {
  const baseConfig = {
    id: 42,
    msgFam: 'pacs.008',
    transactionType: 'payment',
    endpointPath: '/api/payments',
    version: '1.0',
    contentType: 'application/json',
    schema: { type: 'object' },
    mapping: [{ source: 'amount', destination: 'transaction.amount' }],
    status: 'STATUS_03_UNDER_REVIEW',
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
  } as any;

  it('does not render when closed or config is missing', () => {
    const { rerender } = render(
      <ApproverConfigDetailsModal
        config={baseConfig}
        isOpen={false}
        onClose={jest.fn()}
        onApprove={jest.fn()}
        onReject={jest.fn()}
      />, 
    );

    expect(screen.queryByText(/approval required/i)).not.toBeInTheDocument();

    rerender(
      <ApproverConfigDetailsModal
        config={null}
        isOpen={true}
        onClose={jest.fn()}
        onApprove={jest.fn()}
        onReject={jest.fn()}
      />, 
    );

    expect(screen.queryByText(/approval required/i)).not.toBeInTheDocument();
  });

  it('renders details and closes on Close action', () => {
    const onClose = jest.fn();
    render(
      <ApproverConfigDetailsModal
        config={baseConfig}
        isOpen={true}
        onClose={onClose}
        onApprove={jest.fn()}
        onReject={jest.fn()}
      />, 
    );

    expect(screen.getByText(/configuration details/i)).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('/api/payments')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('approves with config id and closes modal', async () => {
    const onApprove = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();

    render(
      <ApproverConfigDetailsModal
        config={baseConfig}
        isOpen={true}
        onClose={onClose}
        onApprove={onApprove}
        onReject={jest.fn()}
      />, 
    );

    fireEvent.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => {
      expect(onApprove).toHaveBeenCalledWith(42);
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('rejects with config object and closes modal', async () => {
    const onReject = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();

    render(
      <ApproverConfigDetailsModal
        config={baseConfig}
        isOpen={true}
        onClose={onClose}
        onApprove={jest.fn()}
        onReject={onReject}
      />, 
    );

    fireEvent.click(screen.getByRole('button', { name: /reject/i }));

    await waitFor(() => {
      expect(onReject).toHaveBeenCalledWith(expect.objectContaining({ id: 42 }));
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('handles approve error silently', async () => {
    const onApprove = jest.fn().mockRejectedValue(new Error('Approve failed'));
    const onClose = jest.fn();

    render(
      <ApproverConfigDetailsModal
        config={baseConfig}
        isOpen={true}
        onClose={onClose}
        onApprove={onApprove}
        onReject={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => {
      expect(onApprove).toHaveBeenCalledWith(42);
    });
    // error is caught silently, modal stays open
    expect(onClose).not.toHaveBeenCalled();
  });

  it('handles reject error silently', async () => {
    const onReject = jest.fn().mockRejectedValue(new Error('Reject failed'));
    const onClose = jest.fn();

    render(
      <ApproverConfigDetailsModal
        config={baseConfig}
        isOpen={true}
        onClose={onClose}
        onApprove={jest.fn()}
        onReject={onReject}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /reject/i }));

    await waitFor(() => {
      expect(onReject).toHaveBeenCalled();
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders with undefined optional config fields showing N/A fallbacks', () => {
    const minimalConfig = {
      id: 1,
      status: undefined,
      transactionType: undefined,
      msgFam: undefined,
      version: undefined,
      endpointPath: undefined,
      contentType: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      mapping: undefined,
      schema: undefined,
    } as any;

    render(
      <ApproverConfigDetailsModal
        config={minimalConfig}
        isOpen={true}
        onClose={jest.fn()}
        onApprove={jest.fn()}
        onReject={jest.fn()}
      />,
    );

    expect(screen.getByText(/configuration details/i)).toBeInTheDocument();
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
  });

  it('does not render mapping or schema sections when both are absent', () => {
    const configWithoutMappingSchema = {
      ...baseConfig,
      mapping: null,
      schema: null,
    } as any;

    render(
      <ApproverConfigDetailsModal
        config={configWithoutMappingSchema}
        isOpen={true}
        onClose={jest.fn()}
        onApprove={jest.fn()}
        onReject={jest.fn()}
      />,
    );

    expect(screen.getByText(/configuration details/i)).toBeInTheDocument();
    expect(screen.queryByText(/field mappings/i)).not.toBeInTheDocument();
  });

  it('clicks backdrop to close modal', () => {
    const onClose = jest.fn();
    const { container } = render(
      <ApproverConfigDetailsModal
        config={baseConfig}
        isOpen={true}
        onClose={onClose}
        onApprove={jest.fn()}
        onReject={jest.fn()}
      />,
    );

    const backdrop = container.querySelector('.fixed.inset-0.bg-black') as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });
});

