import React, { useState } from 'react';
import { Button } from './Button';
import { CheckCircleIcon, XCircleIcon, UploadIcon } from 'lucide-react';
interface SimulationPanelProps {
  onSimulationComplete: (success: boolean) => void;
}
export const SimulationPanel: React.FC<SimulationPanelProps> = ({
  onSimulationComplete
}) => {
  const [hasRun, setHasRun] = useState(false);
  const [testPayload, setTestPayload] = useState('');
  const [simulationResult, setSimulationResult] = useState<{
    success: boolean;
    transformedData: any;
    errors?: string[];
  }>({
    success: false,
    transformedData: null
  });
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
  const runSimulation = () => {
    // Simulate transformation and validation
    const result = {
      success: true,
      transformedData: {
        id: '123456',
        value: 1000,
        currencyCode: 'USD',
        channel: 'MOBILE_APP' // Transformed from originatingChannel
      },
      errors: []
    };
    setSimulationResult(result);
    setHasRun(true);
    onSimulationComplete(result.success);
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
            <Button variant="secondary" size="sm" icon={<UploadIcon size={16} data-id="element-709" />} onClick={() => document.getElementById('test-payload-upload')?.click()} data-id="element-708">
              Import Test File
            </Button>
          </div>
        </div>
        {/* Code Editor for Test Payload */}
        <div className="border rounded-md" data-id="element-710">
          <textarea value={testPayload} onChange={e => setTestPayload(e.target.value)} className="w-full h-48 p-4 font-mono text-sm bg-gray-50" spellCheck="false" placeholder="Enter or upload a test payload to simulate the transformation..." data-id="element-711" />
        </div>
        <div className="flex justify-end" data-id="element-712">
          <Button variant="primary" onClick={runSimulation} disabled={!testPayload.trim()} data-id="element-713">
            Run Simulation
          </Button>
        </div>
      </div>
      {hasRun && <div className="space-y-4" data-id="element-714">
          {/* Validation Status */}
          <div className={`p-4 ${simulationResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-md`} data-id="element-715">
            <div className="flex items-center" data-id="element-716">
              {simulationResult.success ? <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" data-id="element-717" /> : <XCircleIcon className="h-5 w-5 text-red-500 mr-2" data-id="element-718" />}
              <span className={`font-medium ${simulationResult.success ? 'text-green-700' : 'text-red-700'}`} data-id="element-719">
                {simulationResult.success ? 'Validation Passed' : 'Validation Failed'}
              </span>
            </div>
            {simulationResult.success ? <p className="mt-2 text-sm text-green-600" data-id="element-720">
                All fields have been successfully mapped and validated.
              </p> : <div className="mt-2 space-y-2" data-id="element-721">
                {simulationResult.errors?.map((error, index) => <p key={index} className="text-sm text-red-600" data-id="element-722">
                    {error}
                  </p>)}
              </div>}
          </div>
          {/* Transformed Output */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md" data-id="element-723">
            <h4 className="text-sm font-medium text-gray-700 mb-2" data-id="element-724">
              Transformed Output:
            </h4>
            <pre className="bg-white p-3 rounded text-sm overflow-auto" data-id="element-725">
              {JSON.stringify(simulationResult.transformedData, null, 2)}
            </pre>
          </div>
        </div>}
    </div>;
};