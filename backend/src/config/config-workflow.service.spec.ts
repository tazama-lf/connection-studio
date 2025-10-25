import { Test, TestingModule } from '@nestjs/testing';
import { ConfigWorkflowService } from './config-workflow.service';
import { ConfigStatus, WorkflowAction } from './config.interfaces';

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

  describe('validateStatusTransition', () => {
    it('should allow valid transitions', () => {
      const result = service.validateStatusTransition(
        ConfigStatus.IN_PROGRESS,
        ConfigStatus.UNDER_REVIEW,
        'submit_for_approval',
      );
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid transitions', () => {
      const result = service.validateStatusTransition(
        ConfigStatus.DEPLOYED,
        ConfigStatus.IN_PROGRESS,
        'return_to_progress',
      );
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Invalid transition');
    });

    it('should allow resubmission from CHANGES_REQUESTED to UNDER_REVIEW', () => {
      const result = service.validateStatusTransition(
        ConfigStatus.CHANGES_REQUESTED,
        ConfigStatus.UNDER_REVIEW,
        'submit_for_approval',
      );
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateUserPermissions', () => {
    it('should allow editor to edit in IN_PROGRESS status', () => {
      const result = service.validateUserPermissions(
        ['editor'],
        ConfigStatus.IN_PROGRESS,
        'submit_for_approval',
      );
      expect(result.canEdit).toBe(true);
      expect(result.canSubmit).toBe(true);
    });

    it('should allow approver to approve in UNDER_REVIEW status', () => {
      const result = service.validateUserPermissions(
        ['approver'],
        ConfigStatus.UNDER_REVIEW,
        'approve',
      );
      expect(result.canApprove).toBe(true);
      expect(result.canReject).toBe(true);
      expect(result.canRequestChanges).toBe(true);
    });

    it('should allow publisher to deploy in APPROVED status', () => {
      const result = service.validateUserPermissions(
        ['publisher'],
        ConfigStatus.APPROVED,
        'deploy',
      );
      expect(result.canDeploy).toBe(true);
    });

    it('should not allow editor to approve', () => {
      const result = service.validateUserPermissions(
        ['editor'],
        ConfigStatus.UNDER_REVIEW,
        'approve',
      );
      expect(result.canApprove).toBe(false);
    });
  });

  describe('canPerformAction', () => {
    it('should allow editor to submit for approval', () => {
      const result = service.canPerformAction(
        ['editor'],
        ConfigStatus.IN_PROGRESS,
        'submit_for_approval',
      );
      expect(result.canPerform).toBe(true);
    });

    it('should not allow editor to approve', () => {
      const result = service.canPerformAction(
        ['editor'],
        ConfigStatus.UNDER_REVIEW,
        'approve',
      );
      expect(result.canPerform).toBe(false);
      expect(result.message).toContain('Only approvers can approve');
    });

    it('should not allow invalid status transitions', () => {
      const result = service.canPerformAction(
        ['editor'],
        ConfigStatus.IN_PROGRESS,
        'deploy',
      );
      expect(result.canPerform).toBe(false);
      expect(result.message).toContain('Invalid transition');
    });
  });

  describe('canEditConfig', () => {
    it('should allow editing in editable states', () => {
      const editableStates = [
        ConfigStatus.IN_PROGRESS,
        ConfigStatus.CHANGES_REQUESTED,
      ];

      editableStates.forEach((status) => {
        const result = service.canEditConfig(status);
        expect(result.canEdit).toBe(true);
      });
    });

    it('should not allow editing in non-editable states', () => {
      const nonEditableStates = [
        ConfigStatus.UNDER_REVIEW,
        ConfigStatus.APPROVED,
        ConfigStatus.REJECTED,
        ConfigStatus.DEPLOYED,
      ];

      nonEditableStates.forEach((status) => {
        const result = service.canEditConfig(status);
        expect(result.canEdit).toBe(false);
        expect(result.message).toContain('Editing not allowed');
      });
    });
  });

  describe('getTargetStatus', () => {
    it('should return correct target status for actions', () => {
      const actionStatusMap: Record<WorkflowAction, ConfigStatus> = {
        submit_for_approval: ConfigStatus.UNDER_REVIEW,
        approve: ConfigStatus.APPROVED,
        reject: ConfigStatus.REJECTED,
        request_changes: ConfigStatus.CHANGES_REQUESTED,
        deploy: ConfigStatus.DEPLOYED,
        return_to_progress: ConfigStatus.IN_PROGRESS,
      };

      Object.entries(actionStatusMap).forEach(([action, expectedStatus]) => {
        const result = service.getTargetStatus(action as WorkflowAction);
        expect(result).toBe(expectedStatus);
      });
    });
  });
});
