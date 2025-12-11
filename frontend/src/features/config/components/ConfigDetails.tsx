import React, { useState, useEffect } from 'react';
import { XIcon, DatabaseIcon, MapPinIcon, SettingsIcon, CodeIcon, CalendarIcon, UserIcon, EditIcon, SaveIcon } from 'lucide-react';
import { configApi } from '../services/configApi';
import { Button } from '../../../shared/components/Button';

interface Config {
  id: number;
  msgFam: string;
  transactionType: string;
  endpointPath: string;
  version: string;
  contentType: string;
  status: string;
  tenantId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  mapping?: any[];
  schema?: any;
}

interface ConfigDetailsProps {
  configId?: number;
  config?: Config;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (config: Config) => void;
}

export const ConfigDetails: React.FC<ConfigDetailsProps> = ({
  configId,
  config: initialConfig,
  isOpen,
  onClose,
  onEdit
}) => {
  const [config, setConfig] = useState<Config | null>(initialConfig || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Config>>({});
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch config details if only ID is provided
  useEffect(() => {
    const fetchConfigDetails = async () => {
      if (configId && !initialConfig) {
        try {
          setLoading(true);
          setError(null);
          console.log('Fetching config details for ID:', configId);
          
          const response = await configApi.getConfig(configId);
          console.log('Config details response:', response);
          
          if (response.success && response.config) {
            setConfig(response.config);
          } else {
            setError('Failed to load configuration details');
          }
        } catch (error) {
          console.error('Error fetching config details:', error);
          setError('Error loading configuration details');
        } finally {
          setLoading(false);
        }
      } else if (initialConfig) {
        setConfig(initialConfig);
      }
    };

    if (isOpen) {
      fetchConfigDetails();
    }
  }, [configId, initialConfig, isOpen]);

  const handleEditClick = () => {
    if (config) {
      setEditForm({
        msgFam: config.msgFam,
        transactionType: config.transactionType,
        endpointPath: config.endpointPath,
        version: config.version,
        contentType: config.contentType,
        status: config.status
      });
      setIsEditMode(true);
    }
  };

  const handleSave = async () => {
    if (!config || !editForm) return;
    
    try {
      setSaving(true);
      setError(null);
      
      // Create update payload with correct types for API
      // IMPORTANT: Preserve existing mapping when updating form fields only
      const updatePayload: any = {
        msgFam: editForm.msgFam,
        transactionType: editForm.transactionType,
        version: editForm.version,
        contentType: editForm.contentType as 'application/json' | 'application/xml' | undefined,
        endpointPath: editForm.endpointPath,
        status: editForm.status,
        // Preserve the existing mapping to prevent it from being cleared
        mapping: config.mapping,
      };
      
      console.log('Updating config:', config.id, updatePayload);
      const response = await configApi.updateConfig(config.id, updatePayload);
      
      if (response.success && response.config) {
        setConfig(response.config);
        setIsEditMode(false);
        setSuccessMessage('Configuration updated successfully!');
        console.log('Config updated successfully');
        
        // Clear success message and close modal after a brief delay
        setTimeout(() => {
          setSuccessMessage(null);
          onClose();
        }, 1500);
      } else {
        setError('Failed to update configuration');
      }
    } catch (error) {
      console.error('Error updating config:', error);
      setError('Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditMode(false);
    setEditForm({});
    setError(null);
    setSuccessMessage(null);
  };

  const handleFormChange = (field: string, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatJSON = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center">
            <DatabaseIcon className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditMode ? 'Edit Configuration' : 'Configuration Details'}
            </h2>
            {config && (
              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                ID: {config.id}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1 rounded"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading configuration details...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="text-red-800">{error}</div>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
              <div className="text-green-800">{successMessage}</div>
            </div>
          )}





          

          {config && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <SettingsIcon className="h-5 w-5 mr-2" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Event Type</label>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={editForm.msgFam || ''}
                        onChange={(e) => handleFormChange('msgFam', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Event Type"
                      />
                    ) : (
                      <p className="mt-1 text-sm text-gray-900">{config.msgFam || 'Not specified'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Transaction Type</label>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={editForm.transactionType || ''}
                        onChange={(e) => handleFormChange('transactionType', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Transaction Type"
                      />
                    ) : (
                      <p className="mt-1 text-sm text-gray-900">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {config.transactionType}
                        </span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Version</label>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={editForm.version || ''}
                        onChange={(e) => handleFormChange('version', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Version"
                      />
                    ) : (
                      <p className="mt-1 text-sm text-gray-900">{config.version}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Content Type</label>
                    {isEditMode ? (
                      <select
                        value={editForm.contentType || ''}
                        onChange={(e) => handleFormChange('contentType', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="application/json">application/json</option>
                        <option value="application/xml">application/xml</option>
                      </select>
                    ) : (
                      <p className="mt-1 text-sm text-gray-900">{config.contentType}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    {isEditMode ? (
                      <select
                        value={editForm.status || ''}
                        onChange={(e) => handleFormChange('status', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    ) : (
                      <p className="mt-1 text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          config.status === 'active' ? 'bg-green-100 text-green-800' :
                          config.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {config.status}
                        </span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tenant ID</label>
                    <p className="mt-1 text-sm text-gray-900">{config.tenantId}</p>
                  </div>
                </div>
              </div>

              {/* Endpoint Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <MapPinIcon className="h-5 w-5 mr-2" />
                  Endpoint Information
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Endpoint Path</label>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editForm.endpointPath || ''}
                      onChange={(e) => handleFormChange('endpointPath', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
                      placeholder="/api/endpoint/path"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">
                      <code className="bg-white px-2 py-1 rounded border text-xs">
                        {config.endpointPath}
                      </code>
                    </p>
                  )}
                </div>
              </div>

              {/* Schema */}
              {config.schema && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <CodeIcon className="h-5 w-5 mr-2" />
                    Schema Definition
                  </h3>
                  <pre className="bg-white p-4 rounded border text-xs overflow-x-auto text-gray-800">
                    {formatJSON(config.schema)}
                  </pre>
                </div>
              )}

              {/* Field Mappings */}
              {config.mapping && config.mapping.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <MapPinIcon className="h-5 w-5 mr-2" />
                    Field Mappings ({config.mapping.length})
                  </h3>
                  <div className="space-y-2">
                    {config.mapping.map((mapping: any, index: number) => (
                      <div key={index} className="bg-white p-3 rounded border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <code className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {Array.isArray(mapping.source) ? mapping.source.join(' + ') : mapping?.source}
                            </code>
                            <span className="text-gray-400">→</span>
                            <code className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              {mapping.destination}
                            </code>
                          </div>
                          {mapping.separator && (
                            <span className="text-xs text-gray-500">
                              Separator: "{mapping.separator}"
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  Metadata
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <UserIcon className="h-4 w-4 mr-1" />
                      Created By
                    </label>
                    <p className="mt-1 text-sm text-gray-900">{config.createdBy}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Created At</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(config.createdAt)}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(config.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {config && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            {isEditMode ? (
              <>
                <Button variant="secondary" onClick={handleCancel} disabled={saving}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <SaveIcon className="h-4 w-4 mr-1" />
                      Save Changes
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={onClose}>
                  Close
                </Button>
                <Button variant="primary" onClick={handleEditClick}>
                  <EditIcon className="h-4 w-4 mr-1" />
                  Edit Configuration
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigDetails;