import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { TransactionType, ContentType } from './create-config.dto';

/**
 * DTO for updating an existing configuration
 * Used by: PATCH /api/v1/config/:id
 */
export class UpdateConfigDto {
  @IsString()
  @IsOptional()
  msgFam?: string;

  @IsEnum(TransactionType, {
    message: 'transactionType must be a valid ISO 20022 message type',
  })
  @IsOptional()
  transactionType?: TransactionType;

  @IsString()
  @IsOptional()
  tableName?: string;

  @IsString()
  @IsOptional()
  endpointPath?: string;

  @IsString()
  @IsOptional()
  version?: string;

  @IsEnum(ContentType)
  @IsOptional()
  contentType?: ContentType;

  @IsObject()
  @IsOptional()
  schema?: Record<string, any>;
}
