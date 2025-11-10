import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TransformationType {
  SPLIT = 'SPLIT',
  CONCAT = 'CONCAT',
  TRIM = 'TRIM',
  UPPERCASE = 'UPPERCASE',
  LOWERCASE = 'LOWERCASE',
  SUBSTRING = 'SUBSTRING',
  REPLACE = 'REPLACE',
}

export class TransformationDto {
  @IsEnum(TransformationType, {
    message: 'type must be a valid transformation type',
  })
  @IsNotEmpty()
  type: TransformationType;

  @IsString()
  @IsOptional()
  separator?: string;

  @IsOptional()
  index?: number;

  @IsString()
  @IsOptional()
  find?: string;

  @IsString()
  @IsOptional()
  replace?: string;
}

/**
 * DTO for creating a new field mapping
 * Used by: POST /api/v1/config/:id/mappings
 */
export class CreateMappingDto {
  @IsString()
  @IsNotEmpty()
  sourcePath: string;

  @IsString()
  @IsNotEmpty()
  destinationPath: string;

  @IsString()
  @IsOptional()
  dataType?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransformationDto)
  @IsOptional()
  transformations?: TransformationDto[];

  @IsString()
  @IsOptional()
  defaultValue?: string;
}
