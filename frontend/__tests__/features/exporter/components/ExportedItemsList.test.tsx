import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ExportedItemsList from '../../../../src/features/exporter/components/ExportedItemsList';
import { sftpApi } from '../../../../src/features/exporter/services/sftpApi';

jest.mock('../../../../src/features/exporter/services/sftpApi', () => ({
  sftpApi: {
    readFile: jest.fn(),
  },
}));

describe('features/exporter/components/ExportedItemsList.tsx', () => {
  const files = [
    {
      name: 'file-1.json',
      size: 1024,
      modifyTime: new Date('2024-01-01T00:00:00.000Z').getTime(),
    },
  ] as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state', () => {
    render(<ExportedItemsList files={files} isLoading={true} format="de" />);
    expect(screen.getByText('Loading exported files...')).toBeInTheDocument();
  });

  it('shows empty search state and triggers refresh', () => {
    const onRefresh = jest.fn();
    render(
      <ExportedItemsList
        files={[]}
        searchQuery="missing"
        onRefresh={onRefresh}
        format="de"
      />,
    );

    expect(screen.getByText('No files match your search')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Refresh'));
    expect(onRefresh).toHaveBeenCalled();
  });

  it('renders file and calls onViewDetails', () => {
    const onViewDetails = jest.fn();
    render(
      <ExportedItemsList
        files={files}
        onViewDetails={onViewDetails}
        format="de"
      />,
    );

    expect(screen.getByText('file-1.json')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(onViewDetails).toHaveBeenCalledWith('file-1.json');
  });

  it('loads and displays DEMS endpoint path from file content', async () => {
    (sftpApi.readFile as jest.Mock).mockResolvedValue({
      endpointPath: '/dems/path',
      status: 'approved',
      createdAt: '2024-01-02T00:00:00.000Z',
      transactionType: 'credit',
    });

    render(<ExportedItemsList files={files} format="dems" />);

    await waitFor(() => {
      expect(screen.getByText('/dems/path')).toBeInTheDocument();
    });
  });

  it('formats B, KB and MB file sizes for non-dems rows', () => {
    const sizedFiles = [
      {
        name: 'small.json',
        size: 500,
        modifyTime: new Date('2024-01-01T00:00:00.000Z').getTime(),
      },
      {
        name: 'mid.json',
        size: 1024,
        modifyTime: new Date('2024-01-01T00:00:00.000Z').getTime(),
      },
      {
        name: 'big.json',
        size: 1572864,
        modifyTime: new Date('2024-01-01T00:00:00.000Z').getTime(),
      },
    ] as any;

    render(<ExportedItemsList files={sizedFiles} format="de" />);

    expect(screen.getByText('500 B')).toBeInTheDocument();
    expect(screen.getByText('1.0 KB')).toBeInTheDocument();
    expect(screen.getByText('1.5 MB')).toBeInTheDocument();
  });

  it('uses dems createdAt sort when createdAt exists for all rows', async () => {
    (sftpApi.readFile as jest.Mock)
      .mockResolvedValueOnce({
        endpointPath: '/z-last',
        status: 'approved',
        createdAt: '2024-01-01T00:00:00.000Z',
        transactionType: 'z',
      })
      .mockResolvedValueOnce({
        endpointPath: '/a-first',
        status: 'approved',
        createdAt: '2024-02-01T00:00:00.000Z',
        transactionType: 'a',
      })
      .mockResolvedValueOnce({
        endpointPath: '/z-last',
        status: 'approved',
        createdAt: '2024-01-01T00:00:00.000Z',
        transactionType: 'z',
      })
      .mockResolvedValueOnce({
        endpointPath: '/a-first',
        status: 'approved',
        createdAt: '2024-02-01T00:00:00.000Z',
        transactionType: 'a',
      });

    const sortedFiles = [
      {
        name: 'first.json',
        size: 10,
        modifyTime: new Date('2024-01-01T00:00:00.000Z').getTime(),
      },
      {
        name: 'second.json',
        size: 20,
        modifyTime: new Date('2024-03-01T00:00:00.000Z').getTime(),
      },
    ] as any;

    render(<ExportedItemsList files={sortedFiles} format="dems" />);

    await waitFor(() => {
      expect(screen.getByText('/a-first')).toBeInTheDocument();
      expect(screen.getByText('/z-last')).toBeInTheDocument();
    });

    const endpointCells = screen.getAllByText(/\/(a-first|z-last)/);
    expect(endpointCells[0]).toHaveTextContent('/a-first');
  });

  it('falls back to modifyTime sorting when dems createdAt is unavailable', async () => {
    (sftpApi.readFile as jest.Mock)
      .mockResolvedValueOnce({ endpointPath: '/older' })
      .mockResolvedValueOnce({ endpointPath: '/newer' })
      .mockResolvedValueOnce({ endpointPath: '/older' })
      .mockResolvedValueOnce({ endpointPath: '/newer' });

    const demsFiles = [
      {
        name: 'older.json',
        size: 99,
        modifyTime: new Date('2024-01-01T00:00:00.000Z').getTime(),
      },
      {
        name: 'newer.json',
        size: 99,
        modifyTime: new Date('2024-02-01T00:00:00.000Z').getTime(),
      },
    ] as any;

    render(<ExportedItemsList files={demsFiles} format="dems" />);

    await waitFor(() => {
      expect(screen.getByText('/older')).toBeInTheDocument();
      expect(screen.getByText('/newer')).toBeInTheDocument();
    });
  });

  it('handles readFile failures in both dems loaders and still renders fallback endpoint name', async () => {
    (sftpApi.readFile as jest.Mock).mockRejectedValue(new Error('sftp down'));

    const demsFiles = [
      {
        name: 'broken.json',
        size: 99,
        modifyTime: new Date('2024-01-01T00:00:00.000Z').getTime(),
      },
    ] as any;

    render(<ExportedItemsList files={demsFiles} format="dems" />);

    await waitFor(() => {
      expect(screen.getByText('broken.json')).toBeInTheDocument();
    });
  });

  it('registers outside-click listener when dropdown state is open and cleans up on unmount', () => {
    const addListenerSpy = jest.spyOn(document, 'addEventListener');
    const removeListenerSpy = jest.spyOn(document, 'removeEventListener');
    const useStateSpy = jest.spyOn(React, 'useState');

    useStateSpy
      .mockImplementationOnce(() => ['open-row', jest.fn()] as any)
      .mockImplementationOnce(() => [{}, jest.fn()] as any);

    const { unmount } = render(
      <ExportedItemsList files={files} format="de" onViewDetails={jest.fn()} />,
    );

    expect(addListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));

    const clickHandler = addListenerSpy.mock.calls.find(
      (call) => call[0] === 'click',
    )?.[1] as EventListener;
    clickHandler({ target: document.createElement('div') } as unknown as Event);

    const inside = document.createElement('div');
    inside.className = 'actions-dropdown';
    clickHandler({ target: inside } as unknown as Event);

    unmount();
    expect(removeListenerSpy).toHaveBeenCalledWith(
      'click',
      expect.any(Function),
    );

    addListenerSpy.mockRestore();
    removeListenerSpy.mockRestore();
    useStateSpy.mockRestore();
  });

  it('covers descOrder equality branch via equal modifyTime values', () => {
    const equalTime = new Date('2024-01-01T00:00:00.000Z').getTime();
    const equalFiles = [
      { name: 'a.json', size: 100, modifyTime: equalTime },
      { name: 'b.json', size: 100, modifyTime: equalTime },
    ] as any;

    render(<ExportedItemsList files={equalFiles} format="de" />);

    expect(screen.getByText('a.json')).toBeInTheDocument();
    expect(screen.getByText('b.json')).toBeInTheDocument();
  });

  it('renders no-search empty states for cron and dems formats', () => {
    const { rerender } = render(<ExportedItemsList files={[]} format="cron" />);

    expect(screen.getByText('No exported cron jobs yet')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Exported cron jobs will appear here when they are ready for deployment',
      ),
    ).toBeInTheDocument();

    rerender(<ExportedItemsList files={[]} format="dems" />);

    expect(
      screen.getByText('No exported dems configurations yet'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Exported dems configurations will appear here when they are ready for deployment',
      ),
    ).toBeInTheDocument();
  });

  it('filters dems rows by filename when search matches file.name', async () => {
    (sftpApi.readFile as jest.Mock).mockResolvedValue({
      endpointPath: '/unrelated-endpoint',
      status: 'approved',
      createdAt: '2024-01-02T00:00:00.000Z',
      transactionType: 'credit',
    });

    const demsFiles = [
      {
        name: 'match-by-name.json',
        size: 10,
        modifyTime: new Date('2024-01-01T00:00:00.000Z').getTime(),
      },
    ] as any;

    render(
      <ExportedItemsList
        files={demsFiles}
        format="dems"
        searchQuery="match-by-name"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('/unrelated-endpoint')).toBeInTheDocument();
    });
  });

  it('filters dems rows by endpointPath when file.name does not match', async () => {
    // Covers branch 1: file.name.includes(query) = false → fileData?.endpointPath?.includes
    (sftpApi.readFile as jest.Mock).mockResolvedValue({
      endpointPath: '/special-endpoint-path',
      status: 'approved',
      createdAt: '2024-01-02T00:00:00.000Z',
      transactionType: 'unrelated',
    });

    const demsFiles = [
      {
        name: 'other-file.json',
        size: 10,
        modifyTime: new Date('2024-01-01T00:00:00.000Z').getTime(),
      },
    ] as any;

    render(
      <ExportedItemsList
        files={demsFiles}
        format="dems"
        searchQuery="special-endpoint"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('/special-endpoint-path')).toBeInTheDocument();
    });
  });

  it('filters dems rows by transactionType when name and endpointPath do not match', async () => {
    // Covers branch 2: file.name false, endpointPath false → transactionType?.includes
    (sftpApi.readFile as jest.Mock).mockResolvedValue({
      endpointPath: '/visible-endpoint-xyz',
      status: 'pending',
      createdAt: '2024-01-02T00:00:00.000Z',
      transactionType: 'unique-payment-type',
    });

    const demsFiles = [
      {
        name: 'another-file.json',
        size: 10,
        modifyTime: new Date('2024-01-01T00:00:00.000Z').getTime(),
      },
    ] as any;

    render(
      <ExportedItemsList
        files={demsFiles}
        format="dems"
        // searchQuery matches transactionType but NOT file.name or endpointPath
        searchQuery="unique-payment-type"
      />,
    );

    // The row should be included (transactionType matched) and endpointPath is displayed
    await waitFor(() => {
      expect(screen.getByText('/visible-endpoint-xyz')).toBeInTheDocument();
    });
  });

  it('filters dems rows by status when name, endpointPath and transactionType do not match', async () => {
    // Covers branch 3: all previous false → status?.includes
    (sftpApi.readFile as jest.Mock).mockResolvedValue({
      endpointPath: '/displayed-endpoint-abc',
      status: 'special-status-xyz',
      createdAt: '2024-01-02T00:00:00.000Z',
      transactionType: 'regular',
    });

    const demsFiles = [
      {
        name: 'plain-file.json',
        size: 10,
        modifyTime: new Date('2024-01-01T00:00:00.000Z').getTime(),
      },
    ] as any;

    render(
      <ExportedItemsList
        files={demsFiles}
        format="dems"
        // Query matches status but NOT file.name, endpointPath, or transactionType
        searchQuery="special-status-xyz"
      />,
    );

    // Row should be included (status matched) and endpointPath is the visible field
    await waitFor(() => {
      expect(screen.getByText('/displayed-endpoint-abc')).toBeInTheDocument();
    });
  });
});
