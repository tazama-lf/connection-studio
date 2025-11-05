// Re-export types from tcs-lib for consistency
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
  ChangeRequestDto,
  DeploymentDto,
  WorkflowValidationResult,
  StatusTransitionValidation,
  WorkflowAction,
  TransactionType,
  SchemaField,
  Config,
  ConfigResponseDto,
} from '@tazama-lf/tcs-lib';

import type {
  Config,
  ConfigResponseDto,
  SchemaField,
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

// Extended Config with source fields for backend use
export interface ConfigWithSourceFields extends Config {
  sourceFields?: SchemaField[]; // Source fields with array notation (.0.) for mapping UI
}

// Enhanced config response that includes source fields for mapping UI
export interface EnhancedConfigResponseDto extends ConfigResponseDto {
  config?: ConfigWithSourceFields;
  sourceFields?: SchemaField[]; // Source fields with array notation (.0.) for mapping UI
}
