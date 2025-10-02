export enum TransactionType {
  TRANSFERS = 'Transfers',
  PAYMENTS = 'Payments',
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
}

export enum ContentType {
  JSON = 'application/json',
  XML = 'application/xml',
}

export enum FieldType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  OBJECT = 'OBJECT',
  ARRAY = 'ARRAY',
}

export enum EndpointStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  UNDER_REVIEW = 'UNDER_REVIEW',
  READY_FOR_DEPLOYMENT = 'READY_FOR_DEPLOYMENT',
  DEPLOYED = 'DEPLOYED',
  SUSPENDED = 'SUSPENDED',
  PUBLISHED = 'PUBLISHED',
  DEPRECATED = 'DEPRECATED',
}

export interface SchemaField {
  name: string;
  path: string;
  type: FieldType;
  isRequired: boolean;
  children?: SchemaField[];
  arrayElementType?: FieldType;
}

// Extension fields for constant and formula fields
export interface ConstantField {
  path: string;
  type: FieldType;
  value: any;
  description?: string;
}

export interface FormulaField {
  path: string;
  type: FieldType;
  formula: string;
  description?: string;
  referencedFields: string[]; // List of field paths referenced in the formula
}

// Enhanced schema structure for User Story #300 with extensions
export interface EnhancedSourceSchema {
  version: number;
  sourceFields: SchemaField[];
  constantFields: ConstantField[];
  formulaFields: FormulaField[];
  lastUpdated: Date;
  createdBy: string;
}

export interface FieldMapping {
  sourceField: {
    path: string;
    type: string;
    isRequired: boolean;
  };
  destinationField: {
    path: string;
    type: string;
    isRequired: boolean;
  };
  transformation: 'NONE' | 'CONCAT' | 'SUM' | 'SPLIT';
  constants?: any;
}

// Transformation types for field mappings
export type TransformationType = 'NONE' | 'CONCAT' | 'SUM' | 'SPLIT';
export type MappingStatus = 'ACTIVE' | 'INACTIVE' | 'DEPRECATED';
export type ExtensionFieldStatus = 'DRAFT' | 'ACTIVE' | 'DEPRECATED';
export type ExtensionFieldCategory = 'CUSTOM' | 'REGULATORY' | 'BUSINESS';

// Modern field mapping entity (stored in field_mappings table)
export interface FieldMappingEntity {
  id?: number;
  endpointId: number;
  sourceFieldPath: string;
  sourceFieldType: FieldType;
  sourceFieldRequired: boolean;
  destinationFieldPath: string;
  destinationFieldType: FieldType;
  destinationFieldRequired: boolean;
  transformation: TransformationType;
  transformationConfig?: Record<string, any>;
  constants?: Record<string, any>;
  status: MappingStatus;
  orderIndex: number;
  tenantId: string;
  createdBy: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Destination field extension entity (stored in destination_field_extensions table)
export interface DestinationFieldExtension {
  id?: number;
  name: string;
  path: string;
  type: FieldType;
  isRequired: boolean;
  description?: string;
  parentId?: number;
  orderIndex: number;
  category: ExtensionFieldCategory;
  collection?: string;
  status: ExtensionFieldStatus;
  version: number;
  tenantId: string;
  createdBy: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  children?: DestinationFieldExtension[];
}

// Source Schema - stored in endpoints.schema_json (User Story #300)
export interface SourceSchema {
  sourceFields: SchemaField[];
  version: number;
  lastUpdated: Date;
  createdBy: string;
}

// Legacy UnifiedSchema - now used only for mapping operations
export interface UnifiedSchema {
  sourceFields: SchemaField[];
  destinationFields: SchemaField[];
  mappings: FieldMapping[];
  extensions: SchemaField[];
  version: number;
  lastUpdated: Date;
  createdBy: string;
}

export interface Endpoint {
  id: number;
  path: string;
  method: HttpMethod;
  version: string;
  transactionType: TransactionType;
  status: EndpointStatus;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  tenantId: string;
  // User Story #300: Store only source fields in schema_json
  schemaJson?: SourceSchema;
  schemaVersion?: number;
}
