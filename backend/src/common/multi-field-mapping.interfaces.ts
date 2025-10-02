import { FieldType } from './interfaces';

// Core field mapping interfaces
export interface SourceField {
  path: string;
  type: FieldType;
  isRequired: boolean;
}

export interface DestinationField {
  path: string;
  type: FieldType;
  isRequired: boolean;
  isExtension: boolean; // Flag for data model extensions
}

export interface TransformationConfig {
  // For CONCAT transformation
  separator?: string;
  concatFields?: string[]; // Source field paths to concatenate

  // For SUM transformation
  operation?: 'SUM' | 'AVERAGE' | 'COUNT';
  sumFields?: string[]; // Source field paths to sum

  // For SPLIT transformation
  delimiter?: string;
  targetFields?: string[]; // Destination field paths for split results

  // Custom transformation logic
  customLogic?: string;
}

export interface ConstantValue {
  path: string; // Destination field path
  value: any; // Constant value to inject
  type: FieldType;
}

export type TransformationType = 'NONE' | 'CONCAT' | 'SUM' | 'SPLIT';
export type MultiFieldMappingStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT';
export type MappingAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'ACTIVATE'
  | 'DEACTIVATE';

// Multi-field mapping entity
export interface MultiFieldMappingEntity {
  id?: number;
  endpointId: number;
  name: string;
  description?: string;
  sourceFields: SourceField[];
  destinationFields: DestinationField[];
  transformation: TransformationType;
  transformationConfig?: TransformationConfig;
  constants?: Record<string, any>;
  status: MultiFieldMappingStatus;
  orderIndex: number;
  version: number;
  tenantId: string;
  createdBy: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Mapping history entity
export interface MultiFieldMappingHistoryEntity {
  id?: number;
  mappingId: number;
  mappingSnapshot: MultiFieldMappingEntity;
  version: number;
  action: MappingAction;
  changedBy: string;
  changeReason?: string;
  changedAt?: Date;
}

// Validation interfaces
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
}

// Simulation interfaces
export interface SimulationInput {
  mappingId: number;
  testPayload: Record<string, any>;
  tenantId: string;
}

export interface SimulationResult {
  success: boolean;
  transformedOutput: Record<string, any>;
  validationResult: ValidationResult;
  appliedTransformations: string[];
  appliedConstants: string[];
  processingTime: number;
}

// Tree view interfaces for UI
export interface MappingTreeNode {
  id: string;
  name: string;
  type: 'source' | 'destination' | 'transformation' | 'constant';
  path?: string;
  fieldType?: FieldType;
  isRequired?: boolean;
  isExtension?: boolean;
  value?: any;
  children?: MappingTreeNode[];
  parentId?: string;
}

export interface MappingTreeView {
  mappingId: number;
  mappingName: string;
  sourceNodes: MappingTreeNode[];
  destinationNodes: MappingTreeNode[];
  transformationNodes: MappingTreeNode[];
  constantNodes: MappingTreeNode[];
}
