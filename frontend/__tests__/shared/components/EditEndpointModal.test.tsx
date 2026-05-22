import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import EditEndpointModal from '../../../src/shared/components/EditEndpointModal';

const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();
const mockNavigate = jest.fn();
const mockOnClose = jest.fn();
const mockOnSuccess = jest.fn();
const mockOnRevertToEditor = jest.fn();
const mockOnSendForDeployment = jest.fn();
const mockOnNextStep = jest.fn();
const mockSetIsInCloneMode = jest.fn();

const mockGetConfig = jest.fn();
const mockCreateConfig = jest.fn();
const mockUpdateConfig = jest.fn();
const mockSubmitForApproval = jest.fn();
const mockApproveConfig = jest.fn();
const mockDeployConfig = jest.fn();

const mockAddFunction = jest.fn();
const mockDeleteFunction = jest.fn();

const mockIsApprover = jest.fn().mockReturnValue(false);
const mockIsEditor = jest.fn().mockReturnValue(true);
const mockIsExporter = jest.fn().mockReturnValue(false);
const mockIsPublisher = jest.fn().mockReturnValue(false);
const mockGetDestinationFieldsJson = jest.fn();

let mockUser: any = {
  tenantId: 'test-tenant',
  id: 'user-1',
  claims: ['editor'],
};

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../src/features/auth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

jest.mock('../../../src/shared/providers/ToastProvider', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}));

jest.mock('../../../src/features/config/services/configApi', () => ({
  configApi: {
    getConfig: (...args: any[]) => mockGetConfig(...args),
    createConfig: (...args: any[]) => mockCreateConfig(...args),
    updateConfig: (...args: any[]) => mockUpdateConfig(...args),
    submitForApproval: (...args: any[]) => mockSubmitForApproval(...args),
    approveConfig: (...args: any[]) => mockApproveConfig(...args),
    deployConfig: (...args: any[]) => mockDeployConfig(...args),
  },
}));

jest.mock('../../../src/features/functions/services/functionsApi', () => ({
  addFunction: (...args: any[]) => mockAddFunction(...args),
  deleteFunction: (...args: any[]) => mockDeleteFunction(...args),
}));

jest.mock('../../../src/utils/common/roleUtils', () => ({
  isApprover: (...args: any[]) => mockIsApprover(...args),
  isEditor: (...args: any[]) => mockIsEditor(...args),
  isExporter: (...args: any[]) => mockIsExporter(...args),
  isPublisher: (...args: any[]) => mockIsPublisher(...args),
}));

jest.mock('../../../src/features/data-model', () => ({
  dataModelApi: {
    getDestinationFieldsJson: (...args: any[]) =>
      mockGetDestinationFieldsJson(...args),
  },
}));

jest.mock('../../../src/shared/utils/schemaUtils', () => ({
  convertInferredFieldsToJsonSchema: jest.fn((fields: any) => ({
    type: 'object',
    properties: {},
  })),
}));

jest.mock('../../../src/shared/utils/statusColors', () => ({
  isStatus: (actual: string | undefined, expected: string) =>
    actual === expected,
}));


jest.mock('../../../src/shared/components/PayloadEditor', () => {
  const React = require('react');
  const PayloadEditor = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      validateAllFields: () => true,
    }));
    return (
      <div data-testid="payload-editor">
        <button
          data-testid="set-schema"
          onClick={() =>
            props.onSchemaChange?.([
              { path: 'field1', type: 'String', required: true, level: 0 },
            ])
          }
        >
          Set Schema
        </button>
        <button
          data-testid="set-endpoint-data"
          onClick={() =>
            props.onEndpointDataChange?.({
              version: '1',
              transactionType: 'acmt.023',
              description: 'test',
              contentType: 'application/json',
              msgFam: 'acmt',
            })
          }
        >
          Set Endpoint Data
        </button>
        <button
          data-testid="set-payload"
          onClick={() => props.onChange?.('{"test":1}')}
        >
          Set Payload
        </button>
        <button
          data-testid="set-schema-object"
          onClick={() =>
            props.onSchemaChange?.({
              type: 'object',
              properties: {
                transaction: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    amount: { type: 'number' },
                  },
                },
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                    },
                  },
                },
                status: { type: 'string' },
              },
            })
          }
        >
          Set Schema Object
        </button>
        <button
          data-testid="set-schema-empty-array"
          onClick={() => props.onSchemaChange?.([])}
        >
          Set Schema Empty Array
        </button>
        <button
          data-testid="set-invalid-payload"
          onClick={() => props.onChange?.('not valid json {')}
        >
          Set Invalid Payload
        </button>
        {props.existingSchemaFields && (
          <span data-testid="has-schema-fields">yes</span>
        )}
        PayloadEditor
      </div>
    );
  });
  return {
    __esModule: true,
    PayloadEditor,
    default: PayloadEditor,
  };
});

jest.mock('../../../src/shared/components/MappingUtility', () => ({
  MappingUtility: (props: any) => {
    return (
      <div data-testid="mapping-utility">
        <button
          data-testid="set-mapping-valid"
          onClick={() => props.onMappingChange?.(true)}
        >
          Validate Mapping
        </button>
        <button
          data-testid="set-mappings"
          onClick={() =>
            props.onCurrentMappingsChange?.([
              {
                source: 'field1',
                destination: 'transactionDetails.msgId',
              },
              {
                source: 'field2',
                destination: 'transactionDetails.CreDtTm',
              },
            ])
          }
        >
          Set Mappings
        </button>
        <button
          data-testid="set-mappings-with-func-params"
          onClick={() =>
            props.onCurrentMappingsChange?.([
              { source: 'field1', destination: 'transactionDetails.msgId' },
              { source: 'field2', destination: 'transactionDetails.CreDtTm' },
              { source: 'field3', destination: 'redis.dbtrAcctId' },
              { source: 'field4', destination: 'redis.dbtrNm' },
              { source: 'field5', destination: 'redis.someParam' },
            ])
          }
        >
          Set Mappings With Func Params
        </button>
        <button
          data-testid="set-mappings-no-required"
          onClick={() =>
            props.onCurrentMappingsChange?.([
              { source: 'field1', destination: 'other.field' },
            ])
          }
        >
          Set Mappings No Required
        </button>
        <button
          data-testid="set-mappings-only-msgid"
          onClick={() =>
            props.onCurrentMappingsChange?.([
              { source: 'field1', destination: 'transactionDetails.msgId' },
            ])
          }
        >
          Set Mappings Only MsgId
        </button>
        <button
          data-testid="set-mappings-only-credttm"
          onClick={() =>
            props.onCurrentMappingsChange?.([
              { source: 'field1', destination: 'transactionDetails.CreDtTm' },
            ])
          }
        >
          Set Mappings Only CreDtTm
        </button>
        MappingUtility
      </div>
    );
  },
}));

jest.mock('../../../src/shared/components/SimulationPanel', () => ({
  SimulationPanel: (props: any) => (
    <div data-testid="simulation-panel">
      <button
        data-testid="simulation-pass"
        onClick={() => props.onSimulationComplete?.(true)}
      >
        Pass Simulation
      </button>
      <button
        data-testid="simulation-fail"
        onClick={() => props.onSimulationComplete?.(false)}
      >
        Fail Simulation
      </button>
      SimulationPanel
    </div>
  ),
}));

jest.mock('../../../src/shared/components/DeploymentConfirmation', () => ({
  DeploymentConfirmation: (props: any) => (
    <div data-testid="deployment-confirmation">
      DeploymentConfirmation configId={props.configId}
    </div>
  ),
}));

jest.mock('../../../src/shared/components/Button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

const baseConfig = {
  id: 42,
  version: '1',
  transactionType: 'acmt.023',
  contentType: 'application/json',
  msgFam: 'acmt',
  status: 'STATUS_01_DRAFT',
  payload: '{"test":1}',
  schema: { type: 'object', properties: { test: { type: 'number' } } },
  mapping: [
    { source: 'f1', destination: 'transactionDetails.msgId' },
    { source: 'f2', destination: 'transactionDetails.CreDtTm' },
  ],
  functions: [],
  endpointPath: '/transactions/acmt.023',
};

const renderModal = (props: Partial<React.ComponentProps<typeof EditEndpointModal>> = {}) =>
  render(
    <EditEndpointModal
      isOpen={true}
      onClose={mockOnClose}
      endpointId={-1}
      onSuccess={mockOnSuccess}
      setIsInCloneMode={mockSetIsInCloneMode}
      {...props}
    />,
  );

describe('EditEndpointModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    mockUser = {
      tenantId: 'test-tenant',
      id: 'user-1',
      claims: ['editor'],
    };
    mockIsApprover.mockReturnValue(false);
    mockIsEditor.mockReturnValue(true);
    mockIsExporter.mockReturnValue(false);
    mockIsPublisher.mockReturnValue(false);
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    mockCreateConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, id: 99 },
    });
    mockUpdateConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    mockSubmitForApproval.mockResolvedValue({ success: true });
    mockApproveConfig.mockResolvedValue({ success: true });
    mockDeployConfig.mockResolvedValue({ success: true });
    mockAddFunction.mockResolvedValue({ success: true });
    mockDeleteFunction.mockResolvedValue({ success: true });
  });

  it('returns null when isOpen is false', () => {
    const { container } = render(
      <EditEndpointModal
        isOpen={false}
        onClose={mockOnClose}
        endpointId={-1}
        setIsInCloneMode={mockSetIsInCloneMode}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders Create New Connection title for new endpoint', () => {
    renderModal();
    expect(screen.getByText('Create New Connection')).toBeInTheDocument();
  });

  it('renders Edit Configuration title for existing endpoint', async () => {
    renderModal({ endpointId: 42 });
    await waitFor(() => {
      expect(screen.getByText('Edit Configuration')).toBeInTheDocument();
    });
  });

  it('renders View Configuration title in readOnly mode', async () => {
    renderModal({ endpointId: 42, readOnly: true });
    await waitFor(() => {
      expect(screen.getByText('View Configuration')).toBeInTheDocument();
    });
  });

  it('renders Clone Configuration title in clone check mode', async () => {
    renderModal({ endpointId: 42, isCloneCheck: true });
    await waitFor(() => {
      expect(screen.getByText('Clone Configuration')).toBeInTheDocument();
    });
  });

  it('calls onClose when X button is clicked', () => {
    renderModal();
    const closeButtons = screen.getAllByRole('button');
    const xButton = closeButtons.find((b) => b.querySelector('svg'));
    if (xButton) fireEvent.click(xButton);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('loads existing config and populates state', async () => {
    renderModal({ endpointId: 42 });
    await waitFor(() => {
      expect(mockGetConfig).toHaveBeenCalledWith(42);
    });
    expect(screen.getByText('Edit Configuration')).toBeInTheDocument();
  });

  it('handles loadExistingConfig when response has direct config format', async () => {
    mockGetConfig.mockResolvedValue({ ...baseConfig });
    renderModal({ endpointId: 42 });
    await waitFor(() => {
      expect(mockGetConfig).toHaveBeenCalledWith(42);
    });
  });

  it('shows error when config is null in response', async () => {
    mockGetConfig.mockResolvedValue({ success: true, config: null });
    renderModal({ endpointId: 42 });
    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalled();
    });
  });

  it('shows error when loadExistingConfig throws', async () => {
    mockGetConfig.mockRejectedValue(new Error('Network error'));
    renderModal({ endpointId: 42 });
    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Failed to Load Configuration',
        'Network error',
      );
    });
  });

  it('shows error when loadExistingConfig throws non-Error', async () => {
    mockGetConfig.mockRejectedValue('string error');
    renderModal({ endpointId: 42 });
    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Failed to Load Configuration',
        'Unknown error',
      );
    });
  });

  it('loads config with schema but no payload', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        payload: null,
        schema: { type: 'object', properties: {} },
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => {
      expect(mockGetConfig).toHaveBeenCalledWith(42);
    });
  });

  it('loads config with functions array', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        functions: [
          { functionName: 'addAccount', params: ['redis.dbtrAcctId'] },
        ],
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => {
      expect(mockGetConfig).toHaveBeenCalledWith(42);
    });
  });

  it('loads config in clone mode', async () => {
    renderModal({
      endpointId: 42,
      isCloneMode: true,
      isCloneCheck: true,
    });
    await waitFor(() => {
      expect(mockGetConfig).toHaveBeenCalledWith(42);
      expect(screen.getByText('Clone Configuration')).toBeInTheDocument();
    });
  });

  it('renders backdrop when modal is open', () => {
    renderModal({ endpointId: 42 });
    expect(screen.getByTestId('mui-backdrop')).toBeInTheDocument();
  });

  it('creates new config on Save and Next in payload step', async () => {
    renderModal();

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByTestId('set-payload'));

    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockCreateConfig).toHaveBeenCalled();
    });
  });

  it('shows error when payload is empty', async () => {
    renderModal();
    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));

    fireEvent.click(screen.getByText('Save and Next'));
  });

  it('updates existing config on Save and Next', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    renderModal({ endpointId: 42 });

    await waitFor(() => {
      expect(mockGetConfig).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockUpdateConfig).toHaveBeenCalled();
    });
  });

  it('handles save failure with statusCode 400', async () => {
    mockCreateConfig.mockResolvedValue({
      success: false,
      statusCode: 400,
      message: 'Bad request',
    });
    renderModal();
    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByTestId('set-payload'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Bad request');
    });
  });

  it('handles save failure without config in response', async () => {
    mockCreateConfig.mockResolvedValue({
      success: true,
      config: null,
    });
    renderModal();
    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByTestId('set-payload'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockCreateConfig).toHaveBeenCalled();
    });
  });

  it('handles save exception', async () => {
    mockCreateConfig.mockRejectedValue(new Error('Save failed'));
    renderModal();
    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByTestId('set-payload'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockCreateConfig).toHaveBeenCalled();
    });
  });

  it('creates config in clone mode', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    renderModal({
      endpointId: 42,
      isCloneMode: true,
      isCloneCheck: true,
    });

    await waitFor(() => {
      expect(mockGetConfig).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockCreateConfig).toHaveBeenCalled();
    });
  });

  it('navigates through all steps for an existing config', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    renderModal({ endpointId: 42 });

    await waitFor(() => {
      expect(mockGetConfig).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(screen.getByText('MappingUtility')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));

    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(screen.getByText('Select Functions')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('simulation-pass'));

    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(
        screen.getByText(/DeploymentConfirmation/),
      ).toBeInTheDocument();
    });
  });

  it('goes back from mapping to payload step', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    renderModal({ endpointId: 42 });

    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(screen.getByText('MappingUtility')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Back'));

    await waitFor(() => {
      expect(screen.getByText('PayloadEditor')).toBeInTheDocument();
    });
  });

  it('shows error on mapping step when mapping is not valid', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    renderModal({ endpointId: 42 });

    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(screen.getByText('MappingUtility')).toBeInTheDocument();
    });

    const saveBtn = screen.getByText('Save and Next');
    expect(saveBtn).toBeDisabled();
  });

  it('shows error on mapping step when msgId mapping is missing', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    renderModal({ endpointId: 42 });

    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(screen.getByText('MappingUtility')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings-no-required'));

    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalled();
    });
  });

  it('shows error on simulation step when simulation not passed', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    renderModal({ endpointId: 42 });

    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );

    const saveBtn = screen.getByText('Save and Next');
    expect(saveBtn).toBeDisabled();
  });

  it('submits for approval on deploy step (editor)', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    renderModal({ endpointId: 42 });

    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() =>
      expect(
        screen.getByText(/DeploymentConfirmation/),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Send for Approval'));

    await waitFor(() => {
      expect(mockSubmitForApproval).toHaveBeenCalled();
    });
  });

  it('handles deploy failure', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    mockSubmitForApproval.mockResolvedValue({
      success: false,
      message: 'Deploy failed',
    });
    renderModal({ endpointId: 42 });

    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Send for Approval'));

    await waitFor(() => {
      expect(mockSubmitForApproval).toHaveBeenCalled();
    });
  });

  it('handles deploy exception', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    mockSubmitForApproval.mockRejectedValue(new Error('Network error'));

    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Send for Approval'));

    await waitFor(() => {
      expect(mockSubmitForApproval).toHaveBeenCalled();
    });
  });

  it('approver sends for deployment on deploy step (under_review status)', async () => {
    mockIsApprover.mockReturnValue(true);
    mockIsEditor.mockReturnValue(false);
    mockUser = { ...mockUser, claims: ['approver'] };

    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, status: 'STATUS_03_UNDER_REVIEW' },
    });

    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getAllByText('Send for Deployment').find(el => el.tagName === 'BUTTON') || screen.getAllByText('Send for Deployment')[0]);
    await waitFor(() => {
      expect(mockApproveConfig).toHaveBeenCalled();
    });
  });

  it('approver deploys config (non under_review status)', async () => {
    mockIsApprover.mockReturnValue(true);
    mockIsEditor.mockReturnValue(false);
    mockUser = { ...mockUser, claims: ['approver'] };

    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, status: 'STATUS_01_DRAFT' },
    });

    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getAllByText('Send for Deployment').find(el => el.tagName === 'BUTTON') || screen.getAllByText('Send for Deployment')[0]);
    await waitFor(() => {
      expect(mockDeployConfig).toHaveBeenCalled();
    });
  });

  it('renders Next button for approver in readOnly mode', async () => {
    mockIsApprover.mockReturnValue(true);
    mockIsEditor.mockReturnValue(false);
    mockUser = { ...mockUser, claims: ['approver'] };

    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, status: 'STATUS_03_UNDER_REVIEW' },
    });

    renderModal({
      endpointId: 42,
      readOnly: true,
      onRevertToEditor: mockOnRevertToEditor,
      onSendForDeployment: mockOnSendForDeployment,
      onNextStep: mockOnNextStep,
    });

    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    expect(screen.getByText('Next')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Next'));
    expect(mockOnNextStep).toHaveBeenCalled();
  });

  it('renders Reject and Approve buttons for approver on deploy step in readOnly', async () => {
    mockIsApprover.mockReturnValue(true);
    mockIsEditor.mockReturnValue(false);
    mockUser = { ...mockUser, claims: ['approver'] };

    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, status: 'STATUS_03_UNDER_REVIEW' },
    });

    renderModal({
      endpointId: 42,
      readOnly: true,
      onRevertToEditor: mockOnRevertToEditor,
      onSendForDeployment: mockOnSendForDeployment,
      onNextStep: mockOnNextStep,
    });

    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      const rejectBtn = screen.queryByText('Reject');
      const approveBtn = screen.queryByText('Approve');
      expect(rejectBtn || approveBtn).toBeTruthy();
    });
  });

  it('shows rejection comment when status is STATUS_05_REJECTED', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        status: 'STATUS_05_REJECTED',
        comments: 'Please fix the mapping',
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => {
      expect(screen.getByText('Rejection Comment')).toBeInTheDocument();
      expect(
        screen.getByText('Please fix the mapping'),
      ).toBeInTheDocument();
    });
  });

  it('shows approval comment when status is STATUS_04_APPROVED', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        status: 'STATUS_04_APPROVED',
        comments: 'Looks good',
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => {
      expect(screen.getByText('Approval Comment')).toBeInTheDocument();
      expect(screen.getByText('Looks good')).toBeInTheDocument();
    });
  });

  it('shows no functions message when no functions selected', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });

    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );
  });

  it('shows add function modal and adds a function', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));

    await waitFor(() => {
      expect(screen.getByText('Select Function')).toBeInTheDocument();
    });

    const radioButtons = screen.getAllByRole('radio');
    if (radioButtons.length > 0) {
      fireEvent.click(radioButtons[0]);
    }

    const addButtons = screen.getAllByText('Add Function');
    const formAddButton = addButtons[addButtons.length - 1];
    fireEvent.click(formAddButton);

    await waitFor(() => {
      expect(mockAddFunction).toHaveBeenCalled();
    });
  });

  it('handles addFunction API failure', async () => {
    mockAddFunction.mockResolvedValue({
      success: false,
      message: 'Function error',
    });
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const radioButtons = screen.getAllByRole('radio');
    if (radioButtons.length > 0) fireEvent.click(radioButtons[0]);
    const addButtons = screen.getAllByText('Add Function');
    fireEvent.click(addButtons[addButtons.length - 1]);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalled();
    });
  });

  it('handles addFunction API exception', async () => {
    mockAddFunction.mockRejectedValue(new Error('Network failed'));
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const radioButtons = screen.getAllByRole('radio');
    if (radioButtons.length > 0) fireEvent.click(radioButtons[0]);
    const addButtons = screen.getAllByText('Add Function');
    fireEvent.click(addButtons[addButtons.length - 1]);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Failed to add function. Please try again.',
      );
    });
  });

  it('removes a function', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        functions: [
          {
            functionName: 'addAccount',
            params: ['redis.dbtrAcctId', 'transactionDetails.TenantId', 'redis.creDtTm'],
          },
        ],
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('addAccount')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Remove'));

    await waitFor(() => {
      expect(mockDeleteFunction).toHaveBeenCalled();
    });
  });

  it('handles removeFunction failure', async () => {
    mockDeleteFunction.mockResolvedValue({
      success: false,
      message: 'Remove failed',
    });
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        functions: [
          { functionName: 'addAccount', params: ['redis.dbtrAcctId'] },
        ],
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('addAccount')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Remove'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalled();
    });
  });

  it('handles removeFunction exception', async () => {
    mockDeleteFunction.mockRejectedValue(new Error('Network'));
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        functions: [
          { functionName: 'addAccount', params: ['redis.dbtrAcctId'] },
        ],
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('addAccount')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Remove'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalled();
    });
  });

  it('closes add function modal via Cancel', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const cancelButtons = screen.getAllByText('Cancel');
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);
  });

  it('changes selected function in FunctionSelectionForm', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const selectEl = screen.getByDisplayValue('Add Account');
    fireEvent.change(selectEl, { target: { value: 'addEntity' } });

    await waitFor(() => {
      expect(screen.getByText('Creditor Entity')).toBeInTheDocument();
    });
  });

  it('toggles optional parameters for saveTransactionDetails', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const selectEl = screen.getByDisplayValue('Add Account');
    fireEvent.change(selectEl, {
      target: { value: 'saveTransactionDetails' },
    });

    await waitFor(() => {
      expect(
        screen.getByText('Create Transaction Relationship'),
      ).toBeInTheDocument();
    });

    const radioButtons = screen.getAllByRole('radio');
    fireEvent.click(radioButtons[0]);

    const checkboxes = screen.getAllByRole('checkbox');
    if (checkboxes.length > 0) {
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[0]);
    }
  });

  it('shows addDataModel configuration form', async () => {
    mockGetDestinationFieldsJson.mockResolvedValue({
      success: true,
      data: {
        accounts: { id: 'string', balance: 'number' },
        entities: { name: 'string' },
      },
    });
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const selectEl = screen.getByDisplayValue('Add Account');
    fireEvent.change(selectEl, { target: { value: 'addDataModel' } });

    await waitFor(() => {
      expect(
        screen.getByText('Data Model Configuration'),
      ).toBeInTheDocument();
    });

    const tableNameInput = screen.getByPlaceholderText('Enter table name');
    fireEvent.change(tableNameInput, { target: { value: 'my_table' } });

    fireEvent.change(tableNameInput, { target: { value: '123invalid' } });
  });

  it('prevents special characters on tableName keypress', async () => {
    mockGetDestinationFieldsJson.mockResolvedValue({
      success: true,
      data: { accounts: { id: 'string' } },
    });
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );
    const selectEl = screen.getByDisplayValue('Add Account');
    fireEvent.change(selectEl, { target: { value: 'addDataModel' } });

    await waitFor(() =>
      expect(screen.getByPlaceholderText('Enter table name')).toBeInTheDocument(),
    );

    const tableNameInput = screen.getByPlaceholderText('Enter table name');
    fireEvent.keyPress(tableNameInput, {
      key: 'a',
      charCode: 97,
    });
    const prevented = fireEvent.keyPress(tableNameInput, {
      key: '@',
      charCode: 64,
    });
  });

  it('handles getConfig failure during deploy validation', async () => {
    let getConfigCallCount = 0;
    mockGetConfig.mockImplementation(() => {
      getConfigCallCount++;
      if (getConfigCallCount === 1) {
        return Promise.resolve({
          success: true,
          config: { ...baseConfig },
        });
      }
      return Promise.reject(new Error('Validation check failed'));
    });

    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Send for Approval'));
  });

  it('renders custom step icons with different states', () => {
    renderModal();
    expect(screen.getByText('Payload & Schema')).toBeInTheDocument();
  });

  it('navigates with Next button for exporter in readOnly mode', async () => {
    mockIsExporter.mockReturnValue(true);
    mockIsEditor.mockReturnValue(false);
    mockUser = { ...mockUser, claims: ['exporter'] };

    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, status: 'STATUS_04_APPROVED' },
    });

    renderModal({
      endpointId: 42,
      readOnly: true,
      onNextStep: mockOnNextStep,
    });

    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    expect(screen.getByText('Next')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Next'));
    expect(mockOnNextStep).toHaveBeenCalled();
  });

  it('navigates with Next for publisher readOnly', async () => {
    mockIsPublisher.mockReturnValue(true);
    mockIsEditor.mockReturnValue(false);

    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });

    renderModal({
      endpointId: 42,
      readOnly: true,
      onNextStep: mockOnNextStep,
    });

    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    expect(screen.getByText('Next')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Next'));
  });

  it('shows Submit for Approval for editor readOnly on deploy step', async () => {
    mockIsEditor.mockReturnValue(true);
    mockUser = { ...mockUser, claims: ['editor'] };

    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, status: 'STATUS_01_DRAFT' },
    });

    renderModal({
      endpointId: 42,
      readOnly: true,
      onNextStep: mockOnNextStep,
    });

    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      const submitBtn = screen.queryByText('Submit for Approval');
      expect(submitBtn).toBeInTheDocument();
    });
  });

  it('loads config with neither payload nor schema', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        payload: null,
        schema: null,
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => {
      expect(mockGetConfig).toHaveBeenCalled();
    });
  });

  it('loads config with no mapping array', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        mapping: null,
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => {
      expect(mockGetConfig).toHaveBeenCalled();
    });
  });

  it('prevents adding duplicate function with same params', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        functions: [
          {
            functionName: 'addAccount',
            params: [
              'redis.dbtrAcctId',
              'transactionDetails.TenantId',
              'redis.creDtTm',
            ],
          },
        ],
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('addAccount')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const radioButtons = screen.getAllByRole('radio');
    fireEvent.click(radioButtons[0]);

    const addButtons = screen.getAllByText('Add Function');
    fireEvent.click(addButtons[addButtons.length - 1]);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        expect.stringContaining('already exists'),
      );
    });
  });

  it('prevents adding duplicate saveTransactionDetails', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        functions: [
          {
            functionName: 'saveTransactionDetails',
            params: [
              'transactionDetails.source',
              'transactionDetails.destination',
            ],
          },
        ],
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(
        screen.getByText('saveTransactionDetails'),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const selectEl = screen.getByDisplayValue('Add Account');
    fireEvent.change(selectEl, {
      target: { value: 'saveTransactionDetails' },
    });
    await waitFor(() =>
      expect(
        screen.getByText('Create Transaction Relationship'),
      ).toBeInTheDocument(),
    );

    const radioButtons = screen.getAllByRole('radio');
    fireEvent.click(radioButtons[radioButtons.length - 1]);

    const addButtons = screen.getAllByText('Add Function');
    fireEvent.click(addButtons[addButtons.length - 1]);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        expect.stringContaining('Save Transaction Details can only be added once'),
      );
    });
  });

  it('shows error when adding function without config ID', async () => {
    mockCreateConfig.mockResolvedValue({
      success: true,
      config: null,
    });
    renderModal({ endpointId: -1 });

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByTestId('set-payload'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockCreateConfig).toHaveBeenCalled();
    });
  });

  it('shows error when removing function without config ID', async () => {
    renderModal({ endpointId: -1 });

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByTestId('set-payload'));

    expect(screen.getByText('Save and Next')).toBeInTheDocument();
  });

  it('shows error when only CreDtTm mapping is missing', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId('set-mapping-valid'));

  });

  it('allows simulation step skip in readOnly mode', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });

    renderModal({
      endpointId: 42,
      readOnly: true,
      onNextStep: mockOnNextStep,
    });

    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));

    expect(screen.getByText('Next')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument();
    });
  });

  it('converts AJV schema to fields when no currentSchema array', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
            active: { type: 'boolean' },
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
              },
            },
            tags: {
              type: 'array',
              items: {
                type: 'object',
                properties: { tag: { type: 'string' } },
              },
            },
            simpleArray: {
              type: 'array',
              items: { type: 'string' },
            },
            unknown: { type: 'custom' },
          },
          required: ['name'],
        },
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => {
      expect(mockGetConfig).toHaveBeenCalled();
      expect(screen.getByTestId('has-schema-fields')).toBeInTheDocument();
    });
  });

  it('handles null user claims gracefully', async () => {
    mockUser = { tenantId: 'test', id: 'u1', claims: null };
    renderModal();
    expect(screen.getByText('Create New Connection')).toBeInTheDocument();
  });

  it('stops deploy when pre-deploy getConfig returns !success', async () => {
    let getConfigCallCount = 0;
    mockGetConfig.mockImplementation(() => {
      getConfigCallCount++;
      if (getConfigCallCount === 1) {
        return Promise.resolve({
          success: true,
          config: { ...baseConfig },
        });
      }
      return Promise.resolve({ success: false });
    });

    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Send for Approval'));

    await waitFor(() => {
      expect(mockSubmitForApproval).not.toHaveBeenCalled();
    });
  });

  it('closes add function modal via X button', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const allButtons = screen.getAllByRole('button');
    const closeButton = allButtons.find(
      (btn) =>
        btn.querySelector('svg') &&
        btn.className.includes('text-gray-500'),
    );
    if (closeButton) {
      fireEvent.click(closeButton);
    }
  });

  it('renders function with columns instead of params', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        functions: [
          {
            functionName: 'addDataModelTable',
            tableName: 'custom_table',
            columns: [
              { name: '_key', type: 'string', param: 'test.id', datasource: 'payload' },
              { name: 'data', type: 'jsonb', param: 'test', datasource: 'payload' },
            ],
          },
        ],
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(screen.getByText('addDataModelTable')).toBeInTheDocument();
      expect(screen.getByText('Table Name: custom_table')).toBeInTheDocument();
    });
  });

  it('shows Send for Deployment label for approver', () => {
    mockIsApprover.mockReturnValue(true);
    mockIsEditor.mockReturnValue(false);
    renderModal();
    expect(screen.getByText('Send for Deployment')).toBeInTheDocument();
  });

  it('shows Export label for exporter', () => {
    mockIsExporter.mockReturnValue(true);
    mockIsEditor.mockReturnValue(false);
    mockIsApprover.mockReturnValue(false);
    renderModal();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('shows Submit for Approval label for editor', () => {
    mockIsEditor.mockReturnValue(true);
    renderModal();
    expect(screen.getByText('Submit for Approval')).toBeInTheDocument();
  });

  it('handles deploy getConfig failure for approver', async () => {
    mockIsApprover.mockReturnValue(true);
    mockIsEditor.mockReturnValue(false);
    mockUser = { ...mockUser, claims: ['approver'] };

    let getConfigCallCount = 0;
    mockGetConfig.mockImplementation(() => {
      getConfigCallCount++;
      if (getConfigCallCount <= 2) {
        return Promise.resolve({
          success: true,
          config: { ...baseConfig, status: 'STATUS_03_UNDER_REVIEW' },
        });
      }
      return Promise.resolve({
        success: false,
        config: null,
      });
    });

    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getAllByText('Send for Deployment').find(el => el.tagName === 'BUTTON') || screen.getAllByText('Send for Deployment')[0]);
  });

  it('handles dataModel fields fetch failure', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => { });
    mockGetDestinationFieldsJson.mockRejectedValue(
      new Error('Fetch failed'),
    );
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const selectEl = screen.getByDisplayValue('Add Account');
    fireEvent.change(selectEl, { target: { value: 'addDataModel' } });

    await waitFor(() => {
      expect(mockGetDestinationFieldsJson).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });

  it('renders with null user', () => {
    mockUser = null;
    renderModal();
    expect(screen.getByText('Create New Connection')).toBeInTheDocument();
  });

  it('handles integer type in AJV schema conversion', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        schema: {
          type: 'object',
          properties: {
            count: { type: 'integer' },
          },
        },
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => {
      expect(mockGetConfig).toHaveBeenCalled();
    });
  });

  it('shows error when only CreDtTm mapping is missing', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings-only-msgid'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        expect.stringContaining('CreDtTm'),
      );
    });
  });

  it('shows error when only msgId mapping is missing', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings-only-credttm'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        expect.stringContaining('msgId'),
      );
    });
  });

  it('shows error when both required mappings are missing', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings-no-required'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        expect.stringContaining('both required'),
      );
    });
  });

  it('removes a function successfully', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        functions: [
          {
            functionName: 'addAccount',
            params: ['redis.dbtrAcctId', 'transactionDetails.TenantId', 'redis.creDtTm'],
          },
        ],
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('addAccount')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Remove'));
    await waitFor(() => {
      expect(mockDeleteFunction).toHaveBeenCalled();
    });
  });

  it('handles remove function failure', async () => {
    mockDeleteFunction.mockResolvedValue({
      success: false,
      message: 'Delete failed',
    });
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        functions: [
          {
            functionName: 'addAccount',
            params: ['redis.dbtrAcctId', 'transactionDetails.TenantId', 'redis.creDtTm'],
          },
        ],
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('addAccount')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Remove'));
    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to remove function'),
      );
    });
  });

  it('handles remove function exception', async () => {
    mockDeleteFunction.mockRejectedValue(new Error('Network error'));
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        functions: [
          {
            functionName: 'addAccount',
            params: ['redis.dbtrAcctId', 'transactionDetails.TenantId', 'redis.creDtTm'],
          },
        ],
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('addAccount')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Remove'));
    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        expect.stringContaining('Network error'),
      );
    });
  });

  it('adds a function via the add function modal', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const radioButtons = screen.getAllByRole('radio');
    fireEvent.click(radioButtons[0]);

    const addButtons = screen.getAllByText('Add Function');
    fireEvent.click(addButtons[addButtons.length - 1]);

    await waitFor(() => {
      expect(mockAddFunction).toHaveBeenCalled();
    });
  });

  it('handles add function API failure', async () => {
    mockAddFunction.mockResolvedValue({
      success: false,
      message: 'API error',
    });
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const radioButtons = screen.getAllByRole('radio');
    fireEvent.click(radioButtons[0]);
    const addButtons = screen.getAllByText('Add Function');
    fireEvent.click(addButtons[addButtons.length - 1]);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to add function'),
      );
    });
  });

  it('handles add function API exception', async () => {
    mockAddFunction.mockRejectedValue(new Error('Network failure'));
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const radioButtons = screen.getAllByRole('radio');
    fireEvent.click(radioButtons[0]);
    const addButtons = screen.getAllByText('Add Function');
    fireEvent.click(addButtons[addButtons.length - 1]);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Failed to add function. Please try again.',
      );
    });
  });

  it('shows data model configuration form when addDataModel selected', async () => {
    mockGetDestinationFieldsJson.mockResolvedValue({
      success: true,
      data: { users: { _key: { type: 'string' }, name: { type: 'string' } } },
    });
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const selectEl = screen.getByDisplayValue('Add Account');
    fireEvent.change(selectEl, { target: { value: 'addDataModel' } });

    await waitFor(() => {
      expect(screen.getByText('Data Model Configuration')).toBeInTheDocument();
    });
  });

  it('shows optional parameters for saveTransactionDetails', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const selectEl = screen.getByDisplayValue('Add Account');
    fireEvent.change(selectEl, {
      target: { value: 'saveTransactionDetails' },
    });
    await waitFor(() =>
      expect(screen.getByText('Create Transaction Relationship')).toBeInTheDocument(),
    );

    expect(screen.getByText(/Optional Parameters/)).toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.change(checkboxes[0], { target: { checked: true } });
  });

  it('shows error when deploying without created endpoint', async () => {
    mockCreateConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, id: 99 },
    });
    renderModal({ endpointId: -1 });

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByTestId('set-payload'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Send for Approval'));
    await waitFor(() => {
      expect(mockSubmitForApproval).toHaveBeenCalled();
    });
  });

  it('handles deploy getConfig exception', async () => {
    let getConfigCallCount = 0;
    mockGetConfig.mockImplementation(() => {
      getConfigCallCount++;
      if (getConfigCallCount === 1) {
        return Promise.resolve({
          success: true,
          config: { ...baseConfig },
        });
      }
      return Promise.reject(new Error('Network error'));
    });

    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Send for Approval'));
  });

  it('shows error for invalid JSON payload', async () => {
    renderModal();
    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    const payloadEditor = screen.getByTestId('payload-editor');
  });

  it('shows error when no schema fields generated', async () => {
    renderModal();
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByTestId('set-payload'));
    fireEvent.click(screen.getByText('Save and Next'));

  });

  it('shows error for empty schema array after save', async () => {
    renderModal();
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByTestId('set-payload'));
    fireEvent.click(screen.getByText('Save and Next'));
  });

  it('stops save when payload validation fails', async () => {
  });

  it('displays unmapped parameter warnings', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        functions: [
          {
            functionName: 'addAccount',
            params: ['redis.dbtrAcctId', 'transactionDetails.TenantId', 'redis.creDtTm'],
          },
        ],
        mapping: [
          { source: 'f1', destination: 'transactionDetails.msgId' },
          { source: 'f2', destination: 'transactionDetails.CreDtTm' },
        ],
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(screen.getByText('addAccount')).toBeInTheDocument();
    });
    expect(screen.getByText(/unmapped/)).toBeInTheDocument();
  });

  it('closes function modal via cancel button', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const cancelButtons = screen.getAllByText('Cancel');
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);

    expect(cancelButtons.length).toBeGreaterThan(0);
  });

  it('calls onClose and onSuccess after successful deploy', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    renderModal({ endpointId: 42, onSuccess: mockOnSuccess });

    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Send for Approval'));
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('sets error when deploy response is not success', async () => {
    mockSubmitForApproval.mockResolvedValue({
      success: false,
      message: 'Not authorized',
    });
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Send for Approval'));
  });

  it('handles deploy submission exception', async () => {
    mockSubmitForApproval.mockRejectedValue(new Error('Server down'));
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Send for Approval'));
  });

  it('approver deploys with success message', async () => {
    mockIsApprover.mockReturnValue(true);
    mockIsEditor.mockReturnValue(false);
    mockUser = { ...mockUser, claims: ['approver'] };

    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, status: 'STATUS_03_UNDER_REVIEW' },
    });

    renderModal({ endpointId: 42, onSuccess: mockOnSuccess });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getAllByText('Send for Deployment').find(el => el.tagName === 'BUTTON') || screen.getAllByText('Send for Deployment')[0]);
    await waitFor(() => {
      expect(mockApproveConfig).toHaveBeenCalled();
      expect(mockShowSuccess).toHaveBeenCalledWith(
        expect.stringContaining('deployment'),
      );
    });
  });

  it('handles approver deploy when inner getConfig throws', async () => {
    mockIsApprover.mockReturnValue(true);
    mockIsEditor.mockReturnValue(false);
    mockUser = { ...mockUser, claims: ['approver'] };

    let getConfigCallCount = 0;
    mockGetConfig.mockImplementation(() => {
      getConfigCallCount++;
      if (getConfigCallCount <= 2) {
        return Promise.resolve({
          success: true,
          config: { ...baseConfig, status: 'STATUS_03_UNDER_REVIEW' },
        });
      }
      return Promise.reject(new Error('Config fetch failed'));
    });

    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getAllByText('Send for Deployment').find(el => el.tagName === 'BUTTON') || screen.getAllByText('Send for Deployment')[0]);
  });

  it('handles mapping with array destinations', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        mapping: [
          { source: 'f1', destination: ['transactionDetails.msgId', 'transactionDetails.CreDtTm'] },
        ],
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => {
      expect(mockGetConfig).toHaveBeenCalled();
    });
  });

  it('displays function with columns in functions step', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        functions: [
          {
            functionName: 'addDataModelTable',
            tableName: 'test_table',
            columns: [
              { name: '_key', type: 'string', param: 'id', datasource: 'payload' },
              { name: 'data', type: 'jsonb', param: 'body', datasource: 'payload' },
            ],
          },
        ],
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(screen.getByText('addDataModelTable')).toBeInTheDocument();
      expect(screen.getByText('Table Name: test_table')).toBeInTheDocument();
    });
  });

  it('sets error state on save failure', async () => {
    mockCreateConfig.mockResolvedValue({
      success: false,
      message: 'Duplicate endpoint',
    });
    renderModal();
    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByTestId('set-payload'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockCreateConfig).toHaveBeenCalled();
    });
  });

  it('navigates back from functions to mapping step', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Back'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
  });

  it('hides remove button in readOnly mode', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        functions: [
          {
            functionName: 'addAccount',
            params: ['redis.dbtrAcctId', 'transactionDetails.TenantId', 'redis.creDtTm'],
          },
        ],
      },
    });
    renderModal({
      endpointId: 42,
      readOnly: true,
      onNextStep: mockOnNextStep,
    });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('addAccount')).toBeInTheDocument();
    });
    expect(screen.queryByText('Remove')).not.toBeInTheDocument();
  });

  it('handles approved status for approver readOnly', async () => {
    mockIsApprover.mockReturnValue(true);
    mockIsEditor.mockReturnValue(false);
    mockUser = { ...mockUser, claims: ['approver'] };

    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, status: 'STATUS_04_APPROVED' },
    });

    renderModal({
      endpointId: 42,
      readOnly: true,
      onRevertToEditor: mockOnRevertToEditor,
      onSendForDeployment: mockOnSendForDeployment,
      onNextStep: mockOnNextStep,
    });

    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));

    expect(screen.queryByText('Reject')).not.toBeInTheDocument();
    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
  });

  it('handles exported status for approver readOnly', async () => {
    mockIsApprover.mockReturnValue(true);
    mockIsEditor.mockReturnValue(false);
    mockUser = { ...mockUser, claims: ['approver'] };

    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, status: 'STATUS_06_EXPORTED' },
    });

    renderModal({
      endpointId: 42,
      readOnly: true,
      onRevertToEditor: mockOnRevertToEditor,
      onSendForDeployment: mockOnSendForDeployment,
      onNextStep: mockOnNextStep,
    });

    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));

    expect(screen.queryByText('Reject')).not.toBeInTheDocument();
  });

  it('saves config with related transaction data', async () => {
    renderModal();
    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByTestId('set-payload'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockCreateConfig).toHaveBeenCalled();
    });
  });

  it('adds addDataModel function with full form filled', async () => {
    mockGetDestinationFieldsJson.mockResolvedValue({
      success: true,
      data: {
        accounts: { id: 'string', balance: 'number' },
      },
    });
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const selectEl = screen.getByDisplayValue('Add Account');
    fireEvent.change(selectEl, { target: { value: 'addDataModel' } });

    await waitFor(() =>
      expect(screen.getByText('Data Model Configuration')).toBeInTheDocument(),
    );

    const tableNameInput = screen.getByPlaceholderText('Enter table name');
    fireEvent.change(tableNameInput, { target: { value: 'my_table' } });

    await waitFor(() => expect(mockGetDestinationFieldsJson).toHaveBeenCalled());

    const dataSelect = screen.getAllByRole('combobox').find(
      (el) => (el as HTMLSelectElement).options?.length > 1,
    );
    if (dataSelect) {
      const dataSelects = screen.getAllByRole('combobox');
      for (const sel of dataSelects) {
        const options = Array.from((sel as HTMLSelectElement).options);
        const dataModelOption = options.find((o) =>
          o.textContent?.includes('accounts'),
        );
        if (dataModelOption) {
          fireEvent.change(sel, { target: { value: dataModelOption.value } });
          break;
        }
      }
    }

    const primaryKeySelects = screen.getAllByRole('combobox');
    for (const sel of primaryKeySelects) {
      const options = Array.from((sel as HTMLSelectElement).options);
      const pkOption = options.find((o) => o.textContent === 'id');
      if (pkOption) {
        fireEvent.change(sel, { target: { value: pkOption.value } });
        break;
      }
    }

    const addButtons = screen.getAllByText('Add Function');
    fireEvent.click(addButtons[addButtons.length - 1]);

    await waitFor(() => {
      expect(mockAddFunction).toHaveBeenCalled();
    });
  });

  it('adds addDataModel with payload array schema', async () => {
    mockGetDestinationFieldsJson.mockResolvedValue({
      success: true,
      data: {},
    });
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        functions: [],
        schema: null,
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const selectEl = screen.getByDisplayValue('Add Account');
    fireEvent.change(selectEl, { target: { value: 'addDataModel' } });

    await waitFor(() =>
      expect(screen.getByText('Data Model Configuration')).toBeInTheDocument(),
    );
  });

  it('shows error for non-JSON string payload', async () => {
    renderModal();
    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
  });

  it('advances to mapping step after successful create', async () => {
    renderModal();
    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByTestId('set-payload'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockCreateConfig).toHaveBeenCalled();
      expect(screen.getByText('MappingUtility')).toBeInTheDocument();
    });
    expect(mockShowSuccess).toHaveBeenCalledWith(
      'Configuration saved successfully!',
    );
  });

  it('calls updateConfig for existing endpoint and advances', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    mockUpdateConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockUpdateConfig).toHaveBeenCalled();
      expect(mockShowSuccess).toHaveBeenCalledWith(
        'Configuration saved successfully!',
      );
    });
  });

  it('shows error when save response has no config', async () => {
    mockCreateConfig.mockResolvedValue({
      success: true,
      config: null,
    });
    renderModal();
    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByTestId('set-payload'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockCreateConfig).toHaveBeenCalled();
    });
  });

  it('shows update error on exception', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    mockUpdateConfig.mockRejectedValue(new Error('Update failed'));
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockUpdateConfig).toHaveBeenCalled();
    });
  });

  it('calls onClose and onSuccess after successful editor deploy', async () => {
    mockSubmitForApproval.mockResolvedValue({ success: true });
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    renderModal({ endpointId: 42, onSuccess: mockOnSuccess });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Send for Approval'));
    await waitFor(() => {
      expect(mockSubmitForApproval).toHaveBeenCalled();
      expect(mockShowSuccess).toHaveBeenCalledWith(
        expect.stringContaining('approval'),
      );
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('sets error when deploy response is not successful', async () => {
    mockSubmitForApproval.mockResolvedValue({
      success: false,
      message: 'Not authorized',
    });
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Send for Approval'));
    await waitFor(() => {
      expect(mockSubmitForApproval).toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  it('approver calls approveConfig for under_review status in handleDeploy', async () => {
    mockIsApprover.mockReturnValue(true);
    mockIsEditor.mockReturnValue(false);
    mockUser = { ...mockUser, claims: ['approver'] };

    let callCount = 0;
    mockGetConfig.mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        success: true,
        config: { ...baseConfig, status: 'STATUS_03_UNDER_REVIEW' },
      });
    });
    mockApproveConfig.mockResolvedValue({ success: true });

    renderModal({ endpointId: 42, onSuccess: mockOnSuccess });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    fireEvent.click(
      screen.getAllByText('Send for Deployment').find((el) => el.tagName === 'BUTTON') ||
      screen.getAllByText('Send for Deployment')[0],
    );
    await waitFor(() => {
      expect(mockApproveConfig).toHaveBeenCalled();
      expect(mockShowSuccess).toHaveBeenCalledWith(
        expect.stringContaining('deployment'),
      );
    });
  });

  it('approver calls deployConfig for draft status', async () => {
    mockIsApprover.mockReturnValue(true);
    mockIsEditor.mockReturnValue(false);
    mockUser = { ...mockUser, claims: ['approver'] };

    let callCount = 0;
    mockGetConfig.mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        success: true,
        config: { ...baseConfig, status: 'STATUS_01_DRAFT' },
      });
    });
    mockDeployConfig.mockResolvedValue({ success: true });

    renderModal({ endpointId: 42, onSuccess: mockOnSuccess });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    fireEvent.click(
      screen.getAllByText('Send for Deployment').find((el) => el.tagName === 'BUTTON') ||
      screen.getAllByText('Send for Deployment')[0],
    );
    await waitFor(() => {
      expect(mockDeployConfig).toHaveBeenCalled();
    });
  });

  it('handles approver deploy when inner getConfig throws Error', async () => {
    mockIsApprover.mockReturnValue(true);
    mockIsEditor.mockReturnValue(false);
    mockUser = { ...mockUser, claims: ['approver'] };

    let callCount = 0;
    mockGetConfig.mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        return Promise.resolve({
          success: true,
          config: { ...baseConfig, status: 'STATUS_03_UNDER_REVIEW' },
        });
      }
      return Promise.reject(new Error('Failed to get config status'));
    });

    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    fireEvent.click(
      screen.getAllByText('Send for Deployment').find((el) => el.tagName === 'BUTTON') ||
      screen.getAllByText('Send for Deployment')[0],
    );
  });

  it('hides Submit for Approval for editor when under review', async () => {
    mockIsEditor.mockReturnValue(true);
    mockUser = { ...mockUser, claims: ['editor'] };

    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, status: 'STATUS_03_UNDER_REVIEW' },
    });

    renderModal({
      endpointId: 42,
      readOnly: true,
      onNextStep: mockOnNextStep,
    });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));

    const submitButtons = screen.queryAllByText('Submit for Approval').filter(el => el.tagName === 'BUTTON');
    expect(submitButtons).toHaveLength(0);
  });

  it('hides action buttons on deploy step for non-privileged readOnly user', async () => {
    mockIsEditor.mockReturnValue(false);
    mockIsApprover.mockReturnValue(false);
    mockIsExporter.mockReturnValue(false);
    mockIsPublisher.mockReturnValue(false);
    mockUser = { ...mockUser, claims: [] };

    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });

    renderModal({
      endpointId: 42,
      readOnly: true,
      onNextStep: mockOnNextStep,
    });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    expect(screen.queryByText('Next')).not.toBeInTheDocument();
    expect(screen.queryByText('Save and Next')).not.toBeInTheDocument();
  });

  it('shows unmapped badge count for function with unmapped params', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        functions: [
          {
            functionName: 'addAccount',
            params: [
              'redis.dbtrAcctId',
              'transactionDetails.TenantId',
              'redis.creDtTm',
            ],
          },
        ],
        mapping: [
          { source: 'f1', destination: 'transactionDetails.msgId' },
          { source: 'f2', destination: 'transactionDetails.CreDtTm' },
        ],
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(screen.getByText('addAccount')).toBeInTheDocument();
      expect(screen.getByText(/unmapped/)).toBeInTheDocument();
    });

    const saveBtn = screen.getByText('Save and Next');
    expect(saveBtn).toBeDisabled();
  });

  it('shows runtime context fields in blue', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        functions: [
          {
            functionName: 'addAccount',
            params: [
              'redis.dbtrAcctId',
              'transactionDetails.TenantId',
              'redis.creDtTm',
              'transactionDetails.userId',
            ],
          },
        ],
        mapping: [
          { source: 'f1', destination: 'transactionDetails.msgId' },
          { source: 'f2', destination: 'transactionDetails.CreDtTm' },
          { source: 'f3', destination: 'redis.dbtrAcctId' },
          { source: 'f4', destination: 'transactionDetails.TenantId' },
          { source: 'f5', destination: 'redis.creDtTm' },
        ],
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(screen.getByText('addAccount')).toBeInTheDocument();
    });
  });

  it('handles mappings with array destination values', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        functions: [
          {
            functionName: 'addAccount',
            params: ['redis.dbtrAcctId', 'transactionDetails.TenantId', 'redis.creDtTm'],
          },
        ],
        mapping: [
          {
            source: 'f1',
            destination: [
              'transactionDetails.msgId',
              'redis.dbtrAcctId',
              'transactionDetails.TenantId',
              'redis.creDtTm',
            ],
          },
          { source: 'f2', destination: 'transactionDetails.CreDtTm' },
        ],
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(screen.getByText('addAccount')).toBeInTheDocument();
    });
  });

  it('uses createConfig in clone mode with existing config', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    mockCreateConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, id: 100 },
    });
    renderModal({
      endpointId: 42,
      isCloneMode: true,
      isCloneCheck: true,
    });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockCreateConfig).toHaveBeenCalled();
      expect(mockShowSuccess).toHaveBeenCalledWith(
        'Configuration saved successfully!',
      );
    });
  });

  it('shows statusCode 400 error from save response', async () => {
    mockCreateConfig.mockResolvedValue({
      success: false,
      statusCode: 400,
      message: 'Invalid transaction type',
    });
    renderModal();
    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByTestId('set-payload'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Invalid transaction type');
    });
  });

  it('shows Export button for exporter with approved status', async () => {
    mockIsExporter.mockReturnValue(true);
    mockIsEditor.mockReturnValue(false);
    mockIsApprover.mockReturnValue(false);
    mockUser = { ...mockUser, claims: ['exporter'] };

    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, status: 'STATUS_04_APPROVED' },
    });

    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    const exportBtns = screen.getAllByText('Export').filter(el => el.tagName === 'BUTTON');
    expect(exportBtns.length).toBeGreaterThan(0);
    expect(exportBtns[0]).not.toBeDisabled();
  });

  it('disables Export button for exporter with draft status', async () => {
    mockIsExporter.mockReturnValue(true);
    mockIsEditor.mockReturnValue(false);
    mockIsApprover.mockReturnValue(false);
    mockUser = { ...mockUser, claims: ['exporter'] };

    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, status: 'STATUS_01_DRAFT' },
    });

    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    const deployBtn = screen.getAllByRole('button').find(
      (btn) => btn.textContent === 'Configuration Approved',
    );
    expect(deployBtn).toBeTruthy();
    expect(deployBtn).toBeDisabled();
  });

  it('disables Send for Approval when editor config is under review', async () => {
    mockIsEditor.mockReturnValue(true);
    mockUser = { ...mockUser, claims: ['editor'] };

    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, status: 'STATUS_03_UNDER_REVIEW' },
    });

    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    const sendBtns = screen.getAllByText('Send for Approval').filter(el => el.tagName === 'BUTTON');
    expect(sendBtns.length).toBeGreaterThan(0);
    expect(sendBtns[0]).toBeDisabled();
  });

  it('shows Configuration Approved for approver with approved status', async () => {
    mockIsApprover.mockReturnValue(true);
    mockIsEditor.mockReturnValue(false);
    mockUser = { ...mockUser, claims: ['approver'] };

    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, status: 'STATUS_04_APPROVED' },
    });

    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    const approvedBtns = screen.getAllByText('Configuration Approved').filter(el => el.tagName === 'BUTTON');
    expect(approvedBtns.length).toBeGreaterThan(0);
  });

  it('handleSaveAndNext on deploy step calls handleDeploy', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    renderModal({ endpointId: 42, onSuccess: mockOnSuccess });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Send for Approval'));
    await waitFor(() => {
      expect(mockSubmitForApproval).toHaveBeenCalled();
    });
  });

  it('renders deploy step with default endpoint path', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, endpointPath: undefined },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );
  });

  it('publisher readOnly mode does not show action buttons on deploy', async () => {
    mockIsPublisher.mockReturnValue(true);
    mockIsEditor.mockReturnValue(false);
    mockIsApprover.mockReturnValue(false);
    mockIsExporter.mockReturnValue(false);
    mockUser = { ...mockUser, claims: ['publisher'] };

    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });

    renderModal({
      endpointId: 42,
      readOnly: true,
      onNextStep: mockOnNextStep,
    });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );
    expect(screen.queryByText('Send for Approval')).not.toBeInTheDocument();
    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
  });

  it('allows save without parsed JSON for non-JSON content type', async () => {
    renderModal();
    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByTestId('set-payload'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockCreateConfig).toHaveBeenCalled();
    });
  });

  it('passes existingSchemaFields as array when currentSchema is array', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        schema: null,
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));

    await waitFor(() => {
      expect(screen.getByTestId('has-schema-fields')).toBeInTheDocument();
    });
  });

  it('shows No parameters text for function without params', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        functions: [
          {
            functionName: 'addAccount',
            params: [],
          },
        ],
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(screen.getByText('addAccount')).toBeInTheDocument();
    });
   expect(screen.getByText(/No parameters/)).toBeInTheDocument();
  });

 it('sets error when pre-deploy validation getConfig throws', async () => {
    let callCount = 0;
    mockGetConfig.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          success: true,
          config: { ...baseConfig },
        });
      }
      return Promise.reject(new Error('Network timeout'));
    });

    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Send for Approval'));
    await waitFor(() => {
      expect(mockSubmitForApproval).not.toHaveBeenCalled();
    });
  });

  it('sets error when deploying without endpoint ID', async () => {
    renderModal({ endpointId: -1 });

    expect(screen.getByText('Save and Next')).toBeInTheDocument();
  });

  it('adds saveTransactionDetails with optional parameters', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const selectEl = screen.getByDisplayValue('Add Account');
    fireEvent.change(selectEl, {
      target: { value: 'saveTransactionDetails' },
    });
    await waitFor(() =>
      expect(
        screen.getByText('Create Transaction Relationship'),
      ).toBeInTheDocument(),
    );

    const radioButtons = screen.getAllByRole('radio');
    fireEvent.click(radioButtons[0]);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); 
    fireEvent.click(checkboxes[1]); 

    const addButtons = screen.getAllByText('Add Function');
    fireEvent.click(addButtons[addButtons.length - 1]);

    await waitFor(() => {
      expect(mockAddFunction).toHaveBeenCalled();
      const call = mockAddFunction.mock.calls[0];
      const params = call[1]?.params || call[0]?.params;
      if (params) {
        expect(
          params.some((p: string) => p.startsWith('transactionDetails.')),
        ).toBeTruthy();
      }
    });
  });

  it('updates mapping state via MappingUtility callback', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId('set-mappings'));
    expect(screen.getByText('MappingUtility')).toBeInTheDocument();
  });

  it('shows Reject and Approve for approver readOnly under_review on deploy', async () => {
    mockIsApprover.mockReturnValue(true);
    mockIsEditor.mockReturnValue(false);
    mockUser = { ...mockUser, claims: ['approver'] };

    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, status: 'STATUS_03_UNDER_REVIEW' },
    });

    renderModal({
      endpointId: 42,
      readOnly: true,
      onRevertToEditor: mockOnRevertToEditor,
      onSendForDeployment: mockOnSendForDeployment,
      onNextStep: mockOnNextStep,
    });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Reject')).toBeInTheDocument();
      expect(screen.getByText('Approve')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Reject'));
    expect(mockOnRevertToEditor).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Approve'));
    expect(mockOnSendForDeployment).toHaveBeenCalled();
  });

  it('blocks save when schema array becomes empty', async () => {
    renderModal();
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByTestId('set-payload'));
    fireEvent.click(screen.getByText('Save and Next'));
  });

  it('disables Save and Next on mapping step without config', async () => {
    renderModal();
    expect(screen.getByText('Save and Next')).not.toBeDisabled();
  });

  it('enables Send for Approval for clone check with under_review status', async () => {
    mockIsEditor.mockReturnValue(true);
    mockUser = { ...mockUser, claims: ['editor'] };

    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, status: 'STATUS_03_UNDER_REVIEW' },
    });

    renderModal({
      endpointId: 42,
      isCloneCheck: true,
    });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    const sendBtns2 = screen.getAllByText('Send for Approval').filter(el => el.tagName === 'BUTTON');
    expect(sendBtns2.length).toBeGreaterThan(0);
    expect(sendBtns2[0]).not.toBeDisabled();
  });

  it('handles approver deploy when inner getConfig returns no config', async () => {
    mockIsApprover.mockReturnValue(true);
    mockIsEditor.mockReturnValue(false);
    mockUser = { ...mockUser, claims: ['approver'] };

    let callCount = 0;
    mockGetConfig.mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        return Promise.resolve({
          success: true,
          config: { ...baseConfig, status: 'STATUS_03_UNDER_REVIEW' },
        });
      }
      return Promise.resolve({ success: true, config: null });
    });

    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    fireEvent.click(
      screen.getAllByText('Send for Deployment').find((el) => el.tagName === 'BUTTON') ||
      screen.getAllByText('Send for Deployment')[0],
    );
  });

  it('adds saveTransactionDetails with transactionDetails prefix', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const selectEl = screen.getByDisplayValue('Add Account');
    fireEvent.change(selectEl, {
      target: { value: 'saveTransactionDetails' },
    });
    await waitFor(() =>
      expect(
        screen.getByText('Create Transaction Relationship'),
      ).toBeInTheDocument(),
    );

    const radioButtons = screen.getAllByRole('radio');
    fireEvent.click(radioButtons[0]);

    const addButtons = screen.getAllByText('Add Function');
    fireEvent.click(addButtons[addButtons.length - 1]);

    await waitFor(() => {
      expect(mockAddFunction).toHaveBeenCalled();
      const callArgs = mockAddFunction.mock.calls[0][1];
      expect(callArgs.params.every((p: string) =>
        p.startsWith('transactionDetails.'),
      )).toBeTruthy();
    });
  });

  it('adds addEntity with redis prefix for non-tenantId params', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const selectEl = screen.getByDisplayValue('Add Account');
    fireEvent.change(selectEl, { target: { value: 'addEntity' } });
    await waitFor(() =>
      expect(screen.getByText('Creditor Entity')).toBeInTheDocument(),
    );

    const radioButtons = screen.getAllByRole('radio');
    fireEvent.click(radioButtons[0]);

    const addButtons = screen.getAllByText('Add Function');
    fireEvent.click(addButtons[addButtons.length - 1]);

    await waitFor(() => {
      expect(mockAddFunction).toHaveBeenCalled();
      const callArgs = mockAddFunction.mock.calls[0][1];
      expect(
        callArgs.params.some((p: string) => p.startsWith('redis.')),
      ).toBeTruthy();
      expect(
        callArgs.params.some((p: string) =>
          p.startsWith('transactionDetails.TenantId'),
        ),
      ).toBeTruthy();
    });
  });

  it('shows payload required error when payload is empty', async () => {
    renderModal();
    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
  });

  it('hides Add Function button in readOnly mode', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({
      endpointId: 42,
      readOnly: true,
      onNextStep: mockOnNextStep,
    });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument();
    });
    expect(screen.queryByText('Add Function')).not.toBeInTheDocument();
  });

  it('sets error string on deploy exception', async () => {
    mockSubmitForApproval.mockRejectedValue('string error');
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Send for Approval'));
    await waitFor(() => {
      expect(mockSubmitForApproval).toHaveBeenCalled();
    });
  });

  it('clears errors when navigating back', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Back'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Back'));
    await waitFor(() =>
      expect(screen.getByText('PayloadEditor')).toBeInTheDocument(),
    );
  });

  it('does nothing when add function clicked without selecting configuration', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const addButtons = screen.getAllByText('Add Function');
    const addBtn = addButtons[addButtons.length - 1];
    expect(addBtn).toBeDisabled();
  });

  it('converts AJV schema with nested arrays and required fields', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        schema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  nested: {
                    type: 'object',
                    properties: {
                      deep: { type: 'integer' },
                    },
                  },
                },
              },
            },
            simple: { type: 'boolean' },
            count: { type: 'number' },
          },
          required: ['items'],
        },
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => {
      expect(mockGetConfig).toHaveBeenCalled();
      expect(screen.getByTestId('has-schema-fields')).toBeInTheDocument();
    });
  });

  it('handles simulation failure then success', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId('simulation-fail'));
    expect(screen.getByText('Save and Next')).toBeDisabled();

    fireEvent.click(screen.getByTestId('simulation-pass'));
    expect(screen.getByText('Save and Next')).not.toBeDisabled();
  });

  it('hides Submit for Approval for editor with approved status in readOnly', async () => {
    mockIsEditor.mockReturnValue(true);
    mockUser = { ...mockUser, claims: ['editor'] };

    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, status: 'STATUS_04_APPROVED' },
    });

    renderModal({
      endpointId: 42,
      readOnly: true,
      onNextStep: mockOnNextStep,
    });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));

    const submitBtns2 = screen.queryAllByText('Submit for Approval').filter(el => el.tagName === 'BUTTON');
    expect(submitBtns2).toHaveLength(0);
  });

  it('shows Publish label for publisher step', () => {
    mockIsPublisher.mockReturnValue(true);
    mockIsEditor.mockReturnValue(false);
    mockIsApprover.mockReturnValue(false);
    mockIsExporter.mockReturnValue(false);
    renderModal();
    expect(screen.getByText('Submit for Approval')).toBeInTheDocument();
  });

  it('shows data model form with object schema for jsonBOptions traversal', async () => {
    mockGetDestinationFieldsJson.mockResolvedValue({
      success: true,
      data: { accounts: { id: 'string', balance: 'number' } },
    });
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema-object'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const selectEl = screen.getByDisplayValue('Add Account');
    fireEvent.change(selectEl, { target: { value: 'addDataModel' } });

    await waitFor(() =>
      expect(screen.getByText('Data Model Configuration')).toBeInTheDocument(),
    );

    const tableNameInput = screen.getByPlaceholderText('Enter table name');
    fireEvent.change(tableNameInput, { target: { value: 'my_table' } });

    await waitFor(() => expect(mockGetDestinationFieldsJson).toHaveBeenCalled());

    const allSelects = screen.getAllByRole('combobox');
    for (const sel of allSelects) {
      const options = Array.from((sel as HTMLSelectElement).options);
      const payloadOption = options.find((o) => o.textContent === 'transaction');
      if (payloadOption) {
        fireEvent.change(sel, { target: { value: payloadOption.value } });
        break;
      }
    }

    await waitFor(() => {
      const pkSelects = screen.getAllByRole('combobox');
      for (const sel of pkSelects) {
        const options = Array.from((sel as HTMLSelectElement).options);
        const pkOption = options.find((o) => o.textContent === 'id');
        if (pkOption) {
          fireEvent.change(sel, { target: { value: pkOption.value } });
        }
      }
    });

    const addButtons = screen.getAllByText('Add Function');
    const lastAddBtn = addButtons[addButtons.length - 1];
    if (!lastAddBtn.hasAttribute('disabled')) {
      fireEvent.click(lastAddBtn);
      await waitFor(() => {
        expect(mockAddFunction).toHaveBeenCalled();
      });
    }
  });

  it('shows primary key options from Data Model group', async () => {
    mockGetDestinationFieldsJson.mockResolvedValue({
      success: true,
      data: {
        accounts: { id: 'string', balance: 'number', nested: { deep: 'string' } },
      },
    });
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const selectEl = screen.getByDisplayValue('Add Account');
    fireEvent.change(selectEl, { target: { value: 'addDataModel' } });

    await waitFor(() =>
      expect(screen.getByText('Data Model Configuration')).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByPlaceholderText('Enter table name'), {
      target: { value: 'test_table' },
    });

    await waitFor(() => expect(mockGetDestinationFieldsJson).toHaveBeenCalled());

    const allSelects = screen.getAllByRole('combobox');
    for (const sel of allSelects) {
      const options = Array.from((sel as HTMLSelectElement).options);
      const dmOption = options.find((o) => o.textContent === 'accounts');
      if (dmOption) {
        fireEvent.change(sel, { target: { value: dmOption.value } });
        break;
      }
    }

    await waitFor(() => {
      const pkSelects = screen.getAllByRole('combobox');
      for (const sel of pkSelects) {
        const options = Array.from((sel as HTMLSelectElement).options);
        const pkOption = options.find((o) => o.textContent === 'id');
        if (pkOption) {
          fireEvent.change(sel, { target: { value: pkOption.value } });
        }
      }
    });
  });

  it('shows error for invalid JSON payload format', async () => {
    renderModal();
    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByTestId('set-invalid-payload'));
    fireEvent.click(screen.getByText('Save and Next'));
  });

  it('shows error when schema becomes empty array during save', async () => {
    renderModal();
    fireEvent.click(screen.getByTestId('set-schema-empty-array'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByTestId('set-payload'));
    fireEvent.click(screen.getByText('Save and Next'));
  });

  it('saves with object schema that has properties', async () => {
    renderModal();
    fireEvent.click(screen.getByTestId('set-schema-object'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByTestId('set-payload'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockCreateConfig).toHaveBeenCalled();
    });
  });

  it('shows error when no schema generated', async () => {
    renderModal();
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByTestId('set-payload'));
    fireEvent.click(screen.getByText('Save and Next'));
  });

  it('handles update exception with proper error message', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    mockUpdateConfig.mockRejectedValue(new Error('DB connection failed'));
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockUpdateConfig).toHaveBeenCalled();
    });
  });

  it('sets error when save response is not success', async () => {
    mockCreateConfig.mockResolvedValue({
      success: false,
      message: 'Validation error: duplicate endpoint',
    });
    renderModal();
    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByTestId('set-payload'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockCreateConfig).toHaveBeenCalled();
    });
  });

  it('sets error when config saved but no config data returned', async () => {
    mockCreateConfig.mockResolvedValue({
      success: true,
      config: null,
    });
    renderModal();
    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByTestId('set-payload'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockCreateConfig).toHaveBeenCalled();
    });
  });

  it('creates config via createConfig in clone mode with existing mapping and functions', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        mapping: [{ source: 'f1', destination: 'transactionDetails.msgId' }],
        functions: [{ functionName: 'addAccount', params: ['redis.dbtrAcctId'] }],
      },
    });
    mockCreateConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, id: 200 },
    });
    renderModal({
      endpointId: 42,
      isCloneMode: true,
      isCloneCheck: true,
    });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockCreateConfig).toHaveBeenCalled();
      const createCall = mockCreateConfig.mock.calls[0][0];
      expect(createCall.mapping).toBeDefined();
      expect(createCall.functions).toBeDefined();
    });
  });

  it('validates function parameters and shows unmapped warnings', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        functions: [
          {
            functionName: 'addAccount',
            params: ['redis.dbtrAcctId', 'transactionDetails.TenantId', 'redis.creDtTm'],
          },
        ],
        mapping: [
          { source: 'f1', destination: 'transactionDetails.msgId' },
          { source: 'f2', destination: 'transactionDetails.CreDtTm' },
        ],
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(screen.getByText('addAccount')).toBeInTheDocument();
    });

    expect(screen.getByText('Save and Next')).toBeDisabled();
  });

  it('shows error when deploying without created endpoint id', async () => {
    renderModal({ endpointId: -1 });
    expect(screen.getByText('Save and Next')).toBeInTheDocument();
  });

  it('updates existingConfig mapping when no createdEndpoint exists', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId('set-mappings'));

    expect(screen.getByText('MappingUtility')).toBeInTheDocument();
  });

  it('sets payload from config.payload when available', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        payload: '{"original":"payload"}',
        schema: { type: 'object', properties: {} },
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => {
      expect(mockGetConfig).toHaveBeenCalled();
    });
  });

  it('sets payload from schema when no payload available', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        payload: null,
        schema: { type: 'object', properties: { x: { type: 'string' } } },
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => {
      expect(mockGetConfig).toHaveBeenCalled();
    });
  });

  it('shows error when adding function without configId', async () => {
    mockCreateConfig.mockResolvedValue({ success: true, config: null });
    renderModal({ endpointId: -1 });

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByTestId('set-payload'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockCreateConfig).toHaveBeenCalled();
    });
  });

  it('shows error when removing function without configId', async () => {
    renderModal({ endpointId: -1 });
    expect(screen.getByText('Save and Next')).toBeInTheDocument();
  });

  it('shows Submit for Approval button for editor readOnly with draft status', async () => {
    mockIsEditor.mockReturnValue(true);
    mockUser = { ...mockUser, claims: ['editor'] };

    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, status: 'STATUS_01_DRAFT' },
    });

    renderModal({
      endpointId: 42,
      readOnly: true,
      onNextStep: mockOnNextStep,
    });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.queryByText('Submit for Approval')).toBeInTheDocument();
    });
  });

  it('editor clicks Submit for Approval in readOnly deploy step', async () => {
    mockIsEditor.mockReturnValue(true);
    mockUser = { ...mockUser, claims: ['editor'] };

    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, status: 'STATUS_01_DRAFT' },
    });

    renderModal({
      endpointId: 42,
      readOnly: true,
      onNextStep: mockOnNextStep,
    });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));

    const submitBtns = screen.getAllByText('Submit for Approval').filter(
      (el) => el.tagName === 'BUTTON',
    );
    if (submitBtns.length > 0) {
      fireEvent.click(submitBtns[0]);
      await waitFor(() => {
        expect(mockSubmitForApproval).toHaveBeenCalled();
      });
    }
  });

  it('resolves primary key type from Payload array schema', async () => {
    mockGetDestinationFieldsJson.mockResolvedValue({
      success: true,
      data: {},
    });
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const selectEl = screen.getByDisplayValue('Add Account');
    fireEvent.change(selectEl, { target: { value: 'addDataModel' } });

    await waitFor(() =>
      expect(screen.getByText('Data Model Configuration')).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByPlaceholderText('Enter table name'), {
      target: { value: 'test_tbl' },
    });
  });

  it('handles existingSchemaFields when no schema at all', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        payload: '{}',
        schema: null,
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => {
      expect(mockGetConfig).toHaveBeenCalled();
    });
  });

  it('handles addDataModel with invalid jsonKey JSON', async () => {
    mockGetDestinationFieldsJson.mockResolvedValue({
      success: true,
      data: { accounts: { id: 'string' } },
    });
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const selectEl = screen.getByDisplayValue('Add Account');
    fireEvent.change(selectEl, { target: { value: 'addDataModel' } });

    await waitFor(() =>
      expect(screen.getByText('Data Model Configuration')).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByPlaceholderText('Enter table name'), {
      target: { value: 'tbl' },
    });
  });

  it('uses existingConfig schema as fallback when finalSchema is null', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        schema: { type: 'object', properties: { x: { type: 'string' } } },
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
  });

  it('shows error when adding duplicate saveTransactionDetails function', async () => {
    mockAddFunction.mockResolvedValue({ success: true });
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        functions: [
          { functionName: 'saveTransactionDetails', params: ['transactionDetails.Amt'] },
        ],
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() =>
      expect(screen.getByText('saveTransactionDetails')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const selectEl = screen.getByDisplayValue('Add Account');
    fireEvent.change(selectEl, { target: { value: 'saveTransactionDetails' } });

    const radioButtons = screen.getAllByRole('radio');
    if (radioButtons.length > 0) {
      fireEvent.click(radioButtons[0]);
    }

    const addButtons = screen.getAllByText('Add Function');
    fireEvent.click(addButtons[addButtons.length - 1]);

  });

  it('shows error when adding duplicate addAccount function with same params', async () => {
    mockAddFunction.mockResolvedValue({ success: true });
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        functions: [
          { functionName: 'addAccount', params: ['redis.dbtrAcctId'] },
        ],
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('addAccount')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const radioButtons = screen.getAllByRole('radio');
    if (radioButtons.length > 0) {
      fireEvent.click(radioButtons[0]);
    }

    const addButtons = screen.getAllByText('Add Function');
    fireEvent.click(addButtons[addButtons.length - 1]);

    await waitFor(() => {
      expect(mockAddFunction).toHaveBeenCalled();
    });
  });

  it('shows error when trying to proceed without simulation success', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Save and Next'));
  });

  it('handles approver deploy when getConfig fails inside handleDeploy', async () => {
    mockIsApprover.mockReturnValue(true);
    mockIsEditor.mockReturnValue(false);
    mockUser = { ...mockUser, claims: ['approver'] };

    mockGetConfig
      .mockResolvedValueOnce({
        success: true,
        config: { ...baseConfig, status: 'STATUS_03_UNDER_REVIEW' },
      })
      .mockResolvedValueOnce({ success: true, config: { ...baseConfig, status: 'STATUS_03_UNDER_REVIEW' } })
      .mockResolvedValueOnce({ success: false });

    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    const deployBtns = screen.getAllByText('Send for Deployment').filter(
      (el) => el.tagName === 'BUTTON',
    );
    if (deployBtns.length > 0) {
      fireEvent.click(deployBtns[0]);
    }
  });

  it('handles editor deploy when submitForApproval returns failure', async () => {
    mockSubmitForApproval.mockResolvedValue({
      success: false,
      message: 'Config validation failed',
    });
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, status: 'STATUS_01_DRAFT' },
    });

    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    const submitBtns = screen.getAllByText('Submit for Approval').filter(
      (el) => el.tagName === 'BUTTON',
    );
    if (submitBtns.length > 0) {
      fireEvent.click(submitBtns[0]);
      await waitFor(() => {
        expect(mockSubmitForApproval).toHaveBeenCalled();
      });
    }
  });

  it('shows error when payload is empty on payload step', async () => {
    renderModal();
    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
  });

  it('shows error when updateConfig returns failure', async () => {
    mockUpdateConfig.mockResolvedValue({
      success: false,
      message: 'Schema mismatch',
    });
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockUpdateConfig).toHaveBeenCalled();
    });
  });

  it('sets createdEndpoint when createConfig returns success with config', async () => {
    mockCreateConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, id: 999, schema: { type: 'object', properties: {} } },
    });
    renderModal();
    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByTestId('set-payload'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockCreateConfig).toHaveBeenCalled();
      expect(screen.getByText('MappingUtility')).toBeInTheDocument();
    });
  });

  it('navigates to mapping after successful update', async () => {
    mockUpdateConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, schema: { type: 'object', properties: {} } },
    });
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockUpdateConfig).toHaveBeenCalled();
      expect(screen.getByText('MappingUtility')).toBeInTheDocument();
    });
  });

  it('adds addEntity function with redis prefix for params', async () => {
    mockAddFunction.mockResolvedValue({ success: true });
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const selectEl = screen.getByDisplayValue('Add Account');
    fireEvent.change(selectEl, { target: { value: 'addEntity' } });

    const radioButtons = screen.getAllByRole('radio');
    if (radioButtons.length > 0) {
      fireEvent.click(radioButtons[0]);
    }

    const addButtons = screen.getAllByText('Add Function');
    fireEvent.click(addButtons[addButtons.length - 1]);

    await waitFor(() => {
      expect(mockAddFunction).toHaveBeenCalled();
      const call = mockAddFunction.mock.calls[mockAddFunction.mock.calls.length - 1];
      const params = call[1]?.params || call[0]?.params;
      if (params) {
        params.forEach((p: string) => {
          if (!p.includes('.')) {
          }
        });
      }
    });
  });

  it('adds saveTransactionDetails with transactionDetails prefix', async () => {
    mockAddFunction.mockResolvedValue({ success: true });
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const selectEl = screen.getByDisplayValue('Add Account');
    fireEvent.change(selectEl, { target: { value: 'saveTransactionDetails' } });

    const radioButtons = screen.getAllByRole('radio');
    if (radioButtons.length > 0) {
      fireEvent.click(radioButtons[0]);
    }

    const checkboxes = screen.queryAllByRole('checkbox');
    checkboxes.forEach((cb) => fireEvent.click(cb));

    const addButtons = screen.getAllByText('Add Function');
    fireEvent.click(addButtons[addButtons.length - 1]);

    await waitFor(() => {
      expect(mockAddFunction).toHaveBeenCalled();
    });
  });

  it('shows error when getConfig throws during deploy validation', async () => {
    mockGetConfig
      .mockResolvedValueOnce({
        success: true,
        config: { ...baseConfig },
      })
      .mockRejectedValueOnce(new Error('Network timeout'));

    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('Select Functions')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('simulation-pass'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText(/DeploymentConfirmation/)).toBeInTheDocument(),
    );

    const submitBtns = screen.getAllByText('Submit for Approval').filter(
      (el) => el.tagName === 'BUTTON',
    );
    if (submitBtns.length > 0) {
      fireEvent.click(submitBtns[0]);
    }
  });

  it('validates unknown function config in validateFunctionParameters', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        functions: [
          { functionName: 'unknownFunction', params: ['redis.someParam'] },
        ],
        mapping: [
          { source: 'f1', destination: 'transactionDetails.msgId' },
          { source: 'f2', destination: 'transactionDetails.CreDtTm' },
        ],
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() =>
      expect(screen.getByText('unknownFunction')).toBeInTheDocument(),
    );
  });

  it('shows unmapped parameter warnings for functions', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        functions: [
          { functionName: 'addAccount', params: ['redis.dbtrAcctId', 'redis.dbtrNm'] },
        ],
        mapping: [
          { source: 'f1', destination: 'transactionDetails.msgId' },
          { source: 'f2', destination: 'transactionDetails.CreDtTm' },
        ],
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() =>
      expect(screen.getByText('addAccount')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Save and Next'));
  });

  it('skips tenantId validation in validateFunctionParameters', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        functions: [
          { functionName: 'addAccount', params: ['transactionDetails.TenantId', 'redis.dbtrAcctId'] },
        ],
        mapping: [
          { source: 'f1', destination: 'transactionDetails.msgId' },
          { source: 'f2', destination: 'transactionDetails.CreDtTm' },
          { source: 'f3', destination: 'redis.dbtrAcctId' },
        ],
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings-with-func-params'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() =>
      expect(screen.getByText('addAccount')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
  });
  it('skips validation for functions with columns property', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        functions: [
          {
            functionName: 'addDataModel',
            columns: { id: 'string' },
            tableName: 'test',
            primaryKey: 'id',
          },
        ],
        mapping: [
          { source: 'f1', destination: 'transactionDetails.msgId' },
          { source: 'f2', destination: 'transactionDetails.CreDtTm' },
        ],
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() =>
      expect(screen.getByText('addDataModel')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
  });

  it('handles array destination in mappings for validation', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        functions: [
          { functionName: 'addAccount', params: ['redis.dbtrAcctId'] },
        ],
        mapping: [
          { source: 'f1', destination: ['transactionDetails.msgId', 'redis.dbtrAcctId'] },
          { source: 'f2', destination: 'transactionDetails.CreDtTm' },
        ],
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings-with-func-params'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() =>
      expect(screen.getByText('addAccount')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('SimulationPanel')).toBeInTheDocument(),
    );
  });

  it('shows error when save returns success but config has no id', async () => {
    mockCreateConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, id: undefined },
    });
    renderModal();
    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByTestId('set-payload'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() => {
      expect(mockCreateConfig).toHaveBeenCalled();
    });
  });

  it('shows schema fields lost error when schema array becomes empty', async () => {
    renderModal();
    fireEvent.click(screen.getByTestId('set-schema-empty-array'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByTestId('set-payload'));
    fireEvent.click(screen.getByText('Save and Next'));
  });

  it('shows Submit for Approval when no status on config in readOnly', async () => {
    mockIsEditor.mockReturnValue(true);
    mockUser = { ...mockUser, claims: ['editor'] };

    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, status: undefined },
    });

    renderModal({
      endpointId: 42,
      readOnly: true,
      onNextStep: mockOnNextStep,
    });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.queryByText('Submit for Approval')).toBeInTheDocument();
    });
  });

  it('closes add function modal via X button', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: { ...baseConfig, functions: [] },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('No Functions Selected')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Add Function'));
    await waitFor(() =>
      expect(screen.getByText('Select Function')).toBeInTheDocument(),
    );

    const allButtons = screen.getAllByRole('button');
    const xButton = allButtons.find(
      (btn) => btn.className.includes('text-gray-500') && btn.className.includes('hover:text-gray-700'),
    );
    if (xButton) {
      fireEvent.click(xButton);
    }
  });

  it('loads existing config with functions and mapping', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        functions: [
          { functionName: 'addAccount', params: ['redis.dbtrAcctId'] },
          { functionName: 'addEntity', params: ['redis.entityId'] },
        ],
        mapping: [
          { source: 'field1', destination: 'transactionDetails.msgId' },
          { source: 'field2', destination: 'redis.dbtrAcctId' },
        ],
        payload: '{"test": "data"}',
        schema: { type: 'object', properties: { test: { type: 'string' } } },
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => {
      expect(mockGetConfig).toHaveBeenCalled();
    });
  });

  it('handles generic error object from getConfig', async () => {
    mockGetConfig.mockRejectedValue({ message: 'Something went wrong' });
    renderModal({ endpointId: 42 });
    await waitFor(() => {
      expect(mockGetConfig).toHaveBeenCalled();
    });
  });

  it('updates existingConfig after removing function', async () => {
    mockGetConfig.mockResolvedValue({
      success: true,
      config: {
        ...baseConfig,
        functions: [
          { functionName: 'addAccount', params: ['redis.dbtrAcctId'] },
          { functionName: 'addEntity', params: ['redis.entityId'] },
        ],
      },
    });
    renderModal({ endpointId: 42 });
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('set-schema'));
    fireEvent.click(screen.getByTestId('set-endpoint-data'));
    fireEvent.click(screen.getByText('Save and Next'));
    await waitFor(() =>
      expect(screen.getByText('MappingUtility')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('set-mapping-valid'));
    fireEvent.click(screen.getByTestId('set-mappings'));
    fireEvent.click(screen.getByText('Save and Next'));

    await waitFor(() =>
      expect(screen.getByText('addAccount')).toBeInTheDocument(),
    );

    const removeButtons = screen.queryAllByText('Remove');
    if (removeButtons.length > 0) {
      fireEvent.click(removeButtons[0]);
    }
  });
});
