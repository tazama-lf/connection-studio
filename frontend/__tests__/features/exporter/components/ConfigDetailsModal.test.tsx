import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ConfigDetailsModal from '../../../../src/features/exporter/components/ConfigDetailsModal';

describe('features/exporter/components/ConfigDetailsModal.tsx', () => {
  const config = {
    id: 7,
    status: 'approved',
    transactionType: 'credit',
    msgFam: 'pacs.008',
    version: 'v1.0.0',
    endpointPath: '/payments',
    contentType: 'application/json',
    mapping: [{ source: 'a', target: 'b' }],
    schema: { fields: ['a'] },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  } as any;

  it('does not render when closed', () => {
    render(
      <ConfigDetailsModal
        config={config}
        isOpen={false}
        onClose={jest.fn()}
        onExport={jest.fn()}
      />,
    );

    expect(screen.queryByText('Configuration Details')).not.toBeInTheDocument();
  });

  it('does not render when config is null', () => {
    render(
      <ConfigDetailsModal
        config={null}
        isOpen={true}
        onClose={jest.fn()}
        onExport={jest.fn()}
      />,
    );

    expect(screen.queryByText('Configuration Details')).not.toBeInTheDocument();
  });

  it('renders details and exports configuration', async () => {
    const onClose = jest.fn();
    const onExport = jest.fn().mockResolvedValue(undefined);

    render(
      <ConfigDetailsModal
        config={config}
        isOpen={true}
        onClose={onClose}
        onExport={onExport}
      />,
    );

    expect(screen.getByText('Configuration Details')).toBeInTheDocument();
    expect(screen.getByText('/payments')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Export'));

    await waitFor(() => {
      expect(onExport).toHaveBeenCalledWith(7);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('handles export failure and keeps modal open', async () => {
    const onClose = jest.fn();
    const onExport = jest.fn().mockRejectedValue(new Error('export failed'));

    render(
      <ConfigDetailsModal
        config={config}
        isOpen={true}
        onClose={onClose}
        onExport={onExport}
      />,
    );

    fireEvent.click(screen.getByText('Export'));

    await waitFor(() => {
      expect(onExport).toHaveBeenCalledWith(7);
      expect(onClose).not.toHaveBeenCalled();
    });

    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('renders fallback values and supports header/backdrop close actions', () => {
    const onClose = jest.fn();

    const sparseConfig = {
      ...config,
      status: undefined,
      transactionType: undefined,
      msgFam: undefined,
      version: undefined,
      endpointPath: undefined,
      contentType: undefined,
      mapping: [],
      schema: null,
      createdAt: undefined,
      updatedAt: undefined,
    } as any;

    const { container } = render(
      <ConfigDetailsModal
        config={sparseConfig}
        isOpen={true}
        onClose={onClose}
        onExport={jest.fn()}
      />,
    );

    expect(screen.queryByText('Field Mappings:')).not.toBeInTheDocument();
    expect(screen.queryByText('Schema:')).not.toBeInTheDocument();
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(4);

    const headerCloseButton = container.querySelector('button.text-gray-400') as HTMLButtonElement;
    fireEvent.click(headerCloseButton);
    const backdrop = container.querySelector('.fixed.inset-0.bg-black') as HTMLDivElement;
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});