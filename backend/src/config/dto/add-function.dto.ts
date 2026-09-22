import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

const allowedFunctionNames = [
  'addAccountHolder',
  'addEntity',
  'addAccount',
  'saveTransactionDetails',
  'transactionRelationship',
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

  @IsString()
  @IsOptional()
  tableName?: string;
}
