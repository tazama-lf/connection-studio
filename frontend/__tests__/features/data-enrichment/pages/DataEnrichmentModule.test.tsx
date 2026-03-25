import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const navigateMock = jest.fn();
const setSearchingFiltersMock = jest.fn();
const handleViewMock = jest.fn();
const setSelectedJobMock = jest.fn();
const setEditModeMock = jest.fn();
const loadJobsMock = jest.fn().mockResolvedValue(undefined);
const showSuccessMock = jest.fn();
const showErrorMock = jest.fn();

let hookState: any = {
  jobs: [{ id: '1', endpoint_name: 'Job One', type: 'pull' }],
  pagination: { page: 1, limit: 10, totalRecords: 1, setPage: jest.fn() },
  searchingFilters: {},
  selectedJob: { id: '1', endpoint_name: 'Job One', type: 'pull' },
  editMode: false,
  error: null,
  loading: false,
  actionLoading: '',
  userIsEditor: true,
  userIsApprover: true,
  setSearchingFilters: setSearchingFiltersMock,
  setSelectedJob: setSelectedJobMock,
  setEditMode: setEditModeMock,
  loadJobs: loadJobsMock,
  handleView: handleViewMock.mockResolvedValue(undefined),
  handleEdit: jest.fn().mockResolvedValue(undefined),
  handleSaveEdit: jest.fn().mockResolvedValue(undefined),
  handleSendForApproval: jest.fn().mockResolvedValue(undefined),
};

jest.mock('react-router', () => ({
  useNavigate: () => navigateMock,
}));

jest.mock('../../../../../src/shared/providers/ToastProvider', () => ({
  useToast: () => ({ showSuccess: showSuccessMock, showError: showErrorMock }),
}));

jest.mock('../../../../../src/features/data-enrichment/hooks/useDataEnrichmentJobList', () => ({
  useDataEnrichmentJobList: () => hookState,
}));

jest.mock('../../../../../src/features/data-enrichment/components/JobList', () => (props: any) => (
  <div>
    <button onClick={() => props.onViewLogs('1')}>view-job</button>
    <button onClick={() => props.onEdit({ id: '1', type: 'PULL' })}>edit-job</button>
    <button onClick={() => props.onRefresh()}>refresh-jobs</button>
  </div>
));

jest.mock('../../../../../src/features/data-enrichment/components/JobDetailsModal', () => (props: any) => (
  <div data-testid="job-details-modal">
    <button onClick={props.onClose}>close-details</button>
    <button
      onClick={() => {
        void props.onSave({ id: '1', type: 'PULL' }).catch(() => {});
      }}
    >
      save-details
    </button>
    <button
      onClick={() => {
        void props.onSendForApproval('1', 'PULL').catch(() => {});
      }}
    >
      send-details-approval
    </button>
  </div>
));

jest.mock('../../../../../src/features/data-enrichment/components/DataEnrichmentFormModal', () => ({
  DataEnrichmentFormModal: (props: any) => (
    <div data-testid="job-form-modal">
      <button onClick={() => props.onSave({ endpoint_name: 'Created', message: 'Created OK' })}>save-create</button>
      <button onClick={() => props.onSave({})}>save-create-default</button>
      <button onClick={props.onClose}>close-create</button>
    </div>
  ),
}));

jest.mock('../../../../../src/features/data-enrichment/components/DataEnrichmentEditModal', () => ({
  DataEnrichmentEditModal: (props: any) => (
    <div data-testid="job-edit-modal">
      <button onClick={props.onClose}>close-edit</button>
      <button onClick={props.onCloseWithRefresh}>close-edit-refresh</button>
    </div>
  ),
}));

import DataEnrichmentModule from '../../../../../src/features/data-enrichment/pages/DataEnrichmentModule';

describe('features/data-enrichment/pages/DataEnrichmentModule.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    hookState = {
      ...hookState,
      userIsEditor: true,
      userIsApprover: true,
      searchingFilters: {},
      editMode: false,
      actionLoading: '',
      handleEdit: jest.fn().mockResolvedValue(undefined),
      handleSaveEdit: jest.fn().mockResolvedValue(undefined),
      handleSendForApproval: jest.fn().mockResolvedValue(undefined),
      loadJobs: loadJobsMock,
    };
  });

  it('renders page header and opens creation modal', () => {
    render(<DataEnrichmentModule />);

    expect(screen.getByText('Data Enrichment')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Create New Enrichment Job'));
    expect(screen.getByTestId('job-form-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByText('save-create'));
    expect(showSuccessMock).toHaveBeenCalledWith('Created OK');

    fireEvent.click(screen.getByText('close-create'));
    expect(screen.queryByTestId('job-form-modal')).not.toBeInTheDocument();
  });

  it('applies approver pending filter and opens details modal on view', async () => {
    render(<DataEnrichmentModule />);

    fireEvent.click(screen.getByText('View Pending Jobs'));
    expect(setSearchingFiltersMock).toHaveBeenCalled();

    fireEvent.click(screen.getByText('view-job'));
    expect(handleViewMock).toHaveBeenCalledWith('1');
  });

  it('hides create button when user is not editor', () => {
    hookState = { ...hookState, userIsEditor: false };
    render(<DataEnrichmentModule />);

    expect(screen.queryByText('Create New Enrichment Job')).not.toBeInTheDocument();
  });

  it('navigates back when Go Back is clicked', () => {
    render(<DataEnrichmentModule />);

    fireEvent.click(screen.getByText('Go Back'));
    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it('hides approver dashboard when user is not approver', () => {
    hookState = { ...hookState, userIsApprover: false };
    render(<DataEnrichmentModule />);

    expect(screen.queryByText('Approver Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('View Pending Jobs')).not.toBeInTheDocument();
  });

  it('opens and closes job details modal and resets selection/edit state', async () => {
    render(<DataEnrichmentModule />);

    fireEvent.click(screen.getByText('view-job'));

    await waitFor(() => {
      expect(screen.getByTestId('job-details-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('close-details'));

    expect(setSelectedJobMock).toHaveBeenCalledWith(null);
    expect(setEditModeMock).toHaveBeenCalledWith(false);
  });

  it('sends selected job for approval from details modal', async () => {
    render(<DataEnrichmentModule />);

    fireEvent.click(screen.getByText('view-job'));

    await waitFor(() => {
      expect(screen.getByTestId('job-details-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('send-details-approval'));

    await waitFor(() => {
      expect(hookState.handleSendForApproval).toHaveBeenCalledWith('1', 'PULL');
    });
    expect(setSelectedJobMock).toHaveBeenCalledWith(null);
    expect(setEditModeMock).toHaveBeenCalledWith(false);
  });

  it('renders edit modal when edit mode is active', () => {
    hookState = { ...hookState, editMode: true };
    render(<DataEnrichmentModule />);

    expect(screen.getByTestId('job-edit-modal')).toBeInTheDocument();
  });

  it('refreshes and restores scroll position after successful reload', async () => {
    jest.useFakeTimers();
    const scrollToSpy = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: 120,
    });
    Object.defineProperty(document.body, 'scrollHeight', {
      configurable: true,
      value: 1000,
    });

    loadJobsMock.mockResolvedValueOnce(undefined);
    render(<DataEnrichmentModule />);

    fireEvent.click(screen.getByText('refresh-jobs'));

    await waitFor(() => {
      expect(loadJobsMock).toHaveBeenCalled();
    });
    jest.runAllTimers();

    expect(scrollToSpy).toHaveBeenCalledWith(0, 120);
    scrollToSpy.mockRestore();
  });

  it('does not restore scroll when position is outside valid range and load fails', async () => {
    jest.useFakeTimers();
    const scrollToSpy = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: 0,
    });
    Object.defineProperty(document.body, 'scrollHeight', {
      configurable: true,
      value: 1000,
    });

    loadJobsMock.mockRejectedValueOnce(new Error('load failed'));
    render(<DataEnrichmentModule />);

    fireEvent.click(screen.getByText('refresh-jobs'));

    await waitFor(() => {
      expect(loadJobsMock).toHaveBeenCalled();
    });
    jest.runAllTimers();

    expect(scrollToSpy).not.toHaveBeenCalled();
    scrollToSpy.mockRestore();
  });

  it('restores scroll position after failed reload when position is valid', async () => {
    jest.useFakeTimers();
    const scrollToSpy = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: 220,
    });
    Object.defineProperty(document.body, 'scrollHeight', {
      configurable: true,
      value: 2000,
    });

    loadJobsMock.mockRejectedValueOnce(new Error('load failed with valid position'));
    render(<DataEnrichmentModule />);

    fireEvent.click(screen.getByText('refresh-jobs'));

    await waitFor(() => {
      expect(loadJobsMock).toHaveBeenCalled();
    });
    jest.runAllTimers();

    expect(scrollToSpy).toHaveBeenCalledWith(0, 220);
    scrollToSpy.mockRestore();
  });

  it('opens details through edit action', async () => {
    render(<DataEnrichmentModule />);

    fireEvent.click(screen.getByText('edit-job'));

    await waitFor(() => {
      expect(hookState.handleEdit).toHaveBeenCalledWith({ id: '1', type: 'PULL' });
    });
    expect(screen.getByTestId('job-details-modal')).toBeInTheDocument();
  });

  it('saves details and closes modal', async () => {
    render(<DataEnrichmentModule />);

    fireEvent.click(screen.getByText('view-job'));
    await waitFor(() => {
      expect(screen.getByTestId('job-details-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('save-details'));

    await waitFor(() => {
      expect(hookState.handleSaveEdit).toHaveBeenCalledWith({ id: '1', type: 'PULL' });
    });
    expect(setSelectedJobMock).toHaveBeenCalledWith(null);
    expect(setEditModeMock).toHaveBeenCalledWith(false);
  });

  it('rethrows when saving details fails', async () => {
    const saveError = new Error('save failed');
    hookState = {
      ...hookState,
      handleSaveEdit: jest.fn().mockRejectedValue(saveError),
      handleSendForApproval: jest.fn().mockResolvedValue(undefined),
    };

    render(<DataEnrichmentModule />);

    fireEvent.click(screen.getByText('view-job'));
    await waitFor(() => {
      expect(screen.getByTestId('job-details-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('save-details'));

    await waitFor(() => {
      expect(hookState.handleSaveEdit).toHaveBeenCalledWith({ id: '1', type: 'PULL' });
    });
  });

  it('rethrows when sending for approval fails', async () => {
    const approvalError = new Error('approval failed');
    hookState = {
      ...hookState,
      handleSendForApproval: jest.fn().mockRejectedValue(approvalError),
    };

    render(<DataEnrichmentModule />);

    fireEvent.click(screen.getByText('view-job'));
    await waitFor(() => {
      expect(screen.getByTestId('job-details-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('send-details-approval'));

    await waitFor(() => {
      expect(hookState.handleSendForApproval).toHaveBeenCalledWith('1', 'PULL');
    });
  });

  it('uses default create success message when backend values are missing', () => {
    render(<DataEnrichmentModule />);
    fireEvent.click(screen.getByText('Create New Enrichment Job'));

    fireEvent.click(screen.getByText('save-create-default'));

    expect(showSuccessMock).toHaveBeenCalledWith('New endpoint has been saved successfully! You can now send it for approval.');
  });

  it('shows error when success toast throws during create handling', () => {
    showSuccessMock.mockImplementationOnce(() => {
      throw new Error('toast failure');
    });

    hookState = {
      ...hookState,
      loadJobs: jest.fn().mockResolvedValue(undefined),
    };

    render(<DataEnrichmentModule />);

    fireEvent.click(screen.getByText('Create New Enrichment Job'));
    fireEvent.click(screen.getByText('save-create'));

    expect(showErrorMock).toHaveBeenCalledWith('Failed to handle job creation');
  });

  it('closes edit modal with refresh callback', async () => {
    jest.useFakeTimers();
    const scrollToSpy = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: 150,
    });
    Object.defineProperty(document.body, 'scrollHeight', {
      configurable: true,
      value: 2000,
    });

    hookState = {
      ...hookState,
      editMode: true,
      loadJobs: jest.fn().mockResolvedValue(undefined),
    };

    render(<DataEnrichmentModule />);
    fireEvent.click(screen.getByText('close-edit-refresh'));

    await waitFor(() => {
      expect(hookState.loadJobs).toHaveBeenCalled();
    });
    jest.runAllTimers();

    expect(setSelectedJobMock).toHaveBeenCalledWith(null);
    expect(setEditModeMock).toHaveBeenCalledWith(false);
    expect(scrollToSpy).toHaveBeenCalledWith(0, 150);
    scrollToSpy.mockRestore();
  });
});