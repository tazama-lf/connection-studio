import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsArray,
} from 'class-validator';
import { ContentType } from '@tazama-lf/tcs-lib';

export { ContentType } from '@tazama-lf/tcs-lib';

export enum TransactionType {
  PACS_008 = 'pacs.008.001.10',
  PACS_002 = 'pacs.002.001.12',
  PAIN_001 = 'pain.001.001.11',
  PAIN_013 = 'pain.013.001.09',
}

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

  @IsString()
  @IsOptional()
  payload?: string;

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
