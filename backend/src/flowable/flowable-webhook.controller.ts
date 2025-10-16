import {
  Controller,
  Post,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FlowableService } from './flowable.service';
import { ConfigRepository } from '../config/config.repository';
import { AuditService } from '../audit/audit.service';
import { ConfigLifecycleService } from '../config/config-lifecycle.service';
import { Config, ConfigStatus } from '../config/config.interfaces';

@Controller('flowable/webhook')
export class FlowableWebhookController {
  private readonly logger = new Logger(FlowableWebhookController.name);

  constructor(
    private readonly flowableService: FlowableService,
    private readonly configRepository: ConfigRepository,
    private readonly auditService: AuditService,
    private readonly configLifecycleService: ConfigLifecycleService,
  ) {}

  @Post('task-completed')
  @HttpCode(HttpStatus.OK)
  async handleTaskCompleted(@Body() payload: any) {
    this.logger.log(
      `Received task completed webhook: ${JSON.stringify(payload)}`,
    );

    try {
      const { processInstanceId, taskName, variables, tenantId } = payload;

      const configData =
        await this.flowableService.getConfigFromProcess(processInstanceId);

      if (!configData?.configId) {
        this.logger.warn(
          `Config data not found for process instance: ${processInstanceId}`,
        );
        return {
          success: false,
          message: 'Config data not found in process variables',
        };
      }

      const approvalStatus = variables?.approvalStatus || variables?.status;
      const revisionAction = variables?.revisionAction;

      if (approvalStatus === 'rejected') {
        return this.configLifecycleService.handleWorkflowReversal(
          processInstanceId,
          'reject',
          variables?.remarks ||
            variables?.rejectionReason ||
            'No reason provided',
          variables?.reviewedBy || variables?.rejectedBy || 'system',
          tenantId,
        );
      } else if (approvalStatus === 'changes_requested') {
        return this.configLifecycleService.handleWorkflowReversal(
          processInstanceId,
          'request_changes',
          variables?.remarks ||
            variables?.changeRequests ||
            'Changes requested',
          variables?.reviewedBy || 'system',
          tenantId,
        );
      } else if (
        taskName === 'Review Configuration' ||
        approvalStatus === 'approved'
      ) {
        return this.configLifecycleService.handleConfigApproval(
          processInstanceId,
          variables?.reviewedBy || variables?.approver || 'system',
          variables?.remarks || variables?.approvalRemarks || 'Approved',
          tenantId,
        );
      } else if (taskName === 'Revise Configuration') {
        return this.handleRevision(
          configData,
          variables,
          revisionAction,
          tenantId,
        );
      }

      return { success: true, message: 'Task completed' };
    } catch (error) {
      this.logger.error(
        `Failed to handle task completion: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        message: `Failed to process webhook: ${error.message}`,
      };
    }
  }

  private async handleApproval(
    configData: any,
    variables: any,
    processInstanceId: string,
    tenantId: string,
  ) {
    const approver = variables?.reviewedBy || variables?.approver || 'system';
    const remarks = variables?.remarks || variables?.approvalRemarks;

    try {
      this.logger.log(
        `Config approved for process ${processInstanceId} by ${approver}`,
      );

      const approvedConfig: Omit<Config, 'id' | 'createdAt' | 'updatedAt'> = {
        msgFam: variables.msgFam || '',
        transactionType: variables.transactionType,
        endpointPath: variables.endpointPath,
        version: variables.version,
        contentType: variables.contentType,
        schema: variables.schema
          ? JSON.parse(variables.schema)
          : configData.schema,
        mapping: variables.mapping
          ? JSON.parse(variables.mapping)
          : configData.mapping,
        functions: variables.functions
          ? JSON.parse(variables.functions)
          : configData.functions,
        status: ConfigStatus.APPROVED,
        tenantId: tenantId,
        createdBy: variables.createdBy || approver,
      };

      const liveConfigId =
        await this.configRepository.createConfig(approvedConfig);

      await this.auditService.logAction({
        entityType: 'CONFIG',
        action: 'APPROVE_CONFIG',
        actor: approver,
        tenantId,
        endpointName: variables.endpointPath,
        details: `Process ${processInstanceId} ? Live Config ${liveConfigId}`,
      });

      this.logger.log(
        `? Config approved and created: Process ${processInstanceId} ? Live Config ${liveConfigId}`,
      );

      return {
        success: true,
        message: 'Config approved and saved to main config table',
        configId: liveConfigId,
        processInstanceId,
        remarks,
      };
    } catch (error) {
      this.logger.error(
        `Failed to approve config: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async handleRejection(
    configData: any,
    variables: any,
    processInstanceId: string,
    tenantId: string,
  ) {
    const rejectedBy =
      variables?.reviewedBy || variables?.rejectedBy || 'system';
    const remarks = variables?.remarks || variables?.rejectionRemarks;

    try {
      await this.auditService.logAction({
        entityType: 'CONFIG',
        action: 'REJECT_CONFIG',
        actor: rejectedBy,
        tenantId,
        endpointName: variables.endpointPath || configData.endpointPath,
        details: `Process ${processInstanceId} rejected: ${remarks}`,
      });

      this.logger.log(
        `? Config rejected: Process ${processInstanceId} by ${rejectedBy}. Reason: ${remarks}. No database writes performed.`,
      );

      return {
        success: true,
        message: 'Config rejected. No data was saved to database.',
        processInstanceId,
        remarks,
        action: 'rejected',
      };
    } catch (error) {
      this.logger.error(
        `Failed to handle rejection: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async handleRevision(
    configData: any,
    variables: any,
    revisionAction: string,
    tenantId: string,
  ) {
    const editor = configData.createdBy || 'editor';

    try {
      if (revisionAction === 'resubmit') {
        await this.auditService.logAction({
          entityType: 'CONFIG',
          action: 'RESUBMIT_CONFIG',
          actor: editor,
          tenantId,
          endpointName: configData.endpointPath,
        });

        this.logger.log(
          `Config resubmitted: ${configData.configId} by ${editor}`,
        );

        return {
          success: true,
          message: 'Config resubmitted for approval',
          configId: configData.configId,
          action: 'resubmitted',
        };
      } else if (revisionAction === 'cancel') {
        await this.auditService.logAction({
          entityType: 'CONFIG',
          action: 'CANCEL_CONFIG',
          actor: editor,
          tenantId,
          endpointName: configData.endpointPath,
        });

        this.logger.log(
          `Config cancelled: ${configData.configId} by ${editor}`,
        );

        return {
          success: true,
          message: 'Config cancelled by editor',
          configId: configData.configId,
          action: 'cancelled',
        };
      }

      return { success: true, message: 'Revision action processed' };
    } catch (error) {
      this.logger.error(
        `Failed to handle revision: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
