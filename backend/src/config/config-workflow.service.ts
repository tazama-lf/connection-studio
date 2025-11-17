import { Injectable } from '@nestjs/common';
import {
  ConfigStatus,
  WorkflowAction,
  StatusTransitionValidation,
  WorkflowValidationResult,
} from './config.interfaces';
@Injectable()
export class ConfigWorkflowService {
  private normalizeStatus(status: string): string {
    return status;
  }
  validateStatusTransition(
    fromStatus: string,
    toStatus: string,
    _action: any,
  ): StatusTransitionValidation {
    const normalizedFromStatus = this.normalizeStatus(fromStatus);
    const normalizedToStatus = this.normalizeStatus(toStatus);
    const validTransitions: Record<string, string[]> = {
      [ConfigStatus.IN_PROGRESS]: [ConfigStatus.UNDER_REVIEW],
      [ConfigStatus.ON_HOLD]: [ConfigStatus.IN_PROGRESS],
      [ConfigStatus.UNDER_REVIEW]: [
        ConfigStatus.APPROVED,
        ConfigStatus.REJECTED,
        ConfigStatus.IN_PROGRESS,
      ],
      [ConfigStatus.APPROVED]: [ConfigStatus.EXPORTED, ConfigStatus.DEPLOYED],
      [ConfigStatus.EXPORTED]: [ConfigStatus.DEPLOYED],
      [ConfigStatus.READY_FOR_DEPLOYMENT]: [ConfigStatus.DEPLOYED],
      [ConfigStatus.DEPLOYED]: [],
      [ConfigStatus.REJECTED]: [ConfigStatus.IN_PROGRESS],
    };
    const allowedTransitions = validTransitions[normalizedFromStatus];
    if (!allowedTransitions?.includes(normalizedToStatus)) {
      return {
        isValid: false,
        currentStatus: normalizedFromStatus as any,
        targetStatus: normalizedToStatus as any,
        allowedNextStatuses: (allowedTransitions || []) as any,
        reason: `Invalid transition from ${normalizedFromStatus} to ${normalizedToStatus}`,
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
      result.canEdit = [
        ConfigStatus.IN_PROGRESS,
        ConfigStatus.REJECTED,
      ].includes(currentStatus as any);
      result.canSubmit = [ConfigStatus.IN_PROGRESS].includes(
        currentStatus as any,
      );
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
      result.canDeploy = [
        ConfigStatus.APPROVED,
        ConfigStatus.EXPORTED,
        ConfigStatus.READY_FOR_DEPLOYMENT,
      ].includes(currentStatus as any);
    }
    return result;
  }
  getTargetStatus(action: any): string {
    const actionToStatusMap: Record<string, string> = {
      submit_for_approval: ConfigStatus.UNDER_REVIEW,
      approve: ConfigStatus.APPROVED,
      reject: ConfigStatus.REJECTED,
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
          [ConfigStatus.REJECTED].includes(currentStatus as any);
        if (!canReturn) {
          return {
            canPerform: false,
            message:
              'Only editors can return rejected configurations to progress',
          };
        }
        break;
      }
      case 'export': {
        const canExport =
          userClaims.includes('exporter') &&
          [ConfigStatus.APPROVED].includes(currentStatus as any);
        if (!canExport) {
          return {
            canPerform: false,
            message:
              'Only exporters can export configurations in APPROVED status',
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
      export: 'Export',
      deploy: 'Deploy',
      return_to_progress: 'Return to Progress',
    };
    return descriptions[action] || action;
  }
}
