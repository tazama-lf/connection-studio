import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';

const handleSaveJobMock = jest.fn();
const handleRejectionConfirmMock = jest.fn();
const handleSendForApprovalConfirmMock = jest.fn();
const handleApproveWithCommentMock = jest.fn();
const handleExportConfirmMock = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('../../../../../../src/features/auth/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../../../../../src/features/data-enrichment/handlers', () => ({
  handleRejectionConfirm: (...args: any[]) => handleRejectionConfirmMock(...args),
  handleSendForApprovalConfirm: (...args: any[]) => handleSendForApprovalConfirmMock(...args),
  handleInputChange: jest.fn((_field: any, _value: any, setEditedJob: any) => {
    setEditedJob((prev: any) => ({ ...prev, endpoint_name: 'Updated Name' }));
  }),
  handleSaveJob: (...args: any[]) => handleSaveJobMock(...args),
  handleExportConfirm: (...args: any[]) => handleExportConfirmMock(...args),
  handleApproveWithComment: (...args: any[]) => handleApproveWithCommentMock(...args),
}));

jest.mock('lucide-react', () => {
  const Icon = (props: any) => <svg data-testid="icon" {...props} />;
  return {
    Calendar: Icon,
    Check: Icon,
    CheckCircle: Icon,
    Clock: Icon,
    Copy: Icon,
    Database: Icon,
    Download: Icon,
    Globe: Icon,
    Hash: Icon,
    MessageSquare: Icon,
    Save: Icon,
    Send: Icon,
    Upload: Icon,
    XCircle: Icon,
    X: Icon,
  };
});

jest.mock('../../../../../../src/shared/components/JobRejectionDialog', () => ({
  JobRejectionDialog: ({ isOpen, onClose, onConfirm }: any) =>
    isOpen ? (
      <div data-testid="rejection-dialog">
        <button onClick={onClose}>Close Rejection</button>
        <button onClick={() => onConfirm('Insufficient data')}>Confirm Rejection</button>
      </div>
    ) : null,
}));

import JobDetailsModal from '../../../../../../src/features/data-enrichment/components/JobDetailsModal';

describe('features/data-enrichment/components/JobDetailsModal/index.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { claims: ['editor'] } });
    handleSaveJobMock.mockResolvedValue(undefined);
    handleSendForApprovalConfirmMock.mockImplementation(
      (_job, onSendForApproval, onClose, setShowApprovalConfirmDialog) => {
        onSendForApproval?.('job-1', 'PULL');
        onClose?.();
        setShowApprovalConfirmDialog(false);
      },
    );
    handleApproveWithCommentMock.mockResolvedValue(undefined);
    handleExportConfirmMock.mockResolvedValue(undefined);
  });

  it('returns null when closed', () => {
    const { container } = render(
      <JobDetailsModal
        isOpen={false}
        onClose={jest.fn()}
        job={null}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders endpoint details and triggers save in edit mode', () => {
    render(
      <JobDetailsModal
        isOpen
        onClose={jest.fn()}
        editMode
        onSave={jest.fn()}
        job={{
          id: 'job-1',
          endpoint_name: 'Pull Job',
          description: 'demo',
          version: 'v1',
          table_name: 'tbl',
          mode: 'append',
          type: 'pull',
          source_type: 'SFTP',
          schedule_name: 'Nightly',
        } as any}
      />,
    );

    expect(screen.getByText('Edit Data Enrichment Endpoint')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pull Job')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Update'));
    expect(handleSaveJobMock).toHaveBeenCalled();
  });

  it('shows fallback text when opened with missing job', () => {
    render(<JobDetailsModal isOpen onClose={jest.fn()} job={null} />);

    expect(screen.getByText('Job details not found')).toBeInTheDocument();
  });

  it('supports clone mode and submits clone payload', () => {
    const onClone = jest.fn();

    render(
      <JobDetailsModal
        isOpen
        cloneMode
        onClose={jest.fn()}
        onClone={onClone}
        job={{
          id: 'job-2',
          endpoint_name: 'Clone Me',
          description: 'clone source',
          version: 'v2',
          table_name: 'clone_table',
          mode: 'append',
          type: 'pull',
          source_type: 'SFTP',
          schedule_name: 'Nightly',
        } as any}
      />, 
    );

    fireEvent.click(screen.getByText('Create Clone'));

    expect(onClone).toHaveBeenCalledWith(expect.objectContaining({ id: 'job-2' }));
  });

  it('allows editing pull clone values before submitting clone payload', () => {
    const onClone = jest.fn();

    render(
      <JobDetailsModal
        isOpen
        cloneMode
        onClose={jest.fn()}
        onClone={onClone}
        job={{
          id: 'job-2b',
          endpoint_name: 'Clone Pull',
          description: 'clone source',
          version: 'v5',
          table_name: 'clone_table',
          mode: 'append',
          type: 'pull',
          source_type: 'SFTP',
        } as any}
      />,
    );

    fireEvent.change(screen.getByDisplayValue('Clone Pull'), {
      target: { value: 'Renamed clone' },
    });
    fireEvent.change(screen.getByDisplayValue('v5'), {
      target: { value: 'v6' },
    });

    fireEvent.click(screen.getByText('Create Clone'));

    expect(onClone).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint_name: 'Updated Name',
      }),
    );
  });

  it('opens send-for-approval dialog and uses handler callback flow', () => {
    const onClose = jest.fn();
    const onSendForApproval = jest.fn();

    render(
      <JobDetailsModal
        isOpen
        onClose={onClose}
        onSendForApproval={onSendForApproval}
        job={{
          id: 'job-1',
          endpoint_name: 'Approval Job',
          status: 'STATUS_01_IN_PROGRESS',
          type: 'pull',
          description: 'x',
          version: 'v1',
          table_name: 'tbl',
          mode: 'append',
        } as any}
      />,
    );

    fireEvent.click(screen.getByText('Send for Approval'));
    fireEvent.click(screen.getByText('Yes, Send for Approval'));

    expect(handleSendForApprovalConfirmMock).toHaveBeenCalled();
    expect(onSendForApproval).toHaveBeenCalledWith('job-1', 'PULL');
    expect(onClose).toHaveBeenCalled();
  });

  it('shows loading state while fetching details', () => {
    render(
      <JobDetailsModal
        isOpen
        isLoading
        onClose={jest.fn()}
        job={{ id: 'job-loading', endpoint_name: 'Loading Job' } as any}
      />,
    );

    expect(screen.getByText('Loading job details...')).toBeInTheDocument();
  });

  it('supports exporter flow and confirms export through handler', () => {
    mockUseAuth.mockReturnValue({ user: { claims: ['exporter'] } });
    const onExport = jest.fn();

    render(
      <JobDetailsModal
        isOpen
        onClose={jest.fn()}
        onExport={onExport}
        job={{
          id: 'job-export',
          endpoint_name: 'Export Job',
          status: 'STATUS_04_APPROVED',
          type: 'pull',
        } as any}
      />,
    );

    fireEvent.click(screen.getByText('Export'));
    fireEvent.click(screen.getByText('Yes, Export Job'));

    expect(handleExportConfirmMock).toHaveBeenCalled();
  });

  it('supports approver approve and reject actions', () => {
    mockUseAuth.mockReturnValue({ user: { claims: ['approver'] } });
    const onApprove = jest.fn();
    const onReject = jest.fn();

    render(
      <JobDetailsModal
        isOpen
        onClose={jest.fn()}
        onApprove={onApprove}
        onReject={onReject}
        job={{
          id: 'job-review',
          endpoint_name: 'Review Job',
          status: 'STATUS_03_UNDER_REVIEW',
          type: 'pull',
        } as any}
      />,
    );

    fireEvent.click(screen.getByText('Reject'));
    expect(screen.getByTestId('rejection-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Confirm Rejection'));
    fireEvent.click(screen.getByText('Close Rejection'));

    fireEvent.click(screen.getByText('Approve'));
    fireEvent.change(screen.getByLabelText('Comment (optional)'), {
      target: { value: 'looks good' },
    });
    fireEvent.click(screen.getByText('Yes, Approve Job'));

    expect(handleRejectionConfirmMock).toHaveBeenCalled();
    expect(handleApproveWithCommentMock).toHaveBeenCalled();
  });

  it('handles edit mode updates for push fields', () => {
    render(
      <JobDetailsModal
        isOpen
        onClose={jest.fn()}
        editMode
        onSave={jest.fn()}
        job={{
          id: 'job-push-edit',
          endpoint_name: 'Push Job',
          description: 'push demo',
          version: 'v7',
          table_name: 'ledger_entries',
          mode: 'replace',
          type: 'push',
          path: '/push/path',
          status: 'STATUS_01_IN_PROGRESS',
        } as any}
      />, 
    );

    fireEvent.change(screen.getByDisplayValue('/push/path'), {
      target: { value: '/new/path' },
    });
    fireEvent.change(screen.getByDisplayValue('push demo'), {
      target: { value: 'updated push demo' },
    });
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'append' },
    });
    fireEvent.change(screen.getByDisplayValue('ledger_entries'), {
      target: { value: 'ledger_new' },
    });

    expect(screen.getByDisplayValue('Updated Name')).toBeInTheDocument();
  });

  it('closes each confirmation dialog from cancel actions', () => {
    const onClose = jest.fn();

    mockUseAuth.mockReturnValue({ user: { claims: ['exporter'] } });
    const { rerender } = render(
      <JobDetailsModal
        isOpen
        onClose={onClose}
        onExport={jest.fn()}
        job={{
          id: 'job-export-cancel',
          endpoint_name: 'Export Cancel',
          status: 'STATUS_04_APPROVED',
          type: 'pull',
        } as any}
      />, 
    );

    fireEvent.click(screen.getByText('Export'));
    let dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Yes, Export Job')).not.toBeInTheDocument();

    mockUseAuth.mockReturnValue({ user: { claims: ['editor'] } });
    rerender(
      <JobDetailsModal
        isOpen
        onClose={onClose}
        onSendForApproval={jest.fn()}
        job={{
          id: 'job-approval-cancel',
          endpoint_name: 'Approval Cancel',
          status: 'STATUS_01_IN_PROGRESS',
          type: 'pull',
        } as any}
      />, 
    );

    fireEvent.click(screen.getByText('Send for Approval'));
    dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Yes, Send for Approval')).not.toBeInTheDocument();

    mockUseAuth.mockReturnValue({ user: { claims: ['approver'] } });
    rerender(
      <JobDetailsModal
        isOpen
        onClose={onClose}
        onApprove={jest.fn()}
        job={{
          id: 'job-approve-cancel',
          endpoint_name: 'Approve Cancel',
          status: 'STATUS_03_UNDER_REVIEW',
          type: 'pull',
        } as any}
      />, 
    );

    fireEvent.click(screen.getByText('Approve'));
    dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Yes, Approve Job')).not.toBeInTheDocument();
  });

  it('renders HTTP connection details and request headers', () => {
    render(
      <JobDetailsModal
        isOpen
        onClose={jest.fn()}
        job={{
          id: 'job-http',
          endpoint_name: 'HTTP Pull',
          type: 'pull',
          source_type: 'HTTP',
          status: 'STATUS_01_IN_PROGRESS',
          connection: JSON.stringify({
            url: 'https://example.com/items',
            headers: { Authorization: 'Bearer abc' },
          }),
        } as any}
      />,
    );

    expect(screen.getByText('Connection Details (HTTP)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://example.com/items')).toBeInTheDocument();
    expect(screen.getByText('Headers')).toBeInTheDocument();
    expect(screen.getByText(/Authorization/)).toBeInTheDocument();
  });

  it('renders SFTP connection and file settings for pull jobs', () => {
    render(
      <JobDetailsModal
        isOpen
        onClose={jest.fn()}
        job={{
          id: 'job-sftp',
          endpoint_name: 'SFTP Pull',
          type: 'pull',
          status: 'STATUS_01_IN_PROGRESS',
          source_type: 'SFTP',
          connection: {
            host: 'sftp.example.com',
            port: 22,
            user_name: 'svc-user',
            auth_type: 'USERNAME_PASSWORD',
          },
          file: {
            path: '/in/file.csv',
            file_type: 'CSV',
            delimiter: ',',
          },
        } as any}
      />,
    );

    expect(screen.getByText('Connection Details (SFTP)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('sftp.example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('22')).toBeInTheDocument();
    expect(screen.getByText('File Settings')).toBeInTheDocument();
    expect(screen.getByDisplayValue('/in/file.csv')).toBeInTheDocument();
  });

  it('falls back to generic footer actions for users without workflow actions', () => {
    mockUseAuth.mockReturnValue({ user: { claims: ['viewer'] } });

    render(
      <JobDetailsModal
        isOpen
        onClose={jest.fn()}
        job={{
          id: 'job-viewer',
          endpoint_name: 'Viewer Job',
          type: 'pull',
          status: 'STATUS_04_APPROVED',
        } as any}
      />,
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.queryByText('Send for Approval')).not.toBeInTheDocument();
    expect(screen.queryByText('Reject')).not.toBeInTheDocument();
    expect(screen.queryByText('Export')).not.toBeInTheDocument();
  });

  it('does not render clone actions when onClone callback is missing', () => {
    render(
      <JobDetailsModal
        isOpen
        cloneMode
        onClose={jest.fn()}
        job={{
          id: 'job-no-clone-callback',
          endpoint_name: 'Clone Disabled',
          type: 'pull',
        } as any}
      />,
    );

    expect(screen.queryByText('Create Clone')).not.toBeInTheDocument();
  });

  it('handles invalid JSON HTTP connection string gracefully', () => {
    render(
      <JobDetailsModal
        isOpen
        onClose={jest.fn()}
        job={{
          id: 'job-http-invalid',
          endpoint_name: 'HTTP Invalid JSON',
          type: 'pull',
          source_type: 'HTTP',
          connection: 'not-valid-json',
          status: 'STATUS_01_IN_PROGRESS',
        } as any}
      />,
    );
    // HTTP section hidden because JSON.parse throws (line 682 return null)
    expect(screen.queryByText('HTTP URL')).not.toBeInTheDocument();
    // Connection Details header still appears (Connection Details section renders)
    expect(screen.getByText('Connection Details (HTTP)')).toBeInTheDocument();
  });

  it('handles invalid JSON SFTP connection string gracefully', () => {
    render(
      <JobDetailsModal
        isOpen
        onClose={jest.fn()}
        job={{
          id: 'job-sftp-invalid',
          endpoint_name: 'SFTP Invalid JSON',
          type: 'pull',
          source_type: 'SFTP',
          connection: 'not-valid-json',
          status: 'STATUS_01_IN_PROGRESS',
        } as any}
      />,
    );
    // SFTP section hidden because JSON.parse throws (line 775 return null)
    expect(screen.queryByText('Host')).not.toBeInTheDocument();
    // Connection Details header still appears
    expect(screen.getByText('Connection Details (SFTP)')).toBeInTheDocument();
  });

  it('renders SFTP fields when connection is a valid JSON string', () => {
    render(
      <JobDetailsModal
        isOpen
        onClose={jest.fn()}
        job={{
          id: 'job-sftp-str',
          endpoint_name: 'SFTP String Conn',
          type: 'pull',
          source_type: 'SFTP',
          status: 'STATUS_01_IN_PROGRESS',
          connection: JSON.stringify({
            host: 'sftp.example.com',
            port: 22,
            user_name: 'svc-user',
            auth_type: 'USERNAME_PASSWORD',
          }),
        } as any}
      />,
    );

    expect(screen.getByText('Connection Details (SFTP)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('sftp.example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('22')).toBeInTheDocument();
    expect(screen.getByDisplayValue('svc-user')).toBeInTheDocument();
    expect(screen.getByDisplayValue('USERNAME_PASSWORD')).toBeInTheDocument();
  });
});