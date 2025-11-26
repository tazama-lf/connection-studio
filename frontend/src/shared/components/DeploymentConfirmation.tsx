import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  LoaderIcon,
  InfoIcon,
  FileText,
  Shuffle,
  Link2,
  Layers,
  Hash,
  FileType,
  Tag,
} from 'lucide-react';
import { configApi } from '../../features/config/services/configApi';
import ReactJson from 'react-json-view';

interface DeploymentConfirmationProps {
  configId?: number;
  configData?: any; // Fallback data from local state
  endpointPath: string;
  transactionType?: string;
}

export const DeploymentConfirmation: React.FC<DeploymentConfirmationProps> = ({
  configId,
  configData: fallbackConfigData,
  endpointPath,
  transactionType = 'transfers',
}) => {
  const [configData, setConfigData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfigData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log(
          '🔄 Fetching complete config data for deployment confirmation:',
          configId,
        );
        console.log(
          '🔍 ConfigId type:',
          typeof configId,
          'ConfigId value:',
          configId,
        );

        // If we have fallback data and no configId, use the fallback
        if (!configId && fallbackConfigData) {
          console.log('✅ Using fallback config data:', fallbackConfigData);
          setConfigData(fallbackConfigData);
          return;
        }

        if (!configId) {
          console.error('❌ No configId provided to DeploymentConfirmation');
          setError('No configuration ID provided');
          return;
        }

        const response = await configApi.getConfig(configId);
        console.log('🔍 API Response:', response);
        console.log('🔍 Response success:', response.success);
        console.log('🔍 Response config:', response.config);

        if (response.success && response.config) {
          console.log('✅ Config data fetched successfully:', response.config);
          setConfigData(response.config);
        } else {
          console.error('❌ Failed to fetch config data:', response.message);
          console.error('❌ Full response:', response);

          // Check if it's an authentication error and we have fallback data
          if (
            (response.message?.includes('401') ||
              response.message?.includes('Unauthorized') ||
              response.message?.includes('authentication')) &&
            fallbackConfigData
          ) {
            console.log('⚠️ Authentication failed, using fallback data');
            setConfigData(fallbackConfigData);
            setError(null); // Clear error since we have fallback
          } else if (
            response.message?.includes('401') ||
            response.message?.includes('Unauthorized') ||
            response.message?.includes('authentication')
          ) {
            setError('Authentication required. Please log in again.');
          } else {
            setError(response.message || 'Failed to load configuration data');
          }
        }
      } catch (err) {
        console.error('❌ Error fetching config data:', err);

        // If API call fails and we have fallback data, use it
        if (fallbackConfigData) {
          console.log('⚠️ API call failed, using fallback data');
          setConfigData(fallbackConfigData);
          setError(null); // Clear error since we have fallback
        } else {
          setError(
            `Failed to load configuration data: ${err instanceof Error ? err.message : 'Unknown error'}`,
          );
        }
      } finally {
        setLoading(false);
      }
    };

    // Always try to fetch, but use fallback if available
    fetchConfigData();
  }, [configId, fallbackConfigData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoaderIcon className="h-6 w-6 animate-spin text-blue-500 mr-2" />
        <span className="text-gray-600">Loading configuration details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex items-center">
          <div className="text-red-600 mr-2">⚠️</div>
          <div>
            <h4 className="text-sm font-medium text-red-900">
              Error Loading Configuration
            </h4>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!configData) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No configuration data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-id="element-156">
      <div className="flex items-center space-x-2" data-id="element-157">
        <CheckCircleIcon
          className="h-6 w-6 "
          data-id="element-158"
          style={{ color: '#4CAF50' }}
        />
        <h3 className="text-lg font-bold" data-id="element-159">
          {configData?.status === 'approved'
            ? 'Configuration Approved'
            : configData?.status === 'under_review' ||
                configData?.status === 'under review'
              ? 'Pending Review'
              : 'Ready to Submit for Approval'}
        </h3>
      </div>

      <div
        className="bg-gray-50 p-6 rounded-md space-y-6"
        data-id="element-160"
      >
        {/* Endpoint Information */}
        <div data-id="element-161">
          <h4
            style={{ color: '#3b3b3b' }}
            className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"
            data-id="element-162"
          >
            <InfoIcon size={18} className="text-blue-500" /> Endpoint
            Information
          </h4>
          <div className="bg-white p-4 rounded border border-gray-200 space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase tracking-wide">
                  <Link2 size={14} /> Endpoint Path
                </span>
                <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded border border-gray-200">
                  {configData.endpointPath || endpointPath}
                </p>
              </div>
              <div className="space-y-1.5">
                <span className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase tracking-wide">
                  <Layers size={14} /> Transaction Type
                </span>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">
                  {configData.transactionType || transactionType}
                </p>
              </div>
              <div className="space-y-1.5">
                <span className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase tracking-wide">
                  <Hash size={14} /> Version
                </span>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">
                  {configData.version || '1.0'}
                </p>
              </div>
              <div className="space-y-1.5">
                <span className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase tracking-wide">
                  <FileType size={14} /> Content Type
                </span>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">
                  {configData.contentType || 'application/json'}
                </p>
              </div>
            </div>
            {configData.msgFam && (
              <div className="space-y-1.5 mt-2">
                <span className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase tracking-wide">
                  <Tag size={14} /> Event Type
                </span>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">
                  {configData.msgFam}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Payload/Schema */}
        <div>
          <h4
            style={{ color: '#3b3b3b' }}
            className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"
          >
            <FileText size={18} className="text-purple-500" /> Payload & Schema
          </h4>
          <div className="bg-white p-4 rounded border border-gray-200">
            <div className="space-y-4">
              {(configData.schema || configData.payload) && (
                <div className="bg-white h-[400px] overflow-auto">
                  <ReactJson
                    src={configData?.schema || configData?.payload || {}}
                    theme="rjv-default"
                    name={false}
                    displayDataTypes={false}
                    displayObjectSize={true}
                    enableClipboard={true}
                    collapsed={false}
                    style={{ fontSize: '13px' }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mappings */}
        {configData.mapping && configData.mapping.length > 0 && (
          <div>
            <h4
              style={{ color: '#3b3b3b' }}
              className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"
            >
              <Shuffle size={18} className="text-green-600" /> Field Mappings (
              {configData.mapping.length})
            </h4>
            <div className="bg-white p-4 rounded border border-gray-200">
              <div className="space-y-3">
                {configData.mapping.map((mapping: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                        {mapping.transformation || 'DIRECT'}
                      </span>
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">
                          {Array.isArray(mapping.source)
                            ? mapping.source.join(', ')
                            : mapping.source ||
                              mapping.sources?.join(', ') ||
                              'N/A'}
                        </span>
                        <span className="text-gray-500 mx-2">→</span>
                        <span className="font-medium text-gray-900">
                          {Array.isArray(mapping.destination)
                            ? mapping.destination.join(', ')
                            : mapping.destination ||
                              mapping.destinations?.join(', ') ||
                              'N/A'}
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
          </div>
        )}

        {/* Functions */}
        {configData.functions && configData.functions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              ⚙️ Functions ({configData.functions.length})
            </h4>
            <div className="bg-white p-4 rounded border border-gray-200">
              <div className="space-y-3">
                {configData.functions.map((func: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                        {func.functionName}
                      </span>
                      <div className="text-sm text-gray-700">
                        Parameters: {func.params?.join(', ') || 'None'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Status Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <CheckCircleIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4
                style={{ color: '#2b7fff' }}
                className="text-sm font-bold mb-1"
              >
                Configuration Complete
              </h4>
              <p className="text-sm" style={{ color: '#2b7fff' }}>
                Your configuration is ready for approval. It includes:
              </p>
              <ul
                className="text-sm mt-2 space-y-1"
                style={{ color: '#2b7fff' }}
              >
                <li>
                  • Endpoint:{' '}
                  <code className="bg-blue-100 px-1 rounded text-xs">
                    {configData.endpointPath || endpointPath}
                  </code>
                </li>
                {/* <li>• Payload/Schema: {configData.payload ? '✅ Included' : '⚠️ Schema only'}</li> */}
                <li>
                  • Mappings: {configData.mapping?.length || 0} field mappings
                </li>
                <li>
                  • Functions: {configData.functions?.length || 0} runtime
                  functions
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
