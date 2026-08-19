import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  ValidateIf,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ContentType } from '@tazama-lf/tcs-lib';

export class UpdateConfigDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(50)
  msgFam?: string;

  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(50)
  transactionType?: string;

  @IsString()
  @IsOptional()
  tableName?: string;

  @IsString()
  @IsOptional()
  endpointPath?: string;

  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(50)
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
