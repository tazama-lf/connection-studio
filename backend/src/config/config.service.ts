import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigRepository } from './config.repository';
import { JSONSchema } from '@tazama-lf/tcs-lib';
import { NotifyService } from '../notify/notify.service';
import { NotificationService } from '../notification/notification.service';
import { ConfigWorkflowService } from './config-workflow.service';
import { ConfigUtilsService } from './config-utils.service';
import { SftpService } from '../sftp/sftp.service';
import {
  Config,
  CreateConfigDto,
  ConfigResponseDto,
  ContentType,
  ConfigStatus,
  WorkflowAction,
} from './config.interfaces';
import {
  StatusTransitionDto,
  SubmitForApprovalDto,
  ApprovalDto,
  RejectionDto,
  DeploymentDto,
} from './dto';
import { EventType } from '../enums/events.enum';
import { AuthenticatedUser } from '../auth/auth.types';

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);

  constructor(
    private readonly configRepository: ConfigRepository,
    private readonly workflowService: ConfigWorkflowService,
    private readonly configUtils: ConfigUtilsService,
    private readonly sftpService: SftpService,
    private readonly notifyService: NotifyService,
    private readonly notificationService: NotificationService,
  ) {}
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
    tenantId: string,
    userId: string,
    token: string,
  ): Promise<ConfigResponseDto> {
    this.logger.log(
      `[${tenantId}] Updating config ${id} status to ${status} by user ${userId}`,
    );

    await this.getConfigOrThrow(id, tenantId, token);

    await this.configRepository.updateConfigStatus(
      id,
      status,
      token,
    );

    this.logger.log(
      `[${tenantId}] Config ${id} status updated successfully to ${status}`,
    );

    return {
      success: true,
      message: `Config status updated to ${status}`,
    };
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
    tenantId: string,
    userId: string,
    token: string,
  ): Promise<ConfigResponseDto> {
    try {
      this.logger.log('Creating new config...', dto.schema);
      const version = dto.version ;
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
        schema: dto.schema as unknown as JSONSchema,
        mapping: dto.mapping,
        functions: dto.functions,
        status: ConfigStatus.IN_PROGRESS,
        tenantId,
        createdBy: userId,
      };

      this.logger.log(
        `Config data prepared with status: "${configData.status}" (type: ${typeof configData.status})`,
      );

      const configId = await this.configRepository.createConfig(
        configData,
        token,
      );

      const config = await this.configRepository.findConfigById(
        configId,
        tenantId,
        token,
      );

      return {
        success: true,
        message: 'Config created successfully',
        config: config as Config,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create config: ${error.message}`,
        error.stack,
      );

      const msgFam = dto.msgFam ?? 'unknown';
      const { transactionType } = dto;
      const version = dto.version ?? 'v1';

      const userMessage = this.configUtils.buildUserErrorMessage(
        error,
        msgFam,
        transactionType,
        version,
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

    //ye hata doh update khud error de ga
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

    return {
      success: true,
      message: `Configuration ${id} submitted for approval successfully`,
    };
  }

  async handleWorkflowAction(
    id: number,
    action: string,
    dto: any,
    user: AuthenticatedUser,
    token: string,
  ): Promise<ConfigResponseDto> {
    switch (action.toLowerCase()) {
      case 'submit': {
        const submitDto = dto as SubmitForApprovalDto;
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
            submitDto?.comment,
          );
        }

        return {
          success: true,
          message: `Configuration ${id} submitted for approval successfully`,
        };
      }
      
      case 'approve': {
        const approvalDto = dto as ApprovalDto;
        const updatedConfig = await this.configRepository.getupdateConfigByStatus(
          id,
          ConfigStatus.APPROVED,
          token,
          approvalDto?.comment,
        );

        if (updatedConfig) {
          const config = updatedConfig;
          await this.notificationService.sendWorkflowNotification(
            EventType.ApproverApprove,
            user,
            config,
            token,
            approvalDto?.comment,
          );
        }

        return {
          success: true,
          message: `Configuration ${id} has been approved successfully`,
        };
      }
      
      case 'reject': {
        const rejectionDto = dto as RejectionDto;

        const updatedConfig = await this.configRepository.getupdateConfigByStatus(
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

        return {
          success: true,
          message: `Configuration ${id} has been rejected successfully`,
        };
      }
      
      case 'export': {
        const exportDto = dto as StatusTransitionDto;
        const config = await this.getConfigOrThrow(id, user.tenantId, token);

        const currentStatus = config.status!;
        const action: WorkflowAction = 'export';
        this.validateWorkflowAction(user.validClaims, currentStatus, action);

        const { tenantId } = user;
        const fileName = `dems_${tenantId}_${id}`;

        try {
          const exportStatus = ConfigStatus.READY_FOR_DEPLOYMENT;
          const configToExport = {
            ...config,
            status: exportStatus,
            msg_fam: config.msgFam,
            tenant_id: config.tenantId,
          };
          await this.sftpService.createFile(fileName, {
            ...configToExport,
            status: ConfigStatus.DEPLOYED,
          });

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
              exportDto?.comment,
            );
          }

          return {
            success: true,
            message: `Configuration ${id} exported successfully`,
            config: result as Config | undefined,
          };
        } catch (error) {
          this.logger.error(`Failed to export config: ${error.message}`);
          throw new BadRequestException(
            `Failed to export config: ${error.message}`,
          );
        }
      }
      
      case 'deploy': {
        const deployDto = dto as DeploymentDto;
        const { tenantId, userId } = user;
        const fileName = `dems_${tenantId}_${id}`;
        let sftpConfigStatus: ConfigStatus;
        let configData: any;

        try {
          configData = await this.sftpService.readFile(fileName);
          sftpConfigStatus = configData.status as ConfigStatus;
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
              schema: configData.schema === null ? null : configData.schema,
              mapping: configData.mapping === null ? null : configData.mapping,
              functions: configData.functions === null ? null : configData.functions,
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
          
            await this.configRepository.createTransactionTypeTable(
              transactionType,
              token,
            );
            this.logger.log(
              `Successfully created table "${transactionType}" from deployed config`,
            );
          

          const functions = configData.functions || null;

          const datamodelFn = Array.isArray(functions)
            ? functions.find((fn) => fn.functionName === 'addDataModelTable')
            : (functions && functions.functionName === 'addDataModelTable'
                ? functions
                : null);

          if (datamodelFn) {
            this.logger.log(
              `Creating datamodel table as per function: ${datamodelFn.functionName}`,
            );

            await this.configRepository.createTazamaDataModelTable(
              datamodelFn.tableName,
              datamodelFn.columns,
              token,
            );

            this.logger.log(
              `Successfully created datamodel table "${datamodelFn.tableName}" from deployed config`,
            );
          }


          await this.sftpService.deleteFile(fileName);
          this.logger.log(`Deleted config file from SFTP: ${fileName}`);

          const deployedConfig = configData as Config;
          await this.notificationService.sendWorkflowNotification(
            EventType.PublisherDeploy,
            user,
            deployedConfig,
            token,
            deployDto?.comment,
          );

          this.logger.log(
            `Successfully updated original config ${id} status to ${newStatus}`,
          );

          return {
            success: true,
            message: `Configuration ${id} deployed successfully`,
            config: configData as Config | undefined,
          };
        } catch (error) {
          this.logger.error(`Failed to deploy config: ${error.message}`);
          throw new BadRequestException(
            `Failed to deploy configuration: ${error.message}`,
          );
        }
      }
      
      default:
        throw new BadRequestException(
          `Invalid workflow action: ${action}. Valid actions are: submit, approve, reject, export, deploy`,
        );
    }
  }

  async updatePublishingStatus(
    id: number,
    publishingStatus: 'active' | 'inactive',
    tenantId: string,
    user: AuthenticatedUser,
    token: string,
  ): Promise<ConfigResponseDto> {
    const result = await this.configRepository.updatePublishingStatus(
      id,
      publishingStatus,
      token,
    );

    if (!result.success) {
      throw new NotFoundException(
        result.message ?? `Config with ID ${id} not found`,
      );
    }

    try {
      await this.notifyService.notifyDems(id.toString(), tenantId);
      this.logger.log(
        `NATS notification sent to DEMS for activated config ${id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send NATS notification for config ${id}: ${error.message}`,
      );
      throw new BadRequestException(
        `Failed to activate config: ${error.message}`,
      );
    }
    if (result?.success && result.config) {
      const config = result.config as Config;
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

    return {
      success: true,
      message: `Publishing status updated to ${publishingStatus}`,
      config: result.config,
    };
  }
  async updateConfigViaWrite(
    id: number,
    updateData: any,
    token: string,
  ): Promise<any> {
    return await this.configRepository.updateConfigViaWrite(
      id,
      updateData,
      token,
    );
  }

  async addMappingViaService(
    id: number,
    mappingData: any,
    token: string,
  ): Promise<any> {
    return await this.configRepository.addMapping(id, mappingData, token);
  }

  async removeMappingViaService(
    id: number,
    index: number,
    token: string,
  ): Promise<any> {
    return await this.configRepository.removeMapping(id, index, token);
  }

  async addFunctionViaService(
    id: number,
    functionData: any,
    token: string,
  ): Promise<any> {
    return await this.configRepository.addFunction(id, functionData, token);
  }

  async removeFunctionViaService(
    id: number,
    index: number,
    token: string,
  ): Promise<any> {
    return await this.configRepository.removeFunction(id, index, token);
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

  async getAllConfigs(
    offset: number,
    limit: number,
    filters: Record<string, any>,
    token: string,
  ): Promise<Config[]> {
    return await this.configRepository.getAllConfigsWithFilters(
      offset,
      limit,
      filters,
      token,
    );
  }
}
