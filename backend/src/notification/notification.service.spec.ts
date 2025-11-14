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

    it('should send email to single string recipient', async () => {
      const result = await service.sendEmail({
        to: 'single@example.com',
        subject: 'Test Subject',
        text: 'Test message',
      });

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'single@example.com', // String stays as is
        }),
      );
    });

    it('should send email to three recipients', async () => {
      const result = await service.sendEmail({
        to: ['user1@example.com', 'user2@example.com', 'user3@example.com'],
        subject: 'Test Subject',
        text: 'Test message',
        html: '<p>Test</p>',
      });

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user1@example.com, user2@example.com, user3@example.com',
        }),
      );
    });

    it('should use default HTML when html not provided', async () => {
      const result = await service.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test message',
      });

      expect(result).toBe(true);
      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toBe('<p>Test message</p>'); // Wrapped in <p>
    });

    it('should use fallback FROM_NAME when SMTP_FROM_NAME not configured', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'SMTP_FROM_NAME') return undefined; // Not configured
          if (key === 'SMTP_FROM_EMAIL') return 'noreply@example.com';
          if (key === 'SMTP_HOST') return 'smtp.example.com';
          if (key === 'SMTP_USER') return 'test@example.com';
          if (key === 'SMTP_PASS') return 'test-password';
          return undefined;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          NotificationService,
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      const newService = module.get<NotificationService>(NotificationService);

      const result = await newService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test message',
      });

      expect(result).toBe(true);
      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.from).toBe(
        '"Tazama Connection Studio" <noreply@example.com>',
      ); // Default name
    });

    it('should use SMTP_USER as FROM_EMAIL when SMTP_FROM_EMAIL not configured', async () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'SMTP_FROM_EMAIL') return undefined; // Not configured
          if (key === 'SMTP_FROM_NAME') return 'Test System';
          if (key === 'SMTP_HOST') return 'smtp.example.com';
          if (key === 'SMTP_USER') return 'smtp-user@example.com';
          if (key === 'SMTP_PASS') return 'test-password';
          return undefined;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          NotificationService,
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      const newService = module.get<NotificationService>(NotificationService);

      const result = await newService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test message',
      });

      expect(result).toBe(true);
      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.from).toBe('"Test System" <smtp-user@example.com>'); // Falls back to SMTP_USER
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

    it('should handle non-Error exceptions', async () => {
      mockTransporter.sendMail.mockRejectedValue('String error');

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

    it('should log dry run for array of recipients', async () => {
      configService.get.mockReturnValue(undefined);
      const newService = new NotificationService(configService);

      const result = await newService.sendEmail({
        to: ['user1@example.com', 'user2@example.com'],
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

    it('should handle multi-line comments with newlines', async () => {
      const context = {
        configId: 1,
        configName: 'Test Config',
        version: '1.0',
        transactionType: 'pacs.008',
        requesterEmail: 'approver@example.com',
        requesterName: 'Jane Approver',
        comment: 'Issue 1\nIssue 2\nIssue 3',
        tenantId: 'test-tenant',
      };

      const result = await service.sendChangesRequested(
        'editor@example.com',
        context,
      );

      expect(result).toBe(true);
      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Issue 1<br/>Issue 2<br/>Issue 3');
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

    it('should handle multi-line rejection reason with newlines', async () => {
      const context = {
        configId: 1,
        configName: 'Test Config',
        version: '1.0',
        transactionType: 'pacs.008',
        requesterEmail: 'approver@example.com',
        requesterName: 'Jane Approver',
        comment: 'Reason 1\nReason 2\nReason 3',
        tenantId: 'test-tenant',
      };

      const result = await service.sendRejectionNotification(
        'editor@example.com',
        context,
      );

      expect(result).toBe(true);
      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Reason 1<br/>Reason 2<br/>Reason 3');
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

  describe('sendGenericWorkflowNotification', () => {
    const baseConfig = {
      id: 123,
      msgFam: 'pain',
      transactionType: 'pain.001',
      endpointPath: '/tenant-001/pain/001',
      version: '2.0',
      contentType: 'application/json',
      schema: {},
      mapping: null,
      functions: null,
      status: 'STATUS_03_UNDER_REVIEW',
      tenantId: 'tenant-001',
      createdBy: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      publishing_status: 'inactive',
    };

    const baseData = {
      configId: 123,
      config: baseConfig,
      tenantId: 'tenant-001',
      actorEmail: 'actor@example.com',
      actorName: 'John Actor',
      recipientEmails: ['recipient1@example.com', 'recipient2@example.com'],
    };

    describe('editor_submit event', () => {
      it('should send approval required email with blue theme', async () => {
        const result = await service.sendGenericWorkflowNotification({
          ...baseData,
          event: 'editor_submit',
          comment: 'Please review this configuration',
        });

        expect(result.success).toBe(true);
        expect(result.recipients).toBe(2);
        expect(mockTransporter.sendMail).toHaveBeenCalled();

        const callArgs = mockTransporter.sendMail.mock.calls[0][0];
        expect(callArgs.subject).toContain('Approval Required');
        expect(callArgs.subject).toContain('pain.001');
        expect(callArgs.to).toBe(
          'recipient1@example.com, recipient2@example.com',
        );
        expect(callArgs.replyTo).toBe('actor@example.com');
        expect(callArgs.html).toContain('#2196F3'); // Blue theme
        expect(callArgs.html).toContain('Approval Required');
        expect(callArgs.html).toContain('Please review this configuration');
        expect(callArgs.html).toContain('John Actor');
      });

      it('should handle multi-line comments with newlines', async () => {
        const result = await service.sendGenericWorkflowNotification({
          ...baseData,
          event: 'editor_submit',
          comment: 'Line 1\nLine 2\nLine 3',
        });

        expect(result.success).toBe(true);
        const callArgs = mockTransporter.sendMail.mock.calls[0][0];
        expect(callArgs.html).toContain('Line 1<br/>Line 2<br/>Line 3');
        expect(callArgs.text).toContain('Line 1\nLine 2\nLine 3');
      });

      it('should handle missing comment', async () => {
        const result = await service.sendGenericWorkflowNotification({
          ...baseData,
          event: 'editor_submit',
        });

        expect(result.success).toBe(true);
        const callArgs = mockTransporter.sendMail.mock.calls[0][0];
        expect(callArgs.html).not.toContain('Comment:');
      });

      it('should use actorEmail when actorName missing', async () => {
        const result = await service.sendGenericWorkflowNotification({
          ...baseData,
          event: 'editor_submit',
          actorName: '',
        });

        expect(result.success).toBe(true);
        const callArgs = mockTransporter.sendMail.mock.calls[0][0];
        expect(callArgs.html).toContain('actor@example.com');
      });
    });

    describe('approver_approve event', () => {
      it('should send approved email with green theme', async () => {
        const result = await service.sendGenericWorkflowNotification({
          ...baseData,
          event: 'approver_approve',
          comment: 'Approved for export',
        });

        expect(result.success).toBe(true);
        expect(result.recipients).toBe(2);

        const callArgs = mockTransporter.sendMail.mock.calls[0][0];
        expect(callArgs.subject).toContain('Configuration Approved');
        expect(callArgs.html).toContain('#4CAF50'); // Green theme
        expect(callArgs.html).toContain('Configuration Approved');
        expect(callArgs.html).toContain('Approved for export');
        expect(callArgs.text).toContain('approved and ready for export');
      });
    });

    describe('exporter_export event', () => {
      it('should send exported email with orange theme', async () => {
        const result = await service.sendGenericWorkflowNotification({
          ...baseData,
          event: 'exporter_export',
          comment: 'Exported successfully',
        });

        expect(result.success).toBe(true);
        expect(result.recipients).toBe(2);

        const callArgs = mockTransporter.sendMail.mock.calls[0][0];
        expect(callArgs.subject).toContain('Configuration Exported');
        expect(callArgs.html).toContain('#FF9800'); // Orange theme
        expect(callArgs.html).toContain('Configuration Exported');
        expect(callArgs.html).toContain('Exported successfully');
        expect(callArgs.text).toContain('exported and ready for deployment');
      });
    });

    describe('publisher_deploy event', () => {
      it('should send deployed email with purple theme', async () => {
        const result = await service.sendGenericWorkflowNotification({
          ...baseData,
          event: 'publisher_deploy',
          comment: 'Deployed to production',
        });

        expect(result.success).toBe(true);
        expect(result.recipients).toBe(2);

        const callArgs = mockTransporter.sendMail.mock.calls[0][0];
        expect(callArgs.subject).toContain('Configuration Deployed');
        expect(callArgs.html).toContain('#9C27B0'); // Purple theme
        expect(callArgs.html).toContain('Configuration Deployed to Production');
        expect(callArgs.html).toContain('Deployed to production');
        expect(callArgs.text).toContain('deployed to production');
      });
    });

    describe('edge cases', () => {
      it('should return error when no recipients provided', async () => {
        const result = await service.sendGenericWorkflowNotification({
          ...baseData,
          event: 'editor_submit',
          recipientEmails: [],
        });

        expect(result.success).toBe(false);
        expect(result.message).toContain('No recipients');
        expect(result.recipients).toBe(0);
        expect(mockTransporter.sendMail).not.toHaveBeenCalled();
      });

      it('should return error for unknown event type', async () => {
        const result = await service.sendGenericWorkflowNotification({
          ...baseData,
          event: 'unknown_event' as any,
        });

        expect(result.success).toBe(false);
        expect(result.message).toContain('Unknown event type');
        expect(result.recipients).toBe(0);
        expect(mockTransporter.sendMail).not.toHaveBeenCalled();
      });

      it('should handle undefined recipientEmails', async () => {
        const result = await service.sendGenericWorkflowNotification({
          ...baseData,
          event: 'editor_submit',
          recipientEmails: undefined as any,
        });

        expect(result.success).toBe(false);
        expect(result.message).toContain('No recipients');
      });

      it('should handle missing config details gracefully', async () => {
        const minimalConfig = {
          ...baseConfig,
          transactionType: undefined,
          version: undefined,
          endpointPath: undefined,
          status: undefined,
        };

        const result = await service.sendGenericWorkflowNotification({
          ...baseData,
          config: minimalConfig,
          event: 'editor_submit',
        });

        expect(result.success).toBe(true);
        const callArgs = mockTransporter.sendMail.mock.calls[0][0];
        expect(callArgs.subject).toContain('Configuration v1.0'); // Default fallbacks
        expect(callArgs.html).toContain('N/A');
        expect(callArgs.html).toContain('Configuration'); // Fallback transactionType
        expect(callArgs.html).toContain('1.0'); // Fallback version
      });

      it('should use fallback values for all event types when config details missing', async () => {
        const minimalConfig = {
          ...baseConfig,
          transactionType: null as any,
          version: null as any,
        };

        // Test all 4 event types with fallbacks
        const events = [
          'editor_submit',
          'approver_approve',
          'exporter_export',
          'publisher_deploy',
        ] as const;

        for (const event of events) {
          jest.clearAllMocks();
          const result = await service.sendGenericWorkflowNotification({
            ...baseData,
            config: minimalConfig,
            event,
          });

          expect(result.success).toBe(true);
          const callArgs = mockTransporter.sendMail.mock.calls[0][0];
          expect(callArgs.subject).toContain('Configuration v1.0');
        }
      });

      it('should handle single recipient', async () => {
        const result = await service.sendGenericWorkflowNotification({
          ...baseData,
          event: 'editor_submit',
          recipientEmails: ['single@example.com'],
        });

        expect(result.success).toBe(true);
        expect(result.recipients).toBe(1);
        const callArgs = mockTransporter.sendMail.mock.calls[0][0];
        expect(callArgs.to).toBe('single@example.com');
      });

      it('should handle SMTP not configured', async () => {
        configService.get.mockReturnValue(undefined);
        const newService = new NotificationService(configService);

        const result = await newService.sendGenericWorkflowNotification({
          ...baseData,
          event: 'editor_submit',
        });

        expect(result.success).toBe(false);
        expect(result.message).toContain('dry run');
        expect(result.recipients).toBe(0);
      });

      it('should include all config details in HTML', async () => {
        const result = await service.sendGenericWorkflowNotification({
          ...baseData,
          event: 'editor_submit',
        });

        const callArgs = mockTransporter.sendMail.mock.calls[0][0];
        expect(callArgs.html).toContain('pain.001'); // transactionType
        expect(callArgs.html).toContain('2.0'); // version
        expect(callArgs.html).toContain('/tenant-001/pain/001'); // endpointPath
        expect(callArgs.html).toContain('STATUS_03_UNDER_REVIEW'); // status
        expect(callArgs.html).toContain('123'); // configId
        expect(callArgs.html).toContain('tenant-001'); // tenantId
      });

      it('should include event metadata in footer', async () => {
        const result = await service.sendGenericWorkflowNotification({
          ...baseData,
          event: 'approver_approve',
        });

        const callArgs = mockTransporter.sendMail.mock.calls[0][0];
        expect(callArgs.html).toContain('Event: approver_approve');
        expect(callArgs.html).toContain('Tenant: tenant-001');
      });
    });
  });

  describe('SMTP error handling', () => {
    it('should handle SMTP verify error on initialization', () => {
      jest.clearAllMocks();
      const errorTransporter = {
        sendMail: jest.fn(),
        verify: jest.fn((callback) =>
          callback(new Error('SMTP connection failed')),
        ),
      };
      (nodemailer.createTransport as jest.Mock).mockReturnValue(
        errorTransporter,
      );

      const newService = new NotificationService(configService);

      // Service should be created but not configured
      expect(newService).toBeDefined();
    });

    it('should handle transporter creation exception', () => {
      jest.clearAllMocks();
      (nodemailer.createTransport as jest.Mock).mockImplementation(() => {
        throw new Error('Transport creation failed');
      });

      const newService = new NotificationService(configService);

      // Service should be created but not configured
      expect(newService).toBeDefined();
    });
  });
});
