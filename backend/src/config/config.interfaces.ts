export type {
  JSONSchema,
  FieldMapping,
  FunctionDefinition,
  AllowedFunctionName,
  CreateConfigDto,
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
  Config,
  ConfigResponseDto,
} from '@tazama-lf/tcs-lib';

export { ContentType, ConfigStatus } from '@tazama-lf/tcs-lib';

export const AdditionalConfigStatus = {
  EXPORTED: 'EXPORTED' as const,
} as const;

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
