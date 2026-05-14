import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfigReviewModal } from '../../../src/shared/components/ConfigReviewModal';
import { configApi } from '../../../src/features/config/services/configApi';

jest.mock('../../../src/features/config/services/configApi', () => ({
  configApi: {
    getConfig: jest.fn(),
  },
}));

describe('shared/components/ConfigReviewModal.tsx', () => {
  const config = { id: 9 } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).alert = jest.fn();
    (configApi.getConfig as jest.Mock).mockResolvedValue({
      success: true,
      config: {
        id: 9,
        endpointPath: '/review/path',
        transactionType: 'pull',
        version: '1',
        mapping: [{ source: 'a', destination: 'b' }],
      },
    });
  });

  it('renders loaded details and invokes approve/reject actions', async () => {
    const onApprove = jest.fn();
    const onReject = jest.fn();

    render(
      <ConfigReviewModal
        isOpen={true}
        onClose={jest.fn()}
        onApprove={onApprove}
        onReject={onReject}
        config={config}
      />,
    );

    expect(await screen.findByText('/review/path')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Run Validation Check'));
    expect(global.alert).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Approve'));
    expect(onApprove).toHaveBeenCalledWith(9);

    fireEvent.click(screen.getByText('Reject'));
    expect(onReject).toHaveBeenCalledWith(config);
  });

  it('shows fallback when config details fail to load', async () => {
    (configApi.getConfig as jest.Mock).mockResolvedValue({ success: false });

    render(
      <ConfigReviewModal
        isOpen={true}
        onClose={jest.fn()}
        onApprove={jest.fn()}
        onReject={jest.fn()}
        config={config}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load configuration details.'),
      ).toBeInTheDocument();
    });
  });

  it('renders functions with columns', async () => {
    (configApi.getConfig as jest.Mock).mockResolvedValue({
      success: true,
      config: {
        id: 9,
        endpointPath: '/fn-path',
        transactionType: 'pull',
        version: '2',
        msgFam: 'pain.001',
        contentType: 'application/xml',
        schema: { type: 'object' },
        mapping: [
          { source: ['a', 'b'], destination: ['x', 'y'], constantValue: 'cv1' },
          { transformation: 'MAP' },
        ],
        functions: [
          {
            functionName: 'fn1',
            columns: [{ param: 'col1' }, { param: 'col2' }],
          },
          { functionName: 'fn2', params: ['paramA', 'paramB'] },
          { functionName: 'fn3' },
        ],
      },
    });

    render(
      <ConfigReviewModal
        isOpen={true}
        onClose={jest.fn()}
        onApprove={jest.fn()}
        onReject={jest.fn()}
        config={config}
      />,
    );

    expect(await screen.findByText('fn1')).toBeInTheDocument();
    expect(screen.getByText('Columns: col1, col2')).toBeInTheDocument();
    expect(screen.getByText('fn2')).toBeInTheDocument();
    expect(screen.getByText('Parameters: paramA, paramB')).toBeInTheDocument();
    expect(screen.getByText('fn3')).toBeInTheDocument();
    expect(screen.getByText('Parameters: None')).toBeInTheDocument();
    expect(screen.getByText('Constant: cv1')).toBeInTheDocument();
  });

  it('renders with null config (returns null)', () => {
    const { container } = render(
      <ConfigReviewModal
        isOpen={true}
        onClose={jest.fn()}
        onApprove={jest.fn()}
        onReject={jest.fn()}
        config={null}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders with isOpen=false (returns null)', () => {
    const { container } = render(
      <ConfigReviewModal
        isOpen={false}
        onClose={jest.fn()}
        onApprove={jest.fn()}
        onReject={jest.fn()}
        config={config}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not attempt to load details when config is null', async () => {
    render(
      <ConfigReviewModal
        isOpen={true}
        onClose={jest.fn()}
        onApprove={jest.fn()}
        onReject={jest.fn()}
        config={null as any}
      />,
    );

    await waitFor(() => {
      expect(configApi.getConfig).not.toHaveBeenCalled();
    });
  });

  it('shows fallback content when loading config details throws', async () => {
    (configApi.getConfig as jest.Mock).mockRejectedValueOnce(new Error('boom'));

    render(
      <ConfigReviewModal
        isOpen={true}
        onClose={jest.fn()}
        onApprove={jest.fn()}
        onReject={jest.fn()}
        config={config}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load configuration details.'),
      ).toBeInTheDocument();
    });
  });
});
