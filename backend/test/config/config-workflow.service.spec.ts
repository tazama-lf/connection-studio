import { Test, TestingModule } from '@nestjs/testing';
import { ConfigWorkflowService } from '../../src/config/config-workflow.service';
import {
  ConfigStatus,
} from '../../src/config/config.interfaces';

describe('ConfigWorkflowService', () => {
  let service: ConfigWorkflowService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConfigWorkflowService],
    }).compile();

    service = module.get(ConfigWorkflowService);
  });

  it('returns valid transition when allowed', () => {
    const result = service.validateStatusTransition(
      ConfigStatus.IN_PROGRESS,
      ConfigStatus.UNDER_REVIEW,
      'submit_for_approval',
    );

    expect(result.isValid).toBe(true);
  });

  it('returns invalid transition when not allowed', () => {
    const result = service.validateStatusTransition(
      ConfigStatus.IN_PROGRESS,
      ConfigStatus.APPROVED,
      'approve',
    );

    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('Invalid transition');
  });

  it('allows editor to edit and submit IN_PROGRESS config', () => {
    const result = service.validateUserPermissions(
      ['editor'],
      ConfigStatus.IN_PROGRESS,
      'submit_for_approval',
    );

    expect(result.canEdit).toBe(true);
    expect(result.canSubmit).toBe(true);
  });

  it('allows approver actions in UNDER_REVIEW', () => {
    const result = service.validateUserPermissions(
      ['approver'],
      ConfigStatus.UNDER_REVIEW,
      'approve',
    );

    expect(result.canApprove).toBe(true);
    expect(result.canReject).toBe(true);
  });

  it('allows exporter to export APPROVED config', () => {
    const result = service.validateUserPermissions(
      ['exporter'],
      ConfigStatus.APPROVED,
      'export',
    );

    expect(result.canExport).toBe(true);
  });

  it('allows publisher to deploy APPROVED config', () => {
    const result = service.validateUserPermissions(
      ['publisher'],
      ConfigStatus.APPROVED,
      'deploy',
    );

    expect(result.canDeploy).toBe(true);
  });

  it('returns correct target status for actions', () => {
    expect(service.getTargetStatus('approve')).toBe(ConfigStatus.APPROVED);
    expect(service.getTargetStatus('reject')).toBe(ConfigStatus.REJECTED);
    expect(service.getTargetStatus('deploy')).toBe(ConfigStatus.DEPLOYED);
  });

  it('allows editor to submit config for approval', () => {
    const result = service.canPerformAction(
      ['editor'],
      ConfigStatus.IN_PROGRESS,
      'submit_for_approval',
    );

    expect(result.canPerform).toBe(true);
  });

  it('allows approver to approve UNDER_REVIEW config', () => {
    const result = service.canPerformAction(
      ['approver'],
      ConfigStatus.UNDER_REVIEW,
      'approve',
    );

    expect(result.canPerform).toBe(true);
  });

  it('allows exporter to export APPROVED config', () => {
    const result = service.canPerformAction(
      ['exporter'],
      ConfigStatus.APPROVED,
      'export',
    );

    expect(result.canPerform).toBe(true);
  });

  it('allows publisher to deploy EXPORTED config', () => {
    const result = service.canPerformAction(
      ['publisher'],
      ConfigStatus.EXPORTED,
      'deploy',
    );

    expect(result.canPerform).toBe(true);
  });

  it('blocks submit when user is not editor', () => {
    const result = service.canPerformAction(
      ['approver'],
      ConfigStatus.IN_PROGRESS,
      'submit_for_approval',
    );

    expect(result.canPerform).toBe(false);
    expect(result.message).toContain('Only editors');
  });

  it('blocks approve when user is not approver', () => {
    const result = service.canPerformAction(
      ['editor'],
      ConfigStatus.UNDER_REVIEW,
      'approve',
    );

    expect(result.canPerform).toBe(false);
    expect(result.message).toContain('Only approvers');
  });

  it('blocks reject when user is not approver', () => {
    const result = service.canPerformAction(
      ['editor'],
      ConfigStatus.UNDER_REVIEW,
      'reject',
    );

    expect(result.canPerform).toBe(false);
    expect(result.message).toBe(
      'Only approvers can reject configurations in UNDER_REVIEW status',
    );
  });

  it('blocks export when user is not exporter', () => {
    const result = service.canPerformAction(
      ['editor'],
      ConfigStatus.APPROVED,
      'export',
    );

    expect(result.canPerform).toBe(false);
    expect(result.message).toBe(
      'Only exporters can export configurations in APPROVED status',
    );
  });

  it('blocks deploy when user is not publisher', () => {
    const result = service.canPerformAction(
      ['editor'],
      ConfigStatus.EXPORTED,
      'deploy',
    );

    expect(result.canPerform).toBe(false);
    expect(result.message).toBe(
      'Only publishers can deploy configurations in EXPORTED status',
    );
  });

  it('blocks return_to_progress when user is not editor or not rejected', () => {
    const result = service.canPerformAction(
      ['approver'],
      ConfigStatus.REJECTED,
      'return_to_progress',
    );

    expect(result.canPerform).toBe(false);
    expect(result.message).toBe(
      'Only editors can return rejected configurations to progress',
    );
  });

  it('returns invalid transition for unknown action', () => {
    const result = service.canPerformAction(
      ['editor'],
      ConfigStatus.IN_PROGRESS,
      'unknown_action',
    );

    expect(result.canPerform).toBe(false);
    expect(result.message).toContain('Invalid transition');
  });

  it('allows editing for IN_PROGRESS config', () => {
    const result = service.canEditConfig(ConfigStatus.IN_PROGRESS);
    expect(result.canEdit).toBe(true);
  });

  it('blocks editing for DEPLOYED config', () => {
    const result = service.canEditConfig(ConfigStatus.DEPLOYED);
    expect(result.canEdit).toBe(false);
    expect(result.message).toContain('Editing not allowed');
  });

  it('returns correct action descriptions', () => {
    expect(service.getActionDescription('approve')).toBe('Approve');
    expect(service.getActionDescription('export')).toBe('Export');
    expect(service.getActionDescription('return_to_progress')).toBe(
      'Return to Progress',
    );
  });
});
