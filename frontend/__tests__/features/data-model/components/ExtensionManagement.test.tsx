import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ExtensionManagement } from '../../../../src/features/data-model/components/ExtensionManagement';
import { dataModelApi } from '../../../../src/features/data-model/services/dataModelApi';

jest.mock('../../../../src/features/data-model/services/dataModelApi', () => ({
  dataModelApi: {
    getAllExtensions: jest.fn(),
    createExtension: jest.fn(),
    updateExtension: jest.fn(),
    deleteExtension: jest.fn(),
  },
}));

describe('ExtensionManagement', () => {
  const mockedApi = dataModelApi as unknown as {
    getAllExtensions: jest.Mock;
    createExtension: jest.Mock;
    updateExtension: jest.Mock;
    deleteExtension: jest.Mock;
  };

  const sampleExtension = {
    id: 10,
    collection: 'entities',
    fieldName: 'riskScore',
    fieldType: 'NUMBER',
    description: 'Score used for risk filtering',
    isRequired: true,
    defaultValue: 0,
    validation: { min: 0, max: 100 },
    tenantId: 'tenant-a',
    createdBy: 'tester',
    createdAt: '2026-01-01T00:00:00Z',
    version: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.getAllExtensions.mockResolvedValue({
      success: true,
      extensions: [],
    });
  });

  it('renders empty state when no extensions are available', async () => {
    render(<ExtensionManagement />);

    expect(await screen.findByText(/No extensions found/i)).toBeInTheDocument();
    expect(mockedApi.getAllExtensions).toHaveBeenCalledTimes(1);
  });

  it('shows API load failure message', async () => {
    mockedApi.getAllExtensions.mockResolvedValueOnce({
      success: false,
      extensions: [],
    });

    render(<ExtensionManagement />);

    expect(await screen.findByText('Failed to load extensions')).toBeInTheDocument();
  });

  it('shows load exception error message when fetch throws', async () => {
    mockedApi.getAllExtensions.mockRejectedValueOnce(new Error('network down'));

    render(<ExtensionManagement />);

    expect(await screen.findByText('Error loading extensions')).toBeInTheDocument();
  });

  it('creates a new extension and calls change callback', async () => {
    const onExtensionChange = jest.fn();

    mockedApi.createExtension.mockResolvedValueOnce({ success: true });
    mockedApi.getAllExtensions
      .mockResolvedValueOnce({ success: true, extensions: [] })
      .mockResolvedValueOnce({ success: true, extensions: [sampleExtension] });

    render(<ExtensionManagement onExtensionChange={onExtensionChange} />);

    fireEvent.click(await screen.findByRole('button', { name: /Add Extension/i }));

    fireEvent.change(screen.getByPlaceholderText('e.g., creditScore'), {
      target: { value: '  customField  ' },
    });

    fireEvent.change(screen.getByPlaceholderText('Describe what this field is for'), {
      target: { value: '  field description  ' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Extension' }));

    await waitFor(() => {
      expect(mockedApi.createExtension).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'entities',
          fieldName: 'customField',
          fieldType: 'STRING',
          description: 'field description',
        }),
      );
    });

    expect(onExtensionChange).toHaveBeenCalled();
  });

  it('disables create button when field name is empty', async () => {
    render(<ExtensionManagement />);

    fireEvent.click(await screen.findByRole('button', { name: /Add Extension/i }));

    expect(screen.getByRole('button', { name: 'Create Extension' })).toBeDisabled();
    expect(mockedApi.createExtension).not.toHaveBeenCalled();
  });

  it('shows create API failure message', async () => {
    mockedApi.createExtension.mockResolvedValueOnce({ success: false, message: 'Create failed' });

    render(<ExtensionManagement />);

    fireEvent.click(await screen.findByRole('button', { name: /Add Extension/i }));
    fireEvent.change(screen.getByPlaceholderText('e.g., creditScore'), {
      target: { value: 'customField' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Extension' }));

    expect(await screen.findByText('Create failed')).toBeInTheDocument();
  });

  it('updates an existing extension and calls change callback', async () => {
    const onExtensionChange = jest.fn();

    mockedApi.getAllExtensions
      .mockResolvedValueOnce({ success: true, extensions: [sampleExtension] })
      .mockResolvedValueOnce({ success: true, extensions: [sampleExtension] });
    mockedApi.updateExtension.mockResolvedValueOnce({ success: true });

    render(<ExtensionManagement onExtensionChange={onExtensionChange} />);

    expect(await screen.findByText('entities.riskScore')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]);

    fireEvent.change(screen.getByPlaceholderText('Describe what this field is for'), {
      target: { value: '  updated description  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockedApi.updateExtension).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          description: 'updated description',
          isRequired: true,
        }),
      );
    });

    expect(onExtensionChange).toHaveBeenCalled();
  });

  it('shows update API failure message', async () => {
    mockedApi.getAllExtensions.mockResolvedValueOnce({
      success: true,
      extensions: [sampleExtension],
    });
    mockedApi.updateExtension.mockResolvedValueOnce({ success: false, message: 'Update failed' });

    render(<ExtensionManagement />);

    expect(await screen.findByText('entities.riskScore')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]);
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    expect(await screen.findByText('Update failed')).toBeInTheDocument();
  });

  it('deletes an extension after confirmation', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    mockedApi.getAllExtensions.mockResolvedValueOnce({
      success: true,
      extensions: [sampleExtension],
    });
    mockedApi.deleteExtension.mockResolvedValueOnce({ success: true });

    render(<ExtensionManagement />);

    expect(await screen.findByText('entities.riskScore')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[2]);

    await waitFor(() => {
      expect(mockedApi.deleteExtension).toHaveBeenCalledWith(10);
    });

    confirmSpy.mockRestore();
  });

  it('does not delete when confirmation is cancelled', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

    mockedApi.getAllExtensions.mockResolvedValueOnce({
      success: true,
      extensions: [sampleExtension],
    });

    render(<ExtensionManagement />);

    expect(await screen.findByText('entities.riskScore')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[2]);

    expect(mockedApi.deleteExtension).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('shows delete API failure message', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    mockedApi.getAllExtensions.mockResolvedValueOnce({
      success: true,
      extensions: [sampleExtension],
    });
    mockedApi.deleteExtension.mockResolvedValueOnce({ success: false, message: 'Delete failed' });

    render(<ExtensionManagement />);

    expect(await screen.findByText('entities.riskScore')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[2]);

    expect(await screen.findByText('Delete failed')).toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it('shows loading state before extensions are fetched', async () => {
    let resolve: (value: any) => void;
    mockedApi.getAllExtensions.mockImplementationOnce(
      () => new Promise((r) => { resolve = r; }),
    );

    render(<ExtensionManagement />);
    expect(screen.getByText('Loading extensions...')).toBeInTheDocument();

    resolve!({ success: true, extensions: [] });
    expect(await screen.findByText(/No extensions found/i)).toBeInTheDocument();
  });

  it('cancels edit form when Cancel is clicked', async () => {
    mockedApi.getAllExtensions.mockResolvedValueOnce({
      success: true,
      extensions: [sampleExtension],
    });

    render(<ExtensionManagement />);

    expect(await screen.findByText('entities.riskScore')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]); // Edit button

    expect(await screen.findByText('Edit Extension')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Cancel$/ }));

    await waitFor(() => {
      expect(screen.queryByText('Edit Extension')).not.toBeInTheDocument();
    });
  });

  it('closes create form when Cancel is clicked', async () => {
    render(<ExtensionManagement />);

    fireEvent.click(await screen.findByRole('button', { name: /Add Extension/i }));
    expect(screen.getByPlaceholderText('e.g., creditScore')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('e.g., creditScore')).not.toBeInTheDocument();
    });
  });

  it('closes create form when X button is clicked', async () => {
    render(<ExtensionManagement />);

    fireEvent.click(await screen.findByRole('button', { name: /Add Extension/i }));
    expect(screen.getByPlaceholderText('e.g., creditScore')).toBeInTheDocument();

    // X button is button index 1 after Add Extension
    const buttons = screen.getAllByRole('button');
    // Find the X button (small close button in form header, before Create Extension and Cancel)
    const xButton = buttons[1]; // 0=Add Extension, 1=X, 2=Create Extension(disabled), 3=Cancel
    fireEvent.click(xButton);

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('e.g., creditScore')).not.toBeInTheDocument();
    });
  });

  it('handles form field changes (defaultValue, collection, isRequired)', async () => {
    render(<ExtensionManagement />);

    fireEvent.click(await screen.findByRole('button', { name: /Add Extension/i }));

    // Change collection dropdown
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'accounts' } });

    // Change defaultValue
    fireEvent.change(screen.getByPlaceholderText('Optional'), {
      target: { value: 'default123' },
    });

    // Change fieldName to something valid so Create is enabled
    fireEvent.change(screen.getByPlaceholderText('e.g., creditScore'), {
      target: { value: 'myField' },
    });

    // Toggle isRequired checkbox
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(checkbox).toBeChecked();
  });

  it('shows NUMBER validation fields when fieldType is NUMBER', async () => {
    render(<ExtensionManagement />);

    fireEvent.click(await screen.findByRole('button', { name: /Add Extension/i }));

    // Change fieldType to NUMBER
    const fieldTypeSelect = screen.getAllByRole('combobox')[1]; // [0]=collection, [1]=fieldType
    fireEvent.change(fieldTypeSelect, { target: { value: 'NUMBER' } });

    // Min/max inputs should appear
    const minInput = screen.getByPlaceholderText('Min value');
    const maxInput = screen.getByPlaceholderText('Max value');
    expect(minInput).toBeInTheDocument();
    expect(maxInput).toBeInTheDocument();

    // Set min value
    fireEvent.change(minInput, { target: { value: '5' } });
    // Set max value
    fireEvent.change(maxInput, { target: { value: '100' } });
    // Clear min value (cover undefined branch)
    fireEvent.change(minInput, { target: { value: '' } });
  });

  it('shows STRING pattern field and allows pattern input', async () => {
    render(<ExtensionManagement />);

    fireEvent.click(await screen.findByRole('button', { name: /Add Extension/i }));

    // Default fieldType is STRING, so pattern input should be visible
    const patternInput = screen.getByPlaceholderText('e.g., ^[A-Z0-9]{10}$');
    expect(patternInput).toBeInTheDocument();

    // Enter a pattern value
    fireEvent.change(patternInput, { target: { value: '^[0-9]+$' } });
    // Clear it (cover undefined/empty branch)
    fireEvent.change(patternInput, { target: { value: '' } });
  });

  it('handles create extension throw with Error instance', async () => {
    mockedApi.createExtension.mockRejectedValueOnce(new Error('Network fail'));

    render(<ExtensionManagement />);

    fireEvent.click(await screen.findByRole('button', { name: /Add Extension/i }));
    fireEvent.change(screen.getByPlaceholderText('e.g., creditScore'), {
      target: { value: 'field1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Extension' }));

    expect(await screen.findByText('Error creating extension: Network fail')).toBeInTheDocument();
  });

  it('handles create extension throw with non-Error value', async () => {
    mockedApi.createExtension.mockRejectedValueOnce('unknown error');

    render(<ExtensionManagement />);

    fireEvent.click(await screen.findByRole('button', { name: /Add Extension/i }));
    fireEvent.change(screen.getByPlaceholderText('e.g., creditScore'), {
      target: { value: 'field2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Extension' }));

    expect(await screen.findByText('Error creating extension: Unknown error')).toBeInTheDocument();
  });

  it('handles update extension throw', async () => {
    mockedApi.getAllExtensions.mockResolvedValueOnce({
      success: true,
      extensions: [sampleExtension],
    });
    mockedApi.updateExtension.mockRejectedValueOnce(new Error('Update crash'));

    render(<ExtensionManagement />);

    expect(await screen.findByText('entities.riskScore')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]); // Edit

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    expect(await screen.findByText('Error updating extension')).toBeInTheDocument();
  });

  it('calls onExtensionChange when delete succeeds', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const onExtensionChange = jest.fn();

    mockedApi.getAllExtensions.mockResolvedValueOnce({
      success: true,
      extensions: [sampleExtension],
    }).mockResolvedValueOnce({ success: true, extensions: [] });
    mockedApi.deleteExtension.mockResolvedValueOnce({ success: true });

    render(<ExtensionManagement onExtensionChange={onExtensionChange} />);

    expect(await screen.findByText('entities.riskScore')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[2]); // Delete

    await waitFor(() => {
      expect(onExtensionChange).toHaveBeenCalled();
    });

    confirmSpy.mockRestore();
  });

  it('handles delete extension throw', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    mockedApi.getAllExtensions.mockResolvedValueOnce({
      success: true,
      extensions: [sampleExtension],
    });
    mockedApi.deleteExtension.mockRejectedValueOnce(new Error('Delete crash'));

    render(<ExtensionManagement />);

    expect(await screen.findByText('entities.riskScore')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[2]);

    expect(await screen.findByText('Error deleting extension')).toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it('renders extension with description, default value shown', async () => {
    const extWithDesc = { ...sampleExtension, description: 'A useful field', defaultValue: '42' };
    mockedApi.getAllExtensions.mockResolvedValueOnce({
      success: true,
      extensions: [extWithDesc],
    });

    render(<ExtensionManagement />);

    expect(await screen.findByText('A useful field')).toBeInTheDocument();
    expect(screen.getByText(/Default: 42/)).toBeInTheDocument();
  });

  it('handles NUMBER validation in edit mode (startEditExtension with NUMBER type)', async () => {
    mockedApi.getAllExtensions.mockResolvedValueOnce({
      success: true,
      extensions: [sampleExtension], // sampleExtension is NUMBER type with min:0, max:100
    });
    mockedApi.updateExtension.mockResolvedValueOnce({ success: true });
    mockedApi.getAllExtensions.mockResolvedValueOnce({
      success: true,
      extensions: [sampleExtension],
    });

    const onExtensionChange = jest.fn();
    render(<ExtensionManagement onExtensionChange={onExtensionChange} />);

    expect(await screen.findByText('entities.riskScore')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]); // Edit - sets formData with fieldType=NUMBER

    // Min/max inputs should be visible since sampleExtension is NUMBER type
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Min value')).toBeInTheDocument();
    });

    // Change min value
    fireEvent.change(screen.getByPlaceholderText('Min value'), {
      target: { value: '' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(onExtensionChange).toHaveBeenCalled();
    });
  });

  it('creates extension without onExtensionChange callback (false branch)', async () => {
    mockedApi.createExtension.mockResolvedValueOnce({ success: true });
    mockedApi.getAllExtensions
      .mockResolvedValueOnce({ success: true, extensions: [] })
      .mockResolvedValueOnce({ success: true, extensions: [] });

    // No onExtensionChange prop — hits if(onExtensionChange) false branch
    render(<ExtensionManagement />);

    fireEvent.click(await screen.findByRole('button', { name: /Add Extension/i }));
    fireEvent.change(screen.getByPlaceholderText('e.g., creditScore'), {
      target: { value: 'fieldNoCallback' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Extension' }));

    await waitFor(() => {
      expect(mockedApi.createExtension).toHaveBeenCalled();
    });
  });

  it('shows fallback create failure message when response.message is absent', async () => {
    // Hits response.message || 'Failed to create extension' — the fallback
    mockedApi.createExtension.mockResolvedValueOnce({ success: false });

    render(<ExtensionManagement />);

    fireEvent.click(await screen.findByRole('button', { name: /Add Extension/i }));
    fireEvent.change(screen.getByPlaceholderText('e.g., creditScore'), {
      target: { value: 'myField' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Extension' }));

    expect(await screen.findByText('Failed to create extension')).toBeInTheDocument();
  });

  it('creates extension with NUMBER fieldType and validation object (non-empty validation branch)', async () => {
    mockedApi.createExtension.mockResolvedValueOnce({ success: true });
    mockedApi.getAllExtensions
      .mockResolvedValueOnce({ success: true, extensions: [] })
      .mockResolvedValueOnce({ success: true, extensions: [] });

    render(<ExtensionManagement />);

    fireEvent.click(await screen.findByRole('button', { name: /Add Extension/i }));

    // Switch to NUMBER type so validation inputs appear
    const fieldTypeSelect = screen.getAllByRole('combobox')[1];
    fireEvent.change(fieldTypeSelect, { target: { value: 'NUMBER' } });

    fireEvent.change(screen.getByPlaceholderText('Min value'), { target: { value: '1' } });
    fireEvent.change(screen.getByPlaceholderText('Max value'), { target: { value: '99' } });

    fireEvent.change(screen.getByPlaceholderText('e.g., creditScore'), {
      target: { value: 'scoreField' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Extension' }));

    await waitFor(() => {
      expect(mockedApi.createExtension).toHaveBeenCalledWith(
        expect.objectContaining({
          validation: expect.objectContaining({ min: 1, max: 99 }),
        }),
      );
    });
  });

  it('shows fallback update failure message when response.message is absent', async () => {
    mockedApi.getAllExtensions.mockResolvedValueOnce({
      success: true,
      extensions: [sampleExtension],
    });
    mockedApi.updateExtension.mockResolvedValueOnce({ success: false });

    render(<ExtensionManagement />);

    expect(await screen.findByText('entities.riskScore')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]);
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    expect(await screen.findByText('Failed to update extension')).toBeInTheDocument();
  });

  it('updates extension without onExtensionChange callback (false branch)', async () => {
    mockedApi.getAllExtensions
      .mockResolvedValueOnce({ success: true, extensions: [sampleExtension] })
      .mockResolvedValueOnce({ success: true, extensions: [sampleExtension] });
    mockedApi.updateExtension.mockResolvedValueOnce({ success: true });

    // No onExtensionChange prop
    render(<ExtensionManagement />);

    expect(await screen.findByText('entities.riskScore')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]);
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockedApi.updateExtension).toHaveBeenCalled();
    });
  });

  it('startEditExtension fills empty description/defaultValue/validation with fallback values', async () => {
    const extNoOptionals = {
      ...sampleExtension,
      description: undefined,
      defaultValue: undefined,
      validation: undefined,
    };
    mockedApi.getAllExtensions.mockResolvedValueOnce({
      success: true,
      extensions: [extNoOptionals],
    });
    mockedApi.updateExtension.mockResolvedValueOnce({ success: true });
    mockedApi.getAllExtensions.mockResolvedValueOnce({ success: true, extensions: [] });

    render(<ExtensionManagement />);

    expect(await screen.findByText('entities.riskScore')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]); // Edit

    // Form should open with empty description/defaultValue fields (fallback '' and {})
    expect(await screen.findByText('Edit Extension')).toBeInTheDocument();

    // Save changes — covers the empty description/defaultValue/validation branches in update
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockedApi.updateExtension).toHaveBeenCalledWith(
        sampleExtension.id,
        expect.objectContaining({
          description: undefined,
          defaultValue: undefined,
          validation: undefined,
        }),
      );
    });
  });

  it('shows fallback delete failure message when response.message is absent', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    mockedApi.getAllExtensions.mockResolvedValueOnce({
      success: true,
      extensions: [sampleExtension],
    });
    mockedApi.deleteExtension.mockResolvedValueOnce({ success: false });

    render(<ExtensionManagement />);

    expect(await screen.findByText('entities.riskScore')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[2]);

    expect(await screen.findByText('Failed to delete extension')).toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it('clears max validation input to undefined (BRDA:510)', async () => {
    mockedApi.getAllExtensions.mockResolvedValueOnce({
      success: true,
      extensions: [],
    });

    render(<ExtensionManagement />);
    await screen.findByText('Data Model Extensions');

    fireEvent.click(screen.getByRole('button', { name: /Add Extension/i }));

    // Select NUMBER field type to show min/max inputs
    const fieldTypeSelect = screen.getAllByRole('combobox')[1];
    fireEvent.change(fieldTypeSelect, { target: { value: 'NUMBER' } });

    const maxInput = screen.getByPlaceholderText('Max value');
    // Type a value, then clear it — triggers e.target.value ? Number(val) : undefined
    fireEvent.change(maxInput, { target: { value: '100' } });
    fireEvent.change(maxInput, { target: { value: '' } });
  });
});
