import { JSONSchema, AdjustFieldDto } from '@tazama-lf/tcs-lib';

export interface CreateConfigDto {
  msgFam?: string;
  transactionType: TransactionType;
  version?: string;
  contentType?: ContentType;
  payload?: string;
  mapping?: FieldMapping[];
  functions?: FunctionDefinition[];
  fieldAdjustments?: AdjustFieldDto[];
}

export interface CloneConfigDto {
  sourceConfigId: number;
  newTransactionType: TransactionType;
  newVersion?: string;
  newMsgFam?: string;
  functions?: FunctionDefinition[];
  fieldAdjustments?: AdjustFieldDto[];
}

export interface UpdateConfigDto {
  msgFam?: string;
  transactionType?: TransactionType;
  endpointPath?: string;
  version?: string;
  contentType?: ContentType;
  schema?: JSONSchema;
  mapping?: FieldMapping[];
  functions?: FunctionDefinition[];
  fieldAdjustments?: AdjustFieldDto[];
}
export interface FieldMapping {
  source?: string | string[]; // Optional when using constants
  destination: string | string[];
  transformation?: 'NONE' | 'CONCAT' | 'SUM' | 'SPLIT' | 'CONSTANT' | 'MATH';
  delimiter?: string; // Used for one-to-many mapping to split source value
  constantValue?: any; // Fixed value to map to destination (replaces constants)
  operator?: 'ADD' | 'SUBTRACT' | 'MULTIPLY' | 'DIVIDE'; // Mathematical operators for MATH transformation
}

export interface FunctionDefinition {
  params: string[]; // Array of parameter names
  functionName: 'addAccount' | 'handleTransaction' | 'AddEntity'; // Only these three functions are allowed
}

export type AllowedFunctionName =
  | 'addAccount'
  | 'handleTransaction'
  | 'AddEntity';

export enum ContentType {
  JSON = 'application/json',
  XML = 'application/xml',
}
export type TransactionType = string;
export enum ConfigStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'inprogress',
  IN_REVIEW = 'in_review',
  CHANGES_REQUESTED = 'changes_requested',
  APPROVED = 'approved',
  DEPLOYED = 'deployed',
  REJECTED = 'rejected',
  FAILED = 'failed',
}

export enum ConfigLifecycleState {
  EDITABLE = 'editable',
  IN_APPROVAL = 'in_approval',
  APPROVED_LOCKED = 'approved_locked',
  DEPLOYED_LOCKED = 'deployed_locked',
  REJECTED_EDITABLE = 'rejected_editable',
}

export interface ConfigLifecycleInfo {
  configId?: number;
  version: string;
  transactionType: string;
  tenantId: string;
  state: ConfigLifecycleState;
  status: ConfigStatus;
  isEditable: boolean;
  canClone: boolean;
  isApproved: boolean;
  processInstanceId?: string;
  currentTask?: string;
  assignedTo?: string;
  lastModified?: string;
  approvedAt?: string;
  deployedAt?: string;
  rejectionReason?: string;
}
export interface MappingSource {
  field: string; // Field path in source schema
}
export interface MappingDestination {
  field: string; // Field path in destination schema
}
export interface Config {
  id: number;
  msgFam: string; // Message family (pain.001, pacs.008, etc.)
  transactionType: TransactionType;
  endpointPath: string;
  version: string;
  contentType: ContentType;
  schema: JSONSchema; // JSON Schema defining data structure
  mapping?: FieldMapping[];
  functions?: FunctionDefinition[];
  status?: ConfigStatus;
  isApproved?: boolean; // Flag for approval lock
  processInstanceId?: string; // Current Flowable process ID
  tenantId?: string;
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  deployedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface AddMappingDto {
  source?: string;
  destination?: string;
  destinations?: string[];
  sources?: string[];
  delimiter?: string;
}

export interface AddFunctionDto {
  params: string[];
  functionName: AllowedFunctionName;
}
export interface ConfigResponseDto {
  success: boolean;
  message: string;
  config?: Config;
  lifecycleInfo?: ConfigLifecycleInfo;
  processInstanceId?: string; // Flowable process ID for pending approvals
  validation?: {
    success: boolean;
    errors: string[];
    warnings: string[];
  };
  conflictInfo?: {
    hasConflict: boolean;
    conflictType: 'approved_config' | 'active_process' | 'version_exists';
    existingConfigId?: number;
    existingProcessId?: string;
    suggestedAction: 'clone' | 'edit_process' | 'use_different_version';
  };
}
