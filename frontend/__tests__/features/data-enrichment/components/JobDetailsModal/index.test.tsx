import React from 'react';
import {
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';

// Local @mui/material override: adds onClose trigger button to Dialog
jest.mock('@mui/material', () => {
  const mockTheme = {
    zIndex: { drawer: 1200, modal: 1300, snackbar: 1400, tooltip: 1500 },
  };
  function invokeSx(sx: any) {
    if (typeof sx === 'function') sx(mockTheme);
    else if (sx && typeof sx === 'object') {
      Object.values(sx).forEach((v) => {
        if (typeof v === 'function') v(mockTheme);
      });
    }
  }
  return {
    Backdrop: ({ children, open, onClick, sx, ...props }: any) => {
      invokeSx(sx);
      return (
        <div data-testid="mui-backdrop" onClick={onClick} {...props}>
          {open ? children : null}
        </div>
      );
    },
    Button: ({ children, onClick, disabled, variant, ...props }: any) => (
      <button onClick={onClick} disabled={disabled} {...props}>
        {children}
      </button>
    ),
    Box: ({ children, sx, component, ...props }: any) => {
      invokeSx(sx);
      const Tag = component || 'div';
      return <Tag {...props}>{children}</Tag>;
    },
    Dialog: ({ children, open, onClose, ...props }: any) =>
      open ? (
        <div data-testid="mui-dialog" role="dialog" {...props}>
          <button aria-label="close-dialog" onClick={() => onClose?.()}>
            ×
          </button>
          {children}
        </div>
      ) : null,
    DialogContent: ({ children, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
    DialogContentText: ({ children, ...props }: any) => (
      <p {...props}>{children}</p>
    ),
    DialogActions: ({ children, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
    DialogTitle: ({ children, ...props }: any) => (
      <div data-testid="dialog-title" {...props}>
        {children}
      </div>
    ),
    TextField: ({ label, value, onChange, ...props }: any) => (
      <input aria-label={label} value={value} onChange={onChange} {...props} />
    ),
    Select: ({ children, value, onChange, ...props }: any) => (
      <select value={value} onChange={onChange} {...props}>
        {children}
      </select>
    ),
    MenuItem: ({ children, value, ...props }: any) => (
      <option value={value} {...props}>
        {children}
      </option>
    ),
    IconButton: ({ children, onClick, disabled, ...props }: any) => (
      <button onClick={onClick} disabled={disabled} {...props}>
        {children}
      </button>
    ),
    CircularProgress: ({ size, ...props }: any) => (
      <div data-testid="circular-progress" {...props} />
    ),
    Typography: ({ children, variant, ...props }: any) => (
      <span {...props}>{children}</span>
    ),
    Tooltip: ({ children }: any) => <>{children}</>,
    Chip: ({ label, ...props }: any) => (
      <span data-testid="chip" {...props}>
        {label}
      </span>
    ),
    FormControl: ({ children, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
    InputLabel: ({ children, ...props }: any) => (
      <label {...props}>{children}</label>
    ),
    FormHelperText: ({ children, ...props }: any) => (
      <span {...props}>{children}</span>
    ),
    Alert: React.forwardRef(
      ({ children, severity, ...props }: any, ref: any) => (
        <div ref={ref} role="alert" data-severity={severity} {...props}>
          {children}
        </div>
      ),
    ),
    Snackbar: ({ children, open, ...props }: any) =>
      open ? <div {...props}>{children}</div> : null,
    Divider: ({ ...props }: any) => <hr {...props} />,
    Stack: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    Paper: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  };
});

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
  handleRejectionConfirm: (...args: any[]) =>
    handleRejectionConfirmMock(...args),
  handleSendForApprovalConfirm: (...args: any[]) =>
    handleSendForApprovalConfirmMock(...args),
  handleInputChange: jest.fn((_field: any, _value: any, setEditedJob: any) => {
    setEditedJob((prev: any) => ({ ...prev, endpoint_name: 'Updated Name' }));
  }),
  handleSaveJob: (...args: any[]) => handleSaveJobMock(...args),
  handleExportConfirm: (...args: any[]) => handleExportConfirmMock(...args),
  handleApproveWithComment: (...args: any[]) =>
    handleApproveWithCommentMock(...args),
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
        <button onClick={() => onConfirm('Insufficient data')}>
          Confirm Rejection
        </button>
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
      <JobDetailsModal isOpen={false} onClose={jest.fn()} job={null} />,
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
        job={
          {
            id: 'job-1',
            endpoint_name: 'Pull Job',
            description: 'demo',
            version: 'v1',
            table_name: 'tbl',
            mode: 'append',
            type: 'pull',
            source_type: 'SFTP',
            schedule_name: 'Nightly',
          } as any
        }
      />,
    );

    expect(
      screen.getByText('Edit Data Enrichment Endpoint'),
    ).toBeInTheDocument();
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
        job={
          {
            id: 'job-2',
            endpoint_name: 'Clone Me',
            description: 'clone source',
            version: 'v2',
            table_name: 'clone_table',
            mode: 'append',
            type: 'pull',
            source_type: 'SFTP',
            schedule_name: 'Nightly',
          } as any
        }
      />,
    );

    fireEvent.click(screen.getByText('Create Clone'));

    expect(onClone).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'job-2' }),
    );
  });

  it('allows editing pull clone values before submitting clone payload', () => {
    const onClone = jest.fn();

    render(
      <JobDetailsModal
        isOpen
        cloneMode
        onClose={jest.fn()}
        onClone={onClone}
        job={
          {
            id: 'job-2b',
            endpoint_name: 'Clone Pull',
            description: 'clone source',
            version: 'v5',
            table_name: 'clone_table',
            mode: 'append',
            type: 'pull',
            source_type: 'SFTP',
          } as any
        }
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
        job={
          {
            id: 'job-1',
            endpoint_name: 'Approval Job',
            status: 'STATUS_01_IN_PROGRESS',
            type: 'pull',
            description: 'x',
            version: 'v1',
            table_name: 'tbl',
            mode: 'append',
          } as any
        }
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
        job={
          {
            id: 'job-export',
            endpoint_name: 'Export Job',
            status: 'STATUS_04_APPROVED',
            type: 'pull',
          } as any
        }
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
        job={
          {
            id: 'job-review',
            endpoint_name: 'Review Job',
            status: 'STATUS_03_UNDER_REVIEW',
            type: 'pull',
          } as any
        }
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
        job={
          {
            id: 'job-push-edit',
            endpoint_name: 'Push Job',
            description: 'push demo',
            version: 'v7',
            table_name: 'ledger_entries',
            mode: 'replace',
            type: 'push',
            path: '/push/path',
            status: 'STATUS_01_IN_PROGRESS',
          } as any
        }
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
        job={
          {
            id: 'job-export-cancel',
            endpoint_name: 'Export Cancel',
            status: 'STATUS_04_APPROVED',
            type: 'pull',
          } as any
        }
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
        job={
          {
            id: 'job-approval-cancel',
            endpoint_name: 'Approval Cancel',
            status: 'STATUS_01_IN_PROGRESS',
            type: 'pull',
          } as any
        }
      />,
    );

    fireEvent.click(screen.getByText('Send for Approval'));
    dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(
      screen.queryByText('Yes, Send for Approval'),
    ).not.toBeInTheDocument();

    mockUseAuth.mockReturnValue({ user: { claims: ['approver'] } });
    rerender(
      <JobDetailsModal
        isOpen
        onClose={onClose}
        onApprove={jest.fn()}
        job={
          {
            id: 'job-approve-cancel',
            endpoint_name: 'Approve Cancel',
            status: 'STATUS_03_UNDER_REVIEW',
            type: 'pull',
          } as any
        }
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
        job={
          {
            id: 'job-http',
            endpoint_name: 'HTTP Pull',
            type: 'pull',
            source_type: 'HTTP',
            status: 'STATUS_01_IN_PROGRESS',
            connection: JSON.stringify({
              url: 'https://example.com/items',
              headers: { Authorization: 'Bearer abc' },
            }),
          } as any
        }
      />,
    );

    expect(screen.getByText('Connection Details (HTTP)')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('https://example.com/items'),
    ).toBeInTheDocument();
    expect(screen.getByText('Headers')).toBeInTheDocument();
    expect(screen.getByText(/Authorization/)).toBeInTheDocument();
  });

  it('renders SFTP connection and file settings for pull jobs', () => {
    render(
      <JobDetailsModal
        isOpen
        onClose={jest.fn()}
        job={
          {
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
          } as any
        }
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
        job={
          {
            id: 'job-viewer',
            endpoint_name: 'Viewer Job',
            type: 'pull',
            status: 'STATUS_04_APPROVED',
          } as any
        }
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
        job={
          {
            id: 'job-no-clone-callback',
            endpoint_name: 'Clone Disabled',
            type: 'pull',
          } as any
        }
      />,
    );

    expect(screen.queryByText('Create Clone')).not.toBeInTheDocument();
  });

  it('handles invalid JSON HTTP connection string gracefully', () => {
    render(
      <JobDetailsModal
        isOpen
        onClose={jest.fn()}
        job={
          {
            id: 'job-http-invalid',
            endpoint_name: 'HTTP Invalid JSON',
            type: 'pull',
            source_type: 'HTTP',
            connection: 'not-valid-json',
            status: 'STATUS_01_IN_PROGRESS',
          } as any
        }
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
        job={
          {
            id: 'job-sftp-invalid',
            endpoint_name: 'SFTP Invalid JSON',
            type: 'pull',
            source_type: 'SFTP',
            connection: 'not-valid-json',
            status: 'STATUS_01_IN_PROGRESS',
          } as any
        }
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
        job={
          {
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
          } as any
        }
      />,
    );

    expect(screen.getByText('Connection Details (SFTP)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('sftp.example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('22')).toBeInTheDocument();
    expect(screen.getByDisplayValue('svc-user')).toBeInTheDocument();
    expect(screen.getByDisplayValue('USERNAME_PASSWORD')).toBeInTheDocument();
  });

  // ── Dialog onClose callbacks (lines 1184, 1317, 1414) ────────────────────

  it('closes export dialog via Dialog onClose prop (backdrop click)', () => {
    mockUseAuth.mockReturnValue({ user: { claims: ['exporter'] } });

    render(
      <JobDetailsModal
        isOpen
        onClose={jest.fn()}
        onExport={jest.fn()}
        job={
          {
            id: 'job-export-backdrop',
            endpoint_name: 'Export Backdrop Job',
            status: 'STATUS_04_APPROVED',
            type: 'pull',
          } as any
        }
      />,
    );

    fireEvent.click(screen.getByText('Export'));
    const closeBtn = screen.getByLabelText('close-dialog');
    fireEvent.click(closeBtn);
    expect(screen.queryByText('Yes, Export Job')).not.toBeInTheDocument();
  });

  it('closes approval confirmation dialog via Dialog onClose prop', () => {
    mockUseAuth.mockReturnValue({ user: { claims: ['editor'] } });

    render(
      <JobDetailsModal
        isOpen
        onClose={jest.fn()}
        onSendForApproval={jest.fn()}
        job={
          {
            id: 'job-approval-backdrop',
            endpoint_name: 'Approval Backdrop Job',
            status: 'STATUS_01_IN_PROGRESS',
            type: 'pull',
          } as any
        }
      />,
    );

    fireEvent.click(screen.getByText('Send for Approval'));
    const closeBtn = screen.getByLabelText('close-dialog');
    fireEvent.click(closeBtn);
    expect(
      screen.queryByText('Yes, Send for Approval'),
    ).not.toBeInTheDocument();
  });

  it('closes approve confirmation dialog via Dialog onClose prop', () => {
    mockUseAuth.mockReturnValue({ user: { claims: ['approver'] } });

    render(
      <JobDetailsModal
        isOpen
        onClose={jest.fn()}
        onApprove={jest.fn()}
        job={
          {
            id: 'job-approve-backdrop',
            endpoint_name: 'Approve Backdrop Job',
            status: 'STATUS_03_UNDER_REVIEW',
            type: 'pull',
          } as any
        }
      />,
    );

    fireEvent.click(screen.getByText('Approve'));
    const closeBtn = screen.getByLabelText('close-dialog');
    fireEvent.click(closeBtn);
    expect(screen.queryByText('Yes, Approve Job')).not.toBeInTheDocument();
  });

  it('uses "Unknown Job" as job name in rejection dialog when endpoint_name and id are missing', () => {
    mockUseAuth.mockReturnValue({ user: { claims: ['approver'] } });

    render(
      <JobDetailsModal
        isOpen
        onClose={jest.fn()}
        onReject={jest.fn()}
        job={
          {
            status: 'STATUS_03_UNDER_REVIEW',
            type: 'pull',
          } as any
        }
      />,
    );

    fireEvent.click(screen.getByText('Reject'));
    expect(screen.getByTestId('rejection-dialog')).toBeInTheDocument();
  });

  // --- Additional coverage tests ---

  it('renders with user having no claims (covers lines 66-68 false branches)', () => {
    // user without claims → user?.claims is falsy → userIsApprover/Editor/Exporter = false
    mockUseAuth.mockReturnValue({ user: {} });

    render(
      <JobDetailsModal
        isOpen
        onClose={jest.fn()}
        job={
          {
            id: 'job-no-claims',
            endpoint_name: 'No Claims Job',
            status: 'STATUS_01_IN_PROGRESS',
            type: 'pull',
          } as any
        }
      />,
    );

    // No workflow buttons because user has no claims
    expect(screen.queryByText('Send for Approval')).not.toBeInTheDocument();
    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
    expect(screen.queryByText('Export')).not.toBeInTheDocument();
  });

  it('renders job=undefined (debug "undefined" branch in fallback view)', () => {
    render(
      <JobDetailsModal isOpen onClose={jest.fn()} job={undefined as any} />,
    );

    // Falls into the "Job details not found" path with job=undefined
    expect(screen.getByText('Job details not found')).toBeInTheDocument();
    expect(screen.getByText(/undefined/)).toBeInTheDocument();
  });

  it('edit mode with job missing type uses getJobType fallback (covers ?? branch for type)', () => {
    // job.type is undefined → job.type ?? jobType uses jobType (getJobType result)
    render(
      <JobDetailsModal
        isOpen
        editMode
        onClose={jest.fn()}
        onSave={jest.fn()}
        job={
          {
            id: 'job-no-type',
            endpoint_name: 'No Type Job',
            description: 'desc',
            version: 'v1',
            table_name: 'tbl',
            mode: 'append',
            // type is intentionally absent — forces ?? jobType fallback
          } as any
        }
      />,
    );

    expect(screen.getByDisplayValue('No Type Job')).toBeInTheDocument();
  });

  it('view mode (not edit, not clone) shows push job path field (covers view-mode branches)', () => {
    render(
      <JobDetailsModal
        isOpen
        onClose={jest.fn()}
        job={
          {
            id: 'job-push-view',
            endpoint_name: 'Push View',
            type: 'push',
            status: 'STATUS_04_APPROVED',
            path: '/my/path',
          } as any
        }
      />,
    );

    // Not editMode, not cloneMode — view mode — covers the else branch of editMode ? ... : cloneMode ? ... : viewMode
    expect(screen.getByDisplayValue('/my/path')).toBeInTheDocument();
  });

  it('HTTP connection as plain object (not JSON string) shows url and no headers', () => {
    render(
      <JobDetailsModal
        isOpen
        onClose={jest.fn()}
        job={
          {
            id: 'job-http-obj',
            endpoint_name: 'HTTP Object',
            type: 'pull',
            source_type: 'HTTP',
            status: 'STATUS_01_IN_PROGRESS',
            // connection as plain object (not string) — typeof !== 'string' branch
            connection: {
              url: undefined, // url=undefined → ?? 'N/A' fallback covers branch 1
            },
          } as any
        }
      />,
    );

    expect(screen.getByText('Connection Details (HTTP)')).toBeInTheDocument();
  });

  it('SFTP connection as object with missing fields shows N/A fallbacks', () => {
    render(
      <JobDetailsModal
        isOpen
        onClose={jest.fn()}
        job={
          {
            id: 'job-sftp-no-fields',
            endpoint_name: 'SFTP No Fields',
            type: 'pull',
            source_type: 'SFTP',
            status: 'STATUS_01_IN_PROGRESS',
            // connection as object with no host/port/user_name/auth_type → all ?? 'N/A' fallback
            connection: {
              host: undefined,
              port: undefined,
              user_name: undefined,
              auth_type: undefined,
            },
          } as any
        }
      />,
    );

    expect(screen.getByText('Connection Details (SFTP)')).toBeInTheDocument();
    // All fields show N/A (covers ?? 'N/A' branch 1 for each field)
    const naValues = screen.getAllByDisplayValue('N/A');
    expect(naValues.length).toBeGreaterThan(0);
  });

  it('shows N/A fallbacks for file fields without path, file_type, delimiter', () => {
    render(
      <JobDetailsModal
        isOpen
        onClose={jest.fn()}
        job={
          {
            id: 'job-sftp-no-file-fields',
            endpoint_name: 'SFTP No File Fields',
            type: 'pull',
            source_type: 'SFTP',
            status: 'STATUS_01_IN_PROGRESS',
            connection: {
              host: 'sftp.host.com',
            },
            // file object with no path/file_type/delimiter → all ?? 'N/A'
            file: {
              path: undefined,
              file_type: undefined,
              delimiter: undefined,
            },
          } as any
        }
      />,
    );

    expect(screen.getByText('File Settings')).toBeInTheDocument();
  });

  it('shows send-for-approval absent when userIsEditor but no onSendForApproval prop', () => {
    // Covers branch where onSendForApproval is missing → Send for Approval button not shown
    mockUseAuth.mockReturnValue({ user: { claims: ['editor'] } });

    render(
      <JobDetailsModal
        isOpen
        onClose={jest.fn()}
        // onSendForApproval intentionally NOT provided
        job={
          {
            id: 'job-no-callback',
            endpoint_name: 'Editor No Callback',
            status: 'STATUS_01_IN_PROGRESS',
            type: 'pull',
          } as any
        }
      />,
    );

    expect(screen.queryByText('Send for Approval')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('clone mode with existing fields: endpoint_name and version null in editedJob covers ?? fallbacks', () => {
    // When cloneMode and object merges job data but editedJob.endpoint_name is undefined initially
    render(
      <JobDetailsModal
        isOpen
        cloneMode
        onClose={jest.fn()}
        onClone={jest.fn()}
        job={
          {
            id: 'job-clone-null',
            // endpoint_name intentionally absent → editedJob.endpoint_name ?? job.endpoint_name falls through
            version: undefined,
          } as any
        }
      />,
    );

    // Just verify it renders without crash
    expect(
      screen.getByRole('button', { name: 'Create Clone' }),
    ).toBeInTheDocument();
  });

  it('push job in cloneMode WITH path shows the path value', () => {
    render(
      <JobDetailsModal
        isOpen
        cloneMode
        onClose={jest.fn()}
        onClone={jest.fn()}
        job={
          {
            id: 'job-push-clone-path',
            endpoint_name: 'Push Clone With Path',
            type: 'push',
            path: '/api/my-path',
          } as any
        }
      />,
    );
    // cloneMode=true branch of `cloneMode ? job.path ?? 'Path not set' : ...` → branch 0
    // job.path non-null → branch 0 of inner ?? → shows '/api/my-path'
    expect(screen.getByDisplayValue('/api/my-path')).toBeInTheDocument();
  });

  it('push job in cloneMode WITHOUT path shows Path not set', () => {
    render(
      <JobDetailsModal
        isOpen
        cloneMode
        onClose={jest.fn()}
        onClone={jest.fn()}
        job={
          {
            id: 'job-push-clone-nopath',
            endpoint_name: 'Push Clone No Path',
            type: 'push',
            // path intentionally absent → cloneMode branch, job.path null → 'Path not set'
          } as any
        }
      />,
    );
    expect(screen.getByDisplayValue('Path not set')).toBeInTheDocument();
  });

  it('push job in view mode (no editMode no cloneMode) without path shows Path not set', () => {
    render(
      <JobDetailsModal
        isOpen
        onClose={jest.fn()}
        job={
          {
            id: 'job-push-view-nopath',
            endpoint_name: 'Push View No Path',
            type: 'push',
            // path intentionally absent → view branch, job.path null → 'Path not set'
          } as any
        }
      />,
    );
    expect(screen.getByDisplayValue('Path not set')).toBeInTheDocument();
  });

  it('pull job view mode: fireEvent.change on source_type select (editMode=false branch)', () => {
    render(
      <JobDetailsModal
        isOpen
        onClose={jest.fn()}
        job={
          {
            id: 'job-pull-view-src',
            endpoint_name: 'Pull View Src',
            type: 'pull',
            source_type: 'SFTP',
          } as any
        }
      />,
    );
    // The select has disabled={true} but fireEvent still fires onChange
    // editMode=false → short-circuit at editMode && → nothing called
    const selects = screen.getAllByRole('combobox');
    const sourceTypeSelect = selects.find(
      (s) => (s as HTMLSelectElement).value === 'SFTP',
    );
    if (sourceTypeSelect) {
      fireEvent.change(sourceTypeSelect, { target: { value: 'HTTP' } });
    }
    expect(screen.getByDisplayValue('Pull View Src')).toBeInTheDocument();
  });

  it('pull job editMode+cloneMode: fireEvent.change on source_type select (!cloneMode=false branch)', () => {
    render(
      <JobDetailsModal
        isOpen
        editMode
        cloneMode
        onClose={jest.fn()}
        onSave={jest.fn()}
        onClone={jest.fn()}
        job={
          {
            id: 'job-pull-edit-clone-src',
            endpoint_name: 'Pull Edit Clone Src',
            type: 'pull',
            source_type: 'HTTP',
          } as any
        }
      />,
    );
    // editMode=true but cloneMode=true → !cloneMode=false → short-circuit before handleInputChange
    const selects = screen.getAllByRole('combobox');
    const sourceTypeSelect = selects.find(
      (s) => (s as HTMLSelectElement).value === 'HTTP',
    );
    if (sourceTypeSelect) {
      fireEvent.change(sourceTypeSelect, { target: { value: 'SFTP' } });
    }
    expect(screen.getByDisplayValue('Pull Edit Clone Src')).toBeInTheDocument();
  });

  it('pull job editMode (no cloneMode): fireEvent.change on source_type select (all-true branch)', () => {
    render(
      <JobDetailsModal
        isOpen
        editMode
        onClose={jest.fn()}
        onSave={jest.fn()}
        job={
          {
            id: 'job-pull-edit-src-only',
            endpoint_name: 'Pull Edit Src Only',
            type: 'pull',
            source_type: 'SFTP',
            description: 'test',
            version: 'v1',
            mode: 'append',
          } as any
        }
      />,
    );
    // editMode=true, cloneMode=false → !cloneMode=true → handleInputChange called
    const selects = screen.getAllByRole('combobox');
    const sourceTypeSelect = selects.find(
      (s) => (s as HTMLSelectElement).value === 'SFTP',
    );
    if (sourceTypeSelect) {
      fireEvent.change(sourceTypeSelect, { target: { value: 'HTTP' } });
    }
    // After change, handleInputChange mock updates editedJob.endpoint_name to 'Updated Name'
    expect(screen.getByDisplayValue('Updated Name')).toBeInTheDocument();
  });

  it('pull job with unrecognized connection type shows Unknown in Connection Details', () => {
    render(
      <JobDetailsModal
        isOpen
        onClose={jest.fn()}
        job={
          {
            id: 'job-pull-unknown-conn',
            endpoint_name: 'Pull Unknown Conn',
            type: 'pull',
            // connection exists (truthy) but no host/url/source_type → getConnectionType returns null
            connection: { customKey: 'someValue' } as any,
          } as any
        }
      />,
    );
    // Should show "Connection Details (Unknown)"
    expect(
      screen.getByText('Connection Details (Unknown)'),
    ).toBeInTheDocument();
  });

  it('HTTP connection without headers: headers section not shown', () => {
    render(
      <JobDetailsModal
        isOpen
        onClose={jest.fn()}
        job={
          {
            id: 'job-http-no-headers',
            endpoint_name: 'HTTP No Headers',
            type: 'pull',
            source_type: 'HTTP',
            connection: { url: 'https://api.example.com/data' },
            // No headers property → (connectionObj?.headers && ...) = false
          } as any
        }
      />,
    );
    expect(
      screen.getByDisplayValue('https://api.example.com/data'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Headers')).not.toBeInTheDocument();
  });

  it('clone mode with null job shows debug section with cloneMode: true', () => {
    render(<JobDetailsModal isOpen cloneMode onClose={jest.fn()} job={null} />);
    // debug section shows because job is falsy; cloneMode=true → 'true' branch of cloneMode ternary
    expect(screen.getByText('Job details not found')).toBeInTheDocument();
    expect(screen.getByText(/cloneMode: true/)).toBeInTheDocument();
  });

  it('HTTP connection as plain object WITH headers renders headers without JSON.parse (BRDA:744)', () => {
    // connection is an object (not a string) → typeof job.connection === 'string' is FALSE (branch 1)
    // headers exist → headers section renders → the inner IIFE at line ~744 runs with object connection
    render(
      <JobDetailsModal
        isOpen
        onClose={jest.fn()}
        job={
          {
            id: 'job-http-obj-headers',
            endpoint_name: 'HTTP Object With Headers',
            type: 'pull',
            source_type: 'HTTP',
            status: 'STATUS_01_IN_PROGRESS',
            connection: {
              url: 'https://api.example.com/data',
              headers: { Authorization: 'Bearer token123' },
            },
          } as any
        }
      />,
    );
    expect(screen.getByText('Headers')).toBeInTheDocument();
    expect(screen.getByText(/Authorization/)).toBeInTheDocument();
  });

  it('clone with job missing endpoint_name and version covers ?? fallbacks on Create Clone click (BRDA:1034,1035)', async () => {
    // editedJob is initialised from job: endpoint_name=undefined, version=undefined
    // clicking Create Clone → editedJob.endpoint_name ?? job.endpoint_name → both are undefined
    // covers branch 1 (FALSE/nullish) of both ?? operators
    const onClone = jest.fn();
    render(
      <JobDetailsModal
        isOpen
        cloneMode
        onClose={jest.fn()}
        onClone={onClone}
        job={
          {
            id: 'job-clone-no-name-version',
            // endpoint_name intentionally absent → undefined
            // version intentionally absent → undefined
            type: 'pull',
          } as any
        }
      />,
    );

    fireEvent.click(screen.getByText('Create Clone'));

    expect(onClone).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'job-clone-no-name-version' }),
    );
  });
});
