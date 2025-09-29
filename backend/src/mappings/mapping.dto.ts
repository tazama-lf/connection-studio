import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNotEmpty,
  ValidateNested,
  IsNumber,
  Min,
  IsObject,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MappingStatus, TransformationType } from './mapping.entity';
export class SourceFieldDto {
  @IsString()
  @IsNotEmpty()
  path: string;
  @IsString()
  @IsNotEmpty()
  type: string;
  @IsBoolean()
  isRequired: boolean;
}
export class DestinationFieldDto {
  @IsString()
  @IsNotEmpty()
  path: string;
  @IsString()
  @IsNotEmpty()
  type: string;
  @IsBoolean()
  isRequired: boolean;
}
export class CreateMappingDto {
  @IsString()
  @IsNotEmpty()
  name: string;
  @IsOptional()
  @IsNumber()
  @Min(1)
  version?: number;
  @IsOptional()
  @IsEnum(MappingStatus)
  status?: MappingStatus;
  @IsOptional()
  @IsNumber()
  @Min(1)
  endpointId?: number;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SourceFieldDto)
  sourceFields: SourceFieldDto[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DestinationFieldDto)
  destinationFields: DestinationFieldDto[];
  @IsEnum(TransformationType)
  transformation: TransformationType;
  @IsOptional()
  @IsObject()
  constants?: { [key: string]: any };
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  createdBy?: string;
}
export class UpdateMappingDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
  @IsOptional()
  @IsEnum(MappingStatus)
  status?: MappingStatus;
  @IsOptional()
  @IsNumber()
  @Min(1)
  endpointId?: number;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SourceFieldDto)
  sourceFields?: SourceFieldDto[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DestinationFieldDto)
  destinationFields?: DestinationFieldDto[];
  @IsOptional()
  @IsEnum(TransformationType)
  transformation?: TransformationType;
  @IsOptional()
  @IsObject()
  constants?: { [key: string]: any };
}
export class MappingResponseDto {
  id: string;
  name: string;
  version: number;
  status: MappingStatus;
  sourceFields: SourceFieldDto[];
  destinationFields: DestinationFieldDto[];
  transformation: TransformationType;
  constants: { [key: string]: any } | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
export class UpdateMappingStatusDto {
  @IsEnum(MappingStatus)
  status: MappingStatus;
}
export class SimulateMappingDto {
  @ValidateNested()
  @Type(() => CreateMappingDto)
  mapping: CreateMappingDto;
  @IsObject()
  payload: { [key: string]: any };
}
export class SimulationResultDto {
  success: boolean;
  transformedPayload: { [key: string]: any } | null;
  validationErrors: ValidationErrorDto[];
  transformationDetails: {
    appliedTransformations: string[];
    fieldsProcessed: number;
    constantsApplied: { [key: string]: any };
    originalPayload: { [key: string]: any };
  };
}
export class ValidationErrorDto {
  field: string;
  value: any;
  expectedType: string;
  actualType: string;
  message: string;
  code: string;
}
export class MappingPackageMetadataDto {
  @IsString()
  packageVersion: string;
  @IsString()
  exportedAt: string;
  @IsString()
  exportedBy: string;
  @IsString()
  mappingId: string;
  @IsNumber()
  mappingVersion: number;
  @IsString()
  checksum: string;
}
export class MappingPackageDto {
  @ValidateNested()
  @Type(() => MappingPackageMetadataDto)
  meta: MappingPackageMetadataDto;
  @ValidateNested()
  @Type(() => MappingResponseDto)
  mapping: MappingResponseDto;
  @IsArray()
  @ValidateNested({ each: true })
  extensions: any[];
  @IsOptional()
  @IsObject()
  schema?: any;
}
export class ImportMappingPackageDto {
  @IsObject()
  package: MappingPackageDto;
  @IsOptional()
  @IsString()
  importedBy?: string;
}
export class CreateDestinationFieldDto {
  @IsString()
  @IsNotEmpty()
  path: string;
  @IsString()
  @IsNotEmpty()
  name: string;
  @IsString()
  @IsNotEmpty()
  type: string;
  @IsBoolean()
  isRequired: boolean;
  @IsOptional()
  @IsString()
  description?: string;
  @IsOptional()
  defaultValue?: any;
  @IsOptional()
  @IsObject()
  validationRules?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
    allowedValues?: any[];
  };
}
export class UpdateDestinationFieldDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  type?: string;
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
  @IsOptional()
  @IsString()
  description?: string;
  @IsOptional()
  defaultValue?: any;
  @IsOptional()
  @IsObject()
  validationRules?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
    allowedValues?: any[];
  };
}
export class SchemaTreeNodeDto {
  @IsString()
  @IsNotEmpty()
  id: string;
  @IsString()
  @IsNotEmpty()
  name: string;
  @IsString()
  @IsNotEmpty()
  path: string;
  @IsString()
  @IsNotEmpty()
  type: string;
  @IsBoolean()
  isRequired: boolean;
  @IsBoolean()
  isLeaf: boolean;
  @IsOptional()
  @IsString()
  description?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SchemaTreeNodeDto)
  children?: SchemaTreeNodeDto[];
  @IsOptional()
  @IsObject()
  metadata?: {
    level: number;
    parentId?: string;
    isExpandable: boolean;
    fieldCount?: number;
  };
}
export class SchemaTreeResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SchemaTreeNodeDto)
  nodes: SchemaTreeNodeDto[];
  @IsObject()
  statistics: {
    totalFields: number;
    requiredFields: number;
    optionalFields: number;
    maxDepth: number;
    fieldTypes: { [type: string]: number };
  };
}
export class SchemaComparisonDto {
  @IsNumber()
  sourceEndpointId: number;
  @IsOptional()
  @IsNumber()
  destinationEndpointId?: number;
  @IsOptional()
  @IsBoolean()
  showCompatibleOnly?: boolean;
}
export class SchemaFieldMappingSuggestionDto {
  @IsString()
  sourceFieldPath: string;
  @IsString()
  destinationFieldPath: string;
  @IsString()
  sourceFieldType: string;
  @IsString()
  destinationFieldType: string;
  @IsNumber()
  @Min(0)
  confidenceScore: number;
  @IsEnum(TransformationType)
  suggestedTransformation: TransformationType;
  @IsString()
  reason: string;
  @IsBoolean()
  isTypeCompatible: boolean;
}
export class SchemaComparisonResultDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SchemaFieldMappingSuggestionDto)
  suggestions: SchemaFieldMappingSuggestionDto[];
  @IsObject()
  compatibility: {
    score: number;
    compatibleFields: number;
    totalFields: number;
    incompatibleFields: string[];
    missingRequiredFields: string[];
  };
}
