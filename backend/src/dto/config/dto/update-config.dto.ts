import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ContentType } from './create-config.dto';

export class UpdateConfigDto {
  @IsString()
  @IsOptional()
  msgFam?: string;

  @IsString()
  @IsOptional()
  transactionType?: string;

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

  @IsString()
  @IsOptional()
  payload?: string;
}
