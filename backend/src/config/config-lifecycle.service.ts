import {
  Injectable,
  Logger,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigRepository } from './config.repository';
import { FlowableService } from '../flowable/flowable.service';
import { AuditService } from '../audit/audit.service';
import {
  Config,
  ConfigStatus,
  ConfigLifecycleState,
  ConfigLifecycleInfo,
  ConfigResponseDto,
} from './config.interfaces';

@Injectable()
export class ConfigLifecycleService {
  private readonly logger = new Logger(ConfigLifecycleService.name);

  constructor(
    private readonly configRepository: ConfigRepository,
    private readonly flowableService: FlowableService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get comprehensive lifecycle state for a specific config version/type
   */
  async getConfigLifecycleState(
    version: string,
    transactionType: string,
    tenantId: string,
  ): Promise<ConfigLifecycleInfo> {
    this.logger.log(
      `Checking lifecycle state for ${version}:${transactionType} in tenant ${tenantId}`,
    );

    // Check main database for approved/deployed configs
    const mainConfig =
      await this.configRepository.findConfigByVersionAndTransactionType(
        version,
        transactionType,
        tenantId,
      );

    // Check Flowable for active processes
    const activeProcess = await this.flowableService.getActiveProcessForConfig(
      version,
      transactionType,
      tenantId,
    );

    // Determine lifecycle state
    if (mainConfig && activeProcess) {
      // This should not happen - log error
      this.logger.error(
        `CONFLICT: Config ${version}:${transactionType} exists in both main DB and active process`,
      );
      throw new Error(
        'Data consistency error: Config exists in multiple states',
      );
    }

    if (mainConfig) {
      return this.buildLifecycleInfoFromMainConfig(mainConfig);
    }

    if (activeProcess) {
      return this.buildLifecycleInfoFromProcess(
        activeProcess,
        version,
        transactionType,
        tenantId,
      );
    }

    // No conflicts - can create new config
    return {
      version,
      transactionType,
      tenantId,
      state: ConfigLifecycleState.EDITABLE,
      status: ConfigStatus.DRAFT,
      isEditable: true,
      canClone: false,
      isApproved: false,
    };
  }

  /**
   * Validate if config can be edited based on lifecycle rules
   */
  async validateEditPermission(
    configId: number,
    tenantId: string,
    userId: string,
  ): Promise<void> {
    const config = await this.configRepository.findConfigById(
      configId,
      tenantId,
    );

    if (!config) {
      throw new Error(`Config ${configId} not found`);
    }

    // ✅ APPROVAL LOCK: Block editing of approved configs
    if (
      config.isApproved ||
      config.status === ConfigStatus.APPROVED ||
      config.status === ConfigStatus.DEPLOYED
    ) {
      this.logger.warn(
        `Edit blocked: Config ${configId} is approved/deployed (Status: ${config.status})`,
      );

      await this.auditService.logAction({
        entityType: 'CONFIG',
        action: 'EDIT_BLOCKED',
        actor: userId,
        tenantId,
        endpointName: config.endpointPath,
        details: `Edit attempt blocked - config is ${config.status}`,
      });

      throw new ConflictException(
        'Cannot edit an approved configuration. Please clone to create a new version.',
      );
    }

    // ✅ EDIT PERMISSIONS: Allow editing in specific states
    const editableStates = [
      ConfigStatus.DRAFT,
      ConfigStatus.REJECTED,
      ConfigStatus.CHANGES_REQUESTED,
      ConfigStatus.IN_PROGRESS,
    ];

    if (!config.status || !editableStates.includes(config.status)) {
      throw new ForbiddenException(
        `Config cannot be edited in ${config.status || 'unknown'} state. Editable states: ${editableStates.join(', ')}`,
      );
    }

    this.logger.log(
      `Edit permission granted for config ${configId} in ${config.status} state`,
    );
  }

  /**
   * Handle workflow reversal when config is rejected or changes requested
   */
  async handleWorkflowReversal(
    processInstanceId: string,
    action: 'reject' | 'request_changes',
    reason: string,
    actorId: string,
    tenantId: string,
  ): Promise<ConfigResponseDto> {
    this.logger.log(
      `Handling workflow reversal: ${action} for process ${processInstanceId}`,
    );

    try {
      // Get config data from process
      const configData =
        await this.flowableService.getConfigFromProcess(processInstanceId);

      if (!configData) {
        throw new Error(
          `Config data not found for process ${processInstanceId}`,
        );
      }

      // ✅ WORKFLOW REVERSAL: Roll back to Editor task
      await this.flowableService.rollbackToEditorTask(
        processInstanceId,
        action === 'reject'
          ? ConfigStatus.REJECTED
          : ConfigStatus.CHANGES_REQUESTED,
        reason,
        actorId,
      );

      // ✅ AUDIT TRAIL: Log the rollback
      await this.auditService.logAction({
        entityType: 'CONFIG',
        action:
          action === 'reject'
            ? 'WORKFLOW_REJECTED'
            : 'WORKFLOW_CHANGES_REQUESTED',
        actor: actorId,
        tenantId,
        endpointName: configData.endpointPath,
        details: `Process ${processInstanceId} rolled back to editor. Reason: ${reason}`,
      });

      return {
        success: true,
        message: `Config ${action === 'reject' ? 'rejected' : 'sent back for changes'}. Editor can now modify and resubmit.`,
        processInstanceId,
        lifecycleInfo: {
          version: configData.version,
          transactionType: configData.transactionType,
          tenantId,
          state: ConfigLifecycleState.REJECTED_EDITABLE,
          status:
            action === 'reject'
              ? ConfigStatus.REJECTED
              : ConfigStatus.CHANGES_REQUESTED,
          isEditable: true,
          canClone: false,
          isApproved: false,
          processInstanceId,
          rejectionReason: reason,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to handle workflow reversal: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle config approval and lifecycle cleanup
   */
  async handleConfigApproval(
    processInstanceId: string,
    approverId: string,
    remarks: string,
    tenantId: string,
  ): Promise<ConfigResponseDto> {
    this.logger.log(
      `Handling config approval for process ${processInstanceId}`,
    );

    try {
      // Get config data from Flowable process
      const configData =
        await this.flowableService.getConfigFromProcess(processInstanceId);

      if (!configData) {
        throw new Error(
          `Config data not found for process ${processInstanceId}`,
        );
      }

      // ✅ LIFECYCLE CLEANUP: Move to main configs table
      const approvedConfig: Omit<Config, 'id' | 'createdAt' | 'updatedAt'> = {
        msgFam: configData.msgFam,
        transactionType: configData.transactionType,
        endpointPath: configData.endpointPath,
        version: configData.version,
        contentType: configData.contentType,
        schema: configData.schema,
        mapping: configData.mapping,
        functions: configData.functions,
        status: ConfigStatus.APPROVED,
        isApproved: true,
        processInstanceId,
        tenantId,
        createdBy: configData.createdBy,
        approvedBy: approverId,
        approvedAt: new Date().toISOString(),
      };

      const liveConfigId =
        await this.configRepository.createConfig(approvedConfig);

      // ✅ CLEANUP: Archive Flowable process
      await this.flowableService.archiveCompletedProcess(processInstanceId);

      // ✅ CLEANUP: Clear temporary artifacts from cache
      await this.clearTemporaryArtifacts(processInstanceId, tenantId);

      // ✅ AUDIT TRAIL: Log approval and deployment
      await this.auditService.logAction({
        entityType: 'CONFIG',
        action: 'CONFIG_APPROVED',
        actor: approverId,
        tenantId,
        endpointName: configData.endpointPath,
        details: `Process ${processInstanceId} approved → Live Config ${liveConfigId}. Remarks: ${remarks}`,
      });

      this.logger.log(
        `✅ Config approved and moved to main table: Process ${processInstanceId} → Config ${liveConfigId}`,
      );

      return {
        success: true,
        message: 'Config approved and moved to main configuration table',
        config: { ...approvedConfig, id: liveConfigId } as Config,
        lifecycleInfo: {
          configId: liveConfigId,
          version: configData.version,
          transactionType: configData.transactionType,
          tenantId,
          state: ConfigLifecycleState.APPROVED_LOCKED,
          status: ConfigStatus.APPROVED,
          isEditable: false,
          canClone: true,
          isApproved: true,
          approvedAt: approvedConfig.approvedAt,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to handle config approval: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Check for version conflicts before creating new config
   */
  async checkVersionConflicts(
    version: string,
    transactionType: string,
    tenantId: string,
  ): Promise<ConfigResponseDto | null> {
    const lifecycleInfo = await this.getConfigLifecycleState(
      version,
      transactionType,
      tenantId,
    );

    if (lifecycleInfo.state === ConfigLifecycleState.EDITABLE) {
      return null; // No conflicts
    }

    const conflictMessages = {
      [ConfigLifecycleState.APPROVED_LOCKED]:
        'Config version already approved and deployed',
      [ConfigLifecycleState.DEPLOYED_LOCKED]:
        'Config version already deployed to production',
      [ConfigLifecycleState.IN_APPROVAL]:
        'Config version is currently in approval process',
      [ConfigLifecycleState.REJECTED_EDITABLE]:
        'Config version was rejected but can be edited',
    };

    const suggestedActions = {
      [ConfigLifecycleState.APPROVED_LOCKED]: 'clone',
      [ConfigLifecycleState.DEPLOYED_LOCKED]: 'clone',
      [ConfigLifecycleState.IN_APPROVAL]: 'edit_process',
      [ConfigLifecycleState.REJECTED_EDITABLE]: 'edit_process',
    };

    return {
      success: false,
      message: `${conflictMessages[lifecycleInfo.state]}. ${
        suggestedActions[lifecycleInfo.state] === 'clone'
          ? 'Please clone to create a new version.'
          : 'You can edit the existing process.'
      }`,
      lifecycleInfo,
      conflictInfo: {
        hasConflict: true,
        conflictType: lifecycleInfo.configId
          ? 'approved_config'
          : 'active_process',
        existingConfigId: lifecycleInfo.configId,
        existingProcessId: lifecycleInfo.processInstanceId,
        suggestedAction: suggestedActions[lifecycleInfo.state] as any,
      },
    };
  }

  /**
   * Private helper methods
   */
  private buildLifecycleInfoFromMainConfig(
    config: Config,
  ): ConfigLifecycleInfo {
    const isDeployed = config.status === ConfigStatus.DEPLOYED;

    return {
      configId: config.id,
      version: config.version,
      transactionType: config.transactionType,
      tenantId: config.tenantId || 'default',
      state: isDeployed
        ? ConfigLifecycleState.DEPLOYED_LOCKED
        : ConfigLifecycleState.APPROVED_LOCKED,
      status: config.status || ConfigStatus.APPROVED,
      isEditable: false,
      canClone: true,
      isApproved: true,
      approvedAt: config.approvedAt,
      deployedAt: config.deployedAt,
      lastModified: config.updatedAt,
    };
  }

  private buildLifecycleInfoFromProcess(
    process: any,
    version: string,
    transactionType: string,
    tenantId: string,
  ): ConfigLifecycleInfo {
    const variables = process.variables || {};
    const status = variables.status || ConfigStatus.IN_PROGRESS;

    return {
      version,
      transactionType,
      tenantId,
      state:
        status === ConfigStatus.REJECTED ||
        status === ConfigStatus.CHANGES_REQUESTED
          ? ConfigLifecycleState.REJECTED_EDITABLE
          : ConfigLifecycleState.IN_APPROVAL,
      status,
      isEditable:
        status === ConfigStatus.REJECTED ||
        status === ConfigStatus.CHANGES_REQUESTED ||
        status === ConfigStatus.DRAFT,
      canClone: false,
      isApproved: false,
      processInstanceId: process.id,
      currentTask: process.currentTask,
      assignedTo: process.assignee,
      rejectionReason: variables.rejectionReason,
    };
  }

  private async clearTemporaryArtifacts(
    processInstanceId: string,
    tenantId: string,
  ): Promise<void> {
    try {
      // Clear validation artifacts and cached drafts from Valkey/Redis
      // This would be implemented based on your caching strategy
      this.logger.log(
        `Clearing temporary artifacts for process ${processInstanceId}`,
      );

      // Example cleanup operations:
      // await this.cacheService.delete(`draft:${processInstanceId}`);
      // await this.cacheService.delete(`validation:${processInstanceId}`);
      // await this.cacheService.delete(`temp_mappings:${processInstanceId}`);
    } catch (error) {
      this.logger.warn(`Failed to clear temporary artifacts: ${error.message}`);
      // Don't fail the approval process for cleanup issues
    }
  }
}
