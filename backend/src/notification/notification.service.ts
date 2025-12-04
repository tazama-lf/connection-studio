import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import {
  generateWorkflowEmailHTML,
  generateWorkflowEmailText,
  generatePublishingStatusEmailHTML,
  generatePublishingStatusEmailText,
  getEmailTheme,
  type EmailTemplateContext,
  generateChangesRequestedEmailHTML,
  generateChangesRequestedEmailText,
  generateSubmitForApprovalEmailHTML,
  generateSubmitForApprovalEmailText,
  generateRejectionEmailHTML,
  generateRejectionEmailText,
  Config,
  Job,
  Schedule,
  EmailTheme,
  JobEmailTemplateContext,
  generateJobflowEmailHTML,
  generateJobflowEmailText,
} from '@tazama-lf/tcs-lib';
import { firstValueFrom } from 'rxjs/internal/firstValueFrom';
import { HttpService } from '@nestjs/axios';
import { AuthenticatedUser } from '../auth/auth.types';

import {
  decodeValidatedToken,
  getGroupNameFromToken,
  getTenantId,
} from '../utils/helpers';
import { EventType } from '../enums/events.enum';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export interface ConfigNotificationContext {
  configId: number;
  configName: string;
  version: string;
  transactionType: string;
  requesterName?: string;
  requesterEmail: string;
  comment?: string;
  tenantId: string;
}

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  onModuleInit() {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');
    const smtpSecure = this.configService.get<string>('SMTP_SECURE') === 'true';

    if (!smtpHost || !smtpUser || !smtpPass) {
      this.logger.warn(
        ' SMTP NOT CONFIGURED - Email notifications will be logged but not sent',
      );
      this.logger.warn(
        '   Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env to enable emails',
      );
      this.isConfigured = false;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort || 587,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      this.transporter.verify((error) => {
        if (error) {
          this.logger.error(` SMTP connection error: ${error.message}`);
          this.logger.error(
            '   Please check your SMTP credentials in .env file',
          );
          this.isConfigured = false;
        } else {
          this.logger.log(` SMTP configured and ready: ${smtpHost}`);
          this.isConfigured = true;
        }
      });
    } catch (error) {
      this.logger.error(
        `Failed to initialize SMTP transporter: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.isConfigured = false;
    }
  }

  // Getter method for status check
  getStatus() {
    return {
      isConfigured: this.isConfigured,
      hasTransporter: this.transporter !== null,
    };
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      this.logger.warn(
        ` [DRY RUN] Would send email to: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`,
      );
      return false;
    }

    try {
      const fromEmail =
        this.configService.get<string>('SMTP_FROM_EMAIL') ||
        this.configService.get<string>('SMTP_USER');
      const fromName =
        this.configService.get<string>('SMTP_FROM_NAME') ||
        'Tazama Connection Studio';

      const mailOptions: nodemailer.SendMailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || `<p>${options.text}</p>`,
      };

      if (options.replyTo) {
        mailOptions.replyTo = options.replyTo;
        this.logger.log('Reply-To header set');
      }

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }

  async sendChangesRequested(
    editorEmail: string,
    context: ConfigNotificationContext,
  ): Promise<boolean> {
    const subject = `Changes Requested: ${context.configName} v${context.version}`;

    const text = generateChangesRequestedEmailText(
      context.configName,
      context.version,
      context.transactionType,
      context.configId,
      context.requesterName || '',
      context.requesterEmail,
      context.comment,
      context.tenantId,
    );

    const html = generateChangesRequestedEmailHTML(
      context.configName,
      context.version,
      context.transactionType,
      context.configId,
      context.requesterName || '',
      context.requesterEmail,
      context.comment,
      context.tenantId,
    );

    return await this.sendEmail({
      to: editorEmail,
      subject,
      text,
      html,
    });
  }

  async sendSubmitForApproval(
    approverEmails: string[],
    context: ConfigNotificationContext,
  ): Promise<boolean> {
    if (approverEmails.length === 0) {
      this.logger.warn(
        `No approver emails found for tenant ${context.tenantId}`,
      );
      return false;
    }

    const subject = `Approval Required: ${context.configName} v${context.version}`;

    const text = generateSubmitForApprovalEmailText(
      context.configName,
      context.version,
      context.transactionType,
      context.configId,
      context.requesterName || '',
      context.requesterEmail,
      context.comment,
      context.tenantId,
    );

    const html = generateSubmitForApprovalEmailHTML(
      context.configName,
      context.version,
      context.transactionType,
      context.configId,
      context.requesterName || '',
      context.requesterEmail,
      context.comment,
      context.tenantId,
    );

    return await this.sendEmail({
      to: approverEmails,
      subject,
      text,
      html,
      replyTo: context.requesterEmail,
    });
  }

  async sendRejectionNotification(
    editorEmail: string,
    context: ConfigNotificationContext,
  ): Promise<boolean> {
    const subject = `Configuration Rejected: ${context.configName} v${context.version}`;

    const text = generateRejectionEmailText(
      context.configName,
      context.version,
      context.transactionType,
      context.configId,
      context.requesterName || '',
      context.requesterEmail,
      context.comment,
      context.tenantId,
    );

    const html = generateRejectionEmailHTML(
      context.configName,
      context.version,
      context.transactionType,
      context.configId,
      context.requesterName || '',
      context.requesterEmail,
      context.comment,
      context.tenantId,
    );

    return await this.sendEmail({
      to: editorEmail,
      subject,
      text,
      html,
      replyTo: context.requesterEmail,
    });
  }

  async fetchRecipientEmails(
    event: EventType,
    tenantId: string,
    authToken: string,
    groupName: string,
  ): Promise<any> {
    try {
      let role: string | null = null;
      let fetchAll = false;

      switch (event) {
        case EventType.EditorSubmit:
          role = 'approver';
          break;
        case EventType.ApproverApprove:
          role = 'exporter';
          break;
        case EventType.ExporterExport:
          role = 'publisher';
          break;
        case EventType.ApproverReject:
          role = 'editor';
          break;
        case EventType.PublisherDeploy:
        case EventType.PublisherActivate:
        case EventType.PublisherDeactivate:
          fetchAll = true;
          break;
        default:
          this.logger.warn(`Unknown event type: ${event}`);
          return [];
      }

      if (fetchAll) {
      

        this.logger.log(
          `Fetching all user emails from AuthService for tenant '${tenantId}'`,
        );
        const emails = await this.getUserGroupMembers(
          authToken,
          groupName,
          undefined,
        );
        this.logger.log(
          `✓ Fetched ${emails.length} total emails from Auth Service`,
        );
        return emails;
      }

      if (role) {
       

        this.logger.log(`Fetching emails for role '${role}' from AuthService`);
        const emails = await this.getUserGroupMembers(
          authToken,
          groupName,
          role,
        );

        this.logger.log(`✓ Fetched ${emails} emails for role '${role}'`);
        return emails;
      }

      return [];
    } catch (error) {
      this.logger.error(`Failed to fetch recipient emails: ${error}`);
      return [];
    }
  }

  async sendGenericWorkflowNotification(data: {
    event: EventType;
    tenantId: string;
    actorEmail: string;
    actorName: string;
    actionEntity: Config | Job | Schedule;
    authToken: string;
    groupName: string;
    comment?: string;
  }): Promise<{ success: boolean; message: string; recipients: number }> {
    try {
      const {
        event,
        tenantId,
        actorEmail,
        actorName,
        actionEntity,
        authToken,
        groupName,
        comment,
      } = data;

      const recipientEmails = (await this.fetchRecipientEmails(
        event,
        tenantId,
        authToken,
        groupName,
      )) as string[];

      if (recipientEmails.length === 0) {
        this.logger.warn(
          `No recipients found for event '${event}' in tenant '${tenantId}'`,
        );
        return {
          success: false,
          message: 'No recipients found',
          recipients: 0,
        };
      }

      this.logger.log(
        `Sending emails to ${recipientEmails.length} recipient(s)`,
      );
      this.logger.log(`Sending emails to ${recipientEmails} recipient(s)`);

      let htmlContent = '';
      let textContent = '';
      let theme: EmailTheme | null = null;

      if ('transactionType' in actionEntity) {
        const config = actionEntity;
        const configName = config.transactionType || 'Configuration';
        const version = config.version || '1.0';
        theme = getEmailTheme(event, configName, version);
        const templateContext: EmailTemplateContext = {
          event,
          config,
          actorName,
          actorEmail,
          comment,
          tenantId,
        };
        htmlContent = generateWorkflowEmailHTML(templateContext);
        textContent = generateWorkflowEmailText(templateContext);
      } else if ('source_type' in actionEntity) {
        const job = actionEntity;
        const configName = job.endpoint_name || 'Job';
        const version = job.version || '1.0';
        theme = getEmailTheme(event, configName, version);

        const templateContext: JobEmailTemplateContext = {
          event,
          job,
          actorName,
          actorEmail,
          comment,
          tenantId,
        };

        htmlContent = generateJobflowEmailHTML(templateContext);
        textContent = generateJobflowEmailText(templateContext);
      } else if ('cron' in actionEntity) {
        const schedule = actionEntity as Schedule;
        const configName = schedule.name || 'Schedule';
        const version = '1.0';
        theme = getEmailTheme(event, configName, version);

        const templateContext: EmailTemplateContext = {
          event,
          config: schedule,
          actorName,
          actorEmail,
          comment,
          tenantId,
        };

        htmlContent = generateWorkflowEmailHTML(templateContext);
        textContent = generateWorkflowEmailText(templateContext);
      } else {
        this.logger.warn('Invalid actionEntity type');
        return {
          success: false,
          message: 'Invalid actionEntity type',
          recipients: 0,
        };
      }

      if (!theme) {
        this.logger.warn(`No email theme found for event '${event}'`);
        return {
          success: false,
          message: 'No email theme found',
          recipients: 0,
        };
      }

      const emailSent = await this.sendEmail({
        to: recipientEmails.join(', '),
        subject: theme.subject,
        text: textContent,
        html: htmlContent,
        replyTo: actorEmail,
      });

      if (emailSent) {
        this.logger.log(
          `Email sent successfully to ${recipientEmails.length} recipient(s)`,
        );
        return {
          success: true,
          message: 'Notification sent successfully',
          recipients: recipientEmails.length,
        };
      } else {
        return {
          success: false,
          message: 'Failed to send email (SMTP not configured)',
          recipients: 0,
        };
      }
    } catch (error) {
      this.logger.error(`Error sending notification: ${error}`);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        recipients: 0,
      };
    }
  }

  async sendPublishingStatusNotification(data: {
    configId: number;
    config: any;
    tenantId: string;
    publishingStatus: 'active' | 'inactive';
    actorEmail: string;
    actorName: string;
  }): Promise<{ success: boolean; message: string; recipients: number }> {
    const {
      configId,
      config,
      tenantId,
      publishingStatus,
      actorEmail,
      actorName,
    } = data;

    const recipientEmails: string[] = [];
    
    if (recipientEmails.length === 0) {
      this.logger.warn(`No users found for tenant ${tenantId}`);
      return { success: false, message: 'No recipients found', recipients: 0 };
    }

    const isActivation = publishingStatus === 'active';
    const subject = `Configuration ${isActivation ? 'Activated' : 'Deactivated'}: ${config.transactionType || 'Configuration'} v${config.version || '1.0'}`;

    const text = generatePublishingStatusEmailText(
      configId,
      config,
      tenantId,
      publishingStatus,
      actorEmail,
      actorName,
    );

    const html = generatePublishingStatusEmailHTML(
      configId,
      config,
      tenantId,
      publishingStatus,
      actorEmail,
      actorName,
    );

    this.logger.log(
      `[Publishing Status] Sending ${publishingStatus} notification for config ${configId}`,
    );
    this.logger.log(
      `  Recipients: ${recipientEmails.length} (${recipientEmails.join(', ')})`,
    );

    const result = await this.sendEmail({
      to: recipientEmails.join(', '),
      subject,
      text,
      html,
      replyTo: actorEmail,
    });

    const message = result
      ? `Publishing status notification sent to ${recipientEmails.length} recipient(s)`
      : 'SMTP not configured (dry run)';

    return {
      success: result,
      message,
      recipients: result ? recipientEmails.length : 0,
    };
  }

  async sendTestEmail(to: string): Promise<boolean> {
    return await this.sendEmail({
      to,
      subject: 'Test Email from Tazama Connection Studio',
      text: 'This is a test email to verify your SMTP configuration.',
      html: '<p>This is a test email to verify your SMTP configuration.</p>',
    });
  }

  async getUserGroupMembers(
    token: string,
    groupName: string,
    roleName?: string,
  ): Promise<string[]> {
    const authUrl = this.configService.get<string>('TAZAMA_AUTH_URL');
    let url = `${authUrl}?groupName=${groupName}`;
    if (roleName) {
      url = url.concat(`&subGroupRoleName=${roleName}`);
    }

    this.logger.log('Fetching user group members from URL: ', url);
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }),
      );

      this.logger.log('Response from Auth Service: ', response.data);

      const responseArr =
        response.data && Array.isArray(response.data) ? response.data : [];
      const emailList = responseArr?.map((obj) => obj?.username);
      this.logger.log('Fetched user emails: ', emailList);
      return emailList;
    } catch (error) {
      this.logger.error('Error fetching user group members: ', error);
      this.logger.error(
        `Auth service error during fetching user group members: ${error.message}`,
      );
      throw new ServiceUnavailableException(
        'Authentication service unavailable',
      );
    }
  }

  async sendWorkflowNotification(
    event: EventType,
    user: AuthenticatedUser,
    actionEntity: Config | Job | Schedule,
    authToken: string,
    comment?: string,
  ): Promise<void> {
    const decodedToken = decodeValidatedToken(user);
    const groupName = getGroupNameFromToken(decodedToken);
    if (!groupName) {
      this.logger.error(
        'Group name not found in token. Cannot send notification.',
      );
      return;
    }

    this.logger.log(
      `Action entity for sending email : ${JSON.stringify(actionEntity)}`,
    );

    await this.sendGenericWorkflowNotification({
      event,
      tenantId: getTenantId(user),
      actorEmail: decodedToken.preferredUsername,
      actorName: decodedToken.preferredUsername,
      actionEntity,
      authToken,
      groupName,
      comment,
    });
  }
}
