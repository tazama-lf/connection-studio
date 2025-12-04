import { Test, TestingModule } from '@nestjs/testing';
import { ConfigWorkflowService } from '../../src/config/config-workflow.service';
import { ConfigStatus } from '../../src/config/config.interfaces';

describe('ConfigWorkflowService', () => {
  let service: ConfigWorkflowService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConfigWorkflowService],
    }).compile();

    service = module.get<ConfigWorkflowService>(ConfigWorkflowService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('canEditConfig', () => {
    it('should allow editing IN_PROGRESS config', () => {
      const result = service.canEditConfig(ConfigStatus.IN_PROGRESS);
      expect(result.canEdit).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should allow editing REJECTED config', () => {
      const result = service.canEditConfig(ConfigStatus.REJECTED);
      expect(result.canEdit).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should prevent editing APPROVED config', () => {
      const result = service.canEditConfig(ConfigStatus.APPROVED);
      expect(result.canEdit).toBe(false);
      expect(result.message).toBe(
        'Editing not allowed. Please clone to create a new version.',
      );
    });

    it('should prevent editing UNDER_REVIEW config', () => {
      const result = service.canEditConfig(ConfigStatus.UNDER_REVIEW);
      expect(result.canEdit).toBe(false);
      expect(result.message).toBe(
        'Editing not allowed. Please clone to create a new version.',
      );
    });

    it('should prevent editing DEPLOYED config', () => {
      const result = service.canEditConfig(ConfigStatus.DEPLOYED);
      expect(result.canEdit).toBe(false);
      expect(result.message).toBe(
        'Editing not allowed. Please clone to create a new version.',
      );
    });
  });

  describe('validateStatusTransition', () => {
    it('should allow transition from IN_PROGRESS to UNDER_REVIEW', () => {
      const result = service.validateStatusTransition(
        ConfigStatus.IN_PROGRESS,
        ConfigStatus.UNDER_REVIEW,
      );
      expect(result.isValid).toBe(true);
    });

    it('should allow transition from UNDER_REVIEW to APPROVED', () => {
      const result = service.validateStatusTransition(
        ConfigStatus.UNDER_REVIEW,
        ConfigStatus.APPROVED,
      );
      expect(result.isValid).toBe(true);
    });

    it('should allow transition from UNDER_REVIEW to REJECTED', () => {
      const result = service.validateStatusTransition(
        ConfigStatus.UNDER_REVIEW,
        ConfigStatus.REJECTED,
      );
      expect(result.isValid).toBe(true);
    });

    it('should allow transition from APPROVED to DEPLOYED', () => {
      const result = service.validateStatusTransition(
        ConfigStatus.APPROVED,
        ConfigStatus.DEPLOYED,
      );
      expect(result.isValid).toBe(true);
    });

    it('should prevent invalid transition from IN_PROGRESS to APPROVED', () => {
      const result = service.validateStatusTransition(
        ConfigStatus.IN_PROGRESS,
        ConfigStatus.APPROVED,
      );
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Invalid status transition');
    });

    it('should prevent transition from APPROVED to IN_PROGRESS', () => {
      const result = service.validateStatusTransition(
        ConfigStatus.APPROVED,
        ConfigStatus.IN_PROGRESS,
      );
      expect(result.isValid).toBe(false);
    });
  });

  describe('canPerformAction', () => {
    it('should allow editor to submit for approval', () => {
      const result = service.canPerformAction(
        ConfigStatus.IN_PROGRESS,
        'submit',
        ['editor'],
      );
      expect(result.canPerform).toBe(true);
    });

    it('should allow approver to approve config', () => {
      const result = service.canPerformAction(
        ConfigStatus.UNDER_REVIEW,
        'approve',
        ['approver'],
      );
      expect(result.canPerform).toBe(true);
    });

    it('should allow approver to reject config', () => {
      const result = service.canPerformAction(
        ConfigStatus.UNDER_REVIEW,
        'reject',
        ['approver'],
      );
      expect(result.canPerform).toBe(true);
    });

    it('should prevent editor from approving config', () => {
      const result = service.canPerformAction(
        ConfigStatus.UNDER_REVIEW,
        'approve',
        ['editor'],
      );
      expect(result.canPerform).toBe(false);
      expect(result.message).toContain('Insufficient permissions');
    });

    it('should allow admin to perform any action', () => {
      const result = service.canPerformAction(
        ConfigStatus.UNDER_REVIEW,
        'approve',
        ['admin'],
      );
      expect(result.canPerform).toBe(true);
    });
  });

  describe('getTargetStatus', () => {
    it('should return UNDER_REVIEW for submit action', () => {
      const status = service.getTargetStatus('submit');
      expect(status).toBe(ConfigStatus.UNDER_REVIEW);
    });

    it('should return APPROVED for approve action', () => {
      const status = service.getTargetStatus('approve');
      expect(status).toBe(ConfigStatus.APPROVED);
    });

    it('should return REJECTED for reject action', () => {
      const status = service.getTargetStatus('reject');
      expect(status).toBe(ConfigStatus.REJECTED);
    });

    it('should return DEPLOYED for deploy action', () => {
      const status = service.getTargetStatus('deploy');
      expect(status).toBe(ConfigStatus.DEPLOYED);
    });
  });

  describe('getActionDescription', () => {
    it('should return description for submit action', () => {
      const description = service.getActionDescription('submit');
      expect(description).toContain('submit');
    });

    it('should return description for approve action', () => {
      const description = service.getActionDescription('approve');
      expect(description).toContain('approve');
    });

    it('should return description for reject action', () => {
      const description = service.getActionDescription('reject');
      expect(description).toContain('reject');
    });

    it('should return description for deploy action', () => {
      const description = service.getActionDescription('deploy');
      expect(description).toContain('deploy');
    });
  });

  describe('validateUserPermissions', () => {
    it('should validate editor has permission to edit', () => {
      const result = service.validateUserPermissions(['editor'], 'edit');
      expect(result.hasPermission).toBe(true);
    });

    it('should validate approver has permission to approve', () => {
      const result = service.validateUserPermissions(['approver'], 'approve');
      expect(result.hasPermission).toBe(true);
    });

    it('should validate admin has all permissions', () => {
      const editResult = service.validateUserPermissions(['admin'], 'edit');
      const approveResult = service.validateUserPermissions(['admin'], 'approve');
      const deployResult = service.validateUserPermissions(['admin'], 'deploy');

      expect(editResult.hasPermission).toBe(true);
      expect(approveResult.hasPermission).toBe(true);
      expect(deployResult.hasPermission).toBe(true);
    });

    it('should reject viewer from editing', () => {
      const result = service.validateUserPermissions(['viewer'], 'edit');
      expect(result.hasPermission).toBe(false);
      expect(result.message).toContain('Insufficient permissions');
    });

    it('should reject editor from approving', () => {
      const result = service.validateUserPermissions(['editor'], 'approve');
      expect(result.hasPermission).toBe(false);
    });
  });
});
