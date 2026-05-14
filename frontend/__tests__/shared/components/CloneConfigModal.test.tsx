import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CloneConfigModal from '../../../src/shared/components/CloneConfigModal';
import { configApi } from '../../../src/features/config/services/configApi';

const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();

jest.mock('../../../src/shared/providers/ToastProvider', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}));

jest.mock('../../../src/features/config/services/configApi', () => ({
  configApi: {
    cloneConfig: jest.fn(),
  },
}));

describe('shared/components/CloneConfigModal.tsx', () => {
  const config = {
    id: 5,
    endpointPath: '/inbound/payments',
    version: '1',
    transactionType: 'pull',
    msgFam: 'pacs.008',
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render when closed', () => {
    render(
      <CloneConfigModal isOpen={false} onClose={jest.fn()} config={config} />,
    );
    expect(screen.queryByText('Clone Pull Job')).not.toBeInTheDocument();
  });

  it('clones config and triggers success callbacks', async () => {
    (configApi.cloneConfig as jest.Mock).mockResolvedValue({ success: true });
    const onClose = jest.fn();
    const onSuccess = jest.fn();

    render(
      <CloneConfigModal
        isOpen={true}
        onClose={onClose}
        config={config}
        onSuccess={onSuccess}
      />,
    );

    fireEvent.click(screen.getByText('Clone Configuration'));

    await waitFor(() => {
      expect(configApi.cloneConfig).toHaveBeenCalled();
      expect(mockShowSuccess).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows API error message when clone fails with message', async () => {
    (configApi.cloneConfig as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Version already exists',
    });

    render(
      <CloneConfigModal isOpen={true} onClose={jest.fn()} config={config} />,
    );

    fireEvent.click(screen.getByText('Clone Configuration'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Version already exists');
    });
  });

  it('shows default error when clone fails without message', async () => {
    (configApi.cloneConfig as jest.Mock).mockResolvedValue({ success: false });

    render(
      <CloneConfigModal isOpen={true} onClose={jest.fn()} config={config} />,
    );

    fireEvent.click(screen.getByText('Clone Configuration'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Failed to clone configuration',
      );
    });
  });

  it('shows error message when clone API throws an Error', async () => {
    (configApi.cloneConfig as jest.Mock).mockRejectedValue(
      new Error('Network timeout'),
    );

    render(
      <CloneConfigModal isOpen={true} onClose={jest.fn()} config={config} />,
    );

    fireEvent.click(screen.getByText('Clone Configuration'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Network timeout');
    });
  });

  it('shows default error when clone throws a non-Error value', async () => {
    (configApi.cloneConfig as jest.Mock).mockRejectedValue('unexpected string');

    render(
      <CloneConfigModal isOpen={true} onClose={jest.fn()} config={config} />,
    );

    fireEvent.click(screen.getByText('Clone Configuration'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Failed to clone configuration',
      );
    });
  });

  it('renders New Endpoint Name field and allows editing for inbound job', () => {
    render(
      <CloneConfigModal isOpen={true} onClose={jest.fn()} config={config} />,
    );

    const endpointInput = screen.getByPlaceholderText(
      'Enter new endpoint name',
    );
    expect(endpointInput).toBeInTheDocument();

    fireEvent.change(endpointInput, { target: { value: '/new/endpoint' } });
    expect(endpointInput).toHaveValue('/new/endpoint');
  });

  it('does not render New Endpoint Name field for push job', () => {
    const pushConfig = {
      id: 6,
      endpointPath: '/outbound/payments',
      version: '3',
      transactionType: 'push',
      msgFam: 'pacs.008',
    } as any;

    render(
      <CloneConfigModal
        isOpen={true}
        onClose={jest.fn()}
        config={pushConfig}
      />,
    );

    expect(
      screen.queryByPlaceholderText('Enter new endpoint name'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Clone Push Job')).toBeInTheDocument();
  });

  it('resets form state when modal is closed and reopened', () => {
    const { rerender } = render(
      <CloneConfigModal isOpen={true} onClose={jest.fn()} config={config} />,
    );

    expect(screen.getByPlaceholderText('Enter new version')).toHaveValue('2');

    rerender(
      <CloneConfigModal isOpen={false} onClose={jest.fn()} config={config} />,
    );

    rerender(
      <CloneConfigModal isOpen={true} onClose={jest.fn()} config={config} />,
    );

    expect(screen.getByPlaceholderText('Enter new version')).toHaveValue('2');
  });

  it('initializes version to 2 when version is not a valid number', () => {
    const nanVersionConfig = { ...config, version: 'beta' } as any;

    render(
      <CloneConfigModal
        isOpen={true}
        onClose={jest.fn()}
        config={nanVersionConfig}
      />,
    );

    expect(screen.getByPlaceholderText('Enter new version')).toHaveValue('2');
  });

  it('updates version state when user types in version input (line 122)', () => {
    render(
      <CloneConfigModal isOpen={true} onClose={jest.fn()} config={config} />,
    );

    const versionInput = screen.getByPlaceholderText('Enter new version');
    fireEvent.change(versionInput, { target: { value: '5' } });
    expect(versionInput).toHaveValue('5');
  });

  it('uses fallback version "1" when config.version is null (BRDA:30)', () => {
    const nullVersionConfig = { ...config, version: null } as any;
    render(
      <CloneConfigModal
        isOpen={true}
        onClose={jest.fn()}
        config={nullVersionConfig}
      />,
    );
    // null ?? '1' → currentVersion='1', parseInt('1')=1, nextVersion='2'
    expect(screen.getByPlaceholderText('Enter new version')).toHaveValue('2');
  });

  it('uses fallback empty string when config.endpointPath is null (BRDA:34)', () => {
    const nullEndpointConfig = {
      ...config,
      endpointPath: null,
      transactionType: 'push',
    } as any;
    render(
      <CloneConfigModal
        isOpen={true}
        onClose={jest.fn()}
        config={nullEndpointConfig}
      />,
    );
    // endpointPath null ?? '' → endpointName set to ''
    // With null endpointPath + push type, isInboundJob is false so endpoint input is not shown
    expect(
      screen.queryByPlaceholderText('Enter new endpoint name'),
    ).not.toBeInTheDocument();
  });
});
