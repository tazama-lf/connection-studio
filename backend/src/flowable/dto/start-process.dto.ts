import { IsNotEmpty, IsString } from 'class-validator';

export class StartProcessDto {
  @IsNotEmpty()
  @IsString()
  configId: string;

  @IsNotEmpty()
  @IsString()
  tenantId: string;

  @IsNotEmpty()
  @IsString()
  initiator: string;
}
