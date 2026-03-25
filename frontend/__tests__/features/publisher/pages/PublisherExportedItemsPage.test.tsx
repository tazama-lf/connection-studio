// PublisherExportedItemsPage.test.tsx
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PublisherExportedItemsPage from '../../../../src/features/publisher/pages/PublisherExportedItemsPage';
import { useToast } from '../../../../src/shared/providers/ToastProvider';
import { sftpApi, SftpError } from '../../../../src/features/exporter/services/sftpApi';

const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();

const mockGetAllFiles = jest.fn();
const mockReadFile = jest.fn();
const mockPublishItem = jest.fn();

let capturedExportedItemsListProps: any = null;
let capturedExportedItemDetailsModalProps: any = null;

jest.mock('lucide-react', () => ({
  Clock: () => <svg data-testid="clock-icon" />,
  Database: () => <svg data-testid="database-icon" />,
  SearchIcon: () => <svg data-testid="search-icon" />,
  Activity: () => <svg data-testid="activity-icon" />,
}));

jest.mock('../../../../src/shared/providers/ToastProvider', () => ({
  useToast: jest.fn(),
}));

jest.mock('../../../../src/features/auth/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: {
      claims: { role: 'publisher' },
    },
    isAuthenticated: true,
  })),
}));

jest.mock('../../../../src/utils/common/roleUtils', () => ({
  isExporter: jest.fn(),
  isPublisher: jest.fn(),
}));

jest.mock('../../../../src/features/exporter/services/sftpApi', () => {
  class MockSftpError extends Error {
    errorType: string;

    constructor(message: string, errorType: string) {
      super(message);
      this.name = 'SftpError';
      this.errorType = errorType;
    }
  }

  return {
    sftpApi: {
      getAllFiles: jest.fn(),
      readFile: jest.fn(),
      publishItem: jest.fn(),
    },
    SftpError: MockSftpError,
  };
});

jest.mock(
  '../../../../src/features/exporter/components/ExportedItemsList',
  () => ({
    ExportedItemsList: (props: any) => {
      capturedExportedItemsListProps = props;

      return (
        <div data-testid="exported-items-list">
          <div data-testid="files-count">{props.files.length}</div>
          <div data-testid="list-loading">{String(props.isLoading)}</div>
          <div data-testid="search-query">{props.searchQuery}</div>
          <div data-testid="active-format">{props.format}</div>

          <button onClick={props.onRefresh}>Refresh Files</button>
          <button onClick={() => props.onViewDetails('file-1.json')}>
            View File Details
          </button>
        </div>
      );
    },
  })
);

jest.mock(
  '../../../../src/features/exporter/components/ExportedItemDetailsModal',
  () => ({
    ExportedItemDetailsModal: (props: any) => {
      capturedExportedItemDetailsModalProps = props;

      if (!props.isOpen) return null;

      return (
        <div data-testid="exported-item-details-modal">
          <div>Mock ExportedItemDetailsModal</div>
          <div data-testid="modal-loading">{String(props.isLoading)}</div>
          <div data-testid="modal-format">{props.format}</div>
          <div data-testid="modal-content-id">{props.content?.id ?? 'no-content'}</div>
          <button onClick={props.onClose}>Close Exported Item Modal</button>
          <button
            onClick={() =>
              props.onPublish(
                'publish-id-1',
                props.format,
                'PULL'
              )
            }
          >
            Publish Item
          </button>
        </div>
      );
    },
  })
);

describe('PublisherExportedItemsPage', () => {
  const mockFiles = [
    {
      filename: 'file-1.json',
      size: 1024,
      modifiedAt: '2024-01-01T10:00:00Z',
    },
    {
      filename: 'file-2.json',
      size: 2048,
      modifiedAt: '2024-01-02T10:00:00Z',
    },
  ];

  const mockFileContent = {
    id: 'content-1',
    filename: 'file-1.json',
    content: '{"hello":"world"}',
    metadata: {
      type: 'PULL',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    capturedExportedItemsListProps = null;
    capturedExportedItemDetailsModalProps = null;

    (useToast as jest.Mock).mockReturnValue({
      showError: mockShowError,
      showSuccess: mockShowSuccess,
    });

    (sftpApi.getAllFiles as jest.Mock).mockImplementation(mockGetAllFiles);
    (sftpApi.readFile as jest.Mock).mockImplementation(mockReadFile);
    (sftpApi.publishItem as jest.Mock).mockImplementation(mockPublishItem);

    mockGetAllFiles.mockResolvedValue(mockFiles);
    mockReadFile.mockResolvedValue(mockFileContent);
    mockPublishItem.mockResolvedValue(undefined);
  });

  it('renders tabs, search input, list, and loads default dems files on mount', async () => {
    render(<PublisherExportedItemsPage />);

    expect(screen.getByRole('button', { name: /dems/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cron jobs/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /data enrichment jobs/i })
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText('Search DEMS...')
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(mockGetAllFiles).toHaveBeenCalledWith('dems');
    });

    expect(screen.getByTestId('exported-items-list')).toBeInTheDocument();
  });

  it('passes fetched files, loading state, search query, and format to ExportedItemsList', async () => {
    render(<PublisherExportedItemsPage />);

    await waitFor(() => {
      expect(capturedExportedItemsListProps).toBeTruthy();
      expect(capturedExportedItemsListProps.files).toEqual(mockFiles);
      expect(capturedExportedItemsListProps.isLoading).toBe(false);
      expect(capturedExportedItemsListProps.searchQuery).toBe('');
      expect(capturedExportedItemsListProps.format).toBe('dems');
      expect(capturedExportedItemsListProps.onViewDetails).toEqual(
        expect.any(Function)
      );
      expect(capturedExportedItemsListProps.onRefresh).toEqual(
        expect.any(Function)
      );
    });

    expect(screen.getByTestId('files-count')).toHaveTextContent('2');
    expect(screen.getByTestId('list-loading')).toHaveTextContent('false');
    expect(screen.getByTestId('search-query')).toHaveTextContent('');
    expect(screen.getByTestId('active-format')).toHaveTextContent('dems');
  });

  it('updates search term in ExportedItemsList when input changes', async () => {
    render(<PublisherExportedItemsPage />);

    const input = screen.getByPlaceholderText('Search DEMS...');
    fireEvent.change(input, { target: { value: 'invoice' } });

    expect(screen.getByDisplayValue('invoice')).toBeInTheDocument();
    expect(screen.getByTestId('search-query')).toHaveTextContent('invoice');
  });

  it('switches to cron tab, updates placeholder, and reloads files with cron format', async () => {
    render(<PublisherExportedItemsPage />);

    await waitFor(() => {
      expect(mockGetAllFiles).toHaveBeenCalledWith('dems');
    });

    fireEvent.click(screen.getByRole('button', { name: /cron jobs/i }));

    await waitFor(() => {
      expect(mockGetAllFiles).toHaveBeenLastCalledWith('cron');
    });

    expect(
      screen.getByPlaceholderText('Search Cron Jobs...')
    ).toBeInTheDocument();
    expect(screen.getByTestId('active-format')).toHaveTextContent('cron');
  });

  it('switches to data enrichment tab and reloads files with de format', async () => {
    render(<PublisherExportedItemsPage />);

    fireEvent.click(screen.getByRole('button', { name: /data enrichment jobs/i }));

    await waitFor(() => {
      expect(mockGetAllFiles).toHaveBeenLastCalledWith('de');
    });

    expect(
      screen.getByPlaceholderText('Search Data Enrichment Jobs...')
    ).toBeInTheDocument();
    expect(screen.getByTestId('active-format')).toHaveTextContent('de');
  });

  it('refreshes files when ExportedItemsList onRefresh is triggered', async () => {
    render(<PublisherExportedItemsPage />);

    await waitFor(() => {
      expect(mockGetAllFiles).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: /refresh files/i }));

    await waitFor(() => {
      expect(mockGetAllFiles).toHaveBeenCalledTimes(2);
      expect(mockGetAllFiles).toHaveBeenLastCalledWith('dems');
    });
  });

  it('opens details modal and loads file details successfully', async () => {
    render(<PublisherExportedItemsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('exported-items-list')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /view file details/i }));

    expect(screen.getByTestId('exported-item-details-modal')).toBeInTheDocument();
    expect(screen.getByTestId('modal-loading')).toHaveTextContent('true');

    await waitFor(() => {
      expect(mockReadFile).toHaveBeenCalledWith('file-1.json');
    });

    await waitFor(() => {
      expect(screen.getByTestId('modal-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('modal-content-id')).toHaveTextContent('content-1');
      expect(screen.getByTestId('modal-format')).toHaveTextContent('dems');
    });

    expect(capturedExportedItemDetailsModalProps).toMatchObject({
      isOpen: true,
      isLoading: false,
      format: 'dems',
      onClose: expect.any(Function),
      onPublish: expect.any(Function),
      content: expect.objectContaining({
        id: 'content-1',
      }),
    });
  });

  it('closes details modal when onClose is triggered', async () => {
    render(<PublisherExportedItemsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('exported-items-list')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /view file details/i }));

    await waitFor(() => {
      expect(screen.getByTestId('exported-item-details-modal')).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole('button', { name: /close exported item modal/i })
    );

    await waitFor(() => {
      expect(
        screen.queryByTestId('exported-item-details-modal')
      ).not.toBeInTheDocument();
    });
  });

  it('publishes a dems item successfully, shows success toast, reloads files, and closes modal', async () => {
    render(<PublisherExportedItemsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('exported-items-list')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /view file details/i }));

    await waitFor(() => {
      expect(screen.getByTestId('modal-content-id')).toHaveTextContent('content-1');
    });

    fireEvent.click(screen.getByRole('button', { name: /publish item/i }));

    await waitFor(() => {
      expect(mockPublishItem).toHaveBeenCalledWith('publish-id-1', 'dems', 'PULL');
    });

    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith(
        'DEMS Configuration published successfully'
      );
    });

    await waitFor(() => {
      expect(mockGetAllFiles).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId('exported-item-details-modal')
      ).not.toBeInTheDocument();
    });
  });

  it('shows cron-specific success message when publishing cron item', async () => {
    render(<PublisherExportedItemsPage />);

    fireEvent.click(screen.getByRole('button', { name: /cron jobs/i }));

    await waitFor(() => {
      expect(screen.getByTestId('active-format')).toHaveTextContent('cron');
    });

    fireEvent.click(screen.getByRole('button', { name: /view file details/i }));

    await waitFor(() => {
      expect(screen.getByTestId('exported-item-details-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /publish item/i }));

    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith(
        'Cron job published successfully'
      );
    });
  });

  it('shows data enrichment-specific success message when publishing de item', async () => {
    render(<PublisherExportedItemsPage />);

    fireEvent.click(screen.getByRole('button', { name: /data enrichment jobs/i }));

    await waitFor(() => {
      expect(screen.getByTestId('active-format')).toHaveTextContent('de');
    });

    fireEvent.click(screen.getByRole('button', { name: /view file details/i }));

    await waitFor(() => {
      expect(screen.getByTestId('exported-item-details-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /publish item/i }));

    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith(
        'Data enrichment job published successfully'
      );
    });
  });

  it('shows default error toast and clears files when loadExportedItems fails with non-SftpError', async () => {
    mockGetAllFiles.mockRejectedValueOnce(new Error('network down'));

    render(<PublisherExportedItemsPage />);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Failed to load exported items');
    });

    expect(screen.getByTestId('files-count')).toHaveTextContent('0');
    expect(screen.getByTestId('list-loading')).toHaveTextContent('false');
  });

  it('shows corrupted file error when getAllFiles throws CORRUPTED_FILE', async () => {
    mockGetAllFiles.mockRejectedValueOnce(
      new SftpError('bad file', 'CORRUPTED_FILE')
    );

    render(<PublisherExportedItemsPage />);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Some files appear to be corrupted or missing integrity verification'
      );
    });

    expect(screen.getByTestId('files-count')).toHaveTextContent('0');
  });

  it('shows not found error when getAllFiles throws NOT_FOUND', async () => {
    mockGetAllFiles.mockRejectedValueOnce(
      new SftpError('missing dir', 'NOT_FOUND')
    );

    render(<PublisherExportedItemsPage />);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'SFTP directory not found or inaccessible'
      );
    });
  });

  it('shows unauthorized error when getAllFiles throws UNAUTHORIZED', async () => {
    mockGetAllFiles.mockRejectedValueOnce(
      new SftpError('forbidden', 'UNAUTHORIZED')
    );

    render(<PublisherExportedItemsPage />);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Unauthorized access to SFTP server'
      );
    });
  });

  it('shows custom SftpError message for unknown getAllFiles SftpError type', async () => {
    mockGetAllFiles.mockRejectedValueOnce(
      new SftpError('custom list failure', 'GENERAL')
    );

    render(<PublisherExportedItemsPage />);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('custom list failure');
    });
  });

  it('shows corrupted file error and closes modal when readFile throws CORRUPTED_FILE', async () => {
    mockReadFile.mockRejectedValueOnce(
      new SftpError('corrupted', 'CORRUPTED_FILE')
    );

    render(<PublisherExportedItemsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('exported-items-list')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /view file details/i }));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'File "file-1.json" is corrupted or has failed integrity verification. The file may be incomplete or damaged.'
      );
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId('exported-item-details-modal')
      ).not.toBeInTheDocument();
    });
  });

  it('shows not found error when readFile throws NOT_FOUND', async () => {
    mockReadFile.mockRejectedValueOnce(
      new SftpError('missing', 'NOT_FOUND')
    );

    render(<PublisherExportedItemsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('exported-items-list')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /view file details/i }));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'File "file-1.json" not found on the SFTP server'
      );
    });
  });

  it('shows unauthorized error when readFile throws UNAUTHORIZED', async () => {
    mockReadFile.mockRejectedValueOnce(
      new SftpError('forbidden', 'UNAUTHORIZED')
    );

    render(<PublisherExportedItemsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('exported-items-list')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /view file details/i }));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Unauthorized access to read the file'
      );
    });
  });

  it('shows formatted unknown SftpError message when readFile fails', async () => {
    mockReadFile.mockRejectedValueOnce(
      new SftpError('broken parse', 'UNKNOWN_ERROR')
    );

    render(<PublisherExportedItemsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('exported-items-list')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /view file details/i }));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Failed to read file "file-1.json": broken parse'
      );
    });
  });

  it('shows default read details error when readFile throws a non-Sftp Error', async () => {
    mockReadFile.mockRejectedValueOnce(new Error('generic read failure'));

    render(<PublisherExportedItemsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('exported-items-list')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /view file details/i }));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Failed to load exported item details'
      );
    });
  });

  it('shows corrupted publish error when publishItem throws CORRUPTED_FILE', async () => {
    mockPublishItem.mockRejectedValueOnce(
      new SftpError('bad publish', 'CORRUPTED_FILE')
    );

    render(<PublisherExportedItemsPage />);

    fireEvent.click(screen.getByRole('button', { name: /view file details/i }));

    await waitFor(() => {
      expect(screen.getByTestId('exported-item-details-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /publish item/i }));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Cannot publish: File is corrupted or has failed integrity verification'
      );
    });
  });

  it('shows not found publish error when publishItem throws NOT_FOUND', async () => {
    mockPublishItem.mockRejectedValueOnce(
      new SftpError('missing publish', 'NOT_FOUND')
    );

    render(<PublisherExportedItemsPage />);

    fireEvent.click(screen.getByRole('button', { name: /view file details/i }));

    await waitFor(() => {
      expect(screen.getByTestId('exported-item-details-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /publish item/i }));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Cannot publish: Item not found or has been removed'
      );
    });
  });

  it('shows unauthorized publish error when publishItem throws UNAUTHORIZED', async () => {
    mockPublishItem.mockRejectedValueOnce(
      new SftpError('forbidden publish', 'UNAUTHORIZED')
    );

    render(<PublisherExportedItemsPage />);

    fireEvent.click(screen.getByRole('button', { name: /view file details/i }));

    await waitFor(() => {
      expect(screen.getByTestId('exported-item-details-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /publish item/i }));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Unauthorized to publish this item'
      );
    });
  });

  it('shows default SftpError publish message for unknown error type', async () => {
    mockPublishItem.mockRejectedValueOnce(
      new SftpError('publisher backend unavailable', 'GENERAL')
    );

    render(<PublisherExportedItemsPage />);

    fireEvent.click(screen.getByRole('button', { name: /view file details/i }));

    await waitFor(() => {
      expect(screen.getByTestId('exported-item-details-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /publish item/i }));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Failed to publish: publisher backend unavailable'
      );
    });
  });

  it('shows dry run failed SFTP validation message when publishItem throws matching Error', async () => {
    mockPublishItem.mockRejectedValueOnce(
      new Error('Dry run failed because SFTP validation failed')
    );

    render(<PublisherExportedItemsPage />);

    fireEvent.click(screen.getByRole('button', { name: /view file details/i }));

    await waitFor(() => {
      expect(screen.getByTestId('exported-item-details-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /publish item/i }));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Cannot publish: SFTP connection validation failed. Please check SFTP credentials and connectivity.'
      );
    });
  });

  it('shows SFTP server connection failed message when publishItem throws matching Error', async () => {
    mockPublishItem.mockRejectedValueOnce(
      new Error('SFTP connection failed during publish')
    );

    render(<PublisherExportedItemsPage />);

    fireEvent.click(screen.getByRole('button', { name: /view file details/i }));

    await waitFor(() => {
      expect(screen.getByTestId('exported-item-details-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /publish item/i }));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Cannot publish: SFTP server connection failed. Please verify SFTP server settings.'
      );
    });
  });

  it('shows SFTP authentication failed message when publishItem throws matching Error', async () => {
    mockPublishItem.mockRejectedValueOnce(
      new Error('Authentication methods failed')
    );

    render(<PublisherExportedItemsPage />);

    fireEvent.click(screen.getByRole('button', { name: /view file details/i }));

    await waitFor(() => {
      expect(screen.getByTestId('exported-item-details-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /publish item/i }));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Cannot publish: SFTP authentication failed. Please check username, password, and key settings.'
      );
    });
  });

  it('shows missing job type message when publishItem throws matching Error', async () => {
    mockPublishItem.mockRejectedValueOnce(
      new Error('Job type is required')
    );

    render(<PublisherExportedItemsPage />);

    fireEvent.click(screen.getByRole('button', { name: /view file details/i }));

    await waitFor(() => {
      expect(screen.getByTestId('exported-item-details-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /publish item/i }));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Cannot publish: Job type information is missing. Please ensure the job configuration is complete.'
      );
    });
  });

  it('shows generic Error message when publishItem throws a normal Error', async () => {
    mockPublishItem.mockRejectedValueOnce(
      new Error('random publish failure')
    );

    render(<PublisherExportedItemsPage />);

    fireEvent.click(screen.getByRole('button', { name: /view file details/i }));

    await waitFor(() => {
      expect(screen.getByTestId('exported-item-details-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /publish item/i }));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Publish failed: random publish failure'
      );
    });
  });

  it('shows fallback publish error for non-Error throw values', async () => {
    mockPublishItem.mockRejectedValueOnce('unexpected');

    render(<PublisherExportedItemsPage />);

    fireEvent.click(screen.getByRole('button', { name: /view file details/i }));

    await waitFor(() => {
      expect(screen.getByTestId('exported-item-details-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /publish item/i }));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'An unexpected error occurred during publishing. Please try again.'
      );
    });
  });

  it('evaluates cron format in publish error path', async () => {
    mockPublishItem.mockRejectedValueOnce(new Error('cron publish failure'));

    render(<PublisherExportedItemsPage />);

    fireEvent.click(screen.getByRole('button', { name: /cron jobs/i }));
    await waitFor(() => {
      expect(screen.getByTestId('active-format')).toHaveTextContent('cron');
    });

    fireEvent.click(screen.getByRole('button', { name: /view file details/i }));
    await waitFor(() => {
      expect(screen.getByTestId('exported-item-details-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /publish item/i }));
    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Publish failed: cron publish failure');
    });
  });

  it('evaluates data enrichment format in publish error path', async () => {
    mockPublishItem.mockRejectedValueOnce(new Error('de publish failure'));

    render(<PublisherExportedItemsPage />);

    fireEvent.click(screen.getByRole('button', { name: /data enrichment jobs/i }));
    await waitFor(() => {
      expect(screen.getByTestId('active-format')).toHaveTextContent('de');
    });

    fireEvent.click(screen.getByRole('button', { name: /view file details/i }));
    await waitFor(() => {
      expect(screen.getByTestId('exported-item-details-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /publish item/i }));
    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Publish failed: de publish failure');
    });
  });
});