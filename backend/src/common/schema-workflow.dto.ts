import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  ValidateNested,
  IsArray,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FieldType, ContentType } from './interfaces';

/**
 * Schema Workflow DTOs
 *
 * This file contains all DTOs related to schema generation, endpoint creation workflows,
 * field management, and advanced parsing operations. These DTOs support the complete
 * workflow from payload parsing to endpoint creation with schema validation.
 */

// DTO for parsing payload input
export class ParsePayloadDto {
  @IsString()
  @IsNotEmpty()
  payload: string;

  @IsEnum(ContentType)
  contentType: ContentType;

  @IsOptional()
  @IsString()
  filename?: string;
}

// DTO for field adjustment during schema generation
export class AdjustFieldDto {
  @IsString()
  @IsNotEmpty()
  path: string;

  @IsEnum(FieldType)
  type: FieldType;

  @IsBoolean()
  isRequired: boolean;
}

// DTO for creating constant fields
export class ConstantFieldDto {
  @IsString()
  @IsNotEmpty()
  path: string;

  @IsEnum(FieldType)
  type: FieldType;

  @IsNotEmpty()
  value: any;

  @IsOptional()
  @IsString()
  description?: string;
}

// DTO for creating formula fields
export class FormulaFieldDto {
  @IsString()
  @IsNotEmpty()
  path: string;

  @IsEnum(FieldType)
  type: FieldType;

  @IsString()
  @IsNotEmpty()
  formula: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  referencedFields: string[];
}

// DTO for creating endpoint with complete schema workflow
export class CreateEndpointWithSchemaDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  path: string;

  @IsString()
  @IsNotEmpty()
  method: string;

  @IsString()
  @IsNotEmpty()
  version: string;

  @IsString()
  @IsNotEmpty()
  transactionType: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  payload: string;

  @IsEnum(ContentType)
  contentType: ContentType;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdjustFieldDto)
  fieldAdjustments?: AdjustFieldDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConstantFieldDto)
  constantFields?: ConstantFieldDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormulaFieldDto)
  formulaFields?: FormulaFieldDto[];
}

// DTO for schema validation response
export class SchemaValidationResultDto {
  success: boolean;
  errors: string[];
  warnings: string[];
  duplicateFields?: string[];
  invalidTypes?: string[];
  conflictingPaths?: string[];
}

// DTO for endpoint lifecycle transition
export class EndpointLifecycleTransitionDto {
  @IsString()
  @IsNotEmpty()
  targetStatus: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

// DTO for generating source fields from payload
export class GenerateSourceFieldsDto {
  @IsString()
  @IsNotEmpty()
  payload: string;

  @IsEnum(ContentType)
  contentType: ContentType;
}

// DTO for creating endpoint with generated source fields
export class CreateEndpointWithSourceFieldsDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  path: string;

  @IsString()
  @IsNotEmpty()
  method: string;

  @IsString()
  @IsNotEmpty()
  version: string;

  @IsString()
  @IsNotEmpty()
  transactionType: string;

  @IsOptional()
  @IsString()
  description?: string;

  // Source fields generated from payload
  sourceFields: SchemaFieldDto[];

  @IsEnum(ContentType)
  contentType: ContentType;
}

export class SchemaFieldDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  path: string;

  @IsEnum(FieldType)
  type: FieldType;

  @IsBoolean()
  isRequired: boolean = false;

  @IsOptional()
  children?: SchemaFieldDto[];

  @IsOptional()
  @IsEnum(FieldType)
  arrayElementType?: FieldType;
}

// DTO for advanced file upload with validation
export class AdvancedFileUploadDto {
  @IsEnum(ContentType)
  expectedContentType: ContentType;

  @IsOptional()
  @IsBoolean()
  autoDetectType?: boolean;
}

// Field management DTOs
export class UpdateFieldDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(FieldType)
  type?: FieldType;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsEnum(FieldType)
  arrayElementType?: FieldType;
}

export class ToggleFieldRequiredDto {
  @IsBoolean()
  isRequired: boolean;
}

export class AddFieldDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  path: string;

  @IsEnum(FieldType)
  type: FieldType;

  @IsBoolean()
  isRequired: boolean = false;

  @IsOptional()
  @IsNumber()
  parentFieldId?: number;

  @IsOptional()
  @IsEnum(FieldType)
  arrayElementType?: FieldType;
}

export class ReorderFieldsDto {
  @IsNumber({}, { each: true })
  fieldIds: number[];
}

// Response DTOs
export class ParsedSchemaResponseDto {
  success: boolean;
  schema?: {
    sourceFields: any[];
    metadata: {
      totalFields: number;
      requiredFields: number;
      optionalFields: number;
      nestedLevels: number;
    };
  };
  validation: SchemaValidationResultDto;
}

export class EndpointCreationResponseDto {
  success: boolean;
  endpointId?: number;
  message: string;
  validation?: SchemaValidationResultDto;
  auditLogId?: string;
}
