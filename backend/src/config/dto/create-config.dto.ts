import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsArray,
} from 'class-validator';
import { ContentType } from '@tazama-lf/tcs-lib';
import { IsValidPayload } from '../../decorators/is-valid-payload.decorator';

export class CreateConfigDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  msgFam?: string;

  @IsString()
  @IsNotEmpty()
  transactionType!: string;

  @IsString()
  @IsOptional()
  tableName?: string;

  @IsString()
  @IsNotEmpty()
  version!: string;

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
