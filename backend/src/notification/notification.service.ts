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

  async sendTestEmail(to: string): Promise<boolean> {
    return await this.sendEmail({
      to,
      subject: 'Test Email from Tazama Connection Studio',
      text: 'This is a test email to verify your SMTP configuration.',
      html: '<p>This is a test email to verify your SMTP configuration.</p>',
    });
  }
}
