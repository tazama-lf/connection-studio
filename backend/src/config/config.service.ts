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
import { SftpService } from '../sftp/sftp.service';
import {
  Config,
  CreateConfigDto,
  ConfigResponseDto,
  ContentType,
  ConfigStatus,
  StatusTransitionDto,
  SubmitForApprovalDto,
  ApprovalDto,
  RejectionDto,
  DeploymentDto,
  WorkflowAction,
} from './config.interfaces';
import { EventType } from 'src/enums/events.enum';
import { AuthenticatedUser } from 'src/auth/auth.types';

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);

  constructor(
    private readonly configRepository: ConfigRepository,
    private readonly workflowService: ConfigWorkflowService,
    private readonly sftpService: SftpService,
    private readonly notifyService: NotifyService,
    private readonly notificationService: NotificationService,
  ) {}
  private generateEndpointPath(
    tenantId: string,
    version: string,
    transactionType: string,
    msgFam?: string,
  ): string {
    const basePath = `/${tenantId}/${version}`;
    if (msgFam?.trim()) {
      return `${basePath}/${msgFam}/${transactionType}`;
    }
    return `${basePath}/${transactionType}`;
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

  private buildDuplicateConfigMessage(
    msgFam: string,
    transactionType: string,
    version: string,
  ): string {
    return `Config with message family '${msgFam}', transaction type '${transactionType}', and version '${version}' already exists for this tenant. Please use different values.`;
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
      const version = dto.version || 'v1';
      const msgFam = dto.msgFam || 'unknown';
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
          message: this.buildDuplicateConfigMessage(
            msgFam,
            dto.transactionType,
            version,
          ),
        };
      }

      if (!dto.payload) {
        return {
          success: false,
          message:
            'Payload is required. Provide either payload text or upload a file.',
        };
      }

      let payloadString: string;
      if (typeof dto.payload === 'string') {
        payloadString = dto.payload;
      } else if (typeof dto.payload === 'object') {
        payloadString = JSON.stringify(dto.payload, null, 2);
      } else {
        return {
          success: false,
          message: 'Invalid payload format. Expected string or object.',
        };
      }

      const endpointPath = this.generateEndpointPath(
        tenantId,
        version,
        dto.transactionType,
        dto.msgFam,
      );

      const configData: Omit<Config, 'id' | 'createdAt' | 'updatedAt'> = {
        msgFam: dto.msgFam || '',
        transactionType: dto.transactionType,
        endpointPath,
        version,
        contentType: dto.contentType || ContentType.JSON,
        schema: dto.schema as JSONSchema,
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

      const config = (await this.configRepository.findConfigById(
        configId,
        tenantId,
        token,
      ))!;

      return {
        success: true,
        message: 'Config created successfully',
        config,
        // validation,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create config: ${error.message}`,
        error.stack,
      );

      const msgFam = dto.msgFam || 'unknown';
      const { transactionType } = dto;
      const version = dto.version || 'v1';

      let userMessage =
        'Failed to create configuration. Please check your input and try again.';

      if (
        error.message &&
        (error.message.includes('duplicate key value') ||
          error.message.includes('unique constraint'))
      ) {
        userMessage = `A configuration with Message Family '${msgFam}', Transaction Type '${transactionType}', and Version '${version}' already exists. Please use different values.`;
      } else if (error.message?.includes('validation')) {
        userMessage = `Validation error: ${error.message}`;
      } else if (error.message?.includes('schema')) {
        userMessage = `Schema error: ${error.message}`;
      } else if (error.message) {
        userMessage = error.message;
      }

      return {
        success: false,
        message: userMessage,
      };
    }
  }

  async deleteConfig(
    id: number,
    tenantId: string,
    userId: string,
    token: string,
  ): Promise<ConfigResponseDto> {
    await this.getConfigOrThrow(id, tenantId, token);

    await this.configRepository.deleteConfig(id, tenantId, token);

    return {
      success: true,
      message: 'Config deleted successfully',
    };
  }

  async submitConfig(
    id: number,
    dto: SubmitForApprovalDto,
    user: AuthenticatedUser,
    token: string,
  ): Promise<ConfigResponseDto> {
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
        dto.comment,
      );
    }

    return {
      success: true,
      message: `Configuration ${id} submitted for approval successfully`,
    };
  }
  async approveConfig(
    id: number,
    dto: ApprovalDto,
    user: AuthenticatedUser,
    token: string,
  ): Promise<ConfigResponseDto> {
    const config = await this.getConfigOrThrow(id, user.tenantId, token);

    const currentStatus = config.status!;
    const action: WorkflowAction = 'approve';
    this.validateWorkflowAction(user.validClaims || [], currentStatus, action);

    const updatedConfig = await this.configRepository.getupdateConfigByStatus(
      id,
      ConfigStatus.APPROVED,
      token,
      dto.comment,
    );

    if (updatedConfig) {
      const config = updatedConfig;
      await this.notificationService.sendWorkflowNotification(
        EventType.ApproverApprove,
        user,
        config,
        token,
        dto.comment,
      );
    }

    return {
      success: true,
      message: `Configuration ${id} has been approved successfully`,
    };
  }

  async rejectConfig(
    id: number,
    dto: RejectionDto,
    user: AuthenticatedUser,
    token: string,
  ): Promise<ConfigResponseDto> {
    const config = await this.getConfigOrThrow(id, user.tenantId, token);

    const currentStatus = config.status!;
    const action: WorkflowAction = 'reject';
    this.validateWorkflowAction(user.validClaims || [], currentStatus, action);

    const updatedConfig = await this.configRepository.getupdateConfigByStatus(
      id,
      ConfigStatus.REJECTED,
      token,
      dto.comment,
    );

    if (updatedConfig) {
      const config = updatedConfig;
      await this.notificationService.sendWorkflowNotification(
        EventType.ApproverReject,
        user,
        config,
        token,
        dto.comment,
      );
    }

    return {
      success: true,
      message: `Configuration ${id} has been rejected successfully`,
    };
  }
  async exportConfig(
    id: number,
    dto: StatusTransitionDto,
    user: AuthenticatedUser,
    token: string,
  ): Promise<ConfigResponseDto> {
    const config = await this.getConfigOrThrow(id, user.tenantId, token);

    const currentStatus = config.status!;
    const action: WorkflowAction = 'export';
    this.validateWorkflowAction(user.validClaims || [], currentStatus, action);

    const { tenantId } = user;

    const fileName = `dems_${tenantId}_${id}`;

    try {
      const currentStatus = ConfigStatus.READY_FOR_DEPLOYMENT;
      const configToExport = {
        ...config,
        status: currentStatus,
        msg_fam: config.msgFam,
        tenant_id: config.tenantId,
      };
      await this.sftpService.createFile(fileName, {
        ...configToExport,
        status: ConfigStatus.READY_FOR_DEPLOYMENT,
      });

      this.logger.log(
        `Successfully uploaded config file (${fileName}) with status '${ConfigStatus.READY_FOR_DEPLOYMENT}' to SFTP servers.`,
      );

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
          dto.comment,
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

  async deployConfig(
    id: number,
    dto: DeploymentDto,
    user: AuthenticatedUser,

    tenantId: string,
    userId: string,

    token: string,
  ): Promise<ConfigResponseDto> {
    const fileName = `dems_${tenantId}_${id}`;
    let sftpConfigStatus: ConfigStatus;
    let configData: any;
    try {
      this.logger.log(`Reading config file from SFTP: ${fileName}`);
      configData = (await this.sftpService.readFile(fileName)) as Config;
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
          msgFam: configData.msgFam || null,
          transactionType: configData.transactionType || null,
          contentType: configData.contentType || 'application/json',
          endpointPath: configData.endpointPath || null,
          status: sftpConfigStatus,
          publishingStatus: configData.publishingStatus || 'active',
          version: configData.version,
          schema: configData.schema == null ? null : configData.schema,
          mapping: configData.mapping == null ? null : configData.mapping,
          functions: configData.functions == null ? null : configData.functions,
          credentials: configData.credentials,
          tenantId,
          createdBy: configData.createdBy || userId,
          createdAt: configData.createdAt || new Date(),
          updatedAt: new Date(),
        };

        this.logger.log(
          `Deploying config data - schema length: ${deployedConfigData.schema?.length}, mapping length: ${deployedConfigData.mapping?.length}`,
        );

        const insertedId = await this.configRepository.createDeployedConfig(
          deployedConfigData,
          token,
        );

        this.logger.log(
          `Successfully inserted deployed config, new record id: ${insertedId}`,
        );
      } catch (insertError) {
        this.logger.error(
          `Failed to insert deployed config: ${insertError.message}`,
        );
        throw insertError;
      }

      if (configData.credentials) {
        this.logger.log('Credentials present in config');
      }

      const { transactionType } = configData;
      if (transactionType) {
        this.logger.log(
          `Creating table for transaction type: ${transactionType}`,
        );
        await this.configRepository.createTransactionTypeTable(
          transactionType,
          token,
        );
        this.logger.log(
          `Successfully created table "${transactionType}" from deployed config`,
        );
      } else {
        this.logger.warn(`No transactionType found in config file ${fileName}`);
      }
      const { functions } = configData;
      const datamodelFn = Array.isArray(functions)
        ? functions.find((fn) => fn.functionName === 'addDatamodelTable')
        : functions;
      if (datamodelFn) {
        this.logger.log(
          `Creating datamodel table as per function: ${functions.functionName}`,
        );
        await this.configRepository.createTazamaDataModelTable(
          datamodelFn.tableName,
          datamodelFn.columns,
          token,
        );
        this.logger.log(
          `Successfully created datamodel table "${functions.parameters.tableName}" from deployed config`,
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
        dto.comment,
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
        result.message || `Config with ID ${id} not found`,
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

  async deleteConfigViaWrite(id: number, token: string): Promise<void> {
    await this.configRepository.deleteConfigViaWrite(id, token);
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

  async updateFunctionViaService(
    id: number,
    index: number,
    functionData: any,
    token: string,
  ): Promise<any> {
    return await this.configRepository.updateFunction(
      id,
      index,
      functionData,
      token,
    );
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
