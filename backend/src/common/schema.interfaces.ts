import type { SchemaField } from './interfaces';
export type { SchemaField };
export interface SourceSchemaExtended {
  fields: SchemaField[];
  version: number;
  generatedAt: Date;
  lastModifiedAt: Date;
  modifiedBy?: string;
}
export interface AddExtraFieldDto {
  path: string; // Full JSON path, e.g., "transaction.additionalInfo.customField"
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'OBJECT' | 'ARRAY' | 'DATE';
  isRequired: boolean;
  description?: string;
}
export interface RemoveExtraFieldDto {
  path: string;
}
export interface SchemaUpdateResponse {
  success: boolean;
  message: string;
  updatedSchema: SourceSchemaExtended;
  affectedFields: string[];
}
export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
export interface SchemaAuditLogEntry {
  endpointId: number;
  tenantId: string;
  userId: string;
  action: 'ADD_EXTRA_FIELD' | 'REMOVE_EXTRA_FIELD' | 'UPDATE_SCHEMA';
  fieldPath?: string;
  fieldType?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}
