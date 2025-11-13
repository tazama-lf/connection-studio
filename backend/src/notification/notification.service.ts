import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

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
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {
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

      // Add Reply-To header if provided (for editor emails)
      if (options.replyTo) {
        mailOptions.replyTo = options.replyTo;
        this.logger.log(`Reply-To header set`); // Don't log email address (PII)
      }

      const info = await this.transporter.sendMail(mailOptions);
      const recipientCount = Array.isArray(mailOptions.to) ? mailOptions.to.length : 1;
      this.logger.log(
        `Email sent successfully to ${recipientCount} recipient(s): ${info.messageId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        ` Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }

  async sendChangesRequested(
    editorEmail: string,
    context: ConfigNotificationContext,
  ): Promise<boolean> {
    const subject = `Changes Requested: ${context.configName} v${context.version}`;

    const text = `
Hello,

An approver has requested changes to your configuration:

Configuration: ${context.configName}
Version: ${context.version}
Transaction Type: ${context.transactionType}
Config ID: ${context.configId}

Approver: ${context.requesterName || context.requesterEmail}
${context.comment ? `\nComments:\n${context.comment}` : ''}

Please review the requested changes and resubmit the configuration when ready.

---
This is an automated notification from Tazama Connection Studio.
Tenant: ${context.tenantId}
    `.trim();

    const html = `
<div style="font-family: Arial, sans-serif; max-inline-size: 600px; padding: 20px; background-color: #f9f9f9;">
  <h2 style="color: #d32f2f;">Changes Requested</h2>
  
  <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">'
    <h3 style="margin-block-start: 0;">Configuration Details</h3>
    <table style="inline-size: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px; font-weight: bold; color: #666;">Configuration:</td>
        <td style="padding: 8px;">${context.configName}</td>
      </tr>
      <tr style="background-color: #f5f5f5;">
        <td style="padding: 8px; font-weight: bold; color: #666;">Version:</td>
        <td style="padding: 8px;">${context.version}</td>
      </tr>
      <tr>
        <td style="padding: 8px; font-weight: bold; color: #666;">Transaction Type:</td>
        <td style="padding: 8px;">${context.transactionType}</td>
      </tr>
      <tr style="background-color: #f5f5f5;">
        <td style="padding: 8px; font-weight: bold; color: #666;">Config ID:</td>
        <td style="padding: 8px;">${context.configId}</td>
      </tr>
    </table>
  </div>

  <div style="background-color: #fff3cd; padding: 15px; border-inline-start: 4px solid #ffc107; margin: 20px 0;">
    <p style="margin: 0; font-weight: bold;">Approver: ${context.requesterName || context.requesterEmail}</p>
    ${context.comment ? `<p style="margin: 10px 0 0 0;"><strong>Comments:</strong><br/>${context.comment.replace(/\n/g, '<br/>')}</p>` : ''}
  </div>

  <p style="color: #666; margin-block-start: 30px;">
    Please review the requested changes and resubmit the configuration when ready.
  </p>

  <hr style="border: none; border-block-start: 1px solid #e0e0e0; margin: 30px 0;"/>
  <p style="color: #999; font-size: 12px;">
    This is an automated notification from Tazama Connection Studio.<br/>
    Tenant: ${context.tenantId}
  </p>
</div>
    `;

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

    const text = `
Hello,

${context.requesterName || context.requesterEmail} has submitted a configuration for your approval:

Configuration: ${context.configName}
Version: ${context.version}
Transaction Type: ${context.transactionType}
Config ID: ${context.configId}
${context.comment ? `\nComments:\n${context.comment}` : ''}

Please review and approve or request changes as needed.
Click "Reply" to respond directly to ${context.requesterName || context.requesterEmail}.

---
This is an automated notification from Tazama Connection Studio.
Tenant: ${context.tenantId}
    `.trim();

    const html = `
<div style="font-family: Arial, sans-serif; max-inline-size: 600px; padding: 20px; background-color: #f9f9f9;">
  <h2 style="color: #2196F3;">Approval Required</h2>
  
  <div style="background-color: #e3f2fd; padding: 15px; border-inline-start: 4px solid #2196F3; margin: 20px 0;">'
    <p style="margin: 0; font-weight: bold; font-size: 16px;">From: ${context.requesterName || context.requesterEmail}</p>
    <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">
      <a href="mailto:${context.requesterEmail}" style="color: #2196F3; text-decoration: none;">${context.requesterEmail}</a>
    </p>
    ${context.comment ? `<p style="margin: 10px 0 0 0;"><strong>Message:</strong><br/>${context.comment.replace(/\n/g, '<br/>')}</p>` : ''}
  </div>

  <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-block-start: 0;">Configuration Details</h3>
    <table style="inline-size: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px; font-weight: bold; color: #666;">Configuration:</td>
        <td style="padding: 8px;">${context.configName}</td>
      </tr>
      <tr style="background-color: #f5f5f5;">
        <td style="padding: 8px; font-weight: bold; color: #666;">Version:</td>
        <td style="padding: 8px;">${context.version}</td>
      </tr>
      <tr>
        <td style="padding: 8px; font-weight: bold; color: #666;">Transaction Type:</td>
        <td style="padding: 8px;">${context.transactionType}</td>
      </tr>
      <tr style="background-color: #f5f5f5;">
        <td style="padding: 8px; font-weight: bold; color: #666;">Config ID:</td>
        <td style="padding: 8px;">${context.configId}</td>
      </tr>
    </table>
  </div>

  <p style="color: #666; margin-block-start: 30px;">
    Please review this configuration and approve or request changes as needed.<br/>
    <strong>Click "Reply" to respond directly to the editor.</strong>
  </p>

  <hr style="border: none; border-block-start: 1px solid #e0e0e0; margin: 30px 0;"/>
  <p style="color: #999; font-size: 12px;">
    This is an automated notification from Tazama Connection Studio.<br/>
    Tenant: ${context.tenantId}
  </p>
</div>
    `;

    return await this.sendEmail({
      to: approverEmails,
      subject,
      text,
      html,
      replyTo: context.requesterEmail, // Editor's email - replies go to them
    });
  }

  async sendRejectionNotification(
    editorEmail: string,
    context: ConfigNotificationContext,
  ): Promise<boolean> {
    const subject = `Configuration Rejected: ${context.configName} v${context.version}`;

    const text = `
Hello,

Your configuration has been rejected by an approver:

Configuration: ${context.configName}
Version: ${context.version}
Transaction Type: ${context.transactionType}
Config ID: ${context.configId}

Approver: ${context.requesterName || context.requesterEmail}
${context.comment ? `\nRejection Reason:\n${context.comment}` : ''}

You can review the feedback and make necessary changes before resubmitting.

---
This is an automated notification from Tazama Connection Studio.
Tenant: ${context.tenantId}
    `.trim();

    const html = `
<div style="font-family: Arial, sans-serif; max-inline-size: 600px; padding: 20px; background-color: #f9f9f9;">
  <h2 style="color: #d32f2f;">Configuration Rejected</h2>
  
  <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">'
    <h3 style="margin-block-start: 0;">Configuration Details</h3>
    <table style="inline-size: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px; font-weight: bold; color: #666;">Configuration:</td>
        <td style="padding: 8px;">${context.configName}</td>
      </tr>
      <tr style="background-color: #f5f5f5;">
        <td style="padding: 8px; font-weight: bold; color: #666;">Version:</td>
        <td style="padding: 8px;">${context.version}</td>
      </tr>
      <tr>
        <td style="padding: 8px; font-weight: bold; color: #666;">Transaction Type:</td>
        <td style="padding: 8px;">${context.transactionType}</td>
      </tr>
      <tr style="background-color: #f5f5f5;">
        <td style="padding: 8px; font-weight: bold; color: #666;">Config ID:</td>
        <td style="padding: 8px;">${context.configId}</td>
      </tr>
    </table>
  </div>

  <div style="background-color: #ffebee; padding: 15px; border-inline-start: 4px solid #d32f2f; margin: 20px 0;">
    <p style="margin: 0; font-weight: bold;">Approver: ${context.requesterName || context.requesterEmail}</p>
    ${context.comment ? `<p style="margin: 10px 0 0 0;"><strong>Rejection Reason:</strong><br/>${context.comment.replace(/\n/g, '<br/>')}</p>` : ''}
  </div>

  <p style="color: #666; margin-block-start: 30px;">
    You can review the feedback and make necessary changes before resubmitting.
  </p>

  <hr style="border: none; border-block-start: 1px solid #e0e0e0; margin: 30px 0;"/>
  <p style="color: #999; font-size: 12px;">
    This is an automated notification from Tazama Connection Studio.<br/>
    Tenant: ${context.tenantId}
  </p>
</div>
    `;

    return await this.sendEmail({
      to: editorEmail,
      subject,
      text,
      html,
      replyTo: context.requesterEmail, // Approver's email - editor can reply
    });
  }

  async sendGenericWorkflowNotification(data: {
    event: 'editor_submit' | 'approver_approve' | 'exporter_export' | 'publisher_deploy' | 'publisher_activate' | 'publisher_deactivate';
    configId: number;
    config: any;
    tenantId: string;
    actorEmail: string;
    actorName: string;
    comment?: string;
    recipientEmails: string[]; 
  }): Promise<{ success: boolean; message: string; recipients: number }> {
    const { event, configId, config, tenantId, actorEmail, actorName, comment, recipientEmails } = data;

    if (!recipientEmails || recipientEmails.length === 0) {
      this.logger.warn(`[Generic Workflow] No recipients provided for event ${event}`);
      return { success: false, message: 'No recipients provided', recipients: 0 };
    }

    let subject: string;
    let actionDescription: string;
    let themeColor: string;
    let emailTitle: string;
    let statusBadgeColor: string;

    switch (event) {
      case 'editor_submit':
        subject = `Approval Required: ${config.transactionType || 'Configuration'} v${config.version || '1.0'}`;
        emailTitle = 'Approval Required';
        actionDescription = 'submitted for approval';
        themeColor = '#2196F3'; 
        statusBadgeColor = '#e3f2fd';
        break;

      case 'approver_approve':
        subject = `Configuration Approved: ${config.transactionType || 'Configuration'} v${config.version || '1.0'}`;
        emailTitle = 'Configuration Approved';
        actionDescription = 'approved and ready for export';
        themeColor = '#4CAF50'; 
        statusBadgeColor = '#e8f5e9';
        break;

      case 'exporter_export':
        subject = `Configuration Exported: ${config.transactionType || 'Configuration'} v${config.version || '1.0'}`;
        emailTitle = 'Configuration Exported';
        actionDescription = 'exported and ready for deployment';
        themeColor = '#FF9800'; 
        statusBadgeColor = '#fff3e0';
        break;

      case 'publisher_deploy':
        subject = `Configuration Deployed: ${config.transactionType || 'Configuration'} v${config.version || '1.0'}`;
        emailTitle = 'Configuration Deployed to Production';
        actionDescription = 'deployed to production';
        themeColor = '#9C27B0'; // Purple
        statusBadgeColor = '#f3e5f5';
        break;

      case 'publisher_activate':
        subject = `Configuration Activated: ${config.transactionType || 'Configuration'} v${config.version || '1.0'}`;
        emailTitle = 'Configuration Activated';
        actionDescription = 'activated';
        themeColor = '#4CAF50'; // Green
        statusBadgeColor = '#e8f5e9';
        break;

      case 'publisher_deactivate':
        subject = `Configuration Deactivated: ${config.transactionType || 'Configuration'} v${config.version || '1.0'}`;
        emailTitle = 'Configuration Deactivated';
        actionDescription = 'deactivated';
        themeColor = '#F44336'; // Red
        statusBadgeColor = '#ffebee';
        break;

      default:
        this.logger.error(`Unknown event type: ${event}`);
        return { success: false, message: `Unknown event type: ${event}`, recipients: 0 };
    }

    // Plain text version
    const text = `
Hello,

${actorName || actorEmail} has ${actionDescription}:

Configuration: ${config.transactionType || 'Configuration'}
Version: ${config.version || '1.0'}
Endpoint: ${config.endpointPath || 'N/A'}
Config ID: ${configId}
Status: ${config.status || 'N/A'}
${comment ? `\nComment:\n${comment}` : ''}

---
This is an automated notification from Tazama Connection Studio.
Tenant: ${tenantId}
From: ${actorName || actorEmail} (${actorEmail})
    `.trim();

    // HTML version with theme color
    const html = `
<div style="font-family: Arial, sans-serif; max-inline-size: 600px; padding: 20px; background-color: #f9f9f9;">
  <h2 style="color: ${themeColor}; margin-block-start: 0;">${emailTitle}</h2>
  
  <div style="background-color: ${statusBadgeColor}; padding: 15px; border-inline-start: 4px solid ${themeColor}; margin: 20px 0;">
    <p style="margin: 0; font-weight: bold; font-size: 16px;">From: ${actorName || actorEmail}</p>
    <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">
      <a href="mailto:${actorEmail}" style="color: ${themeColor}; text-decoration: none;">${actorEmail}</a>
    </p>
    ${comment ? `<p style="margin: 10px 0 0 0;"><strong>Comment:</strong><br/>${comment.replace(/\n/g, '<br/>')}</p>` : ''}
  </div>

  <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h3 style="margin-block-start: 0; color: ${themeColor};">Configuration Details</h3>
    <table style="inline-size: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px; font-weight: bold; color: #666;">Configuration:</td>
        <td style="padding: 8px;">${config.transactionType || 'Configuration'}</td>
      </tr>
      <tr style="background-color: #f5f5f5;">
        <td style="padding: 8px; font-weight: bold; color: #666;">Version:</td>
        <td style="padding: 8px;">${config.version || '1.0'}</td>
      </tr>
      <tr>
        <td style="padding: 8px; font-weight: bold; color: #666;">Endpoint:</td>
        <td style="padding: 8px;">${config.endpointPath || 'N/A'}</td>
      </tr>
      <tr style="background-color: #f5f5f5;">
        <td style="padding: 8px; font-weight: bold; color: #666;">Status:</td>
        <td style="padding: 8px;">
          <span style="background-color: ${themeColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">
            ${config.status || 'N/A'}
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding: 8px; font-weight: bold; color: #666;">Config ID:</td>
        <td style="padding: 8px;">${configId}</td>
      </tr>
      <tr style="background-color: #f5f5f5;">
        <td style="padding: 8px; font-weight: bold; color: #666;">Tenant:</td>
        <td style="padding: 8px;">${tenantId}</td>
      </tr>
    </table>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="#" style="display: inline-block; background-color: ${themeColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
      View in Connection Studio
    </a>
  </div>

  <hr style="border: none; border-block-start: 1px solid #e0e0e0; margin: 30px 0;"/>
  <p style="color: #999; font-size: 12px;">
    This is an automated notification from Tazama Connection Studio.<br/>
    Event: ${event}<br/>
    Tenant: ${tenantId}
  </p>
</div>
    `;

    this.logger.log(`[Generic Workflow] Sending ${event} notification for config ${configId}`);
    this.logger.log(`  Event: ${event}`);
    this.logger.log(`  Theme: ${themeColor}`);
    this.logger.log(`  Actor: ${actorEmail}`);
    this.logger.log(`  Recipients: ${recipientEmails.length} (${recipientEmails.join(', ')})`);

    // Send ONE email to ALL recipients (all emails visible to each other)
    const result = await this.sendEmail({
      to: recipientEmails.join(', '),  // Send to all recipients in one email
      subject,
      text,
      html,
      replyTo: actorEmail,
    });

    const allSuccess = result;
    const message = allSuccess 
      ? `Generic workflow notification sent to ${recipientEmails.length} recipient(s)`
      : 'SMTP not configured (dry run)';

    return {
      success: allSuccess,
      message,
      recipients: allSuccess ? recipientEmails.length : 0,
    };
  }

  async sendPublishingStatusNotification(data: {
    configId: number;
    config: any;
    tenantId: string;
    publishingStatus: 'active' | 'inactive';
    actorEmail: string;
    actorName: string;
  }): Promise<{ success: boolean; message: string; recipients: number }> {
    const { configId, config, tenantId, publishingStatus, actorEmail, actorName } = data;

    // Import keycloakService to get all user emails for the tenant
    const axios = (await import('axios')).default;
    const adminServiceUrl = process.env.ADMIN_SERVICE_URL || 'http://localhost:3100';
    
    let recipientEmails: string[] = [];
    try {
      // Get all users from all roles in this tenant
      const response = await axios.get(`${adminServiceUrl}/v1/admin/users/tenant/${tenantId}/all-emails`, {
        timeout: 5000,
      });
      recipientEmails = response.data.emails || [];
    } catch (error) {
      this.logger.warn(`Failed to fetch user emails for tenant ${tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false, message: 'Failed to fetch recipient emails', recipients: 0 };
    }

    if (recipientEmails.length === 0) {
      this.logger.warn(`No users found for tenant ${tenantId}`);
      return { success: false, message: 'No recipients found', recipients: 0 };
    }

    const isActivation = publishingStatus === 'active';
    const subject = `Configuration ${isActivation ? 'Activated' : 'Deactivated'}: ${config.transactionType || 'Configuration'} v${config.version || '1.0'}`;
    const emailTitle = `Configuration ${isActivation ? 'Activated' : 'Deactivated'}`;
    const actionDescription = isActivation ? 'activated' : 'deactivated';
    const themeColor = isActivation ? '#4CAF50' : '#F44336'; // Green for active, Red for inactive
    const statusBadgeColor = isActivation ? '#e8f5e9' : '#ffebee';

    // Plain text version
    const text = `
Hello,

${actorName || actorEmail} has ${actionDescription} the following configuration:

Configuration: ${config.transactionType || 'Configuration'}
Version: ${config.version || '1.0'}
Endpoint: ${config.endpointPath || 'N/A'}
Config ID: ${configId}
Publishing Status: ${publishingStatus.toUpperCase()}
Status: ${config.status || 'N/A'}

---
This is an automated notification from Tazama Connection Studio.
Tenant: ${tenantId}
From: ${actorName || actorEmail} (${actorEmail})
    `.trim();

    // HTML version
    const html = `
<div style="font-family: Arial, sans-serif; max-inline-size: 600px; padding: 20px; background-color: #f9f9f9;">
  <h2 style="color: ${themeColor}; margin-block-start: 0;">${emailTitle}</h2>
  
  <div style="background-color: ${statusBadgeColor}; padding: 15px; border-inline-start: 4px solid ${themeColor}; margin: 20px 0;">
    <p style="margin: 0; font-weight: bold; font-size: 16px;">From: ${actorName || actorEmail}</p>
    <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">
      <a href="mailto:${actorEmail}" style="color: ${themeColor}; text-decoration: none;">${actorEmail}</a>
    </p>
    <p style="margin: 10px 0 0 0; font-size: 18px; font-weight: bold; color: ${themeColor};">
      Publishing Status: ${publishingStatus.toUpperCase()}
    </p>
  </div>

  <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h3 style="margin-block-start: 0; color: ${themeColor};">Configuration Details</h3>
    <table style="inline-size: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px; font-weight: bold; color: #666;">Configuration:</td>
        <td style="padding: 8px;">${config.transactionType || 'Configuration'}</td>
      </tr>
      <tr style="background-color: #f5f5f5;">
        <td style="padding: 8px; font-weight: bold; color: #666;">Version:</td>
        <td style="padding: 8px;">${config.version || '1.0'}</td>
      </tr>
      <tr>
        <td style="padding: 8px; font-weight: bold; color: #666;">Endpoint:</td>
        <td style="padding: 8px;">${config.endpointPath || 'N/A'}</td>
      </tr>
      <tr style="background-color: #f5f5f5;">
        <td style="padding: 8px; font-weight: bold; color: #666;">Publishing Status:</td>
        <td style="padding: 8px;">
          <span style="background-color: ${themeColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">
            ${publishingStatus.toUpperCase()}
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding: 8px; font-weight: bold; color: #666;">Config Status:</td>
        <td style="padding: 8px;">${config.status || 'N/A'}</td>
      </tr>
      <tr style="background-color: #f5f5f5;">
        <td style="padding: 8px; font-weight: bold; color: #666;">Config ID:</td>
        <td style="padding: 8px;">${configId}</td>
      </tr>
      <tr>
        <td style="padding: 8px; font-weight: bold; color: #666;">Tenant:</td>
        <td style="padding: 8px;">${tenantId}</td>
      </tr>
    </table>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="#" style="display: inline-block; background-color: ${themeColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
      View in Connection Studio
    </a>
  </div>

  <hr style="border: none; border-block-start: 1px solid #e0e0e0; margin: 30px 0;"/>
  <p style="color: #999; font-size: 12px;">
    This is an automated notification from Tazama Connection Studio.<br/>
    Publishing Status: ${publishingStatus}<br/>
    Tenant: ${tenantId}
  </p>
</div>
    `;

    this.logger.log(`[Publishing Status] Sending ${publishingStatus} notification for config ${configId}`);
    this.logger.log(`  Status: ${publishingStatus}`);
    this.logger.log(`  Actor: ${actorEmail}`);
    this.logger.log(`  Recipients: ${recipientEmails.length} (${recipientEmails.join(', ')})`);

    // Send ONE email to ALL recipients
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
}
