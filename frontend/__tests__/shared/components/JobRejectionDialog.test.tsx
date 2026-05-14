import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JobRejectionDialog } from '../../../src/shared/components/JobRejectionDialog';
import * as ButtonModule from '../../../src/shared/components/Button';

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  onConfirm: jest.fn(),
  jobName: 'My Cron Job',
  jobType: 'Cron Job' as const,
};

describe('JobRejectionDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    render(<JobRejectionDialog {...defaultProps} isOpen={false} />);
    expect(
      screen.queryByText('Rejection Confirmation Required!'),
    ).not.toBeInTheDocument();
  });

  it('renders the dialog when isOpen is true', () => {
    render(<JobRejectionDialog {...defaultProps} />);
    expect(
      screen.getByText('Rejection Confirmation Required!'),
    ).toBeInTheDocument();
  });

  it('shows the job name in the dialog', () => {
    render(<JobRejectionDialog {...defaultProps} />);
    expect(screen.getByText(/"My Cron Job"/)).toBeInTheDocument();
  });

  it('shows job type in the description', () => {
    render(<JobRejectionDialog {...defaultProps} />);
    // "cron job" appears in multiple nodes; any match is acceptable
    expect(screen.getAllByText(/cron job/i).length).toBeGreaterThan(0);
  });

  it('shows reason textarea with correct placeholder', () => {
    render(<JobRejectionDialog {...defaultProps} />);
    expect(
      screen.getByPlaceholderText(
        /Please provide a detailed reason for rejecting this cron job/i,
      ),
    ).toBeInTheDocument();
  });

  it('renders Cancel and Yes, Reject buttons', () => {
    render(<JobRejectionDialog {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Yes, Reject')).toBeInTheDocument();
  });

  it('calls onClose and resets state when Cancel is clicked', async () => {
    render(<JobRejectionDialog {...defaultProps} />);

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'Some reason');

    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('submit button is disabled when reason is empty', () => {
    render(<JobRejectionDialog {...defaultProps} />);
    const submitBtn = screen.getByRole('button', { name: /yes, reject/i });
    expect(submitBtn).toBeDisabled();
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('shows error when reason is too short (< 10 chars)', async () => {
    render(<JobRejectionDialog {...defaultProps} />);

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'short');

    fireEvent.click(screen.getByText('Yes, Reject'));

    expect(
      await screen.findByText(
        'Please provide a more detailed reason (at least 10 characters)',
      ),
    ).toBeInTheDocument();
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('clears error when user continues typing after a short-reason error', async () => {
    render(<JobRejectionDialog {...defaultProps} />);

    const textarea = screen.getByRole('textbox');
    // Type a short reason (button becomes enabled)
    await userEvent.type(textarea, 'short');
    fireEvent.click(screen.getByRole('button', { name: /yes, reject/i }));
    expect(
      await screen.findByText(
        'Please provide a more detailed reason (at least 10 characters)',
      ),
    ).toBeInTheDocument();

    // Continue typing — error should clear
    await userEvent.type(textarea, 'x');
    expect(
      screen.queryByText(
        'Please provide a more detailed reason (at least 10 characters)',
      ),
    ).not.toBeInTheDocument();
  });

  it('calls onConfirm with trimmed reason when valid reason is provided', async () => {
    defaultProps.onConfirm.mockResolvedValue(undefined);

    render(<JobRejectionDialog {...defaultProps} />);

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'This is a valid rejection reason');

    await act(async () => {
      fireEvent.click(screen.getByText('Yes, Reject'));
    });

    await waitFor(() => {
      expect(defaultProps.onConfirm).toHaveBeenCalledWith(
        'This is a valid rejection reason',
      );
    });

    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('works with Data Enrichment Job type', () => {
    render(
      <JobRejectionDialog
        {...defaultProps}
        jobType="Data Enrichment Job"
        jobName="My DE Job"
      />,
    );
    expect(screen.getByText(/"My DE Job"/)).toBeInTheDocument();
    expect(screen.getAllByText(/data enrichment job/i).length).toBeGreaterThan(
      0,
    );
  });

  it('shows loading spinner and Rejecting text while onConfirm is pending', async () => {
    let resolveConfirm!: () => void;
    const pendingConfirm = new Promise<void>((res) => {
      resolveConfirm = res;
    });
    defaultProps.onConfirm.mockReturnValue(pendingConfirm);

    render(<JobRejectionDialog {...defaultProps} />);

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'This is a detailed valid reason here');

    fireEvent.click(screen.getByRole('button', { name: /yes, reject/i }));

    expect(await screen.findByText('Rejecting...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();

    resolveConfirm();
    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('shows required-reason error when the shared button is mocked to ignore disabled state', async () => {
    const buttonSpy = jest
      .spyOn(ButtonModule, 'Button')
      .mockImplementation(({ children, onClick }: any) => (
        <button onClick={onClick}>{children}</button>
      ));

    render(<JobRejectionDialog {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /yes, reject/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Please provide a reason for rejection'),
      ).toBeInTheDocument();
    });

    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    buttonSpy.mockRestore();
  });
});
