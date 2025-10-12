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
  sources: (string | string[])[]; // Array of source field paths, can be single string or array for complex mappings
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
  COMPLETED = 'completed',
  FAILED = 'failed',
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
  tenantId?: string;
  createdBy?: string;
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
  sources: (string | string[])[];
  functionName: AllowedFunctionName;
}
export interface ConfigResponseDto {
  success: boolean;
  message: string;
  config?: Config;
  validation?: {
    success: boolean;
    errors: string[];
    warnings: string[];
  };
}
