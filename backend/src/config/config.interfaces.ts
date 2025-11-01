// Re-export types from tcs-lib for consistency
export type {
  JSONSchema,
  AdjustFieldDto,
  FieldMapping,
  Config,
  FunctionDefinition,
  AllowedFunctionName,
  CreateConfigDto,
  CloneConfigDto,
  UpdateConfigDto,
  AddMappingDto,
  AddFunctionDto,
  ConfigResponseDto,
  StatusTransitionDto,
  SubmitForApprovalDto,
  ApprovalDto,
  RejectionDto,
  ChangeRequestDto,
  DeploymentDto,
  WorkflowValidationResult,
  StatusTransitionValidation,
  WorkflowAction,
  TransactionType,
} from '@tazama-lf/tcs-lib';

export { ContentType, ConfigStatus } from '@tazama-lf/tcs-lib';

// Additional status values used by the backend
export const AdditionalConfigStatus = {
  EXPORTED: 'EXPORTED' as const,
} as const;

// Additional workflow actions used by the backend
export const AdditionalWorkflowAction = {
  EXPORT: 'export' as const,
  RETURN_TO_PROGRESS: 'return_to_progress' as const,
} as const;

// Keep backend-specific interfaces
export interface MappingSource {
  field: string; // Field path in source schema
}

export interface MappingDestination {
  field: string; // Field path in destination schema
}
