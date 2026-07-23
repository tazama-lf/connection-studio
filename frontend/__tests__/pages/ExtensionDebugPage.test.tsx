import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { ExtensionDebugPage } from '../../src/pages/ExtensionDebugPage';

jest.mock('../../src/features/data-model', () => ({
  dataModelApi: {
    getAllExtensions: jest.fn(),
    createExtension: jest.fn(),
  },
  ExtensionManagement: ({
    onExtensionChange,
  }: {
    onExtensionChange: () => void;
  }) => <div data-testid="extension-management">ExtensionManagement</div>,
}));

import { dataModelApi } from '../../src/features/data-model';

const mockDataModelApi = dataModelApi as {
  getAllExtensions: jest.Mock;
  createExtension: jest.Mock;
};

describe('ExtensionDebugPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the debug page heading', () => {
    render(<ExtensionDebugPage />);
    expect(
      screen.getByText('Extension Creation Debug Tool'),
    ).toBeInTheDocument();
  });

  it('renders both test buttons', () => {
    render(<ExtensionDebugPage />);
    expect(screen.getByText('Test API Connection')).toBeInTheDocument();
    expect(screen.getByText('Test Extension Creation')).toBeInTheDocument();
  });

  it('hides result area initially', () => {
    render(<ExtensionDebugPage />);
    expect(screen.queryByText('Test Result:')).not.toBeInTheDocument();
  });

  it('shows success result when API connection test passes', async () => {
    mockDataModelApi.getAllExtensions.mockResolvedValue({
      success: true,
      extensions: [{ id: 1 }],
    });

    render(<ExtensionDebugPage />);
    await act(async () => {
      fireEvent.click(screen.getByText('Test API Connection'));
    });

    await waitFor(() => {
      expect(screen.getByText('Test Result:')).toBeInTheDocument();
      expect(screen.getByText(/API CONNECTION OK/)).toBeInTheDocument();
    });
  });

  it('shows failure result when API connection test fails with false success', async () => {
    mockDataModelApi.getAllExtensions.mockResolvedValue({
      success: false,
      message: 'Service down',
    });

    render(<ExtensionDebugPage />);
    await act(async () => {
      fireEvent.click(screen.getByText('Test API Connection'));
    });

    await waitFor(() => {
      expect(screen.getByText(/API CONNECTION ISSUE/)).toBeInTheDocument();
    });
  });

  it('shows error when API connection test throws', async () => {
    mockDataModelApi.getAllExtensions.mockRejectedValue(
      new Error('Network failure'),
    );

    render(<ExtensionDebugPage />);
    await act(async () => {
      fireEvent.click(screen.getByText('Test API Connection'));
    });

    await waitFor(() => {
      expect(screen.getByText(/CONNECTION ERROR/)).toBeInTheDocument();
      expect(screen.getByText(/Network failure/)).toBeInTheDocument();
    });
  });

  it('shows connection error details for non-Error throws', async () => {
    mockDataModelApi.getAllExtensions.mockRejectedValue('network-string-error');

    render(<ExtensionDebugPage />);
    await act(async () => {
      fireEvent.click(screen.getByText('Test API Connection'));
    });

    await waitFor(() => {
      expect(screen.getByText(/CONNECTION ERROR/)).toBeInTheDocument();
      expect(screen.getByText(/network-string-error/)).toBeInTheDocument();
      expect(screen.getByText(/No stack trace/)).toBeInTheDocument();
    });
  });

  it('shows success when extension creation test passes', async () => {
    mockDataModelApi.createExtension.mockResolvedValue({
      success: true,
      extension: { id: 42 },
    });

    render(<ExtensionDebugPage />);
    await act(async () => {
      fireEvent.click(screen.getByText('Test Extension Creation'));
    });

    await waitFor(() => {
      expect(
        screen.getByText(/SUCCESS: Extension created successfully!/),
      ).toBeInTheDocument();
    });
  });

  it('shows failure when extension creation returns success=false', async () => {
    mockDataModelApi.createExtension.mockResolvedValue({
      success: false,
      message: 'Duplicate field',
    });

    render(<ExtensionDebugPage />);
    await act(async () => {
      fireEvent.click(screen.getByText('Test Extension Creation'));
    });

    await waitFor(() => {
      expect(
        screen.getByText(/FAILED: Extension creation failed!/),
      ).toBeInTheDocument();
      expect(screen.getByText(/Duplicate field/)).toBeInTheDocument();
    });
  });

  it('shows error when extension creation throws', async () => {
    mockDataModelApi.createExtension.mockRejectedValue(new Error('Timeout'));

    render(<ExtensionDebugPage />);
    await act(async () => {
      fireEvent.click(screen.getByText('Test Extension Creation'));
    });

    await waitFor(() => {
      expect(
        screen.getByText(/ERROR: Exception during extension creation!/),
      ).toBeInTheDocument();
      expect(screen.getByText(/Timeout/)).toBeInTheDocument();
    });
  });

  it('shows extension error details for non-Error throws', async () => {
    mockDataModelApi.createExtension.mockRejectedValue('timeout-string-error');

    render(<ExtensionDebugPage />);
    await act(async () => {
      fireEvent.click(screen.getByText('Test Extension Creation'));
    });

    await waitFor(() => {
      expect(
        screen.getByText(/ERROR: Exception during extension creation!/),
      ).toBeInTheDocument();
      expect(screen.getByText(/timeout-string-error/)).toBeInTheDocument();
      expect(screen.getByText(/No stack trace/)).toBeInTheDocument();
    });
  });

  it('disables buttons while loading', async () => {
    let resolvePromise!: (val: any) => void;
    mockDataModelApi.getAllExtensions.mockReturnValue(
      new Promise((res) => {
        resolvePromise = res;
      }),
    );

    render(<ExtensionDebugPage />);
    fireEvent.click(screen.getByText('Test API Connection'));

    await waitFor(() => {
      expect(screen.getAllByText('Testing...')).toHaveLength(2);
    });

    act(() => {
      resolvePromise({ success: true, extensions: [] });
    });
  });
});
