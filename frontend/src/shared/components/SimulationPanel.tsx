import React, { useState } from 'react';
import { Button } from './Button';
import { CheckCircleIcon, XCircleIcon, UploadIcon } from 'lucide-react';
import { simulationApi, type SimulationResult } from '../services/simulationApi';
interface SimulationPanelProps {
  endpointId?: number;
  contentType?: 'application/json' | 'application/xml';
  onSimulationComplete: (success: boolean) => void;
  readOnly?: boolean;
}
export const SimulationPanel: React.FC<SimulationPanelProps> = ({
  endpointId,
  contentType = 'application/json',
  onSimulationComplete,
  readOnly = false
}) => {
  const [hasRun, setHasRun] = useState(false);
  const [testPayload, setTestPayload] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        const content = e.target?.result as string;
        setTestPayload(content);
      };
      reader.readAsText(file);
    }
  };
  const runSimulation = async () => {
    if (!endpointId) {
      setSimulationError('No endpoint ID provided for simulation');
      return;
    }

    if (!testPayload.trim()) {
      setSimulationError('Please enter a test payload');
      return;
    }

    setIsRunning(true);
    setSimulationError(null);
    setSimulationResult(null);

    try {
      // Validate payload format based on content type
      try {
        if (contentType === 'application/json') {
          JSON.parse(testPayload); // Just validate, don't store
        }
        // For XML, we can add validation later if needed
      } catch (parseError) {
        throw new Error(`Invalid ${contentType} format: ${parseError instanceof Error ? parseError.message : 'Parse error'}`);
      }

      // Convert content type to backend enum format
      const payloadType = contentType === 'application/json' ? 'json' : 'xml';

      // Run simulation via API
      const result = await simulationApi.runSimulation({
        configId: endpointId,
        payloadType: payloadType as 'json' | 'xml',
        testPayload: testPayload
      });

      setSimulationResult(result);
      setHasRun(true);
      onSimulationComplete(result.status === 'PASSED');

      console.log('Simulation completed:', result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown simulation error';
      setSimulationError(errorMessage);
      console.error('Simulation failed:', error);
    } finally {
      setIsRunning(false);
    }
  };
  return <div className="space-y-6" data-id="element-700">
      <div className="flex justify-between items-center" data-id="element-701">
        <h3 className="text-lg font-medium text-gray-900" data-id="element-702">Test Mapping</h3>
      </div>
      {/* Test Payload Input */}
      <div className="space-y-4" data-id="element-703">
        <div className="flex justify-between items-center" data-id="element-704">
          <h4 className="text-md font-medium text-gray-700" data-id="element-705">Test Payload</h4>
          <div className="flex items-center space-x-2" data-id="element-706">
            <input type="file" id="test-payload-upload" className="hidden" accept=".xml,.json" onChange={handleFileUpload} data-id="element-707" />
            <Button variant="secondary" size="sm" icon={<UploadIcon size={16} data-id="element-709" />} onClick={() => document.getElementById('test-payload-upload')?.click()} disabled={readOnly} data-id="element-708">
              Import Test File
            </Button>
          </div>
        </div>
        {/* Code Editor for Test Payload */}
        <div className="border rounded-md" data-id="element-710">
          <textarea 
            value={testPayload} 
            onChange={e => setTestPayload(e.target.value)} 
            className="w-full h-96 p-4 font-mono text-sm bg-gray-50" 
            spellCheck="false" 
            placeholder="Enter or upload a test payload to simulate the transformation..." 
            readOnly={readOnly}
            data-id="element-711" 
          />
        </div>
        {/* Error Message */}
        {simulationError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            {simulationError}
          </div>
        )}

        <div className="flex justify-end" data-id="element-712">
          <Button variant="primary" onClick={runSimulation} disabled={!testPayload.trim() || isRunning || !endpointId || readOnly} data-id="element-713">
            {isRunning ? 'Running Simulation...' : 'Run Simulation'}
          </Button>
        </div>
      </div>
      {hasRun && simulationResult && <div className="space-y-4" data-id="element-714">
          {/* Validation Status */}
          <div className={`p-4 ${simulationResult.status === 'PASSED' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-md`} data-id="element-715">
            <div className="flex items-center" data-id="element-716">
              {simulationResult.status === 'PASSED' ? <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" data-id="element-717" /> : <XCircleIcon className="h-5 w-5 text-red-500 mr-2" data-id="element-718" />}
              <span className={`font-medium ${simulationResult.status === 'PASSED' ? 'text-green-700' : 'text-red-700'}`} data-id="element-719">
                {simulationResult.status === 'PASSED' ? 'Simulation Passed' : 'Simulation Failed'}
              </span>
            </div>
            
            {/* Validation Steps Summary */}
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Stages Passed:</span>
                <span className="font-medium text-gray-700">{simulationResult.summary?.passedStages || 0} / {simulationResult.summary?.totalStages || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Stages Failed:</span>
                <span className="font-medium text-gray-700">{simulationResult.summary?.failedStages || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Mappings Applied:</span>
                <span className="font-medium text-gray-700">{simulationResult.summary?.mappingsApplied || 0}</span>
              </div>
            </div>

            {/* Detailed Stages */}
            {simulationResult.stages && simulationResult.stages.length > 0 && (
              <div className="mt-3 space-y-2">
                <h5 className="text-sm font-medium text-gray-700">Validation Stages:</h5>
                {simulationResult.stages.map((stage, index) => (
                  <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                    <span className="font-medium">{stage.name}:</span>
                    <span className={`font-medium ${stage.status === 'PASSED' ? 'text-green-600' : stage.status === 'FAILED' ? 'text-red-600' : 'text-yellow-600'}`}>
                      {stage.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Error Messages */}
            {(simulationResult.errors?.length || 0) > 0 && (
              <div className="mt-3 space-y-2" data-id="element-721">
                <h5 className="text-sm font-medium text-red-700">Errors:</h5>
                {simulationResult.errors?.map((error, index) => (
                  <div key={index} className="text-sm text-red-600 bg-red-25 p-2 rounded" data-id="element-722">
                    <div className="font-medium">{error.field}:</div>
                    <div>{error.message}</div>
                    {error.path && <div className="text-xs text-red-500">Path: {error.path}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Transformed Output */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md" data-id="element-723">
            <h4 className="text-sm font-medium text-gray-700 mb-2" data-id="element-724">
              Transformed Output:
            </h4>
            <pre className="bg-white p-3 rounded text-sm overflow-auto" data-id="element-725">
              {JSON.stringify(simulationResult.transformedPayload || {}, null, 2)}
            </pre>
          </div>
        </div>}
    </div>;
};