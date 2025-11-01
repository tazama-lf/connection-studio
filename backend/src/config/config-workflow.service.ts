import { Injectable } from '@nestjs/common';
import {
  ConfigStatus,
  WorkflowAction,
  StatusTransitionValidation,
  WorkflowValidationResult,
} from './config.interfaces';

@Injectable()
export class ConfigWorkflowService {
  validateStatusTransition(
    fromStatus: string,
    toStatus: string,
    _action: any,
  ): StatusTransitionValidation {
    const validTransitions: Record<string, string[]> = {
      [ConfigStatus.IN_PROGRESS]: [ConfigStatus.UNDER_REVIEW],
      [ConfigStatus.SUSPENDED]: [ConfigStatus.IN_PROGRESS],
      [ConfigStatus.UNDER_REVIEW]: [
        ConfigStatus.APPROVED,
        ConfigStatus.REJECTED,
        ConfigStatus.IN_PROGRESS, // For changes requested, return to in progress
      ],
      [ConfigStatus.APPROVED]: [ConfigStatus.EXPORTED],
      [ConfigStatus.EXPORTED]: [ConfigStatus.DEPLOYED],
      [ConfigStatus.READY_FOR_DEPLOYMENT]: [ConfigStatus.DEPLOYED],
      [ConfigStatus.DEPLOYED]: [],
      [ConfigStatus.REJECTED]: [ConfigStatus.IN_PROGRESS],
    };

    const allowedTransitions = validTransitions[fromStatus];

    if (!allowedTransitions?.includes(toStatus)) {
      return {
        isValid: false,
        currentStatus: fromStatus as any,
        targetStatus: toStatus as any,
        allowedNextStatuses: (allowedTransitions || []) as any,
        reason: `Invalid transition from ${fromStatus} to ${toStatus}`,
      };
    }

    return {
      isValid: true,
      currentStatus: fromStatus as any,
      targetStatus: toStatus as any,
      allowedNextStatuses: allowedTransitions as any,
    };
  }

  validateUserPermissions(
    userClaims: string[],
    currentStatus: ConfigStatus,
    _action: WorkflowAction,
  ): WorkflowValidationResult {
    const hasEditorRole = userClaims.includes('editor');
    const hasApproverRole = userClaims.includes('approver');
    const hasPublisherRole = userClaims.includes('publisher');
    const hasExporterRole = userClaims.includes('exporter');

    const result: WorkflowValidationResult = {
  canEdit: false,
  canSubmit: false,
  canApprove: false,
  canReject: false,
  canRequestChanges: false,
  canExport: false,
  canDeploy: false,
  canReturnToProgress: false,
    };

    if (hasEditorRole) {
      // Can edit only in editable states (IN_PROGRESS or REJECTED with changes)
      result.canEdit = [
        ConfigStatus.IN_PROGRESS,
        ConfigStatus.REJECTED,
      ].includes(currentStatus as any);

      result.canSubmit = [
        ConfigStatus.IN_PROGRESS,
      ].includes(currentStatus as any);
    }

    if (hasApproverRole) {
      const canApproverAct = currentStatus === ConfigStatus.UNDER_REVIEW;
      result.canApprove = canApproverAct;
      result.canReject = canApproverAct;
      result.canRequestChanges = canApproverAct;
    }
    if (hasExporterRole) {
      result.canExport = currentStatus === ConfigStatus.APPROVED;
    }

    if (hasPublisherRole) {
      result.canDeploy = currentStatus === ConfigStatus.EXPORTED;
    }

    return result;
  }

  getTargetStatus(action: any): string {
    const actionToStatusMap: Record<string, string> = {
  submit_for_approval: ConfigStatus.UNDER_REVIEW,
  approve: ConfigStatus.APPROVED,
  reject: ConfigStatus.REJECTED,
  request_changes: ConfigStatus.IN_PROGRESS, // Return to in progress for edits
  export: ConfigStatus.EXPORTED,
  deploy: ConfigStatus.DEPLOYED,
  return_to_progress: ConfigStatus.IN_PROGRESS,
    };

    return actionToStatusMap[action];
  }

  canPerformAction(
    userClaims: string[],
    currentStatus: ConfigStatus | string,
    action: any,
  ): { canPerform: boolean; message?: string } {
    const permissions = this.validateUserPermissions(
      userClaims,
      currentStatus as ConfigStatus,
      action,
    );
    const targetStatus = this.getTargetStatus(action);
    const transition = this.validateStatusTransition(
      currentStatus,
      targetStatus,
      action,
    );

    if (!transition.isValid) {
      return { canPerform: false, message: transition.reason };
    }

    switch (action) {
      case 'submit_for_approval':
        if (!permissions.canSubmit) {
          return {
            canPerform: false,
            message:
              'Only editors can submit configurations for approval from IN_PROGRESS or CHANGES_REQUESTED status',
          };
        }
        break;

      case 'approve':
        if (!permissions.canApprove) {
          return {
            canPerform: false,
            message:
              'Only approvers can approve configurations in UNDER_REVIEW status',
          };
        }
        break;

      case 'reject':
        if (!permissions.canReject) {
          return {
            canPerform: false,
            message:
              'Only approvers can reject configurations in UNDER_REVIEW status',
          };
        }
        break;

      case 'request_changes':
        if (!permissions.canRequestChanges) {
          return {
            canPerform: false,
            message:
              'Only approvers can request changes for configurations in UNDER_REVIEW status',
          };
        }
        break;

      case 'deploy':
        if (!permissions.canDeploy) {
          return {
            canPerform: false,
            message:
              'Only publishers can deploy configurations in EXPORTED status',
          };
        }
        break;

      case 'return_to_progress': {
        const canReturn =
          userClaims.includes('editor') &&
          [ConfigStatus.REJECTED].includes(
            currentStatus as any,
          );
        if (!canReturn) {
          return {
            canPerform: false,
            message:
              'Only editors can return rejected configurations to progress',
          };
        }
        break;
      }

      default:
        return { canPerform: false, message: 'Unknown action' };
    }

    return { canPerform: true };
  }

  canEditConfig(currentStatus: ConfigStatus): {
    canEdit: boolean;
    message?: string;
  } {
    const editableStatuses = [
      ConfigStatus.IN_PROGRESS,
      ConfigStatus.REJECTED, // Can edit after rejection
    ];

    if (!editableStatuses.includes(currentStatus)) {
      return {
        canEdit: false,
        message: 'Editing not allowed. Please clone to create a new version.',
      };
    }

    return { canEdit: true };
  }

  getActionDescription(action: WorkflowAction): string {
    const descriptions: Record<WorkflowAction, string> = {
  submit_for_approval: 'Submit for Approval',
  approve: 'Approve',
  reject: 'Reject',
  request_changes: 'Request Changes',
  export: 'Export',
  deploy: 'Deploy',
  return_to_progress: 'Return to Progress',
    };

    return descriptions[action] || action;
  }
}
