import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  NotificationService,
  ConfigNotificationContext,
} from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('submit-for-approval')
  @HttpCode(HttpStatus.OK)
  async sendSubmitForApproval(
    @Body()
    data: {
      approverEmails: string[];
      context: ConfigNotificationContext;
    },
  ) {
    try {
      const result = await this.notificationService.sendSubmitForApproval(
        data.approverEmails,
        data.context,
      );
      return {
        success: result,
        message: result
          ? 'Email sent successfully'
          : 'Email failed or SMTP not configured (dry run)',
        recipients: data.approverEmails.length,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  @Post('changes-requested')
  @HttpCode(HttpStatus.OK)
  async sendChangesRequested(
    @Body()
    data: {
      editorEmail: string;
      context: ConfigNotificationContext;
    },
  ) {
    try {
      const result = await this.notificationService.sendChangesRequested(
        data.editorEmail,
        data.context,
      );
      return {
        success: result,
        message: result
          ? 'Email sent successfully'
          : 'Email failed or SMTP not configured (dry run)',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  @Post('rejection')
  @HttpCode(HttpStatus.OK)
  async sendRejection(
    @Body()
    data: {
      editorEmail: string;
      context: ConfigNotificationContext;
    },
  ) {
    try {
      const result = await this.notificationService.sendRejectionNotification(
        data.editorEmail,
        data.context,
      );
      return {
        success: result,
        message: result
          ? 'Rejection email sent successfully'
          : 'Email failed or SMTP not configured (dry run)',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to send rejection email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  @Post('generic-workflow')
  @HttpCode(HttpStatus.OK)
  async sendGenericWorkflowNotification(
    @Body()
    data: {
      event:
        | 'editor_submit'
        | 'approver_approve'
        | 'exporter_export'
        | 'publisher_deploy'
        | 'publisher_activate'
        | 'publisher_deactivate';
      configId: number;
      config: any;
      tenantId: string;
      actorEmail: string;
      actorName: string;
      comment?: string;
      2;
      recipientEmails: string[];
    },
  ) {
    try {
      const result =
        await this.notificationService.sendGenericWorkflowNotification(data);
      return {
        success: result.success,
        message: result.message,
        recipients: result.recipients,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to send generic workflow notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  @Post('publishing-status')
  @HttpCode(HttpStatus.OK)
  async sendPublishingStatusNotification(
    @Body()
    data: {
      configId: number;
      config: any;
      tenantId: string;
      publishingStatus: 'active' | 'inactive';
      actorEmail: string;
      actorName: string;
    },
  ) {
    try {
      const result =
        await this.notificationService.sendPublishingStatusNotification(data);
      return {
        success: result.success,
        message: result.message,
        recipients: result.recipients,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to send publishing status notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  @Get('status')
  async getEmailStatus() {
    const isConfigured = this.notificationService['isConfigured'];
    const hasTransporter = this.notificationService['transporter'] !== null;

    const smtpHost = process.env.SMTP_HOST || 'NOT_SET';
    const smtpUser = process.env.SMTP_USER || 'NOT_SET';
    const smtpFromEmail = process.env.SMTP_FROM_EMAIL || smtpUser;
    const smtpPort = process.env.SMTP_PORT || '587';

    const maskedUser =
      smtpUser !== 'NOT_SET' ? `${smtpUser.substring(0, 3)}***` : 'NOT_SET';

    return {
      configured: isConfigured,
      transporterReady: hasTransporter,
      config: {
        host: smtpHost,
        port: smtpPort,
        user: maskedUser,
        fromEmail: smtpFromEmail,
      },
      status: isConfigured
        ? 'Email system is ready'
        : 'SMTP not configured - running in dry run mode',
      dryRunMode: !isConfigured,
    };
  }
}
