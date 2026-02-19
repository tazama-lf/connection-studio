import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { ConfigRepository } from './config.repository';
import { JSONSchema } from '@tazama-lf/tcs-lib';
import { NotifyService } from '../notify/notify.service';
import { NotificationService } from '../notification/notification.service';
import { ConfigWorkflowService } from './config-workflow.service';
import { ConfigUtilsService } from './config-utils.service';
import { SftpService } from '../sftp/sftp.service';
import { RbacService } from '../utils/rbac/rbacHelper';
import {
  Config,
  CreateConfigDto,
  ConfigResponseDto,
  ContentType,
  ConfigStatus,
  WorkflowAction,
} from './config.interfaces';
import { WorkflowActionDto, SftpConfigDataDto } from './dto';
import { EventType } from '../enums/events.enum';
import { AuthenticatedUser } from '../auth/auth.types';
import { AuditLogger } from '@tazama-lf/frms-coe-lib';

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);
  private readonly rbacService = new RbacService();

  constructor(
    private readonly configRepository: ConfigRepository,
    private readonly workflowService: ConfigWorkflowService,
    private readonly configUtils: ConfigUtilsService,
    private readonly sftpService: SftpService,
    private readonly notifyService: NotifyService,
    private readonly notificationService: NotificationService,
    @Inject('AUDIT_LOGGER')
    private readonly auditLoggerService: AuditLogger,
  ) {}

  private logAudit(
    eventType: string,
    user:
      | AuthenticatedUser
      | {
          userId: string;
          actorRole?: string;
          actorName?: string;
          actorEmail?: string;
          sourceIP?: string;
          tenantId: string;
        },
    description: string,
    resourceId: string,
    status: 'success' | 'failure',
    outcome: Record<string, unknown>,
  ): void {
    this.auditLoggerService.log({
      eventType,
      actorId: user.userId,
      actorRole: user.actorRole ?? 'system',
      actorName: user.actorName ?? 'System',
      actorEmail: user.actorEmail ?? 'N/A',
      description,
      sourceIp: user.sourceIP ?? 'N/A',
      status,
      resourceType: 'Config',
      resourceId,
      outcome,
      tenantId: user.tenantId,
    });
  }

  private async getConfigOrThrow(
    id: number,
    tenantId: string,
    token: string,
  ): Promise<Config> {
    const config = await this.configRepository.findConfigById(
      id,
      tenantId,
      token,
    );
    if (!config) {
      throw new NotFoundException(`Config with ID ${id} not found`);
    }
    return config;
  }

  async updateConfigStatus(
    id: number,
    status: string,
    user: AuthenticatedUser,
    token: string,
  ): Promise<ConfigResponseDto> {
    try {
      const config = await this.getConfigOrThrow(id, user.tenantId, token);

      if (!config.status) {
        throw new BadRequestException('Config status is not set');
      }
      const userRole = user.actorRole.toLowerCase() as 'editor' | 'approver' | 'publisher' | 'exporter';
      // RBAC Tier 2: Check if role can act on current status
      const tier2Check = this.rbacService.checkTier2({
        role: userRole,
        endpointKey: 'Patch update/status/:id',
        currentStatus: config.status,
      });

      if (!tier2Check.allowed) {
        throw new ForbiddenException(tier2Check.reason ?? 'Permission denied');
      }

      // RBAC Tier 3: Check if this status transition is allowed
      const tier3Check = this.rbacService.checkTier3({
        role: userRole,
        endpointKey: 'Patch update/status/:id',
        currentStatus: config.status,
        targetStatus: status,
      });

      if (!tier3Check.allowed) {
        throw new ForbiddenException(tier3Check.reason ?? 'Status transition not allowed');
      }

      // Perform the update
      await this.configRepository.updateConfigStatus(id, status, token);

      this.logAudit(
        'Config status updated',
        user,
        `Config ${id} status updated to ${status}`,
        String(id),
        'success',
        { success: true, newStatus: status },
      );

      return {
        success: true,
        message: `Config status updated to ${status}`,
      };
    } catch (error) {
      this.logAudit(
        'Config status update failed',
        user,
        `Failed to update config ${id} status to ${status}: ${error.message}`,
        String(id),
        'failure',
        { success: false, error: error.message },
      );
      throw error;
    }
  }

  private validateWorkflowAction(
    userClaims: string[],
    currentStatus: ConfigStatus,
    action: WorkflowAction,
  ): void {
    const validation = this.workflowService.canPerformAction(
      userClaims,
      currentStatus,
      action,
    );
    if (!validation.canPerform) {
      throw new ForbiddenException(validation.message);
    }
  }

  // ======================== CRUD OPERATIONS ========================

  async createConfig(
    dto: CreateConfigDto,
    user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    const { tenantId, userId, token } = {
      tenantId: user.tenantId,
      userId: user.userId,
      token: user.token.tokenString,
    };
    try {
      const { version } = dto;
      const msgFam = dto.msgFam ?? 'unknown';
      const existingConfig =
        await this.configRepository.findConfigByMsgFamVersionAndTransactionType(
          msgFam,
          version,
          dto.transactionType,
          tenantId,
          token,
        );
      if (existingConfig) {
        this.logger.warn(
          `Duplicate config found for msgFam: ${msgFam}, transactionType: ${dto.transactionType}, version: ${version}, tenantId: ${tenantId}`,
        );
        return {
          success: false,
          message: this.configUtils.buildDuplicateConfigMessage(
            msgFam,
            dto.transactionType,
            version,
          ),
        };
      }

      const endpointPath = this.configUtils.generateEndpointPath(
        tenantId,
        version,
        dto.transactionType,
        dto.msgFam,
      );

      const configData: Omit<Config, 'id' | 'createdAt' | 'updatedAt'> = {
        msgFam: dto.msgFam ?? '',
        transactionType: dto.transactionType,
        endpointPath,
        version,
        contentType: dto.contentType ?? ContentType.JSON,
        payload: dto.payload,
        schema: dto.schema as unknown as JSONSchema,
        mapping: dto.mapping,
        functions: dto.functions,
        status: ConfigStatus.IN_PROGRESS,
        tenantId,
        createdBy: userId,
      };

      const configId = await this.configRepository.createConfig(
        configData,
        token,
      );

      const config = await this.configRepository.findConfigById(
        configId,
        tenantId,
        token,
      );
      if (!config) {
        throw new NotFoundException(
          `Config ${configId} was created but could not be retrieved`,
        );
      }

      this.logAudit(
        'Config created',
        user,
        `Config created for ${dto.transactionType} v${dto.version}`,
        String(configId),
        'success',
        { success: true, configId },
      );

      return {
        success: true,
        message: 'Config created successfully',
        config,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create config: ${error.message}`,
        error.stack,
      );

      const msgFam = dto.msgFam ?? 'unknown';
      const { transactionType } = dto;
      const { version } = dto;

      const userMessage = this.configUtils.buildUserErrorMessage(
        error,
        msgFam,
        transactionType,
        version,
      );

      this.logAudit(
        'Config creation failed',
        user,
        `Failed to create config for ${transactionType} v${version}: ${error.message}`,
        'N/A',
        'failure',
        { success: false, error: error.message },
      );

      return {
        success: false,
        message: userMessage,
      };
    }
  }

  async workflow(
    id: number,
    user: AuthenticatedUser,
    token: string,
  ): Promise<ConfigResponseDto> {
    try {
      await this.getConfigOrThrow(id, user.tenantId, token);

      const updatedConfig = await this.configRepository.getupdateConfigByStatus(
        id,
        ConfigStatus.UNDER_REVIEW,
        token,
      );

      if (updatedConfig) {
        const config = updatedConfig;
        await this.notificationService.sendWorkflowNotification(
          EventType.EditorSubmit,
          user,
          config,
          token,
        );
      }

      this.logAudit(
        'Config submitted for review',
        user,
        `Config ${id} submitted for approval`,
        String(id),
        'success',
        { success: true, newStatus: ConfigStatus.UNDER_REVIEW },
      );

      return {
        success: true,
        message: `Configuration ${id} submitted for approval successfully`,
      };
    } catch (error) {
      this.logAudit(
        'Config submission failed',
        user,
        `Failed to submit config ${id} for approval: ${error.message}`,
        String(id),
        'failure',
        { success: false, error: error.message },
      );
      throw error;
    }
  }

  async handleWorkflowAction(
    id: number,
    actionDto: WorkflowActionDto,
    user: AuthenticatedUser,
    token: string,
  ): Promise<ConfigResponseDto> {
    const { action } = actionDto;
    
    const config = await this.getConfigOrThrow(id, user.tenantId, token);
    
    if (!config.status) {
      throw new BadRequestException(`Config ${id} has no status defined`);
    }

    const userRole = user.actorRole?.toLowerCase();
    if (
      !userRole ||
      !['editor', 'approver', 'publisher', 'exporter'].includes(userRole)
    ) {
      throw new ForbiddenException('Invalid user role');
    }

    const typedRole = userRole as 'editor' | 'approver' | 'publisher' | 'exporter';
    
    const actionStatusMap: Record<string, string> = {
      submit: ConfigStatus.UNDER_REVIEW,
      approve: ConfigStatus.APPROVED,
      reject: ConfigStatus.REJECTED,
      export: ConfigStatus.EXPORTED,
      deploy: ConfigStatus.DEPLOYED,
    };

    const targetStatus = actionStatusMap[action];
    if (!targetStatus) {
      throw new BadRequestException(`Unknown workflow action: ${action}`);
    }

    const tier2Check = this.rbacService.checkTier2({
      role: typedRole,
      endpointKey: 'Post :id/workflow',
      currentStatus: config.status,
    });

    if (!tier2Check.allowed) {
      throw new ForbiddenException(
        tier2Check.reason ?? `Role "${userRole}" cannot act on config in status "${config.status}"`,
      );
    }

    const tier3Check = this.rbacService.checkTier3({
      role: typedRole,
      endpointKey: 'Post :id/workflow',
      currentStatus: config.status,
      targetStatus,
    });

    if (!tier3Check.allowed) {
      throw new ForbiddenException(
        tier3Check.reason ??
        `Role "${userRole}" cannot transition from "${config.status}" to "${targetStatus}"`,
      );
    }

    switch (action) {
      case 'submit': {
        try {
          const submitDto = actionDto.data;
          const updatedConfig =
            await this.configRepository.getupdateConfigByStatus(
              id,
              ConfigStatus.UNDER_REVIEW,
              token,
            );

          if (updatedConfig) {
            const config = updatedConfig;
            await this.notificationService.sendWorkflowNotification(
              EventType.EditorSubmit,
              user,
              config,
              token,
              submitDto.comment,
            );
          }

          this.logAudit(
            'Config submitted for review',
            user,
            `Config ${id} submitted for approval. Comment: ${submitDto.comment ?? 'none'}`,
            String(id),
            'success',
            {
              success: true,
              newStatus: ConfigStatus.UNDER_REVIEW,
              comment: submitDto.comment,
            },
          );

          return {
            success: true,
            message: `Configuration ${id} submitted for approval successfully`,
          };
        } catch (error) {
          this.logAudit(
            'Config submission failed',
            user,
            `Failed to submit config ${id} for approval: ${error.message}`,
            String(id),
            'failure',
            { success: false, error: error.message },
          );
          throw error;
        }
      }

      case 'approve': {
        try {
          const approvalDto = actionDto.data;
          const updatedConfig =
            await this.configRepository.getupdateConfigByStatus(
              id,
              ConfigStatus.APPROVED,
              token,
              approvalDto.comment,
            );

          if (updatedConfig) {
            const config = updatedConfig;

            const { transactionType } = config;

            if (transactionType) {
              await this.configRepository.createTransactionTypeTable(
                transactionType,
                token,
              );
            }

            const functions = config.functions as unknown as Array<{
              functionName: string;
              tableName?: string;
            }>;

            if (Array.isArray(functions)) {
              const datamodelFunctions = functions.filter(
                (fn: { functionName: string; tableName?: string }) =>
                  fn.functionName === 'addDataModelTable',
              );

              const tableCreationPromises = datamodelFunctions.map(
                async (datamodelFn: {
                  functionName: string;
                  tableName?: string;
                }) => {
                  if (datamodelFn.tableName) {
                    await this.configRepository.createTazamaDataModelTable(
                      datamodelFn.tableName,
                      token,
                    );
                  } else {
                    this.logger.warn(
                      'Skipping addDataModelTable function without tableName',
                    );
                  }
                },
              );

              await Promise.all(tableCreationPromises);
            }

            await this.notificationService.sendWorkflowNotification(
              EventType.ApproverApprove,
              user,
              config,
              token,
              approvalDto.comment,
            );
          }

          this.logAudit(
            'Config approved',
            user,
            `Config ${id} approved. Comment: ${approvalDto.comment ?? 'none'}`,
            String(id),
            'success',
            {
              success: true,
              newStatus: ConfigStatus.APPROVED,
              comment: approvalDto.comment,
            },
          );

          return {
            success: true,
            message: `Configuration ${id} has been approved successfully`,
          };
        } catch (error) {
          this.logAudit(
            'Config approval failed',
            user,
            `Failed to approve config ${id}: ${error.message}`,
            String(id),
            'failure',
            { success: false, error: error.message },
          );
          throw error;
        }
      }

      case 'reject': {
        try {
          const rejectionDto = actionDto.data;

          const updatedConfig =
            await this.configRepository.getupdateConfigByStatus(
              id,
              ConfigStatus.REJECTED,
              token,
              rejectionDto.comment,
            );

          if (updatedConfig) {
            const config = updatedConfig;
            await this.notificationService.sendWorkflowNotification(
              EventType.ApproverReject,
              user,
              config,
              token,
              rejectionDto.comment,
            );
          }

          this.logAudit(
            'Config rejected',
            user,
            `Config ${id} rejected. Comment: ${rejectionDto.comment || 'none'}`,
            String(id),
            'success',
            {
              success: true,
              newStatus: ConfigStatus.REJECTED,
              comment: rejectionDto.comment,
            },
          );

          return {
            success: true,
            message: `Configuration ${id} has been rejected successfully`,
          };
        } catch (error) {
          this.logAudit(
            'Config rejection failed',
            user,
            `Failed to reject config ${id}: ${error.message}`,
            String(id),
            'failure',
            { success: false, error: error.message },
          );
          throw error;
        }
      }

      case 'export': {
        const exportDto = actionDto.data;
        // Config already fetched at the beginning of handleWorkflowAction
        const currentStatus = config.status!;
        const action: WorkflowAction = 'export';
        this.validateWorkflowAction(user.validClaims, currentStatus, action);

        const { tenantId } = user;
        const fileName = `dems_${tenantId}_${id}`;

        try {
          const configToExport = {
            ...config,
            // Status is set to DEPLOYED here (not EXPORTED) so the file is ready
            // for deployment without requiring a status update during the deploy phase
            status: ConfigStatus.DEPLOYED,
            msg_fam: config.msgFam,
            tenant_id: config.tenantId,
          };
          await this.sftpService.createFile(fileName, configToExport);

          const result = await this.configRepository.getupdateConfigByStatus(
            id,
            ConfigStatus.EXPORTED,
            token,
          );

          if (result) {
            const exportedConfig = result;
            await this.notificationService.sendWorkflowNotification(
              EventType.ExporterExport,
              user,
              exportedConfig,
              token,
              exportDto.comment,
            );
          }

          this.logAudit(
            'Config exported',
            user,
            `Config ${id} exported to SFTP. Comment: ${exportDto.comment ?? 'none'}`,
            String(id),
            'success',
            {
              success: true,
              newStatus: ConfigStatus.EXPORTED,
              fileName,
              comment: exportDto.comment,
            },
          );

          return {
            success: true,
            message: `Configuration ${id} exported successfully`,
            config: result as Config | undefined,
          };
        } catch (error) {
          this.logger.error(`Failed to export config: ${error.message}`);

          this.logAudit(
            'Config export failed',
            user,
            `Failed to export config ${id}: ${error.message}`,
            String(id),
            'failure',
            { success: false, error: error.message },
          );

          throw new BadRequestException(
            `Failed to export config: ${error.message}`,
          );
        }
      }

      case 'deploy': {
        const deployDto = actionDto.data;
        const { tenantId, userId } = user;
        const fileName = `dems_${tenantId}_${id}`;
        let configData: SftpConfigDataDto;

        try {
          configData = (await this.sftpService.readFile(
            fileName,
          )) as unknown as SftpConfigDataDto;
        } catch (error) {
          throw new BadRequestException(
            `Cannot deploy config ${id}: status is undefined and SFTP read failed. Error: ${error.message}`,
          );
        }

        const newStatus = ConfigStatus.DEPLOYED;

        try {
          try {
            const deployedConfigData = {
              id: configData.id,
              msgFam: configData.msgFam ?? null,
              transactionType: configData.transactionType ?? null,
              contentType: configData.contentType ?? 'application/json',
              endpointPath: configData.endpointPath ?? null,
              status: newStatus,
              publishingStatus: configData.publishingStatus ?? 'active',
              version: configData.version,
              schema: configData.schema ?? null,
              mapping: configData.mapping ?? null,
              functions: configData.functions ?? null,
              credentials: configData.credentials,
              tenantId,
              createdBy: configData.createdBy ?? userId,
              createdAt: configData.createdAt ?? new Date(),
              updatedAt: new Date(),
            };

            await this.configRepository.createDeployedConfig(
              deployedConfigData,
              token,
            );
          } catch (insertError) {
            this.logger.error(
              `Failed to insert deployed config: ${insertError.message}`,
            );
            throw insertError;
          }

          const { transactionType } = configData;

          if (transactionType) {
            await this.configRepository.createTransactionTypeTable(
              transactionType,
              token,
            );
          }

          const functions = configData.functions ?? null;

          if (Array.isArray(functions)) {
            const typedFunctions = functions;
            const datamodelFunctions = typedFunctions.filter(
              (fn) => fn.functionName === 'addDataModelTable',
            );

            const tableCreationPromises = datamodelFunctions.map(
              async (datamodelFn) => {
                if (datamodelFn.tableName) {
                  await this.configRepository.createTazamaDataModelTable(
                    datamodelFn.tableName as string,
                    token,
                  );
                } else {
                  this.logger.warn(
                    'Skipping addDataModelTable function without tableName',
                  );
                }
              },
            );

            await Promise.all(tableCreationPromises);
          } else if (functions) {
            const singleFn = functions;
            if (
              singleFn.functionName === 'addDataModelTable' &&
              singleFn.tableName
            ) {
              await this.configRepository.createTazamaDataModelTable(
                singleFn.tableName as string,
                token,
              );
            }
          }

          await this.sftpService.deleteFile(fileName);

          const deployedConfig = configData as unknown as Config;
          await this.notificationService.sendWorkflowNotification(
            EventType.PublisherDeploy,
            user,
            deployedConfig,
            token,
            deployDto.comment,
          );

          this.logAudit(
            'Config deployed',
            user,
            `Config ${id} deployed successfully. Comment: ${deployDto.comment ?? 'none'}`,
            String(id),
            'success',
            {
              success: true,
              newStatus: ConfigStatus.DEPLOYED,
              comment: deployDto.comment,
            },
          );

          return {
            success: true,
            message: `Configuration ${id} deployed successfully`,
            config: configData as unknown as Config | undefined,
          };
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          this.logger.error(`Failed to deploy config: ${errMsg}`);

          this.logAudit(
            'Config deployment failed',
            user,
            `Failed to deploy config ${id}: ${errMsg}`,
            String(id),
            'failure',
            { success: false, error: errMsg },
          );

          throw new BadRequestException(
            `Failed to deploy configuration: ${errMsg}`,
          );
        }
      }
    }
  }

  async updatePublishingStatus(
    id: number,
    publishingStatus: 'active' | 'inactive',
    tenantId: string,
    user: AuthenticatedUser,
    token: string,
  ): Promise<ConfigResponseDto> {
    try {
      const result = (await this.configRepository.updatePublishingStatus(
        id,
        publishingStatus,
        token,
      )) as { success: boolean; message?: string; config?: Config };

      if (!result.success) {
        throw new NotFoundException(
          result.message ?? `Config with ID ${id} not found`,
        );
      }

      try {
        await this.notifyService.notifyDems(id.toString(), tenantId);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to send NATS notification for config ${id}: ${errMsg}`,
        );
        throw new BadRequestException(`Failed to activate config: ${errMsg}`);
      }
      if (result.config) {
        const {config} = result;
        await this.notificationService.sendWorkflowNotification(
          publishingStatus === 'active'
            ? EventType.PublisherActivate
            : EventType.PublisherDeactivate,
          user,
          config,
          token,
          `Publishing status changed to ${publishingStatus}`,
        );
      }

      this.logAudit(
        'Config publishing status updated',
        user,
        `Config ${id} publishing status changed to ${publishingStatus}`,
        String(id),
        'success',
        { success: true, publishingStatus },
      );

      return {
        success: true,
        message: `Publishing status updated to ${publishingStatus}`,
        config: result.config,
      };
    } catch (error) {
      this.logAudit(
        'Config publishing status update failed',
        user,
        `Failed to update config ${id} publishing status to ${publishingStatus}: ${error.message}`,
        String(id),
        'failure',
        { success: false, error: error.message },
      );
      throw error;
    }
  }
  async updateConfigViaWrite(
    id: number,
    updateData: Record<string, unknown>,
    token: string,
  ): Promise<unknown> {
    try {
      const result = await this.configRepository.updateConfigViaWrite(
        id,
        updateData,
        token,
      );

      this.logAudit(
        'Config updated',
        { userId: 'system', tenantId: 'system' },
        `Config ${id} updated via write`,
        String(id),
        'success',
        { success: true, updateData },
      );

      return result;
    } catch (error) {
      this.logAudit(
        'Config update failed',
        { userId: 'system', tenantId: 'system' },
        `Failed to update config ${id} via write: ${error.message}`,
        String(id),
        'failure',
        { success: false, error: error.message },
      );
      throw error;
    }
  }

  async addMappingViaService(
    id: number,
    mappingData: Record<string, unknown>,
    token: string,
  ): Promise<unknown> {
    try {
      const result = await this.configRepository.addMapping(
        id,
        mappingData,
        token,
      );

      this.logAudit(
        'Config mapping added',
        { userId: 'system', tenantId: 'system' },
        `Mapping added to config ${id}`,
        String(id),
        'success',
        { success: true, mappingData },
      );

      return result;
    } catch (error) {
      this.logAudit(
        'Config mapping addition failed',
        { userId: 'system', tenantId: 'system' },
        `Failed to add mapping to config ${id}: ${error.message}`,
        String(id),
        'failure',
        { success: false, error: error.message },
      );
      throw error;
    }
  }

  async removeMappingViaService(
    id: number,
    index: number,
    token: string,
  ): Promise<unknown> {
    try {
      const result = await this.configRepository.removeMapping(
        id,
        index,
        token,
      );

      this.logAudit(
        'Config mapping removed',
        { userId: 'system', tenantId: 'system' },
        `Mapping at index ${index} removed from config ${id}`,
        String(id),
        'success',
        { success: true, removedIndex: index },
      );

      return result;
    } catch (error) {
      this.logAudit(
        'Config mapping removal failed',
        { userId: 'system', tenantId: 'system' },
        `Failed to remove mapping at index ${index} from config ${id}: ${error.message}`,
        String(id),
        'failure',
        { success: false, error: error.message },
      );
      throw error;
    }
  }

  async addFunctionViaService(
    id: number,
    functionData: Record<string, unknown>,
    token: string,
  ): Promise<unknown> {
    try {
      const result = await this.configRepository.addFunction(
        id,
        functionData,
        token,
      );

      this.logAudit(
        'Config function added',
        { userId: 'system', tenantId: 'system' },
        `Function added to config ${id}`,
        String(id),
        'success',
        { success: true, functionData },
      );

      return result;
    } catch (error) {
      this.logAudit(
        'Config function addition failed',
        { userId: 'system', tenantId: 'system' },
        `Failed to add function to config ${id}: ${error.message}`,
        String(id),
        'failure',
        { success: false, error: error.message },
      );
      throw error;
    }
  }

  async removeFunctionViaService(
    id: number,
    index: number,
    token: string,
  ): Promise<unknown> {
    try {
      const result = await this.configRepository.removeFunction(
        id,
        index,
        token,
      );

      this.logAudit(
        'Config function removed',
        { userId: 'system', tenantId: 'system' },
        `Function at index ${index} removed from config ${id}`,
        String(id),
        'success',
        { success: true, removedIndex: index },
      );

      return result;
    } catch (error) {
      this.logAudit(
        'Config function removal failed',
        { userId: 'system', tenantId: 'system' },
        `Failed to remove function at index ${index} from config ${id}: ${error.message}`,
        String(id),
        'failure',
        { success: false, error: error.message },
      );
      throw error;
    }
  }

  async getConfigById(
    id: number,
    tenantId: string,
    token: string,
  ): Promise<ConfigResponseDto> {
    const config = await this.getConfigOrThrow(id, tenantId, token);
    return {
      success: true,
      message: 'Config retrieved successfully',
      config,
    };
  }
  getConfigStatus(user: AuthenticatedUser): string[] {
    const userRole = user.actorRole?.toLowerCase();

    if (
      !userRole ||
      !['editor', 'approver', 'publisher', 'exporter'].includes(userRole)
    ) {
      return [];
    }

    const { allowedStatuses } = this.rbacService.getTier2({
      role: userRole as 'editor' | 'approver' | 'publisher' | 'exporter',
      endpointKey: 'Post /:offset/:limit',
    });

    return allowedStatuses || [];
  }

  async getAllConfigs(
    offset: number,
    limit: number,
    filters: Record<string, unknown>,
    user: AuthenticatedUser,
  ): Promise<Config[]> {
    const updatedFilters = { ...filters };

    // Apply RBAC Tier 2: Auto-filter by role's allowed statuses if no status provided
    if (!updatedFilters.status) {
      const userRole = user.actorRole?.toLowerCase();
      if (
        userRole &&
        ['editor', 'approver', 'publisher', 'exporter'].includes(userRole)
      ) {
        const { allowedStatuses } = this.rbacService.getTier2({
          role: userRole as 'editor' | 'approver' | 'publisher' | 'exporter',
          endpointKey: 'Post /:offset/:limit',
        });

        if (allowedStatuses?.length) {
          updatedFilters.status = allowedStatuses.join(',');
        }
      }
    }
    return await this.configRepository.getAllConfigsWithFilters(
      offset,
      limit,
      updatedFilters,
      user.token.tokenString,
    );
  }
}
