import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import ConfigDetails from '../../../../src/features/config/components/ConfigDetails';

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

const getConfig = jest.fn();
const updateConfig = jest.fn();

jest.mock('../../../../src/features/config/services/configApi', () => ({
  configApi: {
    getConfig: (...args: unknown[]) => getConfig(...args),
    updateConfig: (...args: unknown[]) => updateConfig(...args),
  },
}));

const baseConfig = {
  id: 42,
  msgFam: 'pacs.008',
  transactionType: 'payment',
  endpointPath: '/api/payments',
  version: 'v1',
  contentType: 'application/json',
  status: 'active',
  tenantId: 'tenant-1',
  createdBy: 'tester',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  mapping: [{ source: 'a', destination: 'b' }],
  schema: { type: 'object' },
};

const draftConfig = {
  ...baseConfig,
  id: 43,
  status: 'draft',
  mapping: [
    { source: ['first', 'second'], destination: 'combined', separator: ':' },
  ],
};

const inactiveConfig = {
  ...baseConfig,
  id: 44,
  status: 'inactive',
  schema: null,
  mapping: [],
};

const sparseConfig = {
  ...baseConfig,
  id: 46,
  msgFam: undefined,
  transactionType: undefined,
  endpointPath: undefined,
  version: undefined,
  contentType: undefined,
  status: undefined,
};

describe('features/config/components/ConfigDetails.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    getConfig.mockResolvedValue({ success: true, config: baseConfig });
    updateConfig.mockResolvedValue({ success: true, config: baseConfig });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('returns null when closed', () => {
    const { container } = render(
      <ConfigDetails isOpen={false} onClose={jest.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders initial config and supports edit cancel', () => {
    render(
      <ConfigDetails
        isOpen={true}
        config={baseConfig as any}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('Configuration Details')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Edit Configuration'));
    expect(screen.getByText('Edit Configuration')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.getByText('Configuration Details')).toBeInTheDocument();
  });

  it('fetches config by id and saves updates successfully', async () => {
    const onClose = jest.fn();
    render(<ConfigDetails isOpen={true} configId={42} onClose={onClose} />);

    await waitFor(() => {
      expect(getConfig).toHaveBeenCalledWith(42);
    });

    await waitFor(() => {
      expect(screen.getByText('Edit Configuration')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Edit Configuration'));
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(updateConfig).toHaveBeenCalled();
      expect(
        screen.getByText('Configuration updated successfully!'),
      ).toBeInTheDocument();
    });

    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows error when save fails', async () => {
    updateConfig.mockResolvedValueOnce({ success: false });

    render(
      <ConfigDetails
        isOpen={true}
        config={baseConfig as any}
        onClose={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Edit Configuration'));
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(
        screen.getByText('Failed to update configuration'),
      ).toBeInTheDocument();
    });
  });

  it('shows loading state while config fetch is pending', async () => {
    const deferred = createDeferred<{
      success: boolean;
      config: typeof baseConfig;
    }>();
    getConfig.mockReturnValueOnce(deferred.promise);

    render(<ConfigDetails isOpen={true} configId={42} onClose={jest.fn()} />);

    expect(
      screen.getByText('Loading configuration details...'),
    ).toBeInTheDocument();

    deferred.resolve({ success: true, config: baseConfig });
    await waitFor(() => {
      expect(screen.getByText('Configuration Details')).toBeInTheDocument();
    });
  });

  it('shows error when fetch response is unsuccessful', async () => {
    getConfig.mockResolvedValueOnce({ success: false, config: null });

    render(<ConfigDetails isOpen={true} configId={42} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load configuration details'),
      ).toBeInTheDocument();
    });
  });

  it('shows error when fetch throws', async () => {
    getConfig.mockRejectedValueOnce(new Error('network error'));

    render(<ConfigDetails isOpen={true} configId={42} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(
        screen.getByText('Error loading configuration details'),
      ).toBeInTheDocument();
    });
  });

  it('renders draft status and array mapping with separator', () => {
    render(
      <ConfigDetails
        isOpen={true}
        config={draftConfig as any}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('draft')).toBeInTheDocument();
    expect(screen.getByText('first + second')).toBeInTheDocument();
    expect(screen.getByText('Delimiter: ":"')).toBeInTheDocument();
    expect(screen.getByText('Field Mappings (1)')).toBeInTheDocument();
  });

  it('renders inactive status and omits optional sections when absent', () => {
    render(
      <ConfigDetails
        isOpen={true}
        config={inactiveConfig as any}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('inactive')).toBeInTheDocument();
    expect(screen.queryByText('Schema Definition')).not.toBeInTheDocument();
    expect(screen.queryByText('Field Mappings (0)')).not.toBeInTheDocument();
  });

  it('falls back to string rendering for non-serializable schema', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    render(
      <ConfigDetails
        isOpen={true}
        config={{ ...baseConfig, id: 45, schema: circular } as any}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('[object Object]')).toBeInTheDocument();
  });

  it('updates all editable fields and preserves mapping in save payload', async () => {
    const deferred = createDeferred<{
      success: boolean;
      config: typeof baseConfig;
    }>();
    updateConfig.mockReturnValueOnce(deferred.promise);

    render(
      <ConfigDetails
        isOpen={true}
        config={baseConfig as any}
        onClose={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Edit Configuration'));

    fireEvent.change(screen.getByDisplayValue('pacs.008'), {
      target: { value: 'camt.053' },
    });
    fireEvent.change(screen.getByDisplayValue('payment'), {
      target: { value: 'reversal' },
    });
    fireEvent.change(screen.getByDisplayValue('v1'), {
      target: { value: 'v2' },
    });
    const [contentTypeSelect, statusSelect] = screen.getAllByRole('combobox');
    fireEvent.change(contentTypeSelect, {
      target: { value: 'application/xml' },
    });
    fireEvent.change(statusSelect, { target: { value: 'inactive' } });
    fireEvent.change(screen.getByDisplayValue('/api/payments'), {
      target: { value: '/api/reversals' },
    });

    fireEvent.click(screen.getByText('Save Changes'));

    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(updateConfig).toHaveBeenCalledWith(42, {
      msgFam: 'camt.053',
      transactionType: 'reversal',
      version: 'v2',
      contentType: 'application/xml',
      endpointPath: '/api/reversals',
      status: 'inactive',
      mapping: baseConfig.mapping,
    });

    deferred.resolve({
      success: true,
      config: { ...baseConfig, msgFam: 'camt.053' },
    });
    await waitFor(() => {
      expect(
        screen.getByText('Configuration updated successfully!'),
      ).toBeInTheDocument();
    });
  });

  it('shows error when update throws during save', async () => {
    updateConfig.mockRejectedValueOnce(new Error('save failed'));

    render(
      <ConfigDetails
        isOpen={true}
        config={baseConfig as any}
        onClose={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Edit Configuration'));
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(updateConfig).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(
        screen.getByText('Failed to update configuration'),
      ).toBeInTheDocument();
    });
  });

  it('renders fallback text for missing event type and empty edit inputs for sparse config', () => {
    render(
      <ConfigDetails
        isOpen={true}
        config={sparseConfig as any}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('Not specified')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Edit Configuration'));

    expect(screen.getByPlaceholderText('Event Type')).toHaveValue('');
    expect(screen.getByPlaceholderText('Transaction Type')).toHaveValue('');
    expect(screen.getByPlaceholderText('Version')).toHaveValue('');
    expect(screen.getByPlaceholderText('/api/endpoint/path')).toHaveValue('');
    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(1);
  });

  it('syncs internal config state when initial config prop changes while open', async () => {
    const first = { ...baseConfig, id: 51, endpointPath: '/api/first' };
    const second = { ...baseConfig, id: 52, endpointPath: '/api/second' };

    const { rerender } = render(
      <ConfigDetails isOpen={true} config={first as any} onClose={jest.fn()} />,
    );

    expect(screen.getByText('/api/first')).toBeInTheDocument();

    rerender(
      <ConfigDetails
        isOpen={true}
        config={second as any}
        onClose={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('/api/second')).toBeInTheDocument();
    });
  });

  it('does not fetch config when neither configId nor initialConfig is provided', () => {
    render(<ConfigDetails isOpen={true} onClose={jest.fn()} />);

    expect(getConfig).not.toHaveBeenCalled();
  });
});
