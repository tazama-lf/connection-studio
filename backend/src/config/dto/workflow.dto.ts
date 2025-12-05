import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class SubmitForApprovalDto {
  @IsString()
  @IsOptional()
  comment?: string;
}

export class ApprovalDto {
  @IsString()
  @IsOptional()
  comment?: string;
}

export class RejectionDto {
  @IsString()
  @IsNotEmpty()
  comment: string;
}

export class ExportDto {
  @IsString()
  @IsOptional()
  comment?: string;
}

export class DeploymentDto {
  @IsString()
  @IsOptional()
  deploymentEnvironment?: string;

  @IsString()
  @IsOptional()
  comment?: string;
}

export class StatusTransitionDto {
  @IsString()
  @IsOptional()
  comment?: string;
}
