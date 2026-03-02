import React, { useState, useEffect } from 'react';
import { Button } from '../../../shared/components/Button';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import {
  dataModelApi,
  type DataModelExtension,
  type CreateDataModelExtensionRequest,
  type UpdateDataModelExtensionRequest,
  type TazamaCollectionName,
  type TazamaFieldType
} from '../services/dataModelApi';

interface ExtensionFormData {
  collection: TazamaCollectionName;
  fieldName: string;
  fieldType: TazamaFieldType;
  description: string;
  isRequired: boolean;
  defaultValue: string;
  validation: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: string[];
  };
}

interface ExtensionManagementProps {
  onExtensionChange?: () => void; // Callback when extensions are modified
}

export const ExtensionManagement: React.FC<ExtensionManagementProps> = ({
  onExtensionChange
}) => {
  const [extensions, setExtensions] = useState<DataModelExtension[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingExtension, setEditingExtension] = useState<number | null>(null);
  const [formData, setFormData] = useState<ExtensionFormData>({
    collection: 'entities',
    fieldName: '',
    fieldType: 'STRING',
    description: '',
    isRequired: false,
    defaultValue: '',
    validation: {}
  });
  const [submitting, setSubmitting] = useState(false);

  const collections: Array<{ value: TazamaCollectionName; label: string }> = [
    { value: 'entities', label: 'Entities' },
    { value: 'accounts', label: 'Accounts' },
    { value: 'account_holder', label: 'Account Holders' },
    { value: 'transactionRelationship', label: 'Transaction Relationships' },
    { value: 'transactionHistory', label: 'Transaction History' }
  ];

  const fieldTypes: Array<{ value: TazamaFieldType; label: string }> = [
    { value: 'STRING', label: 'String' },
    { value: 'NUMBER', label: 'Number' },
    { value: 'BOOLEAN', label: 'Boolean' },
    { value: 'DATE', label: 'Date' },
    { value: 'OBJECT', label: 'Object' },
    { value: 'ARRAY', label: 'Array' }
  ];

  useEffect(() => {
    loadExtensions();
  }, []);

  const loadExtensions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await dataModelApi.getAllExtensions();
      if (response.success && response.extensions) {
        setExtensions(response.extensions);
      } else {
        setError('Failed to load extensions');
      }
    } catch (err) {
      setError('Error loading extensions');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      collection: 'entities',
      fieldName: '',
      fieldType: 'STRING',
      description: '',
      isRequired: false,
      defaultValue: '',
      validation: {}
    });
  };

  const handleCreateExtension = async () => {
    if (!formData.fieldName.trim()) {
      setError('Field name is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const request: CreateDataModelExtensionRequest = {
        collection: formData.collection,
        fieldName: formData.fieldName.trim(),
        fieldType: formData.fieldType,
        description: formData.description.trim() || undefined,
        isRequired: formData.isRequired,
        defaultValue: formData.defaultValue.trim() || undefined,
        validation: Object.keys(formData.validation).length > 0 ? formData.validation : undefined
      };

      const response = await dataModelApi.createExtension(request);

      if (response.success) {
        await loadExtensions();
        setShowCreateForm(false);
        resetForm();
        if (onExtensionChange) {
          onExtensionChange();
        }
      } else {
        setError(response.message || 'Failed to create extension');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(`Error creating extension: ${err.message}`);
      } else {
        setError('Error creating extension: Unknown error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateExtension = async (id: number) => {
    try {
      setSubmitting(true);
      setError(null);

      const request: UpdateDataModelExtensionRequest = {
        description: formData.description.trim() || undefined,
        isRequired: formData.isRequired,
        defaultValue: formData.defaultValue.trim() || undefined,
        validation: Object.keys(formData.validation).length > 0 ? formData.validation : undefined
      };

      const response = await dataModelApi.updateExtension(id, request);
      if (response.success) {
        await loadExtensions();
        setEditingExtension(null);
        resetForm();
        if (onExtensionChange) {
          onExtensionChange();
        }
      } else {
        setError(response.message || 'Failed to update extension');
      }
    } catch (err) {
      setError('Error updating extension');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExtension = async (id: number) => {
    if (!confirm('Are you sure you want to delete this extension? This action cannot be undone.')) {
      return;
    }

    try {
      setError(null);
      const response = await dataModelApi.deleteExtension(id);
      if (response.success) {
        await loadExtensions();
        if (onExtensionChange) {
          onExtensionChange();
        }
      } else {
        setError(response.message || 'Failed to delete extension');
      }
    } catch (err) {
      setError('Error deleting extension');
    }
  };

  const startEditExtension = (extension: DataModelExtension) => {
    setFormData({
      collection: extension.collection,
      fieldName: extension.fieldName,
      fieldType: extension.fieldType,
      description: extension.description || '',
      isRequired: extension.isRequired,
      defaultValue: extension.defaultValue?.toString() || '',
      validation: extension.validation || {}
    });
    setEditingExtension(extension.id);
  };

  const cancelEdit = () => {
    setEditingExtension(null);
    resetForm();
    setError(null);
  };

  const handleFormChange = (field: keyof ExtensionFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleValidationChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      validation: {
        ...prev.validation,
        [field]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading extensions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Data Model Extensions</h3>
        <Button
          onClick={() => { setShowCreateForm(true); }}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Extension
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {showCreateForm && (
        <div className="bg-gray-50 border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold">Create New Extension</h4>
            <button
              onClick={() => {
                setShowCreateForm(false);
                resetForm();
                setError(null);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <ExtensionForm
            formData={formData}
            collections={collections}
            fieldTypes={fieldTypes}
            onFormChange={handleFormChange}
            onValidationChange={handleValidationChange}
            isEditing={false}
          />
          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleCreateExtension}
              disabled={submitting || !formData.fieldName.trim()}
            >
              {submitting ? 'Creating...' : 'Create Extension'}
            </Button>
            <Button
              onClick={() => {
                setShowCreateForm(false);
                resetForm();
                setError(null);
              }}
              variant="secondary"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {extensions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No extensions found. Create your first custom field to extend the data model.
          </div>
        ) : (
          extensions.map((extension) => (
            <div key={extension.id} className="border rounded-lg p-4 bg-white">
              {editingExtension === extension.id ? (
                <div>
                  <h4 className="text-md font-semibold mb-4">Edit Extension</h4>
                  <ExtensionForm
                    formData={formData}
                    collections={collections}
                    fieldTypes={fieldTypes}
                    onFormChange={handleFormChange}
                    onValidationChange={handleValidationChange}
                    isEditing={true}
                  />
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={async () => { await handleUpdateExtension(extension.id); }}
                      disabled={submitting}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {submitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button onClick={cancelEdit} variant="secondary">
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium text-gray-900">
                        {extension.collection}.{extension.fieldName}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {extension.fieldType}
                      </span>
                      {extension.isRequired && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                          Required
                        </span>
                      )}
                    </div>
                    {extension.description && (
                      <p className="text-gray-600 text-sm">{extension.description}</p>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      Created: {new Date(extension.createdAt).toLocaleDateString()}
                      {extension.defaultValue && ` • Default: ${extension.defaultValue}`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { startEditExtension(extension); }}
                      className="p-2 text-gray-400 hover:text-blue-600"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => { await handleDeleteExtension(extension.id); }}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Form component for creating/editing extensions
interface ExtensionFormProps {
  formData: ExtensionFormData;
  collections: Array<{ value: TazamaCollectionName; label: string }>;
  fieldTypes: Array<{ value: TazamaFieldType; label: string }>;
  onFormChange: (field: keyof ExtensionFormData, value: any) => void;
  onValidationChange: (field: string, value: any) => void;
  isEditing: boolean;
}

const ExtensionForm: React.FC<ExtensionFormProps> = ({
  formData,
  collections,
  fieldTypes,
  onFormChange,
  onValidationChange,
  isEditing
}) => (
  <div className="grid grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Collection
      </label>
      <select
        value={formData.collection}
        onChange={(e) => { onFormChange('collection', e.target.value); }}
        disabled={isEditing} // Can't change collection when editing
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
      >
        {collections.map((collection) => (
          <option key={collection.value} value={collection.value}>
            {collection.label}
          </option>
        ))}
      </select>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Field Name
      </label>
      <input
        type="text"
        value={formData.fieldName}
        onChange={(e) => { onFormChange('fieldName', e.target.value); }}
        disabled={isEditing} // Can't change field name when editing
        placeholder="e.g., creditScore"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Field Type
      </label>
      <select
        value={formData.fieldType}
        onChange={(e) => { onFormChange('fieldType', e.target.value); }}
        disabled={isEditing} // Can't change field type when editing
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
      >
        {fieldTypes.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Default Value
      </label>
      <input
        type="text"
        value={formData.defaultValue}
        onChange={(e) => { onFormChange('defaultValue', e.target.value); }}
        placeholder="Optional"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <div className="col-span-2">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Description
      </label>
      <textarea
        value={formData.description}
        onChange={(e) => { onFormChange('description', e.target.value); }}
        placeholder="Describe what this field is for"
        rows={2}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <div className="col-span-2">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.isRequired}
          onChange={(e) => { onFormChange('isRequired', e.target.checked); }}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm font-medium text-gray-700">Required field</span>
      </label>
    </div>

    {/* Validation Rules for Number fields */}
    {formData.fieldType === 'NUMBER' && (
      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Validation Rules
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <input
              type="number"
              value={formData.validation.min || ''}
              onChange={(e) => { onValidationChange('min', e.target.value ? Number(e.target.value) : undefined); }}
              placeholder="Min value"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <input
              type="number"
              value={formData.validation.max || ''}
              onChange={(e) => { onValidationChange('max', e.target.value ? Number(e.target.value) : undefined); }}
              placeholder="Max value"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    )}

    {/* Validation Rules for String fields */}
    {formData.fieldType === 'STRING' && (
      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Pattern Validation (Regex)
        </label>
        <input
          type="text"
          value={formData.validation.pattern || ''}
          onChange={(e) => { onValidationChange('pattern', e.target.value || undefined); }}
          placeholder="e.g., ^[A-Z0-9]{10}$"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    )}
  </div>
);