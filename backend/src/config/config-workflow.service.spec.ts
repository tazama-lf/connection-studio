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

    it('should allow UNDER_REVIEW to IN_PROGRESS transition for changes requested', () => {
      const result = service.validateStatusTransition(
        ConfigStatus.UNDER_REVIEW,
        ConfigStatus.IN_PROGRESS,
        'return_to_progress',
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

    it('should allow publisher to deploy in EXPORTED status', () => {
      const result = service.validateUserPermissions(
        ['publisher'],
        ConfigStatus.EXPORTED,
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
      const editableStates = [ConfigStatus.IN_PROGRESS, ConfigStatus.REJECTED];

      editableStates.forEach((status) => {
        const result = service.canEditConfig(status);
        expect(result.canEdit).toBe(true);
      });
    });

    it('should not allow editing in non-editable states', () => {
      const nonEditableStates = [
        ConfigStatus.UNDER_REVIEW,
        ConfigStatus.APPROVED,
        ConfigStatus.DEPLOYED,
        ConfigStatus.EXPORTED,
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
        deploy: ConfigStatus.DEPLOYED,
        return_to_progress: ConfigStatus.IN_PROGRESS,
        export: ConfigStatus.EXPORTED,
      };

      Object.entries(actionStatusMap).forEach(([action, expectedStatus]) => {
        const result = service.getTargetStatus(action as WorkflowAction);
        expect(result).toBe(expectedStatus);
      });
    });
  });

  describe('getActionDescription', () => {
    it('should return correct descriptions for all workflow actions', () => {
      expect(service.getActionDescription('submit_for_approval')).toBe(
        'Submit for Approval',
      );
      expect(service.getActionDescription('approve')).toBe('Approve');
      expect(service.getActionDescription('reject')).toBe('Reject');
      expect(service.getActionDescription('export')).toBe('Export');
      expect(service.getActionDescription('deploy')).toBe('Deploy');
      expect(service.getActionDescription('return_to_progress')).toBe(
        'Return to Progress',
      );
    });

    it('should return the action itself for unknown actions', () => {
      expect(service.getActionDescription('unknown_action' as any)).toBe(
        'unknown_action',
      );
    });
  });

  describe('canPerformAction - comprehensive coverage', () => {
    it('should allow approver to reject configuration in UNDER_REVIEW', () => {
      const result = service.canPerformAction(
        ['approver'],
        ConfigStatus.UNDER_REVIEW,
        'reject',
      );
      expect(result.canPerform).toBe(true);
    });

    it('should not allow non-approver to reject', () => {
      const result = service.canPerformAction(
        ['editor'],
        ConfigStatus.UNDER_REVIEW,
        'reject',
      );
      expect(result.canPerform).toBe(false);
      expect(result.message).toContain('Only approvers can reject');
    });

    it('should allow approver to approve configuration in UNDER_REVIEW', () => {
      const result = service.canPerformAction(
        ['approver'],
        ConfigStatus.UNDER_REVIEW,
        'approve',
      );
      expect(result.canPerform).toBe(true);
    });

    it('should allow publisher to deploy in EXPORTED status', () => {
      const result = service.canPerformAction(
        ['publisher'],
        ConfigStatus.EXPORTED,
        'deploy',
      );
      expect(result.canPerform).toBe(true);
    });

    it('should not allow non-publisher to deploy', () => {
      const result = service.canPerformAction(
        ['editor'],
        ConfigStatus.EXPORTED,
        'deploy',
      );
      expect(result.canPerform).toBe(false);
      expect(result.message).toContain('Only publishers can deploy');
    });

    it('should allow editor to return rejected config to progress', () => {
      const result = service.canPerformAction(
        ['editor'],
        ConfigStatus.REJECTED,
        'return_to_progress',
      );
      expect(result.canPerform).toBe(true);
    });

    it('should not allow non-editor to return to progress', () => {
      const result = service.canPerformAction(
        ['approver'],
        ConfigStatus.REJECTED,
        'return_to_progress',
      );
      expect(result.canPerform).toBe(false);
      expect(result.message).toContain(
        'Only editors can return rejected configurations to progress',
      );
    });

    it('should not allow return to progress from non-rejected status', () => {
      const result = service.canPerformAction(
        ['editor'],
        ConfigStatus.IN_PROGRESS,
        'return_to_progress',
      );
      expect(result.canPerform).toBe(false);
      expect(result.message).toContain('Invalid transition');
    });

    it('should allow exporter to export in APPROVED status', () => {
      const result = service.canPerformAction(
        ['exporter'],
        ConfigStatus.APPROVED,
        'export',
      );
      expect(result.canPerform).toBe(true);
    });

    it('should not allow non-exporter to export', () => {
      const result = service.canPerformAction(
        ['editor'],
        ConfigStatus.APPROVED,
        'export',
      );
      expect(result.canPerform).toBe(false);
      expect(result.message).toContain(
        'Only exporters can export configurations in APPROVED status',
      );
    });

    it('should not allow export from non-approved status', () => {
      const result = service.canPerformAction(
        ['exporter'],
        ConfigStatus.IN_PROGRESS,
        'export',
      );
      expect(result.canPerform).toBe(false);
      expect(result.message).toContain('Invalid transition');
    });

    it('should reject unknown action with default message', () => {
      const result = service.canPerformAction(
        ['editor'],
        ConfigStatus.IN_PROGRESS,
        'some_random_action',
      );
      expect(result.canPerform).toBe(false);
      expect(result.message).toContain('Invalid transition');
    });

    it('should reject unknown action', () => {
      const result = service.canPerformAction(
        ['editor'],
        ConfigStatus.IN_PROGRESS,
        'unknown_action',
      );
      expect(result.canPerform).toBe(false);
      expect(result.message).toContain('Invalid transition');
    });

    it('should allow editor to submit when permissions and transition are valid', () => {
      const result = service.canPerformAction(
        ['editor'],
        ConfigStatus.IN_PROGRESS,
        'submit_for_approval',
      );
      expect(result.canPerform).toBe(true);
      expect(result.message).toBeUndefined();
    });
  });

  describe('validateStatusTransition - comprehensive coverage', () => {
    it('should allow UNDER_REVIEW to APPROVED transition', () => {
      const result = service.validateStatusTransition(
        ConfigStatus.UNDER_REVIEW,
        ConfigStatus.APPROVED,
        'approve',
      );
      expect(result.isValid).toBe(true);
    });

    it('should allow UNDER_REVIEW to REJECTED transition', () => {
      const result = service.validateStatusTransition(
        ConfigStatus.UNDER_REVIEW,
        ConfigStatus.REJECTED,
        'reject',
      );
      expect(result.isValid).toBe(true);
    });

    it('should allow APPROVED to EXPORTED transition', () => {
      const result = service.validateStatusTransition(
        ConfigStatus.APPROVED,
        ConfigStatus.EXPORTED,
        'export',
      );
      expect(result.isValid).toBe(true);
    });

    it('should allow EXPORTED to DEPLOYED transition', () => {
      const result = service.validateStatusTransition(
        ConfigStatus.EXPORTED,
        ConfigStatus.DEPLOYED,
        'deploy',
      );
      expect(result.isValid).toBe(true);
    });

    it('should allow REJECTED to IN_PROGRESS transition', () => {
      const result = service.validateStatusTransition(
        ConfigStatus.REJECTED,
        ConfigStatus.IN_PROGRESS,
        'return_to_progress',
      );
      expect(result.isValid).toBe(true);
    });

    it('should reject transition from DEPLOYED to IN_PROGRESS', () => {
      const result = service.validateStatusTransition(
        ConfigStatus.DEPLOYED,
        ConfigStatus.IN_PROGRESS,
        'return_to_progress',
      );
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Invalid transition');
    });

    it('should reject transition from APPROVED to IN_PROGRESS', () => {
      const result = service.validateStatusTransition(
        ConfigStatus.APPROVED,
        ConfigStatus.IN_PROGRESS,
        'return_to_progress',
      );
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Invalid transition');
    });
  });

  describe('validateUserPermissions - comprehensive coverage', () => {
    it('should allow exporter to export in APPROVED status', () => {
      const result = service.validateUserPermissions(
        ['exporter'],
        ConfigStatus.APPROVED,
        'export',
      );
      expect(result.canExport).toBe(true);
    });

    it('should not allow editor to export', () => {
      const result = service.validateUserPermissions(
        ['editor'],
        ConfigStatus.APPROVED,
        'export',
      );
      expect(result.canExport).toBe(false);
    });

    it('should allow editor to edit in REJECTED status', () => {
      const result = service.validateUserPermissions(
        ['editor'],
        ConfigStatus.REJECTED,
        'return_to_progress',
      );
      expect(result.canEdit).toBe(true);
    });

    it('should allow editor to submit from IN_PROGRESS status', () => {
      const result = service.validateUserPermissions(
        ['editor'],
        ConfigStatus.IN_PROGRESS,
        'submit_for_approval',
      );
      expect(result.canEdit).toBe(true);
      expect(result.canSubmit).toBe(true);
    });

    it('should not allow editor to edit in UNDER_REVIEW status', () => {
      const result = service.validateUserPermissions(
        ['editor'],
        ConfigStatus.UNDER_REVIEW,
        'approve',
      );
      expect(result.canEdit).toBe(false);
    });

    it('should not allow non-publisher to deploy', () => {
      const result = service.validateUserPermissions(
        ['editor'],
        ConfigStatus.EXPORTED,
        'deploy',
      );
      expect(result.canDeploy).toBe(false);
    });
  });

  describe('canEditConfig - edge cases', () => {
    it('should allow editing in REJECTED status', () => {
      const result = service.canEditConfig(ConfigStatus.REJECTED);
      expect(result.canEdit).toBe(true);
    });

    it('should not allow editing in EXPORTED status', () => {
      const result = service.canEditConfig(ConfigStatus.EXPORTED);
      expect(result.canEdit).toBe(false);
      expect(result.message).toContain('Editing not allowed');
    });
  });
});
