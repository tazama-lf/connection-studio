import { iMappingConfiguration, iMappingResult } from '@tazama-lf/tcs-lib';

export interface SimulatePayloadDto {
  endpointId: number;
  payloadType: 'application/json' | 'application/xml';
  payload: unknown;
  tcsMapping?: iMappingConfiguration;
}

export interface SimulationError {
  field: string;
  message: string;
  path?: string;
  value?: unknown;
}

export interface ValidationStage {
  name: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  message: string;
  errors?: SimulationError[];
  details?: unknown;
}

export interface SimulationResult {
  status: 'PASSED' | 'FAILED';
  errors: SimulationError[];
  stages: ValidationStage[];
  tcsResult: iMappingResult | null;
  transformedPayload: unknown;
  summary: {
    endpointId: number;
    tenantId: string;
    timestamp: string;
    validatedBy?: string;
    mappingsApplied: number;
    totalStages: number;
    passedStages: number;
    failedStages: number;
  };
}

export default {
  SimulatePayloadDto: null,
};
