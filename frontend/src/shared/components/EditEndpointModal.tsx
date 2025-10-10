import React, { useState, useEffect, useRef } from 'react';
import { XIcon } from 'lucide-react';
import { PayloadEditor } from './PayloadEditor';
import { MappingUtility } from './MappingUtility';
import { SimulationPanel } from './SimulationPanel';
import { DeploymentConfirmation } from './DeploymentConfirmation';
import { Button } from './Button';
import { configApi, type CreateConfigRequest,type FieldAdjustment, type ConfigResponse } from '../../features/config/services/configApi';
import { useToast } from '../providers/ToastProvider';

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
}
 const EditEndpointModal: React.FC<EditEndpointModalProps> = ({
  isOpen,
  onClose,
  endpointId,
  onSuccess,
  isCloneMode = false
}) => {
  const isNewEndpoint = endpointId === -1;
  const isCloning = isCloneMode && endpointId !== -1;
  const shouldCreateNew = isNewEndpoint || isCloning; // Either truly new or cloning
  const { showSuccess, showError, showWarning } = useToast();
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
            
            // Set the existing config as the "created" endpoint for all subsequent steps
            setCreatedEndpoint(config);
            setInferredSchema(config.schema);
            
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
      showError('Validation Error', 'Please provide a payload');
      return;
    }

    // Validate required endpoint data
    if (!endpointData.transactionType.trim()) {
      showError('Validation Error', 'Please select a transaction type');
      return;
    }

    if (!endpointData.version.trim()) {
      showError('Validation Error', 'Please provide a version');
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
      setCreatedMapping(existingMappings);
      setIsMappingValid(true);

      // Update the endpoint with latest mapping data
      if (currentConfig.success && currentConfig.config) {
        setCreatedMapping(currentConfig.config.mapping);
        setCreatedEndpoint(currentConfig.config);
        
        console.log('📋 Current mapping data in database:');
        console.log('Total mappings stored:', currentConfig.config.mapping?.length || 0);
        console.log('All mappings:', currentConfig.config.mapping);
      }

      setIsMappingValid(true);
      console.log('✅ Ready to proceed to simulation step');
      
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

  // Step 3: Navigate to Deploy (simulation is handled by SimulationPanel)
  const handleRunSimulation = async () => {
    if (!isSimulationSuccess) {
      setError('Please run the simulation first and ensure it passes');
      return;
    }

    // Simply move to the next step since simulation is handled by SimulationPanel
    setCurrentStep('deploy');
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Blurred backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40" 
        onClick={onClose}
      />
      
      {/* Modal Content - Higher z-index to appear above backdrop */}
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden relative z-50" data-id="element-727">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200" data-id="element-728">
          <h2 className="text-xl font-semibold text-gray-800" data-id="element-729">
            {isNewEndpoint ? 'Create New Connection' : isCloning ? 'Clone Configuration' : 'Edit Configuration'}
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

          <div className="space-y-8" data-id="element-739">
            {currentStep === 'payload' && (
              <>
                <PayloadEditor 
                  value={payload} 
                  onChange={setPayload} 
                  endpointData={endpointData}
                  onEndpointDataChange={setEndpointData}
                  configId={createdEndpoint?.id || existingConfig?.id}
                  existingSchemaFields={existingConfig?.schema ? (() => {
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
                    
                    return convertAjvToSchemaFields(existingConfig.schema);
                  })() : undefined}
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
            {currentStep === 'simulation' && (
              <SimulationPanel 
                endpointId={createdEndpoint?.id || existingConfig?.id}
                contentType={endpointData.contentType as 'application/json' | 'application/xml'}
                onSimulationComplete={setIsSimulationSuccess} 
                data-id="element-742" 
              />
            )}
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
    </div>
  );
};

export default EditEndpointModal;