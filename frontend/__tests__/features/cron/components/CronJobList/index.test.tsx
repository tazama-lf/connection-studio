import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const useCronJobListMock = jest.fn();
const cronJobTableColumnsMock = jest.fn();

let lastColumnsArgs: any;
let lastModalProps: any;

jest.mock('../../../../../src/features/cron/hooks/useCronJobList', () => ({
  useCronJobList: () => useCronJobListMock(),
}));

jest.mock('@common/Tables/CustomTable', () => (props: any) => (
  <div data-testid="custom-table">rows:{props.rows.length}</div>
));

jest.mock('@shared/components/ui/Loader', () => () => <div data-testid="loader">loading</div>);

jest.mock('../../../../../src/features/cron/components/CronJobTableColumns', () => ({
  CronJobTableColumns: (args: any) => {
    lastColumnsArgs = args;
    cronJobTableColumnsMock(args);
    return [];
  },
}));

jest.mock('../../../../../src/features/cron/components/CronJobModal', () => (props: any) => {
  lastModalProps = props;
  return props.isOpen ? (
    <div data-testid="cron-modal">
      <button onClick={props.onClose}>modal-close</button>
      <button onClick={props.onReject}>modal-reject</button>
      <button onClick={() => props.setEditFormData?.({
        id: 9,
        name: 'edit-name',
        iterations: 3,
      })}>modal-set-edit-data</button>
    </div>
  ) : null;
});

jest.mock('../../../../../src/shared/components/JobRejectionDialog', () => ({
  JobRejectionDialog: (props: any) => props.isOpen ? (
    <div data-testid="reject-dialog">
      <div data-testid="reject-job-name">{props.jobName}</div>
      <button onClick={props.onClose}>reject-close</button>
      <button onClick={() => props.onConfirm('needs fixes')}>reject-confirm</button>
    </div>
  ) : null,
}));

jest.mock('../../../../../src/features/cron/components/ConfirmationDialog', () => (props: any) => props.open ? (
  <div data-testid="confirm-dialog">
    <div data-testid="confirm-job-name">{props.jobName}</div>
    <div data-testid="confirm-action-loading">{props.actionLoading}</div>
    <button onClick={props.onClose}>confirm-close</button>
    <button onClick={() => props.onConfirm(props.type)}>confirm-action</button>
  </div>
) : null);

import CronJobList from '../../../../../src/features/cron/components/CronJobList';

const buildHookData = (overrides: Record<string, unknown> = {}) => ({
  schedules: [{ id: 1, name: 'job-1' }],
  loading: false,
  error: '',
  selectedSchedule: { id: 2, name: 'selected-job' },
  editForm: { id: 2, name: 'edit-job' },
  actionLoading: '',
  userIsEditor: true,
  userIsExporter: true,
  userIsApprover: true,
  userIsPublisher: true,
  userRole: 'editor',
  pagination: { setPage: jest.fn(), page: 0, limit: 10, totalRecords: 1 },
  searchingFilters: {},
  confirmDialog: { open: false, type: '', schedule: null },
  setSearchingFilters: jest.fn(),
  setEditForm: jest.fn(),
  setConfirmDialog: jest.fn(),
  handleRejectionConfirm: jest.fn().mockResolvedValue(undefined),
  handleExportConfirm: jest.fn().mockResolvedValue(undefined),
  handleView: jest.fn(),
  handleEdit: jest.fn(),
  handleSaveEdit: jest.fn().mockResolvedValue(undefined),
  handleSendForApproval: jest.fn().mockResolvedValue(undefined),
  handleApprovalConfirm: jest.fn().mockResolvedValue(undefined),
  handleApproveClick: jest.fn(),
  handleApproveConfirm: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('features/cron/components/CronJobList/index.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastColumnsArgs = null;
    lastModalProps = null;
  });

  it('renders loader during loading/actionLoading and shows error banner', () => {
    useCronJobListMock.mockReturnValue(buildHookData({ loading: true, error: 'bad things' }));

    render(<CronJobList />);

    expect(screen.getByText('bad things')).toBeInTheDocument();
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('renders table and handles view/edit/export callbacks from columns', () => {
    const hookData = buildHookData();
    useCronJobListMock.mockReturnValue(hookData);

    render(<CronJobList />);

    expect(screen.getByTestId('custom-table')).toHaveTextContent('rows:1');
    expect(lastColumnsArgs).toBeTruthy();

    act(() => {
      lastColumnsArgs.onView({ id: 1, name: 'v' });
    });
    expect(hookData.handleView).toHaveBeenCalled();
    expect(screen.getByTestId('cron-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByText('modal-close'));
    expect(screen.queryByTestId('cron-modal')).not.toBeInTheDocument();

    act(() => {
      lastColumnsArgs.onEdit({ id: 1, name: 'e' });
    });
    expect(hookData.handleEdit).toHaveBeenCalled();
    expect(screen.getByTestId('cron-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByText('modal-set-edit-data'));
    expect(hookData.setEditForm).toHaveBeenCalledWith({
      id: 9,
      name: 'edit-name',
      cronExpression: '',
      iterations: 3,
      startDate: '',
      endDate: '',
      status: '',
      schedule_status: '',
      comments: '',
    });

    lastColumnsArgs.onExport({ id: 1, name: 'x' });
    expect(hookData.setConfirmDialog).toHaveBeenCalledWith({
      open: true,
      type: 'export',
      schedule: { id: 1, name: 'x' },
    });
  });

  it('handles rejection flow and confirm dialog actions', async () => {
    const hookData = buildHookData({
      confirmDialog: { open: true, type: 'approval', schedule: { name: 'A' } },
    });
    useCronJobListMock.mockReturnValue(hookData);

    render(<CronJobList />);

    act(() => {
      lastColumnsArgs.onView({ id: 2, name: 'selected-job' });
    });
    expect(screen.getByTestId('cron-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByText('modal-reject'));
    expect(screen.getByTestId('reject-dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByText('reject-close'));
    expect(screen.queryByTestId('reject-dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('modal-reject'));
    expect(screen.getByTestId('reject-dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByText('reject-confirm'));
    await waitFor(() => {
      expect(hookData.handleRejectionConfirm).toHaveBeenCalledWith('needs fixes');
    });

    fireEvent.click(screen.getByText('confirm-action'));
    await waitFor(() => {
      expect(hookData.handleApprovalConfirm).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('confirm-close'));
    expect(hookData.setConfirmDialog).toHaveBeenCalledWith({ open: false, type: '', schedule: null });
  });

  it('runs export confirmation action branch', async () => {
    const hookData = buildHookData({
      confirmDialog: { open: true, type: 'export', schedule: { name: 'E' } },
    });
    useCronJobListMock.mockReturnValue(hookData);

    render(<CronJobList />);

    fireEvent.click(screen.getByText('confirm-action'));

    await waitFor(() => {
      expect(hookData.handleExportConfirm).toHaveBeenCalled();
    });
  });

  it('runs approve confirmation branch and closes modal', async () => {
    const hookData = buildHookData({
      confirmDialog: { open: true, type: 'approve', schedule: { name: 'AP' } },
    });
    useCronJobListMock.mockReturnValue(hookData);

    render(<CronJobList />);

    act(() => {
      lastColumnsArgs.onView({ id: 2, name: 'selected-job' });
    });
    expect(screen.getByTestId('cron-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByText('confirm-action'));

    await waitFor(() => {
      expect(hookData.handleApproveConfirm).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('cron-modal')).not.toBeInTheDocument();
  });

  it('uses unknown schedule fallback and empty actionLoading when values are absent', () => {
    const hookData = buildHookData({
      selectedSchedule: null,
      actionLoading: 'idle',
      confirmDialog: { open: true, type: 'export', schedule: null },
    });
    useCronJobListMock.mockReturnValue(hookData);

    render(<CronJobList />);

    act(() => {
      lastColumnsArgs.onView({ id: 1, name: 'noop' });
    });
    fireEvent.click(screen.getByText('modal-reject'));

    expect(screen.getByTestId('reject-job-name')).toHaveTextContent('Unknown Schedule');
    expect(screen.getByTestId('confirm-job-name')).toHaveTextContent('this cron job');
    expect(screen.getByTestId('confirm-action-loading')).toHaveTextContent('');
  });

  it('passes actionLoading through when set to export/approval/approve', () => {
    const hookData = buildHookData({
      actionLoading: 'export',
      confirmDialog: { open: true, type: 'export', schedule: { name: 'N' } },
    });
    useCronJobListMock.mockReturnValue(hookData);

    render(<CronJobList />);
    expect(screen.getByTestId('confirm-action-loading')).toHaveTextContent('export');
  });
});