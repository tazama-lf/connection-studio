import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * DTO for updating an existing function mapping
 * Used by: PATCH /api/v1/config/:configId/functions/:functionId
 */
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
