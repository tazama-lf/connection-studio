import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsObject,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  SourceField,
  DestinationField,
  TransformationConfig,
  ConstantValue,
  TransformationType,
  MultiFieldMappingStatus,
} from '../common/multi-field-mapping.interfaces';
import { FieldType } from '../common/interfaces';

// Source field DTO
export class SourceFieldDto implements SourceField {
  @IsString()
  @IsNotEmpty()
  path: string;

  @IsEnum(FieldType)
  @IsNotEmpty()
  type: FieldType;

  @IsBoolean()
  @IsNotEmpty()
  isRequired: boolean;
}

// Destination field DTO
export class DestinationFieldDto implements DestinationField {
  @IsString()
  @IsNotEmpty()
  path: string;

  @IsEnum(FieldType)
  @IsNotEmpty()
  type: FieldType;

  @IsBoolean()
  @IsNotEmpty()
  isRequired: boolean;

  @IsBoolean()
  @IsNotEmpty()
  isExtension: boolean;
}

// Transformation config DTO
export class TransformationConfigDto implements TransformationConfig {
  @IsOptional()
  @IsString()
  separator?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  concatFields?: string[];

  @IsOptional()
  @IsEnum(['SUM', 'AVERAGE', 'COUNT'])
  operation?: 'SUM' | 'AVERAGE' | 'COUNT';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sumFields?: string[];

  @IsOptional()
  @IsString()
  delimiter?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetFields?: string[];

  @IsOptional()
  @IsString()
  customLogic?: string;

  @IsOptional()
  @IsString()
  template?: string;

  @IsOptional()
  @IsNumber()
  precision?: number;

  @IsOptional()
  @IsBoolean()
  includeNegative?: boolean;

  @IsOptional()
  @IsNumber()
  maxSplits?: number;

  @IsOptional()
  @IsBoolean()
  trimWhitespace?: boolean;
}

// Constant value DTO
export class ConstantValueDto implements ConstantValue {
  @IsString()
  @IsNotEmpty()
  path: string;

  @IsNotEmpty()
  value: any;

  @IsEnum(FieldType)
  @IsNotEmpty()
  type: FieldType;
}

// Create multi-field mapping DTO
export class CreateMultiFieldMappingDto {
  @IsNumber()
  @IsNotEmpty()
  endpointId: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SourceFieldDto)
  sourceFields: SourceFieldDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DestinationFieldDto)
  destinationFields: DestinationFieldDto[];

  @IsEnum(['NONE', 'CONCAT', 'SUM', 'SPLIT'])
  @IsNotEmpty()
  transformation: TransformationType;

  @IsOptional()
  @ValidateNested()
  @Type(() => TransformationConfigDto)
  transformationConfig?: TransformationConfigDto;

  @IsOptional()
  @IsObject()
  constants?: Record<string, any>;

  @IsEnum(['ACTIVE', 'INACTIVE', 'DRAFT'])
  @IsNotEmpty()
  status: MultiFieldMappingStatus;

  @IsOptional()
  @IsNumber()
  orderIndex?: number;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;
}

// Update multi-field mapping DTO
export class UpdateMultiFieldMappingDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

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
  @IsEnum(['NONE', 'CONCAT', 'SUM', 'SPLIT'])
  transformation?: TransformationType;

  @IsOptional()
  @ValidateNested()
  @Type(() => TransformationConfigDto)
  transformationConfig?: TransformationConfigDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConstantValueDto)
  constants?: ConstantValueDto[];

  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'DRAFT'])
  status?: MultiFieldMappingStatus;

  @IsOptional()
  @IsNumber()
  orderIndex?: number;

  @IsOptional()
  @IsString()
  changeReason?: string;
}

// Simulation DTO
export class SimulateMappingDto {
  @IsNumber()
  @IsNotEmpty()
  mappingId: number;

  @IsObject()
  @IsNotEmpty()
  testPayload: Record<string, any>;

  @IsString()
  @IsNotEmpty()
  tenantId: string;
}

// Bulk operations DTO
export class BulkMappingOperationDto {
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1)
  mappingIds: number[];

  @IsEnum(['ACTIVATE', 'DEACTIVATE', 'DELETE'])
  @IsNotEmpty()
  action: 'ACTIVATE' | 'DEACTIVATE' | 'DELETE';

  @IsOptional()
  @IsString()
  reason?: string;
}

// Query DTOs
export class GetMappingsQueryDto {
  @IsOptional()
  @IsNumber()
  endpointId?: number;

  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'DRAFT'])
  status?: MultiFieldMappingStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsEnum(['name', 'created_at', 'updated_at', 'order_index'])
  sortBy?: string;

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
