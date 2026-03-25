import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const triggerMock = jest.fn();
const getValuesMock = jest.fn();
const setValueMock = jest.fn();
const saveDataEnrichmentJobMock = jest.fn();
const handleUpdateConfirmMock = jest.fn();
const handleEditSendForApprovalConfirmMock = jest.fn();
const loadSchedulesMock = jest.fn();
const showSuccessMock = jest.fn();
const showErrorMock = jest.fn();
const scrollToFirstErrorMock = jest.fn();

let formErrors: Record<string, any> = {};
let watchValues: Record<string, any> = { fileFormat: 'csv', name: 'Pull Job' };
let formValues: Record<string, any> = { name: 'Pull Job' };
let submitMode: 'valid' | 'invalid' = 'valid';

jest.mock('@hookform/resolvers/yup', () => ({
  yupResolver: () => () => ({ values: {}, errors: {} }),
}));

jest.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (onValid: any, onInvalid: any) => () => {
      if (submitMode === 'invalid') {
        onInvalid?.();
        return;
      }
      onValid();
    },
    watch: (name: string) => watchValues[name],
    setValue: (...args: any[]) => setValueMock(...args),
    getValues: (name?: string) => (name ? formValues[name] : formValues),
    trigger: (...args: any[]) => triggerMock(...args),
    formState: { errors: formErrors },
  }),
}));

jest.mock('../../../../../../src/shared/providers/ToastProvider', () => ({
  useToast: () => ({ showSuccess: showSuccessMock, showError: showErrorMock }),
}));

jest.mock('../../../../../../src/features/data-enrichment/components/validationSchema', () => ({
  defaultValues: {},
  pullValidationSchema: {},
  pushValidationSchema: {},
}));

jest.mock('../../../../../../src/features/data-enrichment/utils', () => ({
  getJobType: (job: any) => (job?.type?.toLowerCase?.() === 'push' ? 'push' : 'pull'),
  scrollToFirstError: (...args: any[]) => scrollToFirstErrorMock(...args),
}));

jest.mock('@mui/material', () => {
  const Div = (props: any) => <div {...props}>{props.children}</div>;
  const Button = (props: any) => (
    <button onClick={props.onClick} type={props.type} disabled={props.disabled}>
      {props.children}
    </button>
  );
  return {
    __esModule: true,
    default: Div,
    Button,
    CircularProgress: () => <span>loading</span>,
    Dialog: (props: any) => (
      <div>
        {props.open ? props.children : null}
        {props.open && props.onClose && (
          <button
            data-testid={`dialog-close-${props['aria-labelledby'] ?? 'dialog'}`}
            onClick={props.onClose}
          />
        )}
      </div>
    ),
    DialogActions: Div,
    DialogContent: Div,
    DialogContentText: Div,
  };
});

jest.mock('../../../../../../src/features/data-enrichment/components/PullConfigForm', () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="pull-form">schedule-count:{props.availableSchedules?.length ?? 0}</div>
  ),
}));

jest.mock('../../../../../../src/features/data-enrichment/components/PushConfigForm', () => ({
  __esModule: true,
  default: () => <div data-testid="push-form" />,
}));

jest.mock('lucide-react', () => {
  const Icon = (props: any) => <svg data-testid="lucide-icon" {...props} />;
  return {
    __esModule: true,
    DownloadIcon: Icon,
    Loader2: Icon,
    Save: Icon,
    UploadIcon: Icon,
    XIcon: Icon,
  };
});

jest.mock('../../../../../../src/features/data-enrichment/handlers', () => ({
  saveDataEnrichmentJob: (...args: any[]) => saveDataEnrichmentJobMock(...args),
  handleUpdateConfirm: (...args: any[]) => handleUpdateConfirmMock(...args),
  handleEditSendForApprovalConfirm: (...args: any[]) => handleEditSendForApprovalConfirmMock(...args),
}));

jest.mock('../../../../../../src/features/cron/handlers', () => ({
  loadSchedules: (...args: any[]) => loadSchedulesMock(...args),
}));

import { DataEnrichmentEditModal } from '../../../../../../src/features/data-enrichment/components/DataEnrichmentEditModal';

describe('features/data-enrichment/components/DataEnrichmentEditModal/index.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    formErrors = {};
    watchValues = { fileFormat: 'csv', name: 'Pull Job' };
    formValues = { name: 'Pull Job', pathPattern: '/inbound/*.csv' };
    submitMode = 'valid';
    triggerMock.mockResolvedValue(true);
    loadSchedulesMock.mockResolvedValue({ schedules: [] });
    saveDataEnrichmentJobMock.mockResolvedValue(undefined);
    handleUpdateConfirmMock.mockImplementation(async (cb: any, close: any) => {
      await cb();
      close(false);
    });
    handleEditSendForApprovalConfirmMock.mockResolvedValue(undefined);
  });

  it('returns null when closed', () => {
    const { container } = render(
      <DataEnrichmentEditModal
        isOpen={false}
        onClose={jest.fn()}
        editMode
        selectedJob={{ id: 'job-closed', endpoint_name: 'Closed', type: 'pull' } as any}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders pull form and filters approved/exported schedules', async () => {
    loadSchedulesMock.mockResolvedValueOnce({
      schedules: [
        { id: '1', status: 'STATUS_04_APPROVED' },
        { id: '2', status: 'STATUS_06_EXPORTED' },
        { id: '3', status: 'draft' },
      ],
    });

    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{ id: 'job-1', endpoint_name: 'Pull Job', type: 'pull' } as any}
      />,
    );

    await waitFor(() => {
      expect(loadSchedulesMock).toHaveBeenCalledWith(1, 50, 'ASSOCIATE', {});
      expect(screen.getByTestId('pull-form')).toBeInTheDocument();
      expect(screen.getByText('schedule-count:2')).toBeInTheDocument();
    });
  });

  it('supports schedules in data property and handles schedule load failures', async () => {
    loadSchedulesMock
      .mockResolvedValueOnce({ data: [{ id: '1', status: 'STATUS_04_APPROVED' }] })
      .mockRejectedValueOnce(new Error('load failed'));

    const first = render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{ id: 'job-1', endpoint_name: 'Pull Job', type: 'pull' } as any}
      />,
    );

    await waitFor(() => {
      expect(first.getByText('schedule-count:1')).toBeInTheDocument();
    });

    first.unmount();

    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{ id: 'job-2', endpoint_name: 'Pull Job', type: 'pull' } as any}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('schedule-count:0')).toBeInTheDocument();
    });
  });

  it('initializes push edit values and normalizes endpoint path', async () => {
    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{
          id: 'push-1',
          endpoint_name: 'Push Job',
          type: 'push',
          path: 'tenant/path',
          description: 'desc',
          version: 'v1',
          table_name: 'tbl',
          mode: 'replace',
        } as any}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('push-form')).toBeInTheDocument();
      expect(setValueMock).toHaveBeenCalledWith('endpointPath', '/tenant/path');
      expect(setValueMock).toHaveBeenCalledWith('name', 'Push Job');
      expect(setValueMock).toHaveBeenCalledWith('ingestMode', 'replace');
    });
  });

  it('initializes pull edit values for SFTP details and file settings', async () => {
    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{
          id: 'pull-1',
          endpoint_name: 'Pull Job',
          type: 'pull',
          source_type: 'SFTP',
          schedule_id: 'sch-1',
          connection: {
            host: '10.0.0.1',
            port: 22,
            auth_type: 'PRIVATE_KEY',
            user_name: 'user-a',
          },
          file: {
            path: 'inbox/*.csv',
            file_type: 'CSV',
            delimiter: ';',
          },
        } as any}
      />,
    );

    await waitFor(() => {
      expect(setValueMock).toHaveBeenCalledWith('sourceType', 'sftp');
      expect(setValueMock).toHaveBeenCalledWith('schedule', 'sch-1');
      expect(setValueMock).toHaveBeenCalledWith('host', '10.0.0.1');
      expect(setValueMock).toHaveBeenCalledWith('port', '22');
      expect(setValueMock).toHaveBeenCalledWith('authType', 'key');
      expect(setValueMock).toHaveBeenCalledWith('username', 'user-a');
      expect(setValueMock).toHaveBeenCalledWith('pathPattern', '/inbox/*.csv');
      expect(setValueMock).toHaveBeenCalledWith('fileFormat', 'csv');
      expect(setValueMock).toHaveBeenCalledWith('delimiter', ';');
    });
  });

  it('initializes pull edit values for HTTP connection and serializes headers', async () => {
    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{
          id: 'pull-2',
          endpoint_name: 'Pull Job',
          type: 'pull',
          source_type: 'HTTP',
          connection: {
            url: 'https://example.com/data',
            headers: { Authorization: 'Bearer token' },
          },
        } as any}
      />,
    );

    await waitFor(() => {
      expect(setValueMock).toHaveBeenCalledWith('url', 'https://example.com/data');
      expect(setValueMock).toHaveBeenCalledWith(
        'headers',
        JSON.stringify({ Authorization: 'Bearer token' }, null, 2),
      );
    });
  });

  it('opens update confirmation and runs update confirmation handler', async () => {
    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{ id: 'job-1', endpoint_name: 'Pull Job', type: 'pull' } as any}
      />,
    );

    fireEvent.click(screen.getByText('Update'));

    await waitFor(() => {
      expect(screen.getByText('Update Confirmation Required!')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Yes, Update Configuration'));

    await waitFor(() => {
      expect(handleUpdateConfirmMock).toHaveBeenCalled();
      expect(saveDataEnrichmentJobMock).toHaveBeenCalled();
    });
  });

  it('handles invalid trigger by scrolling to first form error', async () => {
    triggerMock.mockResolvedValue(false);
    formErrors = { endpointPath: { message: 'required' } };
    formValues = { name: 'Pull Job', pathPattern: '' };

    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{ id: 'job-1', endpoint_name: 'Pull Job', type: 'pull' } as any}
      />,
    );

    fireEvent.click(screen.getByText('Update'));

    await waitFor(() => {
      expect(scrollToFirstErrorMock).toHaveBeenCalledWith('endpointPath');
    });
  });

  it('handles save failure with object payload message', async () => {
    saveDataEnrichmentJobMock.mockRejectedValueOnce({ error: 'api failed' });

    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{ id: 'job-1', endpoint_name: 'Pull Job', type: 'pull' } as any}
      />,
    );

    fireEvent.click(screen.getByText('Update'));
    await waitFor(() => {
      expect(screen.getByText('Yes, Update Configuration')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Yes, Update Configuration'));

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Error', 'api failed');
    });
  });

  it('sends for approval and prefers onCloseWithRefresh callback', async () => {
    const onCloseWithRefresh = jest.fn();
    const onClose = jest.fn();

    saveDataEnrichmentJobMock.mockImplementationOnce(async (args: any) => {
      args.setShowSendForApproval(true);
    });

    handleEditSendForApprovalConfirmMock.mockImplementationOnce(
      async (
        _selectedJob: any,
        _onSuccess: any,
        _onError: any,
        onDone: any,
        _setDialog: any,
      ) => {
        onDone();
      },
    );

    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={onClose}
        onCloseWithRefresh={onCloseWithRefresh}
        editMode
        selectedJob={{ id: 'job-1', endpoint_name: 'Pull Job', type: 'pull' } as any}
      />,
    );

    fireEvent.click(screen.getByText('Update'));
    await waitFor(() => {
      expect(screen.getByText('Yes, Update Configuration')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Yes, Update Configuration'));

    await waitFor(() => {
      expect(screen.getByText('Send for Approval')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Send for Approval'));

    await waitFor(() => {
      expect(screen.getByText('Yes, Send for Approval')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Yes, Send for Approval'));

    await waitFor(() => {
      expect(handleEditSendForApprovalConfirmMock).toHaveBeenCalled();
      expect(onCloseWithRefresh).toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  it('falls back to onClose callback when refresh callback is absent', async () => {
    const onClose = jest.fn();

    saveDataEnrichmentJobMock.mockImplementationOnce(async (args: any) => {
      args.setShowSendForApproval(true);
    });

    handleEditSendForApprovalConfirmMock.mockImplementationOnce(
      async (
        _selectedJob: any,
        _onSuccess: any,
        _onError: any,
        onDone: any,
        _setDialog: any,
      ) => {
        onDone();
      },
    );

    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={onClose}
        editMode
        selectedJob={{ id: 'job-1', endpoint_name: 'Pull Job', type: 'pull' } as any}
      />,
    );

    fireEvent.click(screen.getByText('Update'));
    await waitFor(() => {
      expect(screen.getByText('Yes, Update Configuration')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Yes, Update Configuration'));

    await waitFor(() => {
      expect(screen.getByText('Send for Approval')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Send for Approval'));
    await waitFor(() => {
      expect(screen.getByText('Yes, Send for Approval')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Yes, Send for Approval'));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('cancels update dialog via Cancel button (line 487)', async () => {
    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{ id: 'job-1', endpoint_name: 'Pull Job', type: 'pull' } as any}
      />,
    );

    fireEvent.click(screen.getByText('Update'));
    await waitFor(() => {
      expect(screen.getByText('Yes, Update Configuration')).toBeInTheDocument();
    });

    // The dialog Cancel is the last Cancel button (first is the main form's Cancel)
    const cancelButtons = screen.getAllByText('Cancel');
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);
    await waitFor(() => {
      expect(screen.queryByText('Yes, Update Configuration')).not.toBeInTheDocument();
    });
  });

  it('cancels approval dialog via Cancel button (line 577)', async () => {
    saveDataEnrichmentJobMock.mockImplementationOnce(async (args: any) => {
      args.setShowSendForApproval(true);
    });

    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{ id: 'job-1', endpoint_name: 'Pull Job', type: 'pull' } as any}
      />,
    );

    fireEvent.click(screen.getByText('Update'));
    await waitFor(() => {
      expect(screen.getByText('Yes, Update Configuration')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Yes, Update Configuration'));

    await waitFor(() => {
      expect(screen.getByText('Send for Approval')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Send for Approval'));
    await waitFor(() => {
      expect(screen.getByText('Yes, Send for Approval')).toBeInTheDocument();
    });

    const cancelBtns = screen.getAllByText('Cancel');
    fireEvent.click(cancelBtns[cancelBtns.length - 1]);
    await waitFor(() => {
      expect(screen.queryByText('Yes, Send for Approval')).not.toBeInTheDocument();
    });
  });

  it('propagates Error instance message in catch block (line 122)', async () => {
    saveDataEnrichmentJobMock.mockRejectedValueOnce(new Error('Something went wrong'));

    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{ id: 'job-1', endpoint_name: 'Pull Job', type: 'pull' } as any}
      />,
    );

    fireEvent.click(screen.getByText('Update'));
    await waitFor(() => {
      expect(screen.getByText('Yes, Update Configuration')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Yes, Update Configuration'));

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Error', 'Something went wrong');
    });
  });

  it('calls showSuccess and showError callbacks (lines 138-139)', async () => {
    saveDataEnrichmentJobMock.mockImplementationOnce(async (args: any) => {
      args.setShowSendForApproval(true);
    });

    handleEditSendForApprovalConfirmMock.mockImplementationOnce(
      async (_job: any, onSuccess: any, onError: any) => {
        onSuccess('Approved!');
        onError('Failed!');
      },
    );

    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{ id: 'job-1', endpoint_name: 'Pull Job', type: 'pull' } as any}
      />,
    );

    fireEvent.click(screen.getByText('Update'));
    await waitFor(() => screen.getByText('Yes, Update Configuration'));
    fireEvent.click(screen.getByText('Yes, Update Configuration'));

    await waitFor(() => screen.getByText('Send for Approval'));
    fireEvent.click(screen.getByText('Send for Approval'));
    await waitFor(() => screen.getByText('Yes, Send for Approval'));
    fireEvent.click(screen.getByText('Yes, Send for Approval'));

    await waitFor(() => {
      expect(showSuccessMock).toHaveBeenCalledWith('Success', 'Approved!');
      expect(showErrorMock).toHaveBeenCalledWith('Error', 'Failed!');
    });
  });

  it('calls onSubmit via form submit (line 149)', async () => {
    const { container } = render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{ id: 'job-1', endpoint_name: 'Pull Job', type: 'pull' } as any}
      />,
    );

    const form = container.querySelector('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(saveDataEnrichmentJobMock).toHaveBeenCalled();
    });
  });

  it('sets shouldScrollToErrorRef and scrolls to first error on invalid submit (lines 83,89,90)', async () => {
    formErrors = {};
    submitMode = 'invalid';

    const { container, rerender } = render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{ id: 'job-1', endpoint_name: 'Pull Job', type: 'pull' } as any}
      />,
    );

    const form = container.querySelector('form');
    // Submit form → onError fires → shouldScrollToErrorRef.current = true
    fireEvent.submit(form!);

    // Now change formErrors to a new object reference with errors, and rerender
    // This triggers the useEffect which checks shouldScrollToErrorRef.current
    formErrors = { name: { message: 'required' } };
    rerender(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{ id: 'job-1', endpoint_name: 'Pull Job', type: 'pull' } as any}
      />,
    );

    await waitFor(() => {
      expect(scrollToFirstErrorMock).toHaveBeenCalledWith('name');
    });
  });

  it('handles save failure with string throw (primitive error branch)', async () => {
    saveDataEnrichmentJobMock.mockRejectedValueOnce('plain string error');

    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{ id: 'job-1', endpoint_name: 'Pull Job', type: 'pull' } as any}
      />,
    );

    fireEvent.click(screen.getByText('Update'));
    await waitFor(() => {
      expect(screen.getByText('Yes, Update Configuration')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Yes, Update Configuration'));

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Error', 'Failed to create endpoint');
    });
  });

  it('handles save failure with empty object (Unknown error fallback)', async () => {
    saveDataEnrichmentJobMock.mockRejectedValueOnce({});

    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{ id: 'job-1', endpoint_name: 'Pull Job', type: 'pull' } as any}
      />,
    );

    fireEvent.click(screen.getByText('Update'));
    await waitFor(() => {
      expect(screen.getByText('Yes, Update Configuration')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Yes, Update Configuration'));

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('Error', 'Unknown error occurred');
    });
  });

  it('handles schedule load returning neither schedules nor data (empty array fallback)', async () => {
    loadSchedulesMock.mockResolvedValueOnce({});

    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        selectedJob={{ id: 'job-1', endpoint_name: 'Pull Job', type: 'pull' } as any}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('pull-form')).toHaveTextContent('schedule-count:0');
    });
  });

  it('filters schedules with EXPORTED status (OR right side)', async () => {
    loadSchedulesMock.mockResolvedValueOnce({
      schedules: [
        { status: 'STATUS_06_EXPORTED' },
        { status: 'STATUS_01_IN_PROGRESS' },
      ],
    });

    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        selectedJob={{ id: 'job-1', endpoint_name: 'Pull Job', type: 'pull' } as any}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('pull-form')).toHaveTextContent('schedule-count:1');
    });
  });

  it('initializes push edit with path already starting with /', async () => {
    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{
          id: 'job-push',
          type: 'push',
          endpoint_name: 'Push EP',
          path: '/already-prefixed',
        } as any}
      />,
    );

    await waitFor(() => {
      expect(setValueMock).toHaveBeenCalledWith('endpointPath', '/already-prefixed');
    });
  });

  it('initializes pull edit with PRIVATE_KEY auth and missing optional fields', async () => {
    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{
          id: 'job-pk',
          type: 'pull',
          source_type: 'SFTP',
          connection: {
            auth_type: 'PRIVATE_KEY',
          },
          file: {
            path: 'relative/data.csv',
          },
        } as any}
      />,
    );

    await waitFor(() => {
      expect(setValueMock).toHaveBeenCalledWith('name', '');
      expect(setValueMock).toHaveBeenCalledWith('authType', 'key');
      expect(setValueMock).toHaveBeenCalledWith('host', '');
      expect(setValueMock).toHaveBeenCalledWith('port', '');
      expect(setValueMock).toHaveBeenCalledWith('username', '');
      expect(setValueMock).toHaveBeenCalledWith('pathPattern', '/relative/data.csv');
      expect(setValueMock).toHaveBeenCalledWith('fileFormat', 'csv');
      expect(setValueMock).toHaveBeenCalledWith('delimiter', ',');
    });
  });

  it('shows selectedJob name fallback when watch name is undefined in update dialog', async () => {
    watchValues = { fileFormat: 'csv', name: undefined as any };

    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{ id: 'job-1', endpoint_name: 'Fallback EP', type: 'pull' } as any}
      />,
    );

    fireEvent.click(screen.getByText('Update'));
    await waitFor(() => {
      expect(screen.getByText('Yes, Update Configuration')).toBeInTheDocument();
    });

    expect(screen.getByText('"Fallback EP"')).toBeInTheDocument();
  });

  it('skips firstError scroll when trigger returns false but errors object is empty', async () => {
    triggerMock.mockResolvedValueOnce(false);
    // Set pathPattern to empty so the fileFormat useEffect does NOT consume the mockResolvedValueOnce
    formValues = { name: 'Pull Job', pathPattern: '' };
    // formErrors remains {} from beforeEach – Object.keys({})[0] is undefined

    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{ id: 'job-1', endpoint_name: 'Pull Job', type: 'pull' } as any}
      />,
    );

    fireEvent.click(screen.getByText('Update'));

    await waitFor(() => {
      expect(triggerMock).toHaveBeenCalled();
    });

    expect(scrollToFirstErrorMock).not.toHaveBeenCalled();
    expect(screen.queryByText('Yes, Update Configuration')).not.toBeInTheDocument();
  });

  it('shows isCreating loading backdrop with Updating text when editMode is true', async () => {
    let resolveCreate!: () => void;
    saveDataEnrichmentJobMock.mockImplementationOnce(async (args: any) => {
      args.setIsCreating(true);
      await new Promise<void>((resolve) => { resolveCreate = resolve; });
    });

    const { container } = render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{ id: 'job-1', endpoint_name: 'Pull Job', type: 'pull' } as any}
      />,
    );

    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => {
      expect(screen.getByText('Updating endpoint...')).toBeInTheDocument();
    });

    resolveCreate();
  });

  it('shows isCreating loading backdrop with Creating text when editMode is false', async () => {
    let resolveCreate!: () => void;
    saveDataEnrichmentJobMock.mockImplementationOnce(async (args: any) => {
      args.setIsCreating(true);
      await new Promise<void>((resolve) => { resolveCreate = resolve; });
    });

    const { container } = render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        selectedJob={{ id: 'job-1', endpoint_name: 'Pull Job', type: 'pull' } as any}
      />,
    );

    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => {
      expect(screen.getByText('Creating endpoint...')).toBeInTheDocument();
    });

    resolveCreate();
  });

  it('closes update confirmation dialog via Dialog onClose callback (DA:420)', async () => {
    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{ id: 'job-1', endpoint_name: 'Pull Job', type: 'pull' } as any}
      />,
    );

    fireEvent.click(screen.getByText('Update'));
    await waitFor(() => {
      expect(screen.getByText('Yes, Update Configuration')).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByTestId('dialog-close-update-confirmation-dialog-title'),
    );

    await waitFor(() => {
      expect(screen.queryByText('Yes, Update Configuration')).not.toBeInTheDocument();
    });
  });

  it('closes approval confirmation dialog via Dialog onClose callback (DA:510)', async () => {
    saveDataEnrichmentJobMock.mockImplementationOnce(async (args: any) => {
      args.setShowSendForApproval(true);
    });

    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{ id: 'job-1', endpoint_name: 'Pull Job', type: 'pull' } as any}
      />,
    );

    fireEvent.click(screen.getByText('Update'));
    await waitFor(() => screen.getByText('Yes, Update Configuration'));
    fireEvent.click(screen.getByText('Yes, Update Configuration'));

    await waitFor(() => screen.getByText('Send for Approval'));
    fireEvent.click(screen.getByText('Send for Approval'));
    await waitFor(() => screen.getByText('Yes, Send for Approval'));

    fireEvent.click(
      screen.getByTestId('dialog-close-approval-confirmation-dialog-title'),
    );

    await waitFor(() => {
      expect(screen.queryByText('Yes, Send for Approval')).not.toBeInTheDocument();
    });
  });

  it('shows this endpoint fallback when both watch name and endpoint_name are nullish (BRDA:458)', async () => {
    watchValues = { fileFormat: 'csv', name: undefined as any };

    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{ id: 'job-1', type: 'pull' } as any}
      />,
    );

    fireEvent.click(screen.getByText('Update'));
    await waitFor(() => {
      expect(screen.getByText('"this endpoint"')).toBeInTheDocument();
    });
  });

  it('skips SFTP and HTTP connection blocks for unknown source type (BRDA:215)', async () => {
    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{
          id: 'job-ftp',
          type: 'pull',
          source_type: 'FTP',
          connection: {},
        } as any}
      />,
    );

    await waitFor(() => {
      expect(setValueMock).toHaveBeenCalledWith('sourceType', 'ftp');
    });
    expect(setValueMock).not.toHaveBeenCalledWith('host', expect.anything());
    expect(setValueMock).not.toHaveBeenCalledWith('url', expect.anything());
  });

  it('uses empty string fallbacks for HTTP connection with missing url and headers (BRDA:220,222)', async () => {
    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{
          id: 'job-http-empty',
          type: 'pull',
          source_type: 'HTTP',
          connection: {},
        } as any}
      />,
    );

    await waitFor(() => {
      expect(setValueMock).toHaveBeenCalledWith('url', '');
      expect(setValueMock).toHaveBeenCalledWith('headers', '');
    });
  });

  it('sets password authType when auth_type is not PRIVATE_KEY (BRDA:215 false branch)', async () => {
    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{
          id: 'job-sftp-pwd',
          type: 'pull',
          source_type: 'SFTP',
          connection: { auth_type: 'PASSWORD', host: 'srv', port: 22 },
          file: { path: 'data.csv' },
        } as any}
      />,
    );

    await waitFor(() => {
      expect(setValueMock).toHaveBeenCalledWith('authType', 'password');
    });
  });

  it('uses empty pathPattern when file path property is absent (BRDA:231)', async () => {
    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{
          id: 'job-sftp-nopath',
          type: 'pull',
          source_type: 'SFTP',
          connection: { auth_type: 'PRIVATE_KEY' },
          file: {},
        } as any}
      />,
    );

    await waitFor(() => {
      expect(setValueMock).toHaveBeenCalledWith('pathPattern', '');
    });
  });

  it('skips adding slash prefix when file path already starts with slash (BRDA:234)', async () => {
    render(
      <DataEnrichmentEditModal
        isOpen
        onClose={jest.fn()}
        editMode
        selectedJob={{
          id: 'job-sftp-abs',
          type: 'pull',
          source_type: 'SFTP',
          connection: { auth_type: 'PRIVATE_KEY' },
          file: { path: '/already/absolute.csv' },
        } as any}
      />,
    );

    await waitFor(() => {
      expect(setValueMock).toHaveBeenCalledWith('pathPattern', '/already/absolute.csv');
    });
  });

  it('covers approval flow with neither onCloseWithRefresh nor onClose (line 142 false)', async () => {
    saveDataEnrichmentJobMock.mockImplementationOnce(async (args: any) => {
      args.setShowSendForApproval(true);
    });

    handleEditSendForApprovalConfirmMock.mockImplementationOnce(
      async (
        _selectedJob: any,
        _onSuccess: any,
        _onError: any,
        onDone: any,
        _setDialog: any,
      ) => {
        onDone();
      },
    );

    render(
      <DataEnrichmentEditModal
        isOpen
        editMode
        selectedJob={{ id: 'job-1', endpoint_name: 'Pull Job', type: 'pull' } as any}
      />,
    );

    fireEvent.click(screen.getByText('Update'));
    await waitFor(() => {
      expect(screen.getByText('Yes, Update Configuration')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Yes, Update Configuration'));

    await waitFor(() => {
      expect(screen.getByText('Send for Approval')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Send for Approval'));
    await waitFor(() => {
      expect(screen.getByText('Yes, Send for Approval')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Yes, Send for Approval'));

    await waitFor(() => {
      expect(handleEditSendForApprovalConfirmMock).toHaveBeenCalled();
    });
  });

});
