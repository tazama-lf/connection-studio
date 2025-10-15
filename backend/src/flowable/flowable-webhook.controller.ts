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
import { Config, ConfigStatus } from '../config/config.interfaces';

@Controller('flowable/webhook')
export class FlowableWebhookController {
  private readonly logger = new Logger(FlowableWebhookController.name);

  constructor(
    private readonly flowableService: FlowableService,
    private readonly configRepository: ConfigRepository,
    private readonly auditService: AuditService,
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
        return this.handleRejection(
          configData,
          variables,
          processInstanceId,
          tenantId,
        );
      } else if (
        taskName === 'Review Configuration' ||
        approvalStatus === 'approved'
      ) {
        return this.handleApproval(
          configData,
          variables,
          processInstanceId,
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
      this.logger.log(`Config approved: ${configData.configId} by ${approver}`);

      const config: Omit<Config, 'id' | 'createdAt' | 'updatedAt'> = {
        msgFam: configData.msgFam || '',
        transactionType: configData.transactionType,
        endpointPath: configData.endpointPath,
        version: configData.version,
        contentType: configData.contentType,
        schema: configData.schema,
        mapping: configData.mapping,
        functions: configData.functions,
        status: ConfigStatus.COMPLETED,
        tenantId: tenantId,
        createdBy: configData.createdBy || approver,
      };

      const configId = await this.configRepository.createConfig(config);

      await this.auditService.logAction({
        entityType: 'CONFIG',
        action: 'APPROVE_CONFIG',
        actor: approver,
        tenantId,
        endpointName: configData.endpointPath,
      });

      this.logger.log(
        `Config saved to main table after approval - Flowable process ${processInstanceId} → config ${configId}`,
      );

      return {
        success: true,
        message: 'Config approved and saved to main table',
        configId,
        remarks,
      };
    } catch (error) {
      this.logger.error(
        `Failed to save approved config: ${error.message}`,
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
        endpointName: configData.endpointPath,
      });

      this.logger.log(
        `Config rejected: ${configData.configId} by ${rejectedBy}. Reason: ${remarks}. Sent back to editor.`,
      );

      return {
        success: true,
        message: 'Config rejected and sent back to editor for revision',
        configId: configData.configId,
        remarks,
        action: 'reverted_to_editor',
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
