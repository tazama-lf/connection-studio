import React, { useState, useEffect } from 'react';
import { XIcon } from 'lucide-react';
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
import { isApprover } from '../../utils/roleUtils';

// Function Selection Form Component
interface FunctionSelectionFormProps {
  onAddFunction: (functionData: AddFunctionDto) => void;
  onClose: () => void;
}

const FunctionSelectionForm: React.FC<FunctionSelectionFormProps> = ({ onAddFunction, onClose }) => {
  const [selectedFunction, setSelectedFunction] = useState<AllowedFunctionName>('addAccount');
  const [selectedConfiguration, setSelectedConfiguration] = useState('');

  const functionConfig = FUNCTION_CONFIGS[selectedFunction];
  
  const handleAddFunction = () => {
    const config = functionConfig.configurations.find(c => c.name === selectedConfiguration);
    if (!config) return;
    
    const params = config.parameters.split(', ').map(p => p.trim());
    onAddFunction({
      functionName: selectedFunction,
      params
    });
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
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedConfiguration === config.name
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
  readOnly?: boolean; // When true, modal is in read-only mode for approvers
}
 const EditEndpointModal: React.FC<EditEndpointModalProps> = ({
  isOpen,
  onClose,
  endpointId,
  onSuccess,
  isCloneMode = false,
  readOnly = false
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

  const [currentMappings, setCurrentMappings] = useState<any[]>([]); // Current mappings from MappingUtility

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
    label: 'Simulation'
  }, {
    id: 'deploy',
    label: isApprover(user?.claims || []) ? 'Send for Deployment' : 'Submit for Approval'
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
            
            setExistingConfig(config);
            
            // Check if config is approved and show error immediately (only when not in read-only mode)
            if (config.status === 'approved' && !readOnly) {
              setError('This configuration has been approved and cannot be edited directly. Please clone the configuration to create a new version.');
            }
            
            // Pre-populate form data with existing config
            // For clone mode, adjust version and transaction type to indicate it's a clone
            const isCloning = isCloneMode && endpointId !== -1;
            setEndpointData({
              version: isCloning ? '1.0' : (config.version || '1.0'), // Reset version for clones
              transactionType: isCloning ? `${config.transactionType}_COPY` : (config.transactionType || ''),
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
            setInferredSchema(config.schema);
            
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
    
    switch (currentStep) {
      case 'payload':
        // Check if payload step is saved and valid
        if (!createdEndpoint && isNewEndpoint) {
          showError('Please save the payload first before proceeding');
          return;
        }
        console.log('✅ Moving from payload to mapping');
        setCurrentStep('mapping');
        break;
      case 'mapping':
        if (!isMappingValid) {
          showError('Please complete the mapping before proceeding');
          return;
        }
        setCurrentStep('functions');
        break;
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
      
      console.log('💾 Adding function to backend:', functionData);
      const response = await FunctionsApiService.addFunction(configId, functionData);
      
      if (response.success) {
        console.log('✅ Function added successfully to backend');
        
        // Add to local state only after successful API call
        const newFunction: FunctionDefinition = {
          functionName: functionData.functionName,
          params: functionData.params
        };
        setSelectedFunctions([...selectedFunctions, newFunction]);
        
        setShowAddFunctionModal(false);
        console.log('Function added successfully');
      } else {
        console.error('❌ Failed to add function:', response.message);
        showError(`Failed to add function: ${response.message}`);
      }
    } catch (error) {
      console.error('❌ Error adding function:', error);
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
        
        console.log('✅ Function removed successfully');
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
    setCurrentStep('simulation');
  };

  // Step 4: Submit for Approval (simulation is handled by SimulationPanel)
  const handleRunSimulation = async () => {
    if (!isSimulationSuccess) {
      setError('Please run the simulation first and ensure it passes');
      return;
    }

    // Simply move to the next step since simulation is handled by SimulationPanel
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

      if (!configResponse.success || !configResponse.config?.mapping || configResponse.config.mapping.length === 0) {
        console.log('❌ No mapping found in database');
        setError('At least one mapping must be created before deployment');
        return;
      }

      console.log('✅ Found mappings in database:', configResponse.config.mapping.length);
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
        if (currentStatus === 'under_review') {
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

  const handleSave = async () => {
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

    // Save the current configuration to the database without advancing steps
    // For editing existing configs, always save; for new configs, validate first
    if (!createdEndpoint || !isNewEndpoint) {

      try {
        // Create configuration request using user-entered data
        const createRequest: CreateConfigRequest = {
          msgFam: endpointData.msgFam?.trim() || undefined,
          transactionType: endpointData.transactionType,
          version: endpointData.version,
          contentType: endpointData.contentType as 'application/json' | 'application/xml',
          payload: payload,
        };

        // CRITICAL: Use the current schema from PayloadEditor (includes user edits)
        if (!isNewEndpoint && currentSchema) {
          createRequest.schema = currentSchema;
          console.log('🔄 Using current edited schema from PayloadEditor:', currentSchema);
        } else if (!isNewEndpoint && existingConfig?.schema) {
          createRequest.schema = existingConfig.schema;
          console.log('🔒 Preserving existing schema (no current edits):', existingConfig.schema);
        }

        console.log('🔥 EditEndpointModal.handleSave - Saving configuration:');
        console.log('📦 Create request data:', createRequest);
        console.log('📊 Full endpoint data:', endpointData);
        console.log('📄 Payload length:', payload.length);
        console.log('🆕 Is new endpoint?', isNewEndpoint);
        console.log('🆔 Endpoint ID:', endpointId);
        console.log('⚠️  NOTE: This request does NOT include schema - backend will auto-generate from payload!');
        
        let response: ConfigResponse;
        
        // Determine actual config ID to use
        const actualConfigId = createdEndpoint?.id || existingConfig?.id || endpointId;
        const shouldCreate = !createdEndpoint && !existingConfig && isNewEndpoint;
        const action = shouldCreate ? 'create' : 'update';
        
        if (shouldCreate) {
          console.log('Creating NEW config...');
          response = await configApi.createConfig(createRequest);
        } else {
          console.log('Updating EXISTING config with ID:', actualConfigId);
          response = await configApi.updateConfig(actualConfigId, createRequest);
        }
        
        console.log('Save API Response:', response);
        console.log('🔍 Response success status:', response.success);
        console.log('🔍 Response message:', response.message);
        
        if (!response.success) {
          console.log('❌ Save failed - response.success is false');
          
          // Check for specific error messages that need user-friendly handling
          let errorMessage = response.message || `Failed to ${action} configuration`;
          
          // Handle approved config editing error with more user-friendly message
          if (response.message && response.message.includes('Editing not allowed')) {
            errorMessage = 'This configuration has been approved and cannot be edited directly. Please clone the configuration to create a new version.';
          }
          
          setError(errorMessage);
          if (response.validation?.errors) {
            console.error('Validation errors:', response.validation.errors);
          }
          return;
        }
        
        console.log('✅ Save successful - proceeding with config update');

        if (response.config) {
          console.log('🎯 Setting createdEndpoint with config:', response.config);
          setCreatedEndpoint(response.config);
          setInferredSchema(response.config.schema);
          const action = isNewEndpoint ? 'saved' : 'updated';
          console.log(`Configuration ${action} successfully:`, response.config);
          
          // Call success callback to refresh parent data
          if (onSuccess) {
            onSuccess();
          }
          
          // Show success message to user
          const actionWord = isNewEndpoint ? 'created' : 'updated';
          console.log(`✅ Configuration ${actionWord} successfully! Changes reflected in database.`);
          
          // Save successful - do not advance step automatically
          // User must click "Next" to advance to next step
          showSuccess('Configuration saved successfully! Click Next to proceed.');
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
    } else {
      // Config already exists from file import - just show confirmation
      console.log('Configuration already saved with ID:', createdEndpoint.id);
      showSuccess('Configuration is already saved! Click Next to proceed.');
    }
  };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Enhanced blurred backdrop */}
      <div 
        className="fixed inset-0 backdrop-blur-sm backdrop-saturate-150 z-40" 
        onClick={onClose}
      />
      
      {/* Modal Content - Higher z-index to appear above backdrop */}
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden relative z-50 shadow-2xl" data-id="element-727">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200" data-id="element-728">
          <h2 className="text-xl font-semibold text-gray-800" data-id="element-729">
            {isNewEndpoint ? 'Create New Connection' : isCloning ? 'Clone Configuration' : readOnly ? 'View Configuration' : 'Edit Configuration'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" data-id="element-730">
            <XIcon size={24} data-id="element-731" />
          </button>
        </div>
        <div className="overflow-y-auto p-6 max-h-[calc(90vh-120px)]" data-id="element-732">
          {/* Error Display - Show prominently when there's an error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-900 mb-1">Error</h4>
                  <p className="text-sm text-red-700">{error}</p>
                  {error.includes('approved and cannot be edited') && (
                    <div className="mt-3">
                      <button
                        onClick={() => {
                          // Close current modal and trigger clone mode
                          onClose();
                          // Note: Parent component should handle opening in clone mode
                        }}
                        className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-sm rounded text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Clone Configuration
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setError(null)}
                  className="flex-shrink-0 text-red-500 hover:text-red-700"
                  title="Dismiss error"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <div className="mb-8" data-id="element-733">
            <div className="flex justify-between items-center" data-id="element-734">
              {steps.map((step, index) => <div key={step.id} className="flex items-center" data-id="element-735">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep === step.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`} data-id="element-736">
                    {index + 1}
                  </div>
                  <span className={`ml-2 ${currentStep === step.id ? 'text-blue-600 font-medium' : 'text-gray-500'}`} data-id="element-737">
                    {step.label}
                  </span>
                  {index < steps.length - 1 && <div className="mx-4 h-0.5 w-16 bg-gray-200" data-id="element-738" />}
                </div>)}
            </div>
          </div>

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
                  existingSchemaFields={(() => {
                    // Get schema from multiple sources: newly created endpoint, inferred schema, or existing config
                    const schemaToUse = createdEndpoint?.schema || inferredSchema || existingConfig?.schema;
                    
                    if (!schemaToUse) return undefined;
                    
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
                              schemaField.children = convertAjvToSchemaFields(fieldSchema.items, fieldPath);
                            } else {
                              schemaField.arrayElementType = fieldSchema.items.type || 'string';
                            }
                          }
                          
                          schemaFields.push(schemaField);
                        });
                      }
                      
                      return schemaFields;
                    };
                    
                    return convertAjvToSchemaFields(schemaToUse);
                  })()}
                  data-id="element-740" 
                />
                
               
              </>
            )}
            {currentStep === 'mapping' && (
              <>
                {console.log('EditEndpointModal - inferredSchema:', inferredSchema)}
                {console.log('EditEndpointModal - createdEndpoint:', createdEndpoint)}
                <MappingUtility 
                  onMappingChange={setIsMappingValid} 
                  onCurrentMappingsChange={updateCurrentMappings}
                  sourceSchema={createdEndpoint?.schema || inferredSchema?.schema || existingConfig?.schema}
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

                    {/* Add Function Button - Only show when not read-only */}
                  {!readOnly && (
                    <div className="flex justify-end">
                      <Button
                        onClick={() => setShowAddFunctionModal(true)}
                        variant="secondary"
                        className="border-blue-600 text-blue-600 hover:bg-blue-50"
                      >
                        + Add Function
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
                      selectedFunctions.map((func, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg border flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">{func.functionName}</h4>
                            <p className="text-sm text-gray-600">Parameters: {func.params.join(', ')}</p>
                          </div>
                          {/* Remove button - Only show when not read-only */}
                          {!readOnly && (
                            <button
                              onClick={() => handleRemoveFunction(index)}
                              className="text-red-600 hover:text-red-800 px-2 py-1"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  
                
                  
                </div>

                {/* Add Function Modal */}
                {showAddFunctionModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Enhanced blurred backdrop - matching other modals */}
                    <div 
                      className="fixed inset-0 backdrop-blur-sm backdrop-saturate-150 z-40" 
                      onClick={() => setShowAddFunctionModal(false)}
                    />
                    
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
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between" data-id="element-744">
          <Button variant="secondary" onClick={onClose} data-id="element-747">
            Cancel
          </Button>
          {/* Hide action buttons on deploy step when in read-only mode for non-approvers */}
          {!(readOnly && currentStep === 'deploy' && !isApprover(user?.claims || [])) && (
            <div className="space-x-4" data-id="element-746">
              <Button variant="secondary" onClick={() => {
              const currentIndex = steps.findIndex(s => s.id === currentStep);
              if (currentIndex > 0) {
                setCurrentStep(steps[currentIndex - 1].id as any);
              }
            }} disabled={currentStep === 'payload'} data-id="element-745">
                Back
              </Button>
              {!readOnly && (
                <Button variant="secondary" onClick={handleSave} data-id="element-748">
                  Save
                </Button>
              )}
              <Button variant="primary" onClick={async () => {
                console.log('🎯 Button clicked, currentStep:', currentStep);
                console.log('createdEndpoint:', createdEndpoint);
                console.log('existingConfig:', existingConfig);
                if (currentStep === 'deploy') {
                  console.log('Calling handleDeploy');
                  await handleDeploy();
                } else {
                  console.log('Calling handleNextStep');
                  handleNextStep();
                }
              }} disabled={loading || 
                (currentStep === 'payload' && (!createdEndpoint && isNewEndpoint)) || 
                (currentStep === 'mapping' && !isMappingValid) || 
                (currentStep === 'simulation' && !isSimulationSuccess && !readOnly) ||
                (!createdEndpoint && !existingConfig) ||
                (currentStep === 'deploy' && !isApprover(user?.claims || []) && (createdEndpoint?.status === 'under_review' || createdEndpoint?.status === 'approved' || existingConfig?.status === 'under_review' || existingConfig?.status === 'approved')) ||
                (currentStep === 'deploy' && isApprover(user?.claims || []) && (createdEndpoint?.status === 'approved' || existingConfig?.status === 'approved'))
              } data-id="element-749">
                {loading ? 'Processing...' : (
                  currentStep === 'deploy' ? (
                    isApprover(user?.claims || []) && (createdEndpoint?.status !== 'approved' && existingConfig?.status !== 'approved') ? 'Send for Deployment' : 
                    !isApprover(user?.claims || []) ? 'Submit for Approval' :
                    'Configuration Approved'
                  ) : 
                  currentStep === 'functions' ? 'Next' :
                  'Next'
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditEndpointModal;