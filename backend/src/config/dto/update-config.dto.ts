import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  ValidateIf,
} from 'class-validator';
import { ContentType } from '@tazama-lf/tcs-lib';

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
  schema?: Record<string, unknown>;

  @ValidateIf((o) => typeof o.payload === 'string')
  @IsString()
  @ValidateIf((o) => typeof o.payload === 'object')
  @IsObject()
  @IsOptional()
  payload?: string | Record<string, unknown>;
}
