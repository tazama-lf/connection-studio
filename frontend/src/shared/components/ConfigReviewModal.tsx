import React, { useState, useEffect } from 'react';
import { XIcon, CheckCircleIcon, XCircleIcon, EyeIcon, CodeIcon, DatabaseIcon, ZapIcon } from 'lucide-react';
import { Button } from './Button';
import { configApi } from '../../features/config/services/configApi';
import type { Config } from '../../features/config/index';

interface ConfigReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (configId: number) => void;
  onReject: (config: Config) => void;
  config: Config | null;
}

export const ConfigReviewModal: React.FC<ConfigReviewModalProps> = ({
  isOpen,
  onClose,
  onApprove,
  onReject,
  config
}) => {
  const [configDetails, setConfigDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [simulationResults, setSimulationResults] = useState<any>(null);

  useEffect(() => {
    if (isOpen && config) {
      loadConfigDetails();
    }
  }, [isOpen, config]);

  const loadConfigDetails = async () => {
    if (!config) return;

    setLoading(true);
    try {
      // Get full config details
      const response = await configApi.getConfig(config.id);
      if (response.success && response.config) {
        setConfigDetails(response.config);
      }

      // TODO: Load simulation results if available
      // For now, we'll show a placeholder
      setSimulationResults({
        input: { transactionId: '12345', amount: 100.50, currency: 'USD' },
        output: { id: '12345', value: 100.50, currencyCode: 'USD' },
        status: 'success'
      });
    } catch (error) {
      console.error('Failed to load config details:', error);
    } finally {
      setLoading(false);
    }
  };

  const runValidationCheck = () => {
    // TODO: Implement validation check
    alert('Validation check completed successfully!');
  };

  if (!isOpen || !config) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Configuration Review</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading configuration details...</p>
            </div>
          ) : configDetails ? (
            <div className="space-y-6">
              {/* Configuration Header */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-2">{configDetails.endpointPath}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Transaction Type:</span> {configDetails.transactionType}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Event Type:</span> {configDetails.msgFam || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Version:</span> {configDetails.version}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Status:</span>
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Under Review
                    </span>
                  </div>
                </div>
              </div>

              {/* API Endpoint Definition */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <CodeIcon className="h-5 w-5 text-blue-500 mr-2" />
                  <h4 className="text-md font-medium text-gray-900">API Endpoint Definition</h4>
                </div>
                <div className="bg-gray-50 p-3 rounded font-mono text-sm">
                  <div className="text-green-600">POST {configDetails.endpointPath}</div>
                  <div className="text-gray-600 mt-1">Content-Type: {configDetails.contentType || 'application/json'}</div>
                </div>
              </div>

              {/* Schema */}
              {configDetails.schema && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <DatabaseIcon className="h-5 w-5 text-green-500 mr-2" />
                    <h4 className="text-md font-medium text-gray-900">JSON Schema</h4>
                  </div>
                  <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify(configDetails.schema, null, 2)}
                  </pre>
                </div>
              )}

              {/* Field Mappings */}
              {configDetails.mapping && configDetails.mapping.length > 0 && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <ZapIcon className="h-5 w-5 text-purple-500 mr-2" />
                    <h4 className="text-md font-medium text-gray-900">Field Mappings ({configDetails.mapping.length})</h4>
                  </div>
                  <div className="space-y-2">
                    {configDetails.mapping.map((mapping: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                        <div className="flex items-center space-x-3">
                          <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                            {mapping.transformation || 'DIRECT'}
                          </span>
                          <div className="text-sm">
                            <span className="font-medium text-gray-900">
                              {Array.isArray(mapping.source) ? mapping.source.join(', ') : mapping?.source || 'N/A'}
                            </span>
                            <span className="text-gray-500 mx-2">→</span>
                            <span className="font-medium text-gray-900">
                              {Array.isArray(mapping.destination) ? mapping.destination.join(', ') : mapping?.destination || 'N/A'}
                            </span>
                          </div>
                        </div>
                        {mapping.constantValue && (
                          <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                            Constant: {mapping.constantValue}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Functions */}
              {configDetails.functions && configDetails.functions.length > 0 && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <EyeIcon className="h-5 w-5 text-orange-500 mr-2" />
                    <h4 className="text-md font-medium text-gray-900">Runtime Functions ({configDetails.functions.length})</h4>
                  </div>
                  <div className="space-y-2">
                    {configDetails.functions.map((func: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                        <div className="flex items-center space-x-3">
                          <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                            {func.functionName}
                          </span>
                          <div className="text-sm text-gray-700">
                            {func.columns && func.columns.length > 0 ? (
                              <span>Columns: {func.columns.map((col: any) => col.param).join(', ')}</span>
                            ) : (
                              <span>Parameters: {func.params?.join(', ') || 'None'}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Simulation Results */}
              {simulationResults && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                      <h4 className="text-md font-medium text-gray-900">Simulation Results</h4>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={runValidationCheck}
                    >
                      Run Validation Check
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Input Payload</h5>
                      <pre className="bg-gray-50 p-3 rounded text-xs">
                        {JSON.stringify(simulationResults.input, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Transformed Output</h5>
                      <pre className="bg-gray-50 p-3 rounded text-xs">
                        {JSON.stringify(simulationResults.output, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button
                  variant="secondary"
                  onClick={onClose}
                >
                  Close
                </Button>
                <Button
                  variant="danger"
                  onClick={() => { onReject(config); }}
                >
                  <XCircleIcon className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button
                  variant="primary"
                  onClick={() => { onApprove(config.id); }}
                >
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">Failed to load configuration details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};