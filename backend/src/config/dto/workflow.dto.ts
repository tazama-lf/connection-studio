import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class SubmitForApprovalDto {
  @IsString()
  @IsOptional()
  comment?: string;
}

export interface SubmitWorkflowActionDto {
  action: 'submit';
  data: SubmitForApprovalDto;
}

export interface ApproveWorkflowActionDto {
  action: 'approve';
  data: ApprovalDto;
}

export interface RejectWorkflowActionDto {
  action: 'reject';
  data: RejectionDto;
}

export interface ExportWorkflowActionDto {
  action: 'export';
  data: StatusTransitionDto;
}

export interface DeployWorkflowActionDto {
  action: 'deploy';
  data: DeploymentDto;
}

export type WorkflowActionDto =
  | SubmitWorkflowActionDto
  | ApproveWorkflowActionDto
  | RejectWorkflowActionDto
  | ExportWorkflowActionDto
  | DeployWorkflowActionDto;

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
