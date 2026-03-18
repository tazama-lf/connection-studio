import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
        <button type="button" onClick={() => { props.onViewDetails(sampleConfig); }}>
          View Details
        </button>
        <button type="button" onClick={() => { props.onConfigEdit(sampleConfig); }}>
          Edit Config
        </button>
        <button type="button" onClick={() => { props.onConfigClone(sampleConfig); }}>
          Clone Config
        </button>
        <button type="button" onClick={() => { props.onViewHistory(sampleConfig); }}>
          View History
        </button>
        <button type="button" onClick={() => { props.onRefresh(); }}>
          Refresh List
        </button>
      </div>
    );
  },
}));

jest.mock('../../../src/features/config/components/VersionHistoryModal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose }: any) => (
    isOpen ? (
      <div>
        <span>VersionHistoryModal</span>
        <button type="button" onClick={onClose}>
          Close Version History
        </button>
      </div>
    ) : null
  ),
}));

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

jest.mock('../../../src/shared/components/FormFields', () => ({
  AlphaNumericInputField: ({ name, label }: any) => (
    <input aria-label={label || name} />
  ),
  SelectField: ({ name, label }: any) => (
    <select aria-label={label || name}>
      <option value="">Select</option>
    </select>
  ),
}));

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

    expect(screen.getByText('Dynamic Event Monitoring Service')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Go Back'));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('supports add destination wizard navigation and close flow', async () => {
    render(<DEMSModule />);

    fireEvent.click(screen.getByText('Extend Data Model'));
    expect(screen.getByText('Please Select Destination')).toBeInTheDocument();
    const continueBtn = screen.getByRole('button', { name: 'Continue' });
    expect(continueBtn).toBeDisabled();

    fireEvent.click(screen.getByText('DATA MODEL'));
    expect(screen.getByRole('button', { name: 'Continue' })).not.toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => {
      expect(screen.getByText('Please Select Destination Type')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('IMMEDIATE PARENT'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => {
      expect(screen.getByText('Configure Destination Detail')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => {
      expect(screen.getByText('Please Select Destination Type')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Please Select Destination')).not.toBeInTheDocument();
  });

  it('handles ConfigList actions for view, edit, clone, history and refresh', () => {
    render(<DEMSModule />);

    fireEvent.click(screen.getByRole('button', { name: 'View Details' }));
    expect(screen.getByText('EditEndpointModal')).toBeInTheDocument();
    expect(screen.getByText('ReadOnly: true')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close Endpoint Modal' }));

    fireEvent.click(screen.getByRole('button', { name: 'Edit Config' }));
    expect(screen.getByText('Endpoint: 42')).toBeInTheDocument();
    expect(screen.getByText('ReadOnly: false')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Endpoint Success' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close Endpoint Modal' }));

    fireEvent.click(screen.getByRole('button', { name: 'Clone Config' }));
    expect(screen.getByText('CloneMode: true')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close Endpoint Modal' }));

    fireEvent.click(screen.getByRole('button', { name: 'View History' }));
    expect(screen.getByText('VersionHistoryModal')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close Version History' }));
    expect(screen.queryByText('VersionHistoryModal')).not.toBeInTheDocument();

    const renderCallsBeforeRefresh = mockConfigListRender.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Refresh List' }));
    expect(mockConfigListRender.mock.calls.length).toBeGreaterThan(renderCallsBeforeRefresh);
  });

  it('opens Create New Connection (handleAddNew)', () => {
    render(<DEMSModule />);
    fireEvent.click(screen.getByRole('button', { name: 'Create New Connection' }));
    expect(screen.getByText('EditEndpointModal')).toBeInTheDocument();
    expect(screen.getByText('Endpoint: -1')).toBeInTheDocument();
  });

  it('fires handleInputChange on hidden radio input', () => {
    const { container } = render(<DEMSModule />);
    fireEvent.click(screen.getByRole('button', { name: 'Extend Data Model' }));

    const hiddenRadio = container.querySelector('input[type="radio"][name="destinationType"]');
    expect(hiddenRadio).toBeTruthy();
    fireEvent.change(hiddenRadio!, { target: { name: 'destinationType', value: 'data-model' } });
    // handleInputChange fires, setting destinationForm.destinationType = 'data-model' (no error)
  });

  it('closes wizard via X icon button', async () => {
    const { container } = render(<DEMSModule />);
    fireEvent.click(screen.getByRole('button', { name: 'Extend Data Model' }));
    expect(screen.getByText('Please Select Destination')).toBeInTheDocument();

    const closeBtn = container.querySelector('[data-id="element-1050"]');
    expect(closeBtn).toBeTruthy();
    fireEvent.click(closeBtn!);
    await waitFor(() => {
      expect(screen.queryByText('Please Select Destination')).not.toBeInTheDocument();
    });
  });

  it('navigates wizard to step 3 with CHILD type covering getParentDestinationOptions', async () => {
    render(<DEMSModule />);

    fireEvent.click(screen.getByText('Extend Data Model'));
    await waitFor(() => {
      expect(screen.getByText('Please Select Destination')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('DATA CACHE'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => {
      expect(screen.getByText('Please Select Destination Type')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('CHILD'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => {
      expect(screen.getByText('Configure Destination Detail')).toBeInTheDocument();
    });

    // getParentDestinationOptions() is called in JSX at step 3 with CHILD type
    // destinationTree is empty so it returns [] covering lines 304+
    expect(screen.getByText('Configure Destination Detail')).toBeInTheDocument();
  });
});