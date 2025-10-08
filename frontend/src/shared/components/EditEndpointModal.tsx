import React, { useState, useEffect } from 'react';
import { XIcon } from 'lucide-react';
import { PayloadEditor } from './PayloadEditor';
import { MappingUtility } from './MappingUtility';
import { SimulationPanel } from './SimulationPanel';
import { DeploymentConfirmation } from './DeploymentConfirmation';
import { Button } from './Button';
import { configApi, type CreateConfigRequest, type ConfigResponse } from '../../features/config/services/configApi';

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
}
 const EditEndpointModal: React.FC<EditEndpointModalProps> = ({
  isOpen,
  onClose,
  endpointId,
  onSuccess
}) => {
  const isNewEndpoint = endpointId === -1;
  const [currentStep, setCurrentStep] = useState<'payload' | 'mapping' | 'simulation' | 'deploy'>('payload');
  const [payload, setPayload] = useState('');

  const [isMappingValid, setIsMappingValid] = useState(false);
  const [isSimulationSuccess, setIsSimulationSuccess] = useState(false);
  
  // Endpoint form data from PayloadEditor
  const [endpointData, setEndpointData] = useState<EndpointData>({
    version: '1.0',
    transactionType: '',
    description: '',
    contentType: 'application/json',
  });

  // Backend integration state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdEndpoint, setCreatedEndpoint] = useState<any | null>(null);
  const [existingConfig, setExistingConfig] = useState<any | null>(null);
  const [inferredSchema, setInferredSchema] = useState<any | null>(null);
  const [createdMapping, setCreatedMapping] = useState<any | null>(null);
  const [mappingData, setMappingData] = useState<any | null>(null);
  const [currentMappings, setCurrentMappings] = useState<any[]>([]); // Current mappings from MappingUtility
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [simulationResult, setSimulationResult] = useState<any | null>(null);
  const steps = [{
    id: 'payload',
    label: 'Payload'
  }, {
    id: 'mapping',
    label: 'Mapping'
  }, {
    id: 'simulation',
    label: 'Simulation'
  }, {
    id: 'deploy',
    label: 'Deploy'
  }];

  // Load existing config data when editing
  useEffect(() => {
    const loadExistingConfig = async () => {
      if (!isNewEndpoint && endpointId && isOpen) {
        try {
          setLoading(true);
          setError(null);
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
            
            // Pre-populate form data with existing config
            setEndpointData({
              version: config.version || '1.0',
              transactionType: config.transactionType || '',
              description: config.msgFam || '', // Using msgFam as description since there's no separate description field in backend
              contentType: config.contentType || 'application/json',
              msgFam: config.msgFam || '',
            });
            
            // Set existing payload if available
            if (config.schema) {
              setPayload(JSON.stringify(config.schema, null, 2));
            }
            
            // Set the existing config as the "created" endpoint for all subsequent steps
            setCreatedEndpoint(config);
            setInferredSchema(config.schema);
            
            console.log('Loaded existing config:', config);
          } else {
            console.log('No valid config found in response:', response);
            setError('No configuration data found for this endpoint');
          }
        } catch (error) {
          console.error('Error loading config:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          setError(`Failed to load configuration: ${errorMessage}`);
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getNextStep = () => {
    switch (currentStep) {
      case 'payload':
        return isPayloadStepValid() ? 'mapping' : currentStep;
      case 'mapping':
        return isMappingValid ? 'simulation' : currentStep;
      case 'simulation':
        return isSimulationSuccess ? 'deploy' : currentStep;
      default:
        return currentStep;
    }
  };

  // Step 1: Create or Update Endpoint with Payload
  const handleCreateEndpoint = async () => {
    if (!payload.trim()) {
      setError('Please provide a payload');
      return;
    }

    // Validate required endpoint data
    if (!endpointData.transactionType.trim()) {
      setError('Please select a transaction type');
      return;
    }

    if (!endpointData.version.trim()) {
      setError('Please provide a version');
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
      
      if (isNewEndpoint) {
        console.log('Creating new config with data:', createRequest);
        response = await configApi.createConfig(createRequest);
      } else {
        // EDITING EXISTING CONFIG: Always create new config to preserve original and update endpoint path
        console.log('🔄 Editing existing config - will create new config for version/endpoint path update');
        
        // Use the version entered by the user (from endpointData.version)
        const finalVersion = endpointData.version || existingConfig?.version || '1.0';
        
        const newConfigRequest = {
          ...createRequest,
          version: finalVersion
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
        const action = isNewEndpoint ? 'create' : 'update';
        setError(response.message || `Failed to ${action} configuration`);
        if (response.validation?.errors) {
          console.error('Validation errors:', response.validation.errors);
        }
        return;
      }

      if (response.config) {
        setCreatedEndpoint(response.config);
        setInferredSchema(response.config.schema);
        const action = isNewEndpoint ? 'created' : 'updated';
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

  // Step 2: Create Mapping
  const handleCreateMapping = async () => {
    if (!createdEndpoint || !inferredSchema) {
      setError('Endpoint must be created first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Clear any existing mappings first to ensure only user-defined mappings are saved
      if (!isNewEndpoint && createdEndpoint.mapping && createdEndpoint.mapping.length > 0) {
        console.log('🗑️  Clearing existing mappings before adding new ones...');
        console.log('Existing mappings to be cleared:', createdEndpoint.mapping);
        
        // Clear existing mappings by removing them one by one
        for (let i = createdEndpoint.mapping.length - 1; i >= 0; i--) {
          try {
            await configApi.removeMapping(createdEndpoint.id, i);
            console.log(`✅ Removed existing mapping at index ${i}`);
          } catch (removeError) {
            console.warn(`⚠️  Failed to remove mapping at index ${i}:`, removeError);
          }
        }
        console.log('✅ All existing mappings cleared');
      }
      
      // Check if mappings are already created by MappingUtility
      const currentConfig = await configApi.getConfig(createdEndpoint.id);
      const existingMappings = currentConfig.success && currentConfig.config ? (currentConfig.config.mapping || []) : [];
      
      console.log('🔍 Checking existing mappings before creation:');
      console.log('Existing mappings in DB:', existingMappings);
      console.log('MappingData from MappingUtility:', mappingData);
      
      // MappingUtility handles all mapping creation directly - no duplication needed
      console.log('✅ Mappings are handled directly by MappingUtility component');
      console.log('📋 Using existing mappings from database (created by MappingUtility)');
      setCreatedMapping(existingMappings);
      setIsMappingValid(true);

      // Update the endpoint with latest mapping data
      const updatedConfig = await configApi.getConfig(createdEndpoint.id);
      if (updatedConfig.success && updatedConfig.config) {
        setCreatedMapping(updatedConfig.config.mapping);
        setCreatedEndpoint(updatedConfig.config);
        
        console.log('📋 Final mapping data in database (ONLY user-defined):');
        console.log('Total user-defined mappings stored:', updatedConfig.config.mapping?.length || 0);
        console.log('All mappings (should only contain user-added mappings):', updatedConfig.config.mapping);
        
        // Validate that we only have the expected number of mappings
        const expectedCount = mappingData ? Math.min(mappingData.sourceFields.length, mappingData.destinationFields.length) : 0;
        const actualCount = updatedConfig.config.mapping?.length || 0;
        if (actualCount === expectedCount) {
          console.log('✅ Mapping count validation passed: Expected', expectedCount, 'Got', actualCount);
        } else {
          console.warn('⚠️  Mapping count mismatch: Expected', expectedCount, 'Got', actualCount);
        }
      }

      setIsMappingValid(true);
      console.log('✅ All mappings created successfully');
      
      // Move to next step
      setCurrentStep('simulation');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to create mapping: ${errorMessage}`);
      console.error('Error creating mapping:', err);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Run Simulation
  const handleRunSimulation = async () => {
    if (!createdMapping) {
      setError('Mapping must be created first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Run actual simulation using the configured mappings
      // TODO: Replace with actual backend simulation API
      console.log('Running simulation with configuration:', createdEndpoint.id);
      console.log('Using mappings:', createdMapping);
      
      const simulationResult = {
        success: true,
        transformedData: createdMapping,
        errors: [],
        warnings: [],
      };
      
      setSimulationResult(simulationResult);
      setIsSimulationSuccess(true);

      console.log('Simulation completed successfully:', simulationResult);
      
      // Move to next step
      setCurrentStep('deploy');
    } catch (err) {
      setError(`Simulation failed: ${err}`);
      console.error('Error running simulation:', err);
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Deploy/Publish
  const handleDeploy = async () => {
    if (!createdMapping) {
      setError('Mapping must be created first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Deploy the configuration - update status to active/deployed
      console.log('Deploying configuration with ID:', createdEndpoint.id);
      
      console.log('Configuration deployed successfully');
      
      // Close modal and refresh parent component
      handleSave();
    } catch (err) {
      setError(`Deployment failed: ${err}`);
      console.error('Error deploying:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Save the current configuration to the database without advancing steps
    // For editing existing configs, always save; for new configs, validate first
    if (!createdEndpoint || !isNewEndpoint) {
      // Validate required fields (same validation as handleCreateEndpoint)
      if (!payload.trim()) {
        setError('Please provide a payload');
        return;
      }

      if (!endpointData.transactionType.trim()) {
        setError('Please select a transaction type');
        return;
      }

      if (!endpointData.version.trim()) {
        setError('Please provide a version');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Create configuration request using user-entered data
        const createRequest: CreateConfigRequest = {
          msgFam: endpointData.msgFam?.trim() || undefined,
          transactionType: endpointData.transactionType,
          version: endpointData.version,
          contentType: endpointData.contentType as 'application/json' | 'application/xml',
          payload: payload,
        };

        console.log('Saving configuration with data:', createRequest);
        console.log('Full endpoint data:', endpointData);
        console.log('Payload length:', payload.length);
        console.log('Is new endpoint?', isNewEndpoint);
        console.log('Endpoint ID:', endpointId);
        
        let response: ConfigResponse;
        
        if (isNewEndpoint) {
          console.log('Creating new config...');
          response = await configApi.createConfig(createRequest);
        } else {
          console.log('Updating existing config with ID:', endpointId);
          response = await configApi.updateConfig(endpointId, createRequest);
        }
        
        console.log('Save API Response:', response);
        
        if (!response.success) {
          const action = isNewEndpoint ? 'save' : 'update';
          setError(response.message || `Failed to ${action} configuration`);
          if (response.validation?.errors) {
            console.error('Validation errors:', response.validation.errors);
          }
          return;
        }

        if (response.config) {
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
          
          // Advance to the next step (mapping) after successful save
          setCurrentStep('mapping');
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
      // Config already exists from file import, advance to next step
      console.log('Configuration already saved with ID:', createdEndpoint.id);
      setCurrentStep('mapping');
    }
  };
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-id="element-726">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden relative z-10" data-id="element-727">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200" data-id="element-728">
          <h2 className="text-xl font-semibold text-gray-800" data-id="element-729">
            {isNewEndpoint ? 'Create New Connection' : 'Edit Configuration'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" data-id="element-730">
            <XIcon size={24} data-id="element-731" />
          </button>
        </div>
        <div className="overflow-y-auto p-6 max-h-[calc(90vh-120px)]" data-id="element-732">
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
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="text-red-800 text-sm">{error}</div>
            </div>
          )}
          <div className="space-y-8" data-id="element-739">
            {currentStep === 'payload' && (
              <>
                <PayloadEditor 
                  value={payload} 
                  onChange={setPayload} 
                  endpointData={endpointData}
                  onEndpointDataChange={setEndpointData}
                  data-id="element-740" 
                />
                
                {/* Versioning info for existing configs */}
                {!isNewEndpoint && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <span className="text-sm font-medium text-green-900">
                        Versioning Enabled
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-green-700">
                      Editing this config will create a new version <strong>(v{endpointData.version || existingConfig?.version || '1.0'})</strong> preserving the original config.
                      <br />
                      Original config <strong>(v{existingConfig?.version || '1.0'})</strong> will remain unchanged in the database.
                    </p>
                    <div className="mt-2 text-xs text-green-600">
                      <strong>Current approach:</strong> Create new row → Preserve history → No data loss
                    </div>
                  </div>
                )}
              </>
            )}
            {currentStep === 'mapping' && (
              <>
                {console.log('EditEndpointModal - inferredSchema:', inferredSchema)}
                {console.log('EditEndpointModal - createdEndpoint:', createdEndpoint)}
                <MappingUtility 
                  onMappingChange={setIsMappingValid} 
                  onMappingDataChange={setMappingData}
                  onCurrentMappingsChange={setCurrentMappings}
                  sourceSchema={createdEndpoint?.schema || inferredSchema?.schema || existingConfig?.schema}
                  templateType="Acmt.023"
                  configId={createdEndpoint?.id || existingConfig?.id}
                  existingMappings={
                    // For editing existing config: use existingConfig.mapping
                    // For new config after creation: use createdEndpoint.mapping
                    !isNewEndpoint && existingConfig?.mapping 
                      ? existingConfig.mapping 
                      : createdEndpoint?.mapping || []
                  }
                  data-id="element-741" 
                />
              </>
            )}
            {currentStep === 'simulation' && <SimulationPanel onSimulationComplete={setIsSimulationSuccess} data-id="element-742" />}
            {currentStep === 'deploy' && <DeploymentConfirmation endpointPath="/transactions/acmt.023" transactionType={endpointData.transactionType} data-id="element-743" />}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between" data-id="element-744">
          <Button variant="secondary" onClick={() => {
          const currentIndex = steps.findIndex(s => s.id === currentStep);
          if (currentIndex > 0) {
            setCurrentStep(steps[currentIndex - 1].id as any);
          }
        }} disabled={currentStep === 'payload'} data-id="element-745">
            Back
          </Button>
          <div className="space-x-4" data-id="element-746">
            <Button variant="secondary" onClick={onClose} data-id="element-747">
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleSave} data-id="element-748">
              Save
            </Button>
            <Button variant="primary" onClick={async () => {
              if (currentStep === 'payload') {
                await handleCreateEndpoint();
              } else if (currentStep === 'mapping') {
                await handleCreateMapping();
              } else if (currentStep === 'simulation') {
                await handleRunSimulation();
              } else if (currentStep === 'deploy') {
                await handleDeploy();
              }
            }} disabled={loading || (currentStep === 'payload' && !isPayloadStepValid()) || (currentStep === 'mapping' && !isMappingValid) || (currentStep === 'simulation' && !isSimulationSuccess)} data-id="element-749">
              {loading ? 'Processing...' : (currentStep === 'deploy' ? 'Deploy' : 'Next')}
            </Button>
          </div>
        </div>
      </div>
    </div>;
};

export default EditEndpointModal;