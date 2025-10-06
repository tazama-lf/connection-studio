import React, { useState } from 'react';
import { XIcon } from 'lucide-react';
import { PayloadEditor } from './PayloadEditor';
import { MappingUtility } from './MappingUtility';
import { SimulationPanel } from './SimulationPanel';
import { DeploymentConfirmation } from './DeploymentConfirmation';
import { Button } from './Button';
// API client removed - backend restructuring in progress
interface EditEndpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  endpointId: number; // -1 indicates new endpoint creation
}
 const EditEndpointModal: React.FC<EditEndpointModalProps> = ({
  isOpen,
  onClose,
  endpointId
}) => {
  const isNewEndpoint = endpointId === -1;
  const [currentStep, setCurrentStep] = useState<'payload' | 'mapping' | 'simulation' | 'deploy'>('payload');
  const [payload, setPayload] = useState('');
  const [transactionType, setTransactionType] = useState<'transfers' | 'payments'>('transfers');
  const [isMappingValid, setIsMappingValid] = useState(false);
  const [isSimulationSuccess, setIsSimulationSuccess] = useState(false);
  
  // Endpoint form data from PayloadEditor
  const [endpointData, setEndpointData] = useState({
    path: '',
    method: 'POST',
    version: '1.0',
    transactionType: 'Transfers',
    description: '',
    contentType: 'application/json',
  });

  // Backend integration state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdEndpoint, setCreatedEndpoint] = useState<any | null>(null);
  const [inferredSchema, setInferredSchema] = useState<any | null>(null);
  const [createdMapping, setCreatedMapping] = useState<any | null>(null);
  const [mappingData, setMappingData] = useState<any | null>(null);
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
  const isPayloadStepValid = () => {
    return payload && 
           endpointData.path && 
           endpointData.method && 
           endpointData.version && 
           endpointData.transactionType && 
           endpointData.contentType;
  };

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

  // Step 1: Create Endpoint with Payload
  const handleCreateEndpoint = async () => {
    if (!payload.trim()) {
      setError('Please provide a payload');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create the endpoint using data from PayloadEditor
      const newEndpoint = {
        path: endpointData.path || `/v1/evaluate/EP${Date.now()}/iso20022/pacs.008.001.011-${transactionType}`,
        method: endpointData.method,
        version: endpointData.version,
        transactionType: endpointData.transactionType,
        description: endpointData.description || `Auto-created endpoint for ${transactionType}`,
        samplePayload: payload,
        contentType: endpointData.contentType,
      };

      // TODO: Replace with new backend API integration
      console.log('Endpoint creation placeholder:', newEndpoint);
      
      // Placeholder response until backend is restructured
      const mockEndpoint = { 
        id: Date.now(), 
        ...newEndpoint,
        createdAt: new Date().toISOString()
      };
      setCreatedEndpoint(mockEndpoint);
      
      // Mock schema inference
      const mockSchema = {
        properties: {},
        required: []
      };
      setInferredSchema(mockSchema);

      console.log('Endpoint created (placeholder):', mockEndpoint);
      console.log('Schema inferred (placeholder):', mockSchema);
      
      // Move to next step
      setCurrentStep('mapping');
    } catch (err) {
      setError(`Failed to create endpoint: ${err}`);
      console.error('Error creating endpoint:', err);
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
      // Create mapping with data from MappingUtility or fallback to auto-generated
      const mappingRequest = mappingData ? {
        name: `Mapping for ${createdEndpoint.path || 'Endpoint ' + createdEndpoint.id}`,
        endpointId: createdEndpoint.id,
        sourceFields: mappingData.sourceFields,
        destinationFields: mappingData.destinationFields,
        transformation: mappingData.transformation,
        constants: mappingData.constants
      } : {
        // Fallback auto-generated mapping
        name: `Auto-mapping for ${createdEndpoint.path || 'Endpoint ' + createdEndpoint.id}`,
        endpointId: createdEndpoint.id,
        sourceFields: inferredSchema.schema ? inferredSchema.schema.map((field: any) => ({
          path: field.path,
          type: field.type.toLowerCase(), // Backend expects lowercase types
          isRequired: field.isRequired || true,
        })) : [],
        destinationFields: inferredSchema.schema ? inferredSchema.schema.map((field: any) => ({
          path: `dest_${field.path}`, // Placeholder destination path
          type: field.type.toLowerCase(),
          isRequired: field.isRequired || true,
        })) : [],
        transformation: 'NONE', // Use proper enum value (NONE, CONCAT, SUM, SPLIT)
        constants: {}
      };

      // TODO: Replace with new backend API integration
      const mockMapping = {
        id: Date.now(),
        ...mappingRequest,
        createdAt: new Date().toISOString(),
        status: 'DRAFT'
      };
      setCreatedMapping(mockMapping);
      setIsMappingValid(true);

      console.log('Mapping created (placeholder):', mockMapping);
      
      // Move to next step
      setCurrentStep('simulation');
    } catch (err) {
      setError(`Failed to create mapping: ${err}`);
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
      // For now, simulate success (backend simulate endpoint may need implementation)
      const simulationResult = {
        success: true,
        transformedData: { simulated: true, mappingId: createdMapping.id },
        errors: [],
        warnings: [],
      };
      
      setSimulationResult(simulationResult);
      setIsSimulationSuccess(true);

      console.log('Simulation completed:', simulationResult);
      
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
      // TODO: Replace with new backend API integration
      console.log('Mapping deployment placeholder - status would be updated to ACTIVE');
      
      console.log('Mapping deployed successfully (placeholder)');
      
      // Close modal and refresh parent component
      handleSave();
    } catch (err) {
      setError(`Deployment failed: ${err}`);
      console.error('Error deploying:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    // Save the current configuration without sending for approval
    console.log('Saving configuration...');
    onClose();
  };
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-id="element-726">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden relative z-10" data-id="element-727">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200" data-id="element-728">
          <h2 className="text-xl font-semibold text-gray-800" data-id="element-729">
            {isNewEndpoint ? 'Create New Connection' : 'Edit Endpoint'}
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
            {currentStep === 'payload' && <PayloadEditor value={payload} onChange={setPayload} isNewEndpoint={true} transactionType={transactionType} onTransactionTypeChange={setTransactionType} onEndpointDataChange={setEndpointData} data-id="element-740" />}
            {currentStep === 'mapping' && <MappingUtility onMappingChange={setIsMappingValid} onMappingDataChange={setMappingData} sourceSchema={inferredSchema?.schema} templateType="Acmt.023" data-id="element-741" />}
            {currentStep === 'simulation' && <SimulationPanel onSimulationComplete={setIsSimulationSuccess} data-id="element-742" />}
            {currentStep === 'deploy' && <DeploymentConfirmation endpointPath="/transactions/acmt.023" transactionType={transactionType} data-id="element-743" />}
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