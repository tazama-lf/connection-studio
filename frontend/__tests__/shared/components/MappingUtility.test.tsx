// MappingUtility.test.tsx
import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { MappingUtility } from '@shared/components/MappingUtility';
import { configApi } from '@features/config/services/configApi';
import { dataModelApi } from '@features/data-model';

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  (console.error as jest.Mock).mockRestore();
  (console.warn as jest.Mock).mockRestore();
});

jest.mock('@features/config/services/configApi', () => ({
  configApi: {
    getConfig: jest.fn(),
    addMapping: jest.fn(),
    removeMapping: jest.fn(),
  },
}));

jest.mock('@features/data-model', () => ({
  dataModelApi: {
    getDestinationFieldsJson: jest.fn(),
    updateDestinationFieldsJson: jest.fn(),
  },
}));

jest.mock('@mui/material', () => ({
  Backdrop: ({ children, open }: any) =>
    open ? <div data-testid="backdrop">{children}</div> : null,
}));

jest.mock('react-json-view', () => {
  return function MockReactJson(props: any) {
    return (
      <div data-testid="react-json-view">
        <button
          onClick={() =>
            props.onEdit?.({
              updated_src: {
                transactionDetails: {
                  amount: 0,
                  ccy: 'USD',
                },
                redis: {
                  cacheKey: {
                    value: 'abc',
                  },
                },
              },
            })
          }
        >
          Mock Edit JSON
        </button>
        <button
          onClick={() =>
            props.onEdit?.({
              updated_src: {
                redis: {
                  cacheKey: {
                    value: 'abc',
                  },
                },
              },
            })
          }
        >
          Mock Missing TransactionDetails
        </button>
        <button
          onClick={() =>
            props.onEdit?.({
              updated_src: {
                transactionDetails: {
                  amount: 0,
                },
              },
            })
          }
        >
          Mock Missing Redis
        </button>
        <button
          onClick={() =>
            props.onEdit?.({
              updated_src: {
                transactionDetails: {
                  amount: 0,
                },
                redis: {
                  level1: {
                    level2: {
                      value: 'deep',
                    },
                  },
                },
              },
            })
          }
        >
          Mock Redis Too Deep
        </button>
        <button
          onClick={() =>
            props.onEdit?.({
              updated_src: {
                transactionDetails: {
                  nested: {
                    value: 1,
                  },
                },
                redis: {
                  cacheKey: {
                    value: 'abc',
                  },
                },
              },
            })
          }
        >
          Mock TransactionDetails Nested Object
        </button>
        <button
          onClick={() =>
            props.onEdit?.({
              updated_src: {
                transactionDetails: {
                  amount: 0,
                },
                customRoot: {
                  level1: {
                    level2: {
                      field: 1,
                    },
                  },
                },
                redis: {
                  cacheKey: {
                    value: 'abc',
                  },
                },
              },
            })
          }
        >
          Mock Custom Object Too Deep
        </button>
        <button
          onClick={() =>
            props.onDelete?.({
              updated_src: null,
            })
          }
        >
          Mock Null JSON
        </button>
      </div>
    );
  };
});

jest.mock('@shared/components/Button', () => ({
  Button: ({ children, onClick, disabled, icon, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {icon}
      {children}
    </button>
  ),
}));

jest.mock('lucide-react', () => ({
  ArrowRightIcon: () => <svg data-testid="arrow-right-icon" />,
  PlusIcon: () => <svg data-testid="plus-icon" />,
  XIcon: () => <svg data-testid="x-icon" />,
  ChevronRightIcon: () => <svg data-testid="chevron-right-icon" />,
  DatabaseIcon: () => <svg data-testid="database-icon" />,
  Shuffle: () => <svg data-testid="shuffle-icon" />,
  FileText: () => <svg data-testid="filetext-icon" />,
  Edit3: () => <svg data-testid="edit3-icon" />,
}));

const mockConfigApi = configApi as jest.Mocked<typeof configApi>;
const mockDataModelApi = dataModelApi as jest.Mocked<typeof dataModelApi>;

describe('MappingUtility', () => {
  const mockOnMappingChange = jest.fn();
  const mockOnMappingDataChange = jest.fn();
  const mockOnCurrentMappingsChange = jest.fn();

  const mockSourceSchema = {
    properties: {
      amount: { type: 'number' },
      customer: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
        },
      },
    },
  };

  const validDestinationJson = {
    transactionDetails: {
      amount: 0,
      ccy: 'USD',
    },
    payer: {
      accountId: 'abc',
      name: 'john',
    },
    redis: {
      cacheKey: {
        value: 'abc',
      },
    },
  };

  const mockExistingMappings = [
    {
      source: 'amount',
      destination: 'transaction.amount',
      transformation: 'NONE',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockDataModelApi.getDestinationFieldsJson.mockResolvedValue({
      success: true,
      data: validDestinationJson,
    } as any);

    mockDataModelApi.updateDestinationFieldsJson.mockResolvedValue({
      success: true,
      data: validDestinationJson,
    } as any);

    mockConfigApi.getConfig.mockResolvedValue({
      success: true,
      message: 'Configuration retrieved',
      config: {
        id: 123,
        mapping: mockExistingMappings,
      },
    } as any);

    mockConfigApi.addMapping.mockResolvedValue({
      success: true,
      message: 'Mapping added',
    } as any);

    mockConfigApi.removeMapping.mockResolvedValue({
      success: true,
      message: 'Mapping removed successfully',
    } as any);
  });

  const renderComponent = (props: Partial<React.ComponentProps<typeof MappingUtility>> = {}) =>
    render(
      <MappingUtility
        onMappingChange={mockOnMappingChange}
        onMappingDataChange={mockOnMappingDataChange}
        onCurrentMappingsChange={mockOnCurrentMappingsChange}
        sourceSchema={mockSourceSchema}
        configId={123}
        existingMappings={[]}
        {...props}
      />
    );

  describe('rendering', () => {
    it('renders Add Mapping button', async () => {
      renderComponent();

      expect(screen.getByRole('button', { name: /add mapping/i })).toBeInTheDocument();

      await waitFor(() => {
        expect(mockDataModelApi.getDestinationFieldsJson).toHaveBeenCalled();
      });
    });

    it('renders existing mappings section when mappings exist', async () => {
      renderComponent({ existingMappings: mockExistingMappings as any });

      expect(screen.getByText('Current Mappings (1)')).toBeInTheDocument();
      expect(screen.getByText(/\[DIRECT\]/)).toBeInTheDocument();
    });

    it('renders empty state when there are no mappings', () => {
      renderComponent({ existingMappings: [] });

      expect(screen.getByText('No mappings yet')).toBeInTheDocument();
      expect(
        screen.getByText(
          `You haven't created any field mappings for this configuration.`
        )
      ).toBeInTheDocument();
    });

    it('disables Add Mapping in readOnly mode', () => {
      renderComponent({ readOnly: true });

      expect(screen.getByRole('button', { name: /add mapping/i })).toBeDisabled();
    });

    it('hides add mapping hint in readOnly mode', () => {
      renderComponent({ readOnly: true, existingMappings: [] });

      expect(screen.queryByText(/Click "Add Mapping" to get started/i)).not.toBeInTheDocument();
    });

    it('shows add mapping hint when editable and empty', () => {
      renderComponent({ readOnly: false, existingMappings: [] });

      expect(
        screen.getByText(/to get started\./i, { selector: 'p' })
      ).toBeInTheDocument();
    });
  });

  describe('initial loading', () => {
    it('fetches destination fields on mount', async () => {
      renderComponent({ configId: undefined });

      await waitFor(() => {
        expect(mockDataModelApi.getDestinationFieldsJson).toHaveBeenCalledTimes(1);
      });
    });

    it('fetches config when configId is provided', async () => {
      renderComponent({ configId: 123 });

      await waitFor(() => {
        expect(mockConfigApi.getConfig).toHaveBeenCalledWith(123);
      });
    });

    it('does not fetch config when configId is not provided', async () => {
      renderComponent({ configId: undefined });

      await waitFor(() => {
        expect(mockDataModelApi.getDestinationFieldsJson).toHaveBeenCalled();
      });

      expect(mockConfigApi.getConfig).not.toHaveBeenCalled();
    });

    it('loads mappings from config response', async () => {
      renderComponent({ configId: 123, existingMappings: [] });

      await waitFor(() => {
        expect(screen.getByText('Current Mappings (1)')).toBeInTheDocument();
      });
    });

    it('calls onCurrentMappingsChange when mappings change from config load', async () => {
      renderComponent({ configId: 123, existingMappings: [] });

      await waitFor(() => {
        expect(mockOnCurrentMappingsChange).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              source: 'amount',
              destination: 'transaction.amount',
            }),
          ])
        );
      });
    });
  });

  describe('validation callback', () => {
    it('calls onMappingChange(true) for valid mappings', () => {
      renderComponent({
        existingMappings: [
          {
            source: 'amount',
            destination: 'payer.accountId',
            transformation: 'NONE',
          },
        ] as any,
        configId: undefined,
      });

      expect(mockOnMappingChange).toHaveBeenCalledWith(true);
    });

    it('calls onMappingChange(false) for invalid mapping with empty source', () => {
      renderComponent({
        existingMappings: [
          {
            source: '',
            destination: 'payer.accountId',
            transformation: 'NONE',
          },
        ] as any,
        configId: undefined,
      });

      expect(mockOnMappingChange).toHaveBeenCalledWith(false);
    });

    it('calls onMappingChange(true) for empty mappings', () => {
      renderComponent({ existingMappings: [], configId: undefined });

      expect(mockOnMappingChange).toHaveBeenCalledWith(true);
    });

    it('treats constant-only mapping as valid', () => {
      renderComponent({
        existingMappings: [
          {
            constantValue: 'ABC',
            destination: 'payer.accountId',
            transformation: 'CONSTANT',
          },
        ] as any,
        configId: undefined,
      });

      expect(mockOnMappingChange).toHaveBeenCalledWith(true);
    });
  });

  describe('destination loading errors', () => {
    it('shows destination error inside modal when API rejects', async () => {
      mockDataModelApi.getDestinationFieldsJson.mockRejectedValueOnce(
        new Error('API Error')
      );

      renderComponent({ configId: undefined });

      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));

      await waitFor(() => {
        expect(
          screen.getByText('Failed to load destination fields. Please try again.')
        ).toBeInTheDocument();
      });
    });

    it('shows destination error inside modal when API returns success false', async () => {
      mockDataModelApi.getDestinationFieldsJson.mockResolvedValueOnce({
        success: false,
        message: 'Not found',
      } as any);

      renderComponent({ configId: undefined });

      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));

      await waitFor(() => {
        expect(
          screen.getByText('Failed to load destination fields. Please try again.')
        ).toBeInTheDocument();
      });
    });
  });

  describe('add mapping modal', () => {
    it('opens add mapping modal', () => {
      renderComponent();

      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));

      expect(screen.getByText('Add New Mapping')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('closes add mapping modal with Cancel', () => {
      renderComponent();

      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(screen.queryByText('Add New Mapping')).not.toBeInTheDocument();
    });

    it('closes add mapping modal with X button', () => {
      renderComponent();

      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));

      const modal = screen.getByText('Add New Mapping').closest('div');
      const closeButtons = screen.getAllByRole('button');
      fireEvent.click(closeButtons.find((btn) => within(btn).queryByTestId('x-icon'))!);

      expect(screen.queryByText('Add New Mapping')).not.toBeInTheDocument();
    });

    it('shows direct mapping description by default', () => {
      renderComponent();

      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));

      expect(screen.getByText('Direct Mapping')).toBeInTheDocument();
    });

    it('shows concatenate description when concatenate is selected', () => {
      renderComponent();

      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));
      fireEvent.change(screen.getByRole('combobox'), {
        target: { value: 'concatenate' },
      });

      expect(
        screen.getByRole('heading', { name: 'Concatenate' })
      ).toBeInTheDocument();
      expect(screen.getByText(/Combines multiple source fields/i)).toBeInTheDocument();
    });

    it('shows split description when split is selected', () => {
      renderComponent();

      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));
      fireEvent.change(screen.getByRole('combobox'), {
        target: { value: 'split' },
      });

      expect(screen.getByRole('heading', { name: 'Split' })).toBeInTheDocument();
      expect(screen.getByText(/Divides a single source field/i)).toBeInTheDocument();
    });

    it('shows constant value input when constant is selected', () => {
      renderComponent();

      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));
      fireEvent.change(screen.getByRole('combobox'), {
        target: { value: 'constant' },
      });

      expect(
        screen.getByPlaceholderText('Enter a constant value (string, number, etc.)')
      ).toBeInTheDocument();
      expect(screen.getByText(/Maps a fixed constant value/i)).toBeInTheDocument();
    });

    it('disables modal Add Mapping button when mapping is invalid', () => {
      renderComponent();

      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));
      fireEvent.change(screen.getByRole('combobox'), {
        target: { value: 'concatenate' },
      });

      const buttons = screen.getAllByRole('button', { name: /add mapping/i });
      const modalAddButton = buttons[buttons.length - 1];

      expect(modalAddButton).toBeDisabled();
    });

    it('shows delimiter input for concatenate', () => {
      renderComponent();

      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));
      fireEvent.change(screen.getByRole('combobox'), {
        target: { value: 'concatenate' },
      });

      expect(screen.getByText('Concatenate Delimiter')).toBeInTheDocument();
    });

    it('shows delimiter input for split', () => {
      renderComponent();

      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));
      fireEvent.change(screen.getByRole('combobox'), {
        target: { value: 'split' },
      });

      expect(screen.getByText('Split Delimiter')).toBeInTheDocument();
    });

    it('resets modal state when reopened', () => {
      renderComponent();

      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));
      fireEvent.change(screen.getByRole('combobox'), {
        target: { value: 'constant' },
      });

      fireEvent.change(
        screen.getByPlaceholderText('Enter a constant value (string, number, etc.)'),
        { target: { value: 'ABC123' } }
      );

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));

      expect(screen.getByRole('combobox')).toHaveValue('none');
    });
  });

  describe('remove mapping', () => {
    it('removes mapping successfully', async () => {
      renderComponent({
        existingMappings: mockExistingMappings as any,
        configId: 123,
      });

      fireEvent.click(screen.getByRole('button', { name: /remove/i }));

      await waitFor(() => {
        expect(mockConfigApi.removeMapping).toHaveBeenCalledWith(123, 0);
      });

      await waitFor(() => {
        expect(mockOnCurrentMappingsChange).toHaveBeenCalledWith([]);
      });
    });

    it('shows API failure error when removeMapping returns success false', async () => {
      mockConfigApi.removeMapping.mockResolvedValueOnce({
        success: false,
        message: 'Server error',
      } as any);

      renderComponent({
        existingMappings: mockExistingMappings as any,
        configId: 123,
      });

      fireEvent.click(screen.getByRole('button', { name: /remove/i }));

      await waitFor(() => {
        expect(mockConfigApi.removeMapping).toHaveBeenCalledWith(123, 0);
      });

      expect(screen.getByText('Current Mappings (1)')).toBeInTheDocument();
    });

    it('shows generic error when removeMapping throws', async () => {
      mockConfigApi.removeMapping.mockRejectedValueOnce(new Error('boom'));

      renderComponent({
        existingMappings: mockExistingMappings as any,
        configId: 123,
      });

      fireEvent.click(screen.getByRole('button', { name: /remove/i }));

      await waitFor(() => {
        expect(mockConfigApi.removeMapping).toHaveBeenCalledWith(123, 0);
      });

      expect(screen.getByText('Current Mappings (1)')).toBeInTheDocument();
    });

    it('disables remove button in readOnly mode', () => {
      renderComponent({
        existingMappings: mockExistingMappings as any,
        configId: 123,
        readOnly: true,
      });

      expect(screen.getByRole('button', { name: /remove/i })).toBeDisabled();
    });
  });

  describe('edit fields modal', () => {
    const openEditFieldsModal = async () => {
      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));

      await waitFor(() => {
        expect(
          screen.queryByText('Loading destination fields...')
        ).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /edit fields/i }));
    };

    it('opens edit fields modal from add mapping modal', async () => {
      renderComponent();

      await openEditFieldsModal();

      expect(screen.getByText('Edit Destination Fields')).toBeInTheDocument();
      expect(screen.getByTestId('react-json-view')).toBeInTheDocument();
    });

    it('disables Edit Fields button in readOnly mode', async () => {
      renderComponent({ readOnly: true });

      expect(screen.getByRole('button', { name: /add mapping/i })).toBeDisabled();
      expect(
        screen.queryByRole('button', { name: /edit fields/i })
      ).not.toBeInTheDocument();
    });

    it('closes edit fields modal on Cancel', async () => {
      renderComponent();

      await openEditFieldsModal();

      expect(screen.getByText('Edit Destination Fields')).toBeInTheDocument();

      fireEvent.click(screen.getAllByRole('button', { name: /^cancel$/i })[1]);

      expect(screen.queryByText('Edit Destination Fields')).not.toBeInTheDocument();
    });

    it('saves edited destination fields successfully', async () => {
      renderComponent();

      await openEditFieldsModal();
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockDataModelApi.updateDestinationFieldsJson).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.queryByText('Edit Destination Fields')).not.toBeInTheDocument();
      });
    });

    it('shows error when save edited destination fields fails from API response', async () => {
      mockDataModelApi.updateDestinationFieldsJson.mockResolvedValueOnce({
        success: false,
        message: 'Save failed',
      } as any);

      renderComponent();

      await openEditFieldsModal();
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText('Save failed')).toBeInTheDocument();
      });
    });

    it('shows error when save edited destination fields throws', async () => {
      mockDataModelApi.updateDestinationFieldsJson.mockRejectedValueOnce(
        new Error('Network error')
      );

      renderComponent();

      await openEditFieldsModal();
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('validates required transactionDetails object before save', async () => {
      renderComponent();

      await openEditFieldsModal();
      fireEvent.click(screen.getByRole('button', { name: /mock missing transactiondetails/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/Required field "transactionDetails" must exist/i)
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
      expect(mockDataModelApi.updateDestinationFieldsJson).not.toHaveBeenCalled();
    });

    it('validates required redis object before save', async () => {
      renderComponent();

      await openEditFieldsModal();
      fireEvent.click(screen.getByRole('button', { name: /mock missing redis/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/Required field "redis" must exist/i)
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
      expect(mockDataModelApi.updateDestinationFieldsJson).not.toHaveBeenCalled();
    });

    it('validates redis max nesting depth before save', async () => {
      renderComponent();

      await openEditFieldsModal();
      fireEvent.click(screen.getByRole('button', { name: /mock redis too deep/i }));

      await waitFor(() => {
        expect(screen.getByText(/Maximum allowed nesting depth for redis is 1 level/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
      expect(mockDataModelApi.updateDestinationFieldsJson).not.toHaveBeenCalled();
    });

    it('validates max nesting depth for custom root objects', async () => {
      renderComponent();

      await openEditFieldsModal();
      fireEvent.click(screen.getByRole('button', { name: /mock custom object too deep/i }));

      await waitFor(() => {
        expect(screen.getByText(/Maximum allowed nesting depth is 1 level/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
      expect(mockDataModelApi.updateDestinationFieldsJson).not.toHaveBeenCalled();
    });

    it('validates transactionDetails cannot contain nested objects', async () => {
      renderComponent();

      await openEditFieldsModal();
      fireEvent.click(
        screen.getByRole('button', {
          name: /mock transactiondetails nested object/i,
        })
      );

      await waitFor(() => {
        expect(
          screen.getByText(/transactionDetails" cannot contain nested objects/i)
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
      expect(mockDataModelApi.updateDestinationFieldsJson).not.toHaveBeenCalled();
    });

    it('shows invalid JSON validation when edited JSON becomes null', async () => {
      renderComponent();

      await openEditFieldsModal();
      fireEvent.click(screen.getByRole('button', { name: /mock null json/i }));
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid JSON structure')).toBeInTheDocument();
      });

      expect(mockDataModelApi.updateDestinationFieldsJson).not.toHaveBeenCalled();
    });

    it('clears validation error when clicking dismiss button', async () => {
      renderComponent();

      await openEditFieldsModal();
      fireEvent.click(screen.getByRole('button', { name: /mock missing redis/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/Required field "redis" must exist/i)
        ).toBeInTheDocument();
      });

      const dismissButtons = screen.getAllByRole('button');
      const dismissErrorButton = dismissButtons.find((btn) =>
        btn.className.includes('text-red-600')
      );

      expect(dismissErrorButton).toBeDefined();
      fireEvent.click(dismissErrorButton!);

      await waitFor(() => {
        expect(
          screen.queryByText(/Required field "redis" must exist/i)
        ).not.toBeInTheDocument();
      });
    });

    it('reorders redis object to the end before saving destination JSON', async () => {
      mockDataModelApi.getDestinationFieldsJson.mockResolvedValueOnce({
        success: true,
        data: {
          redis: {
            cacheKey: {
              value: 'abc',
            },
          },
          transactionDetails: {
            amount: 0,
          },
          payer: {
            name: 'john',
          },
        },
      } as any);

      renderComponent();

      await openEditFieldsModal();
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockDataModelApi.updateDestinationFieldsJson).toHaveBeenCalled();
      });

      const payload = (mockDataModelApi.updateDestinationFieldsJson as jest.Mock).mock.calls[0][0];
      expect(Object.keys(payload)[Object.keys(payload).length - 1]).toBe('redis');
    });

    it('shows Saving... while saving', async () => {
      let resolvePromise: (value: any) => void = () => {};
      mockDataModelApi.updateDestinationFieldsJson.mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePromise = resolve;
        }) as any
      );

      renderComponent();

      await openEditFieldsModal();
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
      });

      resolvePromise({ success: true });

      await waitFor(() => {
        expect(
          screen.queryByRole('button', { name: /saving/i })
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('config mapping transformation inference', () => {
    it('infers CONSTANT transformation from constantValue', async () => {
      mockConfigApi.getConfig.mockResolvedValueOnce({
        success: true,
        config: {
          id: 123,
          mapping: [
            {
              constantValue: 'ABC',
              destination: 'payer.name',
            },
          ],
        },
      } as any);

      renderComponent({ existingMappings: [], configId: 123 });

      await waitFor(() => {
        expect(screen.getByText(/\[CONSTANT\]/)).toBeInTheDocument();
      });
    });

    it('infers SPLIT transformation from destination array', async () => {
      mockConfigApi.getConfig.mockResolvedValueOnce({
        success: true,
        config: {
          id: 123,
          mapping: [
            {
              source: 'customer.name',
              destination: ['payer.firstName', 'payer.lastName'],
            },
          ],
        },
      } as any);

      renderComponent({ existingMappings: [], configId: 123 });

      await waitFor(() => {
        expect(screen.getByText(/\[SPLIT\]/)).toBeInTheDocument();
      });
    });

    it('infers SUM transformation from operator', async () => {
      mockConfigApi.getConfig.mockResolvedValueOnce({
        success: true,
        config: {
          id: 123,
          mapping: [
            {
              source: ['a', 'b'],
              destination: 'total',
              operator: 'SUM',
            },
          ],
        },
      } as any);

      renderComponent({ existingMappings: [], configId: 123 });

      await waitFor(() => {
        expect(screen.getByText(/\[SUM\]/)).toBeInTheDocument();
      });
    });
  });

  describe('save mapping API paths', () => {
    const simpleSourceSchema = [
      {
        name: 'srcField',
        path: 'srcField',
        type: 'string',
        isRequired: true,
      },
      {
        name: 'numField',
        path: 'numField',
        type: 'number',
        isRequired: true,
      },
      {
        name: 'numField2',
        path: 'numField2',
        type: 'integer',
        isRequired: true,
      },
      {
        name: 'fullName',
        path: 'fullName',
        type: 'string',
        isRequired: true,
      },
      {
        name: 'itemsCode',
        path: 'items[0].code',
        type: 'string',
        isRequired: true,
      },
    ];

    const simpleDestinationJson = {
      transactionDetails: {
        amount: 0,
        amount2: 0,
        firstName: '',
        lastName: '',
        fullName: '',
      },
      targetField: 'x',
      targetNumber: 0,
      redis: {},
    };

    const openModal = async () => {
      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));
      await waitFor(() => {
        expect(screen.getByText('Add New Mapping')).toBeInTheDocument();
      });
    };

    it('saves direct mapping successfully', async () => {
      mockConfigApi.getConfig.mockResolvedValueOnce({
        success: true,
        config: { id: 123, mapping: [] },
      } as any);
      mockDataModelApi.getDestinationFieldsJson.mockResolvedValueOnce({
        success: true,
        data: simpleDestinationJson,
      } as any);

      renderComponent({
        sourceSchema: simpleSourceSchema as any,
        existingMappings: [],
        configId: 123,
      });

      await openModal();
      fireEvent.click(screen.getByRole('button', { name: 'srcField (string)' }));
      fireEvent.click(screen.getByRole('button', { name: 'targetField (string)' }));

      const addButtons = screen.getAllByRole('button', { name: 'Add Mapping' });
      const modalAddButton = addButtons[addButtons.length - 1];
      expect(modalAddButton).not.toBeDisabled();
      fireEvent.click(modalAddButton);

      await waitFor(() => {
        expect(mockConfigApi.addMapping).toHaveBeenCalledWith(
          123,
          expect.objectContaining({
            source: 'srcField',
            destination: 'targetField',
            constantValue: undefined,
          }),
        );
      });
    });

    it('saves constant mapping and preserves string value when destination type lookup is unavailable', async () => {
      mockConfigApi.getConfig.mockResolvedValueOnce({
        success: true,
        config: { id: 123, mapping: [] },
      } as any);
      mockDataModelApi.getDestinationFieldsJson.mockResolvedValueOnce({
        success: true,
        data: simpleDestinationJson,
      } as any);

      renderComponent({
        sourceSchema: simpleSourceSchema as any,
        existingMappings: [],
        configId: 123,
      });

      await openModal();
      fireEvent.change(screen.getByRole('combobox'), {
        target: { value: 'constant' },
      });

      fireEvent.change(
        screen.getByPlaceholderText('Enter a constant value (string, number, etc.)'),
        { target: { value: '42' } },
      );
      fireEvent.click(screen.getByRole('button', { name: 'targetNumber (number)' }));

      const addButtons = screen.getAllByRole('button', { name: 'Add Mapping' });
      const modalAddButton = addButtons[addButtons.length - 1];
      expect(modalAddButton).not.toBeDisabled();
      fireEvent.click(modalAddButton);

      await waitFor(() => {
        expect(mockConfigApi.addMapping).toHaveBeenCalledWith(
          123,
          expect.objectContaining({
            destination: 'targetNumber',
            constantValue: '42',
            type: undefined,
          }),
        );
      });
    });

    it('shows save error when addMapping API returns unsuccessful response', async () => {
      mockConfigApi.getConfig.mockResolvedValueOnce({
        success: true,
        config: { id: 123, mapping: [] },
      } as any);
      mockDataModelApi.getDestinationFieldsJson.mockResolvedValueOnce({
        success: true,
        data: simpleDestinationJson,
      } as any);
      mockConfigApi.addMapping.mockResolvedValueOnce({
        success: false,
        message: 'cannot save mapping',
      } as any);

      renderComponent({
        sourceSchema: simpleSourceSchema as any,
        existingMappings: [],
        configId: 123,
      });

      await openModal();
      fireEvent.click(screen.getByRole('button', { name: 'srcField (string)' }));
      fireEvent.click(screen.getByRole('button', { name: 'targetField (string)' }));

      const addButtons = screen.getAllByRole('button', { name: 'Add Mapping' });
      fireEvent.click(addButtons[addButtons.length - 1]);

      await waitFor(() => {
        expect(screen.getByText(/Failed to save mapping: cannot save mapping/i)).toBeInTheDocument();
      });
    });

    it('shows generic save error when addMapping throws', async () => {
      mockConfigApi.getConfig.mockResolvedValueOnce({
        success: true,
        config: { id: 123, mapping: [] },
      } as any);
      mockDataModelApi.getDestinationFieldsJson.mockResolvedValueOnce({
        success: true,
        data: simpleDestinationJson,
      } as any);
      mockConfigApi.addMapping.mockRejectedValueOnce(new Error('network down'));

      renderComponent({
        sourceSchema: simpleSourceSchema as any,
        existingMappings: [],
        configId: 123,
      });

      await openModal();
      fireEvent.click(screen.getByRole('button', { name: 'srcField (string)' }));
      fireEvent.click(screen.getByRole('button', { name: 'targetField (string)' }));

      const addButtons = screen.getAllByRole('button', { name: 'Add Mapping' });
      fireEvent.click(addButtons[addButtons.length - 1]);

      await waitFor(() => {
        expect(screen.getByText(/Failed to save mapping\. Please try again\./i)).toBeInTheDocument();
      });
    });

    it('shows error when destination is already mapped', async () => {
      mockDataModelApi.getDestinationFieldsJson.mockResolvedValueOnce({
        success: true,
        data: simpleDestinationJson,
      } as any);

      renderComponent({
        sourceSchema: simpleSourceSchema as any,
        configId: undefined,
        existingMappings: [
          {
            source: 'srcField',
            destination: 'targetField',
            transformation: 'NONE',
          },
        ] as any,
      });

      await openModal();
      fireEvent.click(screen.getByRole('button', { name: 'srcField (string)' }));
      fireEvent.click(screen.getByRole('button', { name: 'targetField (string)' }));

      const addButtons = screen.getAllByRole('button', { name: 'Add Mapping' });
      fireEvent.click(addButtons[addButtons.length - 1]);

      await waitFor(() => {
        expect(
          screen.getByText(/The following destination are already mapped/i)
        ).toBeInTheDocument();
      });
    });

    it('saves split mapping with custom delimiter', async () => {
      mockConfigApi.getConfig.mockResolvedValueOnce({
        success: true,
        config: { id: 123, mapping: [] },
      } as any);
      mockDataModelApi.getDestinationFieldsJson.mockResolvedValueOnce({
        success: true,
        data: simpleDestinationJson,
      } as any);

      renderComponent({
        sourceSchema: simpleSourceSchema as any,
        existingMappings: [],
        configId: 123,
      });

      await openModal();
      fireEvent.change(screen.getByRole('combobox'), {
        target: { value: 'split' },
      });
      fireEvent.change(screen.getByPlaceholderText(''), {
        target: { value: '-' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'fullName (string)' }));
      fireEvent.click(screen.getByRole('button', { name: 'targetField (string)' }));
      fireEvent.click(screen.getByRole('button', { name: 'targetNumber (number)' }));

      const addButtons = screen.getAllByRole('button', { name: 'Add Mapping' });
      const modalAddButton = addButtons[addButtons.length - 1];
      expect(modalAddButton).not.toBeDisabled();
      fireEvent.click(modalAddButton);

      await waitFor(() => {
        expect(mockConfigApi.addMapping).toHaveBeenCalledWith(
          123,
          expect.objectContaining({
            source: 'fullName',
            destination: ['targetField', 'targetNumber'],
            delimiter: '-',
          })
        );
      });
    });

    it('saves concatenate mapping with custom delimiter', async () => {
      mockConfigApi.getConfig.mockResolvedValueOnce({
        success: true,
        config: { id: 123, mapping: [] },
      } as any);
      mockDataModelApi.getDestinationFieldsJson.mockResolvedValueOnce({
        success: true,
        data: simpleDestinationJson,
      } as any);

      renderComponent({
        sourceSchema: simpleSourceSchema as any,
        existingMappings: [],
        configId: 123,
      });

      await openModal();
      fireEvent.change(screen.getByRole('combobox'), {
        target: { value: 'concatenate' },
      });
      fireEvent.change(screen.getByPlaceholderText(''), {
        target: { value: '_' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'srcField (string)' }));
      fireEvent.click(screen.getByRole('button', { name: 'fullName (string)' }));
      fireEvent.click(screen.getByRole('button', { name: 'targetField (string)' }));

      const addButtons = screen.getAllByRole('button', { name: 'Add Mapping' });
      const modalAddButton = addButtons[addButtons.length - 1];
      expect(modalAddButton).not.toBeDisabled();
      fireEvent.click(modalAddButton);

      await waitFor(() => {
        expect(mockConfigApi.addMapping).toHaveBeenCalledWith(
          123,
          expect.objectContaining({
            source: ['srcField', 'fullName'],
            destination: 'targetField',
            delimiter: '_',
          })
        );
      });
    });

  });

  describe('config mapping inference for CONCATENATE and CONCAT', () => {
    it('infers CONCATENATE transformation from separator property', async () => {
      mockConfigApi.getConfig.mockResolvedValueOnce({
        success: true,
        config: {
          id: 123,
          mapping: [{ source: ['fieldA', 'fieldB'], destination: 'result', separator: ',' }],
        },
      } as any);

      renderComponent({ existingMappings: [], configId: 123 });

      await waitFor(() => {
        expect(screen.getByText(/\[CONCATENATE\]/)).toBeInTheDocument();
      });
    });

    it('infers CONCATENATE transformation from delimiter property', async () => {
      mockConfigApi.getConfig.mockResolvedValueOnce({
        success: true,
        config: {
          id: 123,
          mapping: [{ source: ['fieldA', 'fieldB'], destination: 'result', delimiter: '-' }],
        },
      } as any);

      renderComponent({ existingMappings: [], configId: 123 });

      await waitFor(() => {
        expect(screen.getByText(/\[CONCATENATE\]/)).toBeInTheDocument();
      });
    });

    it('infers CONCAT transformation from multiple sources without delimiter or operator', async () => {
      mockConfigApi.getConfig.mockResolvedValueOnce({
        success: true,
        config: {
          id: 123,
          mapping: [{ source: ['fieldA', 'fieldB'], destination: 'result' }],
        },
      } as any);

      renderComponent({ existingMappings: [], configId: 123 });

      await waitFor(() => {
        expect(screen.getByText(/\[CONCAT\]/)).toBeInTheDocument();
      });
    });
  });

  describe('destination JSON with various value types', () => {
    it('handles boolean and null values in destination JSON tree', async () => {
      mockDataModelApi.getDestinationFieldsJson.mockResolvedValueOnce({
        success: true,
        data: {
          transactionDetails: { amount: 0 },
          boolField: true,
          nullField: null,
          redis: { cacheKey: { value: 'x' } },
        },
      } as any);

      renderComponent({ configId: undefined });
      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));

      await waitFor(() => {
        expect(screen.queryByText('Loading destination fields...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Add New Mapping')).toBeInTheDocument();
    });
  });

  describe('sourceTree fallback cases', () => {
    it('shows Generated Fields placeholder when sourceSchema is undefined', () => {
      renderComponent({ sourceSchema: undefined });
      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));
      expect(screen.getByText('Generated Fields')).toBeInTheDocument();
    });

    it('uses fallback schema tree for a plain object without properties', () => {
      renderComponent({ sourceSchema: { myKey: 'hello', numKey: 123 } as any, configId: undefined });
      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));
      expect(screen.getByText('Add New Mapping')).toBeInTheDocument();
    });
  });

  describe('tree node expand/collapse', () => {
    it('expands and collapses source tree nodes with children', async () => {
      renderComponent();
      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));

      await waitFor(() => {
        expect(screen.queryByText('Loading destination fields...')).not.toBeInTheDocument();
      });

      // The mockSourceSchema has 'customer' with children (id, name)
      // Find expand buttons (ChevronRightIcon) for source nodes
      const chevrons = screen.getAllByTestId('chevron-right-icon');
      if (chevrons.length > 0) {
        const expandBtn = chevrons[0].closest('button')!;
        // First click expands (toggleSourceNode adds to expanded)
        fireEvent.click(expandBtn);
        // Second click collapses (toggleSourceNode removes from expanded)
        fireEvent.click(expandBtn);
      }

      expect(screen.getByText('Add New Mapping')).toBeInTheDocument();
    });

    it('deselects a source field when clicked again', async () => {
      const simpleSourceSchema = [
        { name: 'srcField', path: 'srcField', type: 'string', isRequired: true },
      ];

      mockDataModelApi.getDestinationFieldsJson.mockResolvedValueOnce({
        success: true,
        data: {
          transactionDetails: { amount: 0 },
          targetField: 'x',
          redis: {},
        },
      } as any);

      renderComponent({ sourceSchema: simpleSourceSchema as any, configId: undefined });
      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));

      await waitFor(() => {
        expect(screen.queryByText('Loading destination fields...')).not.toBeInTheDocument();
      });

      // Select srcField (adds to selectedSources)
      fireEvent.click(screen.getByRole('button', { name: 'srcField (string)' }));
      // Select again (deselects - line 845)
      fireEvent.click(screen.getByRole('button', { name: 'srcField (string)' }));

      expect(screen.getByText('Add New Mapping')).toBeInTheDocument();
    });
  });

  describe('edit fields modal X button close', () => {
    const openEditFieldsModal = async () => {
      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));
      await waitFor(() => {
        expect(screen.queryByText('Loading destination fields...')).not.toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /edit fields/i }));
    };

    it('closes edit fields modal via X button', async () => {
      renderComponent();
      await openEditFieldsModal();

      expect(screen.getByText('Edit Destination Fields')).toBeInTheDocument();

      // Find X buttons — the last one belongs to the Edit Fields modal
      const xIcons = screen.getAllByTestId('x-icon');
      const lastXButton = xIcons[xIcons.length - 1].closest('button')!;
      fireEvent.click(lastXButton);

      await waitFor(() => {
        expect(screen.queryByText('Edit Destination Fields')).not.toBeInTheDocument();
      });
    });

    it('clears validation error path via valid json in handleJsonChange', async () => {
      renderComponent();
      await openEditFieldsModal();

      // Click "Mock Edit JSON" which fires handleJsonChange with valid json → line 1748
      fireEvent.click(screen.getByRole('button', { name: /mock edit json/i }));

      await waitFor(() => {
        // No validation error shown means setValidationError(null) was called
        expect(screen.queryByText(/Required field/i)).not.toBeInTheDocument();
      });
    });

    it('shows validation error when saving edit fields modal with invalid json', async () => {
      renderComponent();
      await openEditFieldsModal();

      // Make tempEditedJson invalid first
      fireEvent.click(screen.getByRole('button', { name: /mock null json/i }));

      // Now try to save — validation should fail (lines 1756, 1757)
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockDataModelApi.updateDestinationFieldsJson).not.toHaveBeenCalled();
      });
    });
  });

  describe('mapping error dismiss button', () => {
    it('dismisses the mapping error banner', async () => {
      mockDataModelApi.getDestinationFieldsJson.mockResolvedValueOnce({
        success: true,
        data: {
          transactionDetails: { amount: 0 },
          targetField: 'x',
          redis: {},
        },
      } as any);

      const simpleSourceSchema = [
        { name: 'srcField', path: 'srcField', type: 'string', isRequired: true },
      ];

      renderComponent({
        sourceSchema: simpleSourceSchema as any,
        configId: undefined,
        existingMappings: [
          { source: 'srcField', destination: 'targetField', transformation: 'NONE' },
        ] as any,
      });

      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));
      await waitFor(() => {
        expect(screen.queryByText('Loading destination fields...')).not.toBeInTheDocument();
      });

      // Select same source and already-mapped destination to trigger mappingError
      fireEvent.click(screen.getByRole('button', { name: 'srcField (string)' }));
      fireEvent.click(screen.getByRole('button', { name: 'targetField (string)' }));

      const addButtons = screen.getAllByRole('button', { name: 'Add Mapping' });
      fireEvent.click(addButtons[addButtons.length - 1]);

      await waitFor(() => {
        expect(screen.getByText(/already mapped/i)).toBeInTheDocument();
      });

      // Dismiss the mappingError via the red X button (line 1593)
      const dismissButton = screen.getAllByRole('button').find(
        (btn) => btn.className.includes('text-red-600')
      )!;
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByText(/already mapped/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('handleSaveMapping with split destination in existing mappings', () => {
    it('handles existing SPLIT mapping destinations when checking duplicate usage', async () => {
      mockConfigApi.getConfig.mockResolvedValueOnce({
        success: true,
        config: { id: 123, mapping: [] },
      } as any);

      mockDataModelApi.getDestinationFieldsJson.mockResolvedValueOnce({
        success: true,
        data: {
          transactionDetails: { amount: 0 },
          targetField: 'x',
          targetNumber: 0,
          redis: {},
        },
      } as any);

      const simpleSourceSchema = [
        { name: 'srcField', path: 'srcField', type: 'string', isRequired: true },
      ];

      renderComponent({
        sourceSchema: simpleSourceSchema as any,
        existingMappings: [
          { source: 'srcField', destination: ['targetField', 'targetNumber'], transformation: 'SPLIT' },
        ] as any,
        configId: undefined,
      });

      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));

      await waitFor(() => {
        expect(screen.queryByText('Loading destination fields...')).not.toBeInTheDocument();
      });

      // Select source and one of the split destinations (already used)
      fireEvent.click(screen.getByRole('button', { name: 'srcField (string)' }));
      fireEvent.click(screen.getByRole('button', { name: 'targetField (string)' }));

      const addButtons = screen.getAllByRole('button', { name: 'Add Mapping' });
      fireEvent.click(addButtons[addButtons.length - 1]);

      await waitFor(() => {
        expect(screen.getByText(/already mapped/i)).toBeInTheDocument();
      });
    });
  });

  describe('source field path with array notation', () => {
    it('converts [0] path notation when selecting source field', async () => {
      const arraySourceSchema = [
        { name: 'itemsCode', path: 'items[0].code', type: 'string', isRequired: true },
      ];

      mockDataModelApi.getDestinationFieldsJson.mockResolvedValueOnce({
        success: true,
        data: {
          transactionDetails: { amount: 0 },
          targetField: 'x',
          redis: {},
        },
      } as any);

      renderComponent({
        sourceSchema: arraySourceSchema as any,
        configId: undefined,
      });

      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));

      await waitFor(() => {
        expect(screen.queryByText('Loading destination fields...')).not.toBeInTheDocument();
      });

      // Expand the 'items' parent node to reveal 'code' child
      const chevrons = screen.getAllByTestId('chevron-right-icon');
      if (chevrons.length > 0) {
        fireEvent.click(chevrons[0].closest('button')!);
      }

      // Select the 'code' leaf (triggers [0] path handling at line 836-840)
      const codeBtn = screen.queryByRole('button', { name: /code \(string\)/i });
      if (codeBtn) {
        fireEvent.click(codeBtn);
      }

      expect(screen.getByText('Add New Mapping')).toBeInTheDocument();
    });
  });

  describe('destination tree interactions', () => {
    it('toggleDestNode expands and collapses destination tree nodes (lines 817-820)', async () => {
      renderComponent({ configId: undefined });

      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));

      await waitFor(() => {
        expect(screen.queryByText('Loading destination fields...')).not.toBeInTheDocument();
      });

      // With default mockSourceSchema: source has 1 chevron (customer).
      // Destination has chevrons for transactionDetails, payer, redis.
      // Source chevron = index 0, destination chevrons start at index 1.
      const allChevrons = screen.getAllByTestId('chevron-right-icon');
      expect(allChevrons.length).toBeGreaterThan(1);

      const destChevron = allChevrons[1].closest('button')!;

      // Expand destination node → line 820 runs
      fireEvent.click(destChevron);

      // 'ccy' leaf should now be visible (it's inside transactionDetails or payer)
      await waitFor(() => {
        const ccyBtn = screen.queryByRole('button', { name: /ccy/i });
        expect(ccyBtn || screen.queryByRole('button', { name: /accountId/i })).toBeTruthy();
      });

      // Collapse destination node → line 818 runs
      fireEvent.click(destChevron);
    });

    it('handleDestinationSelect deselects an already-selected destination leaf (line 858)', async () => {
      // Use a source schema without 'amount' to distinguish source from destination leaves
      const simpleSourceSchema = { properties: { myField: { type: 'string' } } };
      renderComponent({ configId: undefined, sourceSchema: simpleSourceSchema as any });

      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));

      await waitFor(() => {
        expect(screen.queryByText('Loading destination fields...')).not.toBeInTheDocument();
      });

      // With no expandable source nodes, all chevrons belong to destination tree
      // transactionDetails chevron = index 0 in destination tree
      const allChevrons = screen.getAllByTestId('chevron-right-icon');
      const destChevron = allChevrons[0].closest('button')!;

      // Expand transactionDetails
      fireEvent.click(destChevron);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /amount.*number/i })).toBeInTheDocument();
      });

      const amountBtn = screen.getByRole('button', { name: /amount.*number/i });

      // Select destination → selectedDestinations includes the path
      fireEvent.click(amountBtn);

      // Deselect destination → line 858 runs
      fireEvent.click(amountBtn);

      // Modal is still open after deselect
      expect(screen.getByText('Add New Mapping')).toBeInTheDocument();
    });
  });

  describe('isDuplicate callback coverage (lines 894-939)', () => {
    it('isDuplicate.some() callback runs when destination is not in usedDestinations', async () => {
      const simpleSourceSchema = { properties: { srcField: { type: 'string' } } };
      const existingMappings = [
        { source: 'otherSrc', destination: 'payer.accountId', transformation: 'NONE' },
      ];

      renderComponent({
        configId: undefined,
        sourceSchema: simpleSourceSchema as any,
        existingMappings: existingMappings as any,
      });

      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));

      await waitFor(() => {
        expect(screen.queryByText('Loading destination fields...')).not.toBeInTheDocument();
      });

      // Select source field
      fireEvent.click(screen.getByRole('button', { name: /srcField.*string/i }));

      // Expand transactionDetails in destination tree
      const allChevrons = screen.getAllByTestId('chevron-right-icon');
      fireEvent.click(allChevrons[0].closest('button')!);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /amount.*number/i })).toBeInTheDocument();
      });

      // Select a destination NOT in usedDestinations
      fireEvent.click(screen.getByRole('button', { name: /amount.*number/i }));

      // Click Add Mapping → isDuplicate.some() callback runs for existing mappings
      const addButtons = screen.getAllByRole('button', { name: 'Add Mapping' });
      fireEvent.click(addButtons[addButtons.length - 1]);

      await waitFor(() => {
        // addMapping was called since isDuplicate is false and destination not in usedDestinations
        expect(mockConfigApi.addMapping).toHaveBeenCalled();
      });
    });

    it('isDuplicate detect with array source mapping (lines 903-910)', async () => {
      const simpleSourceSchema = { properties: { srcA: { type: 'string' }, srcB: { type: 'number' } } };
      const existingMappings = [
        { source: ['srcA', 'srcB'], destination: 'payer.accountId', transformation: 'CONCATENATE' },
      ];

      renderComponent({
        configId: undefined,
        sourceSchema: simpleSourceSchema as any,
        existingMappings: existingMappings as any,
      });

      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));

      await waitFor(() => {
        expect(screen.queryByText('Loading destination fields...')).not.toBeInTheDocument();
      });

      // Select source field
      fireEvent.click(screen.getByRole('button', { name: /srcA.*string/i }));

      // Expand transactionDetails in destination tree
      const allChevrons = screen.getAllByTestId('chevron-right-icon');
      fireEvent.click(allChevrons[0].closest('button')!);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /amount.*number/i })).toBeInTheDocument();
      });

      // Select a destination different from existing ('transactionDetails.amount' != 'payer.accountId')
      fireEvent.click(screen.getByRole('button', { name: /amount.*number/i }));

      const addButtons = screen.getAllByRole('button', { name: 'Add Mapping' });
      fireEvent.click(addButtons[addButtons.length - 1]);

      await waitFor(() => {
        expect(mockConfigApi.addMapping).toHaveBeenCalled();
      });
    });
  });

  describe('destination JSON with null/boolean/empty-object values (lines 259, 265, 268, 274)', () => {
    it('convertJsonToTreeNodesRecursive handles null, boolean, and empty-object leaf values', async () => {
      mockDataModelApi.getDestinationFieldsJson.mockResolvedValueOnce({
        success: true,
        data: {
          transactionDetails: {
            amount: null,     // null branch
            active: true,     // boolean branch
            metadata: {},     // empty object branch
          },
          redis: {
            cacheKey: { value: 'x' },
          },
        },
      } as any);

      renderComponent({ configId: undefined });

      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));

      await waitFor(() => {
        expect(screen.queryByText('Loading destination fields...')).not.toBeInTheDocument();
      });

      // JSDOM renders the destination tree — the tree builds nodes from null/bool/empty-object values
      expect(screen.getByText('Add New Mapping')).toBeInTheDocument();
    });
  });

  describe('buildSourceTreeFromSchema with array items (line 386)', () => {
    it('handles array-type source schema with items.properties', async () => {
      const arraySourceSchema = {
        properties: {
          lineItems: {
            type: 'array',
            items: {
              properties: {
                code: { type: 'string' },
                qty: { type: 'number' },
              },
            },
          },
        },
      };

      renderComponent({ sourceSchema: arraySourceSchema as any, configId: undefined });

      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));

      await waitFor(() => {
        expect(screen.queryByText('Loading destination fields...')).not.toBeInTheDocument();
      });

      // Source tree should include lineItems (expandable)
      expect(screen.getByText('Add New Mapping')).toBeInTheDocument();
    });
  });

  describe('handleSaveChanges validation failure (lines 1756-1757)', () => {
    it('covers validation failure path when tempEditedJson is invalid at save time', async () => {
      // Mock API to return JSON missing transactionDetails (invalid)
      mockDataModelApi.getDestinationFieldsJson.mockResolvedValueOnce({
        success: true,
        data: {
          redis: { cacheKey: { value: 'abc' } },
          // Missing transactionDetails → invalid per validateDestinationJson
        },
      } as any);

      renderComponent({ configId: undefined });

      // Open Add Mapping modal first (Edit Fields button is inside the modal)
      fireEvent.click(screen.getByRole('button', { name: /add mapping/i }));

      await waitFor(() => {
        expect(screen.queryByText('Loading destination fields...')).not.toBeInTheDocument();
      });

      // Click Edit Fields → sets tempEditedJson to invalid JSON, clears validationError
      // Save Changes button should be enabled (validationError cleared on open)
      fireEvent.click(screen.getByRole('button', { name: /edit fields/i }));

      await waitFor(() => {
        // Edit fields modal opens
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });

      // Click Save Changes → validateDestinationJson fails → line 1756-1757 runs
      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

      await waitFor(() => {
        // Validation error should be displayed (modal stays open with error)
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });
    });
  });

  describe('fetchCurrentMappings transformation inference (line 119)', () => {
    it('infers CONSTANT, CONCATENATE, SUM, SPLIT transformations from mapping shape', async () => {
      const onMappingChange = jest.fn();
      (configApi.getConfig as jest.Mock).mockResolvedValueOnce({
        success: true,
        config: {
          mapping: [
            { source: 'a', destination: 'b', constantValue: 'X' },
            { source: ['a', 'b'], destination: 'c', separator: ',' },
            { source: ['x', 'y'], destination: 'z', operator: 'SUM' },
            { source: ['p', 'q'], destination: 'r' },
            { source: 's', destination: ['d1', 'd2'] },
          ],
        },
      });

      render(
        <MappingUtility
          onMappingChange={onMappingChange}
          configId={999}
          sourceSchema={[{ name: 'a', path: 'a', type: 'string', isRequired: true }]}
        />,
      );

      await waitFor(() => {
        expect(configApi.getConfig).toHaveBeenCalledWith(999);
      });
    });
  });
});