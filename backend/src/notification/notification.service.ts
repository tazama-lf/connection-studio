import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { KeycloakService } from '../Keycloak/keycloak.service';
import { EmailCacheService } from '../Keycloak/email-cache.service';
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
} from '@tazama-lf/tcs-lib';
import { firstValueFrom } from 'rxjs/internal/firstValueFrom';
import { HttpService } from '@nestjs/axios';

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
    private readonly keycloakService: KeycloakService,
    private readonly emailCacheService: EmailCacheService,
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

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      this.logger.warn(
        ` [DRY RUN] Would send email to: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`,
      );
      this.logger.warn(`   Subject: ${options.subject}`);
      this.logger.warn(`   Body: ${options.text}`);
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

      const info = await this.transporter.sendMail(mailOptions);
      const recipientCount = Array.isArray(mailOptions.to)
        ? mailOptions.to.length
        : 1;
      this.logger.log(
        `Email sent successfully to ${recipientCount} recipient(s): ${info.messageId}`,
      );
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

  private async fetchRecipientEmails(
    event: string,
    tenantId: string,
    authToken: string,
    groupName: string,
  ): Promise<any> {
    try {
      let role: string | null = null;
      let fetchAll = false;

      switch (event) {
        case 'editor_submit':
          role = 'approver';
          break;
        case 'approver_approve':
          role = 'exporter';
          break;
        case 'exporter_export':
          role = 'publisher';
          break;
        case 'publisher_deploy':
        case 'publisher_activate':
        case 'publisher_deactivate':
          fetchAll = true;
          break;
        default:
          this.logger.warn(`Unknown event type: ${event}`);
          return [];
      }

      if (fetchAll) {
        const cachedEmails = this.emailCacheService.getEmailsByRole(
          tenantId,
          'all',
        );
        if (cachedEmails && cachedEmails.length > 0) {
          return cachedEmails;
        }

        this.logger.log(
          `Fetching all user emails from Keycloak for tenant '${tenantId}'`,
        );
        const emails = await this.keycloakService.getAllEmails(tenantId);

        this.emailCacheService.setEmailsByRole(tenantId, 'all', emails);

        this.logger.log(
          `✓ Fetched ${emails.length} total emails from Keycloak`,
        );
        return emails;


        const email = await this.getUserGroupMembers(authToken, groupName, undefined);

        this.logger.log(
          `✓ Fetched ${email} total emails from Auth Service`,
        );
        return email;
      }

      if (role) {
        const cachedEmails = this.emailCacheService.getEmailsByRole(
          tenantId,
          role,
        );
        if (cachedEmails && cachedEmails.length > 0) {
          return cachedEmails;
        }

        this.logger.log(`Fetching emails for role '${role}' from Keycloak`);
                const emails = await this.getUserGroupMembers(authToken, groupName, role);
        this.emailCacheService.setEmailsByRole(tenantId, role, emails);

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
    event: 'editor_submit' | 'approver_approve' | 'exporter_export' | 'publisher_deploy' | 'publisher_activate' | 'publisher_deactivate',
    configId: number;
    tenantId: string;
    actorEmail: string;
    actorName: string;
    config: any;
    authToken: string;
    groupName: string;
    comment?: string;
    recipientEmails?: string[];
  }): Promise<{ success: boolean; message: string; recipients: number }> {
    try {
      let {
        event,
        configId,
        tenantId,
        actorEmail,
        actorName,
        config,
        authToken,
        groupName,
        comment,
        recipientEmails,    
      } = data;

      this.logger.log(
        `Processing notification for event '${event}', config ${configId}`,
      );

      if (!recipientEmails || recipientEmails.length === 0) {
        this.logger.log(
          'No recipient emails provided, fetching from Keycloak...',
        );
        recipientEmails = await this.fetchRecipientEmails(event, tenantId, authToken, groupName) as string[];

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
      }

      this.logger.log(
        `Sending emails to ${recipientEmails.length} recipient(s)`,
      );

      const configName =
        config.transactionType || config.cfg_name || 'Configuration';
      const version = config.version || config.cfg_version || '1.0';
      const theme = getEmailTheme(event, configName, version);

      const templateContext: EmailTemplateContext = {
        event,
        config,
        actorName,
        actorEmail,
        comment,
        tenantId,
      };

      const htmlContent = generateWorkflowEmailHTML(templateContext);
      const textContent = generateWorkflowEmailText(templateContext);

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

    let recipientEmails: string[] = [];
    try {
      const cachedEmails = this.emailCacheService.getEmailsByRole(
        tenantId,
        'all',
      );
      if (cachedEmails && cachedEmails.length > 0) {
        recipientEmails = cachedEmails;
      } else {
        recipientEmails = await this.keycloakService.getAllEmails(tenantId);
        this.emailCacheService.setEmailsByRole(
          tenantId,
          'all',
          recipientEmails,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to fetch user emails for tenant ${tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {
        success: false,
        message: 'Failed to fetch recipient emails',
        recipients: 0,
      };
    }

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
    this.logger.log(`  Status: ${publishingStatus}`);
    this.logger.log(`  Actor: ${actorEmail}`);
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

  async getUserGroupMembers(token: string, groupName: string, roleName?: string) : Promise<string[]> {
       const authUrl = this.configService.get<string>('TAZAMA_AUTH_URL');
       let url = `${authUrl}?groupName=${groupName}`;
       if(roleName) {
        url =  url.concat(`&subGroupRoleName=${roleName}`);
       }
  
       this.logger.log("Fetching user group members from URL: ", url);
      try {
        const response = await firstValueFrom(
          this.httpService.get(url, {
            headers: { 'Content-Type': 'application/json' , Authorization: `Bearer ${token}` },
          }),
        );      

      const responseArr= response.data && Array.isArray(response.data) ? response.data : [];
      const emailList = responseArr?.map(obj => obj?.username);
      this.logger.log("Fetched user emails: ", emailList);
      return emailList;
    } catch(error) {
        this.logger.error(
          `Auth service error during fetching user group members: ${error.message}`,
        );
        throw new ServiceUnavailableException(
          'Authentication service unavailable',
        );
      }
        
  }
}
