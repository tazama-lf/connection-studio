import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MappingUtility } from '../../../shared/components/MappingUtility';
import { configApi } from '../../../features/config/services/configApi';
import { dataModelApi } from '../../../features/data-model';

// Mock the APIs
jest.mock('../../../features/config/services/configApi', () => ({
  configApi: {
    getConfig: jest.fn(),
    addMapping: jest.fn(),
    removeMapping: jest.fn(),
  },
}));

jest.mock('../../../features/data-model', () => ({
  dataModelApi: {
    getDestinationOptions: jest.fn(),
  },
}));

const mockConfigApi = configApi as jest.Mocked<typeof configApi>;
const mockDataModelApi = dataModelApi as jest.Mocked<typeof dataModelApi>;

describe('MappingUtility', () => {
  const mockOnMappingChange = jest.fn();
  const mockOnCurrentMappingsChange = jest.fn();

  const mockSourceSchema = {
    properties: {
      amount: { type: 'number' },
      customer: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        }
      }
    }
  };

  const mockDestinationOptions = [
    {
      collection: 'payer',
      field: 'accountId',
      value: 'payer.accountId',
      type: 'STRING' as const,
      label: 'Account ID',
      required: false
    },
    {
      collection: 'payee',
      field: 'accountId',
      value: 'payee.accountId',
      type: 'STRING' as const,
      label: 'Account ID',
      required: false
    }
  ];

  const mockExistingMappings = [
    {
      source: 'amount',
      destination: 'transaction.amount',
      transformation: 'NONE'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockDataModelApi.getDestinationOptions.mockResolvedValue({
      success: true,
      data: mockDestinationOptions
    });

    mockConfigApi.getConfig.mockResolvedValue({
      success: true,
      message: 'Configuration retrieved',
      config: {
        id: 123,
        msgFam: 'ISO20022',
        transactionType: 'payment',
        endpointPath: '/api/payment',
        version: '1.0',
        contentType: 'application/json',
        schema: { properties: {} },
        mapping: mockExistingMappings,
        status: 'active',
        tenantId: 'test-tenant',
        createdBy: 'test-user',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z'
      }
    });
  });

  describe('Component Rendering', () => {
    it('should render the component with basic structure', () => {
      render(
        <MappingUtility
          onMappingChange={mockOnMappingChange}
          sourceSchema={mockSourceSchema}
          configId={123}
        />
      );

      expect(screen.getByText('Field Mapping')).toBeInTheDocument();
      expect(screen.getByText('Add Mapping')).toBeInTheDocument();
    });

    it('should render with existing mappings', () => {
      render(
        <MappingUtility
          onMappingChange={mockOnMappingChange}
          sourceSchema={mockSourceSchema}
          configId={123}
          existingMappings={mockExistingMappings}
        />
      );

      expect(screen.getByText('Current Mappings (1)')).toBeInTheDocument();
    });

    it('should render in read-only mode', () => {
      render(
        <MappingUtility
          onMappingChange={mockOnMappingChange}
          sourceSchema={mockSourceSchema}
          readOnly={true}
        />
      );

      const addButton = screen.getByText('Add Mapping');
      expect(addButton).toBeDisabled();
    });
  });

  describe('Destination Options Loading', () => {
    it('should load destination options on mount', async () => {
      render(
        <MappingUtility
          onMappingChange={mockOnMappingChange}
          sourceSchema={mockSourceSchema}
        />
      );

      await waitFor(() => {
        expect(mockDataModelApi.getDestinationOptions).toHaveBeenCalled();
      });
    });

    it('should handle destination options loading error', async () => {
      mockDataModelApi.getDestinationOptions.mockRejectedValue(new Error('API Error'));

      render(
        <MappingUtility
          onMappingChange={mockOnMappingChange}
          sourceSchema={mockSourceSchema}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load destination fields. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Source Schema Processing', () => {
    it('should process JSON schema object correctly', () => {
      render(
        <MappingUtility
          onMappingChange={mockOnMappingChange}
          sourceSchema={mockSourceSchema}
        />
      );

      expect(screen.getByText('Field Mapping')).toBeInTheDocument();
    });

    it('should handle array format source schema', () => {
      const arraySchema = [
        { name: 'amount', path: 'amount', type: 'number', isRequired: false },
        { name: 'customerId', path: 'customer.id', type: 'string', isRequired: true }
      ];

      render(
        <MappingUtility
          onMappingChange={mockOnMappingChange}
          sourceSchema={arraySchema}
        />
      );

      expect(screen.getByText('Field Mapping')).toBeInTheDocument();
    });

    it('should handle empty source schema', () => {
      render(
        <MappingUtility
          onMappingChange={mockOnMappingChange}
          sourceSchema={null}
        />
      );

      expect(screen.getByText('No fields generated yet - Click "Generate Fields" first')).toBeInTheDocument();
    });
  });

  describe('Mapping Management', () => {
    it('should open add mapping modal when Add Mapping button is clicked', async () => {
      render(
        <MappingUtility
          onMappingChange={mockOnMappingChange}
          sourceSchema={mockSourceSchema}
          configId={123}
        />
      );

      const addButton = screen.getByText('Add Mapping');
      fireEvent.click(addButton);

      expect(screen.getByText('Add New Mapping')).toBeInTheDocument();
    });

    it('should validate mapping requirements for different transformations', async () => {
      mockConfigApi.addMapping.mockResolvedValue({
        success: true,
        message: 'Mapping added successfully'
      });

      render(
        <MappingUtility
          onMappingChange={mockOnMappingChange}
          sourceSchema={mockSourceSchema}
          configId={123}
          onCurrentMappingsChange={mockOnCurrentMappingsChange}
        />
      );

      // Open modal
      const addButton = screen.getByText('Add Mapping');
      fireEvent.click(addButton);

      // Select transformation type
      const transformationSelect = screen.getByRole('combobox');
      fireEvent.change(transformationSelect, { target: { value: 'concatenate' } });

      // Add Mapping button should be disabled without proper selections
      const saveButton = screen.getByText('Add Mapping');
      expect(saveButton).toBeDisabled();
    });

    it('should add a direct mapping successfully', async () => {
      mockConfigApi.addMapping.mockResolvedValue({
        success: true,
        message: 'Mapping added successfully'
      });

      render(
        <MappingUtility
          onMappingChange={mockOnMappingChange}
          sourceSchema={mockSourceSchema}
          configId={123}
          onCurrentMappingsChange={mockOnCurrentMappingsChange}
        />
      );

      // Open modal
      const addButton = screen.getByText('Add Mapping');
      fireEvent.click(addButton);

      // Select source field (simulate clicking on amount field)
      const sourceFields = screen.getAllByText('amount');
      fireEvent.click(sourceFields[0]);

      // Select destination field
      const destinationField = screen.getByText('accountId');
      fireEvent.click(destinationField);

      // Save mapping
      const saveButton = screen.getByText('Add Mapping');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(mockConfigApi.addMapping).toHaveBeenCalledWith(123, expect.objectContaining({
        source: 'amount',
        destination: 'payer.accountId'
      }));
    });

    it('should handle API errors when adding mapping', async () => {
      mockConfigApi.addMapping.mockResolvedValue({
        success: false,
        message: 'Failed to add mapping'
      });

      render(
        <MappingUtility
          onMappingChange={mockOnMappingChange}
          sourceSchema={mockSourceSchema}
          configId={123}
        />
      );

      // Open modal
      const addButton = screen.getByText('Add Mapping');
      fireEvent.click(addButton);

      // Select fields and try to save
      const sourceFields = screen.getAllByText('amount');
      fireEvent.click(sourceFields[0]);

      const destinationField = screen.getByText('accountId');
      fireEvent.click(destinationField);

      const saveButton = screen.getByText('Add Mapping');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(screen.getByText('Failed to save mapping: Failed to add mapping')).toBeInTheDocument();
    });

    it('should prevent duplicate mappings', async () => {
      render(
        <MappingUtility
          onMappingChange={mockOnMappingChange}
          sourceSchema={mockSourceSchema}
          configId={123}
          existingMappings={mockExistingMappings}
        />
      );

      // Open modal
      const addButton = screen.getByText('Add Mapping');
      fireEvent.click(addButton);

      // Try to create the same mapping
      const sourceFields = screen.getAllByText('amount');
      fireEvent.click(sourceFields[0]);

      const destinationField = screen.getByText('accountId');
      fireEvent.click(destinationField);

      const saveButton = screen.getByText('Add Mapping');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(screen.getByText('This mapping already exists. Please create a different mapping.')).toBeInTheDocument();
    });

    it('should remove mapping successfully', async () => {
      mockConfigApi.removeMapping.mockResolvedValue({
        success: true,
        message: 'Mapping removed successfully'
      });

      render(
        <MappingUtility
          onMappingChange={mockOnMappingChange}
          sourceSchema={mockSourceSchema}
          configId={123}
          existingMappings={mockExistingMappings}
          onCurrentMappingsChange={mockOnCurrentMappingsChange}
        />
      );

      const removeButton = screen.getByText('Remove');
      await act(async () => {
        fireEvent.click(removeButton);
      });

      expect(mockConfigApi.removeMapping).toHaveBeenCalledWith(123, 0);
      expect(mockOnCurrentMappingsChange).toHaveBeenCalledWith([]);
    });
  });

  describe('Transformation Types', () => {
    it('should handle constant value mapping', async () => {
      mockConfigApi.addMapping.mockResolvedValue({
        success: true,
        message: 'Mapping added successfully'
      });

      render(
        <MappingUtility
          onMappingChange={mockOnMappingChange}
          sourceSchema={mockSourceSchema}
          configId={123}
        />
      );

      // Open modal
      const addButton = screen.getByText('Add Mapping');
      fireEvent.click(addButton);

      // Select constant transformation
      const transformationSelect = screen.getByRole('combobox');
      fireEvent.change(transformationSelect, { target: { value: 'constant' } });

      // Enter constant value
      const constantInput = screen.getByPlaceholderText('Enter a constant value (string, number, etc.)');
      fireEvent.change(constantInput, { target: { value: 'test-value' } });

      // Select destination
      const destinationField = screen.getByText('accountId');
      fireEvent.click(destinationField);

      // Save
      const saveButton = screen.getByText('Add Mapping');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(mockConfigApi.addMapping).toHaveBeenCalledWith(123, expect.objectContaining({
        constantValue: 'test-value',
        destination: 'payer.accountId'
      }));
    });

    it('should handle concatenate transformation', async () => {
      mockConfigApi.addMapping.mockResolvedValue({
        success: true,
        message: 'Mapping added successfully'
      });

      render(
        <MappingUtility
          onMappingChange={mockOnMappingChange}
          sourceSchema={mockSourceSchema}
          configId={123}
        />
      );

      // Open modal
      const addButton = screen.getByText('Add Mapping');
      fireEvent.click(addButton);

      // Select concatenate transformation
      const transformationSelect = screen.getByRole('combobox');
      fireEvent.change(transformationSelect, { target: { value: 'concatenate' } });

      // Select multiple source fields
      const sourceFields = screen.getAllByText('amount');
      fireEvent.click(sourceFields[0]);

      // Select customer.id as well (need to expand customer first)
      const customerNode = screen.getByText('customer');
      fireEvent.click(customerNode); // This should expand

      // Select destination
      const destinationField = screen.getByText('accountId');
      fireEvent.click(destinationField);

      // Save
      const saveButton = screen.getByText('Add Mapping');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(mockConfigApi.addMapping).toHaveBeenCalledWith(123, expect.objectContaining({
        sources: ['amount'],
        destination: 'payer.accountId'
      }));
    });
  });

  describe('Validation', () => {
    it('should call onMappingChange with validation status', () => {
      render(
        <MappingUtility
          onMappingChange={mockOnMappingChange}
          sourceSchema={mockSourceSchema}
          existingMappings={mockExistingMappings}
        />
      );

      expect(mockOnMappingChange).toHaveBeenCalledWith(true);
    });

    it('should validate mappings correctly', () => {
      const invalidMappings = [
        { source: '', destination: 'test' }, // Invalid: empty source
        { source: 'test', destination: '' }, // Invalid: empty destination
      ];

      render(
        <MappingUtility
          onMappingChange={mockOnMappingChange}
          sourceSchema={mockSourceSchema}
          existingMappings={invalidMappings}
        />
      );

      expect(mockOnMappingChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Modal Controls', () => {
    it('should close modal when cancel is clicked', () => {
      render(
        <MappingUtility
          onMappingChange={mockOnMappingChange}
          sourceSchema={mockSourceSchema}
        />
      );

      // Open modal
      const addButton = screen.getByText('Add Mapping');
      fireEvent.click(addButton);

      expect(screen.getByText('Add New Mapping')).toBeInTheDocument();

      // Close modal
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(screen.queryByText('Add New Mapping')).not.toBeInTheDocument();
    });
  });
});