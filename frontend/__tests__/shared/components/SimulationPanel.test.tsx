import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SimulationPanel } from '../../../src/shared/components/SimulationPanel';
import * as ButtonModule from '../../../src/shared/components/Button';
import { simulationApi } from '../../../src/shared/services/simulationApi';
import { useAuth } from '../../../src/features/auth';
import { isApprover } from '../../../src/utils/common/roleUtils';

jest.mock('../../../src/shared/services/simulationApi', () => ({
  simulationApi: {
    runSimulation: jest.fn(),
  },
}));

jest.mock('../../../src/features/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../src/utils/common/roleUtils', () => ({
  isApprover: jest.fn(),
}));

describe('SimulationPanel', () => {
  const mockedRunSimulation = simulationApi.runSimulation as jest.Mock;
  const mockedUseAuth = useAuth as jest.Mock;
  const mockedIsApprover = isApprover as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({ user: { claims: ['editor'] } });
    mockedIsApprover.mockReturnValue(false);
  });

  it('keeps run button disabled without payload', () => {
    render(
      <SimulationPanel endpointId={10} onSimulationComplete={jest.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Run Simulation' })).toBeDisabled();
  });

  it('shows validation error for invalid JSON payload', async () => {
    const onSimulationComplete = jest.fn();

    render(
      <SimulationPanel endpointId={10} onSimulationComplete={onSimulationComplete} />,
    );

    fireEvent.change(screen.getByPlaceholderText(/Enter or upload a test payload/i), {
      target: { value: '{ invalid json' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Run Simulation' }));

    expect(
      await screen.findByText(/Invalid JSON format|Expected property name/i),
    ).toBeInTheDocument();
    expect(mockedRunSimulation).not.toHaveBeenCalled();
    expect(onSimulationComplete).not.toHaveBeenCalled();
  });

  it('runs JSON simulation and renders success details', async () => {
    const onSimulationComplete = jest.fn();

    mockedRunSimulation.mockResolvedValueOnce({
      status: 'PASSED',
      errors: [],
      stages: [{ name: 'Schema Validation', status: 'PASSED', message: 'ok' }],
      tcsResult: {},
      transformedPayload: { normalized: true },
      summary: {
        endpointId: 10,
        tenantId: 't1',
        timestamp: '2026-01-01T00:00:00Z',
        mappingsApplied: 2,
        totalStages: 3,
        passedStages: 3,
        failedStages: 0,
      },
    });

    render(
      <SimulationPanel endpointId={10} onSimulationComplete={onSimulationComplete} />,
    );

    fireEvent.change(screen.getByPlaceholderText(/Enter or upload a test payload/i), {
      target: { value: '{"name":"john"}' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Run Simulation' }));

    await waitFor(() => {
      expect(mockedRunSimulation).toHaveBeenCalledWith({
        configId: 10,
        payloadType: 'json',
        testPayload: '{"name":"john"}',
      });
    });

    expect(await screen.findByText('Simulation Passed')).toBeInTheDocument();
    expect(screen.getByText('Schema Validation:')).toBeInTheDocument();
    expect(onSimulationComplete).toHaveBeenCalledWith(true);
  });

  it('parses XML payload before submitting simulation', async () => {
    const onSimulationComplete = jest.fn();

    mockedRunSimulation.mockResolvedValueOnce({
      status: 'FAILED',
      errors: [{ field: 'body', message: 'invalid' }],
      stages: [{ name: 'Mapping', status: 'FAILED', message: 'bad mapping' }],
      tcsResult: {},
      transformedPayload: {},
      summary: {
        endpointId: 11,
        tenantId: 't2',
        timestamp: '2026-01-01T00:00:00Z',
        mappingsApplied: 0,
        totalStages: 2,
        passedStages: 1,
        failedStages: 1,
      },
    });

    render(
      <SimulationPanel
        endpointId={11}
        contentType="application/xml"
        onSimulationComplete={onSimulationComplete}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText(/Enter or upload a test payload/i), {
      target: { value: '<root><amount>5</amount></root>' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Run Simulation' }));

    await waitFor(() => {
      expect(mockedRunSimulation).toHaveBeenCalled();
    });

    const requestPayload = mockedRunSimulation.mock.calls[0][0];
    expect(requestPayload.configId).toBe(11);
    expect(requestPayload.payloadType).toBe('json');
    expect(typeof requestPayload.testPayload).toBe('string');
    expect(requestPayload.testPayload).toContain('amount');
    expect(onSimulationComplete).toHaveBeenCalledWith(false);
  });

  it('shows simulation error when API call fails', async () => {
    mockedRunSimulation.mockRejectedValueOnce(new Error('API unavailable'));

    render(
      <SimulationPanel endpointId={22} onSimulationComplete={jest.fn()} />,
    );

    fireEvent.change(screen.getByPlaceholderText(/Enter or upload a test payload/i), {
      target: { value: '{"x":1}' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Run Simulation' }));

    expect(await screen.findByText('API unavailable')).toBeInTheDocument();
  });

  it('enforces readOnly for non-approver users', () => {
    render(
      <SimulationPanel endpointId={30} readOnly={true} onSimulationComplete={jest.fn()} />,
    );

    expect(screen.getByPlaceholderText(/Enter or upload a test payload/i)).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Run Simulation' })).toBeDisabled();
  });

  it('allows approver user even when readOnly is true', () => {
    mockedIsApprover.mockReturnValue(true);

    render(
      <SimulationPanel endpointId={30} readOnly={true} onSimulationComplete={jest.fn()} />,
    );

    expect(screen.getByPlaceholderText(/Enter or upload a test payload/i)).not.toHaveAttribute('readonly');
  });

  it('loads payload content when a file is uploaded', async () => {
    const fileContent = '{"file":"data"}';

    render(
      <SimulationPanel endpointId={10} onSimulationComplete={jest.fn()} />,
    );

    const fileInput = document.getElementById('test-payload-upload') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    const mockFile = new File([fileContent], 'payload.json', { type: 'application/json' });

    const readAsTextSpy = jest.spyOn(FileReader.prototype, 'readAsText').mockImplementation(function(this: FileReader) {
      Object.defineProperty(this, 'result', { value: fileContent, configurable: true });
      this.onload?.({ target: this } as ProgressEvent<FileReader>);
    });

    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      configurable: true,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/Enter or upload a test payload/i),
      ).toHaveValue(fileContent);
    });

    readAsTextSpy.mockRestore();
  });

  it('handles file upload when no file is selected', () => {
    render(
      <SimulationPanel endpointId={10} onSimulationComplete={jest.fn()} />,
    );

    const fileInput = document.getElementById('test-payload-upload') as HTMLInputElement;
    // Fire change event with no files
    Object.defineProperty(fileInput, 'files', {
      value: [],
      configurable: true,
    });

    expect(() => fireEvent.change(fileInput)).not.toThrow();
  });

  it('clicks Import Test File button to trigger file input click', () => {
    render(
      <SimulationPanel endpointId={10} onSimulationComplete={jest.fn()} />,
    );

    const fileInput = document.getElementById('test-payload-upload') as HTMLInputElement;
    const clickSpy = jest.spyOn(fileInput, 'click').mockImplementation(() => {});

    fireEvent.click(screen.getByRole('button', { name: /Import Test File/i }));

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('handles null user (claims ?? [] fallback)', () => {
    mockedUseAuth.mockReturnValue({ user: null });
    mockedIsApprover.mockReturnValue(false);
    render(<SimulationPanel endpointId={10} onSimulationComplete={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Run Simulation' })).toBeDisabled();
  });

  it('shows unknown simulation error when API rejects with non-Error', async () => {
    mockedRunSimulation.mockRejectedValueOnce('string-error');

    render(<SimulationPanel endpointId={22} onSimulationComplete={jest.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/Enter or upload a test payload/i), {
      target: { value: '{"x":1}' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Run Simulation' }));

    expect(await screen.findByText('Unknown simulation error')).toBeInTheDocument();
  });

  it('renders stage with FAILED status and error with path field', async () => {
    mockedRunSimulation.mockResolvedValueOnce({
      status: 'FAILED',
      errors: [{ field: 'x', message: 'bad', path: '/x/y' }],
      stages: [{ name: 'Stage1', status: 'FAILED' }],
      tcsResult: {},
      transformedPayload: {},
      summary: { passedStages: 0, totalStages: 1, failedStages: 1, mappingsApplied: 0 },
    });

    render(<SimulationPanel endpointId={10} onSimulationComplete={jest.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/Enter or upload a test payload/i), {
      target: { value: '{"x":1}' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run Simulation' }));

    await waitFor(() => {
      expect(screen.getByText('Simulation Failed')).toBeInTheDocument();
    });
    expect(screen.getByText('Path: /x/y')).toBeInTheDocument();
  });

  it('renders stage with unknown (SKIPPED) status as yellow class', async () => {
    mockedRunSimulation.mockResolvedValueOnce({
      status: 'PASSED',
      errors: [],
      stages: [{ name: 'Stage X', status: 'SKIPPED' }],
      tcsResult: {},
      transformedPayload: {},
      summary: { passedStages: 1, totalStages: 1, failedStages: 0, mappingsApplied: 0 },
    });

    render(<SimulationPanel endpointId={10} onSimulationComplete={jest.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/Enter or upload a test payload/i), {
      target: { value: '{"x":1}' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run Simulation' }));

    await waitFor(() => {
      expect(screen.getByText('Stage X:')).toBeInTheDocument();
      expect(screen.getByText('SKIPPED')).toBeInTheDocument();
    });
  });

  it('renders result with empty stages array (no Validation Stages section)', async () => {
    mockedRunSimulation.mockResolvedValueOnce({
      status: 'PASSED',
      errors: [],
      stages: [],
      tcsResult: {},
      transformedPayload: {},
      summary: { passedStages: 0, totalStages: 0, failedStages: 0, mappingsApplied: 0 },
    });

    render(<SimulationPanel endpointId={10} onSimulationComplete={jest.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/Enter or upload a test payload/i), {
      target: { value: '{"x":1}' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run Simulation' }));

    await waitFor(() => {
      expect(screen.getByText('Simulation Passed')).toBeInTheDocument();
    });
    expect(screen.queryByText('Validation Stages:')).not.toBeInTheDocument();
  });

  it('allows approver users to run simulation even when readOnly is true', async () => {
    mockedUseAuth.mockReturnValue({ user: { claims: ['approver'] } });
    mockedIsApprover.mockReturnValue(true);
    mockedRunSimulation.mockResolvedValueOnce({
      status: 'PASSED',
      errors: [],
      stages: [],
      tcsResult: {},
      transformedPayload: {},
      summary: { passedStages: 1, totalStages: 1, failedStages: 0, mappingsApplied: 0 },
    });

    render(
      <SimulationPanel
        endpointId={10}
        onSimulationComplete={jest.fn()}
        readOnly={true}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/Enter or upload a test payload/i), {
      target: { value: '{"x":1}' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run Simulation' }));

    await waitFor(() => {
      expect(mockedRunSimulation).toHaveBeenCalled();
    });
  });

  it('parses XML payloads before sending them to the simulation API', async () => {
    mockedRunSimulation.mockResolvedValueOnce({
      status: 'PASSED',
      errors: [],
      stages: [],
      tcsResult: {},
      transformedPayload: {},
      summary: { passedStages: 1, totalStages: 1, failedStages: 0, mappingsApplied: 0 },
    });

    render(
      <SimulationPanel
        endpointId={10}
        contentType="application/xml"
        onSimulationComplete={jest.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/Enter or upload a test payload/i), {
      target: { value: '<root><item>1</item></root>' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run Simulation' }));

    await waitFor(() => {
      expect(mockedRunSimulation).toHaveBeenCalledWith(
        expect.objectContaining({
          configId: 10,
          payloadType: 'json',
          testPayload: expect.stringContaining('root'),
        })
      );
    });
  });

  it('renders zero-value summary fallbacks and empty transformed output', async () => {
    mockedRunSimulation.mockResolvedValueOnce({
      status: 'FAILED',
      errors: [],
      stages: [{ name: 'Only Stage', status: 'FAILED' }],
      tcsResult: {},
      transformedPayload: undefined,
      summary: {},
    });

    render(<SimulationPanel endpointId={10} onSimulationComplete={jest.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/Enter or upload a test payload/i), {
      target: { value: '{"x":1}' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run Simulation' }));

    await waitFor(() => {
      expect(screen.getByText('Simulation Failed')).toBeInTheDocument();
      expect(screen.getByText('0 / 0')).toBeInTheDocument();
      expect(screen.getByText('Only Stage:')).toBeInTheDocument();
    });

    expect(screen.getByText('Transformed Output:')).toBeInTheDocument();
  });

  it('shows endpoint id error when the shared button is mocked to ignore disabled state', async () => {
    const buttonSpy = jest
      .spyOn(ButtonModule, 'Button')
      .mockImplementation(({ children, onClick }: any) => (
        <button onClick={onClick}>{children}</button>
      ));

    render(<SimulationPanel onSimulationComplete={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Run Simulation' }));

    await waitFor(() => {
      expect(
        screen.getByText('No endpoint ID provided for simulation')
      ).toBeInTheDocument();
    });

    buttonSpy.mockRestore();
  });

  it('shows empty payload error when the shared button is mocked to ignore disabled state', async () => {
    const buttonSpy = jest
      .spyOn(ButtonModule, 'Button')
      .mockImplementation(({ children, onClick }: any) => (
        <button onClick={onClick}>{children}</button>
      ));

    render(
      <SimulationPanel endpointId={10} onSimulationComplete={jest.fn()} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run Simulation' }));

    await waitFor(() => {
      expect(screen.getByText('Please enter a test payload')).toBeInTheDocument();
    });

    buttonSpy.mockRestore();
  });
});
