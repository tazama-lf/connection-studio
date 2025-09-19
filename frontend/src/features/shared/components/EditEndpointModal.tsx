import React, { useState } from 'react';
import { XIcon } from 'lucide-react';
import { PayloadEditor } from './PayloadEditor';
import { MappingUtility } from './MappingUtility';
import { SimulationPanel } from './SimulationPanel';
import { DeploymentConfirmation } from './DeploymentConfirmation';
import { Button } from './Button';
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
  const getNextStep = () => {
    switch (currentStep) {
      case 'payload':
        return payload ? 'mapping' : currentStep;
      case 'mapping':
        return isMappingValid ? 'simulation' : currentStep;
      case 'simulation':
        return isSimulationSuccess ? 'deploy' : currentStep;
      default:
        return currentStep;
    }
  };
  const handleSave = () => {
    // Save the current configuration without sending for approval
    console.log('Saving configuration...');
    // Here you would implement the actual save functionality
  };
  if (!isOpen) return null;
  return <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" data-id="element-726">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden" data-id="element-727">
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
          <div className="space-y-8" data-id="element-739">
            {currentStep === 'payload' && <PayloadEditor value={payload} onChange={setPayload} isNewEndpoint={true} transactionType={transactionType} onTransactionTypeChange={setTransactionType} data-id="element-740" />}
            {currentStep === 'mapping' && <MappingUtility onMappingChange={setIsMappingValid} templateType="Acmt.023" data-id="element-741" />}
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
            <Button variant="primary" onClick={() => {
            const nextStep = getNextStep();
            if (nextStep !== currentStep) {
              setCurrentStep(nextStep as any);
            }
          }} disabled={currentStep === 'payload' && !payload || currentStep === 'mapping' && !isMappingValid || currentStep === 'simulation' && !isSimulationSuccess} data-id="element-749">
              {currentStep === 'deploy' ? 'Send for Approval' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>;
};

export default EditEndpointModal;