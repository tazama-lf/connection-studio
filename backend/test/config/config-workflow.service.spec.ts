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

  it('should validate status transitions', () => {
    // Test valid transitions using actual WorkflowAction values
    const result1 = service.canPerformAction(['editor'], ConfigStatus.IN_PROGRESS, 'submit_for_approval');
    expect(result1.canPerform).toBe(true);

    const result2 = service.canPerformAction(['approver'], ConfigStatus.UNDER_REVIEW, 'approve');  
    expect(result2.canPerform).toBe(true);

    const result3 = service.canPerformAction(['approver'], ConfigStatus.UNDER_REVIEW, 'reject');
    expect(result3.canPerform).toBe(true);
  });

  it('should reject invalid transitions', () => {
    // Test invalid transitions 
    const result1 = service.canPerformAction(['editor'], ConfigStatus.DEPLOYED, 'submit_for_approval');
    expect(result1.canPerform).toBe(false);
    expect(result1.message).toBeDefined();
  });

  it('should validate user permissions', () => {
    // Test permission validation - editor cannot approve
    const result = service.canPerformAction(['editor'], ConfigStatus.UNDER_REVIEW, 'approve');
    expect(result.canPerform).toBe(false);
    expect(result.message).toContain('approver');
  });

  it('should check if config can be edited', () => {
    // Test editable statuses
    const editableResult = service.canEditConfig(ConfigStatus.IN_PROGRESS);
    expect(editableResult.canEdit).toBe(true);

    const rejectedResult = service.canEditConfig(ConfigStatus.REJECTED);
    expect(rejectedResult.canEdit).toBe(true);

    // Test non-editable statuses
    const deployedResult = service.canEditConfig(ConfigStatus.DEPLOYED);
    expect(deployedResult.canEdit).toBe(false);
    expect(deployedResult.message).toContain('not allowed');

    const approvedResult = service.canEditConfig(ConfigStatus.APPROVED);
    expect(approvedResult.canEdit).toBe(false);
    expect(approvedResult.message).toContain('not allowed');
  });

  it('should get action descriptions', () => {
    const description = service.getActionDescription('submit_for_approval');
    expect(description).toBeDefined();
    expect(typeof description).toBe('string');
    expect(description).toBe('Submit for Approval');
  });

  it('should handle status normalization', () => {
    // Test the normalize status functionality indirectly through validation
    const result = service.validateStatusTransition(ConfigStatus.IN_PROGRESS, ConfigStatus.UNDER_REVIEW, 'submit_for_approval');
    expect(result.isValid).toBe(true);
  });

  it('should validate workflow actions with proper error messages', () => {
    // Test insufficient permissions - viewer role does not exist
    const result1 = service.canPerformAction(['viewer'], ConfigStatus.IN_PROGRESS, 'submit_for_approval');
    expect(result1.canPerform).toBe(false);
    expect(result1.message).toContain('editor');

    // Test invalid status transition
    const result2 = service.canPerformAction(['editor'], ConfigStatus.DEPLOYED, 'submit_for_approval');
    expect(result2.canPerform).toBe(false);
    expect(result2.message).toBeDefined();
  });

  it('should handle edge cases', () => {
    // Test empty claims array
    const result1 = service.canPerformAction([], ConfigStatus.IN_PROGRESS, 'submit_for_approval');
    expect(result1.canPerform).toBe(false);

    // Test unknown action - this returns status transition error since unknown action maps to undefined status
    const result2 = service.canPerformAction(['editor'], ConfigStatus.IN_PROGRESS, 'unknown_action');
    expect(result2.canPerform).toBe(false);
    expect(result2.message).toContain('Invalid transition');
  });

  it('should validate exporter permissions', () => {
    const result = service.canPerformAction(['exporter'], ConfigStatus.APPROVED, 'export');
    expect(result.canPerform).toBe(true);

    const invalidResult = service.canPerformAction(['exporter'], ConfigStatus.IN_PROGRESS, 'export');
    expect(invalidResult.canPerform).toBe(false);
    expect(invalidResult.message).toContain('Invalid transition');
  });

  it('should validate publisher permissions', () => {
    const result = service.canPerformAction(['publisher'], ConfigStatus.EXPORTED, 'deploy');
    expect(result.canPerform).toBe(true);

    const invalidResult = service.canPerformAction(['publisher'], ConfigStatus.IN_PROGRESS, 'deploy');
    expect(invalidResult.canPerform).toBe(false);
    expect(invalidResult.message).toContain('Invalid transition');
  });
});
