import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const showSuccessMock = jest.fn();
const showErrorMock = jest.fn();
const submitCronJobMock = jest.fn();
const getErrorMessageMock = jest.fn();
const mockUseAuth = jest.fn();
const isApproverMock = jest.fn();
const setValueMock = jest.fn();
const resetMock = jest.fn();
const setEditFormDataMock = jest.fn();
const unsubscribeMock = jest.fn();

let mockCronExpression = '0 0 * * *';
let mockErrors: any = {};
let mockIsValid = true;
let mockFormValues: any = {
  name: ' Nightly Batch ',
  cronExpression: '0 0 * * *',
  iterations: 3,
};

const watchMock = jest.fn((arg?: any) => {
  if (typeof arg === 'function') {
    arg({ ...mockFormValues, name: 'Updated Schedule Name' });
    return { unsubscribe: unsubscribeMock };
  }
  if (arg === 'cronExpression') {
    return mockCronExpression;
  }
  return mockFormValues;
});

jest.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (cb: any) => () => cb(mockFormValues),
    watch: watchMock,
    setValue: setValueMock,
    reset: resetMock,
    formState: {
      errors: mockErrors,
      isValid: mockIsValid,
    },
  }),
}));

jest.mock('react-js-cron', () => ({
  Cron: ({ setValue }: any) => (
    <button type="button" onClick={() => setValue('15 1 * * *')}>
      cron-picker
    </button>
  ),
}));

jest.mock('cronstrue', () => ({
  __esModule: true,
  default: {
    toString: (expr: string) => `Humanized(${expr})`,
  },
}));

jest.mock('../../../../../src/shared/components/FormFields.jsx', () => ({
  NumberInputField: ({ name, disabled }: any) => (
    <input aria-label={name} disabled={disabled} defaultValue="1" />
  ),
  AlphaNumericInputFieldWithSpaces: ({ label, disabled }: any) => (
    <input
      aria-label={typeof label === 'string' ? label : 'job-name'}
      disabled={disabled}
      defaultValue="Nightly Batch"
    />
  ),
}));

jest.mock('../../../../../src/shared/components/ValidationError', () => ({
  __esModule: true,
  default: ({ message }: any) => <div>{message}</div>,
}));

jest.mock('../../../../../src/shared/providers/ToastProvider', () => ({
  useToast: () => ({
    showSuccess: showSuccessMock,
    showError: showErrorMock,
  }),
}));

jest.mock('../../../../../src/features/auth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../../../../src/utils/common/roleUtils', () => ({
  isApprover: (claims: string[]) => isApproverMock(claims),
}));

jest.mock('../../../../../src/features/cron/handlers', () => ({
  submitCronJob: (...args: any[]) => submitCronJobMock(...args),
  getErrorMessage: (...args: any[]) => getErrorMessageMock(...args),
  CRON_JOB_SUCCESS_MESSAGES: {
    CREATED: (name: string) => `Schedule \"${name}\" created successfully!`,
  },
}));

import CronJobForm from '../../../../../src/features/cron/components/CronJobForm';

describe('features/cron/components/CronJobForm/index.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCronExpression = '0 0 * * *';
    mockErrors = {};
    mockIsValid = true;
    mockFormValues = {
      name: ' Nightly Batch ',
      cronExpression: '0 0 * * *',
      iterations: 3,
    };
    mockUseAuth.mockReturnValue({ user: { claims: ['editor'] } });
    isApproverMock.mockReturnValue(false);
    submitCronJobMock.mockResolvedValue({ success: true });
    getErrorMessageMock.mockReturnValue('Unable to create cron schedule');
  });

  it('submits create flow and shows success toast', async () => {
    const onJobCreated = jest.fn();

    const { container } = render(
      <CronJobForm onCancel={jest.fn()} onJobCreated={onJobCreated} />,
    );

    fireEvent.submit(container.querySelector('[component="form"]') as Element);

    await waitFor(() => {
      expect(submitCronJobMock).toHaveBeenCalledWith(mockFormValues);
    });
    expect(showSuccessMock).toHaveBeenCalledWith(
      'Schedule "Nightly Batch" created successfully!',
    );
    expect(onJobCreated).toHaveBeenCalled();
  });

  it('shows error toast when create request fails', async () => {
    submitCronJobMock.mockRejectedValueOnce(new Error('boom'));

    const { container } = render(<CronJobForm onCancel={jest.fn()} />);

    fireEvent.submit(container.querySelector('[component="form"]') as Element);

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith(
        'Unable to create cron schedule',
      );
    });
  });

  it('renders cron helper text and updates cron expression from cron picker', () => {
    render(<CronJobForm onCancel={jest.fn()} />);

    expect(screen.getByText('Generated Expression:')).toBeInTheDocument();
    expect(screen.getByText('0 0 * * *')).toBeInTheDocument();
    expect(screen.getByText('Humanized(0 0 * * *)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'cron-picker' }));
    expect(setValueMock).toHaveBeenCalledWith('cronExpression', '15 1 * * *');
  });

  it('resets form when edit and view data are provided and syncs edit watch callback', () => {
    const { unmount } = render(
      <CronJobForm
        onCancel={jest.fn()}
        editFormData={
          { id: 'e-1', name: 'edit-name', cronExpression: '0 5 * * *' } as any
        }
        viewFormData={
          { id: 'v-1', name: 'view-name', cron: '*/5 * * * *' } as any
        }
        setEditFormData={setEditFormDataMock}
      />,
    );

    expect(resetMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'e-1', name: 'edit-name' }),
    );
    expect(resetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'v-1',
        name: 'view-name',
        cronExpression: '*/5 * * * *',
      }),
    );
    expect(setEditFormDataMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Updated Schedule Name' }),
    );

    unmount();
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it('shows validation errors when form has invalid fields', () => {
    mockErrors = {
      name: { message: 'Name is required' },
      iterations: { message: 'Iterations are required' },
      cronExpression: { message: 'Cron expression is required' },
    };

    render(<CronJobForm onCancel={jest.fn()} />);

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Iterations are required')).toBeInTheDocument();
    expect(screen.getByText('Cron expression is required')).toBeInTheDocument();
  });

  it('renders approver actions and calls approve/reject handlers', () => {
    mockUseAuth.mockReturnValue({ user: { claims: ['approver'] } });
    isApproverMock.mockReturnValue(true);
    const onApprove = jest.fn();
    const onReject = jest.fn();

    render(
      <CronJobForm
        onCancel={jest.fn()}
        viewFormData={
          { id: 'sched-1', status: 'STATUS_03_UNDER_REVIEW' } as any
        }
        onApprove={onApprove}
        onReject={onReject}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    expect(onReject).toHaveBeenCalledWith('sched-1');
    expect(onApprove).toHaveBeenCalledWith('sched-1');
  });

  it('renders send-for-approval and comments in view mode', () => {
    const handleSendForApproval = jest.fn();

    render(
      <CronJobForm
        onCancel={jest.fn()}
        handleSendForApproval={handleSendForApproval}
        viewFormData={
          {
            id: 'sched-2',
            status: 'STATUS_05_REJECTED',
            comments: 'Please update cron settings',
            cron: '0 1 * * *',
          } as any
        }
      />,
    );

    expect(screen.getByText('Comments')).toBeInTheDocument();
    expect(screen.getByText('Please update cron settings')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Send for Approval' }));
    expect(handleSendForApproval).toHaveBeenCalled();
  });

  it('renders edit update button and cancel callback', () => {
    mockIsValid = false;
    const handleSaveEdit = jest.fn();
    const onCancel = jest.fn();

    render(
      <CronJobForm
        onCancel={onCancel}
        editFormData={{ id: 'sched-3', status: 'STATUS_01_IN_PROGRESS' } as any}
        handleSaveEdit={handleSaveEdit}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Update' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(handleSaveEdit).toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });

  it('uses default schedule name when form name is undefined', async () => {
    mockUseAuth.mockReturnValue({ user: { claims: [] } });
    isApproverMock.mockReturnValue(false);
    const origFormValues = mockFormValues;
    mockFormValues = { cronExpression: '0 0 * * *', iterations: 1 };
    submitCronJobMock.mockResolvedValue(undefined);

    const { container } = render(<CronJobForm onCancel={jest.fn()} />);
    fireEvent.submit(container.querySelector('[component="form"]') as Element);

    await waitFor(() => {
      expect(showSuccessMock).toHaveBeenCalled();
    });
    mockFormValues = origFormValues;
  });

  it('shows fallback validation messages when error has no message', () => {
    mockUseAuth.mockReturnValue({ user: { claims: [] } });
    isApproverMock.mockReturnValue(false);
    const origErrors = mockErrors;
    mockErrors = {
      name: { type: 'required' },
      cronExpression: { type: 'required' },
      iterations: { type: 'required' },
    };

    render(<CronJobForm />);

    expect(screen.getByText('Invalid input')).toBeInTheDocument();
    expect(screen.getByText('Invalid cron expression')).toBeInTheDocument();
    expect(
      screen.getByText('Invalid number of iterations'),
    ).toBeInTheDocument();
    mockErrors = origErrors;
  });
});
