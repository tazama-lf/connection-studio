import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  TazamaCollectionName,
  TazamaFieldType,
} from './tazama-data-model.interfaces';

export class ValidationRulesDto {
  @IsOptional()
  @IsString()
  pattern?: string;

  @IsOptional()
  @IsNumber()
  min?: number;

  @IsOptional()
  @IsNumber()
  max?: number;

  @IsOptional()
  enum?: any[];
}

export class CreateDataModelExtensionDto {
  @IsEnum([
    'entities',
    'accounts',
    'account_holder',
    'transactionRelationship',
    'transactionHistory',
  ])
  collection: TazamaCollectionName;

  @IsString()
  fieldName: string;

  @IsEnum(['STRING', 'NUMBER', 'BOOLEAN', 'OBJECT', 'ARRAY', 'DATE'])
  fieldType: TazamaFieldType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  defaultValue?: any;

  @IsOptional()
  @ValidateNested()
  @Type(() => ValidationRulesDto)
  validation?: ValidationRulesDto;
}

export class UpdateDataModelExtensionDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  defaultValue?: any;

  @IsOptional()
  @ValidateNested()
  @Type(() => ValidationRulesDto)
  validation?: ValidationRulesDto;
}

export class DataModelExtensionResponseDto {
  success: boolean;
  message: string;
  extension?: any;
}
