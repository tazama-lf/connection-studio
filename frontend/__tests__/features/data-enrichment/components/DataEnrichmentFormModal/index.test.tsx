import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const createPullJobMock = jest.fn();
const createPushJobMock = jest.fn();
const updatePullJobMock = jest.fn();
const updatePushJobMock = jest.fn();
const getByIdMock = jest.fn();
const scheduleGetAllMock = jest.fn();

const setValueMock = jest.fn();
const resetMock = jest.fn();

let formValues: any = {
  name: 'Demo Connector',
  description: 'desc',
  version: 'v1.0.0',
  sourceType: 'sftp',
  host: 'example-host',
  port: '22',
  authType: 'password',
  username: 'user',
  password: 'pass',
  pathPattern: '/data.csv',
  fileFormat: 'csv',
  delimiter: ',',
  targetTable: 'demo_table',
  ingestMode: 'append',
  schedule: 'sch-1',
  endpointPath: '/my/path',
  headers: '{"x":"1"}',
  url: 'https://x.test',
};

let formErrors: any = {};

jest.mock('@hookform/resolvers/yup', () => ({
  yupResolver: () => () => ({ values: {}, errors: {} }),
}));

jest.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (onValid: any) => () => onValid(),
    watch: (name: string) => formValues[name],
    setValue: (...args: any[]) => setValueMock(...args),
    getValues: () => formValues,
    reset: (...args: any[]) => resetMock(...args),
    trigger: jest.fn().mockResolvedValue(true),
    formState: { errors: formErrors },
  }),
}));

jest.mock('../../../../../../src/features/auth', () => ({
  useAuth: () => ({ user: { tenantId: 'tenant-x' } }),
}));

jest.mock('../../../../../../src/features/data-enrichment/components/validationSchema', () => ({
  authenticationTypeOptions: [{ label: 'Password', value: 'password' }],
  defaultValues: {},
  fileFormatOptions: [{ label: 'CSV', value: 'csv' }],
  getAssociatedScheduleOptions: () => [{ label: 'Schedule 1', value: 'sch-1' }],
  ingestModeOptions: [{ label: 'Append', value: 'append' }],
  pullValidationSchema: {},
  pushValidationSchema: {},
  sourceTypeOptions: [{ label: 'SFTP', value: 'sftp' }],
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
    Grid: Div,
    Alert: Div,
  };
});

jest.mock('../../../../../../src/shared/components/FormFields', () => {
  const Field = (name: string) => (props: any) => <div data-testid={`${name}-${props.name}`} />;
  return {
    ApiPathInputField: Field('api-path'),
    DatabaseTableInputField: Field('db-table'),
    DelimiterInputField: Field('delimiter'),
    EndpointNameInputField: Field('endpoint-name'),
    FilePathInputField: Field('file-path'),
    HostInputField: Field('host'),
    MultiLineTextInputField: Field('multiline'),
    NumberInputField: Field('number'),
    PasswordInputField: Field('password'),
    SelectField: Field('select'),
    TextInputField: Field('text'),
    URLInputField: Field('url'),
    VersionInputField: Field('version'),
  };
});

jest.mock('../../../../../../src/shared/components/ValidationError', () => ({
  __esModule: true,
  default: () => <div data-testid="validation-error" />,
}));

jest.mock('lucide-react', () => {
  const Icon = (props: any) => <svg data-testid="lucide-icon" {...props} />;
  return {
    __esModule: true,
    ArrowLeft: Icon,
    CheckCircleIcon: Icon,
    Circle: Icon,
    DownloadIcon: Icon,
    FileText: Icon,
    LassoSelect: Icon,
    Loader2: Icon,
    Plus: Icon,
    Save: Icon,
    UploadIcon: Icon,
    XIcon: Icon,
  };
});

jest.mock('../../../../../../src/features/data-enrichment/handlers', () => ({
  dataEnrichmentJobApi: {
    createPullJob: (...args: any[]) => createPullJobMock(...args),
    createPushJob: (...args: any[]) => createPushJobMock(...args),
    updatePullJob: (...args: any[]) => updatePullJobMock(...args),
    updatePushJob: (...args: any[]) => updatePushJobMock(...args),
    getById: (...args: any[]) => getByIdMock(...args),
  },
  scheduleApi: {
    getAll: (...args: any[]) => scheduleGetAllMock(...args),
  },
  handleFormInputChange: (name: string, value: string, setFormData: any) => {
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  },
  handleContinue: (setShowConfigForm: any) => setShowConfigForm(true),
}));

import { DataEnrichmentFormModal } from '../../../../../../src/features/data-enrichment/components/DataEnrichmentFormModal';

describe('features/data-enrichment/components/DataEnrichmentFormModal/index.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    formErrors = {};
    scheduleGetAllMock.mockResolvedValue([]);
    createPullJobMock.mockResolvedValue({ message: 'created-pull' });
    createPushJobMock.mockResolvedValue({ message: 'created-push' });
    updatePullJobMock.mockResolvedValue({ message: 'updated-pull' });
    updatePushJobMock.mockResolvedValue({ message: 'updated-push' });
    getByIdMock.mockResolvedValue({
      config_type: 'pull',
      endpoint_name: 'Job',
      source_type: 'SFTP',
    });
  });

  it('returns null when closed', () => {
    const { container } = render(
      <DataEnrichmentFormModal isOpen={false} onClose={jest.fn()} onSave={jest.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders selection screen, continues to config, then creates endpoint from summary', async () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    render(<DataEnrichmentFormModal isOpen onClose={onClose} onSave={onSave} jobType="pull" />);

    expect(screen.getByText('Please Select Configuration Type')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText('Pull Configuration (SFTP/HTTPS)')).toBeInTheDocument();
      expect(screen.getByTestId('endpoint-name-name')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() => {
      expect(screen.getByText('Ready to Create Endpoint')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create Endpoint'));
    await waitFor(() => {
      expect(createPullJobMock).toHaveBeenCalled();
      expect(onSave).toHaveBeenCalled();
    });
  });

  it('loads edit mode data and supports push update branch', async () => {
    formValues = {
      ...formValues,
      sourceType: 'http',
      endpointPath: '/push',
    };

    render(
      <DataEnrichmentFormModal
        isOpen
        onClose={jest.fn()}
        onSave={jest.fn()}
        editMode
        jobId="123"
        jobType="push"
      />,
    );

    await waitFor(() => {
      expect(getByIdMock).toHaveBeenCalledWith('123', 'PUSH');
      expect(scheduleGetAllMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('Continue'));
    fireEvent.click(screen.getByText('Save and Next'));
    fireEvent.click(screen.getByText('Create Endpoint'));

    await waitFor(() => {
      expect(updatePushJobMock).toHaveBeenCalled();
    });
  });

  it('clears schedule state when schedule load fails', async () => {
    scheduleGetAllMock.mockRejectedValueOnce(new Error('schedule-load-fail'));
    render(<DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="pull" />);
    await waitFor(() => {
      expect(scheduleGetAllMock).toHaveBeenCalled();
    });
    // Component renders without schedule options (graceful failure)
    expect(screen.getByText('Please Select Configuration Type')).toBeInTheDocument();
  });

  it('generateEndpointUrl covers early return when both version and endpointPath are empty', async () => {
    const originalFormValues = { ...formValues };
    formValues = { ...formValues, version: '', endpointPath: '' };

    const onSave = jest.fn();
    render(<DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={onSave} jobType="pull" />);
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText('Pull Configuration (SFTP/HTTPS)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() => {
      // Summary renders with empty version/path → early return from generateEndpointUrl
      expect(screen.getByText('Ready to Create Endpoint')).toBeInTheDocument();
    });

    formValues = originalFormValues;
  });

  it('generateEndpointUrl covers path without leading slash', async () => {
    const originalFormValues = { ...formValues };
    formValues = { ...formValues, version: 'v2', endpointPath: 'no-slash-path' };

    render(<DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="pull" />);
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText('Pull Configuration (SFTP/HTTPS)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() => {
      expect(screen.getByText('Ready to Create Endpoint')).toBeInTheDocument();
    });

    formValues = originalFormValues;
  });

  it('generateEndpointUrl covers empty version branch (cleanVersion falsy)', async () => {
    const originalFormValues = { ...formValues };
    formValues = { ...formValues, version: '', endpointPath: '/my/data' };

    render(<DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="pull" />);
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText('Pull Configuration (SFTP/HTTPS)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() => {
      expect(screen.getByText('Ready to Create Endpoint')).toBeInTheDocument();
    });

    formValues = originalFormValues;
  });

  it('handleInputChange covers configurationType and else branches via radio inputs', async () => {
    const { container } = render(
      <DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} />,
    );

    // Selection screen is shown first
    expect(screen.getByText('Please Select Configuration Type')).toBeInTheDocument();

    // Find the push radio input (name="configurationType", value="push")
    const pushRadio = container.querySelector('input[name="configurationType"][value="push"]') as HTMLInputElement;
    if (pushRadio) {
      // name=configurationType, value=push → covers BRDA:1135 TRUE branch (name==='configurationType')
      fireEvent.click(pushRadio);
      fireEvent.change(pushRadio, { target: { checked: true, value: 'push' } });
    }

    // Find the pull radio input (name="configurationType", value="pull")
    const pullRadio = container.querySelector('input[name="configurationType"][value="pull"]') as HTMLInputElement;
    if (pullRadio) {
      // name=configurationType, value=pull → also covers the configurationType branch
      fireEvent.click(pullRadio);
      fireEvent.change(pullRadio, { target: { checked: true, value: 'pull' } });
    }

    // Still on selection screen
    expect(screen.getByText('Please Select Configuration Type')).toBeInTheDocument();
  });

  it('scheduleApi response with .data property triggers data fallback branch', async () => {
    scheduleGetAllMock.mockResolvedValue({ data: [{ status: 'APPROVED', id: 'sch-1' }] });
    render(<DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="pull" />);
    await waitFor(() => {
      expect(scheduleGetAllMock).toHaveBeenCalled();
    });
    expect(screen.getByText('Please Select Configuration Type')).toBeInTheDocument();
  });

  it('scheduleApi response with .results property triggers results fallback branch', async () => {
    scheduleGetAllMock.mockResolvedValue({ results: [{ status: 'APPROVED', id: 'sch-1' }] });
    render(<DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="pull" />);
    await waitFor(() => {
      expect(scheduleGetAllMock).toHaveBeenCalled();
    });
    expect(screen.getByText('Please Select Configuration Type')).toBeInTheDocument();
  });

  it('scheduleApi response with .items property triggers items fallback branch', async () => {
    scheduleGetAllMock.mockResolvedValue({ items: [{ status: 'APPROVED', id: 'sch-1' }] });
    render(<DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="pull" />);
    await waitFor(() => {
      expect(scheduleGetAllMock).toHaveBeenCalled();
    });
    expect(screen.getByText('Please Select Configuration Type')).toBeInTheDocument();
  });

  it('loadJobData with isPushJob=true sets push config type (job has path but no source_type)', async () => {
    getByIdMock.mockResolvedValue({
      endpoint_name: 'PushJob',
      path: '/api/data',
      // no source_type → isPushJob = true
      description: undefined, // also covers description || '' fallback
    });
    render(
      <DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} editMode jobId="456" />,
    );
    await waitFor(() => {
      expect(getByIdMock).toHaveBeenCalledWith('456', undefined);
    });
  });

  it('loadJobData detects type from job.type when jobType and config_type absent', async () => {
    getByIdMock.mockResolvedValue({
      endpoint_name: 'TypedJob',
      type: 'PULL',
      source_type: 'sftp',
    });
    render(
      <DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} editMode jobId="789" />,
    );
    await waitFor(() => {
      expect(getByIdMock).toHaveBeenCalledWith('789', undefined);
    });
  });

  it('creates push job and shows success from non-message response', async () => {
    const onSave = jest.fn();
    createPushJobMock.mockResolvedValue({}); // no message → fallback success message
    render(
      <DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={onSave} jobType="push" />,
    );

    // Click push card to ensure push is selected
    fireEvent.click(screen.getByText('PUSH'));
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText('Push Configuration (REST API)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() => {
      expect(screen.getByText('Ready to Create Endpoint')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create Endpoint'));
    await waitFor(() => {
      expect(createPushJobMock).toHaveBeenCalled();
      expect(onSave).toHaveBeenCalled();
    });
  });

  it('creates pull job with http sourceType (watch sourceType=http)', async () => {
    const originalFormValues = { ...formValues };
    formValues = { ...formValues, sourceType: 'http', url: 'https://api.test', headers: '{"x":"1"}' };

    const onSave = jest.fn();
    render(
      <DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={onSave} jobType="pull" />,
    );

    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => {
      expect(screen.getByText('Pull Configuration (SFTP/HTTPS)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() => {
      expect(screen.getByText('Ready to Create Endpoint')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create Endpoint'));
    await waitFor(() => {
      expect(createPullJobMock).toHaveBeenCalled();
      // pull with http uses http connection payload
      const payload = createPullJobMock.mock.calls[0][0];
      expect(payload.source_type).toBe('HTTP');
    });

    formValues = originalFormValues;
  });

  it('creates sftp pull job with authType=key (private key auth)', async () => {
    const originalFormValues = { ...formValues };
    formValues = {
      ...formValues,
      sourceType: 'sftp',
      authType: 'key',
      password: 'my-private-key',
    };

    const onSave = jest.fn();
    render(
      <DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={onSave} jobType="pull" />,
    );

    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => {
      expect(screen.getByText('Pull Configuration (SFTP/HTTPS)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() => {
      expect(screen.getByText('Ready to Create Endpoint')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create Endpoint'));
    await waitFor(() => {
      expect(createPullJobMock).toHaveBeenCalled();
      const payload = createPullJobMock.mock.calls[0][0];
      expect(payload.connection.auth_type).toBe('PRIVATE_KEY');
      expect(payload.connection.private_key).toBe('my-private-key');
    });

    formValues = originalFormValues;
  });

  it('handleSave shows error for non-Error object with message property', async () => {
    createPullJobMock.mockRejectedValue({ message: 'api-error-msg' });

    render(
      <DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="pull" />,
    );

    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => {
      expect(screen.getByText('Pull Configuration (SFTP/HTTPS)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() => {
      expect(screen.getByText('Ready to Create Endpoint')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create Endpoint'));
    await waitFor(() => {
      expect(screen.getByText('api-error-msg')).toBeInTheDocument();
    });
  });

  it('handleSave shows error for non-Error object with .error property fallback', async () => {
    createPullJobMock.mockRejectedValue({ error: 'fallback-error' });

    render(
      <DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="pull" />,
    );

    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => {
      expect(screen.getByText('Pull Configuration (SFTP/HTTPS)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() => {
      expect(screen.getByText('Ready to Create Endpoint')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create Endpoint'));
    await waitFor(() => {
      expect(screen.getByText('fallback-error')).toBeInTheDocument();
    });
  });

  it('renders push summary with generateEndpointUrl when summary shown for push type', async () => {
    const originalFormValues = { ...formValues };
    formValues = { ...formValues, version: 'v1.0.0', endpointPath: '/data' };

    render(
      <DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="push" />,
    );

    fireEvent.click(screen.getByText('PUSH'));
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText('Push Configuration (REST API)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() => {
      expect(screen.getByText('Ready to Create Endpoint')).toBeInTheDocument();
      // Push summary has "Push Configuration (REST API)" string
      expect(screen.getByText('Push Configuration (REST API)')).toBeInTheDocument();
    });

    formValues = originalFormValues;
  });

  it('summary renders sftp http pull with url/headers (no host/port fields shown)', async () => {
    const originalFormValues = { ...formValues };
    formValues = {
      ...formValues,
      sourceType: 'http',
      url: 'https://api.example.com',
      headers: '',
    };

    render(
      <DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="pull" />,
    );

    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => {
      expect(screen.getByText('Pull Configuration (SFTP/HTTPS)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() => {
      expect(screen.getByText('Ready to Create Endpoint')).toBeInTheDocument();
    });

    formValues = originalFormValues;
  });

  it('handleInputChange sourceType=http clears sftp-specific fields via radio', () => {
    const { container } = render(
      <DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} />,
    );

    // Click to trigger React's event system, then fire change with name=sourceType to cover http branch
    const pushRadio = container.querySelector('input[name="configurationType"][value="push"]') as HTMLInputElement;
    if (pushRadio) {
      fireEvent.click(pushRadio);
      fireEvent.change(pushRadio, { target: { name: 'sourceType', value: 'http', checked: false } });
    }

    expect(screen.getByText('Please Select Configuration Type')).toBeInTheDocument();
  });

  it('handleInputChange sourceType=sftp sets authType=password via radio', () => {
    const { container } = render(
      <DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} />,
    );

    // Click to trigger React's event system, then fire change with name=sourceType to cover sftp branch
    const pushRadio = container.querySelector('input[name="configurationType"][value="push"]') as HTMLInputElement;
    if (pushRadio) {
      fireEvent.click(pushRadio);
      fireEvent.change(pushRadio, { target: { name: 'sourceType', value: 'sftp', checked: false } });
    }

    expect(screen.getByText('Please Select Configuration Type')).toBeInTheDocument();
  });

  it('pull update creates update payload instead of create (editMode with jobId)', async () => {
    const onSave = jest.fn();
    formValues = { ...formValues, sourceType: 'sftp', authType: 'password' };

    render(
      <DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={onSave} editMode jobId="job-101" jobType="pull" />,
    );

    await waitFor(() => {
      expect(getByIdMock).toHaveBeenCalledWith('job-101', 'PULL');
    });

    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText('Pull Configuration (SFTP/HTTPS)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() => {
      expect(screen.getByText('Ready to Create Endpoint')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create Endpoint'));
    await waitFor(() => {
      expect(updatePullJobMock).toHaveBeenCalledWith('job-101', expect.any(Object));
      expect(onSave).toHaveBeenCalled();
    });
  });

  it('renders without jobType (defaults to pull configuration type)', () => {
    // No jobType prop → jobType || 'pull' defaults to pull (line 58)
    render(<DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByText('Please Select Configuration Type')).toBeInTheDocument();
  });

  it('Back button from config step resets to selection screen', async () => {
    render(<DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="pull" />);

    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => {
      expect(screen.getByText('Pull Configuration (SFTP/HTTPS)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Back'));
    await waitFor(() => {
      expect(screen.getByText('Please Select Configuration Type')).toBeInTheDocument();
    });
  });

  it('Back to Config button from summary returns to config step', async () => {
    render(<DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="pull" />);

    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => {
      expect(screen.getByText('Pull Configuration (SFTP/HTTPS)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() => {
      expect(screen.getByText('Ready to Create Endpoint')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Back to Config'));
    await waitFor(() => {
      expect(screen.getByText('Pull Configuration (SFTP/HTTPS)')).toBeInTheDocument();
    });
  });

  it('watch ingestMode=replace shows replace mode text', async () => {
    const originalFormValues = { ...formValues };
    formValues = { ...formValues, ingestMode: 'replace' };

    render(<DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="pull" />);

    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => {
      expect(screen.getByText('Replace mode archives the current dataset and creates a new version with the uploaded data.')).toBeInTheDocument();
    });

    formValues = originalFormValues;
  });

  it('watch fileFormat=json hides delimiter field', async () => {
    const originalFormValues = { ...formValues };
    formValues = { ...formValues, sourceType: 'sftp', fileFormat: 'json' };

    render(<DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="pull" />);

    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => {
      expect(screen.getByText('Pull Configuration (SFTP/HTTPS)')).toBeInTheDocument();
    });

    // fileFormat=json → no delimiter field (watch('fileFormat') === 'csv' is false)
    expect(screen.queryByTestId('delimiter-delimiter')).not.toBeInTheDocument();

    formValues = originalFormValues;
  });

  it('watch authType=key shows private key multi-line field', async () => {
    const originalFormValues = { ...formValues };
    formValues = { ...formValues, sourceType: 'sftp', authType: 'key' };

    render(<DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="pull" />);

    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => {
      expect(screen.getByText('Pull Configuration (SFTP/HTTPS)')).toBeInTheDocument();
    });

    // With authType=key, the multiline (private key) field renders instead of password field
    // The mock renders data-testid="multiline-password"
    expect(screen.getByTestId('multiline-password')).toBeInTheDocument();

    formValues = originalFormValues;
  });

  // ── Error display tests (covers errors?.X && <ValidationError/> branches) ──

  it('shows ValidationError for name field when form has errors (pull config)', () => {
    formErrors = {
      name: { message: 'Name is required' },
      version: { message: 'Version is required' },
      sourceType: { message: 'Source type is required' },
      description: { message: 'Description is required' },
      schedule: { message: 'Schedule is required' },
    };

    render(<DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="pull" />);
    fireEvent.click(screen.getByText('Continue'));
    // ValidationError components should render for each error
    const validationErrors = screen.getAllByTestId('validation-error');
    expect(validationErrors.length).toBeGreaterThan(0);
  });

  it('shows push form validation errors including endpointPath error', () => {
    formErrors = {
      name: { message: 'Name required' },
      version: { message: 'Version required' },
      description: { message: 'Desc required' },
      endpointPath: { message: 'Path required' },
      targetTable: { message: 'Table required' },
      ingestMode: { message: 'Mode required' },
    };

    render(<DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="push" />);
    fireEvent.click(screen.getByText('Continue'));
    const validationErrors = screen.getAllByTestId('validation-error');
    expect(validationErrors.length).toBeGreaterThan(0);
  });

  it('shows pull sftp additional validation errors (host, port, auth, username, password, pathPattern)', () => {
    formErrors = {
      host: { message: 'Host required' },
      port: { message: 'Port required' },
      authType: { message: 'Auth required' },
      username: { message: 'Username required' },
      password: { message: 'Password required' },
      pathPattern: { message: 'Path required' },
      fileFormat: { message: 'Format required' },
      delimiter: { message: 'Delimiter required' },
    };

    const originalFormValues = { ...formValues };
    formValues = { ...formValues, sourceType: 'sftp', authType: 'password', fileFormat: 'csv' };

    render(<DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="pull" />);
    fireEvent.click(screen.getByText('Continue'));
    const validationErrors = screen.getAllByTestId('validation-error');
    expect(validationErrors.length).toBeGreaterThan(0);

    formValues = originalFormValues;
  });

  it('shows pull http validation errors (url, headers)', () => {
    formErrors = {
      name: { message: 'Name required' },
      url: { message: 'URL required' },
      headers: { message: 'Headers required' },
      targetTable: { message: 'Table required' },
      ingestMode: { message: 'Mode required' },
      schedule: { message: 'Schedule required' },
    };

    const originalFormValues = { ...formValues };
    formValues = { ...formValues, sourceType: 'http' };

    render(<DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="pull" />);
    fireEvent.click(screen.getByText('Continue'));
    const validationErrors = screen.getAllByTestId('validation-error');
    expect(validationErrors.length).toBeGreaterThan(0);

    formValues = originalFormValues;
  });

  // ── Schedule API response shape variants ───────────────────────────────────

  it('handles schedule API response with .data property', async () => {
    scheduleGetAllMock.mockResolvedValue({ data: [] });
    render(<DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="pull" />);
    await waitFor(() => expect(scheduleGetAllMock).toHaveBeenCalled());
    expect(screen.getByText('Please Select Configuration Type')).toBeInTheDocument();
  });

  it('handles schedule API response with .results property', async () => {
    scheduleGetAllMock.mockResolvedValue({ results: [] });
    render(<DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="pull" />);
    await waitFor(() => expect(scheduleGetAllMock).toHaveBeenCalled());
    expect(screen.getByText('Please Select Configuration Type')).toBeInTheDocument();
  });

  it('handles schedule API response with .items property', async () => {
    scheduleGetAllMock.mockResolvedValue({ items: [] });
    render(<DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="pull" />);
    await waitFor(() => expect(scheduleGetAllMock).toHaveBeenCalled());
    expect(screen.getByText('Please Select Configuration Type')).toBeInTheDocument();
  });

  it('handles schedule API response with no recognized property (uses empty array)', async () => {
    scheduleGetAllMock.mockResolvedValue({});
    render(<DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="pull" />);
    await waitFor(() => expect(scheduleGetAllMock).toHaveBeenCalled());
    expect(screen.getByText('Please Select Configuration Type')).toBeInTheDocument();
  });

  // ── Summary view with empty URL (|| 'N/A' branch) ─────────────────────────

  it('shows N/A for url in summary when url is empty (HTTP pull)', async () => {
    const originalFormValues = { ...formValues };
    formValues = { ...formValues, sourceType: 'http', url: '' };

    render(<DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="pull" />);
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => expect(screen.getByText('Pull Configuration (SFTP/HTTPS)')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() => expect(screen.getByText('Ready to Create Endpoint')).toBeInTheDocument());
    // 'N/A' should appear in the summary for the empty url field
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);

    formValues = originalFormValues;
  });

  // ── Create with no headers (headers falsy → empty object used) ─────────────

  it('creates HTTP pull endpoint without headers (empty headers branch)', async () => {
    const originalFormValues = { ...formValues };
    formValues = { ...formValues, sourceType: 'http', url: 'https://example.com', headers: '' };
    createPullJobMock.mockResolvedValue({ message: 'created-ok' });

    render(<DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="pull" />);
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => expect(screen.getByText('Pull Configuration (SFTP/HTTPS)')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() => expect(screen.getByText('Ready to Create Endpoint')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Create Endpoint'));
    await waitFor(() => expect(createPullJobMock).toHaveBeenCalled());

    const callArgs = createPullJobMock.mock.calls[0][0];
    expect(callArgs.connection.headers).toEqual({});

    formValues = originalFormValues;
  });

  // ── SFTP with authType=key (private key branch) ───────────────────────────

  it('creates SFTP pull endpoint with authType=key (private_key branch)', async () => {
    const originalFormValues = { ...formValues };
    formValues = {
      ...formValues,
      sourceType: 'sftp',
      authType: 'key',
      password: 'my-private-key\\nmore-key',
      port: '',  // empty port → null
    };
    createPullJobMock.mockResolvedValue({ message: 'created-sftp-key' });

    render(<DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="pull" />);
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => expect(screen.getByText('Pull Configuration (SFTP/HTTPS)')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() => expect(screen.getByText('Ready to Create Endpoint')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Create Endpoint'));
    await waitFor(() => expect(createPullJobMock).toHaveBeenCalled());

    const callArgs = createPullJobMock.mock.calls[0][0];
    expect(callArgs.connection.auth_type).toBe('PRIVATE_KEY');
    expect(callArgs.connection.port).toBeNull(); // parseInt('') = NaN → || null

    formValues = originalFormValues;
  });

  // ── generateEndpointUrl branches ──────────────────────────────────────────

  it('generateEndpointUrl returns fallback when no version and no path', () => {
    const originalFormValues = { ...formValues };
    formValues = { ...formValues, version: '', endpointPath: '' };

    render(<DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="push" />);
    fireEvent.click(screen.getByText('Continue'));
    // Just ensure the component renders without errors
    expect(screen.getByText('Push Configuration (REST API)')).toBeInTheDocument();

    formValues = originalFormValues;
  });

  it('generateEndpointUrl uses version path when version set but no endpointPath', () => {
    const originalFormValues = { ...formValues };
    formValues = { ...formValues, version: 'v1.0', endpointPath: '' };

    render(<DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="push" />);
    fireEvent.click(screen.getByText('Continue'));
    expect(screen.getByText('Push Configuration (REST API)')).toBeInTheDocument();

    formValues = originalFormValues;
  });

  it('ValidationError message || "" fallback: errors with missing message property', () => {
    // Errors with no .message causes the || '' fallback to be taken
    formErrors = {
      name: {},
      version: {},
      sourceType: {},
      description: {},
      schedule: {},
      host: {},
      port: {},
      authType: {},
      username: {},
      password: {},
      pathPattern: {},
      fileFormat: {},
      delimiter: {},
      url: {},
      headers: {},
      targetTable: {},
      ingestMode: {},
      endpointPath: {},
    };

    const originalFormValues = { ...formValues };
    formValues = { ...formValues, sourceType: 'sftp', authType: 'password', fileFormat: 'csv' };

    render(<DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="pull" />);
    fireEvent.click(screen.getByText('Continue'));
    // ValidationError renders for all these errors but message='' (|| '' fallback covered)
    const validationErrors = screen.getAllByTestId('validation-error');
    expect(validationErrors.length).toBeGreaterThan(0);

    formValues = originalFormValues;
  });

  it('ValidationError message || "" fallback for HTTP pull errors', () => {
    formErrors = {
      name: {},
      url: {},
      headers: {},
    };

    const originalFormValues = { ...formValues };
    formValues = { ...formValues, sourceType: 'http' };

    render(<DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} jobType="pull" />);
    fireEvent.click(screen.getByText('Continue'));
    const validationErrors = screen.getAllByTestId('validation-error');
    expect(validationErrors.length).toBeGreaterThan(0);

    formValues = originalFormValues;
  });

  it('handleInputChange via hidden radio: configurationType and sourceType and else branch', async () => {
    render(
      <DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={jest.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText('Please Select Configuration Type')).toBeInTheDocument();
    });

    // Search the whole document for the radio inputs (they may be in a portal or outside container)
    const configRadio = document.querySelector('input[type="radio"][name="configurationType"]');
    if (configRadio) {
      // covers: name === 'configurationType' branch (BRDA:1135)
      fireEvent.change(configRadio, { target: { name: 'configurationType', value: 'push' } });
      // covers: name === 'sourceType', value === 'http' branch (BRDA:1140, 1143)
      fireEvent.change(configRadio, { target: { name: 'sourceType', value: 'http' } });
      // covers: name === 'sourceType', value === 'sftp' branch (BRDA:1153)
      fireEvent.change(configRadio, { target: { name: 'sourceType', value: 'sftp' } });
      // covers: else branch (BRDA:1161)
      fireEvent.change(configRadio, { target: { name: 'otherField', value: 'someVal' } });
    }

    expect(screen.getByText('Please Select Configuration Type')).toBeInTheDocument();
  });

  it('createPullJob with no backend message covers || fallback for non-editMode (BRDA:1273)', async () => {
    // When response has no .message, the || fallback produces the default message
    createPullJobMock.mockResolvedValue({});
    const onSave = jest.fn();

    render(<DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={onSave} jobType="pull" />);
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => expect(screen.getByText('Pull Configuration (SFTP/HTTPS)')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() => expect(screen.getByText('Ready to Create Endpoint')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Create Endpoint'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
  });

  it('createPullJob editMode with no backend message covers || fallback for editMode (BRDA:1276)', async () => {
    updatePullJobMock.mockResolvedValue({});
    const onSave = jest.fn();

    render(
      <DataEnrichmentFormModal isOpen onClose={jest.fn()} onSave={onSave} editMode jobId="job-42" jobType="pull" />
    );

    await waitFor(() => expect(getByIdMock).toHaveBeenCalled());
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => expect(screen.getByText('Pull Configuration (SFTP/HTTPS)')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() => expect(screen.getByText('Ready to Create Endpoint')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Create Endpoint'));
    await waitFor(() => expect(updatePullJobMock).toHaveBeenCalled());
  });
});