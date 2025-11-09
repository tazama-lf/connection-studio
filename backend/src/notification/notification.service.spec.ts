// SPDX-License-Identifier: Apache-2.0
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('NotificationService', () => {
  let service: NotificationService;
  let configService: jest.Mocked<ConfigService>;
  let mockTransporter: any;

  beforeEach(async () => {
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
      verify: jest.fn((callback) => callback(null)), // Success callback
    };

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config = {
          SMTP_HOST: 'smtp.example.com',
          SMTP_PORT: '587',
          SMTP_SECURE: 'false',
          SMTP_USER: 'test@example.com',
          SMTP_PASS: 'test-password',
          SMTP_FROM_EMAIL: 'noreply@example.com',
          SMTP_FROM_NAME: 'Test System',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('SMTP configuration', () => {
    it('should initialize transporter when SMTP is configured', () => {
      expect(nodemailer.createTransport).toHaveBeenCalled();
    });

    it('should not initialize transporter when SMTP credentials missing', () => {
      jest.clearAllMocks();
      configService.get.mockReturnValue(undefined);
      const newService = new NotificationService(configService);
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const result = await service.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test message',
        html: '<p>Test message</p>',
      });

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: '"Test System" <noreply@example.com>',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test message',
        html: '<p>Test message</p>',
      });
    });

    it('should send email to multiple recipients', async () => {
      const result = await service.sendEmail({
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'Test Subject',
        text: 'Test message',
      });

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user1@example.com, user2@example.com', // Array gets joined
        }),
      );
    });

    it('should include reply-to header when provided', async () => {
      const result = await service.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test message',
        replyTo: 'reply@example.com',
      });

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          replyTo: 'reply@example.com',
        }),
      );
    });

    it('should handle send failures gracefully', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

      const result = await service.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test message',
      });

      expect(result).toBe(false);
    });

    it('should not send email when SMTP not configured (dry run)', async () => {
      configService.get.mockReturnValue(undefined);
      const newService = new NotificationService(configService);

      const result = await newService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test message',
      });

      expect(result).toBe(false);
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('sendChangesRequested', () => {
    it('should send changes requested email with proper format', async () => {
      const context = {
        configId: 1,
        configName: 'Test Config',
        version: '1.0',
        transactionType: 'FIToFICustomerCreditTransfer',
        requesterEmail: 'approver@example.com',
        requesterName: 'Jane Approver',
        comment: 'Please update the mapping',
        tenantId: 'test-tenant',
      };

      const result = await service.sendChangesRequested(
        'editor@example.com',
        context,
      );

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalled();
      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.to).toBe('editor@example.com');
      expect(callArgs.subject).toContain('Changes Requested');
      expect(callArgs.html).toContain('Changes Requested');
      expect(callArgs.html).toContain('Please update the mapping');
    });

    it('should handle missing requester name gracefully', async () => {
      const context = {
        configId: 1,
        configName: 'Test Config',
        version: '1.0',
        transactionType: 'pacs.008',
        requesterEmail: 'approver@example.com',
        comment: 'Please update',
        tenantId: 'test-tenant',
      };

      const result = await service.sendChangesRequested(
        'editor@example.com',
        context,
      );

      expect(result).toBe(true);
      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('approver@example.com');
    });
  });

  describe('sendSubmitForApproval', () => {
    it('should send approval request email to all approvers', async () => {
      const approverEmails = [
        'approver1@example.com',
        'approver2@example.com',
        'approver3@example.com',
      ];
      const context = {
        configId: 1,
        configName: 'Test Config',
        version: '1.0',
        transactionType: 'FIToFICustomerCreditTransfer',
        requesterEmail: 'requester@example.com',
        requesterName: 'John Requester',
        comment: 'Ready for approval',
        tenantId: 'test-tenant',
      };

      const result = await service.sendSubmitForApproval(
        approverEmails,
        context,
      );

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalled();
      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.to).toBe(
        'approver1@example.com, approver2@example.com, approver3@example.com',
      );
      expect(callArgs.subject).toContain('Approval Required');
      expect(callArgs.html).toContain('Approval Required');
      expect(callArgs.replyTo).toBe('requester@example.com');
    });

    it('should handle empty approver list', async () => {
      const context = {
        configId: 1,
        configName: 'Test Config',
        version: '1.0',
        transactionType: 'pacs.008',
        requesterEmail: 'requester@example.com',
        tenantId: 'test-tenant',
      };

      const result = await service.sendSubmitForApproval([], context);

      expect(result).toBe(false);
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('should include configuration details in email', async () => {
      const approverEmails = ['approver@example.com'];
      const context = {
        configId: 123,
        configName: 'Test Config',
        version: '1.0',
        transactionType: 'FIToFICustomerCreditTransfer',
        requesterEmail: 'requester@example.com',
        requesterName: 'John Requester',
        tenantId: 'test-tenant',
      };

      const result = await service.sendSubmitForApproval(
        approverEmails,
        context,
      );

      expect(result).toBe(true);
      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('FIToFICustomerCreditTransfer');
      expect(callArgs.html).toContain('1.0');
      expect(callArgs.html).toContain('123');
    });
  });

  describe('sendRejectionNotification', () => {
    it('should send rejection email with reason', async () => {
      const context = {
        configId: 1,
        configName: 'Test Config',
        version: '1.0',
        transactionType: 'FIToFICustomerCreditTransfer',
        requesterEmail: 'approver@example.com',
        requesterName: 'Jane Approver',
        comment: 'Schema validation failed',
        tenantId: 'test-tenant',
      };

      const result = await service.sendRejectionNotification(
        'editor@example.com',
        context,
      );

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalled();
      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.to).toBe('editor@example.com');
      expect(callArgs.subject).toContain('Rejected');
      expect(callArgs.html).toContain('Configuration Rejected');
      expect(callArgs.html).toContain('Schema validation failed');
      expect(callArgs.replyTo).toBe('approver@example.com');
    });

    it('should handle missing rejection reason', async () => {
      const context = {
        configId: 1,
        configName: 'Test Config',
        version: '1.0',
        transactionType: 'pacs.008',
        requesterEmail: 'approver@example.com',
        tenantId: 'test-tenant',
      };

      const result = await service.sendRejectionNotification(
        'editor@example.com',
        context,
      );

      expect(result).toBe(true);
    });
  });

  describe('sendTestEmail', () => {
    it('should send test email successfully', async () => {
      const result = await service.sendTestEmail('test@example.com');

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalled();
      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.to).toBe('test@example.com');
      expect(callArgs.subject).toContain('Test Email');
      expect(callArgs.html).toContain('test email');
    });

    it('should handle send failures gracefully', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

      const result = await service.sendTestEmail('test@example.com');

      expect(result).toBe(false);
    });
  });
});
