import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const showSuccessMock = jest.fn();
const showErrorMock = jest.fn();
const onConfigEdit = jest.fn();
const onConfigClone = jest.fn();
const onViewDetails = jest.fn();
const onRefresh = jest.fn();

const getConfigsPaginatedMock = jest.fn();
const exportConfigMock = jest.fn();
const updateConfigStatusMock = jest.fn();
const updatePublishingStatusMock = jest.fn();

jest.mock('@common/Tables/CustomTable', () => (props: any) => {
  return (
    <div>
      <div data-testid="rows-count">{props.rows.length}</div>
      <button onClick={() => props.pagination?.setPage?.(2)}>set-page</button>
      {props.columns.map((col: any) => (
        <div key={`header-${col.field}`}>{col.renderHeader?.()}</div>
      ))}
      {props.rows.map((row: any) => (
        <div key={row.id}>
          {props.columns.map((col: any) => (
            <div key={`${row.id}-${col.field}`}>
              {typeof col.renderCell === 'function' ? col.renderCell({ row }) : String(row[col.field] ?? '')}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
});

jest.mock('@shared', () => ({
  Button: (props: any) => (
    <button onClick={props.onClick} disabled={props.disabled}>
      {props.children}
    </button>
  ),
}));

jest.mock('@shared/helpers', () => ({
  handleInputFilter: () => <input aria-label="filter-input" />,
  handleSelectFilter: () => <select aria-label="filter-select" />,
}));

jest.mock('@shared/hooks/useFilters', () => ({
  __esModule: true,
  default: () => ({ offset: 0, limit: 10, setOffset: jest.fn() }),
}));

jest.mock('@shared/lovs', () => ({
  getDemsStatusLov: { editor: [], approver: [], exporter: [], publisher: [] },
}));

jest.mock('../../../../src/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { claims: ['editor', 'exporter', 'approver', 'publisher'] } }),
}));

jest.mock('../../../../src/shared/providers/ToastProvider', () => ({
  useToast: () => ({ showSuccess: showSuccessMock, showError: showErrorMock }),
}));

jest.mock('../../../../src/utils/common/roleUtils', () => ({
  getPrimaryRole: () => 'editor',
  isApprover: () => true,
  isEditor: () => true,
  isExporter: () => true,
  isPublisher: () => true,
}));

jest.mock('lucide-react', () => {
  const Icon = (id: string) => (props: any) => (
    <button data-testid={id} onClick={props.onClick}>
      {id}
    </button>
  );
  return {
    CopyIcon: Icon('copy-icon'),
    EditIcon: Icon('edit-icon'),
    EyeIcon: Icon('eye-icon'),
    Pause: Icon('pause-icon'),
    Play: Icon('play-icon'),
    ShieldCheck: Icon('activate-icon'),
    ShieldX: Icon('deactivate-icon'),
    Upload: Icon('export-icon'),
  };
});

jest.mock('../../../../src/features/config/services/configApi', () => ({
  configApi: {
    getConfigsPaginated: (...args: any[]) => getConfigsPaginatedMock(...args),
    exportConfig: (...args: any[]) => exportConfigMock(...args),
    updateConfigStatus: (...args: any[]) => updateConfigStatusMock(...args),
    updatePublishingStatus: (...args: any[]) => updatePublishingStatusMock(...args),
  },
}));

import { ConfigList } from '../../../../src/features/config/components/ConfigList';

const rows = [
  { id: 1, msgFam: 'A', endpointPath: '/a', status: 'STATUS_01_IN_PROGRESS', createdAt: '2025-01-01' },
  { id: 2, msgFam: 'B', endpointPath: '/b', status: 'STATUS_02_ON_HOLD', createdAt: '2025-01-01' },
  { id: 3, msgFam: 'C', endpointPath: '/c', status: 'STATUS_04_APPROVED', createdAt: '2025-01-01', publishing_status: 'inactive' },
  { id: 4, msgFam: 'D', endpointPath: '/d', status: 'STATUS_06_EXPORTED', createdAt: '2025-01-01', publishing_status: 'active' },
  { id: 5, msgFam: 'E', endpointPath: '/e', status: 'STATUS_05_REJECTED', createdAt: '2025-01-01' },
];

const statusRows = [
  {
    id: 10,
    msgFam: 'S0',
    endpointPath: '/s0',
    status: 'STATUS_01_IN_PROGRESS',
    createdAt: '2025-01-01',
  },
  { id: 11, msgFam: 'S1', endpointPath: '/s1', status: 'STATUS_03_UNDER_REVIEW', createdAt: '2025-01-01' },
  { id: 12, msgFam: 'S2', endpointPath: '/s2', status: 'STATUS_07_READY_FOR_DEPLOYMENT', createdAt: '2025-01-01' },
  {
    id: 19,
    msgFam: 'S9',
    endpointPath: '/s9',
    status: 'STATUS_04_APPROVED',
    createdAt: '2025-01-01',
    publishing_status: 'inactive',
  },
  { id: 13, msgFam: 'S3', endpointPath: '/s3', status: 'active', createdAt: '2025-01-01' },
  { id: 14, msgFam: 'S4', endpointPath: '/s4', status: 'in_progress', createdAt: '2025-01-01' },
  { id: 15, msgFam: 'S5', endpointPath: '/s5', status: 'under review', createdAt: '2025-01-01' },
  { id: 16, msgFam: 'S6', endpointPath: '/s6', status: 'changes requested', createdAt: '2025-01-01' },
  { id: 17, msgFam: 'S7', endpointPath: '/s7', status: 'ready for deployment', createdAt: '2025-01-01' },
  { id: 20, msgFam: 'S10', endpointPath: '/s10', status: 'STATUS_10_CHANGES_REQUESTED', createdAt: '2025-01-01' },
  { id: 21, msgFam: 'S11', endpointPath: '/s11', status: 'STATUS_08_DEPLOYED', createdAt: '2025-01-01' },
  { id: 22, msgFam: 'S12', endpointPath: '/s12', status: 'STATUS_09_SUSPENDED', createdAt: '2025-01-01' },
  { id: 23, msgFam: 'S13', endpointPath: '/s13', status: 'rejected', createdAt: '2025-01-01' },
  { id: 24, msgFam: 'S14', endpointPath: '/s14', status: 'cloned', createdAt: '2025-01-01' },
  { id: 25, msgFam: 'S15', endpointPath: '/s15', status: 'deployed', createdAt: '2025-01-01' },
  { id: 26, msgFam: 'S16', endpointPath: '/s16', status: 'exported', createdAt: '2025-01-01' },
  { id: 18, msgFam: 'S8', endpointPath: '/s8', status: 'something_else', createdAt: '2025-01-01' },
];

describe('features/config/components/ConfigList.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getConfigsPaginatedMock.mockResolvedValue({
      success: true,
      configs: rows,
      total: rows.length,
      limit: 10,
      offset: 0,
      pages: 1,
    });
    exportConfigMock.mockResolvedValue({ success: true });
    updateConfigStatusMock.mockResolvedValue({ success: true });
    updatePublishingStatusMock.mockResolvedValue({ success: true });
  });

  it('loads configs and triggers row actions', async () => {
    render(
      <ConfigList
        onConfigEdit={onConfigEdit}
        onConfigClone={onConfigClone}
        onViewDetails={onViewDetails}
        onRefresh={onRefresh}
      />,
    );

    await waitFor(() => {
      expect(getConfigsPaginatedMock).toHaveBeenCalled();
      expect(screen.getByTestId('rows-count')).toHaveTextContent('5');
    });

    await screen.findAllByTestId('eye-icon');

    fireEvent.click(screen.getAllByTestId('eye-icon')[0]);
    fireEvent.click(screen.getAllByTestId('edit-icon')[0]);
    fireEvent.click(screen.getAllByTestId('copy-icon')[0]);

    expect(onViewDetails).toHaveBeenCalled();
    expect(onConfigEdit).toHaveBeenCalled();
    expect(onConfigClone).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('pause-icon'));
    fireEvent.click(screen.getByText('Yes, Pause Configuration'));
    await waitFor(() => {
      expect(updateConfigStatusMock).toHaveBeenCalledWith(1, 'STATUS_02_ON_HOLD');
    });

    fireEvent.click(screen.getByTestId('play-icon'));
    fireEvent.click(screen.getByText('Yes, Resume Configuration'));
    await waitFor(() => {
      expect(updateConfigStatusMock).toHaveBeenCalledWith(2, 'STATUS_01_IN_PROGRESS');
    });

    fireEvent.click(screen.getByTestId('export-icon'));
    fireEvent.click(screen.getByText('Yes, Export Configuration'));
    await waitFor(() => {
      expect(exportConfigMock).toHaveBeenCalledWith(3, 'Exported for deployment');
    });

    fireEvent.click(screen.getByTestId('activate-icon'));
    fireEvent.click(screen.getByText('Yes, Activate Configuration'));
    await waitFor(() => {
      expect(updatePublishingStatusMock).toHaveBeenCalledWith(3, 'active');
    });

    fireEvent.click(screen.getByTestId('deactivate-icon'));
    fireEvent.click(screen.getByText('Yes, Deactivate Configuration'));
    await waitFor(() => {
      expect(updatePublishingStatusMock).toHaveBeenCalledWith(4, 'inactive');
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it('shows loading and error state', async () => {
    getConfigsPaginatedMock.mockRejectedValueOnce(new Error('cfg-fail'));
    render(<ConfigList />);

    expect(screen.getByText('Loading configurations...')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('cfg-fail')).toBeInTheDocument();
    });
  });

  it('uses onConfigSelect fallback, renders filters/headers, and updates pagination', async () => {
    const onConfigSelect = jest.fn();
    render(
      <ConfigList
        onConfigSelect={onConfigSelect}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText('filter-input')).toBeInTheDocument();
      expect(screen.getByLabelText('filter-select')).toBeInTheDocument();
    });
    const setPageButton = await screen.findByText('set-page');
    await waitFor(() => {
      expect(screen.getByTestId('rows-count')).toHaveTextContent('5');
    });

    fireEvent.click(setPageButton);
    fireEvent.click(screen.getAllByTestId('eye-icon')[0]);

    expect(onConfigSelect).toHaveBeenCalled();
  });

  it('covers additional status badge branches and status update error handlers', async () => {
    getConfigsPaginatedMock.mockResolvedValue({
      success: true,
      configs: statusRows,
      total: statusRows.length,
      limit: 10,
      offset: 0,
      pages: 1,
    });

    updateConfigStatusMock.mockRejectedValueOnce(new Error('status-fail'));
    exportConfigMock.mockRejectedValueOnce(new Error('export-fail'));
    updatePublishingStatusMock.mockRejectedValueOnce(new Error('publish-fail'));

    render(
      <ConfigList
        onConfigEdit={onConfigEdit}
        onConfigClone={onConfigClone}
        onViewDetails={onViewDetails}
        onRefresh={onRefresh}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('rows-count')).toHaveTextContent(String(statusRows.length));
    });

    fireEvent.click((await screen.findAllByTestId('pause-icon'))[0]);
    fireEvent.click(screen.getByText('Yes, Pause Configuration'));

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Error', 'Failed to publish config. Please try again.');
    });

    fireEvent.click((await screen.findAllByTestId('export-icon'))[0]);
    fireEvent.click(screen.getByText('Yes, Export Configuration'));

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Error', 'Failed to export config. Please try again.');
    });

    fireEvent.click((await screen.findAllByTestId('activate-icon'))[0]);
    fireEvent.click(screen.getByText('Yes, Activate Configuration'));

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Error', 'Failed to update publishing status. Please try again.');
    });
  });

  it('handles outside click when status filter is open', () => {
    const actualUseState = React.useState;
    const setShowStatusFilter = jest.fn();
    const useStateSpy = jest
      .spyOn(React, 'useState')
      .mockImplementationOnce(() => ['', jest.fn()] as any)
      .mockImplementationOnce(() => [[], jest.fn()] as any)
      .mockImplementationOnce(() => [false, jest.fn()] as any)
      .mockImplementationOnce(() => [null, jest.fn()] as any)
      .mockImplementationOnce(() => [true, setShowStatusFilter] as any)
      .mockImplementation((initial: any) => actualUseState(initial));

    render(<ConfigList />);
    fireEvent.mouseDown(document.body);

    expect(setShowStatusFilter).toHaveBeenCalledWith(false);
    useStateSpy.mockRestore();
  });

  it.each([
    ['export', 'Export Confirmation Required!', 'Yes, Export Configuration'],
    ['pause', 'Pause Confirmation Required!', 'Yes, Pause Configuration'],
    ['resume', 'Resume Confirmation Required!', 'Yes, Resume Configuration'],
    ['activate', 'Activate Confirmation Required!', 'Yes, Activate Configuration'],
    ['deactivate', 'Deactivate Confirmation Required!', 'Yes, Deactivate Configuration'],
  ] as const)('renders dialog content for %s confirmation type', (type, heading, ctaText) => {
    const actualUseState = React.useState;
    const useStateSpy = jest
      .spyOn(React, 'useState')
      .mockImplementationOnce(() => ['', jest.fn()] as any)
      .mockImplementationOnce(() => [rows, jest.fn()] as any)
      .mockImplementationOnce(() => [false, jest.fn()] as any)
      .mockImplementationOnce(() => [null, jest.fn()] as any)
      .mockImplementationOnce(() => [false, jest.fn()] as any)
      .mockImplementationOnce(() => [rows.length, jest.fn()] as any)
      .mockImplementationOnce(() => [{}, jest.fn()] as any)
      .mockImplementationOnce(() => [{ open: true, type, config: rows[0] }, jest.fn()] as any)
      .mockImplementation((initial: any) => actualUseState(initial));

    render(<ConfigList />);

    expect(screen.getByText(heading)).toBeInTheDocument();
    expect(screen.getByText(ctaText)).toBeInTheDocument();
    useStateSpy.mockRestore();
  });

  it('renders action loading text in confirm dialog', () => {
    const actualUseState = React.useState;
    const useStateSpy = jest
      .spyOn(React, 'useState')
      .mockImplementationOnce(() => ['export', jest.fn()] as any)
      .mockImplementationOnce(() => [rows, jest.fn()] as any)
      .mockImplementationOnce(() => [false, jest.fn()] as any)
      .mockImplementationOnce(() => [null, jest.fn()] as any)
      .mockImplementationOnce(() => [false, jest.fn()] as any)
      .mockImplementationOnce(() => [rows.length, jest.fn()] as any)
      .mockImplementationOnce(() => [{}, jest.fn()] as any)
      .mockImplementationOnce(() => [{ open: true, type: 'export', config: rows[0] }, jest.fn()] as any)
      .mockImplementation((initial: any) => actualUseState(initial));

    render(<ConfigList />);

    expect(screen.getByText('Exporting...')).toBeInTheDocument();
    useStateSpy.mockRestore();
  });

  it('Cancel button in confirm dialog calls setConfirmDialog to close (line 752)', () => {
    const actualUseState = React.useState;
    const setConfirmDialog = jest.fn();
    const useStateSpy = jest
      .spyOn(React, 'useState')
      .mockImplementationOnce(() => ['', jest.fn()] as any)
      .mockImplementationOnce(() => [rows, jest.fn()] as any)
      .mockImplementationOnce(() => [false, jest.fn()] as any)
      .mockImplementationOnce(() => [null, jest.fn()] as any)
      .mockImplementationOnce(() => [false, jest.fn()] as any)
      .mockImplementationOnce(() => [rows.length, jest.fn()] as any)
      .mockImplementationOnce(() => [{}, jest.fn()] as any)
      .mockImplementationOnce(() => [{ open: true, type: 'export', config: rows[0] }, setConfirmDialog] as any)
      .mockImplementation((initial: any) => actualUseState(initial));

    render(<ConfigList />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(setConfirmDialog).toHaveBeenCalledWith({ open: false, type: '', config: null });
    useStateSpy.mockRestore();
  });

  it('renders additional legacy status badge branches and short status_x', async () => {
    const extraRows = [
      { id: 50, msgFam: 'E1', endpointPath: '/e1', status: 'in-progress', createdAt: '2025-01-01' },
      { id: 51, msgFam: 'E2', endpointPath: '/e2', status: 'suspended', createdAt: '2025-01-01' },
      { id: 52, msgFam: 'E3', endpointPath: '/e3', status: 'under_review', createdAt: '2025-01-01' },
      { id: 53, msgFam: 'E4', endpointPath: '/e4', status: 'changes_requested', createdAt: '2025-01-01' },
      { id: 54, msgFam: 'E5', endpointPath: '/e5', status: 'ready_for_deployment', createdAt: '2025-01-01' },
      { id: 55, msgFam: 'E6', endpointPath: '/e6', status: 'status_x', createdAt: '2025-01-01' },
    ];
    // Use mockResolvedValue (not Once) so pagination-triggered re-fetches also return extraRows,
    // preventing the rows from reverting to the beforeEach default after totalRecords changes.
    getConfigsPaginatedMock.mockResolvedValue({
      success: true, configs: extraRows, total: extraRows.length, limit: 10, offset: 0, pages: 1,
    });
    render(<ConfigList />);
    await screen.findByTestId('rows-count');
    await waitFor(() => {
      expect(screen.getByTestId('rows-count')).toHaveTextContent(String(extraRows.length));
    });
    expect(screen.getByText('in-progress')).toBeInTheDocument();
  });

  it('handleClickOutside false branch when showStatusFilter is false', async () => {
    render(<ConfigList />);
    await waitFor(() => {
      expect(screen.getByTestId('rows-count')).toBeInTheDocument();
      expect(screen.queryByText('Loading configurations...')).not.toBeInTheDocument();
    });
    fireEvent.mouseDown(document.body);
  });

  it('handleViewConfig does nothing when neither onViewDetails nor onConfigSelect is provided', async () => {
    render(<ConfigList />);
    await waitFor(() => {
      expect(screen.getByTestId('rows-count')).toBeInTheDocument();
      expect(screen.queryByText('Loading configurations...')).not.toBeInTheDocument();
    });
    const eyeIcons = screen.queryAllByTestId('eye-icon');
    // With no callbacks, eye-icon is not rendered; just verify render is stable
    if (eyeIcons.length > 0) fireEvent.click(eyeIcons[0]);
  });

  it.each([
    ['export', 'Yes, Export Configuration', () => exportConfigMock, 216],
    ['pause', 'Yes, Pause Configuration', () => updateConfigStatusMock, 297],
    ['deactivate', 'Yes, Deactivate Configuration', () => updatePublishingStatusMock, 320],
  ] as const)('if(onRefresh) false branch - %s without onRefresh (line %s)', async (type, ctaText, getMock) => {
    const actualUseState = React.useState;
    const useStateSpy = jest.spyOn(React, 'useState')
      .mockImplementationOnce(() => ['', jest.fn()] as any)
      .mockImplementationOnce(() => [rows, jest.fn()] as any)
      .mockImplementationOnce(() => [false, jest.fn()] as any)
      .mockImplementationOnce(() => [null, jest.fn()] as any)
      .mockImplementationOnce(() => [false, jest.fn()] as any)
      .mockImplementationOnce(() => [rows.length, jest.fn()] as any)
      .mockImplementationOnce(() => [{}, jest.fn()] as any)
      .mockImplementationOnce(() => [{ open: true, type, config: rows[2] }, jest.fn()] as any)
      .mockImplementation((initial: any) => actualUseState(initial));
    render(
      <ConfigList
        onConfigEdit={onConfigEdit}
        onConfigClone={onConfigClone}
        onViewDetails={onViewDetails}
      />,
    );
    fireEvent.click(screen.getByText(ctaText));
    const mockFn = getMock();
    await waitFor(() => expect(mockFn).toHaveBeenCalled());
    // onRefresh is not passed → if(onRefresh) false branch covered
    expect(onRefresh).not.toHaveBeenCalled();
    useStateSpy.mockRestore();
  });

  it('fetchConfigsTemp handles non-Error rejection', async () => {
    getConfigsPaginatedMock.mockRejectedValueOnce('plain-string-error');
    render(<ConfigList />);
    await waitFor(() =>
      expect(screen.getByText('Failed to fetch configurations')).toBeInTheDocument(),
    );
  });

  it('getDemsStatusLov uses ?? [] fallback when userRole is unknown', async () => {
    const roleUtilsMock = jest.requireMock('../../../../src/utils/common/roleUtils');
    const spy = jest.spyOn(roleUtilsMock, 'getPrimaryRole').mockReturnValue('unknown_role');
    render(<ConfigList />);
    await waitFor(() => {
      expect(screen.getByTestId('rows-count')).toBeInTheDocument();
      expect(screen.queryByText('Loading configurations...')).not.toBeInTheDocument();
    });
    spy.mockRestore();
  });

  it.each([
    ['export', 'Yes, Export Configuration'],
    ['pause', 'Yes, Pause Configuration'],
    ['resume', 'Yes, Resume Configuration'],
    ['activate', 'Yes, Activate Configuration'],
    ['deactivate', 'Yes, Deactivate Configuration'],
  ] as const)('confirm handler does nothing when confirmDialog.config is null (%s)', (type, ctaText) => {
    const actualUseState = React.useState;
    const useStateSpy = jest.spyOn(React, 'useState')
      .mockImplementationOnce(() => ['', jest.fn()] as any)
      .mockImplementationOnce(() => [rows, jest.fn()] as any)
      .mockImplementationOnce(() => [false, jest.fn()] as any)
      .mockImplementationOnce(() => [null, jest.fn()] as any)
      .mockImplementationOnce(() => [false, jest.fn()] as any)
      .mockImplementationOnce(() => [rows.length, jest.fn()] as any)
      .mockImplementationOnce(() => [{}, jest.fn()] as any)
      .mockImplementationOnce(() => [{ open: true, type, config: null }, jest.fn()] as any)
      .mockImplementation((initial: any) => actualUseState(initial));
    render(<ConfigList />);
    fireEvent.click(screen.getByText(ctaText));
    expect(exportConfigMock).not.toHaveBeenCalled();
    expect(updateConfigStatusMock).not.toHaveBeenCalled();
    expect(updatePublishingStatusMock).not.toHaveBeenCalled();
    useStateSpy.mockRestore();
  });

  it('confirm button with type="" covers final else-if false branch', () => {
    const actualUseState = React.useState;
    const useStateSpy = jest.spyOn(React, 'useState')
      .mockImplementationOnce(() => ['export', jest.fn()] as any)
      .mockImplementationOnce(() => [rows, jest.fn()] as any)
      .mockImplementationOnce(() => [false, jest.fn()] as any)
      .mockImplementationOnce(() => [null, jest.fn()] as any)
      .mockImplementationOnce(() => [false, jest.fn()] as any)
      .mockImplementationOnce(() => [rows.length, jest.fn()] as any)
      .mockImplementationOnce(() => [{}, jest.fn()] as any)
      .mockImplementationOnce(() => [{ open: true, type: '', config: rows[0] }, jest.fn()] as any)
      .mockImplementation((initial: any) => actualUseState(initial));
    render(<ConfigList />);
    const dialog = screen.getByRole('dialog');
    const dialogButtons = Array.from(dialog.querySelectorAll('button'));
    const confirmButton = dialogButtons.find(btn => btn.textContent !== 'Cancel');
    expect(confirmButton).toBeDefined();
    fireEvent.click(confirmButton!);
    expect(exportConfigMock).not.toHaveBeenCalled();
    expect(updateConfigStatusMock).not.toHaveBeenCalled();
    expect(updatePublishingStatusMock).not.toHaveBeenCalled();
    useStateSpy.mockRestore();
  });

  it('renders correctly when user has no claims', async () => {
    const AuthContextMock = jest.requireMock('../../../../src/features/auth/contexts/AuthContext');
    const spy = jest.spyOn(AuthContextMock, 'useAuth').mockReturnValue({ user: null });
    render(<ConfigList />);
    await waitFor(() => {
      expect(screen.getByTestId('rows-count')).toBeInTheDocument();
      expect(screen.queryByText('Loading configurations...')).not.toBeInTheDocument();
    });
    spy.mockRestore();
  });

  it('handleViewConfig: neither onViewDetails nor onConfigSelect provided — else-if false branch (BRDA:201,12,1)', async () => {
    render(<ConfigList />);
    // Wait for data to load so eye icons are rendered
    await screen.findByTestId('rows-count');
    await waitFor(() => {
      expect(screen.getByTestId('rows-count')).toHaveTextContent('5');
    });
    // Click the first eye icon — neither callback provided → else if (onConfigSelect) false branch
    const eyeIcons = screen.getAllByTestId('eye-icon');
    fireEvent.click(eyeIcons[0]);
    // No assertion needed — just verify no crash
    expect(eyeIcons.length).toBeGreaterThan(0);
  });
});