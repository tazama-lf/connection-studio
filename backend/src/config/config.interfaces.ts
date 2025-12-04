// // Re-export types from tcs-lib for consistency
import type {
  Config,
  ConfigResponseDto,
  SchemaField,
} from '@tazama-lf/tcs-lib';

export type {
  JSONSchema,
  AdjustFieldDto,
  FieldMapping,
  FunctionDefinition,
  AllowedFunctionName,
  CreateConfigDto,
  CloneConfigDto,
  UpdateConfigDto,
  AddMappingDto,
  AddFunctionDto,
  StatusTransitionDto,
  SubmitForApprovalDto,
  ApprovalDto,
  RejectionDto,
  DeploymentDto,
  WorkflowValidationResult,
  StatusTransitionValidation,
  WorkflowAction,
  TransactionType,
  SchemaField,
  Config,
  ConfigResponseDto,
} from '@tazama-lf/tcs-lib';

export { ContentType, ConfigStatus } from '@tazama-lf/tcs-lib';

export const AdditionalConfigStatus = {
  EXPORTED: 'EXPORTED' as const,
} as const;

// Additional workflow actions used by the backend
export const AdditionalWorkflowAction = {
  EXPORT: 'export' as const,
  RETURN_TO_PROGRESS: 'return_to_progress' as const,
} as const;

export interface MappingSource {
  field: string; 
}

export interface MappingDestination {
  field: string; 
}


export interface UpdateConfigStatusDto {
  status: string; 
}
