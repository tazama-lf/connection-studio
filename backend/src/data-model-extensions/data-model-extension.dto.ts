import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsNotEmpty,
  IsBoolean,
} from 'class-validator';
import { FieldType, ExtensionStatus } from './data-model-extension.entity';
export class AddFieldDto {
  @IsString()
  @IsNotEmpty()
  collection: string;
  @IsString()
  @IsNotEmpty()
  fieldName: string;
  @IsEnum(FieldType)
  fieldType: FieldType;
  @IsBoolean()
  required: boolean;
  @IsOptional()
  defaultValue?: any;
  @IsOptional()
  @IsString()
  createdBy?: string;
}
export class UpdateExtensionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fieldName?: string;
  @IsOptional()
  @IsEnum(FieldType)
  fieldType?: FieldType;
  @IsOptional()
  @IsBoolean()
  required?: boolean;
  @IsOptional()
  defaultValue?: any;
  @IsOptional()
  @IsEnum(ExtensionStatus)
  status?: ExtensionStatus;
}
export class ListExtensionsDto {
  @IsString()
  @IsNotEmpty()
  collection: string;
  @IsOptional()
  @IsEnum(ExtensionStatus)
  status?: ExtensionStatus;
  @IsOptional()
  @IsNumber()
  version?: number;
}
export class ValidateFieldDto {
  @IsEnum(FieldType)
  fieldType: FieldType;
  @IsBoolean()
  required: boolean;
  @IsOptional()
  defaultValue?: any;
}
export class DataModelExtensionResponseDto {
  id: string;
  collection: string;
  fieldName: string;
  fieldType: FieldType;
  isRequired: boolean;
  defaultValue: any;
  version: number;
  status: ExtensionStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
export class ExtensionAuditResponseDto {
  id: string;
  extensionId: string;
  action: string;
  userId: string;
  timestamp: Date;
  previousState?: any;
  newState?: any;
  details?: string;
}
