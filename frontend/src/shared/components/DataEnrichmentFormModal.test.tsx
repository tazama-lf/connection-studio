import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import { DataEnrichmentFormModal } from '../../features/data-enrichment/components/DataEnrichmentFormModal';

// Mock the dataEnrichmentApi
jest.mock('../../features/data-enrichment/services', () => ({
  dataEnrichmentApi: {
    getAllSchedules: jest.fn(),
    createSchedule: jest.fn(),
    testConnection: jest.fn(),
    previewData: jest.fn(),
    createPullJob: jest.fn(),
    createPushJob: jest.fn(),
  },
}));

// Mock the Button component
jest.mock('./Button', () => ({
  Button: ({ children, onClick, disabled, variant, icon, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`button-${variant}`}
      {...props}
    >
      {icon && <span data-testid="button-icon">{icon}</span>}
      {children}
    </button>
  ),
}));

import { dataEnrichmentJobApi } from '../../features/data-enrichment/handlers';

const mockDataEnrichmentApi = dataEnrichmentApi as jest.Mocked<
  typeof dataEnrichmentApi
>;

describe('DataEnrichmentFormModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSave: jest.fn(),
  };

  const mockSchedules = [
    { id: 1, name: 'Daily Schedule', cron: '0 9 * * *', iterations: 1 },
    { id: 2, name: 'Hourly Schedule', cron: '0 * * * *', iterations: 5 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockDataEnrichmentApi.getAllSchedules.mockResolvedValue(mockSchedules);
  });

  describe('Modal Rendering', () => {
    it('renders modal when isOpen is true', () => {
      render(<DataEnrichmentFormModal {...defaultProps} />);
      expect(
        screen.getByText('Define New Data Enrichment Endpoint'),
      ).toBeInTheDocument();
    });

    it('does not render modal when isOpen is false', () => {
      render(<DataEnrichmentFormModal {...defaultProps} isOpen={false} />);
      expect(
        screen.queryByText('Define New Data Enrichment Endpoint'),
      ).not.toBeInTheDocument();
    });

    it('loads schedules on mount when modal is open', async () => {
      render(<DataEnrichmentFormModal {...defaultProps} />);
      await waitFor(() => {
        expect(mockDataEnrichmentApi.getAllSchedules).toHaveBeenCalled();
      });
    });
  });

  describe('Configuration Type Selection', () => {
    it('defaults to pull configuration', () => {
      render(<DataEnrichmentFormModal {...defaultProps} />);
      expect(screen.getByDisplayValue('pull')).toBeChecked();
      expect(screen.getByText('Pull (SFTP/HTTP)')).toBeInTheDocument();
    });

    it('switches to push configuration when selected', () => {
      render(<DataEnrichmentFormModal {...defaultProps} />);
      const pushRadio = screen.getByDisplayValue('push');
      fireEvent.click(pushRadio);
      expect(pushRadio).toBeChecked();
      expect(screen.getByText('Push (REST API)')).toBeInTheDocument();
    });
  });

  describe('Pull Configuration Form', () => {
    it('renders pull configuration form by default', () => {
      render(<DataEnrichmentFormModal {...defaultProps} />);
      expect(screen.getByLabelText(/Endpoint Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Source Type/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    });

    it('shows SFTP fields when SFTP source type is selected', () => {
      render(<DataEnrichmentFormModal {...defaultProps} />);
      const sftpOption = screen.getByDisplayValue('sftp');
      fireEvent.change(sftpOption, { target: { value: 'sftp' } });
      expect(screen.getByLabelText(/Host/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Username/)).toBeInTheDocument();
    });

    it('shows HTTP fields when HTTP source type is selected', () => {
      render(<DataEnrichmentFormModal {...defaultProps} />);
      const httpOption = screen.getByDisplayValue('http');
      fireEvent.change(httpOption, { target: { value: 'http' } });
      expect(screen.getByLabelText(/URL/)).toBeInTheDocument();
      expect(screen.getByLabelText(/HTTP Method/)).toBeInTheDocument();
    });

    it('shows file settings for SFTP configuration', () => {
      render(<DataEnrichmentFormModal {...defaultProps} />);
      const sftpOption = screen.getByDisplayValue('sftp');
      fireEvent.change(sftpOption, { target: { value: 'sftp' } });
      expect(screen.getByLabelText(/Path\/Pattern/)).toBeInTheDocument();
      expect(screen.getByLabelText(/File Format/)).toBeInTheDocument();
    });
  });

  describe('Push Configuration Form', () => {
    it('renders push configuration form when push is selected', () => {
      render(<DataEnrichmentFormModal {...defaultProps} />);
      const pushRadio = screen.getByDisplayValue('push');
      fireEvent.click(pushRadio);
      expect(screen.getByLabelText(/API Path Pattern/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Target Collection/)).toBeInTheDocument();
    });
  });

  describe('Schedule Management', () => {
    it('loads and displays available schedules', async () => {
      render(<DataEnrichmentFormModal {...defaultProps} />);
      await waitFor(() => {
        expect(
          screen.getByText('Daily Schedule - 0 9 * * * (1 iterations)'),
        ).toBeInTheDocument();
      });
    });

    it('shows create schedule form when no schedules exist', async () => {
      mockDataEnrichmentApi.getAllSchedules.mockResolvedValue([]);
      render(<DataEnrichmentFormModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Create a new schedule')).toBeInTheDocument();
      });
    });

    it('creates a new schedule successfully', async () => {
      mockDataEnrichmentApi.getAllSchedules.mockResolvedValue([]);
      mockDataEnrichmentApi.createSchedule.mockResolvedValue({
        id: 3,
        name: 'New Schedule',
        cron: '0 10 * * *',
        iterations: 1,
      });
      mockDataEnrichmentApi.getAllSchedules.mockResolvedValue([
        { id: 3, name: 'New Schedule', cron: '0 10 * * *', iterations: 1 },
      ]);

      render(<DataEnrichmentFormModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Create a new schedule')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Create a new schedule'));
      fireEvent.change(screen.getByLabelText(/Schedule Name/), {
        target: { value: 'New Schedule' },
      });
      fireEvent.change(screen.getByLabelText(/Cron Expression/), {
        target: { value: '0 10 * * *' },
      });
      fireEvent.change(screen.getByLabelText(/Iterations/), {
        target: { value: '1' },
      });

      fireEvent.click(screen.getByText('Create Schedule'));
      await waitFor(() => {
        expect(mockDataEnrichmentApi.createSchedule).toHaveBeenCalledWith({
          name: 'New Schedule',
          cron: '0 10 * * *',
          iterations: 1,
        });
      });
    });
  });

  describe('Form Validation', () => {
    it('validates required fields for pull configuration', () => {
      render(<DataEnrichmentFormModal {...defaultProps} />);
      const testRunButton = screen.getByText('Test Run');
      expect(testRunButton).toBeDisabled();
    });

    it('enables test run when required fields are filled for SFTP', () => {
      render(<DataEnrichmentFormModal {...defaultProps} />);
      fireEvent.change(screen.getByLabelText(/Endpoint Name/), {
        target: { value: 'Test Endpoint' },
      });
      fireEvent.change(screen.getByLabelText(/Description/), {
        target: { value: 'Test Description' },
      });
      fireEvent.change(screen.getByDisplayValue('sftp'), {
        target: { value: 'sftp' },
      });
      fireEvent.change(screen.getByLabelText(/Host/), {
        target: { value: 'localhost' },
      });
      fireEvent.change(screen.getByLabelText(/Username/), {
        target: { value: 'user' },
      });
      fireEvent.change(screen.getByLabelText(/Password/), {
        target: { value: 'password' },
      });
      fireEvent.change(screen.getByLabelText(/Path\/Pattern/), {
        target: { value: '/data/*.csv' },
      });
      fireEvent.change(screen.getByLabelText(/Table/), {
        target: { value: 'test_table' },
      });

      const scheduleSelect = screen.getByDisplayValue('');
      fireEvent.change(scheduleSelect, { target: { value: '1' } });

      const testRunButton = screen.getByText('Test Run');
      expect(testRunButton).not.toBeDisabled();
    });

    it('validates file format matches file extension', () => {
      render(<DataEnrichmentFormModal {...defaultProps} />);
      fireEvent.change(screen.getByDisplayValue('sftp'), {
        target: { value: 'sftp' },
      });
      fireEvent.change(screen.getByLabelText(/Path\/Pattern/), {
        target: { value: '/data/test.json' },
      });
      fireEvent.change(screen.getByDisplayValue('csv'), {
        target: { value: 'csv' },
      });

      expect(screen.getByText(/File format mismatch/)).toBeInTheDocument();
    });
  });

  describe('Connection Testing', () => {
    beforeEach(() => {
      mockDataEnrichmentApi.testConnection.mockResolvedValue({});
      mockDataEnrichmentApi.previewData.mockResolvedValue({
        totalRows: 10,
        validRows: 8,
        invalidRows: 2,
        previewRows: [{ id: 1, name: 'Test' }],
        validationErrors: [],
      });
    });

    it('performs connection test for SFTP configuration', async () => {
      render(<DataEnrichmentFormModal {...defaultProps} />);

      // Fill required fields
      fireEvent.change(screen.getByLabelText(/Endpoint Name/), {
        target: { value: 'Test Endpoint' },
      });
      fireEvent.change(screen.getByLabelText(/Description/), {
        target: { value: 'Test Description' },
      });
      fireEvent.change(screen.getByDisplayValue('sftp'), {
        target: { value: 'sftp' },
      });
      fireEvent.change(screen.getByLabelText(/Host/), {
        target: { value: 'localhost' },
      });
      fireEvent.change(screen.getByLabelText(/Username/), {
        target: { value: 'user' },
      });
      fireEvent.change(screen.getByLabelText(/Password/), {
        target: { value: 'password' },
      });
      fireEvent.change(screen.getByLabelText(/Path\/Pattern/), {
        target: { value: '/data/*.csv' },
      });
      fireEvent.change(screen.getByLabelText(/Table/), {
        target: { value: 'test_table' },
      });

      const scheduleSelect = screen.getByDisplayValue('');
      fireEvent.change(scheduleSelect, { target: { value: '1' } });

      fireEvent.click(screen.getByText('Test Run'));
      await waitFor(() => {
        expect(mockDataEnrichmentApi.testConnection).toHaveBeenCalled();
      });
    });

    it('moves to summary step after successful test', async () => {
      render(<DataEnrichmentFormModal {...defaultProps} />);

      // Fill required fields
      fireEvent.change(screen.getByLabelText(/Endpoint Name/), {
        target: { value: 'Test Endpoint' },
      });
      fireEvent.change(screen.getByLabelText(/Description/), {
        target: { value: 'Test Description' },
      });
      fireEvent.change(screen.getByDisplayValue('sftp'), {
        target: { value: 'sftp' },
      });
      fireEvent.change(screen.getByLabelText(/Host/), {
        target: { value: 'localhost' },
      });
      fireEvent.change(screen.getByLabelText(/Username/), {
        target: { value: 'user' },
      });
      fireEvent.change(screen.getByLabelText(/Password/), {
        target: { value: 'password' },
      });
      fireEvent.change(screen.getByLabelText(/Path\/Pattern/), {
        target: { value: '/data/*.csv' },
      });
      fireEvent.change(screen.getByLabelText(/Table/), {
        target: { value: 'test_table' },
      });

      const scheduleSelect = screen.getByDisplayValue('');
      fireEvent.change(scheduleSelect, { target: { value: '1' } });

      fireEvent.click(screen.getByText('Test Run'));
      await waitFor(() => {
        expect(
          screen.getByText('Ready to Create Endpoint'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Endpoint Creation', () => {
    beforeEach(() => {
      mockDataEnrichmentApi.createPullJob.mockResolvedValue({
        id: 1,
        name: 'Test Endpoint',
        status: 'created',
      });
    });

    it('creates pull job endpoint successfully', async () => {
      render(<DataEnrichmentFormModal {...defaultProps} />);

      // Fill required fields and move to summary
      fireEvent.change(screen.getByLabelText(/Endpoint Name/), {
        target: { value: 'Test Endpoint' },
      });
      fireEvent.change(screen.getByLabelText(/Description/), {
        target: { value: 'Test Description' },
      });
      fireEvent.change(screen.getByDisplayValue('sftp'), {
        target: { value: 'sftp' },
      });
      fireEvent.change(screen.getByLabelText(/Host/), {
        target: { value: 'localhost' },
      });
      fireEvent.change(screen.getByLabelText(/Username/), {
        target: { value: 'user' },
      });
      fireEvent.change(screen.getByLabelText(/Password/), {
        target: { value: 'password' },
      });
      fireEvent.change(screen.getByLabelText(/Path\/Pattern/), {
        target: { value: '/data/*.csv' },
      });
      fireEvent.change(screen.getByLabelText(/Table/), {
        target: { value: 'test_table' },
      });

      const scheduleSelect = screen.getByDisplayValue('');
      fireEvent.change(scheduleSelect, { target: { value: '1' } });

      // Mock successful test to move to summary
      mockDataEnrichmentApi.testConnection.mockResolvedValue({});
      mockDataEnrichmentApi.previewData.mockResolvedValue({
        totalRows: 10,
        validRows: 8,
        invalidRows: 2,
        previewRows: [],
        validationErrors: [],
      });

      fireEvent.click(screen.getByText('Test Run'));
      await waitFor(() => {
        expect(
          screen.getByText('Ready to Create Endpoint'),
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Create Endpoint'));
      await waitFor(() => {
        expect(mockDataEnrichmentApi.createPullJob).toHaveBeenCalled();
        expect(defaultProps.onSave).toHaveBeenCalled();
      });
    });

    it('creates push job endpoint successfully', async () => {
      mockDataEnrichmentApi.createPushJob.mockResolvedValue({
        id: 2,
        name: 'Push Endpoint',
        status: 'created',
      });

      render(<DataEnrichmentFormModal {...defaultProps} />);

      // Switch to push configuration
      const pushRadio = screen.getByDisplayValue('push');
      fireEvent.click(pushRadio);

      // Fill push configuration fields
      fireEvent.change(screen.getByLabelText(/Endpoint Name/), {
        target: { value: 'Push Endpoint' },
      });
      fireEvent.change(screen.getByLabelText(/Description/), {
        target: { value: 'Push Description' },
      });
      fireEvent.change(screen.getByLabelText(/API Path Pattern/), {
        target: { value: 'customers/data' },
      });
      fireEvent.change(screen.getByLabelText(/Target Collection/), {
        target: { value: 'customers' },
      });

      // Mock successful test
      mockDataEnrichmentApi.testConnection.mockResolvedValue({});
      mockDataEnrichmentApi.previewData.mockResolvedValue({
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        previewRows: [],
        validationErrors: [],
        connectionSuccess: true,
      });

      fireEvent.click(screen.getByText('Test Run'));
      await waitFor(() => {
        expect(
          screen.getByText('Ready to Create Endpoint'),
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Create Endpoint'));
      await waitFor(() => {
        expect(mockDataEnrichmentApi.createPushJob).toHaveBeenCalled();
        expect(defaultProps.onSave).toHaveBeenCalled();
      });
    });

    it('handles creation errors', async () => {
      mockDataEnrichmentApi.createPullJob.mockRejectedValue(
        new Error('Creation failed'),
      );

      render(<DataEnrichmentFormModal {...defaultProps} />);

      // Fill required fields and move to summary
      fireEvent.change(screen.getByLabelText(/Endpoint Name/), {
        target: { value: 'Test Endpoint' },
      });
      fireEvent.change(screen.getByLabelText(/Description/), {
        target: { value: 'Test Description' },
      });
      fireEvent.change(screen.getByDisplayValue('sftp'), {
        target: { value: 'sftp' },
      });
      fireEvent.change(screen.getByLabelText(/Host/), {
        target: { value: 'localhost' },
      });
      fireEvent.change(screen.getByLabelText(/Username/), {
        target: { value: 'user' },
      });
      fireEvent.change(screen.getByLabelText(/Password/), {
        target: { value: 'password' },
      });
      fireEvent.change(screen.getByLabelText(/Path\/Pattern/), {
        target: { value: '/data/*.csv' },
      });
      fireEvent.change(screen.getByLabelText(/Table/), {
        target: { value: 'test_table' },
      });

      const scheduleSelect = screen.getByDisplayValue('');
      fireEvent.change(scheduleSelect, { target: { value: '1' } });

      // Mock successful test
      mockDataEnrichmentApi.testConnection.mockResolvedValue({});
      mockDataEnrichmentApi.previewData.mockResolvedValue({
        totalRows: 10,
        validRows: 8,
        invalidRows: 2,
        previewRows: [],
        validationErrors: [],
      });

      fireEvent.click(screen.getByText('Test Run'));
      await waitFor(() => {
        expect(
          screen.getByText('Ready to Create Endpoint'),
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Create Endpoint'));
      await waitFor(() => {
        expect(
          screen.getByText('Failed to create endpoint: Creation failed'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Modal Actions', () => {
    it('calls onClose when cancel button is clicked', () => {
      render(<DataEnrichmentFormModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Cancel'));
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('calls onClose when close button is clicked', () => {
      render(<DataEnrichmentFormModal {...defaultProps} />);
      const closeButton = screen.getByLabelText('Close');
      fireEvent.click(closeButton);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('calls onClose when backdrop is clicked', () => {
      render(<DataEnrichmentFormModal {...defaultProps} />);
      const backdrop = screen.getByTestId('backdrop');
      fireEvent.click(backdrop);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Form Field Interactions', () => {
    it('clears SFTP fields when switching to http', () => {
      render(<DataEnrichmentFormModal {...defaultProps} />);

      // Fill SFTP fields
      fireEvent.change(screen.getByDisplayValue('sftp'), {
        target: { value: 'sftp' },
      });
      fireEvent.change(screen.getByLabelText(/Username/), {
        target: { value: 'user' },
      });
      fireEvent.change(screen.getByLabelText(/Password/), {
        target: { value: 'password' },
      });
      fireEvent.change(screen.getByLabelText(/Path\/Pattern/), {
        target: { value: '/data/*.csv' },
      });

      // Switch to http
      fireEvent.change(screen.getByDisplayValue('sftp'), {
        target: { value: 'http' },
      });

      // Check that SFTP fields are cleared
      expect(screen.getByLabelText(/Username/)).toHaveValue('');
      expect(screen.getByLabelText(/Password/)).toHaveValue('');
      expect(screen.queryByLabelText(/Path\/Pattern/)).not.toBeInTheDocument();
    });

    it('shows password field for password auth type', () => {
      render(<DataEnrichmentFormModal {...defaultProps} />);
      fireEvent.change(screen.getByDisplayValue('sftp'), {
        target: { value: 'sftp' },
      });

      const authTypeSelect = screen.getByLabelText(/Authentication Type/);
      fireEvent.change(authTypeSelect, { target: { value: 'password' } });

      expect(screen.getByLabelText(/Password/)).toBeInTheDocument();
    });

    it('shows private key field for key auth type', () => {
      render(<DataEnrichmentFormModal {...defaultProps} />);
      fireEvent.change(screen.getByDisplayValue('sftp'), {
        target: { value: 'sftp' },
      });

      const authTypeSelect = screen.getByLabelText(/Authentication Type/);
      fireEvent.change(authTypeSelect, { target: { value: 'key' } });

      expect(
        screen.getByPlaceholderText(/Enter private key/),
      ).toBeInTheDocument();
    });

    it('shows delimiter field for CSV format', () => {
      render(<DataEnrichmentFormModal {...defaultProps} />);
      fireEvent.change(screen.getByDisplayValue('sftp'), {
        target: { value: 'sftp' },
      });

      const fileFormatSelect = screen.getByLabelText(/File Format/);
      fireEvent.change(fileFormatSelect, { target: { value: 'csv' } });

      expect(screen.getByLabelText(/Delimiter/)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles schedule loading errors gracefully', async () => {
      mockDataEnrichmentApi.getAllSchedules.mockRejectedValue(
        new Error('Failed to load schedules'),
      );

      render(<DataEnrichmentFormModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Select a schedule')).toBeInTheDocument();
      });

      // Should still show the form even if schedules fail to load
      expect(screen.getByLabelText(/Endpoint Name/)).toBeInTheDocument();
    });

    it('shows connection test errors', async () => {
      mockDataEnrichmentApi.testConnection.mockRejectedValue(
        new Error('Connection failed'),
      );

      render(<DataEnrichmentFormModal {...defaultProps} />);

      // Fill required fields
      fireEvent.change(screen.getByLabelText(/Endpoint Name/), {
        target: { value: 'Test Endpoint' },
      });
      fireEvent.change(screen.getByLabelText(/Description/), {
        target: { value: 'Test Description' },
      });
      fireEvent.change(screen.getByDisplayValue('sftp'), {
        target: { value: 'sftp' },
      });
      fireEvent.change(screen.getByLabelText(/Host/), {
        target: { value: 'invalid-host' },
      });
      fireEvent.change(screen.getByLabelText(/Username/), {
        target: { value: 'user' },
      });
      fireEvent.change(screen.getByLabelText(/Password/), {
        target: { value: 'password' },
      });
      fireEvent.change(screen.getByLabelText(/Path\/Pattern/), {
        target: { value: '/data/*.csv' },
      });
      fireEvent.change(screen.getByLabelText(/Table/), {
        target: { value: 'test_table' },
      });

      const scheduleSelect = screen.getByDisplayValue('');
      fireEvent.change(scheduleSelect, { target: { value: '1' } });

      fireEvent.click(screen.getByText('Test Run'));
      await waitFor(() => {
        expect(
          screen.getByText(
            'Connection test failed. Please check your configuration.',
          ),
        ).toBeInTheDocument();
      });
    });
  });
});
