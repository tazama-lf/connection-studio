import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsArray,
  ValidateIf,
} from 'class-validator';
import { ContentType } from '@tazama-lf/tcs-lib';

export class CreateConfigDto {
  @IsString()
  @IsOptional()
  msgFam?: string;

  @IsString()
  @IsNotEmpty()
  transactionType: string;

  @IsString()
  @IsOptional()
  tableName?: string;

  @IsString()
  @IsOptional()
  endpointPath?: string;

  @IsString()
  @IsNotEmpty()
  version: string;

  @IsEnum(ContentType)
  @IsOptional()
  contentType?: ContentType;

  @IsObject()
  @IsOptional()
  schema?: Record<string, any>;

  @ValidateIf((o) => typeof o.payload === 'string')
  @IsString()
  @ValidateIf((o) => typeof o.payload === 'object')
  @IsObject()
  @IsNotEmpty()
  payload: string | Record<string, unknown>;

  @IsString()
  @IsOptional()
  createdBy?: string;

  @IsArray()
  @IsOptional()
  mapping?: any[];

  @IsArray()
  @IsOptional()
  functions?: any[];
}
