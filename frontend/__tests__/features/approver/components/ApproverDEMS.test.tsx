import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const approveConfigMock = jest.fn();
const rejectConfigMock = jest.fn();

const showSuccessMock = jest.fn();
const showErrorMock = jest.fn();

const useAuthMock = jest.fn();
const capturedConfigListProps: any[] = [];

jest.mock('../../../../src/features/config/services/configApi', () => ({
  configApi: {
    approveConfig: (...args: any[]) => approveConfigMock(...args),
    rejectConfig: (...args: any[]) => rejectConfigMock(...args),
  },
}));

jest.mock('../../../../src/shared/providers/ToastProvider', () => ({
  useToast: () => ({
    showSuccess: showSuccessMock,
    showError: showErrorMock,
  }),
}));

jest.mock('../../../../src/features/auth/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

jest.mock('../../../../src/features/config/components/ConfigList', () => ({
  ConfigList: (props: any) => {
    capturedConfigListProps.push(props);
    return (
      <div data-testid="config-list">
        <button data-testid="approve-btn" onClick={() => props.onApprove(7)}>
          approve
        </button>
        <button
          data-testid="reject-btn"
          onClick={() => props.onReject({ id: 8, name: 'Rejected Config' })}
        >
          reject
        </button>
        <button
          data-testid="view-btn"
          onClick={() => props.onViewDetails({ id: 9, name: 'Viewed Config' })}
        >
          view
        </button>
      </div>
    );
  },
}));

jest.mock('../../../../src/features/approver/components/ApproverConfigDetailsModal', () => ({
  ApproverConfigDetailsModal: (props: any) => (
    <div data-testid="approver-modal">
      <div data-testid="modal-open">{String(props.isOpen)}</div>
      <div data-testid="modal-config-id">{props.config?.id ?? 'none'}</div>
      <button data-testid="modal-close" onClick={props.onClose}>modal-close</button>
      <button data-testid="modal-approve" onClick={() => props.onApprove(10)}>modal-approve</button>
      <button
        data-testid="modal-reject"
        onClick={() => props.onReject({ id: 11, name: 'Modal Reject' })}
      >
        modal-reject
      </button>
    </div>
  ),
}));

import ApproverDEMS from '../../../../src/features/approver/components/ApproverDEMS';

describe('features/approver/components/ApproverDEMS.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedConfigListProps.length = 0;
    useAuthMock.mockReturnValue({ user: { email: 'approver@tazama.io', username: 'approver-user' } });
    (global as any).prompt = jest.fn(() => 'reason from prompt');
  });

  it('renders main layout and triggers back callback', () => {
    const onBack = jest.fn();
    render(<ApproverDEMS onBack={onBack} />);

    expect(screen.getAllByText('Dynamic Event Monitoring Service').length).toBeGreaterThan(0);
    expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
    expect(screen.getByTestId('config-list')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Back to Dashboard'));
    expect(onBack).toHaveBeenCalledTimes(1);

    expect(capturedConfigListProps.at(-1)?.showPendingApprovals).toBe(true);
  });

  it('approves config and handles success, message error, default error, and catch branches', async () => {
    const onBack = jest.fn();
    render(<ApproverDEMS onBack={onBack} />);

    approveConfigMock.mockResolvedValueOnce({ success: true });
    fireEvent.click(screen.getByTestId('approve-btn'));
    await waitFor(() => {
      expect(showSuccessMock).toHaveBeenCalledWith('Configuration approved successfully and sent for deployment');
    });

    approveConfigMock.mockResolvedValueOnce({ success: false, message: 'approve-message' });
    fireEvent.click(screen.getByTestId('approve-btn'));
    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('approve-message');
    });

    approveConfigMock.mockResolvedValueOnce({ success: false });
    fireEvent.click(screen.getByTestId('approve-btn'));
    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Failed to approve configuration');
    });

    approveConfigMock.mockRejectedValueOnce(new Error('approve-crash'));
    fireEvent.click(screen.getByTestId('approve-btn'));
    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Failed to approve configuration. Please try again.');
    });
  });

  it('rejects config and handles prompt fallback and all result branches', async () => {
    const onBack = jest.fn();
    const first = render(<ApproverDEMS onBack={onBack} />);

    rejectConfigMock.mockResolvedValueOnce({ success: true });
    fireEvent.click(screen.getByTestId('reject-btn'));
    await waitFor(() => {
      expect(showSuccessMock).toHaveBeenCalledWith('Configuration rejected and returned to editor for changes');
    });
    expect(rejectConfigMock).toHaveBeenCalledWith(8, 'approver@tazama.io', 'reason from prompt');

    first.unmount();
    (global as any).prompt = jest.fn(() => null);
    useAuthMock.mockReturnValue({ user: { username: 'fallback-user' } });
    const second = render(<ApproverDEMS onBack={onBack} />);
    rejectConfigMock.mockResolvedValueOnce({ success: false, message: 'reject-message' });
    fireEvent.click(screen.getByTestId('reject-btn'));
    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('reject-message');
    });
    expect(rejectConfigMock).toHaveBeenCalledWith(8, 'fallback-user', 'Configuration rejected by approver');

    second.unmount();
    useAuthMock.mockReturnValue({ user: null });
    (global as any).prompt = jest.fn(() => null);
    render(<ApproverDEMS onBack={onBack} />);
    rejectConfigMock.mockResolvedValueOnce({ success: false });
    fireEvent.click(screen.getByTestId('reject-btn'));
    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Failed to reject configuration');
    });
    expect(rejectConfigMock).toHaveBeenCalledWith(8, 'system', 'Configuration rejected by approver');

    rejectConfigMock.mockRejectedValueOnce(new Error('reject-crash'));
    fireEvent.click(screen.getByTestId('reject-btn'));
    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Failed to reject configuration. Please try again.');
    });
  });

  it('opens details modal, closes it, and exercises modal approve/reject handlers', async () => {
    const onBack = jest.fn();
    render(<ApproverDEMS onBack={onBack} />);

    fireEvent.click(screen.getByTestId('view-btn'));
    expect(screen.getByTestId('approver-modal')).toBeInTheDocument();
    expect(screen.getByTestId('modal-config-id')).toHaveTextContent('9');

    approveConfigMock.mockResolvedValueOnce({ success: true });
    fireEvent.click(screen.getByTestId('modal-approve'));
    await waitFor(() => {
      expect(approveConfigMock).toHaveBeenCalledWith(10);
    });

    rejectConfigMock.mockResolvedValueOnce({ success: true });
    fireEvent.click(screen.getByTestId('modal-reject'));
    await waitFor(() => {
      expect(rejectConfigMock).toHaveBeenCalledWith(11, 'approver@tazama.io', 'reason from prompt');
    });

    fireEvent.click(screen.getByTestId('modal-close'));
    expect(screen.queryByTestId('approver-modal')).not.toBeInTheDocument();
  });
});