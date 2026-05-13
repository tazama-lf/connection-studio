import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import DEMSModule from '../../../src/pages/dems';

const mockNavigate = jest.fn();
const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();
const mockConfigListRender = jest.fn();

const sampleConfig = {
  id: 42,
  status: 'STATUS_01_DRAFT',
  transactionType: 'acmt.023',
  version: '1',
};

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../src/shared/providers/ToastProvider', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}));

jest.mock('../../../src/features/config/components/ConfigList', () => ({
  ConfigList: (props: any) => {
    mockConfigListRender();
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            props.onViewDetails(sampleConfig);
          }}
        >
          View Details
        </button>
        <button
          type="button"
          onClick={() => {
            props.onConfigEdit(sampleConfig);
          }}
        >
          Edit Config
        </button>
        <button
          type="button"
          onClick={() => {
            props.onConfigClone(sampleConfig);
          }}
        >
          Clone Config
        </button>
        <button
          type="button"
          onClick={() => {
            props.onViewHistory(sampleConfig);
          }}
        >
          View History
        </button>
        <button
          type="button"
          onClick={() => {
            props.onRefresh();
          }}
        >
          Refresh List
        </button>
      </div>
    );
  },
}));

jest.mock(
  '../../../src/features/config/components/VersionHistoryModal',
  () => ({
    __esModule: true,
    default: ({ isOpen, onClose }: any) =>
      isOpen ? (
        <div>
          <span>VersionHistoryModal</span>
          <button type="button" onClick={onClose}>
            Close Version History
          </button>
        </div>
      ) : null,
  }),
);

jest.mock('../../../src/shared/components/EditEndpointModal', () => ({
  __esModule: true,
  default: (props: any) => (
    <div>
      <span>EditEndpointModal</span>
      <span>Endpoint: {String(props.endpointId)}</span>
      <span>ReadOnly: {String(!!props.readOnly)}</span>
      <span>CloneMode: {String(!!props.isCloneMode)}</span>
      <button type="button" onClick={props.onClose}>
        Close Endpoint Modal
      </button>
      <button type="button" onClick={props.onSuccess}>
        Endpoint Success
      </button>
    </div>
  ),
}));

jest.mock('../../../src/shared/components/ValidationLogsTable', () => ({
  __esModule: true,
  default: () => <div>ValidationLogsTable</div>,
}));

jest.mock('../../../src/shared/components/FormFields', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Controller } = require('react-hook-form');
  return {
    AlphaNumericInputField: ({ name, label, control }: any) => (
      <Controller
        name={name}
        control={control}
        render={({ field }: any) => (
          <input aria-label={label || name} {...field} />
        )}
      />
    ),
    SelectField: ({ name, label, control, options = [], disabled }: any) => (
      <Controller
        name={name}
        control={control}
        render={({ field }: any) => (
          <select aria-label={label || name} {...field} disabled={disabled}>
            <option value="">Select</option>
            {(options || []).map((opt: any) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      />
    ),
  };
});

jest.mock('../../../src/features/data-model', () => ({
  dataModelApi: {
    createImmediateParent: jest.fn(),
    createParentChildDestination: jest.fn(),
  },
}));

describe('pages/dems/index.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders module heading and handles go back', () => {
    render(<DEMSModule />);

    expect(
      screen.getByText('Dynamic Event Monitoring Service'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText('Go Back'));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('handles ConfigList actions for view, edit, clone, history and refresh', () => {
    render(<DEMSModule />);

    fireEvent.click(screen.getByRole('button', { name: 'View Details' }));
    expect(screen.getByText('EditEndpointModal')).toBeInTheDocument();
    expect(screen.getByText('ReadOnly: true')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Close Endpoint Modal' }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit Config' }));
    expect(screen.getByText('Endpoint: 42')).toBeInTheDocument();
    expect(screen.getByText('ReadOnly: false')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Endpoint Success' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Close Endpoint Modal' }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Clone Config' }));
    expect(screen.getByText('CloneMode: true')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Close Endpoint Modal' }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'View History' }));
    expect(screen.getByText('VersionHistoryModal')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Close Version History' }),
    );
    expect(screen.queryByText('VersionHistoryModal')).not.toBeInTheDocument();

    const renderCallsBeforeRefresh = mockConfigListRender.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Refresh List' }));
    expect(mockConfigListRender.mock.calls.length).toBeGreaterThan(
      renderCallsBeforeRefresh,
    );
  });

  it('opens Create New Connection (handleAddNew)', () => {
    render(<DEMSModule />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Create New Connection' }),
    );
    expect(screen.getByText('EditEndpointModal')).toBeInTheDocument();
    expect(screen.getByText('Endpoint: -1')).toBeInTheDocument();
  });
});
