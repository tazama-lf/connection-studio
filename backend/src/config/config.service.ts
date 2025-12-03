import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigRepository } from './config.repository';
import {
  FieldType,
  JSONSchema,
  // applyFieldAdjustments,
  SchemaField,
} from '@tazama-lf/tcs-lib';
import { NotifyService } from '../notify/notify.service';
import { NotificationService } from '../notification/notification.service';
import { TazamaDataModelService } from '../tazama-data-model/tazama-data-model.service';
import { ConfigWorkflowService } from './config-workflow.service';
import { SftpService } from '../sftp/sftp.service';
import {
  Config,
  CreateConfigDto,
  UpdateConfigDto,
  CloneConfigDto,
  ConfigResponseDto,
  FieldMapping,
  ContentType,
  ConfigStatus,
  TransactionType,
  AddMappingDto,
  FunctionDefinition,
  AddFunctionDto,
  AllowedFunctionName,
  StatusTransitionDto,
  SubmitForApprovalDto,
  ApprovalDto,
  RejectionDto,
  DeploymentDto,
  WorkflowAction,
  ConfigWithSourceFields,
} from './config.interfaces';
import { EventType } from 'src/enums/events.enum';
import { AuthenticatedUser } from 'src/auth/auth.types';

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);

  constructor(
    private readonly configRepository: ConfigRepository,
    private readonly tazamaDataModelService: TazamaDataModelService,
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

  /**
   * Fetch and validate config by ID
   * @throws NotFoundException if config not found
   */
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

  /**
   * Validate workflow action permissions
   * @throws ForbiddenException if action not allowed
   */
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

  private async updateConfigStatus(
    id: number,
    tenantId: string,
    newStatus: ConfigStatus,
    token: string,
  ): Promise<Config> {
    await this.configRepository.updateConfig(
      id,
      tenantId,
      { status: newStatus },
      token,
    );

    const updatedConfig = await this.configRepository.findConfigById(
      id,
      tenantId,
      token,
    );
    return updatedConfig!;
  }



  /**
   * Build duplicate config error message
   */
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

      // Enrich config with source fields for mapping UI
      // const enrichedConfig = this.enrichConfigWithSourceFields(config!);

      // if (
      //   enrichedConfig.sourceFields &&
      //   enrichedConfig.sourceFields.length > 0
      // ) {
      //   this.logger.log(
      //     'FIRST 5 SOURCE FIELDS: ' +
      //       enrichedConfig.sourceFields
      //         .slice(0, 5)
      //         .map((f) => f.name)
      //         .join(', '),
      //   );
      // }

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
      const {transactionType} = dto;
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

  // async cloneConfig(
  //   dto: CloneConfigDto,
  //   tenantId: string,
  //   userId: string,
  //   token: string,
  // ): Promise<ConfigResponseDto> {
  //   try {
  //     const sourceConfig = await this.configRepository.findConfigById(
  //       dto.sourceConfigId,
  //       tenantId,
  //       token,
  //     );

  //     if (!sourceConfig) {
  //       return {
  //         success: false,
  //         message: `Source config with ID ${dto.sourceConfigId} not found`,
  //       };
  //     }

  //     const newMsgFam = dto.newMsgFam || sourceConfig.msgFam;
  //     const newVersion = dto.newVersion || sourceConfig.version;

  //     const existingConfig =
  //       await this.configRepository.findConfigByMsgFamVersionAndTransactionType(
  //         newMsgFam,
  //         newVersion,
  //         dto.newTransactionType,
  //         tenantId,
  //         token,
  //       );

  //     if (existingConfig) {
  //       return {
  //         success: false,
  //         message: this.buildDuplicateConfigMessage(
  //           newMsgFam,
  //           dto.newTransactionType,
  //           newVersion,
  //         ),
  //       };
  //     }
  //     const newEndpointPath = this.generateEndpointPath(
  //       tenantId,
  //       newVersion,
  //       dto.newTransactionType,
  //       newMsgFam,
  //     );
  //     let finalSchema = sourceConfig.schema;
  //     if (dto.fieldAdjustments && dto.fieldAdjustments.length > 0) {
  //       this.logger.log(
  //         `Applying ${dto.fieldAdjustments.length} field adjustments to cloned config`,
  //       );
  //       const existingSourceFields =
  //         this.jsonSchemaConverter.convertFromJSONSchema(sourceConfig.schema);

  //       const adjustedSourceFields = applyFieldAdjustments(
  //         existingSourceFields,
  //         dto.fieldAdjustments,
  //       );

  //       finalSchema =
  //         this.jsonSchemaConverter.convertToJSONSchema(adjustedSourceFields);

  //       this.logger.log(
  //         'Successfully applied field adjustments to cloned config',
  //       );

  //       const validation = this.validateSchema(finalSchema);
  //       if (!validation.success) {
  //         return {
  //           success: false,
  //           message: 'Adjusted schema validation failed',
  //           validation,
  //         };
  //       }
  //     }

  //     const newConfigData: Omit<Config, 'id' | 'createdAt' | 'updatedAt'> = {
  //       msgFam: newMsgFam,
  //       transactionType: dto.newTransactionType,
  //       endpointPath: newEndpointPath,
  //       version: newVersion,
  //       contentType: sourceConfig.contentType,
  //       schema: finalSchema,
  //       mapping: sourceConfig.mapping, // Clone the mappings
  //       functions: dto.functions || sourceConfig.functions,
  //       status: ConfigStatus.IN_PROGRESS,
  //       tenantId,
  //       createdBy: userId,
  //     };

  //     const newConfigId = await this.configRepository.createConfig(
  //       newConfigData,
  //       token,
  //     );

  //     await this.auditService.logAction({
  //       entityType: 'CONFIG',
  //       action: 'CLONE_CONFIG',
  //       actor: userId,
  //       tenantId,
  //       endpointName: `${newMsgFam} - ${newEndpointPath} (cloned from ${dto.sourceConfigId})`,
  //     });

  //     const newConfig = await this.configRepository.findConfigById(
  //       newConfigId,
  //       tenantId,
  //       token,
  //     );

  //     this.logger.log(
  //       `Successfully cloned config ${dto.sourceConfigId} to new config ${newConfigId}`,
  //     );

  //     const validation = this.validateSchema(finalSchema);

  //     return {
  //       success: true,
  //       message: 'Config cloned successfully',
  //       config: newConfig!,
  //       validation,
  //     };
  //   } catch (error) {
  //     this.logger.error(
  //       `Failed to clone config: ${error.message}`,
  //       error.stack,
  //     );
  //     return {
  //       success: false,
  //       message: `Failed to clone config: ${error.message}`,
  //     };
  //   }
  // }

  // async updateConfig(
  //   id: number,
  //   dto: UpdateConfigDto,
  //   tenantId: string,
  //   userId: string,
  //   token: string,
  // ): Promise<ConfigResponseDto> {
  //   const config = await this.configRepository.findConfigById(
  //     id,
  //     tenantId,
  //     token,
  //   );

  //   if (!config) {
  //     throw new NotFoundException(`Config with ID ${id} not found`);
  //   }

  //   const editValidation = this.workflowService.canEditConfig(
  //     config.status as ConfigStatus,
  //   );
  //   if (!editValidation.canEdit) {
  //     return {
  //       success: false,
  //       message: editValidation.message || 'Editing not allowed.',
  //     };
  //   }

  //   if (dto.schema) {
  //     const validation = this.validateSchema(dto.schema);
  //     if (!validation.success) {
  //       return {
  //         success: false,
  //         message: 'Schema validation failed',
  //         validation,
  //       };
  //     }
  //   }

  //   let finalSchema = dto.schema;
  //   if (dto.fieldAdjustments && dto.fieldAdjustments.length > 0) {
  //     this.logger.log(
  //       `Applying ${dto.fieldAdjustments.length} field adjustments to config ${id}`,
  //     );

  //     const baseSchema = dto.schema || config.schema;

  //     const existingSourceFields =
  //       this.jsonSchemaConverter.convertFromJSONSchema(baseSchema);

  //     // Apply field adjustments
  //     const adjustedSourceFields = applyFieldAdjustments(
  //       existingSourceFields,
  //       dto.fieldAdjustments,
  //     );

  //     const duplicateErrors =
  //       this.validateNoDuplicateSchemaFields(adjustedSourceFields);
  //     if (duplicateErrors.length > 0) {
  //       this.logger.error(
  //         'Duplicate fields detected after field adjustments during config update',
  //         {
  //           errors: duplicateErrors,
  //           configId: id,
  //           tenantId,
  //           userId,
  //           fieldAdjustments: dto.fieldAdjustments,
  //           totalAdjustedFields: adjustedSourceFields.length,
  //           context: 'updateConfig',
  //         },
  //       );
  //       return {
  //         success: false,
  //         message: 'Field adjustments resulted in duplicate fields',
  //         validation: {
  //           success: false,
  //           errors: duplicateErrors,
  //           warnings: [],
  //         },
  //       };
  //     }

  //     // Regenerate JSON schema with adjusted fields
  //     finalSchema =
  //       this.jsonSchemaConverter.convertToJSONSchema(adjustedSourceFields);

  //     this.logger.log(
  //       'Successfully applied field adjustments and regenerated schema',
  //     );

  //     const validation = this.validateSchema(finalSchema);
  //     if (!validation.success) {
  //       return {
  //         success: false,
  //         message: 'Adjusted schema validation failed',
  //         validation,
  //       };
  //     }
  //   }

  //   if (dto.mapping && dto.mapping.length > 0) {
  //     const schemaToValidate = finalSchema || dto.schema || config.schema;
  //     for (let i = 0; i < dto.mapping.length; i++) {
  //       const mapping = dto.mapping[i];
  //       await this.validateMapping(mapping, schemaToValidate, tenantId);

  //       this.validateNoDuplicateDestination(
  //         mapping,
  //         dto.mapping.slice(0, i),
  //         false,
  //       );
  //     }
  //   }

  //   const updateData = { ...dto };

  //   if (finalSchema) {
  //     updateData.schema = finalSchema;
  //   }

  //   const isVersionChanging =
  //     dto.version !== undefined && dto.version !== config.version;
  //   const isMsgFamChanging =
  //     dto.msgFam !== undefined && dto.msgFam !== config.msgFam;

  //   if (isVersionChanging || isMsgFamChanging) {
  //     this.logger.log(
  //       `msgFam or version changed for config ${id}. Creating NEW config instead of updating.`,
  //     );

  //     const newVersion = dto.version ?? config.version;
  //     const newTransactionType = dto.transactionType ?? config.transactionType;
  //     const newMsgFam = dto.msgFam ?? config.msgFam;

  //     // Check if this new combination already exists
  //     const existingConfig =
  //       await this.configRepository.findConfigByMsgFamVersionAndTransactionType(
  //         newMsgFam,
  //         newVersion,
  //         newTransactionType,
  //         tenantId,
  //         token,
  //       );

  //     if (existingConfig) {
  //       return {
  //         success: false,
  //         message: `Config with message family '${newMsgFam}', transaction type '${newTransactionType}', and version '${newVersion}' already exists for this tenant. Please use different values.`,
  //       };
  //     }

  //     // Create new config by inserting directly into repository
  //     const newEndpointPath = this.generateEndpointPath(
  //       tenantId,
  //       newVersion,
  //       newTransactionType,
  //       newMsgFam,
  //     );

  //     const newConfigData = {
  //       msgFam: newMsgFam,
  //       version: newVersion,
  //       transactionType: newTransactionType,
  //       endpointPath: newEndpointPath,
  //       contentType: config.contentType,
  //       schema: finalSchema || config.schema,
  //       mapping: dto.mapping ?? config.mapping,
  //       functions: dto.functions ?? config.functions,
  //       status: ConfigStatus.IN_PROGRESS,
  //       tenantId,
  //       createdBy: userId,
  //     };

  //     if (newConfigData.mapping && newConfigData.mapping.length > 0) {
  //       for (let i = 0; i < newConfigData.mapping.length; i++) {
  //         const mapping = newConfigData.mapping[i];
  //         this.validateMapping(mapping, newConfigData.schema, tenantId);

  //         this.validateNoDuplicateDestination(
  //           mapping,
  //           newConfigData.mapping.slice(0, i),
  //           false,
  //         );
  //       }
  //     }

  //     this.logger.log(
  //       `Creating new config with msgFam: ${newMsgFam}, version: ${newVersion}, transactionType: ${newTransactionType}`,
  //     );

  //     const newConfigId = await this.configRepository.createConfig(
  //       newConfigData as any,
  //       token,
  //     );

  //     await this.auditService.logAction({
  //       entityType: 'CONFIG',
  //       action: 'CREATE_CONFIG',
  //       actor: userId,
  //       tenantId,
  //       endpointName: `Config ${newConfigId} (created from update of config ${id})`,
  //     });

  //     const newConfig = await this.configRepository.findConfigById(
  //       newConfigId,
  //       tenantId,
  //       token,
  //     );

  //     return {
  //       success: true,
  //       message: `msgFam or version changed. Created new config with ID ${newConfigId} instead of updating existing config ${id}.`,
  //       config: newConfig!,
  //     };
  //   }

  //   const isTransactionTypeChanging =
  //     dto.transactionType !== undefined &&
  //     dto.transactionType !== config.transactionType;

  //   if (isTransactionTypeChanging) {
  //     const newTransactionType = dto.transactionType!;

  //     const existingConfig =
  //       await this.configRepository.findConfigByMsgFamVersionAndTransactionType(
  //         config.msgFam,
  //         config.version,
  //         newTransactionType,
  //         tenantId,
  //         token,
  //       );

  //     if (existingConfig && existingConfig.id !== id) {
  //       return {
  //         success: false,
  //         message: `Config with message family '${config.msgFam}', transaction type '${newTransactionType}', and version '${config.version}' already exists for this tenant. Please use different values.`,
  //       };
  //     }
  //   }

  //   if (
  //     dto.transactionType !== undefined ||
  //     dto.msgFam !== undefined ||
  //     dto.version !== undefined
  //   ) {
  //     const newTransactionType = dto.transactionType ?? config.transactionType;
  //     const newMsgFam = dto.msgFam ?? config.msgFam;
  //     const newVersion = dto.version ?? config.version;

  //     updateData.endpointPath = this.generateEndpointPath(
  //       tenantId,
  //       newVersion,
  //       newTransactionType,
  //       newMsgFam,
  //     );

  //     this.logger.log(
  //       `Auto-generated new endpoint path: ${updateData.endpointPath} for config ${id}`,
  //     );
  //   }

  //   await this.configRepository.updateConfig(id, tenantId, updateData, token);

  //   await this.auditService.logAction({
  //     entityType: 'CONFIG',
  //     action: 'UPDATE_CONFIG',
  //     actor: userId,
  //     tenantId,
  //     endpointName: `Config ${id}`,
  //   });

  //   const updatedConfig = await this.configRepository.findConfigById(
  //     id,
  //     tenantId,
  //     token,
  //   );

  //   return {
  //     success: true,
  //     message: 'Config updated successfully',
  //     config: updatedConfig!,
  //   };
  // }

  async deleteConfig(
    id: number,
    tenantId: string,
    userId: string,
    token: string,
  ): Promise<ConfigResponseDto> {
    const config = await this.configRepository.findConfigById(
      id,
      tenantId,
      token,
    );

    if (!config) {
      throw new NotFoundException(`Config with ID ${id} not found`);
    }

    await this.configRepository.deleteConfig(id, tenantId, token);

    return {
      success: true,
      message: 'Config deleted successfully',
    };
  }

  async addMapping(
    id: number,
    mappingDto: AddMappingDto,
    tenantId: string,
    userId: string,
    token: string,
  ): Promise<ConfigResponseDto> {
    const config = await this.configRepository.findConfigById(
      id,
      tenantId,
      token,
    );

    if (!config) {
      throw new NotFoundException(`Config with ID ${id} not found`);
    }

    const newMapping = this.createMappingFromDto(mappingDto);
    // this.validateMapping(newMapping, config.schema, tenantId);

    this.validateNoDuplicateDestination(
      newMapping,
      config.mapping || [],
      false,
    );

    const updatedMappings = [...(config.mapping || []), newMapping];

    await this.configRepository.updateConfig(
      id,
      tenantId,
      {
        mapping: updatedMappings,
      },
      token,
    );

    const updatedConfig = await this.configRepository.findConfigById(
      id,
      tenantId,
      token,
    );

    return {
      success: true,
      message: 'Mapping added successfully',
      config: updatedConfig!,
    };
  }

  async removeMapping(
    id: number,
    mappingIndex: number,
    tenantId: string,
    userId: string,
    token: string,
  ): Promise<ConfigResponseDto> {
    const config = await this.configRepository.findConfigById(
      id,
      tenantId,
      token,
    );

    if (!config) {
      throw new NotFoundException(`Config with ID ${id} not found`);
    }

    if (!config.mapping || mappingIndex >= config.mapping.length) {
      throw new BadRequestException('Invalid mapping index');
    }

    const updatedMappings = config.mapping.filter(
      (_, idx) => idx !== mappingIndex,
    );

    await this.configRepository.updateConfig(
      id,
      tenantId,
      {
        mapping: updatedMappings.length > 0 ? updatedMappings : [],
      },
      token,
    );

    const updatedConfig = await this.configRepository.findConfigById(
      id,
      tenantId,
      token,
    );

    return {
      success: true,
      message: 'Mapping removed successfully',
      config: updatedConfig!,
    };
  }

  // async updateMapping(
  //   id: number,
  //   mappingIndex: number,
  //   mappingDto: AddMappingDto,
  //   tenantId: string,
  //   userId: string,
  //   token: string,
  // ): Promise<ConfigResponseDto> {
  //   const config = await this.configRepository.findConfigById(
  //     id,
  //     tenantId,
  //     token,
  //   );

  //   if (!config) {
  //     throw new NotFoundException(`Config with ID ${id} not found`);
  //   }

  //   if (!config.mapping || mappingIndex >= config.mapping.length) {
  //     throw new BadRequestException('Invalid mapping index');
  //   }

  //   const updatedMapping = this.createMappingFromDto(mappingDto);
  //   this.validateMapping(updatedMapping, config.schema, tenantId);

  //   this.validateNoDuplicateDestination(
  //     updatedMapping,
  //     config.mapping,
  //     true,
  //     mappingIndex,
  //   );

  //   const updatedMappings = [...config.mapping];
  //   updatedMappings[mappingIndex] = updatedMapping;

  //   await this.configRepository.updateConfig(
  //     id,
  //     tenantId,
  //     {
  //       mapping: updatedMappings,
  //     },
  //     token,
  //   );

  //   await this.auditService.logAction({
  //     entityType: 'MAPPING',
  //     action: 'UPDATE_MAPPING',
  //     actor: userId,
  //     tenantId,
  //     endpointName: `Config ${id}`,
  //   });

  //   const updatedConfig = await this.configRepository.findConfigById(
  //     id,
  //     tenantId,
  //     token,
  //   );

  //   return {
  //     success: true,
  //     message: 'Mapping updated successfully',
  //     config: updatedConfig!,
  //   };
  // }

  async addFunction(
    id: number,
    functionDto: AddFunctionDto,
    tenantId: string,
    userId: string,
    token: string,
  ): Promise<ConfigResponseDto> {
    const config = await this.configRepository.findConfigById(
      id,
      tenantId,
      token,
    );

    if (!config) {
      throw new NotFoundException(`Config with ID ${id} not found`);
    }

    const newFunction = this.createFunctionFromDto(functionDto);
    this.validateFunction(newFunction, config.schema);

    const updatedFunctions = [...(config.functions || []), newFunction];

    await this.configRepository.updateConfig(
      id,
      tenantId,
      {
        functions: updatedFunctions,
      },
      token,
    );


    const updatedConfig = await this.configRepository.findConfigById(
      id,
      tenantId,
      token,
    );

    return {
      success: true,
      message: 'Function added successfully',
      config: updatedConfig!,
    };
  }

  async removeFunction(
    id: number,
    functionIndex: number,
    tenantId: string,
    userId: string,
    token: string,
  ): Promise<ConfigResponseDto> {
    const config = await this.configRepository.findConfigById(
      id,
      tenantId,
      token,
    );

    if (!config) {
      throw new NotFoundException(`Config with ID ${id} not found`);
    }

    if (!config.functions || functionIndex >= config.functions.length) {
      throw new BadRequestException('Invalid function index');
    }

    const updatedFunctions = config.functions.filter(
      (_, idx) => idx !== functionIndex,
    );

    await this.configRepository.updateConfig(
      id,
      tenantId,
      {
        functions: updatedFunctions.length > 0 ? updatedFunctions : [],
      },
      token,
    );

    const updatedConfig = await this.configRepository.findConfigById(
      id,
      tenantId,
      token,
    );

    return {
      success: true,
      message: 'Function removed successfully',
      config: updatedConfig!,
    };
  }

  async updateFunction(
    id: number,
    functionIndex: number,
    functionDto: AddFunctionDto,
    tenantId: string,
    userId: string,
    token: string,
  ): Promise<ConfigResponseDto> {
    const config = await this.configRepository.findConfigById(
      id,
      tenantId,
      token,
    );

    if (!config) {
      throw new NotFoundException(`Config with ID ${id} not found`);
    }

    if (!config.functions || functionIndex >= config.functions.length) {
      throw new BadRequestException('Invalid function index');
    }

    const updatedFunction = this.createFunctionFromDto(functionDto);
    this.validateFunction(updatedFunction, config.schema);

    const updatedFunctions = [...config.functions];
    updatedFunctions[functionIndex] = updatedFunction;

    await this.configRepository.updateConfig(
      id,
      tenantId,
      {
        functions: updatedFunctions,
      },
      token,
    );

    const updatedConfig = await this.configRepository.findConfigById(
      id,
      tenantId,
      token,
    );

    return {
      success: true,
      message: 'Function updated successfully',
      config: updatedConfig!,
    };
  }

  private createFunctionFromDto(dto: AddFunctionDto): FunctionDefinition {
    if (!dto.functionName?.trim()) {
      throw new BadRequestException('Function name is required');
    }

    const allowedFunctions: AllowedFunctionName[] = [
      'saveTransactionDetails',
      'addAccountHolder',
      'addEntity',
      'addAccount',
    ];
    if (!allowedFunctions.includes(dto.functionName)) {
      throw new BadRequestException(
        `Invalid function name. Only the following functions are allowed: ${allowedFunctions.join(', ')}`,
      );
    }

    if (!dto.params || dto.params.length === 0) {
      throw new BadRequestException(
        'Function must have at least one parameter',
      );
    }

    return {
      functionName: dto.functionName,
      params: dto.params
        .map((p) => {
          const trimmed = p.trim();
          return trimmed === 'TenantId'
            ? `transactionDetails.${trimmed}`
            : `redis.${trimmed}`;
        })
        .filter((p) => p.length > 0),
    };
  }

  private validateFunction(
    func: FunctionDefinition,
    _schema: JSONSchema,
  ): void {
    for (const param of func.params) {
      if (!/^(redis\.|transaction\.)?[a-zA-Z_][a-zA-Z0-9_]*$/.test(param)) {
        throw new BadRequestException(
          `Parameter name '${param}' must be a valid identifier or prefixed identifier (e.g., 'param1', 'redis.param1', or 'transaction.param1')`,
        );
      }
    }
  }

 
  private validateSchema(schema: JSONSchema): {
    success: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!schema.type || schema.type !== 'object') {
      errors.push('Schema must be of type "object"');
    }

    if (!schema.properties || Object.keys(schema.properties).length === 0) {
      errors.push('Schema must have at least one property');
    }

    if (!schema.required || schema.required.length === 0) {
      warnings.push(
        'No required fields defined - consider marking key fields as required',
      );
    }

    return {
      success: errors.length === 0,
      errors,
      warnings,
    };
  }

 

  private createMappingFromDto(dto: AddMappingDto): FieldMapping {
    if (dto.transformation) {
      return this.createMappingWithExplicitTransformation(dto);
    }

    if (dto.sources && dto.sources.length > 0) {
      if (dto.sources.length < 2) {
        throw new BadRequestException(
          'Concat mapping requires at least 2 source fields',
        );
      }
      if (!dto.destination) {
        throw new BadRequestException(
          'Concat mapping requires a destination field',
        );
      }
      const mapping: any = {
        source: dto.sources || [],
        destination: dto.destination,
      };
      if (dto.prefix !== undefined) {
        mapping.prefix = dto.prefix;
      }
      mapping.transformation = 'CONCAT';
      mapping.delimiter = dto.delimiter || ' ';
      return mapping;
    }

    if (dto.sumFields && dto.sumFields.length > 0) {
      if (dto.sumFields.length < 2) {
        throw new BadRequestException(
          'Sum mapping requires at least 2 source fields',
        );
      }
      if (!dto.destination) {
        throw new BadRequestException(
          'Sum mapping requires a destination field',
        );
      }
      const mapping: any = {
        source: dto.sumFields || [],
        destination: dto.destination,
      };
      if (dto.prefix !== undefined) {
        mapping.prefix = dto.prefix;
      }
      mapping.transformation = 'SUM';
      return mapping;
    }

    if (dto.source && dto.destinations && dto.destinations.length > 0) {
      const mapping: any = {
        source: [dto.source],
        destination: dto.destinations,
      };
      if (dto.prefix !== undefined) {
        mapping.prefix = dto.prefix;
      }
      mapping.transformation = 'SPLIT';
      mapping.delimiter = dto.delimiter || ',';
      return mapping;
    }

    if (dto.source && dto.destination) {
      const mapping: any = {
        source: [dto.source],
        destination: dto.destination,
      };
      if (dto.prefix !== undefined) {
        mapping.prefix = dto.prefix;
      }
      mapping.transformation = 'NONE';
      return mapping;
    }

    if (dto.constantValue !== undefined && dto.destination) {
      const mapping: any = {
        destination: dto.destination,
      };
      if (dto.prefix !== undefined) {
        mapping.prefix = dto.prefix;
      }
      mapping.transformation = 'CONSTANT';
      mapping.constantValue = dto.constantValue;
      return mapping;
    }

    throw new BadRequestException(
      'Invalid mapping: provide (source, destination), (sources[], destination), (source, destinations[]), or (constantValue, destination)',
    );
  }

  private createMappingWithExplicitTransformation(
    dto: AddMappingDto,
  ): FieldMapping {
    const mapping: any = {
      transformation: dto.transformation,
    };

    if (dto.prefix !== undefined) {
      mapping.prefix = dto.prefix;
    }

    switch (dto.transformation) {
      case 'CONCAT':
        if (!dto.sources || dto.sources.length < 1) {
          throw new BadRequestException(
            'CONCAT transformation requires at least one source field',
          );
        }
        if (!dto.destination) {
          throw new BadRequestException(
            'CONCAT transformation requires a destination field',
          );
        }
        mapping.source = dto.sources;
        mapping.destination = dto.destination;
        mapping.delimiter = dto.delimiter || ' ';
        break;

      case 'SUM': {
        const sourceFields = dto.sumFields || dto.sources;
        if (!sourceFields || sourceFields.length < 1) {
          throw new BadRequestException(
            'SUM transformation requires at least one source field',
          );
        }
        if (!dto.destination) {
          throw new BadRequestException(
            'SUM transformation requires a destination field',
          );
        }
        mapping.source = sourceFields;
        mapping.destination = dto.destination;
        break;
      }

      case 'MATH': {
        if (!dto.sources || dto.sources.length < 1) {
          throw new BadRequestException(
            'MATH transformation requires at least one source field',
          );
        }
        if (!dto.destination) {
          throw new BadRequestException(
            'MATH transformation requires a destination field',
          );
        }
        if (!dto.operator) {
          throw new BadRequestException(
            'MATH transformation requires an operator (ADD, SUBTRACT, MULTIPLY, DIVIDE)',
          );
        }
        mapping.source = dto.sources;
        mapping.destination = dto.destination;
        mapping.operator = dto.operator;
        break;
      }

      case 'SPLIT': {
        if (!dto.source) {
          throw new BadRequestException(
            'SPLIT transformation requires a source field',
          );
        }
        if (!dto.destinations || dto.destinations.length === 0) {
          throw new BadRequestException(
            'SPLIT transformation requires destination fields',
          );
        }
        mapping.source = [dto.source];
        mapping.destination = dto.destinations;
        mapping.delimiter = dto.delimiter || ',';
        break;
      }

      case 'CONSTANT': {
        if (dto.constantValue === undefined) {
          throw new BadRequestException(
            'CONSTANT transformation requires a constant value',
          );
        }
        if (!dto.destination) {
          throw new BadRequestException(
            'CONSTANT transformation requires a destination field',
          );
        }
        mapping.destination = dto.destination;
        mapping.constantValue = dto.constantValue;
        break;
      }

      case 'NONE':
      default: {
        if (!dto.source) {
          throw new BadRequestException(
            'Direct mapping (NONE transformation) requires a source field',
          );
        }
        if (!dto.destination) {
          throw new BadRequestException(
            'Direct mapping (NONE transformation) requires a destination field',
          );
        }
        mapping.source = [dto.source];
        mapping.destination = dto.destination;
        break;
      }
    }

    return mapping;
  }

  private getFieldTypeFromSchema(
    schema: JSONSchema,
    fieldPath: string,
  ): string | null {
    const pathParts = fieldPath.split('.');
    let current = schema;

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];

      const cleanPart = part.replace(/\[.*\]/, '');
      const hasArrayIndex = part.includes('[');

      const isNumericIndex = /^\d+$/.test(part);

      if (isNumericIndex) {
        continue;
      }

      if (current.type === 'object' && current.properties?.[cleanPart]) {
        current = current.properties[cleanPart] as JSONSchema;

        if (hasArrayIndex && current.type === 'array' && current.items) {
          current = current.items as JSONSchema;
        }
      } else if (current.type === 'array' && current.items) {
        current = current.items as JSONSchema;
        i--;
        continue;
      } else {
        return null;
      }
    }

    return current.type || null;
  }

  private areTypesCompatible(
    sourceType: string,
    destinationType: string,
  ): boolean {
    return sourceType === destinationType;
  }

  private validateNoDuplicateDestination(
    newMapping: FieldMapping,
    existingMappings: FieldMapping[],
    isUpdate = false,
    updateIndex?: number,
  ): void {
    const newDestinations = Array.isArray(newMapping.destination)
      ? newMapping.destination
      : [newMapping.destination];

    for (const newDest of newDestinations) {
      if (typeof newDest !== 'string' || !newDest) {
        continue;
      }

      for (let i = 0; i < existingMappings.length; i++) {
        if (isUpdate && updateIndex !== undefined && i === updateIndex) {
          continue;
        }

        const existingMapping = existingMappings[i];
        const existingDestinations = Array.isArray(existingMapping.destination)
          ? existingMapping.destination
          : [existingMapping.destination];

        for (const existingDest of existingDestinations) {
          if (existingDest === newDest) {
            throw new BadRequestException(
              `Duplicate destination mapping detected: Destination field '${newDest}' is already mapped. Each destination field can only be mapped once. Please remove the existing mapping first or use a different destination field.`,
            );
          }
        }
      }
    }
  }

  // private async validateMapping(
  //   mapping: FieldMapping,
  //   schema: JSONSchema,
  //   _tenantId: string,
  // ): Promise<void> {
  //   if (
  //     mapping.transformation === 'CONSTANT' ||
  //     mapping.constantValue !== undefined
  //   ) {
  //     await this.validateConstantMapping(mapping);
  //     return;
  //   }

  //   const allPaths = this.extractAllPathsFromSchema(schema);
  //   const sourceTypes: string[] = [];
  //   if (mapping.source && Array.isArray(mapping.source)) {
  //     for (const src of mapping.source) {
  //       if (!allPaths.includes(src)) {
  //         throw new BadRequestException(
  //           `Source field '${src}' not found in schema`,
  //         );
  //       }

  //       const sourceType = this.getFieldTypeFromSchema(schema, src);
  //       if (sourceType) {
  //         sourceTypes.push(sourceType);
  //       }
  //     }
  //   }
  //   const destinations = Array.isArray(mapping.destination)
  //     ? mapping.destination
  //     : [mapping.destination];

  //   for (const dest of destinations) {
  //     if (typeof dest !== 'string' || !dest) {
  //       continue;
  //     }

  //     const isValid = await this.tazamaDataModelService.isValidDestinationPath(dest);
  //     if (!isValid) {
  //       throw new BadRequestException(
  //         `Destination field '${dest}' is not a valid Tazama data model field. Use a field from the Tazama internal data model (e.g., transactionDetails.Amt, redis.dbtrId).`,
  //       );
  //     }
  //     const destinationType = await this.tazamaDataModelService.getFieldType(dest);
  //     if (destinationType && sourceTypes.length > 0) {
  //       await this.validateMappingTypeCompatibility(
  //         mapping,
  //         sourceTypes,
  //         destinationType,
  //         dest,
  //       );
  //     }
  //   }
  // }
  // private async validateConstantMapping(mapping: FieldMapping): Promise<void> {
  //   if (mapping.constantValue === undefined) {
  //     return;
  //   }

  //   const destinations = Array.isArray(mapping.destination)
  //     ? mapping.destination
  //     : [mapping.destination];

  //   for (const dest of destinations) {
  //     if (typeof dest !== 'string' || !dest) {
  //       continue;
  //     }
  //     const destinationType = await this.tazamaDataModelService.getFieldType(dest);
  //     if (destinationType) {
  //       const constantType = typeof mapping.constantValue;
  //       const destTypeLower = destinationType.toLowerCase();

  //       if (!this.areTypesCompatible(constantType, destTypeLower)) {
  //         throw new BadRequestException(
  //           `Constant value type mismatch: Cannot assign constant value '${mapping.constantValue}' of type '${constantType}' to destination field '${dest}' of type '${destTypeLower}'.`,
  //         );
  //       }
  //     }
  //   }
  // }

  private async validateMappingTypeCompatibility(
    mapping: FieldMapping,
    sourceTypes: string[],
    destinationType: string,
    destinationPath: string,
  ): Promise<void> {
    const destTypeLower = destinationType.toLowerCase();
    const transformation = mapping.transformation || 'NONE';
    this.logger.debug(
      `Validating mapping type compatibility: ${transformation} transformation`,
      {
        sourceTypes,
        destinationType: destTypeLower,
        destinationPath,
        transformation,
      },
    );

    switch (transformation) {
      case 'CONCAT':
        this.validateConcatTypeCompatibility(
          sourceTypes,
          destTypeLower,
          destinationPath,
          mapping,
        );
        break;

      case 'SUM':
        this.validateSumTypeCompatibility(
          sourceTypes,
          destTypeLower,
          destinationPath,
          mapping,
        );
        break;

      case 'MATH':
        this.validateMathTypeCompatibility(
          sourceTypes,
          destTypeLower,
          destinationPath,
          mapping,
        );
        break;

      case 'SPLIT':
        this.validateSplitTypeCompatibility(
          sourceTypes,
          destTypeLower,
          destinationPath,
          mapping,
        );
        break;

      case 'NONE':
      default:
        this.validateDirectTypeCompatibility(
          sourceTypes,
          destTypeLower,
          destinationPath,
          mapping,
        );
        break;
    }
  }
  private validateConcatTypeCompatibility(
    sourceTypes: string[],
    destinationType: string,
    destinationPath: string,
    mapping: FieldMapping,
  ): void {
    if (destinationType !== 'string') {
      throw new BadRequestException(
        `CONCAT transformation type mismatch: CONCAT operations always produce string results, but destination field '${destinationPath}' is of type '${destinationType}'. Destination field must be of type 'string'.`,
      );
    }
    for (let i = 0; i < sourceTypes.length; i++) {
      const sourceType = sourceTypes[i];
      const src = mapping.source![i];
      if (sourceType !== 'string') {
        throw new BadRequestException(
          `CONCAT transformation type mismatch: Source field '${src}' of type '${sourceType}' cannot be concatenated. Only string type fields are allowed for concatenation.`,
        );
      }
    }
  }
  private validateSumTypeCompatibility(
    sourceTypes: string[],
    destinationType: string,
    destinationPath: string,
    mapping: FieldMapping,
  ): void {
    if (destinationType !== 'number') {
      throw new BadRequestException(
        `SUM transformation type mismatch: SUM operations produce numeric results, but destination field '${destinationPath}' is of type '${destinationType}'. Destination field must be of type 'number'.`,
      );
    }

    for (let i = 0; i < sourceTypes.length; i++) {
      const sourceType = sourceTypes[i];
      const src = mapping.source![i];

      if (sourceType !== 'number') {
        throw new BadRequestException(
          `SUM transformation type mismatch: Source field '${src}' of type '${sourceType}' cannot be summed. Only numeric fields can be used in SUM operations.`,
        );
      }
    }
  }
  private validateMathTypeCompatibility(
    sourceTypes: string[],
    destinationType: string,
    destinationPath: string,
    mapping: FieldMapping,
  ): void {
    if (destinationType !== 'number') {
      throw new BadRequestException(
        `MATH transformation type mismatch: MATH operations produce numeric results, but destination field '${destinationPath}' is of type '${destinationType}'. Destination field must be of type 'number'.`,
      );
    }

    for (let i = 0; i < sourceTypes.length; i++) {
      const sourceType = sourceTypes[i];
      const src = mapping.source![i];

      if (sourceType !== 'number') {
        throw new BadRequestException(
          `MATH transformation type mismatch: Source field '${src}' of type '${sourceType}' cannot be used in mathematical operations. Only numeric fields are allowed.`,
        );
      }
    }

    if (!mapping.operator) {
      throw new BadRequestException(
        'MATH transformation validation error: Mathematical operator (ADD, SUBTRACT, MULTIPLY, DIVIDE) must be specified for MATH transformations.',
      );
    }
  }

  private validateSplitTypeCompatibility(
    sourceTypes: string[],
    destinationType: string,
    destinationPath: string,
    mapping: FieldMapping,
  ): void {
    if (sourceTypes.length !== 1) {
      throw new BadRequestException(
        `SPLIT transformation validation error: SPLIT operations require exactly one source field, but ${sourceTypes.length} source fields were provided.`,
      );
    }

    const sourceType = sourceTypes[0];
    const src = mapping.source![0];

    // Source must be string for splitting
    if (sourceType !== 'string') {
      throw new BadRequestException(
        `SPLIT transformation type mismatch: Source field '${src}' of type '${sourceType}' cannot be split. Only string fields can be split.`,
      );
    }

    // STRICT: Destination must be string type (split results are strings)
    if (destinationType !== 'string') {
      throw new BadRequestException(
        `SPLIT transformation type mismatch: Split results are strings, but destination field '${destinationPath}' is of type '${destinationType}'. Destination field must be of type 'string'.`,
      );
    }
  }

  private validateDirectTypeCompatibility(
    sourceTypes: string[],
    destinationType: string,
    destinationPath: string,
    mapping: FieldMapping,
  ): void {
    if (sourceTypes.length !== 1) {
      throw new BadRequestException(
        `Direct mapping validation error: Direct mappings (NONE transformation) require exactly one source field, but ${sourceTypes.length} source fields were provided.`,
      );
    }

    const sourceType = sourceTypes[0];
    const src = mapping.source![0];

    if (!this.areTypesCompatible(sourceType, destinationType)) {
      throw new BadRequestException(
        `Direct mapping type mismatch: Cannot map source field '${src}' of type '${sourceType}' to destination field '${destinationPath}' of type '${destinationType}'. ` +
          'STRICT TYPE MATCHING: Only exact type matches are allowed. String fields can only map to string fields, number fields can only map to number fields.',
      );
    }
  }

  private extractAllPathsFromSchema(schema: JSONSchema, prefix = ''): string[] {
    const paths: string[] = [];

    if (schema.type === 'object' && schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const path = prefix ? `${prefix}.${propName}` : propName;
        paths.push(path);

        if (propSchema.type === 'object' && propSchema.properties) {
          paths.push(
            ...this.extractAllPathsFromSchema(propSchema as JSONSchema, path),
          );
        }

        if (
          propSchema.type === 'array' &&
          propSchema.items &&
          typeof propSchema.items === 'object' &&
          propSchema.items.type === 'object'
        ) {
          const arrayPaths = this.extractAllPathsFromSchema(
            propSchema.items as JSONSchema,
            `${path}[0]`,
          );
          paths.push(...arrayPaths);

          const dotArrayPaths = this.extractAllPathsFromSchema(
            propSchema.items as JSONSchema,
            `${path}.0`,
          );
          paths.push(...dotArrayPaths);

          const traversalPaths = this.extractAllPathsFromSchema(
            propSchema.items as JSONSchema,
            path,
          );
          paths.push(...traversalPaths);
        }
      }
    }

    return paths;
  }

  // async getFieldInfoFromSchema(
  //   configId: number,
  //   fieldPath: string,
  //   tenantId: string,
  //   token: string,
  // ): Promise<{ type: FieldType; isRequired: boolean } | null> {
  //   const config = await this.configRepository.findConfigById(
  //     configId,
  //     tenantId,
  //     token,
  //   );
  //   if (!config) {
  //     return null;
  //   }

  //   try {
  //     const sourceFields = this.jsonSchemaConverter.convertFromJSONSchema(
  //       config.schema,
  //     );

  //     const findField = (fields: any[], path: string): any => {
  //       for (const field of fields) {
  //         if (field.path === path) {
  //           return field;
  //         }
  //         if (field.children) {
  //           const childField = findField(field.children, path);
  //           if (childField) {
  //             return childField;
  //           }
  //         }
  //       }
  //       return null;
  //     };

  //     const field = findField(sourceFields, fieldPath);
  //     if (field) {
  //       return {
  //         type: field.type,
  //         isRequired: field.isRequired,
  //       };
  //     }
  //   } catch (error) {
  //     this.logger.warn(
  //       `Failed to extract field info for path ${fieldPath}:`,
  //       error,
  //     );
  //   }

  //   return null;
  // }

  // ======================== WORKFLOW METHODS ========================

  async submitForApproval(
    id: number,
    dto: SubmitForApprovalDto,
    tenantId: string,
    userId: string,
    userClaims: string[],
    token: string,
  ): Promise<ConfigResponseDto> {
    const config = await this.getConfigOrThrow(id, tenantId, token);
    const currentStatus = config.status!;
    const action: WorkflowAction = 'submit_for_approval';

    this.validateWorkflowAction(userClaims, currentStatus, action);

    const newStatus = ConfigStatus.UNDER_REVIEW;
    const updatedConfig = await this.updateConfigStatus(
      id,
      tenantId,
      newStatus,
      token,
    );

    return {
      success: true,
      message: 'Configuration submitted for approval successfully',
      config: updatedConfig,
    };
  }
 
  async submitConfig(
    id:number,
    dto: SubmitForApprovalDto,
    user: AuthenticatedUser,
    token:string
  )
  : Promise<ConfigResponseDto> {

    // Retrieve user info from token
    const config = await this.configRepository.findConfigById(
      id,
      user.tenantId,
      token,
    );


    if (!config) {
      throw new NotFoundException(`Config with ID ${id} not found`);
    }


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
        success:true,
        message: `Configuration ${id} submitted for approval successfully`,
      };
      

    }
  async approveConfig(
    id:number,
    dto: ApprovalDto,
    user: AuthenticatedUser,
    token:string
  )
  : Promise<ConfigResponseDto> {

    // Retrieve user info from token
    const config = await this.configRepository.findConfigById(
      id,
      user.tenantId,
      token,
    );


    if (!config) {
      throw new NotFoundException(`Config with ID ${id} not found`);
    }

    const currentStatus = config.status as ConfigStatus;
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
        success:true,
        message: `Configuration ${id} has been approved successfully`,
      };
      

    }

 async rejectConfig(
    id:number,
    dto: SubmitForApprovalDto,
    user: AuthenticatedUser,
    token:string
  )
  : Promise<ConfigResponseDto> {

    // Retrieve user info from token
    const config = await this.configRepository.findConfigById(
      id,
      user.tenantId,
      token,
    );


    if (!config) {
      throw new NotFoundException(`Config with ID ${id} not found`);
    }

    const currentStatus = config.status as ConfigStatus;
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
        success:true,
        message: `Configuration ${id} has been rejected successfully`,
      };
      

    }
  async exportConfig(
    id:number,
    dto: StatusTransitionDto,
    user: AuthenticatedUser,
    token:string
  ): Promise<ConfigResponseDto> {
    const config = await this.configRepository.findConfigById(
      id,
      user.tenantId,
      token,
    );
    if (!config) {
      throw new NotFoundException(`Config with ID ${id} not found`);
    }

    const currentStatus = config.status as ConfigStatus;
    const action: WorkflowAction = 'export';
    this.validateWorkflowAction(user.validClaims || [], currentStatus, action);

    const {tenantId} = user;

    const fileName = `dems_${tenantId}_${id}`;

    try {
      const currentStatus = ConfigStatus.READY_FOR_DEPLOYMENT;
      const configToExport = { ...config, status: currentStatus , msg_fam: config.msgFam, tenant_id: config.tenantId };
      await this.sftpService.createFile(fileName, {
        ...configToExport,
        status: ConfigStatus.DEPLOYED,
      });

      this.logger.log(
        `Successfully uploaded config file (${fileName}) with status '${ConfigStatus.DEPLOYED}' to SFTP servers.`,
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
    // userClaims: string[],

    token: string,
  ): Promise<ConfigResponseDto> {
    // const config = await this.configRepository.findConfigById(
    //   id,
    //   tenantId,
    //   token,
    // );
    // if (!config) {
    //   throw new NotFoundException(`Config with ID ${id} not found`);
    // }

    // Validate workflow action permissions and status transition
    // const currentStatus = config.status as ConfigStatus;
    // const action: WorkflowAction = 'deploy';
    // this.validateWorkflowAction(user.validClaims || [], currentStatus, action);

    const fileName = `dems_${tenantId}_${id}`;
    let sftpConfigStatus: ConfigStatus;
    let configData: any;
    try {
      this.logger.log(`Reading config file from SFTP: ${fileName}`);
      configData = await this.sftpService.readFile(fileName) as Config;
      sftpConfigStatus = configData.status as ConfigStatus;
      this.logger.log(`Config data retrieved: ${configData}`);
      // this.logger.log(
      //   `Successfully read config file from SFTP with status: ${currentStatus}`
      // );
    }

    //   if (configData?.status) {
    //     currentStatus = configData.status as ConfigStatus;
    //   } else if (config.status) {
    //     currentStatus = ConfigStatus.READY_FOR_DEPLOYMENT;
    //   } else {
    //     throw new BadRequestException(
    //       `Cannot deploy config ${id}: status not found in SFTP or database. Please ensure the config has been exported first.`,
    //     );
    //   }
    catch (error) {
      // if (config.status) {
      //   currentStatus = config.status;
      // } else {
        throw new BadRequestException(
          `Cannot deploy config ${id}: status is undefined and SFTP read failed. Error: ${error.message}`,
        );
      // }
    }

    // const action: WorkflowAction = 'deploy';
    // const validation = this.workflowService.canPerformAction(
    //   userClaims,
    //   currentStatus,
    //   action,
    // );

    // if (!validation.canPerform) {
    //   throw new ForbiddenException(validation.message);
    // }

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

      const {transactionType} = configData ;
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
      const {functions} = configData;
      const datamodelFn = Array.isArray(functions)
    ? functions.find((fn) => fn.functionName === 'addDatamodelTable')
    : functions;
    if (datamodelFn)
        {
        this.logger.log(`Creating datamodel table as per function: ${functions.functionName}`);
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

      // await this.configRepository.updateConfigStatus(
      //   id,
      //   tenantId,
      //   newStatus,
      //   token,
      // );
           
      // Use configData as the deployedConfig for notification
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



  private async logStatusChange(
    configId: number,
    previousStatus: ConfigStatus,
    newStatus: ConfigStatus,
    action: WorkflowAction,
    performedBy: string,
    comment?: string,
  ): Promise<void> {
    this.logger.log(
      `Config ${configId}: Status changed from ${previousStatus} to ${newStatus} by ${performedBy} (${action})${comment ? ` - ${comment}` : ''}`,
    );
  }

  private getStatusDescription(status: string): string {
    const descriptions: Record<string, string> = {
      [ConfigStatus.IN_PROGRESS]: 'Configuration is being edited',
      [ConfigStatus.ON_HOLD]: 'Configuration is on hold',
      [ConfigStatus.UNDER_REVIEW]: 'Configuration is under review by approvers',
      [ConfigStatus.APPROVED]:
        'Configuration has been approved and ready for export',
      [ConfigStatus.REJECTED]: 'Configuration has been rejected',
      [ConfigStatus.EXPORTED]: 'Configuration has been exported to SFTP',
      [ConfigStatus.READY_FOR_DEPLOYMENT]:
        'Configuration is ready for deployment',
      [ConfigStatus.DEPLOYED]: 'Configuration has been deployed to production',
    };

    return descriptions[status] || status;
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

  // private enrichConfigWithSourceFields(config: Config): ConfigWithSourceFields {
  //   try {
  //     if (config && config.schema) {
  //       const hierarchicalFields =
  //         this.jsonSchemaConverter.convertFromJSONSchema(config.schema);

  //       this.logger.debug(
  //         `Hierarchical fields count: ${hierarchicalFields.length}`,
  //       );
  //       if (hierarchicalFields.length > 0) {
  //         this.logger.debug(
  //           `First hierarchical field: ${JSON.stringify(hierarchicalFields[0])}`,
  //         );
  //       }

  //       const sourceFields = this.flattenSchemaFields(hierarchicalFields);

  //       this.logger.debug(
  //         `Flattened source fields count: ${sourceFields.length}`,
  //       );
  //       if (sourceFields.length === 0) {
  //         this.logger.warn(
  //           'No source fields found after flattening. This might indicate an issue with schema structure.',
  //         );
  //         this.logger.debug(`Schema: ${JSON.stringify(config.schema)}`);
  //         this.logger.debug(
  //           `Hierarchical fields: ${JSON.stringify(hierarchicalFields)}`,
  //         );
  //       }

  //       return {
  //         ...config,
  //         sourceFields,
  //       };
  //     }
  //   } catch (error) {
  //     this.logger.error(
  //       `Failed to enrich config with source fields: ${error.message}`,
  //     );
  //     this.logger.error(`Error stack: ${error.stack}`);
  //   }
  //   return config;
  // }

  private flattenSchemaFields(fields: SchemaField[]): SchemaField[] {
    const flattened: SchemaField[] = [];

    for (const field of fields) {
      flattened.push({
        name: field.name,
        path: field.path,
        type: field.type,
        isRequired: field.isRequired,
      });
      if (field.children && field.children.length > 0) {
        const flattenedChildren = this.flattenSchemaFields(field.children);
        flattened.push(...flattenedChildren);
      }
    }

    return flattened;
  }

  // ============================================================================
  // Additional Service Methods (routed through repository)
  // ============================================================================

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

  async deleteConfigViaWrite(
    id: number,
    token: string,
  ): Promise<void> {
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

  // async getAuditHistory(
  //   id: number,
  //   token: string,
  // ): Promise<any> {
  //   return await this.configRepository.getAuditHistory(id, token);
  // }

  // async updateStatusDirect(
  //   id: number,
  //   status: string,
  //   token: string,
  // ): Promise<any> {
  //   return await this.configRepository.updateStatusDirect(id, status, token);
  // }


  async getConfigById(
    id: number,
    tenantId: string,
    token: string,
  ): Promise<ConfigResponseDto> {
    const config = await this.configRepository.findConfigById(
      id,
      tenantId,
      token,
    );
    if (!config) {
      throw new NotFoundException(`Configuration with ID ${id} not found`);
    }
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

  // async getPendingApprovals(
  //   offset: number,
  //   limit: number,
  //   token: string,
  // ): Promise<any[]> {
  //   return await this.configRepository.getPendingApprovals(
  //     offset,
  //     limit,
  //     token,
  //   );
  // }

  // async getConfigsByTransactionType(
  //   type: string,
  //   offset: number,
  //   limit: number,
  //   token: string,
  // ): Promise<Config[]> {
  //   return await this.configRepository.findConfigsByTransactionType(
  //     type,
  //     token,
  //     token,
  //     limit,
  //     offset,
  //   );
  // }

  // async getConfigByEndpoint(
  //   path: string,
  //   version: string,
  //   offset: number,
  //   limit: number,
  //   token: string,
  // ): Promise<Config[]> {
  //   return await this.configRepository.findConfigByEndpoint(
  //     path,
  //     version,
  //     token,
  //     token,
  //     limit,
  //     offset,
  //   );
  // }

  // async returnToProgress(
  //   id: number,
  //   data: any,
  //   token: string,
  // ): Promise<any> {
  //   return await this.configRepository.returnToProgress(id, data, token);
  // }

  // async getWorkflowStatus(
  //   id: number,
  //   token: string,
  // ): Promise<any> {
  //   return await this.configRepository.getWorkflowStatus(id, token);
  // }
}
