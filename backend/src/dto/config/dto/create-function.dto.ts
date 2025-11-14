import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateFunctionDto {
  @IsString()
  @IsNotEmpty()
  functionName: string;

  @IsString()
  @IsNotEmpty()
  functionCode: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  targetField: string;
}
