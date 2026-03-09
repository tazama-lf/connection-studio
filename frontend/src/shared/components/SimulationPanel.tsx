import React, { useState } from 'react';
import { Button } from './Button';
import { CheckCircleIcon, XCircleIcon, UploadIcon } from 'lucide-react';
import {
  simulationApi,
  type SimulationResult,
} from '../services/simulationApi';
import ReactJson from 'react-json-view';
import { useAuth } from '@features/auth';
import { isApprover } from '@utils/common/roleUtils';
import { XMLParser } from 'fast-xml-parser';
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
  readOnly = false,
}: SimulationPanelProps): React.JSX.Element => {
  const { user } = useAuth();
  const isApproverUser = isApprover(user?.claims ?? []);
  const [hasRun, setHasRun] = useState(false);
  const [testPayload, setTestPayload] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] =
    useState<SimulationResult | null>(null);
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setTestPayload(content);
      };
      reader.readAsText(file);
    }
  };
  const runSimulation = async (): Promise<void> => {
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
      try {
        if (contentType === 'application/json') {
          JSON.parse(testPayload); // Just validate, don't store
        }
      } catch (parseError: unknown) {
        throw new Error(
          parseError instanceof Error ? parseError.message : 'Invalid JSON format'
        );
      }

      const payloadType = contentType === 'application/json' ? 'json' : 'xml';

      const xmlparser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
      });
      const jsonResult = xmlparser.parse(testPayload);

      // Run simulation via API
      const result = await simulationApi.runSimulation({
        configId: endpointId,
        payloadType: 'json',
        testPayload:
          payloadType === 'json' ? testPayload : JSON.stringify(jsonResult),
      });

      setSimulationResult(result);
      setHasRun(true);
      onSimulationComplete(result.status === 'PASSED');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown simulation error';
      setSimulationError(errorMessage);
    } finally {
      setIsRunning(false);
    }
  };
  return (
    <div className="space-y-6" data-id="element-700">
      <div className="flex justify-between items-center" data-id="element-701">
        {/* <h3 className="text-lg font-medium text-gray-900" data-id="element-702">
          Test Mapping
        </h3> */}
      </div>
      {/* Test Payload Input */}
      <div className="space-y-4" data-id="element-703">
        <div
          className="flex justify-between items-center"
          data-id="element-704"
        >
          <h4
            className="text-md font-semibold flex items-center gap-2 text-blue-900"
            data-id="element-705"
          >
            <UploadIcon size={18} className="text-blue-500" />
            Test Payload
            <span className="ml-2 text-xs font-normal text-gray-500">
              (Enter or import a sample payload to simulate)
            </span>
          </h4>
          <div className="flex items-center space-x-2" data-id="element-706">
            <input
              type="file"
              id="test-payload-upload"
              className="hidden"
              accept=".xml,.json"
              onChange={handleFileUpload}
              data-id="element-707"
            />
            <Button
              variant="secondary"
              size="sm"
              icon={<UploadIcon size={16} data-id="element-709" />}
              onClick={() =>
                document.getElementById('test-payload-upload')?.click()
              }
              disabled={isApproverUser ? false : readOnly}
              data-id="element-708"
            >
              Import Test File
            </Button>
          </div>
        </div>
        {/* Code Editor for Test Payload */}
        <div className=" rounded-md relative bg-white" data-id="element-710">
          <textarea
            value={testPayload}
            onChange={(e) => { setTestPayload(e.target.value); }}
            className="w-full h-[400px] p-4 font-mono text-sm bg-white focus:outline-none border rounded-md resize-none scrollbar-hide"
            spellCheck="false"
            placeholder="Enter or upload a test payload to simulate the transformation..."
            readOnly={isApproverUser ? false : readOnly}
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
          <Button
            variant="primary"
            size="sm"
            onClick={async (): Promise<void> => { await runSimulation(); }}
            disabled={
              !testPayload.trim() ||
              isRunning ||
              !endpointId ||
              (isApproverUser ? false : readOnly)
            }
            data-id="element-713"
          >
            {isRunning ? 'Running Simulation...' : 'Run Simulation'}
          </Button>
        </div>
      </div>
      {hasRun && simulationResult && (
        <div className="space-y-4" data-id="element-714">
          {/* Validation Status */}
          <div
            className={`p-4 ${simulationResult.status === 'PASSED' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-md`}
            data-id="element-715"
          >
            <div className="flex items-center" data-id="element-716">
              {simulationResult.status === 'PASSED' ? (
                <CheckCircleIcon
                  className="h-5 w-5 text-green-500 mr-2"
                  data-id="element-717"
                />
              ) : (
                <XCircleIcon
                  className="h-5 w-5 text-red-500 mr-2"
                  data-id="element-718"
                />
              )}
              <span
                className={`font-medium ${simulationResult.status === 'PASSED' ? 'text-green-700' : 'text-red-700'}`}
                data-id="element-719"
              >
                {simulationResult.status === 'PASSED'
                  ? 'Simulation Passed'
                  : 'Simulation Failed'}
              </span>
            </div>

            {/* Validation Steps Summary */}
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Stages Passed:</span>
                <span className="font-medium text-gray-700">
                  {simulationResult.summary?.passedStages || 0} /{' '}
                  {simulationResult.summary?.totalStages || 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Stages Failed:</span>
                <span className="font-medium text-gray-700">
                  {simulationResult.summary.failedStages ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Mappings Applied:</span>
                <span className="font-medium text-gray-700">
                  {simulationResult.summary.mappingsApplied ?? 0}
                </span>
              </div>
            </div>

            {(simulationResult.stages && simulationResult.stages.length > 0) && (
              <div className="mt-3 space-y-2">
                <h5 className="text-sm font-medium text-gray-700">
                  Validation Stages:
                </h5>
                {simulationResult.stages.map((stage, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded"
                  >
                    <span className="font-medium">{stage.name}:</span>
                    <span
                      className={`font-medium ${stage.status === 'PASSED' ? 'text-green-600' : stage.status === 'FAILED' ? 'text-red-600' : 'text-yellow-600'}`}
                    >
                      {stage.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Error Messages */}
            {simulationResult.errors?.length > 0 && (
              <div className="mt-3 space-y-2" data-id="element-721">
                <h5 className="text-sm font-medium text-red-700">Errors:</h5>
                {simulationResult.errors.map((error, index) => (
                  <div
                    key={index}
                    className="text-sm text-red-600 bg-red-25 p-2 rounded"
                    data-id="element-722"
                  >
                    <div className="font-medium">{error.field}:</div>
                    <div>{error.message}</div>
                    {error.path && (
                      <div className="text-xs text-red-500">
                        Path: {error.path}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transformed Output */}
          <div
            className="p-4 bg-gray-50 border border-gray-200 rounded-md"
            data-id="element-723"
          >
            <h4
              className="text-sm font-medium text-gray-700 mb-2"
              data-id="element-724"
            >
              Transformed Output:
            </h4>
            {/* <pre className="bg-white p-3 rounded text-sm overflow-auto" data-id="element-725">
              {JSON.stringify(simulationResult.transformedPayload || {}, null, 2)}
            </pre> */}

            <div className="bg-white p-3 rounded h-[400px] overflow-auto">
              <ReactJson
                src={simulationResult.transformedPayload ?? {}}
                theme="rjv-default"
                name={false}
                displayDataTypes={false}
                displayObjectSize={true}
                enableClipboard={true}
                collapsed={false}
                style={{ fontSize: '13px' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
