import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const allowedFunctionNames = [
  'addAccountHolder',
  'addEntity',
  'addAccount',
  'saveTransactionDetails',
  'addDataModel',
  'addDataModelTable',
] as const;

export class FunctionColumnDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  param?: string;

  @IsString()
  @IsOptional()
  datasource?: string;
}

export class AddFunctionDto {
  @IsIn(allowedFunctionNames)
  functionName!: (typeof allowedFunctionNames)[number];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  params?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FunctionColumnDto)
  @IsOptional()
  columns?: FunctionColumnDto[];

  @ValidateIf(
    (dto: AddFunctionDto) =>
      dto.functionName === 'addDataModelTable' || dto.tableName !== undefined,
  )
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  tableName?: string;
}
