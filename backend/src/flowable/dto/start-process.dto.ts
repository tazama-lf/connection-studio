import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class StartProcessDto {
  @IsOptional()
  @IsString()
  configId?: string; // Optional - will be generated after approval

  @IsNotEmpty()
  @IsString()
  tenantId: string;

  @IsNotEmpty()
  @IsString()
  initiator: string;
}
