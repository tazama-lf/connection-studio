import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * DTO for creating a new function mapping
 * Used by: POST /api/v1/config/:id/functions
 */
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
