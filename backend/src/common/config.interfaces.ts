import { JSONSchema } from './json-schema.interfaces';

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

export interface SimpleMapping {
  source: string;
  destination: string;
}

export interface ConcatMapping {
  sources: string[]; // Array of source field paths
  destination: string; // Destination field path
  separator?: string; // Optional separator (default: space)
}

export type FieldMapping = SimpleMapping | ConcatMapping;

export function isConcatMapping(
  mapping: FieldMapping,
): mapping is ConcatMapping {
  return 'sources' in mapping && Array.isArray(mapping.sources);
}

export interface Config {
  id: number;
  msgFam: string; // Message family (pain.001, pacs.008, etc.)
  transactionType: TransactionType;
  endpointPath: string;
  version: string;
  contentType: ContentType;
  schema: JSONSchema; // JSON Schema defining data structure
  mapping: FieldMapping[] | null; // Array of field mappings
  status: ConfigStatus; // Current status of the config
  tenantId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateConfigDto {
  msgFam?: string; // Optional - if provided, included in endpoint path
  transactionType: TransactionType;
  version?: string;
  contentType?: ContentType;
  payload?: string; // JSON/XML payload to generate schema from (optional if file is provided)
  mapping?: FieldMapping[]; // Optional initial mappings
}

export interface UpdateConfigDto {
  msgFam?: string;
  transactionType?: TransactionType;
  endpointPath?: string;
  version?: string;
  contentType?: ContentType;
  schema?: JSONSchema;
  mapping?: FieldMapping[];
}

export interface AddMappingDto {
  source?: string;
  destination?: string;

  sources?: string[];
  separator?: string;
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
