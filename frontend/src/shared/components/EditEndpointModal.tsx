import React, { useState, useEffect, useRef } from 'react';
import { XIcon, FileJson, GitBranch, Cog, PlayCircle, Rocket, PlusIcon } from 'lucide-react';
import { PayloadEditor } from './PayloadEditor';
import { MappingUtility } from './MappingUtility';
import { SimulationPanel } from './SimulationPanel';
import { DeploymentConfirmation } from './DeploymentConfirmation';
import { Button } from './Button';
import { configApi, type CreateConfigRequest, type ConfigResponse } from '../../features/config/services/configApi';
import { useToast } from '../providers/ToastProvider';
import { useAuth } from '../../features/auth';
import FunctionsApiService from '../../features/functions/services/functionsApi';
import type {
  FunctionDefinition,
  AddFunctionDto,
  AllowedFunctionName
} from '../types/functions.types';
import { FUNCTION_CONFIGS } from '../types/functions.types';
import { isApprover, isEditor, isExporter, isPublisher } from '../../utils/roleUtils';
import { isStatus } from '../utils/statusColors';
import { convertInferredFieldsToJsonSchema } from '../utils/schemaUtils';
import type { InferredField } from '../utils/schemaUtils';

import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import type { StepIconProps } from '@mui/material/StepIcon';
import { Backdrop } from '@mui/material';

// Custom Step Icon Component
const CustomStepIcon = (props: StepIconProps) => {
  const { active, completed, icon } = props;
  
  const icons: { [index: string]: React.ReactElement } = {
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
  onAddFunction: (functionData: AddFunctionDto) => void;
  onClose: () => void;
}

const FunctionSelectionForm: React.FC<FunctionSelectionFormProps> = ({ onAddFunction, onClose }) => {
  const [selectedFunction, setSelectedFunction] = useState<AllowedFunctionName>('addAccount');
  const [selectedConfiguration, setSelectedConfiguration] = useState('');
  const [selectedOptionalParams, setSelectedOptionalParams] = useState<string[]>([]);
  const functionConfig = FUNCTION_CONFIGS[selectedFunction];
  const handleAddFunction = () => {
    const config = functionConfig.configurations.find(c => c.name === selectedConfiguration);
    if (!config) {
      console.error('No configuration found for:', selectedConfiguration);
      return;
    }
    // Combine required parameters from configuration with selected optional parameters
    const requiredParams = config.parameters.split(', ').map(p => p.trim()).filter(p => p.length > 0);
    const allParams = [...requiredParams, ...selectedOptionalParams];
    console.log(':wrench: Function form - handleAddFunction:');
    console.log('Selected Function:', selectedFunction);
    console.log('Selected Configuration:', selectedConfiguration);
    console.log('Config Parameters String:', config.parameters);
    console.log('Required Params:', requiredParams);
    console.log('Optional Params:', selectedOptionalParams);
    console.log('All Params:', allParams);
    // Add prefixes to parameters: 'transactionDetails.' for tenantId, 'redis.' for others
    const prefixedParams = allParams.map(param => {
      const trimmed = param.trim();
      const lowerParam = trimmed.toLowerCase();
      // Check if it's tenantId (case-insensitive)
      if (selectedFunction === 'saveTransactionDetails') {
        return `transactionDetails.${trimmed}`;
      }
      if (lowerParam === 'tenantid' || lowerParam === 'tenant_id') {
        console.log(`:wrench: Adding 'transactionDetails.' prefix to: ${trimmed}`);
        return `transactionDetails.${trimmed}`;
      } else {
        console.log(`:wrench: Adding 'redis.' prefix to: ${trimmed}`);
        return `redis.${trimmed}`;
      }
    });
    console.log('Prefixed Params:', prefixedParams);
    const functionData = {
      functionName: selectedFunction,
      params: prefixedParams
    };
    console.log('Final Function Data:', functionData);
    onAddFunction(functionData);
  };
  const handleOptionalParamToggle = (paramName: string) => {
    setSelectedOptionalParams(prev =>
      prev.includes(paramName)
        ? prev.filter(p => p !== paramName)
        : [...prev, paramName]
    );
  };
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Function</label>
        <select
          value={selectedFunction}
          onChange={(e) => {
            setSelectedFunction(e.target.value as AllowedFunctionName);
            setSelectedConfiguration(''); // Reset configuration when function changes
            setSelectedOptionalParams([]); // Reset optional params when function changes
          }}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {Object.values(FUNCTION_CONFIGS).map((config) => (
            <option key={config.name} value={config.name}>
              {config.displayName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Parameter Configuration</label>
        <div className="space-y-2">
          {functionConfig.configurations.map((config) => (
            <div
              key={config.name}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedConfiguration === config.name
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
                }`}
              onClick={() => setSelectedConfiguration(config.name)}
            >
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="configuration"
                  value={config.name}
                  checked={selectedConfiguration === config.name}
                  onChange={() => setSelectedConfiguration(config.name)}
                  className="text-blue-600"
                />
                <div>
                  <h4 className="font-medium">{config.displayName}</h4>
                  <p className="text-sm text-gray-600">{config.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Optional Parameters Selection */}
      {functionConfig.optionalParameters && functionConfig.optionalParameters.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Optional Parameters (Select any that you need)</label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {functionConfig.optionalParameters.map((param) => (
              <div
                key={param.name}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedOptionalParams.includes(param.name)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                  }`}
                onClick={() => handleOptionalParamToggle(param.name)}
              >
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedOptionalParams.includes(param.name)}
                    onChange={() => handleOptionalParamToggle(param.name)}
                    className="text-blue-600 rounded"
                  />
                  <div>
                    <h4 className="font-medium">{param.displayName} ({param.name})</h4>
                    <p className="text-sm text-gray-600">{param.description}</p>
                    <p className="text-xs text-gray-500">Type: {param.type}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {selectedOptionalParams.length > 0 && (
            <p className="text-sm text-blue-600 mt-2">
              Selected optional parameters: {selectedOptionalParams.join(', ')}
            </p>
          )}
        </div>
      )}
      <div className="flex justify-end space-x-3 pt-4">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleAddFunction}
          disabled={!selectedConfiguration}
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
}

interface EditEndpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  endpointId: number; // -1 indicates new endpoint creation
  onSuccess?: () => void; // Callback when config is successfully created/updated
  isCloneMode?: boolean; // When true, load config data but treat as new config creation
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
  setIsInCloneMode,
  readOnly = false,
  onRevertToEditor,
  onSendForDeployment,
  onNextStep
}) => {
  const isNewEndpoint = endpointId === -1;
  const isCloning = isCloneMode && endpointId !== -1;
  const shouldCreateNew = isNewEndpoint || isCloning; // Either truly new or cloning
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();
  const tenantId = user?.tenantId || 'tenant-id';
  const [currentStep, setCurrentStep] = useState<'payload' | 'mapping' | 'functions' | 'simulation' | 'deploy'>('payload');
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

  console.log('createdEndpoint?.status', isStatus(createdEndpoint?.status, 'STATUS_06_EXPORTED'));
  

  const [currentMappings, setCurrentMappings] = useState<any[]>([]); // Current mappings from MappingUtility
console.log('Cur map:', currentMappings);
  // Function to update current mappings and sync with createdEndpoint
  const updateCurrentMappings = (newMappings: any[]) => {
    console.log('🔄 updateCurrentMappings called with:', newMappings);
    setCurrentMappings(newMappings);

    // Also update the createdEndpoint to include the new mappings
    if (createdEndpoint) {
      console.log('🔄 Updating createdEndpoint with new mappings');
      setCreatedEndpoint({
        ...createdEndpoint,
        mapping: newMappings
      });
    } else if (existingConfig) {
      console.log('🔄 Updating existingConfig with new mappings');
      setExistingConfig({
        ...existingConfig,
        mapping: newMappings
      });
    }
  };

  // Functions state
  const [selectedFunctions, setSelectedFunctions] = useState<FunctionDefinition[]>([]);
  const [showAddFunctionModal, setShowAddFunctionModal] = useState(false);
  const steps = [{
    id: 'payload',
    label: 'Payload'
  }, {
    id: 'mapping',
    label: 'Mapping'
  }, {
    id: 'functions',
    label: 'Functions'
  }, {
    id: 'simulation',
    label: 'Dry Run'
  }, {
    id: 'deploy',
    label: isApprover(user?.claims || []) ? 'Send for Deployment' :
      isExporter(user?.claims || []) ? 'Export' : 'Submit for Approval'
  }];

  // Load existing config data when editing
  useEffect(() => {
    const loadExistingConfig = async () => {
      if (!isNewEndpoint && endpointId && isOpen) {
        try {
          setLoading(true);

          console.log('Loading existing config for editing:', endpointId);

          const response = await configApi.getConfig(endpointId);
          console.log('Full API response:', response);
          console.log('Response type:', typeof response);
          console.log('Response.success:', response.success);
          console.log('Response.config:', response.config);

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
            console.log('🔍 Loaded existing config - mapping analysis:');
            console.log('  - config.mapping:', config.mapping);
            console.log('  - typeof mapping:', typeof config.mapping);
            console.log('  - isArray:', Array.isArray(config.mapping));
            console.log('  - mapping length:', config.mapping?.length);
            console.log('  - config.status:', config.status);
            console.log('  - config.comment:', config.comment);

            setExistingConfig(config);

            // Pre-populate form data with existing config
            // For clone mode, adjust version and transaction type to indicate it's a clone
            const isCloning = isCloneMode && endpointId !== -1;
            setEndpointData({
              version: config.version, // Reset version for clones
              transactionType: isCloning ? `${config.transactionType}` : (config.transactionType || ''),
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
              console.log('🔄 Initialized currentMappings with existing mappings:', config.mapping.length, 'mappings');
            }

            // Set the existing config as the "created" endpoint for all subsequent steps
            setCreatedEndpoint(config);
            setInferredSchema(config);

            // Load existing functions if available
            if (config.functions && Array.isArray(config.functions)) {
              setSelectedFunctions(config.functions);
            }

            console.log('Loaded existing config:', config);
          } else {
            console.log('No valid config found in response:', response);
            showError('Configuration Error', 'No configuration data found for this endpoint');
          }
        } catch (error) {
          console.error('Error loading config:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          showError('Failed to Load Configuration', errorMessage);
        } finally {
          setLoading(false);
        }
      }
    };

    loadExistingConfig();
  }, [endpointId, isNewEndpoint, isOpen]);

  const isPayloadStepValid = () => {
    return payload &&
      endpointData.version &&
      endpointData.transactionType &&
      endpointData.contentType;
  };

  // Navigation-only functions (don't save, just move between steps)
  const handleNextStep = () => {
    console.log('🚀 handleNextStep called for step:', currentStep);
    console.log('🚀 createdEndpoint:', createdEndpoint);
    console.log('🚀 isNewEndpoint:', isNewEndpoint);

    // Clear any previous step-specific errors when navigating
    setError(null);

    switch (currentStep) {
      case 'payload':
        // Check if payload step is saved and valid
        if (!createdEndpoint && isNewEndpoint) {
          showError('Please save the payload first before proceeding');
          return;
        }
        console.log('✅ Moving from payload to mapping');
        setError(null); // Clear any previous errors before moving to next step
        setCurrentStep('mapping');
        break;
      case 'mapping':
        if (!isMappingValid) {
          showError('Please complete the mapping before proceeding');
          return;
        }
        setError(null); // Clear any previous errors before moving to next step
        setCurrentStep('functions');
        break;
      case 'functions':
        setError(null); // Clear any previous errors before moving to next step
        setCurrentStep('simulation');
        break;
      case 'simulation':
        if (!isSimulationSuccess && !readOnly) {
          showError('Please run and pass simulation before proceeding');
          return;
        }
        setError(null); // Clear any previous errors before moving to next step
        setCurrentStep('deploy');
        break;
      default:
        break;
    }
  };

  // Step 1: Create or Update Endpoint with Payload
  const handleCreateEndpoint = async () => {
    // Validate all required fields before saving
    const validationErrors: string[] = [];

    if (!endpointData.transactionType.trim()) {
      validationErrors.push('Transaction Type is required');
    }

    if (!endpointData.version.trim()) {
      validationErrors.push('Version is required');
    }

    if (!payload.trim()) {
      validationErrors.push('Payload is required');
    }

    // If there are validation errors, show them and scroll to top
    if (validationErrors.length > 0) {
      const errorMessage = validationErrors.join('. ');
      setError(errorMessage);

      // Scroll to the error message at the top
      setTimeout(() => {
        const errorElement = document.querySelector('.bg-red-50.border-red-200');
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);

      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create configuration request using user-entered data
      const createRequest: CreateConfigRequest = {
        msgFam: endpointData.msgFam?.trim() || undefined, // Use user-provided msgFam or leave undefined
        transactionType: endpointData.transactionType,
        version: endpointData.version,
        contentType: endpointData.contentType as 'application/json' | 'application/xml',
        payload: payload,
      };

      console.log('🔍 Config request details for endpoint path generation:');
      console.log('  - msgFam:', createRequest.msgFam);
      console.log('  - transactionType:', createRequest.transactionType);
      console.log('  - version:', createRequest.version);
      console.log('  - Expected endpoint format: /tenantId/version/msgFam/transactionType');
      console.log('  - Will generate: /[tenantId]/' + createRequest.version + '/' + (createRequest.msgFam || '') + '/' + createRequest.transactionType);

      // MAPPING PERSISTENCE STRATEGY: Include mappings from MappingUtility or existing config
      console.log('🔍 Mapping persistence debugging:');
      console.log('  - currentMappings from MappingUtility:', currentMappings);
      console.log('  - currentMappings type:', typeof currentMappings);
      console.log('  - currentMappings length:', currentMappings?.length);
      console.log('  - existingConfig.mapping:', existingConfig?.mapping);
      console.log('  - existingConfig.mapping length:', existingConfig?.mapping?.length);

      // Strategy: Use current mappings if available, otherwise use existing config mappings
      let mappingsToInclude = null;

      if (currentMappings && Array.isArray(currentMappings) && currentMappings.length > 0) {
        mappingsToInclude = currentMappings;
        console.log('✅ Using current mappings from MappingUtility:', mappingsToInclude.length, 'mappings');
      } else if (!isNewEndpoint && existingConfig?.mapping && Array.isArray(existingConfig.mapping) && existingConfig.mapping.length > 0) {
        mappingsToInclude = existingConfig.mapping;
        console.log('🔄 Using existing config mappings as fallback:', mappingsToInclude.length, 'mappings');
      } else {
        console.log('� No mappings found - creating config without mappings');
      }

      if (mappingsToInclude) {
        createRequest.mapping = mappingsToInclude;
        console.log('� Including mappings in config request:', mappingsToInclude);
      }

      let response: ConfigResponse;

      if (shouldCreateNew) {
        console.log(isCloning ? 'Cloning config with data:' : 'Creating new config with data:', createRequest);
        response = await configApi.createConfig(createRequest);
      } else {
        // EDITING EXISTING CONFIG: Always create new config to preserve original and update endpoint path
        console.log('🔄 Editing existing config - will create new config for version/endpoint path update');

        // Use the version entered by the user (from endpointData.version)
        const finalVersion = endpointData.version || existingConfig?.version || '1.0';

        const newConfigRequest = {
          ...createRequest,
          version: finalVersion,
        };

        console.log('🆕 Creating new config (preserving original):');
        console.log('  - Original config ID:', endpointId);
        console.log('  - Original version:', existingConfig?.version);
        console.log('  - Original endpoint path:', existingConfig?.endpointPath);
        console.log('  - New version:', finalVersion);
        console.log('  - New request:', newConfigRequest);
        console.log('  - Backend will generate new endpoint path based on new version');

        // ALWAYS call createConfig for edits to ensure endpoint path regeneration
        response = await configApi.createConfig(newConfigRequest);

        console.log('🎉 New config created:');
        console.log('  - Response success:', response.success);
        if (response.success && response.config) {
          console.log('  - New config ID:', response.config.id);
          console.log('  - New endpoint path:', response.config.endpointPath);
          console.log('  - Endpoint path updated:', existingConfig?.endpointPath !== response.config.endpointPath);
        }
      }

      console.log('API Response from handleCreateEndpoint:', response);

      if (!response.success) {
        const action = shouldCreateNew ? 'create' : 'update';
        setError(response.message || `Failed to ${action} configuration`);
        if (response.validation?.errors) {
          console.error('Validation errors:', response.validation.errors);
        }
        return;
      }

      if (response.config) {
        setCreatedEndpoint(response.config);
        setInferredSchema(response.config.schema);
        const action = shouldCreateNew ? 'created' : 'updated';
        console.log(`Configuration ${action} successfully:`, response.config);
        console.log('Schema inferred:', response.config.schema);

        // Call success callback to refresh parent data
        if (onSuccess) {
          onSuccess();
        }

        // Show success message to user
        const actionWord = isNewEndpoint ? 'created' : 'updated';
        console.log(`✅ Configuration ${actionWord} successfully! Changes reflected in database.`);

        // Move to next step
        setError(null); // Clear any previous errors before moving to next step
        setCurrentStep('mapping');
      } else {
        const action = isNewEndpoint ? 'created' : 'updated';
        setError(`Configuration ${action} but no config data returned`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      const action = isNewEndpoint ? 'create' : 'update';
      setError(`Failed to ${action} endpoint: ${errorMessage}`);
      console.error(`Error ${action}ing endpoint:`, err);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Create Mapping - Navigate to next step
  const handleCreateMapping = async () => {
    if (!createdEndpoint || !inferredSchema) {
      setError('Endpoint must be created first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get current mappings from the database (no clearing - MappingUtility manages all mapping operations)
      const currentConfig = await configApi.getConfig(createdEndpoint.id);
      const existingMappings = currentConfig.success && currentConfig.config ? (currentConfig.config.mapping || []) : [];

      console.log('🔍 Checking existing mappings for navigation:');
      console.log('Existing mappings in DB:', existingMappings);

      // MappingUtility handles all mapping CRUD operations directly - we just need to validate and proceed
      console.log('✅ Mappings are handled directly by MappingUtility component');
      console.log('📋 Proceeding with existing mappings from database');
      setIsMappingValid(true);

      // Update the endpoint with latest mapping data
      if (currentConfig.success && currentConfig.config) {
        setCreatedEndpoint(currentConfig.config);

        console.log('📋 Current mapping data in database:');
        console.log('Total mappings stored:', currentConfig.config.mapping?.length || 0);
        console.log('All mappings:', currentConfig.config.mapping);
      }

      setIsMappingValid(true);
      console.log('✅ Ready to proceed to functions step');

      // Move to next step
      setError(null); // Clear any previous errors before moving to next step
      setCurrentStep('functions');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to create mapping: ${errorMessage}`);
      console.error('Error creating mapping:', err);
    } finally {
      setLoading(false);
    }
  };

  // Functions step handlers
  const handleAddFunction = async (functionData: AddFunctionDto) => {
    if (!createdEndpoint?.id && !existingConfig?.id) {
      showError('No configuration ID available to add function');
      return;
    }
    // Check for duplicate functions in local state first
    const isDuplicate = selectedFunctions.some(existingFunction => {
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
      return sortedExisting.every((param, index) => param === sortedNew[index]);
    });
    if (isDuplicate) {
      showError('This function with the same parameters already exists. Please modify the parameters or choose a different function.');
      return;
    }
    try {
      setLoading(true);
      const configId = createdEndpoint?.id || existingConfig?.id;
      console.log(':floppy_disk: Adding function to backend:');
      console.log('Config ID:', configId);
      console.log('Function Data:', JSON.stringify(functionData, null, 2));
      console.log('Function Name:', functionData.functionName);
      console.log('Function Params:', functionData.params);
      const response = await FunctionsApiService.addFunction(configId, functionData);
      if (response.success) {
        console.log(':white_check_mark: Function added successfully to backend');
        // Add to local state only after successful API call
        const newFunction: FunctionDefinition = {
          functionName: functionData.functionName,
          params: functionData.params
        };
        setSelectedFunctions([...selectedFunctions, newFunction]);
        setShowAddFunctionModal(false);
        console.log('Function added successfully');
      } else {
        console.error(':x: Failed to add function:', response.message);
        showError(`Failed to add function: ${response.message}`);
      }
    } catch (error) {
      console.error(':x: Error adding function:', error);
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
      const response = await FunctionsApiService.deleteFunction(configId, index);
      if (response.success) {
        // Update local state
        const updatedFunctions = selectedFunctions.filter((_, i) => i !== index);
        setSelectedFunctions(updatedFunctions);
        // Update the config in state
        if (createdEndpoint) {
          setCreatedEndpoint({
            ...createdEndpoint,
            functions: updatedFunctions
          });
        } else if (existingConfig) {
          setExistingConfig({
            ...existingConfig,
            functions: updatedFunctions
          });
        }
        console.log(':white_check_mark: Function removed successfully');
      } else {
        showError(`Failed to remove function: ${response.message}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      showError(`Failed to remove function: ${errorMessage}`);
      console.error('Error removing function:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProceedFromFunctions = () => {
    console.log('✅ Proceeding to simulation step with functions:', selectedFunctions);
    
    // Only validate if not in readOnly mode (i.e., only for editors, not approvers/viewers)
    if (!readOnly) {
      const validationErrors = validateFunctionParameters();
      
      if (validationErrors.length > 0) {
        // Show all validation errors
        const errorMessage = validationErrors.join('\n');
        setError(errorMessage);
        return;
      }
    }
    
    setError(null); // Clear any previous errors before moving to next step
    setCurrentStep('simulation');
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
    // Also strip common prefixes like "redis.", "transactionDetails.", "dataCache.", etc.
    const mappedDestinations = new Set<string>();
    const mappedDestinationsOriginal = new Map<string, string>(); // Map lowercase -> original case
    
    currentMappings.forEach((mapping: any) => {
      const processDestination = (dest: string) => {
        // Strip common prefixes before storing
        const withoutPrefix = dest.replace(/^(redis\.|transactionDetails\.|dataCache\.|transaction\.|cache\.)/i, '');
        const lowerDest = withoutPrefix.toLowerCase();
        mappedDestinations.add(lowerDest);
        mappedDestinationsOriginal.set(lowerDest, dest); // Store original with prefix for logging
      };
      
      if (mapping.destination) {
        // Handle both single destination and array of destinations
        if (Array.isArray(mapping.destination)) {
          mapping.destination.forEach((dest: string) => processDestination(dest));
        } else {
          processDestination(mapping.destination);
        }
      }
      if (mapping.destinations && Array.isArray(mapping.destinations)) {
        mapping.destinations.forEach((dest: string) => processDestination(dest));
      }
    });

    console.log('🔍 Mapped destinations (lowercase, without prefixes):', Array.from(mappedDestinations));
    console.log('🔍 Runtime context fields (lowercase):', runtimeContextFields);
    
    // Check each function's parameters
    selectedFunctions.forEach((func, funcIndex) => {
      const functionConfig = FUNCTION_CONFIGS[func.functionName];
      
      if (!functionConfig) {
        errors.push(`⚠️ Function #${funcIndex + 1} (${func.functionName}): Unknown function configuration`);
        return;
      }

      // Check each parameter
      func.params.forEach((param) => {
        // Strip prefix from parameter too before comparing
        const paramWithoutPrefix = param.replace(/^(redis\.|transactionDetails\.|dataCache\.|transaction\.|cache\.)/i, '');
        const paramLower = paramWithoutPrefix.toLowerCase();
        
        // Skip runtime context fields - they're provided at execution time
        if (runtimeContextFields.includes(paramLower)) {
          console.log(`✓ Parameter "${param}" is a runtime context field (will be provided at execution time)`);
          return;
        }

        // Check if parameter is mapped (case-insensitive, after stripping prefixes from both sides)
        if (!mappedDestinations.has(paramLower)) {
          errors.push(
            `❌ Function "${functionConfig.displayName}": Parameter "${param}" is not mapped. ` +
            `Please create a mapping with destination "${paramWithoutPrefix}" (can use prefixes like redis., transactionDetails., etc.) in the Mapping step.`
          );
        } else {
          const mappedAs = mappedDestinationsOriginal.get(paramLower);
          console.log(`✓ Parameter "${param}" (stripped: "${paramWithoutPrefix}") is mapped (as "${mappedAs}")`);
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
    console.log('🚀 handleDeploy called');
    console.log('createdEndpoint:', createdEndpoint);

    if (!createdEndpoint?.id) {
      console.log('❌ No endpoint created');
      setError('Endpoint must be created first');
      return;
    }

    // Check if mappings exist in the database
    try {
      console.log('🔍 Checking for existing mappings in database...');
      const configResponse = await configApi.getConfig(createdEndpoint.id);

      if (!configResponse.success) {
        console.log('❌ No mapping found in database');
        return;
      }


    } catch (error) {
      console.error('❌ Error checking mappings:', error);
      setError('Failed to validate mappings. Please try again.');
      return;
    }

    console.log('✅ Starting submission process');
    setLoading(true);
    setError(null);

    try {
      // Submit the configuration for approval or deployment based on user role
      console.log('Submitting configuration for approval with ID:', createdEndpoint.id);
      console.log('User:', user);

      let response: ConfigResponse;
      const isUserApprover = isApprover(user?.claims || []);

      if (isUserApprover) {
        // Approvers send for deployment
        console.log('User is approver - checking config status');

        // Check current config status
        const configResponse = await configApi.getConfig(createdEndpoint.id);
        if (!configResponse.success || !configResponse.config) {
          throw new Error('Failed to get config status');
        }

        const currentStatus = configResponse.config.status;
        console.log('Current config status:', currentStatus);

        // If config is under_review, just approve it (set to approved)
        if (currentStatus === 'STATUS_03_UNDER_REVIEW') {
          console.log('Config is under_review - approving it');
          response = await configApi.approveConfig(createdEndpoint.id);
        } else {
          // For other statuses, deploy if possible
          console.log('Config status allows deployment');
          response = await configApi.deployConfig(createdEndpoint.id);
        }
      } else {
        // Editors submit for approval
        console.log('User is editor - calling submitForApproval');
        response = await configApi.submitForApproval(
          createdEndpoint.id,
          user?.id || 'unknown',
          'editor'
        );
      }

      console.log('API response:', response);

      if (response.success) {
        console.log('Configuration submitted successfully');
        const successMessage = isUserApprover ? 'Configuration sent for deployment successfully!' : 'Configuration submitted for approval successfully!';
        showSuccess(successMessage);

        // Close modal and refresh parent component
        onClose();
        if (onSuccess) {
          onSuccess();
        }
      } else {
        console.log('❌ API returned success=false:', response.message);
        setError(`Failed to submit: ${response.message}`);
      }
    } catch (err) {
      console.log('❌ Exception caught:', err);
      setError(`Submission failed: ${err}`);
      console.error('Error submitting for approval:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndNext = async () => {
    console.log('🎯 handleSaveAndNext called for step:', currentStep);

    // For deploy step, just call handleDeploy (no save needed)
    if (currentStep === 'deploy') {
      console.log('Deploy step - calling handleDeploy');
      await handleDeploy();
      return;
    }

    // Trigger validation in PayloadEditor component (this will show field-level errors)
    const isValid = (window as any).__validatePayloadEditorFields?.();
    
    // If field validation failed, don't proceed (errors are shown below fields)
    if (isValid === false) {
      return;
    }
    
    // Validate all required fields before saving (only for payload errors shown at top)
    const validationErrors: string[] = [];

    if (!payload.trim()) {
      validationErrors.push('Payload is required');
    }

    // Validate JSON format if content type is JSON
    if (endpointData.contentType === 'application/json' && payload.trim()) {
      try {
        JSON.parse(payload);
        console.log('✅ JSON payload is valid');
      } catch (e) {
        const error = e as Error;
        console.error('❌ JSON validation failed:', error.message);
        validationErrors.push(`Invalid JSON format: ${error.message}`);
      }
    }

    // Check if fields have been generated from payload
    // currentSchema can be either InferredField[] array or JSON Schema object
    console.log('🔍 Validation - currentSchema:', currentSchema);
    console.log('🔍 Validation - isArray:', Array.isArray(currentSchema));
    console.log('🔍 Validation - array length:', Array.isArray(currentSchema) ? currentSchema.length : 'N/A');

    const hasGeneratedFields = currentSchema && (
      (Array.isArray(currentSchema) && currentSchema.length > 0) || // InferredField[] array
      (currentSchema.properties && Object.keys(currentSchema.properties).length > 0) // JSON Schema object
    );

    console.log('🔍 Validation - hasGeneratedFields:', hasGeneratedFields);

    if (!hasGeneratedFields) {
      validationErrors.push('Please generate fields from your payload before saving');
    }

    // If there are validation errors, show them and scroll to top
    if (validationErrors.length > 0) {
      const errorMessage = validationErrors.join('. ');
      setError(errorMessage);

      // Scroll to the error message at the top
      setTimeout(() => {
        const errorElement = document.querySelector('.bg-red-50.border-red-200');
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);

      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First, save the configuration to the database
      let saveResponse: ConfigResponse;

      // Create configuration request using user-entered data
      const createRequest: CreateConfigRequest = {
        msgFam: endpointData.msgFam?.trim() || undefined,
        transactionType: endpointData.transactionType,
        version: endpointData.version,
        contentType: endpointData.contentType as 'application/json' | 'application/xml',
        payload: payload,
      };

      // CRITICAL: Use the current schema from PayloadEditor (includes user edits)
      // If currentSchema is an InferredField[] array, convert it to JSON Schema format
      let finalSchema = currentSchema;

      console.log('🔍 BEFORE conversion - currentSchema:', currentSchema);
      console.log('🔍 BEFORE conversion - isArray:', Array.isArray(currentSchema));
      console.log('🔍 BEFORE conversion - length:', Array.isArray(currentSchema) ? currentSchema.length : 'N/A');

      // Convert InferredField[] array to JSON Schema if needed
      if (finalSchema && Array.isArray(finalSchema)) {
        console.log('🔄 Converting InferredField[] array to JSON Schema format...');
        console.log('🔍 InferredField array length:', finalSchema.length);
        console.log('🔍 First few fields:', finalSchema.slice(0, 5).map((f: any) => ({ path: f.path, type: f.type })));

        // CRITICAL: Don't convert if array is empty!
        if (finalSchema.length === 0) {
          console.error('❌ Cannot convert empty InferredField[] array to JSON Schema');
          console.error('❌ This indicates fields were cleared during navigation');
          setError('Schema fields were lost. Please go back to step 1, regenerate fields from your payload, and try again.');
          setLoading(false);
          return;
        }

        // Use the existing utility function to convert
        finalSchema = convertInferredFieldsToJsonSchema(finalSchema as InferredField[]);

        if (finalSchema) {
          console.log('✅ Converted to JSON Schema successfully');
          console.log('📊 Schema properties:', Object.keys(finalSchema.properties || {}));
        } else {
          console.error('❌ Conversion returned null');
        }
      }

      // If no currentSchema but we have a payload, regenerate schema from payload
      if (!existingConfig?.schema && payload.trim()) {
        console.log('🔄 No current schema from PayloadEditor, regenerating from payload...');
        try {
          // Import the schema generation logic (simplified version)
          // const generateSchemaFromPayload = (payloadText: string, contentType: string) => {
          //   if (contentType === 'application/json') {
          //     try {
          //       const parsed = JSON.parse(payloadText);
          //       const generateJSONSchema = (obj: any, path = ''): any[] => {
          //         const schema: any[] = [];
          //         if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
          //           Object.entries(obj).forEach(([key, value]) => {
          //             const fieldPath = path ? `${path}.${key}` : key;
          //             console.log('objjjj', obj);
                      
          //             let fieldType: string;
          //             if (Array.isArray(value)) {
          //               fieldType = 'array';
          //             } else if (value && typeof value === 'object') {
          //               fieldType = 'object';
          //             } else {
          //               fieldType = typeof value;
          //             }
          //             const field: any = {
          //               name: key,
          //               path: fieldPath,
          //               type: fieldType,
          //               isRequired: true
          //             };

          //             // Handle nested objects
          //             if (fieldType === 'object' && value !== null) {
          //               field.children = generateJSONSchema(value, fieldPath);
          //             }

          //             // Handle arrays - check first element for structure
          //             if (fieldType === 'array' && Array.isArray(value) && value.length > 0) {
          //               const firstElement = value[0];
          //               if (firstElement && typeof firstElement === 'object' && !Array.isArray(firstElement)) {
          //                 // Array of objects - generate schema for array items
          //                 field.children = generateJSONSchema(firstElement, `${fieldPath}[0]`);
          //               }
          //             }

          //             schema.push(field);
          //           });
          //         }
          //         return schema;
          //       };
          //       return generateJSONSchema(parsed);
          //     } catch (e) {
          //       throw new Error('Invalid JSON format');
          //     }
          //   }
          //   return null;
          // };

          // const schemaFields = generateSchemaFromPayload(payload, endpointData.contentType);
          // console.log('🔍 Generated schema fields from payload:', schemaFields);

          // if (schemaFields) {
          //   // Convert to JSON schema format - FIXED: proper recursive handling
          //   const convertToJSONSchema = (fields: any[]): any => {
          //     const schema: any = {
          //       type: 'object',
          //       properties: {},
          //       required: [],
          //       additionalProperties: false
          //     };

          //     fields.forEach(field => {
          //       const fieldName = field.name;

          //       if (field.type === 'object' && field.children && field.children.length > 0) {
          //         // Recursively convert children for nested objects
          //         const nestedSchema = convertToJSONSchema(field.children);
          //         schema.properties[fieldName] = nestedSchema;

          //         if (field.isRequired) {
          //           schema.required.push(fieldName);
          //         }
          //       } else if (field.type === 'object') {
          //         // Empty object without children
          //         schema.properties[fieldName] = {
          //           type: 'object',
          //           additionalProperties: false
          //         };

          //         if (field.isRequired) {
          //           schema.required.push(fieldName);
          //         }
          //       } else if (field.type === 'array' && field.children && field.children.length > 0) {
          //         // Handle array with object items
          //         const itemsSchema = convertToJSONSchema(field.children);
          //         schema.properties[fieldName] = {
          //           type: 'array',
          //           items: itemsSchema
          //         };

          //         if (field.isRequired) {
          //           schema.required.push(fieldName);
          //         }
          //       } else if (field.type === 'array') {
          //         // Array without specific item type (primitive array)
          //         schema.properties[fieldName] = {
          //           type: 'array',
          //           items: { type: 'string' }
          //         };

          //         if (field.isRequired) {
          //           schema.required.push(fieldName);
          //         }
          //       } else {
          //         // Simple field types (string, number, boolean)
          //         let jsonType = 'string';
          //         if (field.type === 'number') jsonType = 'number';
          //         else if (field.type === 'boolean') jsonType = 'boolean';

          //         schema.properties[fieldName] = {
          //           type: jsonType
          //         };

          //         if (field.isRequired) {
          //           schema.required.push(fieldName);
          //         }
          //       }
          //     });

          //     return schema;
          //   };

          //   finalSchema = convertToJSONSchema(schemaFields);
          //   console.log('✅ Regenerated schema from payload:', JSON.stringify(finalSchema, null, 2));
          // }
        } catch (error) {
          console.warn('⚠️ Failed to regenerate schema from payload:', error);
          // Fall back to existing schema
          finalSchema = existingConfig?.schema;
        }
      }

      if (!finalSchema && existingConfig?.schema) {
        finalSchema = existingConfig.schema;
        console.log('🔒 Using existing schema (no current edits):', existingConfig.schema);
      }

      // Validate schema before sending to backend
      if (finalSchema) {
        console.log('🔍 Validating schema before send:', finalSchema);
        console.log('🔍 Schema type check - isArray:', Array.isArray(finalSchema));
        console.log('🔍 Schema type check - hasProperties:', finalSchema.properties ? true : false);
        console.log('🔍 Schema properties keys:', finalSchema.properties ? Object.keys(finalSchema.properties) : 'N/A');
        console.log('🔍 Schema properties count:', finalSchema.properties ? Object.keys(finalSchema.properties).length : 0);

        // After conversion, finalSchema should be a JSON Schema object with properties
        // Check if it's a valid schema structure
        const hasValidProperties = finalSchema.properties &&
          typeof finalSchema.properties === 'object' &&
          Object.keys(finalSchema.properties).length > 0;

        // if (!hasValidProperties) {
        //   console.error('❌ Schema validation failed: Schema has no valid properties');
        //   console.error('❌ Schema structure:', JSON.stringify(finalSchema, null, 2));
        //   console.error('❌ Payload:', payload);
        //   console.error('❌ Content Type:', endpointData.contentType);
        //   setError('Invalid schema: No fields were generated from your payload. Please check your JSON/XML format and try again.');
        //   setLoading(false);
        //   return;
        // }

        createRequest.schema = finalSchema;
        console.log('✅ Schema validation passed - sending to backend');
        console.log('📊 Schema to send:', JSON.stringify(finalSchema, null, 2));
      } else {
        console.log('⚠️ No schema provided - backend will generate from payload');
      }

      console.log('🔥 EditEndpointModal.handleSaveAndNext - Saving configuration:');
      console.log('📦 Create request data:', JSON.stringify(createRequest, null, 2));
      console.log('📊 Full endpoint data:', endpointData);
      console.log('📄 Payload length:', payload.length);
      console.log('🆕 Is new endpoint?', isNewEndpoint);
      console.log('🆔 Endpoint ID:', endpointId);

      // Determine actual config ID to use
      const actualConfigId = createdEndpoint?.id || existingConfig?.id || endpointId;
      const shouldCreate = !createdEndpoint && !existingConfig && isNewEndpoint;
      const isCloningOperation = isCloning && existingConfig;
      const action = (shouldCreate || isCloningOperation) ? 'create' : 'update';

      if (shouldCreate || isCloningOperation || isCloneMode) {
        console.log(isCloningOperation ? 'Cloning config - creating new config...' : 'Creating NEW config...');
        saveResponse = await configApi.createConfig(createRequest);
      } else {
        console.log('Updating EXISTING config with ID:', actualConfigId);
        saveResponse = await configApi.updateConfig(actualConfigId, createRequest);
      }

      console.log('Save API Response:', saveResponse);
      console.log('🔍 Response success status:', saveResponse.success);
      console.log('🔍 Response message:', saveResponse.message);

      if(saveResponse?.statusCode === 400) {
        showError(saveResponse.message)
      }

      if (!saveResponse.success) {
        console.log('❌ Save failed - response.success is false');

        // Check for specific error messages that need user-friendly handling
        let errorMessage = saveResponse.message || `Failed to ${action} configuration`;

        setError(errorMessage);
        if (saveResponse.validation?.errors) {
          console.error('Validation errors:', saveResponse.validation.errors);
        }
        return;
      }

      console.log('✅ Save successful');

      if (saveResponse.config) {
        setIsInCloneMode(false);
        console.log('🎯 Setting createdEndpoint with config:', saveResponse.config);
        setCreatedEndpoint(saveResponse.config);
        setInferredSchema(saveResponse.config.schema);
        const action = isNewEndpoint ? 'saved' : 'updated';
        console.log(`Configuration ${action} successfully:`, saveResponse.config);
        console.log('Schema inferred:', saveResponse.config.schema);

        // Determine whether to move to next step or stay on current step
        // "Save and Next" should always advance to next step, except for deploy step which has special logic
        const shouldAdvanceToNextStep = (currentStep as string) !== 'deploy';

        if (shouldAdvanceToNextStep) {
          // Always move to next step for non-deploy steps
          console.log('🚀 Save and Next - moving to next step');

          // Clear any previous errors before moving to next step
          setError(null);

          switch (currentStep) {
            case 'payload':
              console.log('✅ Moving from payload to mapping');
              setCurrentStep('mapping');
              break;
            case 'mapping':
              if (!isMappingValid) {
                showError('Please complete the mapping before proceeding');
                return;
              }
              console.log('✅ Moving from mapping to functions');
              setCurrentStep('functions');
              break;
            case 'functions':
              console.log('✅ Moving from functions to simulation');
              setCurrentStep('simulation');
              break;
            case 'simulation':
              if (!isSimulationSuccess && !readOnly) {
                showError('Please run and pass simulation before proceeding');
                return;
              }
              console.log('✅ Moving from simulation to deploy');
              setCurrentStep('deploy');
              break;
            default:
              break;
          }

          showSuccess('Configuration saved successfully!');
        } else {
          // Deploy step - stay on current step (deploy step has special logic)
          console.log('💾 Deploy step - staying on current step');
          showSuccess('Configuration updated successfully!');
        }

        // Call success callback to refresh parent data (after UI updates)
        if (onSuccess) {
          onSuccess();
        }

        // Show success message to user
        const actionWord = isNewEndpoint ? 'created' : 'updated';
        console.log(`✅ Configuration ${actionWord} successfully! Changes reflected in database.`);
      } else {
        const action = isNewEndpoint ? 'saved' : 'updated';
        setError(`Configuration ${action} but no config data returned`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      const action = isNewEndpoint ? 'save' : 'update';
      setError(`Failed to ${action} configuration: ${errorMessage}`);
      console.error('Error saving configuration:', err);
      console.error('Error details:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      });
    } finally {
      setLoading(false);
    }
  };

  // Navigation functions for view mode
  const handleNext = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
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
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden relative z-50 shadow-2xl" data-id="element-727">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200" data-id="element-728">
          <h2 className="text-xl font-semibold text-[#2b7fff]" data-id="element-729">
            {isNewEndpoint ? 'Create New Connection' : isCloning ? 'Clone Configuration' : readOnly ? 'View Configuration' : 'Edit Configuration'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" data-id="element-730">
            <XIcon size={24} data-id="element-731" />
          </button>
        </div>
        <div className="overflow-y-auto p-6 max-h-[calc(90vh-120px)]" data-id="element-732">
        {/* Show rejection comment only when status is STATUS_05_REJECTED */}
        {(isStatus(createdEndpoint?.status, 'STATUS_05_REJECTED') || isStatus(existingConfig?.status, 'STATUS_05_REJECTED')) && 
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
                  {createdEndpoint?.comments || existingConfig?.comments || 'No comment provided.'}
                </p>
              </div>
            </div>
          </div>
        )}

          {/* MUI Stepper */}
          <Box sx={{ width: '100%', mb: 4 }}>
            <Stepper activeStep={steps.findIndex(s => s.id === currentStep)} alternativeLabel>
              {steps.map((step, index) => {
                const currentStepIndex = steps.findIndex(s => s.id === currentStep);
                const isCurrentStep = index === currentStepIndex;
                const isCompletedStep = index < currentStepIndex;
                const isFutureStep = index > currentStepIndex;
                
                return (
                  <Step key={step.id}>
                    <StepLabel 
                      StepIconComponent={CustomStepIcon} 
                      sx={{
                        '& .MuiStepLabel-label': {
                          color: isCurrentStep ? '#2b7fff' : 
                                 isCompletedStep ? '#10b981' : 
                                 '#999999',
                        }
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
                <PayloadEditor
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
                  payloadError={error}
                  setPayloadError={setError}
                  existingSchemaFields={(() => {
                    console.log('🔍🔍🔍 COMPUTING existingSchemaFields FOR PayloadEditor 🔍🔍🔍');
                    console.log('🔍 currentSchema:', currentSchema);
                    console.log('🔍 currentSchema type:', Array.isArray(currentSchema) ? 'Array' : typeof currentSchema);
                    console.log('🔍 currentSchema length:', Array.isArray(currentSchema) ? currentSchema.length : 'N/A');
                    console.log('🔍 createdEndpoint?.schema:', createdEndpoint?.schema);
                    console.log('🔍 inferredSchema:', inferredSchema);
                    console.log('🔍 existingConfig?.schema:', existingConfig?.schema);

                    // PRIORITY 1: Use currentSchema if available (this is what user generated)
                    if (currentSchema) {
                      console.log('🔍 EditEndpointModal - Using currentSchema (user-generated fields)');

                      // If currentSchema is already InferredField[] array, return it directly
                      if (Array.isArray(currentSchema)) {
                        console.log('✅ currentSchema is InferredField[] array, using directly');
                        console.log('✅ Passing', currentSchema.length, 'fields to PayloadEditor');
                        return currentSchema;
                      }

                      // If currentSchema is JSON Schema object, we don't need to convert it here
                      // Let the PayloadEditor handle it
                      console.log('⚠️ currentSchema is JSON Schema object');
                    }

                    // PRIORITY 2: Get schema from multiple sources: newly created endpoint, inferred schema, or existing config
                    const schemaToUse = createdEndpoint?.schema || inferredSchema || existingConfig?.schema;

                    if (!schemaToUse) {
                      console.log('⚠️ No schema available - returning undefined');
                      return undefined;
                    }

                    console.log('🔍 Using schemaToUse from createdEndpoint/inferredSchema/existingConfig');

                    // Convert AJV schema to SchemaField array for editing
                    const convertAjvToSchemaFields = (ajvSchema: any, parentPath = ''): any[] => {
                      if (!ajvSchema || typeof ajvSchema !== 'object') return [];

                      const schemaFields: any[] = [];

                      if (ajvSchema.properties) {
                        Object.entries(ajvSchema.properties).forEach(([fieldName, fieldSchema]: [string, any]) => {
                          const fieldPath = parentPath ? `${parentPath}.${fieldName}` : fieldName;

                          let fieldType: string = 'string';
                          if (fieldSchema.type) {
                            switch (fieldSchema.type) {
                              case 'string': fieldType = 'string'; break;
                              case 'number':
                              case 'integer': fieldType = 'number'; break;
                              case 'boolean': fieldType = 'boolean'; break;
                              case 'object': fieldType = 'object'; break;
                              case 'array': fieldType = 'array'; break;
                              default: fieldType = 'string';
                            }
                          }

                          const schemaField: any = {
                            name: fieldName,
                            path: fieldPath,
                            type: fieldType,
                            isRequired: ajvSchema.required?.includes(fieldName) || false
                          };

                          // Handle nested objects
                          if (fieldType === 'object' && fieldSchema.properties) {
                            schemaField.children = convertAjvToSchemaFields(fieldSchema, fieldPath);
                          }

                          // Handle arrays with object items
                          if (fieldType === 'array' && fieldSchema.items) {
                            if (fieldSchema.items.type === 'object' && fieldSchema.items.properties) {
                              schemaField.arrayElementType = 'object';
                              // For array elements, append [0] to the path for proper display
                              schemaField.children = convertAjvToSchemaFields(fieldSchema.items, `${fieldPath}[0]`);
                            } else {
                              schemaField.arrayElementType = fieldSchema.items.type || 'string';
                            }
                          }

                          schemaFields.push(schemaField);
                        });
                      }

                      return schemaFields;
                    };

                    const convertedFields = convertAjvToSchemaFields(schemaToUse);
                    console.log('🔍 EditEndpointModal - Converted schema fields for PayloadEditor:', convertedFields);
                    console.log('🔍 First few fields:', convertedFields.slice(0, 5).map(f => ({ name: f.name, path: f.path, type: f.type })));
                    return convertedFields;
                  })()}
                  data-id="element-740"
                />


              </>
            )}
            {currentStep === 'mapping' && (
              <>
                {console.log('EditEndpointModal - inferredSchema:', inferredSchema)}
                {console.log('EditEndpointModal - createdEndpoint:', createdEndpoint)}
                {console.log('EditEndpointModal - currentSchema for mapping:', currentSchema)}
                <MappingUtility
                  onMappingChange={setIsMappingValid}
                  onCurrentMappingsChange={updateCurrentMappings}
                  sourceSchema={currentSchema || createdEndpoint?.schema || inferredSchema?.schema || existingConfig?.schema}
                  templateType="Acmt.023"
                  configId={createdEndpoint?.id || existingConfig?.id}
                  existingMappings={
                    // Priority: currentMappings (most recent) > createdEndpoint.mapping > existingConfig.mapping > empty array
                    currentMappings.length > 0
                      ? currentMappings
                      : (!isNewEndpoint && existingConfig?.mapping
                        ? existingConfig.mapping
                        : createdEndpoint?.mapping || [])
                  }
                  readOnly={readOnly}
                  data-id="element-741"
                />
              </>
            )}
            {currentStep === 'functions' && (
              <>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Select Functions</h3>

                  {/* Validation Warning - Show if there are unmapped parameters (only for editors, not approvers/viewers) */}
                  {!readOnly && selectedFunctions.length > 0 && (() => {
                    const validationErrors = validateFunctionParameters();
                    if (validationErrors.length > 0) {
                      return;
                    }
                    return (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                        onClick={() => setShowAddFunctionModal(true)}
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
                      <div className="text-center py-12">
                        <p className="text-gray-500 mb-4">No functions selected. {!readOnly ? 'Click "Add Function" to select functions to call at runtime.' : ''}</p>
                      </div>
                    ) : (
                      selectedFunctions.map((func, index) => {
                        // Check which parameters are missing mappings for this function (case-insensitive, strip prefixes)
                        // Note: tenantId is NOT included in runtime context because it should be mapped from source fields
                        const runtimeContextFields = ['userid', 'user_id'];
                        const mappedDestinations = new Set<string>();
                        
                        currentMappings.forEach((mapping: any) => {
                          const processDestination = (dest: string) => {
                            // Strip common prefixes before storing
                            const withoutPrefix = dest.replace(/^(redis\.|transactionDetails\.|dataCache\.|transaction\.|cache\.)/i, '');
                            mappedDestinations.add(withoutPrefix.toLowerCase());
                          };
                          
                          if (mapping.destination) {
                            if (Array.isArray(mapping.destination)) {
                              mapping.destination.forEach((dest: string) => processDestination(dest));
                            } else {
                              processDestination(mapping.destination);
                            }
                          }
                          if (mapping.destinations && Array.isArray(mapping.destinations)) {
                            mapping.destinations.forEach((dest: string) => processDestination(dest));
                          }
                        });

                        const unmappedParams = func.params.filter(param => {
                          // Strip prefix from parameter before checking
                          const paramWithoutPrefix = param.replace(/^(redis\.|transactionDetails\.|dataCache\.|transaction\.|cache\.)/i, '');
                          const paramLower = paramWithoutPrefix.toLowerCase();
                          return !runtimeContextFields.includes(paramLower) && !mappedDestinations.has(paramLower);
                        });

                        return (
                          <div 
                            key={index} 
                            className={`p-4 rounded-lg border flex justify-between items-center ${
                              unmappedParams.length > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{func.functionName}</h4>
                                {unmappedParams.length > 0 && (
                                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                                    {unmappedParams.length} unmapped
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                Parameters: {func.params.map(param => {
                                  // Strip prefix from parameter before checking
                                  const paramWithoutPrefix = param.replace(/^(redis\.|transactionDetails\.|dataCache\.|transaction\.|cache\.)/i, '');
                                  const paramLower = paramWithoutPrefix.toLowerCase();
                                  const isMapped = runtimeContextFields.includes(paramLower) || mappedDestinations.has(paramLower);
                                  const isRuntime = runtimeContextFields.includes(paramLower);
                                  return (
                                    <span 
                                      key={param}
                                      className={
                                        isRuntime ? 'text-blue-600' : 
                                        isMapped ? 'text-green-600' : 
                                        'text-red-600 font-medium'
                                      }
                                      title={
                                        isRuntime ? 'Runtime context field' :
                                        isMapped ? 'Mapped' : 
                                        'Not mapped - please create a mapping for this parameter'
                                      }
                                    >
                                      {param}
                                    </span>
                                  );
                                }).reduce((prev, curr) => [prev, ', ', curr] as any)}
                              </p>
                              {unmappedParams.length > 0 && (
                                <p className="text-xs text-red-600 mt-2">
                                  ⚠️ Missing mappings: {unmappedParams.join(', ')}
                                </p>
                              )}
                            </div>
                            {/* Remove button - Only show when not read-only */}
                            {!readOnly && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleRemoveFunction(index)}
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
                        <h3 className="text-lg font-semibold">Add Function</h3>
                        <button
                          onClick={() => setShowAddFunctionModal(false)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <XIcon className="w-5 h-5" />
                        </button>
                      </div>

                      <FunctionSelectionForm
                        onAddFunction={handleAddFunction}
                        onClose={() => setShowAddFunctionModal(false)}
                      />
                    </div>
                </Backdrop>
                  </div>
                )}
              </>
            )}
            {currentStep === 'simulation' && (
              <SimulationPanel
                endpointId={createdEndpoint?.id || existingConfig?.id}
                contentType={endpointData.contentType as 'application/json' | 'application/xml'}
                onSimulationComplete={setIsSimulationSuccess}
                readOnly={readOnly}
                data-id="element-742"
              />
            )}
            {currentStep === 'deploy' && (() => {
              const configId = createdEndpoint?.id || existingConfig?.id;
              const endpointPath = createdEndpoint?.endpointPath || existingConfig?.endpointPath || '/transactions/acmt.023';
              const configData = createdEndpoint || existingConfig;
              console.log('🎯 Rendering DeploymentConfirmation with:', { configId, endpointPath, transactionType: endpointData.transactionType, hasConfigData: !!configData });
              return <DeploymentConfirmation configId={configId} configData={configData} endpointPath={endpointPath} transactionType={endpointData.transactionType} data-id="element-743" />;
            })()}
          </div>
        </div>
        <div className="px-6 py-3 border-t border-gray-200 flex justify-between" data-id="element-744">
          <Button variant="secondary" onClick={onClose} data-id="element-747" className=' !py-[6px]'>
            Cancel
          </Button>
          {/* Hide action buttons on deploy step when in read-only mode for non-approvers */}
          {!(readOnly && currentStep === 'deploy' && !isApprover(user?.claims || []) && !isExporter(user?.claims || []) && !isPublisher(user?.claims || [])) && (
            <div className="flex items-center space-x-4" data-id="element-746">
              {currentStep !== 'payload' && (
                <Button variant="secondary" className=' !pb-[6px] !pt-[5px]' onClick={() => {
                  const currentIndex = steps.findIndex(s => s.id === currentStep);
                  if (currentIndex > 0) {
                    // Clear any previous step-specific errors when navigating backward
                    setError(null);
                    setCurrentStep(steps[currentIndex - 1].id as any);
                  }
                }} data-id="element-745">
                  Back
                </Button>
              )}
              {!readOnly && (
                <Button variant="primary" className=' !pb-[6px] !pt-[5px] bg-[#2b7fff]' onClick={async () => {
                  console.log('🎯 Save and Next button clicked, currentStep:', currentStep);
                  console.log('createdEndpoint:', createdEndpoint);
                  console.log('existingConfig:', existingConfig);
                  await handleSaveAndNext();
                }} disabled={loading ||
                  (currentStep === 'mapping' && !isMappingValid) ||
                  (currentStep === 'simulation' && !isSimulationSuccess && !readOnly) ||
                  (currentStep !== 'payload' && !createdEndpoint && !existingConfig) ||
                  (currentStep === 'deploy' && !isApprover(user?.claims || []) && !isExporter(user?.claims || []) && (isStatus(createdEndpoint?.status, 'STATUS_03_UNDER_REVIEW') || isStatus(createdEndpoint?.status, 'STATUS_04_APPROVED') || isStatus(existingConfig?.status, 'STATUS_03_UNDER_REVIEW') || isStatus(existingConfig?.status, 'STATUS_04_APPROVED'))) ||
                  (currentStep === 'deploy' && isApprover(user?.claims || []) && (isStatus(createdEndpoint?.status, '') || isStatus(existingConfig?.status, 'STATUS_04_APPROVED'))) ||
                  (currentStep === 'deploy' && isExporter(user?.claims || []) && (!isStatus(createdEndpoint?.status, 'STATUS_04_APPROVED') && !isStatus(existingConfig?.status, 'STATUS_04_APPROVED')))
                } data-id="element-749">
                  {loading ? 'Processing...' : (
                    currentStep === 'deploy' ? (
                      isApprover(user?.claims || []) && (!isStatus(createdEndpoint?.status, 'STATUS_04_APPROVED') && !isStatus(existingConfig?.status, 'STATUS_04_APPROVED')) ? 'Send for Deployment' :
                        isExporter(user?.claims || []) && (isStatus(createdEndpoint?.status, 'STATUS_04_APPROVED') || isStatus(existingConfig?.status, 'STATUS_04_APPROVED')) ? 'Export' :
                          !isApprover(user?.claims || []) && !isExporter(user?.claims || []) ? 'Send for Approval' :
                            'Configuration Approved'
                    ) :
                      'Save and Next'
                  )}
                </Button>
              )}
              {/* Show Next button for approvers, editors, and exporters in read-only mode on all steps */}
              {readOnly && (isApprover(user?.claims || []) || isEditor(user?.claims || []) || isExporter(user?.claims || []) || isPublisher(user?.claims || [])) && (
                <>
                  {(() => {
                    const currentIndex = steps.findIndex(s => s.id === currentStep);
                    return (
                      <>
                        {currentIndex < steps.length - 1 && (
                          <Button variant="primary"  className=' !pb-[6px] !pt-[5px] bg-[#2b7fff]' onClick={handleNext}>
                            Next
                          </Button>
                        )}
                        {/* Show approver action buttons on the last step (deployment) */}
                        {isApprover(user?.claims || []) && currentStep === 'deploy' && (
                          <>
                            {onRevertToEditor && (!isStatus(createdEndpoint?.status, 'STATUS_04_APPROVED') && !isStatus(existingConfig?.status, 'STATUS_06_EXPORTED')) && (
                              <Button
                                variant="primary"
                                onClick={onRevertToEditor}
                                className=' !pb-[6px] !pt-[5px] bg-red-600 hover:bg-red-700 text-white'
                              >
                                Reject
                              </Button>
                            )}
                            {onSendForDeployment && (!isStatus(createdEndpoint?.status, 'STATUS_04_APPROVED') && !isStatus(existingConfig?.status, 'STATUS_06_EXPORTED')) && (
                              <Button
                                variant="primary"
                                onClick={onSendForDeployment}
                                className="!pb-[6px] !pt-[5px] bg-green-600 hover:bg-green-700 text-white"
                              >
                                Approve
                              </Button>
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
                        {isEditor(user?.claims || []) && currentStep === 'deploy' && (
                          <>
                            {/* Show Submit for Approval button for draft configs or when config is ready for submission */}
                            {((!isStatus(createdEndpoint?.status, 'STATUS_03_UNDER_REVIEW') && !isStatus(createdEndpoint?.status, 'STATUS_04_APPROVED')) ||
                              (!isStatus(existingConfig?.status, 'STATUS_03_UNDER_REVIEW') && !isStatus(existingConfig?.status, 'STATUS_04_APPROVED')) ||
                              (!createdEndpoint?.status && !existingConfig?.status)) && (
                                <Button
                                  variant="primary"
                                  onClick={async () => await handleSaveAndNext()}
                                  disabled={loading}
                                  className="!pb-[6px] !pt-[5px] bg-[#2b7fff] text-white"
                                >
                                  {loading ? 'Processing...' : 'Submit for Approval'}
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