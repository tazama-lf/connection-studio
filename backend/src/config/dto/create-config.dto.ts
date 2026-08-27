import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsArray,
  ValidateIf,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ContentType } from '@tazama-lf/tcs-lib';
import { IsValidPayload } from '../../decorators/is-valid-payload.decorator';

export class CreateConfigDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(50)
  msgFam?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  transactionType: string;

  @IsString()
  @IsOptional()
  tableName?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  version: string;

  @IsEnum(ContentType)
  @IsOptional()
  contentType?: ContentType;

  @IsObject()
  @IsOptional()
  schema?: Record<string, unknown>;

  @IsValidPayload()
  payload!: string | Record<string, unknown>;

  @IsString()
  @IsOptional()
  createdBy?: string;

  @IsArray()
  @IsOptional()
  mapping?: Array<Record<string, unknown>>;

  @IsArray()
  @IsOptional()
  functions?: Array<Record<string, unknown>>;
  @IsString()
  @IsOptional()
  related_transaction?: string;
}
