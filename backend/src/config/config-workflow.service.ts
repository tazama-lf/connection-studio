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
    fromStatus: ConfigStatus,
    toStatus: ConfigStatus,
    _action: WorkflowAction,
  ): StatusTransitionValidation {
    const validTransitions: Record<ConfigStatus, ConfigStatus[]> = {
      [ConfigStatus.IN_PROGRESS]: [ConfigStatus.UNDER_REVIEW],
      [ConfigStatus.UNDER_REVIEW]: [
        ConfigStatus.APPROVED,
        ConfigStatus.REJECTED,
        ConfigStatus.CHANGES_REQUESTED,
      ],
      [ConfigStatus.APPROVED]: [ConfigStatus.DEPLOYED],
      [ConfigStatus.DEPLOYED]: [],
      [ConfigStatus.REJECTED]: [ConfigStatus.IN_PROGRESS],
      [ConfigStatus.CHANGES_REQUESTED]: [
        ConfigStatus.IN_PROGRESS,
        ConfigStatus.UNDER_REVIEW,
      ],
    };

    const allowedTransitions = validTransitions[fromStatus];

    if (!allowedTransitions?.includes(toStatus)) {
      return {
        isValid: false,
        currentStatus: fromStatus,
        targetStatus: toStatus,
        allowedNextStatuses: allowedTransitions || [],
        reason: `Invalid transition from ${fromStatus} to ${toStatus}`,
      };
    }

    return {
      isValid: true,
      currentStatus: fromStatus,
      targetStatus: toStatus,
      allowedNextStatuses: allowedTransitions,
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

    const result: WorkflowValidationResult = {
      canEdit: false,
      canSubmit: false,
      canApprove: false,
      canReject: false,
      canRequestChanges: false,
      canDeploy: false,
      canReturnToProgress: false,
    };

    if (hasEditorRole) {
      // Can edit only in editable states
      result.canEdit = [
        ConfigStatus.IN_PROGRESS,
        ConfigStatus.REJECTED,
        ConfigStatus.CHANGES_REQUESTED,
      ].includes(currentStatus);

      result.canSubmit = currentStatus === ConfigStatus.IN_PROGRESS;
    }

    if (hasApproverRole) {
      const canApproverAct = currentStatus === ConfigStatus.UNDER_REVIEW;
      result.canApprove = canApproverAct;
      result.canReject = canApproverAct;
      result.canRequestChanges = canApproverAct;
    }

    if (hasPublisherRole) {
      result.canDeploy = currentStatus === ConfigStatus.APPROVED;
    }

    return result;
  }

  getTargetStatus(action: WorkflowAction): ConfigStatus {
    const actionToStatusMap: Record<WorkflowAction, ConfigStatus> = {
      submit_for_approval: ConfigStatus.UNDER_REVIEW,
      approve: ConfigStatus.APPROVED,
      reject: ConfigStatus.REJECTED,
      request_changes: ConfigStatus.CHANGES_REQUESTED,
      deploy: ConfigStatus.DEPLOYED,
      return_to_progress: ConfigStatus.IN_PROGRESS,
    };

    return actionToStatusMap[action];
  }

  canPerformAction(
    userClaims: string[],
    currentStatus: ConfigStatus,
    action: WorkflowAction,
  ): { canPerform: boolean; message?: string } {
    const permissions = this.validateUserPermissions(
      userClaims,
      currentStatus,
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
              'Only editors can submit configurations for approval from IN_PROGRESS status',
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
              'Only publishers can deploy configurations in APPROVED status',
          };
        }
        break;

      case 'return_to_progress': {
        const canReturn =
          userClaims.includes('editor') &&
          [ConfigStatus.REJECTED, ConfigStatus.CHANGES_REQUESTED].includes(
            currentStatus,
          );
        if (!canReturn) {
          return {
            canPerform: false,
            message:
              'Only editors can return rejected or change-requested configurations to progress',
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
      ConfigStatus.CHANGES_REQUESTED,
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
      deploy: 'Deploy',
      return_to_progress: 'Return to Progress',
    };

    return descriptions[action] || action;
  }
}
