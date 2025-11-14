import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateFunctionDto {
  @IsString()
  @IsNotEmpty()
  functionId: string;

  @IsString()
  @IsOptional()
  functionName?: string;

  @IsString()
  @IsOptional()
  functionCode?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  targetField?: string;
}
