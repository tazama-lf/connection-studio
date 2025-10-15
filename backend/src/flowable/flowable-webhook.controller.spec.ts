import { Test, TestingModule } from '@nestjs/testing';
import { FlowableWebhookController } from './flowable-webhook.controller';
import { FlowableService } from './flowable.service';
import { ConfigRepository } from '../config/config.repository';
import { AuditService } from '../audit/audit.service';
import { ConfigStatus } from '../config/config.interfaces';

describe('FlowableWebhookController', () => {
  let controller: FlowableWebhookController;

  const mockFlowableService = {
    getConfigFromProcess: jest.fn(),
  };

  const mockConfigRepository = {
    createConfig: jest.fn(),
  };

  const mockAuditService = {
    logAction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FlowableWebhookController],
      providers: [
        { provide: FlowableService, useValue: mockFlowableService },
        { provide: ConfigRepository, useValue: mockConfigRepository },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    controller = module.get<FlowableWebhookController>(
      FlowableWebhookController,
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('handleTaskCompleted', () => {
    const mockConfigData = {
      configId: 'config-123',
      msgFam: 'pacs.008',
      transactionType: 'credit_transfer',
      endpointPath: '/api/pacs008',
      version: '1.0',
      contentType: 'application/json',
      schema: { type: 'object' },
      mapping: { field1: 'mapped1' },
      createdBy: 'user-1',
    };

    it('should handle approval successfully', async () => {
      const payload = {
        processInstanceId: 'process-123',
        taskName: 'Review Configuration',
        variables: {
          approvalStatus: 'approved',
          reviewedBy: 'approver-1',
          remarks: 'Looks good',
        },
        tenantId: 'tenant-1',
      };

      mockFlowableService.getConfigFromProcess.mockResolvedValue(
        mockConfigData,
      );
      mockConfigRepository.createConfig.mockResolvedValue(1);
      mockAuditService.logAction.mockResolvedValue(undefined);

      const result = await controller.handleTaskCompleted(payload);

      expect(result.success).toBe(true);
      expect(result.message).toContain('approved and saved to main table');
      if ('configId' in result) {
        expect(result.configId).toBe(1);
      }
      expect(mockConfigRepository.createConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          msgFam: 'pacs.008',
          transactionType: 'credit_transfer',
          endpointPath: '/api/pacs008',
          status: ConfigStatus.COMPLETED,
        }),
      );
      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'CONFIG',
          action: 'APPROVE_CONFIG',
          actor: 'approver-1',
        }),
      );
    });

    it('should handle rejection and send back to editor', async () => {
      const payload = {
        processInstanceId: 'process-123',
        taskName: 'Review Configuration',
        variables: {
          approvalStatus: 'rejected',
          reviewedBy: 'approver-1',
          remarks: 'Needs improvement',
        },
        tenantId: 'tenant-1',
      };

      mockFlowableService.getConfigFromProcess.mockResolvedValue(
        mockConfigData,
      );
      mockAuditService.logAction.mockResolvedValue(undefined);

      const result = await controller.handleTaskCompleted(payload);

      expect(result.success).toBe(true);
      expect(result.message).toContain('sent back to editor for revision');
      if ('action' in result) {
        expect(result.action).toBe('reverted_to_editor');
      }
      if ('remarks' in result) {
        expect(result.remarks).toBe('Needs improvement');
      }
      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'CONFIG',
          action: 'REJECT_CONFIG',
          actor: 'approver-1',
        }),
      );
      expect(mockConfigRepository.createConfig).not.toHaveBeenCalled();
    });

    it('should handle editor resubmission', async () => {
      const payload = {
        processInstanceId: 'process-123',
        taskName: 'Revise Configuration',
        variables: {
          revisionAction: 'resubmit',
        },
        tenantId: 'tenant-1',
      };

      mockFlowableService.getConfigFromProcess.mockResolvedValue(
        mockConfigData,
      );
      mockAuditService.logAction.mockResolvedValue(undefined);

      const result = await controller.handleTaskCompleted(payload);

      expect(result.success).toBe(true);
      expect(result.message).toContain('resubmitted for approval');
      if ('action' in result) {
        expect(result.action).toBe('resubmitted');
      }
      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'CONFIG',
          action: 'RESUBMIT_CONFIG',
          actor: 'user-1',
        }),
      );
    });

    it('should handle editor cancellation', async () => {
      const payload = {
        processInstanceId: 'process-123',
        taskName: 'Revise Configuration',
        variables: {
          revisionAction: 'cancel',
        },
        tenantId: 'tenant-1',
      };

      mockFlowableService.getConfigFromProcess.mockResolvedValue(
        mockConfigData,
      );
      mockAuditService.logAction.mockResolvedValue(undefined);

      const result = await controller.handleTaskCompleted(payload);

      expect(result.success).toBe(true);
      expect(result.message).toContain('cancelled by editor');
      if ('action' in result) {
        expect(result.action).toBe('cancelled');
      }
      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'CONFIG',
          action: 'CANCEL_CONFIG',
          actor: 'user-1',
        }),
      );
      expect(mockConfigRepository.createConfig).not.toHaveBeenCalled();
    });

    it('should handle missing config data', async () => {
      const payload = {
        processInstanceId: 'process-123',
        taskName: 'Review Configuration',
        variables: { approvalStatus: 'approved' },
        tenantId: 'tenant-1',
      };

      mockFlowableService.getConfigFromProcess.mockResolvedValue({});

      const result = await controller.handleTaskCompleted(payload);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Config data not found');
    });

    it('should handle errors gracefully', async () => {
      const payload = {
        processInstanceId: 'process-123',
        taskName: 'Review Configuration',
        variables: { approvalStatus: 'approved' },
        tenantId: 'tenant-1',
      };

      mockFlowableService.getConfigFromProcess.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await controller.handleTaskCompleted(payload);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to process webhook');
    });

    it('should use default actor when reviewedBy is missing', async () => {
      const payload = {
        processInstanceId: 'process-123',
        taskName: 'Review Configuration',
        variables: {
          approvalStatus: 'approved',
          remarks: 'Auto-approved',
        },
        tenantId: 'tenant-1',
      };

      mockFlowableService.getConfigFromProcess.mockResolvedValue(
        mockConfigData,
      );
      mockConfigRepository.createConfig.mockResolvedValue(1);
      mockAuditService.logAction.mockResolvedValue(undefined);

      const result = await controller.handleTaskCompleted(payload);

      expect(result.success).toBe(true);
      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          actor: 'system',
        }),
      );
    });
  });

  describe('Workflow scenarios', () => {
    it('should handle: Editor creates → Approver approves', async () => {
      const mockConfigData = {
        configId: 'config-123',
        msgFam: 'pacs.008',
        transactionType: 'credit_transfer',
        endpointPath: '/api/pacs008',
        version: '1.0',
        contentType: 'application/json',
        schema: { type: 'object' },
        mapping: {},
        createdBy: 'editor-1',
      };

      mockFlowableService.getConfigFromProcess.mockResolvedValue(
        mockConfigData,
      );
      mockAuditService.logAction.mockResolvedValue(undefined);
      mockConfigRepository.createConfig.mockResolvedValue(1);

      const approvalPayload = {
        processInstanceId: 'process-123',
        taskName: 'Review Configuration',
        variables: {
          approvalStatus: 'approved',
          reviewedBy: 'approver-1',
        },
        tenantId: 'tenant-1',
      };

      const result = await controller.handleTaskCompleted(approvalPayload);

      expect(result.success).toBe(true);
      if ('configId' in result) {
        expect(result.configId).toBe(1);
      }
      expect(mockConfigRepository.createConfig).toHaveBeenCalledTimes(1);
    });

    it('should handle: Editor creates → Approver rejects → Editor resubmits → Approver approves', async () => {
      const mockConfigData = {
        configId: 'config-123',
        msgFam: 'pacs.008',
        transactionType: 'credit_transfer',
        endpointPath: '/api/pacs008',
        version: '1.0',
        contentType: 'application/json',
        schema: { type: 'object' },
        mapping: {},
        createdBy: 'editor-1',
      };

      mockFlowableService.getConfigFromProcess.mockResolvedValue(
        mockConfigData,
      );
      mockAuditService.logAction.mockResolvedValue(undefined);

      const rejectionPayload = {
        processInstanceId: 'process-123',
        taskName: 'Review Configuration',
        variables: {
          approvalStatus: 'rejected',
          reviewedBy: 'approver-1',
          remarks: 'Fix schema',
        },
        tenantId: 'tenant-1',
      };

      let result = await controller.handleTaskCompleted(rejectionPayload);
      expect(result.success).toBe(true);
      if ('action' in result) {
        expect(result.action).toBe('reverted_to_editor');
      }

      const resubmitPayload = {
        processInstanceId: 'process-123',
        taskName: 'Revise Configuration',
        variables: {
          revisionAction: 'resubmit',
        },
        tenantId: 'tenant-1',
      };

      result = await controller.handleTaskCompleted(resubmitPayload);
      expect(result.success).toBe(true);
      if ('action' in result) {
        expect(result.action).toBe('resubmitted');
      }

      mockConfigRepository.createConfig.mockResolvedValue(1);

      const approvalPayload = {
        processInstanceId: 'process-123',
        taskName: 'Review Configuration',
        variables: {
          approvalStatus: 'approved',
          reviewedBy: 'approver-1',
        },
        tenantId: 'tenant-1',
      };

      result = await controller.handleTaskCompleted(approvalPayload);
      expect(result.success).toBe(true);
      if ('configId' in result) {
        expect(result.configId).toBe(1);
      }
    });

    it('should handle: Editor creates → Approver rejects → Editor cancels', async () => {
      const mockConfigData = {
        configId: 'config-123',
        msgFam: 'pacs.008',
        transactionType: 'credit_transfer',
        endpointPath: '/api/pacs008',
        version: '1.0',
        contentType: 'application/json',
        schema: { type: 'object' },
        mapping: {},
        createdBy: 'editor-1',
      };

      mockFlowableService.getConfigFromProcess.mockResolvedValue(
        mockConfigData,
      );
      mockAuditService.logAction.mockResolvedValue(undefined);

      const rejectionPayload = {
        processInstanceId: 'process-123',
        taskName: 'Review Configuration',
        variables: {
          approvalStatus: 'rejected',
          reviewedBy: 'approver-1',
          remarks: 'Not needed',
        },
        tenantId: 'tenant-1',
      };

      let result = await controller.handleTaskCompleted(rejectionPayload);
      expect(result.success).toBe(true);

      const cancelPayload = {
        processInstanceId: 'process-123',
        taskName: 'Revise Configuration',
        variables: {
          revisionAction: 'cancel',
        },
        tenantId: 'tenant-1',
      };

      result = await controller.handleTaskCompleted(cancelPayload);
      expect(result.success).toBe(true);
      if ('action' in result) {
        expect(result.action).toBe('cancelled');
      }
      expect(mockConfigRepository.createConfig).not.toHaveBeenCalled();
    });

    it('should handle multiple rejection-resubmission cycles', async () => {
      const mockConfigData = {
        configId: 'config-123',
        msgFam: 'pacs.008',
        transactionType: 'credit_transfer',
        endpointPath: '/api/pacs008',
        version: '1.0',
        contentType: 'application/json',
        schema: { type: 'object' },
        mapping: {},
        createdBy: 'editor-1',
      };

      mockFlowableService.getConfigFromProcess.mockResolvedValue(
        mockConfigData,
      );
      mockAuditService.logAction.mockResolvedValue(undefined);

      for (let i = 0; i < 3; i++) {
        const rejectionPayload = {
          processInstanceId: 'process-123',
          taskName: 'Review Configuration',
          variables: {
            approvalStatus: 'rejected',
            reviewedBy: 'approver-1',
            remarks: `Fix attempt ${i + 1}`,
          },
          tenantId: 'tenant-1',
        };

        let result = await controller.handleTaskCompleted(rejectionPayload);
        expect(result.success).toBe(true);

        const resubmitPayload = {
          processInstanceId: 'process-123',
          taskName: 'Revise Configuration',
          variables: {
            revisionAction: 'resubmit',
          },
          tenantId: 'tenant-1',
        };

        result = await controller.handleTaskCompleted(resubmitPayload);
        expect(result.success).toBe(true);
      }

      const calls = mockAuditService.logAction.mock.calls;
      const rejectCalls = calls.filter(
        (call) => call[0].action === 'REJECT_CONFIG',
      );
      const resubmitCalls = calls.filter(
        (call) => call[0].action === 'RESUBMIT_CONFIG',
      );

      expect(rejectCalls.length).toBe(3);
      expect(resubmitCalls.length).toBe(3);
    });
  });
});
