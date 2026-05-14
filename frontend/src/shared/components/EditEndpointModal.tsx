import {
  Check,
  Cog,
  FileJson,
  GitBranch,
  PlayCircle,
  PlusIcon,
  Rocket,
  XCircle,
  XIcon,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import * as yup from 'yup';
import { useAuth } from '../../features/auth';
import {
  configApi,
  type ConfigResponse,
  type CreateConfigRequest,
} from '../../features/config/services/configApi';
import {
  addFunction,
  deleteFunction,
} from '../../features/functions/services/functionsApi';
import {
  isApprover,
  isEditor,
  isExporter,
  isPublisher,
} from '../../utils/common/roleUtils';
import { dataModelApi } from '../../features/data-model';
import { useToast } from '../providers/ToastProvider';
import type {
  AllowedFunctionName,
  FunctionDefinition,
} from '../types/functions.types';
import { FUNCTION_CONFIGS } from '../types/functions.types';
import type { InferredField } from '../utils/schemaUtils';
import { convertInferredFieldsToJsonSchema } from '../utils/schemaUtils';
import { isStatus } from '../utils/statusColors';
import { Button } from './Button';
import { DeploymentConfirmation } from './DeploymentConfirmation';
import { MappingUtility } from './MappingUtility';
import { PayloadEditor, type PayloadEditorRef } from './PayloadEditor';
import { SimulationPanel } from './SimulationPanel';

import { Backdrop, Button as MuiButton } from '@mui/material';
import Box from '@mui/material/Box';
import Step from '@mui/material/Step';
import type { StepIconProps } from '@mui/material/StepIcon';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';

// Custom Step Icon Component
const CustomStepIcon = (props: StepIconProps) => {
  const { active, completed, icon } = props;

  const icons: Record<string, React.ReactElement> = {
    1: <FileJson size={24} />,
    2: <GitBranch size={24} />,
    3: <Cog size={24} />,
    4: <PlayCircle size={24} />,
    5: <Rocket size={24} />,
  };

  return (
    <div
      style={{
        color: completed ? '#10b981' : active ? '#2b7fff' : '#9ca3af',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icons[String(icon)]}
    </div>
  );
};

// Function Selection Form Component
interface FunctionSelectionFormProps {
  onAddFunction: (functionData: any, selectedFunction?: any) => void;
  onClose: () => void;
  currentSchema?: any; // Add currentSchema prop
}

const FunctionSelectionForm: React.FC<FunctionSelectionFormProps> = ({
  onAddFunction,
  onClose,
  currentSchema,
}) => {
  const tenantId = useAuth().user?.tenantId ?? '';
  const [selectedFunction, setSelectedFunction] =
    useState<AllowedFunctionName>('addAccount');
  const [selectedConfiguration, setSelectedConfiguration] = useState('');
  const [selectedOptionalParams, setSelectedOptionalParams] = useState<
    string[]
  >([]);
  const [dataModelForm, setDataModelForm] = useState<any>({});
  const [tableNameError, setTableNameError] = useState<string>('');
  const [dataModelJson, setDataModelJson] = useState<Record<
    string,
    any
  > | null>(null);
  const [dataModelLoading, setDataModelLoading] = useState(false);

  useEffect(() => {
    if (selectedFunction === 'addDataModel' && !dataModelJson) {
      setDataModelLoading(true);
      dataModelApi
        .getDestinationFieldsJson()
        .then((response) => {
          if (response.success && response.data) {
            setDataModelJson(response.data as Record<string, any>);
          }
        })
        .catch(() => {
          console.error('Failed to fetch data model fields');
        })
        .finally(() => setDataModelLoading(false));
    }
  }, [selectedFunction]);

  const flattenDataModelJson = (
    obj: Record<string, any>,
    parentPath = '',
    result: {
      path: string;
      type: string;
      parent: string;
      group: 'Data Model';
    }[] = [],
  ): { path: string; type: string; parent: string; group: 'Data Model' }[] => {
    Object.entries(obj).forEach(([key, value]) => {
      const currentPath = parentPath ? `${parentPath}.${key}` : key;
      const isObject =
        value !== null && typeof value === 'object' && !Array.isArray(value);
      const isArray = Array.isArray(value);
      const type = isObject ? 'Object' : isArray ? 'Array' : typeof value;
      result.push({
        path: currentPath,
        type,
        parent: parentPath,
        group: 'Data Model',
      });
      if (isObject) {
        flattenDataModelJson(value, currentPath, result);
      }
    });
    return result;
  };

  const flatDataModelFields = dataModelJson
    ? flattenDataModelJson(dataModelJson)
    : [];

  const getObjectsFromFlatSchema = (
    fields: { path: string; type: string; group: string }[],
  ) =>
    fields
      .filter((f) => f.type.toLowerCase() === 'object')
      .map((f) => ({ label: f.path, value: f.path, group: f.group }));

  const jsonBOptions = () => {
    const payloadFields: { path: string; type: string; group: string }[] = [];

    if (Array.isArray(currentSchema)) {
      currentSchema.forEach((f: any) => {
        if (f.path)
          payloadFields.push({
            path: f.path,
            type: f.type ?? '',
            group: 'Payload',
          });
      });
    } else if (currentSchema?.properties) {
      const traverseSchema = (props: any, parentPath = '') => {
        Object.entries(props).forEach(([key, value]: [string, any]) => {
          const path = parentPath ? `${parentPath}.${key}` : key;
          payloadFields.push({
            path,
            type: value.type ?? 'string',
            group: 'Payload',
          });
          if (value.properties) traverseSchema(value.properties, path);
          else if (value.items?.properties)
            traverseSchema(value.items.properties, `${path}[0]`);
        });
      };
      traverseSchema(currentSchema.properties);
    }

    const excludedTopLevelKeys = ['redis', 'transactiondetails'];
    const filteredDataModelFields = flatDataModelFields.filter(
      (f) => !excludedTopLevelKeys.includes(f.path.split('.')[0].toLowerCase()),
    );

    return [
      ...getObjectsFromFlatSchema(payloadFields),
      ...getObjectsFromFlatSchema(filteredDataModelFields),
    ];
  };

  const getPrimaryKeyOptions = () => {
    if (!dataModelForm?.jsonKey) return [];

    try {
      const parsed = JSON.parse(dataModelForm.jsonKey) as {
        value?: string;
        group?: string;
      };
      const selectedPath = parsed?.value ?? '';
      const selectedGroup = parsed?.group ?? '';
      if (!selectedPath) return [];

      let childFields: { path: string; type: string }[] = [];

      if (selectedGroup === 'Payload') {
        if (Array.isArray(currentSchema)) {
          childFields = currentSchema
            .filter((f: any) => {
              const parent: string = f.parent ?? '';
              const normalizedParent = parent.replace(
                /\.(\d+)(\.|$)/g,
                '[$1]$2',
              );
              return (
                parent === selectedPath || normalizedParent === selectedPath
              );
            })
            .map((f: any) => ({ path: f.path, type: f.type ?? '' }));
        } else if (currentSchema?.properties) {
          const parts = selectedPath.split('.');
          let node: any = currentSchema;
          for (const part of parts) {
            if (!node) break;
            node =
              node.properties?.[part] ?? node.items?.properties?.[part] ?? null;
          }
          if (node?.properties) {
            Object.entries(node.properties).forEach(
              ([key, val]: [string, any]) => {
                childFields.push({ path: key, type: val.type ?? '' });
              },
            );
          }
        }
      } else if (selectedGroup === 'Data Model') {
        childFields = flatDataModelFields
          .filter((f) => f.parent === selectedPath)
          .map((f) => ({ path: f.path, type: f.type }));
      }

      const keyOptions = childFields
        .filter(
          (f) =>
            f.type.toLowerCase() !== 'object' &&
            f.type.toLowerCase() !== 'array',
        )
        .map((f) => {
          const key =
            f.path
              .split('.')
              .pop()
              ?.replace(/\[\d+\]$/, '') ?? f.path;
          return { value: key, label: key, group: 'Fields' };
        });

      return keyOptions;
    } catch {
      return [];
    }
  };

  const functionConfig = FUNCTION_CONFIGS[selectedFunction];
  const handleAddFunction = () => {
    // Special handling for addDataModel function
    if (selectedFunction === 'addDataModel') {
      let jsonKeyparsed: any = {};
      try {
        jsonKeyparsed = JSON.parse(dataModelForm?.jsonKey ?? '{}');
      } catch (error) {
        jsonKeyparsed = {}; // fallback
      }

      const selectedPath = jsonKeyparsed?.value ?? '';
      const selectedGroup = jsonKeyparsed?.group ?? '';
      const datasource = selectedGroup === 'Payload' ? 'payload' : 'dataModel';
      const primaryKeyName = dataModelForm?.primaryKey ?? '';
      const primaryKeyPath =
        selectedPath && primaryKeyName
          ? `${selectedPath}.${primaryKeyName}`
          : primaryKeyName;
      let primaryKeyType = 'string';
      if (primaryKeyName && selectedPath) {
        if (selectedGroup === 'Payload' && Array.isArray(currentSchema)) {
          const field = (currentSchema as any[]).find(
            (f) =>
              f.parent === selectedPath &&
              (f.path === primaryKeyPath ||
                f.path?.split('.').pop() === primaryKeyName),
          );
          if (field?.type) primaryKeyType = field.type.toLowerCase();
        } else if (selectedGroup === 'Data Model') {
          const field = flatDataModelFields.find(
            (f) => f.parent === selectedPath && f.path === primaryKeyPath,
          );
          if (field?.type) primaryKeyType = field.type.toLowerCase();
        }
      }

      // Build payload from dataModelForm
      const payload = {
        columns: [
          {
            name: '_key',
            type: primaryKeyType,
            param: primaryKeyPath,
            datasource,
          },
          {
            name: 'data',
            type: 'jsonb',
            param: selectedPath,
            datasource,
          },
        ],
        tableName: dataModelForm?.tableName ?? '',
        functionName: 'addDataModelTable',
      };

      onAddFunction(payload, selectedFunction);
      return;
    }

    const config = functionConfig.configurations.find(
      (c) => c.name === selectedConfiguration,
    );
    if (!config) {
      return;
    }
    // Combine required parameters from configuration with selected optional parameters
    const requiredParams = config.parameters
      .split(', ')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    const allParams = [...requiredParams, ...selectedOptionalParams];
    // Add prefixes to parameters: 'transactionDetails.' for tenantId, 'redis.' for others
    const prefixedParams = allParams.map((param) => {
      const trimmed = param.trim();
      const lowerParam = trimmed.toLowerCase();
      if (trimmed.includes('.')) {
        return trimmed;
      }
      // Check if it's tenantId (case-insensitive)
      if (selectedFunction === 'saveTransactionDetails') {
        return `transactionDetails.${trimmed}`;
      }
      if (lowerParam === 'tenantid' || lowerParam === 'tenant_id') {
        return `transactionDetails.${trimmed}`;
      } else {
        return `redis.${trimmed}`;
      }
    });
    const functionData = {
      functionName: selectedFunction,
      params: prefixedParams,
    };
    onAddFunction(functionData);
  };
  const handleOptionalParamToggle = (paramName: string) => {
    setSelectedOptionalParams((prev) =>
      prev.includes(paramName)
        ? prev.filter((p) => p !== paramName)
        : [...prev, paramName],
    );
  };

  const handleValidationDataModel = () => {
    if (
      dataModelForm?.tableName &&
      dataModelForm?.primaryKey &&
      dataModelForm?.jsonKey
    ) {
      return true;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Function
        </label>
        <select
          value={selectedFunction}
          onChange={(e) => {
            setSelectedFunction(e.target.value as AllowedFunctionName);
            setSelectedConfiguration('');
            setSelectedOptionalParams([]);
          }}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {Object.values(FUNCTION_CONFIGS)
            .filter((config) => config.name !== 'addDataModelTable')
            .map((config) => (
              <option key={config.name} value={config.name}>
                {config.displayName}
              </option>
            ))}
        </select>
      </div>
      {functionConfig?.dataModelConfiguration &&
        selectedFunction === 'addDataModel' ? (
        <div className="space-y-4 pt-1 border-gray-200">
          <h3 className="text-sm font-medium text-gray-700">
            Data Model Configuration
          </h3>

          {/* Table Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Table Name
            </label>
            <input
              type="text"
              value={dataModelForm?.tableName ?? ''}
              onChange={(e) => {
                const value = e.target.value.toLowerCase();
                setDataModelForm({
                  ...dataModelForm,
                  tableName: value,
                });

                // Validate table name
                const tableNameSchema = yup
                  .string()
                  .required('Table name is required')
                  .matches(
                    /^[a-z_][a-z0-9_]*$/,
                    'Table name must start with a lowercase letter or underscore and contain only lowercase letters, numbers, and underscores',
                  );

                try {
                  tableNameSchema.validateSync(value);
                  setTableNameError('');
                } catch (err) {
                  if (err instanceof yup.ValidationError) {
                    setTableNameError(err.message);
                  }
                }
              }}
              onKeyPress={(e) => {
                // Only allow alphanumeric and underscore
                const char = e.key;
                if (!/[a-zA-Z0-9_]/.test(char)) {
                  e.preventDefault();
                }
              }}
              placeholder="Enter table name"
              className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${tableNameError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
            />
            {tableNameError && (
              <p className="mt-1 text-sm text-red-600">{tableNameError}</p>
            )}
          </div>
          {/* JSON Key Select Field with Dynamic Grouping */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data
            </label>
            <select
              value={dataModelForm?.jsonKey ?? ''}
              onChange={(e) => {
                setDataModelForm({
                  ...dataModelForm,
                  jsonKey: e.target.value,
                  primaryKey: '',
                });
              }}
              disabled={dataModelLoading}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:opacity-50"
            >
              <option value="">Select Data</option>

              {/* Dynamically generate optgroups based on unique groups in jsonBOptions */}
              {Array.from(
                new Set(jsonBOptions().map((opt: any) => opt.group)),
              ).map((groupName: any) => (
                <optgroup key={groupName} label={groupName}>
                  {jsonBOptions()
                    .filter((option: any) => option.group === groupName)
                    .map((option: any) => (
                      <option
                        key={option.value}
                        value={JSON.stringify({
                          value: option.value,
                          label: option.label,
                          group: option.group,
                        })}
                      >
                        {option.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Primary Key Select Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Key
            </label>
            <select
              value={dataModelForm?.primaryKey ?? ''}
              onChange={(e) => {
                setDataModelForm({
                  ...dataModelForm,
                  primaryKey: e.target.value,
                });
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Select Primary Key</option>

              {Array.from(
                new Set(getPrimaryKeyOptions().map((opt: any) => opt.group)),
              ).map((groupName: any) => (
                <optgroup key={groupName} label={groupName}>
                  {getPrimaryKeyOptions()
                    .filter((option: any) => option.group === groupName)
                    .map((option: any) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Parameter Configuration
            </label>
            <div className="space-y-2">
              {functionConfig.configurations.map((config) => (
                <div
                  key={config.name}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedConfiguration === config.name
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                    }`}
                  onClick={() => {
                    setSelectedConfiguration(config.name);
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="configuration"
                      value={config.name}
                      checked={selectedConfiguration === config.name}
                      onChange={() => {
                        setSelectedConfiguration(config.name);
                      }}
                      className="text-blue-600"
                    />
                    <div>
                      <h4 className="font-medium">{config.displayName}</h4>
                      <p className="text-sm text-gray-600">
                        {config.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Optional Parameters Selection */}
          {functionConfig.optionalParameters &&
            functionConfig.optionalParameters.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Optional Parameters (Select any that you need)
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {functionConfig.optionalParameters.map((param) => (
                    <div
                      key={param.name}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedOptionalParams.includes(param.name)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                        }`}
                      onClick={() => {
                        handleOptionalParamToggle(param.name);
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedOptionalParams.includes(param.name)}
                          onChange={() => {
                            handleOptionalParamToggle(param.name);
                          }}
                          className="text-blue-600 rounded"
                        />
                        <div>
                          <h4 className="font-medium">
                            {param.displayName} ({param.name})
                          </h4>
                          <p className="text-sm text-gray-600">
                            {param.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            Type: {param.type}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {selectedOptionalParams.length > 0 && (
                  <p className="text-sm text-blue-600 mt-2">
                    Selected optional parameters:{' '}
                    {selectedOptionalParams.join(', ')}
                  </p>
                )}
              </div>
            )}
        </>
      )}
      <div className="flex justify-end space-x-3 pt-4">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleAddFunction}
          disabled={
            selectedFunction === 'addDataModel'
              ? !handleValidationDataModel()
              : !selectedConfiguration
          }
        >
          Add Function
        </Button>
      </div>
    </div>
  );
};

interface EndpointData {
  version: string;
  transactionType: string;
  description: string;
  contentType: string;
  msgFam?: string;
  relatedTransaction?: string;
}

interface EditEndpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  endpointId: number; // -1 indicates new endpoint creation
  onSuccess?: () => void; // Callback when config is successfully created/updated
  isCloneMode?: boolean; // When true, load config data but treat as new config creation
  isCloneCheck?: boolean;
  setIsInCloneMode?: any;
  readOnly?: boolean; // When true, modal is in read-only mode for approvers
  onRevertToEditor?: () => void; // For approvers to send back to editor
  onSendForDeployment?: () => void; // For approvers to send for deployment
  onNextStep?: () => void; // For approvers to progress to next workflow step
}
const EditEndpointModal: React.FC<EditEndpointModalProps> = ({
  isOpen,
  onClose,
  endpointId,
  onSuccess,
  isCloneMode = false,
  isCloneCheck = false,
  setIsInCloneMode,
  readOnly = false,
  onRevertToEditor,
  onSendForDeployment,
  onNextStep,
}) => {
  const isNewEndpoint = endpointId === -1;
  const isCloning = isCloneMode && endpointId !== -1;
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();
  const tenantId = user?.tenantId ?? 'tenant-id';
  const payloadEditorRef = useRef<PayloadEditorRef>(null);
  const [currentStep, setCurrentStep] = useState<
    'payload' | 'mapping' | 'functions' | 'simulation' | 'deploy'
  >('payload');
  const [payload, setPayload] = useState('');

  const [isMappingValid, setIsMappingValid] = useState(false);
  const [isSimulationSuccess, setIsSimulationSuccess] = useState(false);

  // Endpoint form data from PayloadEditor
  const [endpointData, setEndpointData] = useState<EndpointData>({
    version: '',
    transactionType: '',
    description: '',
    contentType: 'application/json',
  });

  // Current schema from PayloadEditor
  const [currentSchema, setCurrentSchema] = useState<any>(null);

  // Backend integration state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createdEndpoint, setCreatedEndpoint] = useState<any | null>(null);
  const [existingConfig, setExistingConfig] = useState<any | null>(null);
  const [inferredSchema, setInferredSchema] = useState<any | null>(null);

  const shouldCreateNew = !createdEndpoint && !existingConfig && isNewEndpoint;

  const [currentMappings, setCurrentMappings] = useState<any[]>([]); // Current mappings from MappingUtility
  // Function to update current mappings and sync with createdEndpoint
  const updateCurrentMappings = (newMappings: any[]) => {
    setCurrentMappings(newMappings);

    // Also update the createdEndpoint to include the new mappings
    if (createdEndpoint) {
      setCreatedEndpoint({
        ...createdEndpoint,
        mapping: newMappings,
      });
    } else if (existingConfig) {
      setExistingConfig({
        ...existingConfig,
        mapping: newMappings,
      });
    }
  };

  // Functions state
  const [selectedFunctions, setSelectedFunctions] = useState<
    FunctionDefinition[]
  >([]);
  const [showAddFunctionModal, setShowAddFunctionModal] = useState(false);
  const steps = [
    {
      id: 'payload',
      label: 'Payload',
    },
    {
      id: 'mapping',
      label: 'Mapping',
    },
    {
      id: 'functions',
      label: 'Functions',
    },
    {
      id: 'simulation',
      label: 'Dry Run',
    },
    {
      id: 'deploy',
      label: isApprover(user?.claims || [])
        ? 'Send for Deployment'
        : isExporter(user?.claims || [])
          ? 'Export'
          : 'Submit for Approval',
    },
  ];

  // Load existing config data when editing
  useEffect(() => {
    const loadExistingConfig = async () => {
      if (!isNewEndpoint && endpointId && isOpen) {
        try {
          setLoading(true);

          const response = await configApi.getConfig(endpointId);

          // Handle both possible response formats
          let config: any = null;
          if (response.success && response.config) {
            // Wrapped response format
            config = response.config;
          } else if ((response as any).id) {
            // Direct config format - API is returning config directly
            config = response;
          }

          if (config) {
            setExistingConfig(config);

            // Pre-populate form data with existing config
            // For clone mode, adjust version and transaction type to indicate it's a clone
            const isCloning = isCloneMode && endpointId !== -1;
            setEndpointData({
              version: config.version, // Reset version for clones
              transactionType: isCloning
                ? `${config.transactionType}`
                : config.transactionType || '',
              description: config.msgFam || '', // Using msgFam as description since there's no separate description field in backend
              contentType: config.contentType || 'application/json',
              msgFam: config.msgFam || '',
            });

            // Set existing payload if available
            // Note: We store AJV schema in DB, not original payload
            // For now, show the schema - user can modify or replace it
            if (config.payload) {
              // If original payload is stored, use it
              setPayload(config.payload);
            } else if (config.schema) {
              // Otherwise, show the schema (user will need to replace with actual payload for editing)
              setPayload(JSON.stringify(config.schema, null, 2));
            }

            // Initialize currentMappings with existing mappings for consistency
            if (config.mapping && Array.isArray(config.mapping)) {
              setCurrentMappings(config.mapping);
            }

            // Set the existing config as the "created" endpoint for all subsequent steps
            setCreatedEndpoint(config);
            setInferredSchema(config);

            // Load existing functions if available
            if (config.functions && Array.isArray(config.functions)) {
              setSelectedFunctions(config.functions);
            }
          } else {
            showError(
              'Configuration Error',
              'No configuration data found for this endpoint',
            );
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          showError('Failed to Load Configuration', errorMessage);
        } finally {
          setLoading(false);
        }
      }
    };

    loadExistingConfig();
  }, [endpointId, isNewEndpoint, isOpen]);

  // Functions step handlers
  const handleAddFunction = async (
    functionData: any,
    selectedFunction: any,
  ) => {
    if (!createdEndpoint?.id && !existingConfig?.id) {
      showError('No configuration ID available to add function');
      return;
    }

    // Check if saveTransactionDetails already exists - only allow once
    if (functionData.functionName === 'saveTransactionDetails') {
      const existingSaveTransaction = selectedFunctions.find(
        (func) => func.functionName === 'saveTransactionDetails',
      );
      if (existingSaveTransaction) {
        showError(
          'Save Transaction Details can only be added once. If you need different optional parameters, please remove the existing function first and add it again',
        );
        return;
      }
    }

    if (selectedFunction !== 'addDataModel') {
      // Check for duplicate functions in local state first
      const isDuplicate = selectedFunctions.some((existingFunction) => {
        // Check if function name matches
        if (existingFunction.functionName !== functionData.functionName) {
          return false;
        }
        // Check if parameters match (order doesn't matter)
        const existingParams = existingFunction.params || [];
        const newParams = functionData.params || [];
        if (existingParams.length !== newParams.length) {
          return false;
        }
        // Sort both parameter arrays and compare
        const sortedExisting = [...existingParams].sort();
        const sortedNew = [...newParams].sort();
        return sortedExisting.every(
          (param, index) => param === sortedNew[index],
        );
      });
      if (isDuplicate) {
        showError(
          'This function with the same parameters already exists. Please modify the parameters or choose a different function.',
        );
        return;
      }
    }
    try {
      setLoading(true);
      const configId = createdEndpoint?.id || existingConfig?.id;
      const response = await addFunction(configId, functionData);
      if (response.success) {
        // Add to local state only after successful API call
        const newFunction: FunctionDefinition = {
          functionName: functionData.functionName,
          params: functionData.params,
        };
        if (selectedFunction === 'addDataModel') {
          setSelectedFunctions([...selectedFunctions, functionData]);
        } else {
          setSelectedFunctions([...selectedFunctions, newFunction]);
        }
        setShowAddFunctionModal(false);
      } else {
        showError(`Failed to add function: ${response.message}`);
      }
    } catch (error) {
      showError('Failed to add function. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFunction = async (index: number) => {
    if (!createdEndpoint?.id && !existingConfig?.id) {
      showError('No configuration ID available to remove function');
      return;
    }
    try {
      setLoading(true);
      const configId = createdEndpoint?.id || existingConfig?.id;
      const response = await deleteFunction(configId, index);
      if (response.success) {
        // Update local state
        const updatedFunctions = selectedFunctions.filter(
          (_, i) => i !== index,
        );
        setSelectedFunctions(updatedFunctions);
        // Update the config in state
        if (createdEndpoint) {
          setCreatedEndpoint({
            ...createdEndpoint,
            functions: updatedFunctions,
          });
        } else if (existingConfig) {
          setExistingConfig({
            ...existingConfig,
            functions: updatedFunctions,
          });
        }
      } else {
        showError(`Failed to remove function: ${response.message}`);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred';
      showError(`Failed to remove function: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Validate that all function parameters have corresponding mappings
  const validateFunctionParameters = (): string[] => {
    const errors: string[] = [];

    if (selectedFunctions.length === 0) {
      // No functions to validate
      return errors;
    }

    // Runtime context fields that are provided at execution time, not from mappings
    const runtimeContextFields = ['tenantid', 'tenant_id', 'userid', 'user_id'];

    // Extract all destination fields from currentMappings (store in lowercase for case-insensitive comparison)
    // Keep the full destination with prefix for exact matching (e.g., transactionDetails.CreDtTm vs redis.creDtTm)
    const mappedDestinations = new Set<string>();
    const mappedDestinationsOriginal = new Map<string, string>(); // Map lowercase -> original case

    currentMappings.forEach((mapping: any) => {
      const processDestination = (dest: string) => {
        // Store full destination (with prefix) in lowercase for exact matching
        const lowerDest = dest.toLowerCase();
        mappedDestinations.add(lowerDest);
        mappedDestinationsOriginal.set(lowerDest, dest); // Store original with prefix for logging
      };

      if (mapping.destination) {
        // Handle both single destination and array of destinations
        if (Array.isArray(mapping.destination)) {
          mapping.destination.forEach((dest: string) => {
            processDestination(dest);
          });
        } else {
          processDestination(mapping.destination);
        }
      }
    });

    // Check each function's parameters
    selectedFunctions.forEach((func, funcIndex) => {
      if (func.columns) return;

      const functionConfig = FUNCTION_CONFIGS[func.functionName];

      if (!functionConfig) {
        errors.push(
          `⚠️ Function #${funcIndex + 1} (${func.functionName}): Unknown function configuration`,
        );
        return;
      }

      // Check each parameter
      func?.params?.forEach((param: any) => {
        // Compare full parameter name (with prefix) for exact matching
        const paramLower = param.toLowerCase();
        // Also check without prefix for runtime context fields
        const paramWithoutPrefix = param.replace(
          /^(redis\.|transactionDetails\.|dataCache\.|transaction\.|cache\.)/i,
          '',
        );
        const paramWithoutPrefixLower = paramWithoutPrefix.toLowerCase();

        // Skip runtime context fields - they're provided at execution time
        if (runtimeContextFields.includes(paramWithoutPrefixLower)) {
          return;
        }

        // Check if parameter is mapped (case-insensitive, with full prefix)
        if (!mappedDestinations.has(paramLower)) {
          errors.push(
            `❌ Function "${functionConfig.displayName}": Parameter "${param}" is not mapped. ` +
            `Please create a mapping with destination "${param}" in the Mapping step.`,
          );
        }
      });
    });

    return errors;
  };

  // Step 4: Submit for Approval (simulation is handled by SimulationPanel)
  const handleRunSimulation = async () => {
    if (!isSimulationSuccess) {
      setError('Please run the simulation first and ensure it passes');
      return;
    }

    // Simply move to the next step since simulation is handled by SimulationPanel
    setError(null); // Clear any previous errors before moving to next step
    setCurrentStep('deploy');
  };

  // Step 4: Submit for Approval
  const handleDeploy = async () => {
    if (!createdEndpoint?.id) {
      setError('Endpoint must be created first');
      return;
    }

    // Check if mappings exist in the database
    try {
      const configResponse = await configApi.getConfig(createdEndpoint.id);

      if (!configResponse.success) {
        return;
      }
    } catch (error) {
      setError('Failed to validate mappings. Please try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Submit the configuration for approval or deployment based on user role
      let response: ConfigResponse;
      const isUserApprover = isApprover(user?.claims || []);

      if (isUserApprover) {
        // Approvers send for deployment
        // Check current config status
        const configResponse = await configApi.getConfig(createdEndpoint.id);
        if (!configResponse.success || !configResponse.config) {
          throw new Error('Failed to get config status');
        }

        const currentStatus = configResponse.config.status;
        // If config is under_review, just approve it (set to approved)
        if (currentStatus === 'STATUS_03_UNDER_REVIEW') {
          response = await configApi.approveConfig(createdEndpoint.id);
        } else {
          // For other statuses, deploy if possible
          response = await configApi.deployConfig(createdEndpoint.id);
        }
      } else {
        // Editors submit for approval
        response = await configApi.submitForApproval(
          createdEndpoint.id,
          user?.id || 'unknown',
          'editor',
        );
      }

      if (response.success) {
        const successMessage = isUserApprover
          ? 'Configuration sent for deployment successfully!'
          : 'Configuration submitted for approval successfully!';
        showSuccess(successMessage);

        // Close modal and refresh parent component
        onClose();
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(`Failed to submit: ${response.message}`);
      }
    } catch (err) {
      setError(`Submission failed: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndNext = async () => {
    // Handle deploy step separately
    if (currentStep === 'deploy') {
      await handleDeploy();
      return;
    }

    // For non-payload steps, just validate and navigate (data is saved separately)
    if (currentStep !== 'payload') {
      // Clear any previous errors
      setError(null);

      switch (currentStep) {
        case 'mapping': {
          if (!isMappingValid) {
            showError('Please complete the mapping before proceeding');
            return;
          }
          const getDestsSaveAndNext = (
            mapping: (typeof currentMappings)[number],
          ) =>
            Array.isArray(mapping.destination)
              ? mapping.destination
              : mapping.destination
                ? [mapping.destination]
                : [];
          const hasMsgIdMapping = currentMappings.some((mapping) =>
            getDestsSaveAndNext(mapping).some(
              (dest: string) =>
                dest.toLowerCase() === 'transactiondetails.msgid',
            ),
          );
          const hasCreDtTmMapping = currentMappings.some((mapping) =>
            getDestsSaveAndNext(mapping).some(
              (dest: string) =>
                dest.toLowerCase() === 'transactiondetails.credttm',
            ),
          );
          if (!hasMsgIdMapping && !hasCreDtTmMapping) {
            showError(
              'Mappings for "transactionDetails.msgId" and "transactionDetails.CreDtTm" are both required. Please map source fields to these destinations before proceeding.',
            );
            return;
          }
          if (!hasMsgIdMapping) {
            showError(
              'Mapping for "transactionDetails.msgId" is required. Please map a source field to "transactionDetails.msgId" before proceeding.',
            );
            return;
          }
          if (!hasCreDtTmMapping) {
            console.log('Current mappings:', currentMappings);
            showError(
              'Mapping for "transactionDetails.CreDtTm" is required. Please map a source field to "transactionDetails.CreDtTm" before proceeding.',
            );
            return;
          }
          setCurrentStep('functions');
          break;
        }
        case 'functions':
          setCurrentStep('simulation');
          break;
        case 'simulation':
          if (!isSimulationSuccess && !readOnly) {
            showError('Please run and pass simulation before proceeding');
            return;
          }
          setCurrentStep('deploy');
          break;
        default:
          break;
      }
      return;
    }

    // From here on, we're handling the payload step
    // Only validate payload editor fields when on the payload step
    const isValid = payloadEditorRef.current?.validateAllFields();

    if (!isValid) {
      setTimeout(() => {
        const errorElement = document.querySelector('#payloadFields');
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);

      return;
    }

    const validationErrors: string[] = [];
    let parsedPayload: any = null;

    if (!payload) {
      validationErrors.push('Payload is required');
    }

    if (endpointData.contentType === 'application/json') {
      try {
        if (typeof payload === 'string') {
          const trimmedPayload = payload.trim();
          parsedPayload = JSON.parse(trimmedPayload);
        } else {
          parsedPayload = payload;
        }
      } catch (e) {
        const error = e as Error;
        validationErrors.push(`Invalid JSON format: ${error.message}`);
      }
    }

    const hasGeneratedFields =
      currentSchema &&
      ((Array.isArray(currentSchema) && currentSchema.length > 0) || // InferredField[] array
        (currentSchema.properties &&
          Object.keys(currentSchema.properties).length > 0)); // JSON Schema object

    if (!hasGeneratedFields) {
      validationErrors.push(
        'Please generate fields from your payload before saving',
      );
    }

    if (validationErrors.length > 0) {
      const errorMessage = validationErrors.join('. ');
      setError(errorMessage);

      setTimeout(() => {
        const errorElement = document.querySelector('#payloadFields');
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);

      return;
    }

    setLoading(true);
    setError(null);

    try {
      let saveResponse: ConfigResponse;

      const createRequest: CreateConfigRequest = {
        msgFam: endpointData.msgFam?.trim() || undefined,
        transactionType: endpointData.transactionType,
        version: endpointData.version,
        contentType: endpointData.contentType as
          | 'application/json'
          | 'application/xml',
        payload:
          endpointData.contentType === 'application/json'
            ? parsedPayload
            : payload,
        related_transaction:
          endpointData.relatedTransaction?.trim() || undefined,
      };

      let finalSchema = currentSchema;

      if (finalSchema && Array.isArray(finalSchema)) {
        if (finalSchema.length === 0) {
          setError(
            'Schema fields were lost. Please go back to step 1, regenerate fields from your payload, and try again.',
          );
          setLoading(false);
          return;
        }

        finalSchema = convertInferredFieldsToJsonSchema(
          finalSchema as InferredField[],
        );
      }

      if (!existingConfig?.schema && payload.trim()) {
        try {
        } catch (error) {
          finalSchema = existingConfig?.schema;
        }
      }

      if (!finalSchema && existingConfig?.schema) {
        finalSchema = existingConfig.schema;
      }

      if (finalSchema) {
        createRequest.schema = finalSchema;
      }

      const actualConfigId =
        createdEndpoint?.id || existingConfig?.id || endpointId;
      const shouldCreate = !createdEndpoint && !existingConfig && isNewEndpoint;
      const isCloningOperation = isCloning && existingConfig;
      const action = shouldCreate || isCloningOperation ? 'create' : 'update';

      if (shouldCreate || isCloningOperation || isCloneMode) {
        saveResponse = await configApi.createConfig({
          ...createRequest,
          mapping: existingConfig?.mapping,
          functions: existingConfig?.functions,
        });
      } else {
        const { payload: _omitted, ...updateRequest } = createRequest;
        saveResponse = await configApi.updateConfig(
          actualConfigId,
          updateRequest,
        );
      }

      if (saveResponse?.statusCode === 400) {
        showError(saveResponse.message);
      }

      if (!saveResponse.success) {
        // Check for specific error messages that need user-friendly handling
        const errorMessage =
          saveResponse.message || `Failed to ${action} configuration`;

        setError(errorMessage);
        return;
      }

      if (saveResponse.config) {
        setIsInCloneMode(false);
        setCreatedEndpoint(saveResponse.config);
        setInferredSchema(saveResponse.config.schema);

        // Since we're only saving on payload step, advance to mapping
        setError(null);
        setCurrentStep('mapping');
        showSuccess('Configuration saved successfully!');

        // Call success callback to refresh parent data (after UI updates)
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const action = isNewEndpoint ? 'saved' : 'updated';
        setError(`Configuration ${action} but no config data returned`);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred';
      const action = isNewEndpoint ? 'save' : 'update';
      setError(`Failed to ${action} configuration: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Navigation functions for view mode
  const handleNext = () => {
    const currentIndex = steps.findIndex((s) => s.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setError(null); // Clear any previous errors when navigating
      setCurrentStep(steps[currentIndex + 1].id as any);
      onNextStep?.(); // Call parent callback if provided
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Enhanced blurred backdrop */}
      <Backdrop
        sx={(theme) => ({
          zIndex: theme.zIndex.drawer + 1,
          overflow: 'hidden',
        })}
        open={true}
      >
        {/* Modal Content - Higher z-index to appear above backdrop */}
        <div
          className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] min-h-[600px] overflow-hidden relative z-50 shadow-2xl flex flex-col"
          data-id="element-727"
        >
          <div
            className="flex justify-between items-center px-6 py-4 border-b border-gray-200"
            data-id="element-728"
          >
            <h2
              className="text-xl font-semibold text-[#2b7fff]"
              data-id="element-729"
            >
              {isNewEndpoint
                ? 'Create New Connection'
                : isCloneCheck
                  ? 'Clone Configuration'
                  : readOnly
                    ? 'View Configuration'
                    : 'Edit Configuration'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              data-id="element-730"
            >
              <XIcon size={24} data-id="element-731" />
            </button>
          </div>
          <div
            className="overflow-y-auto p-6 flex-1 min-h-0"
            data-id="element-732"
          >
            {/* Show rejection comment when status is STATUS_05_REJECTED */}
            {(isStatus(createdEndpoint?.status, 'STATUS_05_REJECTED') ||
              isStatus(existingConfig?.status, 'STATUS_05_REJECTED')) &&
              (createdEndpoint?.comments || existingConfig?.comments) && (
                <div className="my-2 mb-10 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg
                        className="w-5 h-5 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-red-800 mb-1">
                        Rejection Comment
                      </h4>
                      <p className="text-sm text-red-700">
                        {createdEndpoint?.comments ||
                          existingConfig?.comments ||
                          'No comment provided.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {/* Show approval comment when status is STATUS_04_APPROVED */}
            {!isCloneCheck &&
              (isStatus(createdEndpoint?.status, 'STATUS_04_APPROVED') ||
                isStatus(existingConfig?.status, 'STATUS_04_APPROVED')) &&
              (createdEndpoint?.comments || existingConfig?.comments) && (
                <div className="my-2 mb-10 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg
                        className="w-5 h-5 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-green-800 mb-1">
                        Approval Comment
                      </h4>
                      <p className="text-sm text-green-700">
                        {createdEndpoint?.comments ||
                          existingConfig?.comments ||
                          'No comment provided.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {/* MUI Stepper */}
            <Box sx={{ width: '100%', mb: 4 }} id="payloadFields">
              <Stepper
                activeStep={steps.findIndex((s) => s.id === currentStep)}
                alternativeLabel
              >
                {steps.map((step, index) => {
                  const currentStepIndex = steps.findIndex(
                    (s) => s.id === currentStep,
                  );
                  const isCurrentStep = index === currentStepIndex;
                  const isCompletedStep = index < currentStepIndex;
                  const isFutureStep = index > currentStepIndex;

                  return (
                    <Step key={step.id}>
                      <StepLabel
                        StepIconComponent={CustomStepIcon}
                        sx={{
                          '& .MuiStepLabel-label': {
                            color: isCurrentStep
                              ? '#2b7fff'
                              : isCompletedStep
                                ? '#10b981'
                                : '#999999',
                          },
                        }}
                      >
                        {step.label}
                      </StepLabel>
                    </Step>
                  );
                })}
              </Stepper>
            </Box>

            <div className="space-y-8" data-id="element-739">
              {currentStep === 'payload' && (
                <>
                  <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <FileJson
                      size={24}
                      style={{
                        color:
                          currentStep === 'payload' ? '#2b7fff' : '#9ca3af',
                      }}
                    />{' '}
                    Payload & Schema
                  </h3>
                  <PayloadEditor
                    ref={payloadEditorRef}
                    value={payload}
                    onChange={setPayload}
                    endpointData={endpointData}
                    onEndpointDataChange={setEndpointData}
                    onSchemaChange={setCurrentSchema}
                    configId={createdEndpoint?.id || existingConfig?.id}
                    isEditMode={!isNewEndpoint} // Only allow editing for truly new endpoints (not clone or edit)
                    tenantId={tenantId}
                    readOnly={readOnly}
                    isCloning={isCloning}
                    shouldCreateNew={shouldCreateNew}
                    payloadError={error}
                    setPayloadError={setError}
                    existingSchemaFields={(() => {
                      if (currentSchema) {
                        if (Array.isArray(currentSchema)) {
                          return currentSchema;
                        }
                      }

                      const schemaToUse =
                        createdEndpoint?.schema ||
                        inferredSchema ||
                        existingConfig?.schema;

                      if (!schemaToUse) {
                        return undefined;
                      }
                      const convertAjvToSchemaFields = (
                        ajvSchema: any,
                        parentPath = '',
                      ): any[] => {
                        if (!ajvSchema || typeof ajvSchema !== 'object') {
                          return [];
                        }

                        const schemaFields: any[] = [];

                        if (ajvSchema.properties) {
                          Object.entries(ajvSchema.properties).forEach(
                            ([fieldName, fieldSchema]: [string, any]) => {
                              const fieldPath = parentPath
                                ? `${parentPath}.${fieldName}`
                                : fieldName;

                              let fieldType = 'string';
                              if (fieldSchema.type) {
                                switch (fieldSchema.type) {
                                  case 'string':
                                    fieldType = 'string';
                                    break;
                                  case 'number':
                                  case 'integer':
                                    fieldType = 'number';
                                    break;
                                  case 'boolean':
                                    fieldType = 'boolean';
                                    break;
                                  case 'object':
                                    fieldType = 'object';
                                    break;
                                  case 'array':
                                    fieldType = 'array';
                                    break;
                                  default:
                                    fieldType = 'string';
                                }
                              }

                              const schemaField: any = {
                                name: fieldName,
                                path: fieldPath,
                                type: fieldType,
                                isRequired:
                                  ajvSchema.required?.includes(fieldName) ||
                                  false,
                              };

                              // Handle nested objects
                              if (
                                fieldType === 'object' &&
                                fieldSchema.properties
                              ) {
                                schemaField.children = convertAjvToSchemaFields(
                                  fieldSchema,
                                  fieldPath,
                                );
                              }

                              // Handle arrays with object items
                              if (fieldType === 'array' && fieldSchema.items) {
                                if (
                                  fieldSchema.items.type === 'object' &&
                                  fieldSchema.items.properties
                                ) {
                                  schemaField.arrayElementType = 'object';
                                  // For array elements, append [0] to the path for proper display
                                  schemaField.children =
                                    convertAjvToSchemaFields(
                                      fieldSchema.items,
                                      `${fieldPath}[0]`,
                                    );
                                } else {
                                  schemaField.arrayElementType =
                                    fieldSchema.items.type || 'string';
                                }
                              }

                              schemaFields.push(schemaField);
                            },
                          );
                        }

                        return schemaFields;
                      };

                      const convertedFields =
                        convertAjvToSchemaFields(schemaToUse);
                      return convertedFields;
                    })()}
                    data-id="element-740"
                  />
                </>
              )}
              {currentStep === 'mapping' && (
                <>
                  <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <GitBranch
                      size={24}
                      style={{
                        color:
                          currentStep === 'mapping' ? '#2b7fff' : '#9ca3af',
                      }}
                    />{' '}
                    Field Mappings
                  </h3>
                  <MappingUtility
                    onMappingChange={setIsMappingValid}
                    onCurrentMappingsChange={updateCurrentMappings}
                    sourceSchema={
                      currentSchema ||
                      createdEndpoint?.schema ||
                      inferredSchema?.schema ||
                      existingConfig?.schema
                    }
                    templateType="Acmt.023"
                    configId={createdEndpoint?.id || existingConfig?.id}
                    existingMappings={
                      // Priority: currentMappings (most recent) > createdEndpoint.mapping > existingConfig.mapping > empty array
                      currentMappings.length > 0
                        ? currentMappings
                        : !isNewEndpoint && existingConfig?.mapping
                          ? existingConfig.mapping
                          : createdEndpoint?.mapping || []
                    }
                    readOnly={readOnly}
                    data-id="element-741"
                  />
                </>
              )}
              {currentStep === 'functions' && (
                <>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                      <Cog
                        size={24}
                        style={{
                          color:
                            currentStep === 'functions' ? '#2b7fff' : '#9ca3af',
                        }}
                      />{' '}
                      Select Functions
                    </h3>

                    {/* Validation Warning - Show if there are unmapped parameters (only for editors, not approvers/viewers) */}
                    {!readOnly &&
                      selectedFunctions.length > 0 &&
                      (() => {
                        const validationErrors = validateFunctionParameters();
                        if (validationErrors.length > 0) {
                          return;
                        }
                        return (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <svg
                                className="w-5 h-5 text-green-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <p className="text-sm text-green-700 font-medium">
                                All function parameters are properly mapped
                              </p>
                            </div>
                          </div>
                        );
                      })()}

                    {/* Add Function Button - Only show when not read-only */}
                    {!readOnly && (
                      <div className="flex justify-end">
                        <Button
                          onClick={() => {
                            setShowAddFunctionModal(true);
                          }}
                          variant="secondary"
                          size="sm"
                          icon={<PlusIcon size={16} />}
                        >
                          Add Function
                        </Button>
                      </div>
                    )}

                    {/* Functions List */}
                    <div className="space-y-3">
                      {selectedFunctions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <Cog
                            size={36}
                            className="mb-3 text-blue-400 animate-spin-slow"
                          />
                          <p className="text-lg font-semibold text-gray-700 mb-2">
                            No Functions Selected
                          </p>
                          <p className="text-gray-500 text-sm max-w-md">
                            {!readOnly
                              ? 'Click "Add Function" to select and configure runtime functions for your transformation. Functions allow you to enrich, validate, or transform your data as it flows through the pipeline.'
                              : 'No functions are configured for this connection.'}
                          </p>
                        </div>
                      ) : (
                        selectedFunctions.map((func, index) => {
                          // Check which parameters are missing mappings for this function (case-insensitive, strip prefixes)
                          // Note: tenantId is NOT included in runtime context because it should be mapped from source fields
                          const runtimeContextFields = ['userid', 'user_id'];
                          const mappedDestinations = new Set<string>();

                          currentMappings.forEach((mapping: any) => {
                            const processDestination = (dest: string) => {
                              // Store the full destination (with prefix) in lowercase for exact matching
                              mappedDestinations.add(dest.toLowerCase());
                            };

                            if (mapping.destination) {
                              if (Array.isArray(mapping.destination)) {
                                mapping.destination.forEach((dest: string) => {
                                  processDestination(dest);
                                });
                              } else {
                                processDestination(mapping.destination);
                              }
                            }
                          });

                          const unmappedParams =
                            func.params && func.params.length > 0
                              ? func.params.filter((param: string) => {
                                // Compare full parameter name (with prefix) for exact matching
                                const paramLower = param.toLowerCase();
                                // Also check without prefix for the parameter name itself (for runtime context)
                                const paramWithoutPrefix = param
                                  .replace(
                                    /^(redis\.|transactionDetails\.|dataCache\.|transaction\.|cache\.)/i,
                                    '',
                                  )
                                  .toLowerCase();
                                return (
                                  !runtimeContextFields.includes(
                                    paramWithoutPrefix,
                                  ) && !mappedDestinations.has(paramLower)
                                );
                              })
                              : [];

                          return (
                            <div
                              key={index}
                              className={`p-4 rounded-lg border flex justify-between items-center ${unmappedParams?.length > 0
                                  ? 'bg-red-50 border-red-200'
                                  : 'bg-gray-50 border-gray-200'
                                }`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">
                                    {func.functionName}
                                  </h4>
                                  {unmappedParams?.length > 0 && (
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                                      {unmappedParams.length} unmapped
                                    </span>
                                  )}
                                </div>
                                {func?.tableName && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    Table Name: {func.tableName}
                                  </p>
                                )}
                                <p className="text-sm text-gray-600 mt-1">
                                  Parameters:{' '}
                                  {func?.params && func.params.length > 0
                                    ? func.params
                                      .map((param: string) => {
                                        // Check with full parameter name (including prefix)
                                        const paramLower =
                                          param.toLowerCase();
                                        const paramWithoutPrefix = param
                                          .replace(
                                            /^(redis\.|transactionDetails\.|dataCache\.|transaction\.|cache\.)/i,
                                            '',
                                          )
                                          .toLowerCase();
                                        const isMapped =
                                          runtimeContextFields.includes(
                                            paramWithoutPrefix,
                                          ) ||
                                          mappedDestinations.has(paramLower);
                                        const isRuntime =
                                          runtimeContextFields.includes(
                                            paramWithoutPrefix,
                                          );
                                        return (
                                          <span
                                            key={param}
                                            className={
                                              isRuntime
                                                ? 'text-blue-600'
                                                : isMapped
                                                  ? 'text-green-600'
                                                  : 'text-red-600 font-medium'
                                            }
                                            title={
                                              isRuntime
                                                ? 'Runtime context field'
                                                : isMapped
                                                  ? 'Mapped'
                                                  : 'Not mapped - please create a mapping for this parameter'
                                            }
                                          >
                                            {param}
                                          </span>
                                        );
                                      })
                                      .reduce(
                                        (prev: any, curr: any) =>
                                          [prev, ', ', curr] as any,
                                      )
                                    : func?.columns && func.columns.length > 0
                                      ? func.columns
                                        .map((column) => (
                                          <span className="text-green-600">
                                            {column.param}
                                          </span>
                                        ))
                                        .reduce(
                                          (prev, curr) =>
                                            [prev, ', ', curr] as any,
                                        )
                                      : 'No parameters'}
                                </p>
                                {unmappedParams?.length > 0 && (
                                  <p className="text-xs text-red-600 mt-2">
                                    ⚠️ Missing mappings:{' '}
                                    {unmappedParams.join(', ')}
                                  </p>
                                )}
                              </div>
                              {/* Remove button - Only show when not read-only */}
                              {!readOnly && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={async () => {
                                    await handleRemoveFunction(index);
                                  }}
                                  className="text-red-500 hover:bg-red-500 hover:text-white"
                                >
                                  Remove
                                </Button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Add Function Modal */}
                  {showAddFunctionModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                      {/* Enhanced blurred backdrop - matching other modals */}
                      {/* <div
                      className="fixed inset-0 backdrop-blur-sm backdrop-saturate-150 z-40"
                      onClick={() => setShowAddFunctionModal(false)}
                    /> */}
                      <Backdrop
                        sx={(theme) => ({
                          zIndex: theme.zIndex.drawer + 1,
                          overflow: 'hidden',
                        })}
                        open={true}
                      >
                        {/* Modal Content - Higher z-index to appear above backdrop */}
                        <div className="bg-white rounded-lg p-6 w-full max-w-2xl relative z-50 shadow-2xl">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">
                              Add Function
                            </h3>
                            <button
                              onClick={() => {
                                setShowAddFunctionModal(false);
                              }}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              <XIcon className="w-5 h-5" />
                            </button>
                          </div>

                          <FunctionSelectionForm
                            onAddFunction={handleAddFunction}
                            onClose={() => {
                              setShowAddFunctionModal(false);
                            }}
                            currentSchema={currentSchema}
                          />
                        </div>
                      </Backdrop>
                    </div>
                  )}
                </>
              )}
              {currentStep === 'simulation' && (
                <>
                  <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <PlayCircle
                      size={24}
                      style={{
                        color:
                          currentStep === 'simulation' ? '#2b7fff' : '#9ca3af',
                      }}
                    />{' '}
                    Dry Run
                  </h3>
                  <SimulationPanel
                    endpointId={createdEndpoint?.id || existingConfig?.id}
                    contentType={
                      endpointData.contentType as
                      | 'application/json'
                      | 'application/xml'
                    }
                    onSimulationComplete={setIsSimulationSuccess}
                    readOnly={readOnly}
                    data-id="element-742"
                  />
                </>
              )}
              {currentStep === 'deploy' &&
                (() => {
                  const configId = createdEndpoint?.id || existingConfig?.id;
                  const endpointPath =
                    createdEndpoint?.endpointPath ||
                    existingConfig?.endpointPath ||
                    '/transactions/acmt.023';
                  const configData = createdEndpoint || existingConfig;
                  return (
                    <DeploymentConfirmation
                      configId={configId}
                      configData={configData}
                      endpointPath={endpointPath}
                      transactionType={endpointData.transactionType}
                      data-id="element-743"
                    />
                  );
                })()}
            </div>
          </div>
          <div
            className="px-6 py-3 border-t border-gray-200 flex justify-between sticky bottom-0 bg-white z-10"
            data-id="element-744"
          >
            <MuiButton
              onClick={onClose}
              type="button"
              variant="outlined"
              sx={{ marginRight: '10px' }}
              startIcon={<XCircle size={16} />}
            >
              Cancel
            </MuiButton>
            {/* Hide action buttons on deploy step when in read-only mode for non-approvers */}
            {!(
              readOnly &&
              currentStep === 'deploy' &&
              !isApprover(user?.claims || []) &&
              !isExporter(user?.claims || []) &&
              !isPublisher(user?.claims || [])
            ) && (
                <div
                  className="flex items-center space-x-4"
                  data-id="element-746"
                >
                  {currentStep !== 'payload' && (
                    <MuiButton
                      variant="outlined"
                      sx={{ marginRight: '10px' }}
                      onClick={() => {
                        const currentIndex = steps.findIndex(
                          (s) => s.id === currentStep,
                        );
                        if (currentIndex > 0) {
                          // Clear any previous step-specific errors when navigating backward
                          setError(null);
                          setCurrentStep(steps[currentIndex - 1].id as any);
                        }
                      }}
                      data-id="element-745"
                    >
                      Back
                    </MuiButton>
                  )}
                  {!readOnly && (
                    <MuiButton
                      variant="contained"
                      sx={{ background: '#2b7fff' }}
                      onClick={async () => {
                        await handleSaveAndNext();
                      }}
                      disabled={
                        loading ||
                        (currentStep === 'mapping' && !isMappingValid) ||
                        (currentStep === 'functions' &&
                          selectedFunctions.length > 0 &&
                          validateFunctionParameters().length > 0) ||
                        (currentStep === 'simulation' &&
                          !isSimulationSuccess &&
                          !readOnly) ||
                        (currentStep !== 'payload' &&
                          !createdEndpoint &&
                          !existingConfig) ||
                        (currentStep === 'deploy' &&
                          !isApprover(user?.claims || []) &&
                          !isExporter(user?.claims || []) &&
                          (isStatus(
                            createdEndpoint?.status,
                            'STATUS_03_UNDER_REVIEW',
                          ) ||
                            isStatus(
                              createdEndpoint?.status,
                              'STATUS_04_APPROVED',
                            ) ||
                            isStatus(
                              existingConfig?.status,
                              'STATUS_03_UNDER_REVIEW',
                            ) ||
                            isStatus(
                              existingConfig?.status,
                              'STATUS_04_APPROVED',
                            )) &&
                          !isCloneCheck) ||
                        (currentStep === 'deploy' &&
                          isApprover(user?.claims || []) &&
                          (isStatus(createdEndpoint?.status, '') ||
                            isStatus(
                              existingConfig?.status,
                              'STATUS_04_APPROVED',
                            ))) ||
                        (currentStep === 'deploy' &&
                          isExporter(user?.claims || []) &&
                          !isStatus(
                            createdEndpoint?.status,
                            'STATUS_04_APPROVED',
                          ) &&
                          !isStatus(existingConfig?.status, 'STATUS_04_APPROVED'))
                      }
                      data-id="element-749"
                    >
                      {loading
                        ? 'Processing...'
                        : currentStep === 'deploy'
                          ? isApprover(user?.claims || []) &&
                            !isStatus(
                              createdEndpoint?.status,
                              'STATUS_04_APPROVED',
                            ) &&
                            !isStatus(
                              existingConfig?.status,
                              'STATUS_04_APPROVED',
                            )
                            ? 'Send for Deployment'
                            : isExporter(user?.claims || []) &&
                              (isStatus(
                                createdEndpoint?.status,
                                'STATUS_04_APPROVED',
                              ) ||
                                isStatus(
                                  existingConfig?.status,
                                  'STATUS_04_APPROVED',
                                ))
                              ? 'Export'
                              : !isApprover(user?.claims || []) &&
                                !isExporter(user?.claims || [])
                                ? 'Send for Approval'
                                : 'Configuration Approved'
                          : 'Save and Next'}
                    </MuiButton>
                  )}
                  {/* Show Next button for approvers, editors, and exporters in read-only mode on all steps */}
                  {readOnly &&
                    (isApprover(user?.claims || []) ||
                      isEditor(user?.claims || []) ||
                      isExporter(user?.claims || []) ||
                      isPublisher(user?.claims || [])) && (
                      <>
                        {(() => {
                          const currentIndex = steps.findIndex(
                            (s) => s.id === currentStep,
                          );
                          return (
                            <>
                              {currentIndex < steps.length - 1 && (
                                <MuiButton
                                  variant="contained"
                                  onClick={handleNext}
                                  sx={{ background: '#2b7fff' }}
                                >
                                  Next
                                </MuiButton>
                              )}
                              {/* Show approver action buttons on the last step (deployment) */}
                              {isApprover(user?.claims || []) &&
                                currentStep === 'deploy' && (
                                  <>
                                    {onRevertToEditor &&
                                      !isStatus(
                                        createdEndpoint?.status,
                                        'STATUS_04_APPROVED',
                                      ) &&
                                      !isStatus(
                                        existingConfig?.status,
                                        'STATUS_06_EXPORTED',
                                      ) && (
                                        <MuiButton
                                          type="button"
                                          variant="contained"
                                          sx={{
                                            marginRight: '10px',
                                            backgroundColor: '#ff474d',
                                          }}
                                          startIcon={<XCircle size={16} />}
                                          onClick={onRevertToEditor}
                                        >
                                          Reject
                                        </MuiButton>
                                      )}
                                    {onSendForDeployment &&
                                      !isStatus(
                                        createdEndpoint?.status,
                                        'STATUS_04_APPROVED',
                                      ) &&
                                      !isStatus(
                                        existingConfig?.status,
                                        'STATUS_06_EXPORTED',
                                      ) && (
                                        <MuiButton
                                          onClick={onSendForDeployment}
                                          type="button"
                                          variant="contained"
                                          sx={{ backgroundColor: '#33ad74' }}
                                          startIcon={<Check size={16} />}
                                        >
                                          Approve
                                        </MuiButton>
                                      )}
                                  </>
                                )}
                              {/* Show export button for exporters on the last step */}
                              {/* {isExporter(user?.claims || []) && currentStep === 'deploy' && (
                          <>
                            {onSendForDeployment && (isStatus(createdEndpoint?.status, 'STATUS_04_APPROVED') || isStatus(existingConfig?.status, 'STATUS_08_DEPLOYED')) && (
                              <Button
                                variant="primary"
                                onClick={onSendForDeployment}
                                className="!pb-[6px] !pt-[5px] bg-[#2b7fff] text-white"
                              >
                                Export
                              </Button>
                            )}
                          </>
                        )} */}
                              {/* Show submit for approval button for editors on the last step */}
                              {isEditor(user?.claims || []) &&
                                currentStep === 'deploy' && (
                                  <>
                                    {/* Show Submit for Approval button for draft configs or when config is ready for submission */}
                                    {((!isStatus(
                                      createdEndpoint?.status,
                                      'STATUS_03_UNDER_REVIEW',
                                    ) &&
                                      !isStatus(
                                        createdEndpoint?.status,
                                        'STATUS_04_APPROVED',
                                      )) ||
                                      (!isStatus(
                                        existingConfig?.status,
                                        'STATUS_03_UNDER_REVIEW',
                                      ) &&
                                        !isStatus(
                                          existingConfig?.status,
                                          'STATUS_04_APPROVED',
                                        )) ||
                                      (!createdEndpoint?.status &&
                                        !existingConfig?.status)) && (
                                        <Button
                                          variant="primary"
                                          onClick={async () => {
                                            await handleSaveAndNext();
                                          }}
                                          disabled={loading}
                                          className="!pb-[6px] !pt-[5px] bg-[#2b7fff] text-white"
                                        >
                                          {loading
                                            ? 'Processing...'
                                            : 'Submit for Approval'}
                                        </Button>
                                      )}
                                  </>
                                )}
                            </>
                          );
                        })()}
                      </>
                    )}
                </div>
              )}
          </div>
        </div>
      </Backdrop>
    </div>
  );
};

export default EditEndpointModal;
