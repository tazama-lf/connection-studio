import {
  IsString,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import {
  TransactionType,
  HttpMethod,
  ContentType,
  FieldType,
} from './interfaces';

export class CreateEndpointDto {
  @IsString()
  @IsNotEmpty()
  path: string;

  @IsEnum(HttpMethod)
  method: HttpMethod;

  @IsString()
  @IsNotEmpty()
  version: string;

  @IsEnum(TransactionType)
  transactionType: TransactionType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  samplePayload: string;

  @IsEnum(ContentType)
  contentType: ContentType;
}

export class InferSchemaDto {
  @IsString()
  @IsNotEmpty()
  payload: string;

  @IsEnum(ContentType)
  contentType: ContentType;
}

export class SchemaFieldDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  path: string;

  @IsEnum(FieldType)
  type: FieldType;

  @IsBoolean()
  isRequired: boolean = false;

  @IsOptional()
  children?: SchemaFieldDto[];

  @IsOptional()
  @IsEnum(FieldType)
  arrayElementType?: FieldType;
}

export class UpdateFieldDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(FieldType)
  type?: FieldType;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsEnum(FieldType)
  arrayElementType?: FieldType;
}

export class ToggleFieldRequiredDto {
  @IsBoolean()
  isRequired: boolean;
}

export class AddFieldDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  path: string;

  @IsEnum(FieldType)
  type: FieldType;

  @IsBoolean()
  isRequired: boolean = false;

  @IsOptional()
  @IsNumber()
  parentFieldId?: number;

  @IsOptional()
  @IsEnum(FieldType)
  arrayElementType?: FieldType;
}

export class ReorderFieldsDto {
  @IsNumber({}, { each: true })
  fieldIds: number[];
}
