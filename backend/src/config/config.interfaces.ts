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
} from '@tazama-lf/tcs-lib';

export { ContentType, ConfigStatus } from '@tazama-lf/tcs-lib';
export type { TransactionType } from '@tazama-lf/tcs-lib';

// Keep backend-specific interfaces
export interface MappingSource {
  field: string; // Field path in source schema
}

export interface MappingDestination {
  field: string; // Field path in destination schema
}
