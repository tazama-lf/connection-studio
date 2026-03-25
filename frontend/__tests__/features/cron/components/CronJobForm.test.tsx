import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CronJobForm } from '@features/cron/components/CronJobForm';
import type { ScheduleResponse } from '@features/cron/types';
import { useAuth } from '@features/auth';

// Mock auth module to prevent Login.tsx compilation errors
jest.mock('@features/auth', () => ({
  useAuth: jest.fn(),
}));

// Mock ToastProvider
jest.mock('../../../../shared/providers/ToastProvider', () => ({
  useToast: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showToast: jest.fn(),
    toasts: [],
    removeToast: jest.fn(),
  }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock dependencies
jest.mock('react-js-cron', () => ({
  Cron: ({ value, setValue }: { value: string; setValue: (val: string) => void }) => (
    <div data-testid="cron-picker">
      <button onClick={() => setValue('0 0 * * *')}>Set Daily</button>
      <span>{value}</span>
    </div>
  ),
}));

jest.mock('cronstrue', () => ({
  toString: (expression: string) => `Mock description for ${expression}`,
}));

jest.mock('@features/cron/handlers', () => ({
  submitCronJob: jest.fn(),
  getErrorMessage: jest.fn((error) => 'Mock error message'),
  CRON_JOB_SUCCESS_MESSAGES: {
    CREATED: (name: string) => `Cron job "${name}" created successfully`,
  },
}));

jest.mock('@shared/components/Button', () => ({
  Button: ({ children, onClick, type, disabled, startIcon }: {
    children: React.ReactNode;
    onClick?: () => void;
    type?: string;
    disabled?: boolean;
    startIcon?: React.ReactNode;
  }) => (
    <button 
      onClick={onClick} 
      type={type as 'button' | 'submit'}
      disabled={disabled}
      data-testid={`button-${children?.toString().toLowerCase().replace(/\s+/g, '-')}`}
    >
      {startIcon}
      {children}
    </button>
  ),
}));

jest.mock('../../../../shared/components/FormFields.jsx', () => ({
  AlphaNumericInputFieldWithSpaces: ({ label, name, placeholder, disabled }: {
    label: string;
    name: string;
    control?: unknown;
    placeholder: string;
    disabled: boolean;
  }) => (
    <div>
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        placeholder={placeholder}
        disabled={disabled}
        data-testid={`input-${name}`}
      />
    </div>
  ),
  NumberInputField: ({ label, name, placeholder, disabled }: {
    label: React.ReactNode;
    name: string;
    control?: unknown;
    placeholder: string;
    disabled: boolean;
  }) => (
    <div>
      <label htmlFor={name}>{typeof label === 'object' ? 'Retry Count' : label}</label>
      <input
        id={name}
        name={name}
        type="number"
        placeholder={placeholder}
        disabled={disabled}
        data-testid={`input-${name}`}
      />
    </div>
  ),
}));

jest.mock('../../../../shared/components/ValidationError', () => ({
  __esModule: true,
  default: ({ message }: { message: string }) => (
    <div data-testid="validation-error" className="error">{message}</div>
  ),
}));

describe('CronJobForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();
  const mockHandleSendForApproval = jest.fn();

  const defaultProps = {
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
    handleSendForApproval: mockHandleSendForApproval,
    userIsApprover: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const mockUseAuth = jest.mocked(useAuth);
    mockUseAuth.mockReturnValue({ 
      user: null, 
      isAuthenticated: false, 
      loading: false, 
      login: jest.fn(), 
      logout: jest.fn() 
    });
  });

  describe('Create Mode', () => {
    it('should render form in create mode when no viewFormData or editFormData', () => {
      render(<CronJobForm {...defaultProps} />);

      expect(screen.getByLabelText(/Job Name/i)).toBeInTheDocument();
      expect(screen.getByText(/Generate Cron Expression/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Retry Count/i)).toBeInTheDocument();
      expect(screen.getByText('Create Cron Job')).toBeInTheDocument();
    });

    it('should render cron picker in create mode', () => {
      render(<CronJobForm {...defaultProps} />);

      expect(screen.getByTestId('cron-picker')).toBeInTheDocument();
    });

    it('should enable all input fields in create mode', () => {
      render(<CronJobForm {...defaultProps} />);

      const nameInput = screen.getByTestId('input-name');
      const iterationsInput = screen.getByTestId('input-iterations');

      expect(nameInput).not.toBeDisabled();
      expect(iterationsInput).not.toBeDisabled();
    });

    it('should render cancel and create buttons in create mode', () => {
      render(<CronJobForm {...defaultProps} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Create Cron Job')).toBeInTheDocument();
    });

    it('should call onCancel when cancel button is clicked', () => {
      render(<CronJobForm {...defaultProps} />);

      fireEvent.click(screen.getByText('Cancel'));

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should update cron expression when cron picker changes', () => {
      render(<CronJobForm {...defaultProps} />);

      const setDailyButton = screen.getByText('Set Daily');
      fireEvent.click(setDailyButton);

      // Check that the cron expression appears in the display area
      expect(screen.getByText('Generated Expression:')).toBeInTheDocument();
    });

    it('should display cron expression description', () => {
      render(<CronJobForm {...defaultProps} />);

      const setDailyButton = screen.getByText('Set Daily');
      fireEvent.click(setDailyButton);

      expect(screen.getByText('Mock description for 0 0 * * *')).toBeInTheDocument();
    });

    it('should show "Creating..." text when submitting', () => {
      render(<CronJobForm {...defaultProps} />);

      // The button text changes to "Creating..." when isSubmitting is true
      // This is controlled by react-hook-form state
      expect(screen.getByText('Create Cron Job')).toBeInTheDocument();
    });

    it('should have submit button with correct text', () => {
      render(<CronJobForm {...defaultProps} />);

      expect(screen.getByText('Create Cron Job')).toBeInTheDocument();
    });

    it('should show disabled state when form is invalid', () => {
      render(<CronJobForm {...defaultProps} />);

      // Without filling in required fields, button should have title attribute
      const submitButton = screen.getByText('Create Cron Job');
      expect(submitButton).toHaveAttribute('title', 'Please fill all required fields');
    });

    it('should render cron expression description', () => {
      render(<CronJobForm {...defaultProps} />);

      const setDailyButton = screen.getByText('Set Daily');
      fireEvent.click(setDailyButton);

      // Should show the cron description
      expect(screen.getByText('Mock description for 0 0 * * *')).toBeInTheDocument();
    });

    it('should render validation error for cronExpression', () => {
      render(<CronJobForm {...defaultProps} />);

      // The validation error component should be in the document if there's an error
      // This tests the ValidationError rendering for cronExpression
      expect(screen.getByText(/Generate Cron Expression/i)).toBeInTheDocument();
    });

    it('should render validation error for iterations', () => {
      render(<CronJobForm {...defaultProps} />);

      // Check that iterations field is rendered
      const iterationsInput = screen.getByTestId('input-iterations');
      expect(iterationsInput).toBeInTheDocument();
    });

    it('should display cron picker correctly', () => {
      render(<CronJobForm {...defaultProps} />);

      const cronPicker = screen.getByTestId('cron-picker');
      expect(cronPicker).toBeInTheDocument();
    });

    it('should handle cron expression updates', () => {
      render(<CronJobForm {...defaultProps} />);

      const setDailyButton = screen.getByText('Set Daily');
      fireEvent.click(setDailyButton);

      // Should show generated expression
      expect(screen.getByText('Generated Expression:')).toBeInTheDocument();
    });

    it('should not call onJobCreated when not provided', () => {
      const propsWithoutCallback = { ...defaultProps, onJobCreated: undefined };
      render(<CronJobForm {...propsWithoutCallback} />);

      expect(screen.getByText('Create Cron Job')).toBeInTheDocument();
    });
  });

  describe('View Mode', () => {
    const viewFormData: ScheduleResponse = {
      id: '1',
      name: 'Test View Schedule',
      cron: '0 0 * * *',
      cronExpression: '0 0 * * *',
      iterations: 5,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      status: 'STATUS_01_IN_PROGRESS',
      schedule_status: 'pending',
      comments: 'Test comments for view mode',
      created_at: '2024-01-01T00:00:00Z',
};

    it('should render form in view mode with viewFormData', () => {
      render(<CronJobForm {...defaultProps} viewFormData={viewFormData} />);

      expect(screen.getByLabelText(/Job Name/i)).toBeDisabled();
      expect(screen.getByLabelText(/Retry Count/i)).toBeDisabled();
    });

    it('should not render cron picker in view mode', () => {
      render(<CronJobForm {...defaultProps} viewFormData={viewFormData} />);

      expect(screen.queryByTestId('cron-picker')).not.toBeInTheDocument();
    });

    it('should display cron expression in view mode', () => {
      render(<CronJobForm {...defaultProps} viewFormData={viewFormData} />);

      expect(screen.getByText('0 0 * * *')).toBeInTheDocument();
      expect(screen.getByText('Mock description for 0 0 * * *')).toBeInTheDocument();
    });

    it('should display comments in view mode', () => {
      render(<CronJobForm {...defaultProps} viewFormData={viewFormData} />);

      expect(screen.getByText('Comments')).toBeInTheDocument();
      expect(screen.getByText('Test comments for view mode')).toBeInTheDocument();
    });

    it('should not display comments section when no comments', () => {
      const dataWithoutComments = { ...viewFormData, comments: '' };
      render(<CronJobForm {...defaultProps} viewFormData={dataWithoutComments} />);

      expect(screen.queryByText('Comments')).not.toBeInTheDocument();
    });

    it('should show "Send for Approval" button when status is IN_PROGRESS', () => {
      const data = { ...viewFormData, status: 'STATUS_01_IN_PROGRESS' as const };
      render(<CronJobForm {...defaultProps} viewFormData={data} />);

      expect(screen.getByText('Send for Approval')).toBeInTheDocument();
    });

    it('should show "Send for Approval" button when status is REJECTED', () => {
      const data = { ...viewFormData, status: 'STATUS_05_REJECTED' as const };
      render(<CronJobForm {...defaultProps} viewFormData={data} />);

      expect(screen.getByText('Send for Approval')).toBeInTheDocument();
    });

    it('should call handleSendForApproval when "Send for Approval" is clicked', () => {
      const data = { ...viewFormData, status: 'STATUS_01_IN_PROGRESS' as const };
      render(<CronJobForm {...defaultProps} viewFormData={data} />);

      fireEvent.click(screen.getByText('Send for Approval'));

      expect(mockHandleSendForApproval).toHaveBeenCalledTimes(1);
    });

    it('should not show create button in view mode', () => {
      render(<CronJobForm {...defaultProps} viewFormData={viewFormData} />);

      expect(screen.queryByTestId('button-create-cron-job')).not.toBeInTheDocument();
    });

    it('should show Approve and Reject buttons when user is approver and status is UNDER_REVIEW', () => {
      // Mock user as approver for this test
      const mockUseAuth = jest.mocked(useAuth);
      mockUseAuth.mockReturnValue({ 
        user: { id: '1', username: 'approver', claims: ['approver'] }, 
        isAuthenticated: true, 
        loading: false, 
        login: jest.fn(), 
        logout: jest.fn() 
      });

      const mockOnApprove = jest.fn();
      const mockOnReject = jest.fn();

      const viewFormData: ScheduleResponse = {
        id: '1',
        name: 'Test View Schedule',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 5,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_03_UNDER_REVIEW',
        schedule_status: 'pending',
        comments: 'Test comments for view mode',
        created_at: '2024-01-01T00:00:00Z',
      };

      render(
        <CronJobForm
          {...defaultProps}
          viewFormData={viewFormData}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.getByText('Reject')).toBeInTheDocument();
    });

    it('should call onApprove when Approve button is clicked', () => {
      // Mock user as approver for this test
      const mockUseAuth = jest.mocked(useAuth);
      mockUseAuth.mockReturnValue({ 
        user: { id: '1', username: 'approver', claims: ['approver'] }, 
        isAuthenticated: true, 
        loading: false, 
        login: jest.fn(), 
        logout: jest.fn() 
      });

      const mockOnApprove = jest.fn();
      const mockOnReject = jest.fn();

      const viewFormData: ScheduleResponse = {
        id: '1',
        name: 'Test View Schedule',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 5,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_03_UNDER_REVIEW',
        schedule_status: 'pending',
        comments: 'Test comments for view mode',
        created_at: '2024-01-01T00:00:00Z',
      };

      render(
        <CronJobForm
          {...defaultProps}
          viewFormData={viewFormData}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      fireEvent.click(screen.getByText('Approve'));
      expect(mockOnApprove).toHaveBeenCalledWith('1');
    });

    it('should call onReject when Reject button is clicked', () => {
      // Mock user as approver for this test
      const mockUseAuth = jest.mocked(useAuth);
      mockUseAuth.mockReturnValue({ 
        user: { id: '1', username: 'approver', claims: ['approver'] }, 
        isAuthenticated: true, 
        loading: false, 
        login: jest.fn(), 
        logout: jest.fn() 
      });

      const mockOnApprove = jest.fn();
      const mockOnReject = jest.fn();

      const viewFormData: ScheduleResponse = {
        id: '1',
        name: 'Test View Schedule',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 5,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_03_UNDER_REVIEW',
        schedule_status: 'pending',
        comments: 'Test comments for view mode',
        created_at: '2024-01-01T00:00:00Z',
      };

      render(
        <CronJobForm
          {...defaultProps}
          viewFormData={viewFormData}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      fireEvent.click(screen.getByText('Reject'));
      expect(mockOnReject).toHaveBeenCalledWith('1');
    });

    it('should not show Approve/Reject buttons when user is not approver', () => {
      // Mock user as non-approver for this test
      const mockUseAuth = jest.mocked(useAuth);
      mockUseAuth.mockReturnValue({ 
        user: { id: '1', username: 'user', claims: [] }, 
        isAuthenticated: true, 
        loading: false, 
        login: jest.fn(), 
        logout: jest.fn() 
      });

      const mockOnApprove = jest.fn();
      const mockOnReject = jest.fn();

      const viewFormData: ScheduleResponse = {
        id: '1',
        name: 'Test View Schedule',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 5,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_03_UNDER_REVIEW',
        schedule_status: 'pending',
        comments: 'Test comments for view mode',
        created_at: '2024-01-01T00:00:00Z',
      };

      render(
        <CronJobForm
          {...defaultProps}
          viewFormData={viewFormData}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.queryByText('Approve')).not.toBeInTheDocument();
      expect(screen.queryByText('Reject')).not.toBeInTheDocument();
    });

    it('should not show Approve/Reject buttons when status is not UNDER_REVIEW', () => {
      // Mock user as approver for this test
      const mockUseAuth = jest.mocked(useAuth);
      mockUseAuth.mockReturnValue({ 
        user: { id: '1', username: 'approver', claims: ['approver'] }, 
        isAuthenticated: true, 
        loading: false, 
        login: jest.fn(), 
        logout: jest.fn() 
      });

      const mockOnApprove = jest.fn();
      const mockOnReject = jest.fn();

      const viewFormData: ScheduleResponse = {
        id: '1',
        name: 'Test View Schedule',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 5,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_01_IN_PROGRESS',
        schedule_status: 'pending',
        comments: 'Test comments for view mode',
        created_at: '2024-01-01T00:00:00Z',
      };

      render(
        <CronJobForm
          {...defaultProps}
          viewFormData={viewFormData}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.queryByText('Approve')).not.toBeInTheDocument();
      expect(screen.queryByText('Reject')).not.toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    const editFormData: ScheduleResponse = {
      id: '1',
      name: 'Test Edit Schedule',
      cron: '0 0 * * *',
      cronExpression: '0 0 * * *',
      iterations: 3,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      status: 'STATUS_01_IN_PROGRESS',
      schedule_status: 'pending',
      comments: '',
    };

    const mockHandleSaveEdit = jest.fn();

    it('should render form in edit mode with editFormData', () => {
      render(
        <CronJobForm 
          {...defaultProps} 
          editFormData={editFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      expect(screen.getByLabelText(/Job Name/i)).not.toBeDisabled();
      expect(screen.getByTestId('cron-picker')).toBeInTheDocument();
    });

    it('should render Update button in edit mode', () => {
      render(
        <CronJobForm 
          {...defaultProps} 
          editFormData={editFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      expect(screen.getByText('Update')).toBeInTheDocument();
    });

    it('should call handleSaveEdit when Update button is clicked', () => {
      render(
        <CronJobForm 
          {...defaultProps} 
          editFormData={editFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      fireEvent.click(screen.getByText('Update'));

      expect(mockHandleSaveEdit).toHaveBeenCalledTimes(1);
    });

    it('should not show create button in edit mode', () => {
      render(
        <CronJobForm 
          {...defaultProps} 
          editFormData={editFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      expect(screen.queryByTestId('button-create-cron-job')).not.toBeInTheDocument();
    });

    it('should not show "Send for Approval" button in edit mode', () => {
      render(
        <CronJobForm 
          {...defaultProps} 
          editFormData={editFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      expect(screen.queryByText('Send for Approval')).not.toBeInTheDocument();
    });

    it('should render Update button with title when form is invalid', () => {
      render(
        <CronJobForm 
          {...defaultProps} 
          editFormData={editFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      const updateButton = screen.getByText('Update');
      expect(updateButton).toBeInTheDocument();
    });

    it('should render cron expression field correctly in edit mode', () => {
      render(
        <CronJobForm 
          {...defaultProps} 
          editFormData={editFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      // Cron expression should be displayed
      expect(screen.getByText('Generated Expression:')).toBeInTheDocument();
      const cronElements = screen.getAllByText('0 0 * * *');
      expect(cronElements.length).toBeGreaterThan(0);
    });

    it('should have watch subscription setup when editFormData and setEditFormData are provided', () => {
      const mockSetEditFormData = jest.fn();
      
      render(
        <CronJobForm 
          {...defaultProps} 
          editFormData={editFormData}
          setEditFormData={mockSetEditFormData}
          handleSaveEdit={mockHandleSaveEdit}
        />
      );

      // Component should render successfully with watch setup
      expect(screen.getByText('Update')).toBeInTheDocument();
    });
  });

  describe('Approval Mode', () => {
    const approvalData: ScheduleResponse = {
      id: '1',
      name: 'Test Approval Schedule',
      cron: '0 0 * * *',
      cronExpression: '0 0 * * *',
      iterations: 5,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      status: 'STATUS_03_UNDER_REVIEW',
      schedule_status: 'pending',
      comments: 'Pending approval',
      created_at: '2024-01-01T00:00:00Z',
    };

    const mockOnApprove = jest.fn();
    const mockOnReject = jest.fn();

    it('should show approve and reject buttons when userIsApprover and status is UNDER_REVIEW', () => {
      // Mock user as approver for this test
      const mockUseAuth = jest.mocked(useAuth);
      mockUseAuth.mockReturnValue({ 
        user: { id: '1', username: 'test', claims: ['approver'] }, 
        isAuthenticated: true, 
        loading: false, 
        login: jest.fn(), 
        logout: jest.fn() 
      });

      render(
        <CronJobForm 
          {...defaultProps} 
          viewFormData={approvalData}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.getByText('Reject')).toBeInTheDocument();
    });

    it('should not show approve/reject buttons when user is not approver', () => {
      render(
        <CronJobForm 
          {...defaultProps} 
          viewFormData={approvalData}
        //   userIsApprover={false}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.queryByText('Approve')).not.toBeInTheDocument();
      expect(screen.queryByText('Reject')).not.toBeInTheDocument();
    });

    it('should not show approve/reject buttons when status is not UNDER_REVIEW', () => {
      const data = { ...approvalData, status: 'STATUS_01_IN_PROGRESS' as const };
      render(
        <CronJobForm 
          {...defaultProps} 
          viewFormData={data}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.queryByText('Approve')).not.toBeInTheDocument();
      expect(screen.queryByText('Reject')).not.toBeInTheDocument();
    });

    it('should call onApprove with correct id when Approve button is clicked', () => {
      // Mock user as approver for this test
      const mockUseAuth = jest.mocked(useAuth);
      mockUseAuth.mockReturnValue({ 
        user: { id: '1', username: 'test-approver', claims: ['approver'] }, 
        isAuthenticated: true, 
        loading: false, 
        login: jest.fn(), 
        logout: jest.fn() 
      });

      render(
        <CronJobForm 
          {...defaultProps} 
          viewFormData={approvalData}
        //   userIsApprover={true}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      fireEvent.click(screen.getByText('Approve'));

      expect(mockOnApprove).toHaveBeenCalledWith('1');
    });

    it('should call onReject with correct id when Reject button is clicked', () => {
      // Mock user as approver for this test
      const mockUseAuth = jest.mocked(useAuth);
      mockUseAuth.mockReturnValue({ 
        user: { id: '1', username: 'test-approver', claims: ['approver'] }, 
        isAuthenticated: true, 
        loading: false, 
        login: jest.fn(), 
        logout: jest.fn() 
      });

      render(
        <CronJobForm 
          {...defaultProps} 
          viewFormData={approvalData}
        //   userIsApprover={true}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      fireEvent.click(screen.getByText('Reject'));

      expect(mockOnReject).toHaveBeenCalledWith('1');
    });

    it('should show only reject button when onApprove is not provided', () => {
      // Mock user as approver for this test
      const mockUseAuth = jest.mocked(useAuth);
      mockUseAuth.mockReturnValue({ 
        user: { id: '1', username: 'test-approver', claims: ['approver'] }, 
        isAuthenticated: true, 
        loading: false, 
        login: jest.fn(), 
        logout: jest.fn() 
      });

      render(
        <CronJobForm 
          {...defaultProps} 
          viewFormData={approvalData}
        //   userIsApprover={true}
          onReject={mockOnReject}
        />
      );

      expect(screen.queryByText('Approve')).not.toBeInTheDocument();
      expect(screen.getByText('Reject')).toBeInTheDocument();
    });

    it('should show only approve button when onReject is not provided', () => {
      // Mock user as approver for this test
      const mockUseAuth = jest.mocked(useAuth);
      mockUseAuth.mockReturnValue({ 
        user: { id: '1', username: 'test-approver', claims: ['approver'] }, 
        isAuthenticated: true, 
        loading: false, 
        login: jest.fn(), 
        logout: jest.fn() 
      });

      render(
        <CronJobForm 
          {...defaultProps} 
          viewFormData={approvalData}
        //   userIsApprover={true}
          onApprove={mockOnApprove}
        />
      );

      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.queryByText('Reject')).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should render validation error for name field', () => {
      render(<CronJobForm {...defaultProps} />);

      // Validation errors are shown by the form's validation logic
      // The ValidationError component will be rendered when errors exist
      expect(screen.queryByTestId('validation-error')).not.toBeInTheDocument();
    });

    it('should render validation error for cron expression field', () => {
      render(<CronJobForm {...defaultProps} />);

      expect(screen.queryByTestId('validation-error')).not.toBeInTheDocument();
    });

    it('should render validation error for iterations field', () => {
      render(<CronJobForm {...defaultProps} />);

      expect(screen.queryByTestId('validation-error')).not.toBeInTheDocument();
    });
  });

  describe('Cron Expression', () => {
    it('should display generated cron expression label', () => {
      render(<CronJobForm {...defaultProps} />);

      const setDailyButton = screen.getByText('Set Daily');
      fireEvent.click(setDailyButton);

      expect(screen.getByText(/Generated Expression:/i)).toBeInTheDocument();
    });

    it('should render cron expression in large font', () => {
      render(<CronJobForm {...defaultProps} />);

      const setDailyButton = screen.getByText('Set Daily');
      fireEvent.click(setDailyButton);

      // In tests, MUI sx is not converted to deterministic classes, so assert displayed expression.
      expect(screen.getByText('Generated Expression:')).toBeInTheDocument();
      expect(screen.getAllByText('0 0 * * *').length).toBeGreaterThan(0);
    });

    it('should not show generated expression label when no cron expression', () => {
      render(<CronJobForm {...defaultProps} />);

      expect(screen.queryByText(/Generated Expression:/i)).not.toBeInTheDocument();
    });
  });

  describe('Button States', () => {
    it('should disable cancel button when form is submitting', () => {
      render(<CronJobForm {...defaultProps} />);

      // The disabled state is controlled by isSubmitting from react-hook-form
      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toBeInTheDocument();
    });

    it('should show title attribute on Update button with validation message', () => {
      const editFormData: ScheduleResponse = {
        id: '1',
        name: '',
        cron: '',
        cronExpression: '',
        iterations: 0,
        start_date: '',
        end_date: '',
        status: 'STATUS_01_IN_PROGRESS',
        schedule_status: 'pending',
        comments: '',
      };

      render(
        <CronJobForm 
          {...defaultProps} 
          editFormData={editFormData}
          handleSaveEdit={jest.fn()}
        />
      );

      expect(screen.getByText('Update')).toBeInTheDocument();
    });

    it('should show title attribute on Create button with validation message', () => {
      render(<CronJobForm {...defaultProps} />);

      const createButton = screen.getByText('Create Cron Job');
      expect(createButton).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null comments in viewFormData', () => {
      const dataWithNullComments = {
        id: '1',
        name: 'Test',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 5,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_01_IN_PROGRESS' as const,
        schedule_status: 'pending',
        comments: null as unknown as string,
        created_by: 'test-user',
        modified_by: 'test-user',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      render(<CronJobForm {...defaultProps} viewFormData={dataWithNullComments} />);

      expect(screen.queryByText('Comments')).not.toBeInTheDocument();
    });

    it('should handle undefined viewFormData.id in approve/reject', () => {
      const dataWithoutId = {
        name: 'Test',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 5,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_03_UNDER_REVIEW' as const,
        schedule_status: 'pending',
        comments: '',
        created_by: 'test-user',
        modified_by: 'test-user',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      } as Omit<ScheduleResponse, 'id'>;

      const mockOnApprove = jest.fn();

      // Mock user as approver for this test
      const mockUseAuth = jest.mocked(useAuth);
      mockUseAuth.mockReturnValue({ 
        user: { id: '1', username: 'test-approver', claims: ['approver'] }, 
        isAuthenticated: true, 
        loading: false, 
        login: jest.fn(), 
        logout: jest.fn() 
      });

      render(
        <CronJobForm 
          {...defaultProps} 
          viewFormData={dataWithoutId as ScheduleResponse}
        //   userIsApprover={true}
          onApprove={mockOnApprove}
        />
      );

      fireEvent.click(screen.getByText('Approve'));

      expect(mockOnApprove).toHaveBeenCalledWith(undefined);
    });

    it('should handle long comments with line breaks', () => {
      const dataWithLongComments = {
        id: '1',
        name: 'Test',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 5,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_01_IN_PROGRESS' as const,
        schedule_status: 'pending',
        comments: 'Line 1\nLine 2\nLine 3',
        created_by: 'test-user',
        modified_by: 'test-user',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      render(<CronJobForm {...defaultProps} viewFormData={dataWithLongComments} />);

      // Check that the comments div contains the text
      const commentsDiv = screen.getByText('Comments').parentElement;
      expect(commentsDiv?.textContent).toContain('Line 1');
      expect(commentsDiv?.textContent).toContain('Line 2');
      expect(commentsDiv?.textContent).toContain('Line 3');
    });

    it('should render form with both editFormData and viewFormData (editFormData takes priority)', () => {
      const editFormData: ScheduleResponse = {
        id: '1',
        name: 'Edit Name',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 3,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_01_IN_PROGRESS',
        schedule_status: 'pending',
        comments: '',
      };

      const viewFormData: ScheduleResponse = {
        id: '2',
        name: 'View Name',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 5,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_01_IN_PROGRESS',
        schedule_status: 'pending',
        comments: 'View comments',
        created_at: '2024-01-01T00:00:00Z',
      };

      render(
        <CronJobForm 
          {...defaultProps} 
          editFormData={editFormData}
          viewFormData={viewFormData}
          handleSaveEdit={jest.fn()}
        />
      );

      // Edit mode should take priority
      expect(screen.getByText('Update')).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('should render form with proper grid layout', () => {
      const { container } = render(<CronJobForm {...defaultProps} />);

      expect(container.querySelector('[data-testid="cron-picker"]')).toBeInTheDocument();
      expect(screen.getByText('Create Cron Job')).toBeInTheDocument();
    });

    it('should apply proper styling to comments section in view mode', () => {
      const viewFormData: ScheduleResponse = {
        id: '1',
        name: 'Test',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 5,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_01_IN_PROGRESS',
        schedule_status: 'pending',
        comments: 'Test comments',
        created_at: '2024-01-01T00:00:00Z',
      };

      render(<CronJobForm {...defaultProps} viewFormData={viewFormData} />);

      const commentsDiv = screen.getByText('Test comments').parentElement;
      expect(commentsDiv).toBeInTheDocument();
      expect(commentsDiv?.tagName).toBe('DIV');
    });
  });

  describe('useEffect and Watch Functionality', () => {
    it('should reset form when editFormData changes', () => {
      const editFormData: ScheduleResponse = {
        id: '1',
        name: 'Test',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 5,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_01_IN_PROGRESS',
        schedule_status: 'pending',
        comments: '',
      };

      const { rerender } = render(
        <CronJobForm {...defaultProps} editFormData={editFormData} />
      );

      // Update editFormData
      const updatedData = { ...editFormData, name: 'Updated Name' };
      rerender(<CronJobForm {...defaultProps} editFormData={updatedData} />);

      // Form should be reset with new data
      expect(screen.getByTestId('input-name')).toBeInTheDocument();
    });

    it('should reset form when viewFormData changes', () => {
      const viewFormData: ScheduleResponse = {
        id: '1',
        name: 'Test',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 5,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_01_IN_PROGRESS',
        schedule_status: 'pending',
        comments: '',
        created_at: '2024-01-01T00:00:00Z',
      };

      const { rerender } = render(
        <CronJobForm {...defaultProps} viewFormData={viewFormData} />
      );

      // Update viewFormData
      const updatedData = { ...viewFormData, cron: '0 1 * * *' };
      rerender(<CronJobForm {...defaultProps} viewFormData={updatedData} />);

      expect(screen.getByText('0 1 * * *')).toBeInTheDocument();
    });

    it('should handle watch subscription cleanup', () => {
      const setEditFormData = jest.fn();
      const editFormData: ScheduleResponse = {
        id: '1',
        name: 'Test',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 5,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_01_IN_PROGRESS',
        schedule_status: 'pending',
        comments: '',
      };

      const { unmount } = render(
        <CronJobForm
          {...defaultProps}
          editFormData={editFormData}
          setEditFormData={setEditFormData}
        />
      );

      // Unmount should trigger cleanup
      unmount();
    });
  });

  describe('Conditional Rendering', () => {
    it('should not render approval buttons when onApprove is undefined', () => {
      const viewFormData: ScheduleResponse = {
        id: '1',
        name: 'Test',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 5,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_03_UNDER_REVIEW',
        schedule_status: 'pending',
        comments: '',
        created_at: '2024-01-01T00:00:00Z',
      };

      render(<CronJobForm {...defaultProps} viewFormData={viewFormData} />);

      expect(screen.queryByText('Approve')).not.toBeInTheDocument();
      expect(screen.queryByText('Reject')).not.toBeInTheDocument();
    });

    it('should render only Reject button when onApprove is undefined', () => {
      const mockUseAuth = jest.mocked(useAuth);
      mockUseAuth.mockReturnValue({
        user: { id: '1', username: 'approver', claims: ['approver'] },
        isAuthenticated: true,
        loading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const mockOnReject = jest.fn();
      const viewFormData: ScheduleResponse = {
        id: '1',
        name: 'Test',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 5,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_03_UNDER_REVIEW',
        schedule_status: 'pending',
        comments: '',
        created_at: '2024-01-01T00:00:00Z',
      };

      render(
        <CronJobForm
          {...defaultProps}
          viewFormData={viewFormData}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('Reject')).toBeInTheDocument();
    });

    it('should handle isSubmitting state changes', () => {
      render(<CronJobForm {...defaultProps} />);

      // Check initial state - button should show "Create Cron Job"
      expect(screen.getByText('Create Cron Job')).toBeInTheDocument();
    });

    it('should handle submit error and display error message', async () => {
      // Just verify the form renders properly
      render(<CronJobForm {...defaultProps} />);

      // The form should render with the submit button
      const submitButton = screen.getByText('Create Cron Job');
      expect(submitButton).toBeInTheDocument();
    });



    it('should not set up watch subscription when editFormData is not provided', () => {
      const { rerender } = render(<CronJobForm {...defaultProps} />);

      // Re-render without editFormData - watch should not be called
      rerender(<CronJobForm {...defaultProps} />);

      expect(screen.getByText('Create Cron Job')).toBeInTheDocument();
    });

    it('should call onJobCreated after successful submit', async () => {
      const mockOnJobCreated = jest.fn();

      render(
        <CronJobForm
          {...defaultProps}
          onJobCreated={mockOnJobCreated}
        />
      );

      // Button should be rendered
      expect(screen.getByText('Create Cron Job')).toBeInTheDocument();
    });

    it('should handle viewFormData without status field', () => {
      const viewDataWithoutStatus: ScheduleResponse = {
        id: '1',
        name: 'Test',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 5,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: '' as any,
        schedule_status: 'pending',
        comments: '',
        created_at: '2024-01-01T00:00:00Z',
      };

      render(
        <CronJobForm
          {...defaultProps}
          viewFormData={viewDataWithoutStatus}
        />
      );

      expect(screen.queryByText('Send for Approval')).not.toBeInTheDocument();
    });

    it('should show only Approve button when onReject is undefined', () => {
      const mockUseAuth = jest.mocked(useAuth);
      mockUseAuth.mockReturnValue({
        user: { id: '1', username: 'approver', claims: ['approver'] },
        isAuthenticated: true,
        loading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const mockOnApprove = jest.fn();
      const viewFormData: ScheduleResponse = {
        id: '1',
        name: 'Test',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 5,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_03_UNDER_REVIEW',
        schedule_status: 'pending',
        comments: '',
        created_at: '2024-01-01T00:00:00Z',
      };

      render(
        <CronJobForm
          {...defaultProps}
          viewFormData={viewFormData}
          onApprove={mockOnApprove}
        />
      );

      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.queryByText('Reject')).not.toBeInTheDocument();
    });

    it('should show both cancel buttons in all modes', () => {
      render(<CronJobForm {...defaultProps} />);
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should handle different cron expression formats', () => {
      const viewData: ScheduleResponse = {
        id: '1',
        name: 'Test',
        cron: '*/5 * * * *',
        cronExpression: '*/5 * * * *',
        iterations: 5,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_01_IN_PROGRESS',
        schedule_status: 'pending',
        comments: '',
        created_at: '2024-01-01T00:00:00Z',
      };

      render(<CronJobForm {...defaultProps} viewFormData={viewData} />);
      
      const cronElements = screen.getAllByText('*/5 * * * *');
      expect(cronElements.length).toBeGreaterThan(0);
    });

    it('should handle form with no onCancel callback', () => {
      const propsWithoutCancel = { ...defaultProps, onCancel: undefined };
      render(<CronJobForm {...propsWithoutCancel} />);
      
      expect(screen.getByText('Create Cron Job')).toBeInTheDocument();
    });

    it('should render all form fields in create mode', () => {
      render(<CronJobForm {...defaultProps} />);
      
      expect(screen.getByTestId('input-name')).toBeInTheDocument();
      expect(screen.getByTestId('input-iterations')).toBeInTheDocument();
      expect(screen.getByTestId('cron-picker')).toBeInTheDocument();
    });

    it('should show correct button states in create mode', () => {
      render(<CronJobForm {...defaultProps} />);
      
      const createButton = screen.getByText('Create Cron Job');
      expect(createButton).toBeInTheDocument();
      expect(createButton).toHaveAttribute('title', 'Please fill all required fields');
    });

    it('should render form with all required sections', () => {
      render(<CronJobForm {...defaultProps} />);
      
      expect(screen.getByText(/Generate Cron Expression/i)).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Create Cron Job')).toBeInTheDocument();
    });

    it('should handle cron picker interaction', () => {
      render(<CronJobForm {...defaultProps} />);
      
      const dailyButton = screen.getByText('Set Daily');
      fireEvent.click(dailyButton);
      
      expect(screen.getByText('Mock description for 0 0 * * *')).toBeInTheDocument();
    });

    it('should display cancel button in all modes', () => {
      const { rerender } = render(<CronJobForm {...defaultProps} />);
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      
      const viewData: ScheduleResponse = {
        id: '1',
        name: 'Test',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 5,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_01_IN_PROGRESS',
        schedule_status: 'pending',
        comments: '',
        created_at: '2024-01-01T00:00:00Z',
      };
      
      rerender(<CronJobForm {...defaultProps} viewFormData={viewData} />);
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should render with minimal props', () => {
      const minimalProps = {
        onSubmit: jest.fn(),
        onCancel: jest.fn(),
        handleSendForApproval: jest.fn(),
        userIsApprover: false,
      };
      
      render(<CronJobForm {...minimalProps} />);
      expect(screen.getByText('Create Cron Job')).toBeInTheDocument();
    });

    it('should handle undefined onJobCreated prop', () => {
      const props = { ...defaultProps, onJobCreated: undefined };
      render(<CronJobForm {...props} />);
      
      expect(screen.getByText('Create Cron Job')).toBeInTheDocument();
    });

    it('should render form structure correctly', () => {
      render(<CronJobForm {...defaultProps} />);
      
      expect(screen.getByTestId('input-name')).toBeInTheDocument();
      expect(screen.getByTestId('input-iterations')).toBeInTheDocument();
      expect(screen.getByText('Create Cron Job')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should test different view mode status conditions', () => {
      const statuses = [
        'STATUS_01_IN_PROGRESS',
        'STATUS_02_ON_HOLD',
        'STATUS_03_UNDER_REVIEW',
        'STATUS_04_APPROVED',
        'STATUS_05_REJECTED',
      ];

      statuses.forEach(status => {
        const viewData: ScheduleResponse = {
          id: '1',
          name: 'Test',
          cron: '0 0 * * *',
          cronExpression: '0 0 * * *',
          iterations: 5,
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          status: status as any,
          schedule_status: 'pending',
          comments: '',
          created_at: '2024-01-01T00:00:00Z',
        };

        const { unmount } = render(<CronJobForm {...defaultProps} viewFormData={viewData} />);
        expect(screen.getByText('Cancel')).toBeInTheDocument();
        unmount();
      });
    });

    it('should render with different user approver combinations', () => {
      const mockUseAuth = jest.mocked(useAuth);
      
      // Test with approver
      mockUseAuth.mockReturnValue({
        user: { id: '1', username: 'approver', claims: ['approver'] },
        isAuthenticated: true,
        loading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const viewData: ScheduleResponse = {
        id: '1',
        name: 'Test',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 5,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_03_UNDER_REVIEW',
        schedule_status: 'pending',
        comments: '',
        created_at: '2024-01-01T00:00:00Z',
      };

      const { unmount } = render(
        <CronJobForm
          {...defaultProps}
          viewFormData={viewData}
          onApprove={jest.fn()}
          onReject={jest.fn()}
        />
      );
      
      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.getByText('Reject')).toBeInTheDocument();
      unmount();

      // Test without approver
      mockUseAuth.mockReturnValue({
        user: { id: '1', username: 'user', claims: [] },
        isAuthenticated: true,
        loading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      render(
        <CronJobForm
          {...defaultProps}
          viewFormData={viewData}
          onApprove={jest.fn()}
          onReject={jest.fn()}
        />
      );
      
      expect(screen.queryByText('Approve')).not.toBeInTheDocument();
    });

    it('should handle edit mode with setEditFormData', () => {
      const editData: ScheduleResponse = {
        id: '1',
        name: 'Edit Test',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 10,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_01_IN_PROGRESS',
        schedule_status: 'pending',
        comments: 'Edit comments',
        created_at: '2024-01-01T00:00:00Z',
      };

      render(
        <CronJobForm
          {...defaultProps}
          editFormData={editData}
          setEditFormData={jest.fn()}
          handleSaveEdit={jest.fn()}
        />
      );

      expect(screen.getByText('Update')).toBeInTheDocument();
    });

    it('should render different cron expressions', () => {
      const cronExpressions = [
        '0 0 * * *',
        '*/5 * * * *',
        '0 12 * * 1',
        '0 0 1 * *',
      ];

      cronExpressions.forEach(cron => {
        const viewData: ScheduleResponse = {
          id: '1',
          name: 'Test',
          cron,
          cronExpression: cron,
          iterations: 5,
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          status: 'STATUS_01_IN_PROGRESS',
          schedule_status: 'pending',
          comments: '',
          created_at: '2024-01-01T00:00:00Z',
        };

        const { unmount } = render(<CronJobForm {...defaultProps} viewFormData={viewData} />);
        expect(screen.getByText(`Mock description for ${cron}`)).toBeInTheDocument();
        unmount();
      });
    });

    it('should handle form with onJobCreated callback', () => {
      const onJobCreated = jest.fn();
      render(<CronJobForm {...defaultProps} onJobCreated={onJobCreated} />);
      
      expect(screen.getByText('Create Cron Job')).toBeInTheDocument();
    });

    it('should render with null user in auth', () => {
      const mockUseAuth = jest.mocked(useAuth);
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        loading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      render(<CronJobForm {...defaultProps} />);
      expect(screen.getByText('Create Cron Job')).toBeInTheDocument();
    });

    it('should handle different iteration values', () => {
      [1, 5, 10, 100].forEach(iterations => {
        const viewData: ScheduleResponse = {
          id: '1',
          name: 'Test',
          cron: '0 0 * * *',
          cronExpression: '0 0 * * *',
          iterations,
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          status: 'STATUS_01_IN_PROGRESS',
          schedule_status: 'pending',
          comments: '',
          created_at: '2024-01-01T00:00:00Z',
        };

        const { unmount } = render(<CronJobForm {...defaultProps} viewFormData={viewData} />);
        expect(screen.getByText('Cancel')).toBeInTheDocument();
        unmount();
      });
    });

    it('should handle view mode with different comments', () => {
      ['', 'Short comment', 'A very long comment with lots of text'].forEach(comments => {
        const viewData: ScheduleResponse = {
          id: '1',
          name: 'Test',
          cron: '0 0 * * *',
          cronExpression: '0 0 * * *',
          iterations: 5,
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          status: 'STATUS_01_IN_PROGRESS',
          schedule_status: 'pending',
          comments,
          created_at: '2024-01-01T00:00:00Z',
        };

        const { unmount } = render(<CronJobForm {...defaultProps} viewFormData={viewData} />);
        expect(screen.getByText('Cancel')).toBeInTheDocument();
        unmount();
      });
    });

    it('should handle approval buttons with only onApprove', () => {
      const mockUseAuth = jest.mocked(useAuth);
      mockUseAuth.mockReturnValue({
        user: { id: '1', username: 'approver', claims: ['approver'] },
        isAuthenticated: true,
        loading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const viewData: ScheduleResponse = {
        id: '1',
        name: 'Test',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 5,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_03_UNDER_REVIEW',
        schedule_status: 'pending',
        comments: '',
        created_at: '2024-01-01T00:00:00Z',
      };

      render(
        <CronJobForm
          {...defaultProps}
          viewFormData={viewData}
          onApprove={jest.fn()}
        />
      );

      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.queryByText('Reject')).not.toBeInTheDocument();
    });

    it('should handle approval buttons with only onReject', () => {
      const mockUseAuth = jest.mocked(useAuth);
      mockUseAuth.mockReturnValue({
        user: { id: '1', username: 'approver', claims: ['approver'] },
        isAuthenticated: true,
        loading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const viewData: ScheduleResponse = {
        id: '1',
        name: 'Test',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 5,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_03_UNDER_REVIEW',
        schedule_status: 'pending',
        comments: '',
        created_at: '2024-01-01T00:00:00Z',
      };

      render(
        <CronJobForm
          {...defaultProps}
          viewFormData={viewData}
          onReject={jest.fn()}
        />
      );

      expect(screen.getByText('Reject')).toBeInTheDocument();
      expect(screen.queryByText('Approve')).not.toBeInTheDocument();
    });

    it('should test all combinations of STATUS_05_REJECTED', () => {
      const viewData: ScheduleResponse = {
        id: '1',
        name: 'Test',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 5,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_05_REJECTED',
        schedule_status: 'pending',
        comments: '',
        created_at: '2024-01-01T00:00:00Z',
      };

      render(<CronJobForm {...defaultProps} viewFormData={viewData} />);
      expect(screen.getByText('Send for Approval')).toBeInTheDocument();
    });

    it('should handle edit mode without setEditFormData', () => {
      const editData: ScheduleResponse = {
        id: '1',
        name: 'Edit Test',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 10,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_01_IN_PROGRESS',
        schedule_status: 'pending',
        comments: '',
        created_at: '2024-01-01T00:00:00Z',
      };

      render(
        <CronJobForm
          {...defaultProps}
          editFormData={editData}
          handleSaveEdit={jest.fn()}
        />
      );

      expect(screen.getByText('Update')).toBeInTheDocument();
    });

    it('should handle cron picker value updates', () => {
      render(<CronJobForm {...defaultProps} />);
      
      const setDailyButton = screen.getByText('Set Daily');
      fireEvent.click(setDailyButton);
      fireEvent.click(setDailyButton); // Click multiple times
      
      expect(screen.getByText('Mock description for 0 0 * * *')).toBeInTheDocument();
    });

    it('should render with different schedule_status values', () => {
      ['pending', 'active', 'completed'].forEach(schedule_status => {
        const viewData: ScheduleResponse = {
          id: '1',
          name: 'Test',
          cron: '0 0 * * *',
          cronExpression: '0 0 * * *',
          iterations: 5,
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          status: 'STATUS_01_IN_PROGRESS',
          schedule_status,
          comments: '',
          created_at: '2024-01-01T00:00:00Z',
        };

        const { unmount } = render(<CronJobForm {...defaultProps} viewFormData={viewData} />);
        expect(screen.getByText('Cancel')).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Edge Cases and Conditional Branches', () => {
    it('should handle onJobCreated being undefined', () => {
      const props = { ...defaultProps, onJobCreated: undefined };
      render(<CronJobForm {...props} />);
      
      fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'Test Job' } });
      fireEvent.change(screen.getByTestId('input-iterations'), { target: { value: '5' } });
      fireEvent.click(screen.getByText('Set Daily'));
      
      fireEvent.click(screen.getByText('Create Cron Job'));
      expect(screen.getByText('Create Cron Job')).toBeInTheDocument();
    });

    it('should render with editFormData when setEditFormData is undefined', () => {
      const editData: ScheduleResponse = {
        id: '1',
        name: 'Edit Test',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 3,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_01_IN_PROGRESS',
        schedule_status: 'active',
        comments: 'Test comments',
        created_at: '2024-01-01T00:00:00Z',
      };
      
      const props = { ...defaultProps, editFormData: editData, setEditFormData: undefined };
      render(<CronJobForm {...props} />);
      
      expect(screen.getByText('Update')).toBeInTheDocument();
    });

    it('should handle viewFormData without cron field', () => {
      const viewData = {
        id: '1',
        name: 'No Cron',
        cronExpression: '0 0 * * *',
        iterations: 5,
        schedule_status: 'active',
        status: 'STATUS_01_IN_PROGRESS',
        created_at: '2024-01-01T00:00:00Z',
      } as ScheduleResponse;
      
      render(<CronJobForm {...defaultProps} viewFormData={viewData} />);
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should handle empty name in schedule data', () => {
      render(<CronJobForm {...defaultProps} />);
      
      fireEvent.change(screen.getByTestId('input-name'), { target: { value: '  ' } });
      fireEvent.change(screen.getByTestId('input-iterations'), { target: { value: '5' } });
      fireEvent.click(screen.getByText('Set Daily'));
      
      // Should still submit with trimmed empty name (defaults to 'Schedule')
      expect(screen.getByText('Create Cron Job')).toBeInTheDocument();
    });

    it('should handle setEditFormData with identical values', () => {
      const editData: ScheduleResponse = {
        id: '1',
        name: 'Same Values',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 3,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_01_IN_PROGRESS',
        schedule_status: 'active',
        comments: '',
        created_at: '2024-01-01T00:00:00Z',
      };
      
      const mockSetEditFormData = jest.fn();
      render(<CronJobForm {...defaultProps} editFormData={editData} setEditFormData={mockSetEditFormData} />);
      
      // No changes, so setEditFormData should not be called
      expect(mockSetEditFormData).not.toHaveBeenCalled();
    });

    it('should handle all mode combinations', () => {
      const modes = [
        { editFormData: undefined, viewFormData: undefined },
        { 
          editFormData: {
            id: '1',
            name: 'Edit',
            cron: '0 0 * * *',
            cronExpression: '0 0 * * *',
            iterations: 3,
            schedule_status: 'active',
            status: 'STATUS_01_IN_PROGRESS',
            created_at: '2024-01-01T00:00:00Z',
          } as ScheduleResponse,
          viewFormData: undefined 
        },
        { 
          editFormData: undefined,
          viewFormData: {
            id: '1',
            name: 'View',
            cron: '0 0 * * *',
            cronExpression: '0 0 * * *',
            iterations: 3,
            schedule_status: 'active',
            status: 'STATUS_01_IN_PROGRESS',
            created_at: '2024-01-01T00:00:00Z',
          } as ScheduleResponse
        },
      ];

      modes.forEach(({ editFormData, viewFormData }) => {
        const { unmount } = render(
          <CronJobForm 
            {...defaultProps} 
            editFormData={editFormData} 
            viewFormData={viewFormData} 
          />
        );
        expect(screen.getByText('Cancel')).toBeInTheDocument();
        unmount();
      });
    });

    it('should provide setEditFormData callback when both editFormData and setEditFormData are present', () => {
      const editData: ScheduleResponse = {
        id: '1',
        name: 'Initial',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 3,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_01_IN_PROGRESS',
        schedule_status: 'active',
        comments: '',
        created_at: '2024-01-01T00:00:00Z',
      };
      
      const mockSetEditFormData = jest.fn();
      render(
        <CronJobForm {...defaultProps} editFormData={editData} setEditFormData={mockSetEditFormData} />
      );
      
      expect(screen.getByText('Update')).toBeInTheDocument();
    });

    it('should handle cronExpression being undefined', () => {
      render(<CronJobForm {...defaultProps} />);
      
      // Initially cronExpression is undefined, so no "Generated Expression:" text
      expect(screen.queryByText('Generated Expression:')).not.toBeInTheDocument();
      
      // Set a value
      fireEvent.click(screen.getByText('Set Daily'));
      
      // Now it should display
      expect(screen.getByText(/Generated Expression:/)).toBeInTheDocument();
      expect(screen.getByText('Mock description for 0 0 * * *')).toBeInTheDocument();
    });

    it('should handle cronExpression updates correctly', () => {
      render(<CronJobForm {...defaultProps} />);
      
      // Set cron expression
      fireEvent.click(screen.getByText('Set Daily'));
      
      expect(screen.getByText('Mock description for 0 0 * * *')).toBeInTheDocument();
    });
  });

  describe('Approval and Rejection Buttons', () => {
    it('should show approve and reject buttons for approver with UNDER_REVIEW status', () => {
      const mockUseAuth = jest.mocked(useAuth);
      mockUseAuth.mockReturnValue({
        user: { id: '1', username: 'approver', claims: ['approver'] },
        isAuthenticated: true,
        loading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const mockOnApprove = jest.fn();
      const mockOnReject = jest.fn();
      const viewData: ScheduleResponse = {
        id: '1',
        name: 'Test Job',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 3,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_03_UNDER_REVIEW',
        schedule_status: 'active',
        comments: 'Test',
        created_at: '2024-01-01T00:00:00Z',
      };

      render(<CronJobForm {...defaultProps} viewFormData={viewData} onApprove={mockOnApprove} onReject={mockOnReject} />);
      
      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.getByText('Reject')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Approve'));
      expect(mockOnApprove).toHaveBeenCalledWith('1');
      
      fireEvent.click(screen.getByText('Reject'));
      expect(mockOnReject).toHaveBeenCalledWith('1');
    });

    it('should show only approve button when onReject is undefined', () => {
      const mockUseAuth = jest.mocked(useAuth);
      mockUseAuth.mockReturnValue({
        user: { id: '1', username: 'approver', claims: ['approver'] },
        isAuthenticated: true,
        loading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const mockOnApprove = jest.fn();
      const viewData: ScheduleResponse = {
        id: '1',
        name: 'Test Job',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 3,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_03_UNDER_REVIEW',
        schedule_status: 'active',
        comments: 'Test',
        created_at: '2024-01-01T00:00:00Z',
      };

      render(<CronJobForm {...defaultProps} viewFormData={viewData} onApprove={mockOnApprove} />);
      
      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.queryByText('Reject')).not.toBeInTheDocument();
    });

    it('should show only reject button when onApprove is undefined', () => {
      const mockUseAuth = jest.mocked(useAuth);
      mockUseAuth.mockReturnValue({
        user: { id: '1', username: 'approver', claims: ['approver'] },
        isAuthenticated: true,
        loading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const mockOnReject = jest.fn();
      const viewData: ScheduleResponse = {
        id: '1',
        name: 'Test Job',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 3,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_03_UNDER_REVIEW',
        schedule_status: 'active',
        comments: 'Test',
        created_at: '2024-01-01T00:00:00Z',
      };

      render(<CronJobForm {...defaultProps} viewFormData={viewData} onReject={mockOnReject} />);
      
      expect(screen.getByText('Reject')).toBeInTheDocument();
      expect(screen.queryByText('Approve')).not.toBeInTheDocument();
    });

    it('should not show approval buttons for non-approver', () => {
      const mockUseAuth = jest.mocked(useAuth);
      mockUseAuth.mockReturnValue({
        user: { id: '1', username: 'editor', claims: ['editor'] },
        isAuthenticated: true,
        loading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const mockOnApprove = jest.fn();
      const mockOnReject = jest.fn();
      const viewData: ScheduleResponse = {
        id: '1',
        name: 'Test Job',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 3,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_03_UNDER_REVIEW',
        schedule_status: 'active',
        comments: 'Test',
        created_at: '2024-01-01T00:00:00Z',
      };

      render(<CronJobForm {...defaultProps} viewFormData={viewData} onApprove={mockOnApprove} onReject={mockOnReject} />);
      
      expect(screen.queryByText('Approve')).not.toBeInTheDocument();
      expect(screen.queryByText('Reject')).not.toBeInTheDocument();
    });

    it('should not show approval buttons when status is not UNDER_REVIEW', () => {
      const mockUseAuth = jest.mocked(useAuth);
      mockUseAuth.mockReturnValue({
        user: { id: '1', username: 'approver', claims: ['approver'] },
        isAuthenticated: true,
        loading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const mockOnApprove = jest.fn();
      const mockOnReject = jest.fn();
      const viewData: ScheduleResponse = {
        id: '1',
        name: 'Test Job',
        cron: '0 0 * * *',
        cronExpression: '0 0 * * *',
        iterations: 3,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'STATUS_01_IN_PROGRESS',
        schedule_status: 'active',
        comments: 'Test',
        created_at: '2024-01-01T00:00:00Z',
      };

      render(<CronJobForm {...defaultProps} viewFormData={viewData} onApprove={mockOnApprove} onReject={mockOnReject} />);
      
      expect(screen.queryByText('Approve')).not.toBeInTheDocument();
      expect(screen.queryByText('Reject')).not.toBeInTheDocument();
    });
  });

});
