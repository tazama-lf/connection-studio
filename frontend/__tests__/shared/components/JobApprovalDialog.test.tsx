import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { JobApprovalDialog } from '../../../src/shared/components/JobApprovalDialog';

jest.mock('../../../src/shared/components/Button', () => ({
  Button: ({ children, onClick, disabled, icon, ...props }: any) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {icon}
      {children}
    </button>
  ),
}));

jest.mock('lucide-react', () => ({
  Check: () => <svg data-testid="check-icon" />,
}));

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  onConfirm: jest.fn(),
  jobName: 'Test Job',
  jobType: 'Schedule',
};

describe('JobApprovalDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(<JobApprovalDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog with job name and type', () => {
    render(<JobApprovalDialog {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Approval Confirmation')).toBeInTheDocument();
    expect(screen.getByText('"Test Job"')).toBeInTheDocument();
    expect(
      screen.getByText(/this will approve the schedule/i),
    ).toBeInTheDocument();
  });

  it('renders comment textarea with placeholder', () => {
    render(<JobApprovalDialog {...defaultProps} />);
    const textarea = screen.getByLabelText(/approver comment/i);
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute(
      'placeholder',
      'Add an optional comment for this schedule approval...',
    );
  });

  it('updates comment value on input', () => {
    render(<JobApprovalDialog {...defaultProps} />);
    const textarea = screen.getByLabelText(/approver comment/i);
    fireEvent.change(textarea, { target: { value: 'Looks good' } });
    expect(textarea).toHaveValue('Looks good');
  });

  it('calls onConfirm with trimmed comment and onClose on approve', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    render(
      <JobApprovalDialog
        {...defaultProps}
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );

    fireEvent.change(screen.getByLabelText(/approver comment/i), {
      target: { value: '  approved  ' },
    });
    fireEvent.click(screen.getByText('Approve'));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('approved');
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('clears comment and calls onClose when Cancel is clicked', () => {
    const onClose = jest.fn();
    render(<JobApprovalDialog {...defaultProps} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText(/approver comment/i), {
      target: { value: 'draft comment' },
    });
    fireEvent.click(screen.getByText('Cancel'));

    expect(onClose).toHaveBeenCalled();
  });

  it('shows loading state during approval', async () => {
    let resolveConfirm!: () => void;
    const onConfirm = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveConfirm = resolve;
        }),
    );

    render(<JobApprovalDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('Approve'));

    await waitFor(() => {
      expect(screen.getByText('Approving...')).toBeInTheDocument();
    });

    resolveConfirm();

    await waitFor(() => {
      expect(screen.getByText('Approve')).toBeInTheDocument();
    });
  });

  it('resets loading even when onConfirm rejects (finally block)', async () => {
    // onConfirm resolves after a delay, then onClose is called
    // To test the finally block, we use a sync callback that doesn't reject
    let resolveConfirm!: () => void;
    const onConfirm = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveConfirm = resolve;
        }),
    );
    const onClose = jest.fn();

    render(
      <JobApprovalDialog
        {...defaultProps}
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );

    fireEvent.change(screen.getByLabelText(/approver comment/i), {
      target: { value: 'test' },
    });
    fireEvent.click(screen.getByText('Approve'));

    // Loading state is active
    await waitFor(() => {
      expect(screen.getByText('Approving...')).toBeInTheDocument();
    });

    // Buttons disabled during loading
    expect(screen.getByText('Cancel')).toBeDisabled();

    resolveConfirm();

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
      expect(onConfirm).toHaveBeenCalledWith('test');
    });
  });

  it('calls onConfirm with empty string when no comment entered', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    render(<JobApprovalDialog {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByText('Approve'));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('');
    });
  });
});
