import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TransactionType {
  PACS_008 = 'pacs.008.001.10',
  PACS_002 = 'pacs.002.001.12',
  PAIN_001 = 'pain.001.001.11',
  PAIN_013 = 'pain.013.001.09',
}

export enum ContentType {
  JSON = 'json',
  XML = 'xml',
}

/**
 * DTO for creating a new configuration
 * Used by: POST /api/v1/config
 */
export class CreateConfigDto {
  @IsString()
  @IsOptional()
  msgFam?: string;

  @IsEnum(TransactionType, {
    message: 'transactionType must be a valid ISO 20022 message type',
  })
  @IsNotEmpty()
  transactionType: TransactionType;

  @IsString()
  @IsNotEmpty()
  tableName: string;

  @IsString()
  @IsNotEmpty()
  endpointPath: string;

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
  createdBy?: string;
}
