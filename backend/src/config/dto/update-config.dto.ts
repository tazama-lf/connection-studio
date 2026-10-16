import {
  IsString,
  IsEnum,
  IsObject,
  IsNotEmpty,
  ValidateIf,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ContentType } from '@tazama-lf/tcs-lib';
import { IsValidPayload } from '../../decorators/is-valid-payload.decorator';

export class UpdateConfigDto {
  @IsString()
  @ValidateIf((o) => o.msgFam !== undefined)
  @MinLength(1)
  @MaxLength(50)
  msgFam?: string;

  @IsString()
  @ValidateIf((o) => o.transactionType !== undefined)
  @MinLength(1)
  @MaxLength(50)
  transactionType?: string;

  @IsString()
  @ValidateIf((o) => o.tableName !== undefined)
  @IsNotEmpty()
  tableName?: string;

  @IsString()
  @ValidateIf((o) => o.endpointPath !== undefined)
  @IsNotEmpty()
  endpointPath?: string;

  @IsEnum(ContentType)
  @ValidateIf((o) => o.contentType !== undefined)
  contentType?: ContentType;

  @IsObject()
  @ValidateIf((o) => o.schema !== undefined)
  schema?: Record<string, unknown>;

  @ValidateIf((o) => o.payload !== undefined)
  @IsValidPayload()
  payload?: string | Record<string, unknown>;

  @IsString()
  @ValidateIf((o) => o.related_transaction !== undefined)
  @IsNotEmpty()
  related_transaction?: string;
}
