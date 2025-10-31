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
  applyFieldAdjustments,
} from '@tazama-lf/tcs-lib';
import { AuditService } from '../audit/audit.service';
import { JSONSchemaConverterService } from '../schemas/json-schema-converter.service';
import { SchemaInferenceService } from '../schemas/schema-inference.service';

import { TazamaDataModelService } from '../tazama-data-model/tazama-data-model.service';
import { ConfigWorkflowService } from './config-workflow.service';
import { SftpService } from '../sftp/sftp.service';
import { ConfigService as NestConfigService } from '@nestjs/config';
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
  ChangeRequestDto,
  DeploymentDto,
  WorkflowAction,
} from './config.interfaces';

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);

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

  constructor(
    private readonly configRepository: ConfigRepository,
    private readonly auditService: AuditService,
    private readonly jsonSchemaConverter: JSONSchemaConverterService,
    private readonly schemaInference: SchemaInferenceService,
    private readonly tazamaDataModelService: TazamaDataModelService,
    private readonly workflowService: ConfigWorkflowService,
    private readonly sftpService: SftpService,
    private readonly nestConfigService: NestConfigService,
  ) {}

  async createConfig(
    dto: CreateConfigDto,
    tenantId: string,
    userId: string,
  ): Promise<ConfigResponseDto> {
    this.logger.log(
      `Creating config for msgFam: ${dto.msgFam}, transactionType: ${dto.transactionType}, version: ${dto.version}`,
      `Payload: ${dto.payload}`,
      `ContentType: ${dto.contentType}`,
      `TenantId: ${tenantId}`,
      `UserId: ${userId}`,
    );

    try {
      const version = dto.version || 'v1';
      const msgFam = dto.msgFam || 'unknown';
      this.logger.log(
        `Checking uniqueness for msgFam: ${msgFam}, transactionType: ${dto.transactionType}, version: ${version}, tenantId: ${tenantId}`,
      );
      const existingConfig =
        await this.configRepository.findConfigByMsgFamVersionAndTransactionType(
          msgFam,
          version,
          dto.transactionType,
          tenantId,
        );
      if (existingConfig) {
        this.logger.warn(
          `Duplicate config found for msgFam: ${msgFam}, transactionType: ${dto.transactionType}, version: ${version}, tenantId: ${tenantId}`,
        );
        return {
          success: false,
          message: `Config with message family '${msgFam}', transaction type '${dto.transactionType}', and version '${version}' already exists for this tenant. Please use different values.`,
        };
      }

      if (!dto.payload) {
        return {
          success: false,
          message:
            'Payload is required. Provide either payload text or upload a file.',
        };
      }

      // Use local schema inference service instead of external library
      let sourceFields;
      try {
        sourceFields = await this.schemaInference.inferSchemaFromPayload(
          dto.payload,
          dto.contentType || ContentType.JSON,
        );

        if (!sourceFields || sourceFields.length === 0) {
          this.logger.error('Schema inference returned no source fields');
          return {
            success: false,
            message: 'Failed to generate fields from payload',
            validation: {
              success: false,
              errors: ['No fields generated'],
              warnings: [],
            },
          };
        }
      } catch (error) {
        this.logger.error('Schema inference failed:', error);
        return {
          success: false,
          message: 'Failed to parse payload',
          validation: {
            success: false,
            errors: ['Schema inference failed'],
            warnings: [],
          },
        };
      }

      const duplicateErrors =
        this.validateNoDuplicateSchemaFields(sourceFields);
      if (duplicateErrors.length > 0) {
        this.logger.error(
          'Duplicate fields detected in schema during config creation',
          {
            errors: duplicateErrors,
            tenantId,
            userId,
            msgFam: dto.msgFam,
            transactionType: dto.transactionType,
            version: dto.version,
            contentType: dto.contentType,
            totalSourceFields: sourceFields.length,
            context: 'createConfig',
          },
        );
        return {
          success: false,
          message: 'Schema contains duplicate fields',
          validation: {
            success: false,
            errors: duplicateErrors,
            warnings: [],
          },
        };
      }

      if (dto.fieldAdjustments && dto.fieldAdjustments.length > 0) {
        this.logger.log(
          `Applying ${dto.fieldAdjustments.length} field adjustments`,
        );

        sourceFields = applyFieldAdjustments(
          sourceFields,
          dto.fieldAdjustments,
        );

        this.logger.log('Successfully applied field adjustments');
      } else {
        this.logger.log('No field adjustments to apply');
      }

      // Generate JSON schema from source fields using backend's converter
      const finalSchema =
        this.jsonSchemaConverter.convertToJSONSchema(sourceFields);

      this.logger.log(
        `Generated schema with ${Object.keys(finalSchema.properties || {}).length} properties`,
      );

      const validation = this.validateSchema(finalSchema);
      if (!validation.success) {
        return {
          success: false,
          message: 'Schema validation failed',
          validation,
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
        schema: finalSchema,
        mapping: dto.mapping,
        status: ConfigStatus.IN_PROGRESS,
        tenantId,
        createdBy: userId,
      };

      const configId = await this.configRepository.createConfig(configData);

      await this.auditService.logAction({
        entityType: 'CONFIG',
        action: 'CREATE_CONFIG',
        actor: userId,
        tenantId,
        endpointName: `${dto.msgFam || ''} - ${endpointPath}`,
      });

      const config = await this.configRepository.findConfigById(
        configId,
        tenantId,
      );

      this.logger.log('Successfully created config ' + configId);

      return {
        success: true,
        message: 'Config created successfully',
        config: config!,
        validation,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create config: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        message: `Failed to create config: ${error.message}`,
      };
    }
  }

  async cloneConfig(
    dto: CloneConfigDto,
    tenantId: string,
    userId: string,
  ): Promise<ConfigResponseDto> {
    try {
      const sourceConfig = await this.configRepository.findConfigById(
        dto.sourceConfigId,
        tenantId,
      );

      if (!sourceConfig) {
        return {
          success: false,
          message: `Source config with ID ${dto.sourceConfigId} not found`,
        };
      }

      // Check if the new combination already exists for this tenant
      const newMsgFam = dto.newMsgFam || sourceConfig.msgFam;
      const newVersion = dto.newVersion || sourceConfig.version;

      const existingConfig =
        await this.configRepository.findConfigByMsgFamVersionAndTransactionType(
          newMsgFam,
          newVersion,
          dto.newTransactionType,
          tenantId,
        );

      if (existingConfig) {
        return {
          success: false,
          message: `Config with message family '${newMsgFam}', transaction type '${dto.newTransactionType}', and version '${newVersion}' already exists for this tenant. Please use different values.`,
        };
      }

      // Prepare the new config data by cloning the source
      // Generate new endpoint path
      const newEndpointPath = this.generateEndpointPath(
        tenantId,
        newVersion,
        dto.newTransactionType,
        newMsgFam,
      );

      // Handle field adjustments if provided
      let finalSchema = sourceConfig.schema;
      if (dto.fieldAdjustments && dto.fieldAdjustments.length > 0) {
        this.logger.log(
          `Applying ${dto.fieldAdjustments.length} field adjustments to cloned config`,
        );

        // Convert existing schema to source fields first
        const existingSourceFields =
          this.jsonSchemaConverter.convertFromJSONSchema(sourceConfig.schema);

        const adjustedSourceFields = applyFieldAdjustments(
          existingSourceFields,
          dto.fieldAdjustments,
        );

        finalSchema =
          this.jsonSchemaConverter.convertToJSONSchema(adjustedSourceFields);

        this.logger.log(
          'Successfully applied field adjustments to cloned config',
        );

        const validation = this.validateSchema(finalSchema);
        if (!validation.success) {
          return {
            success: false,
            message: 'Adjusted schema validation failed',
            validation,
          };
        }
      }

      const newConfigData: Omit<Config, 'id' | 'createdAt' | 'updatedAt'> = {
        msgFam: newMsgFam,
        transactionType: dto.newTransactionType,
        endpointPath: newEndpointPath,
        version: newVersion,
        contentType: sourceConfig.contentType,
        schema: finalSchema,
        mapping: sourceConfig.mapping, // Clone the mappings
        status: ConfigStatus.IN_PROGRESS,
        tenantId,
        createdBy: userId,
      };

      const newConfigId =
        await this.configRepository.createConfig(newConfigData);

      await this.auditService.logAction({
        entityType: 'CONFIG',
        action: 'CLONE_CONFIG',
        actor: userId,
        tenantId,
        endpointName: `${newMsgFam} - ${newEndpointPath} (cloned from ${dto.sourceConfigId})`,
      });

      const newConfig = await this.configRepository.findConfigById(
        newConfigId,
        tenantId,
      );

      this.logger.log(
        `Successfully cloned config ${dto.sourceConfigId} to new config ${newConfigId}`,
      );

      const validation = this.validateSchema(finalSchema);

      return {
        success: true,
        message: 'Config cloned successfully',
        config: newConfig!,
        validation,
      };
    } catch (error) {
      this.logger.error(
        `Failed to clone config: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        message: `Failed to clone config: ${error.message}`,
      };
    }
  }

  async getConfigById(id: number, tenantId: string): Promise<Config | null> {
    return this.configRepository.findConfigById(id, tenantId);
  }

  // Test method to verify TypeScript compilation - updated
  async testMethod(): Promise<boolean> {
    return true;
  }

  async getConfigByEndpoint(
    endpointPath: string,
    version: string,
    tenantId: string,
  ): Promise<Config | null> {
    return this.configRepository.findConfigByEndpoint(
      endpointPath,
      version,
      tenantId,
    );
  }

  async getAllConfigs(tenantId: string): Promise<Config[]> {
    return this.configRepository.findConfigsByTenant(tenantId);
  }

  async getPendingApprovals(tenantId: string): Promise<Config[]> {
    const allConfigs =
      await this.configRepository.findConfigsByTenant(tenantId);
    return allConfigs.filter((config) => {
      const status: string | undefined = config.status as string | undefined;
      return status === 'under_review' || status === 'approved';
    });
  }

  async getConfigsByTransactionType(
    transactionType: TransactionType,
    tenantId: string,
  ): Promise<Config[]> {
    return this.configRepository.findConfigsByTransactionType(
      transactionType,
      tenantId,
    );
  }

  async updateConfig(
    id: number,
    dto: UpdateConfigDto,
    tenantId: string,
    userId: string,
  ): Promise<ConfigResponseDto> {
    const config = await this.configRepository.findConfigById(id, tenantId);

    if (!config) {
      throw new NotFoundException(`Config with ID ${id} not found`);
    }

    // WORKFLOW CHECK: Prevent editing if not in editable state
    const editValidation = this.workflowService.canEditConfig(
      config.status as ConfigStatus,
    );
    if (!editValidation.canEdit) {
      return {
        success: false,
        message: editValidation.message || 'Editing not allowed.',
      };
    }

    if (dto.schema) {
      const validation = this.validateSchema(dto.schema);
      if (!validation.success) {
        return {
          success: false,
          message: 'Schema validation failed',
          validation,
        };
      }
    }

    // Handle field adjustments if provided
    let finalSchema = dto.schema;
    if (dto.fieldAdjustments && dto.fieldAdjustments.length > 0) {
      this.logger.log(
        `Applying ${dto.fieldAdjustments.length} field adjustments to config ${id}`,
      );

      // Use existing schema as base if no new schema provided
      const baseSchema = dto.schema || config.schema;

      // Convert existing schema to source fields first
      const existingSourceFields =
        this.jsonSchemaConverter.convertFromJSONSchema(baseSchema);

      // Apply field adjustments
      const adjustedSourceFields = applyFieldAdjustments(
        existingSourceFields,
        dto.fieldAdjustments,
      );

      const duplicateErrors =
        this.validateNoDuplicateSchemaFields(adjustedSourceFields);
      if (duplicateErrors.length > 0) {
        this.logger.error(
          'Duplicate fields detected after field adjustments during config update',
          {
            errors: duplicateErrors,
            configId: id,
            tenantId,
            userId,
            fieldAdjustments: dto.fieldAdjustments,
            totalAdjustedFields: adjustedSourceFields.length,
            context: 'updateConfig',
          },
        );
        return {
          success: false,
          message: 'Field adjustments resulted in duplicate fields',
          validation: {
            success: false,
            errors: duplicateErrors,
            warnings: [],
          },
        };
      }

      // Regenerate JSON schema with adjusted fields
      finalSchema =
        this.jsonSchemaConverter.convertToJSONSchema(adjustedSourceFields);

      this.logger.log(
        'Successfully applied field adjustments and regenerated schema',
      );

      // Validate the adjusted schema
      const validation = this.validateSchema(finalSchema);
      if (!validation.success) {
        return {
          success: false,
          message: 'Adjusted schema validation failed',
          validation,
        };
      }
    }

    // IN-PLACE UPDATE: Update the same config row regardless of field changes
    // (as long as status is not COMPLETED/approved)
    const updateData = { ...dto };

    // Use finalSchema if field adjustments were applied
    if (finalSchema) {
      updateData.schema = finalSchema;
    }

    // Check if msgFam or version is changing - if so, CREATE NEW CONFIG instead of updating
    const isVersionChanging =
      dto.version !== undefined && dto.version !== config.version;
    const isMsgFamChanging =
      dto.msgFam !== undefined && dto.msgFam !== config.msgFam;

    if (isVersionChanging || isMsgFamChanging) {
      // msgFam or version change = NEW ENDPOINT = CREATE NEW CONFIG
      this.logger.log(
        `msgFam or version changed for config ${id}. Creating NEW config instead of updating.`,
      );

      const newVersion = dto.version ?? config.version;
      const newTransactionType = dto.transactionType ?? config.transactionType;
      const newMsgFam = dto.msgFam ?? config.msgFam;

      // Check if this new combination already exists
      const existingConfig =
        await this.configRepository.findConfigByMsgFamVersionAndTransactionType(
          newMsgFam,
          newVersion,
          newTransactionType,
          tenantId,
        );

      if (existingConfig) {
        return {
          success: false,
          message: `Config with message family '${newMsgFam}', transaction type '${newTransactionType}', and version '${newVersion}' already exists for this tenant. Please use different values.`,
        };
      }

      // Create new config by inserting directly into repository
      const newEndpointPath = this.generateEndpointPath(
        tenantId,
        newVersion,
        newTransactionType,
        newMsgFam,
      );

      const newConfigData = {
        msgFam: newMsgFam,
        version: newVersion,
        transactionType: newTransactionType,
        endpointPath: newEndpointPath,
        contentType: config.contentType,
        schema: finalSchema || config.schema,
        mapping: dto.mapping ?? config.mapping,
        functions: dto.functions ?? config.functions,
        status: ConfigStatus.IN_PROGRESS,
        tenantId,
        createdBy: userId,
      };

      this.logger.log(
        `Creating new config with msgFam: ${newMsgFam}, version: ${newVersion}, transactionType: ${newTransactionType}`,
      );

      const newConfigId = await this.configRepository.createConfig(
        newConfigData as any,
      );

      await this.auditService.logAction({
        entityType: 'CONFIG',
        action: 'CREATE_CONFIG',
        actor: userId,
        tenantId,
        endpointName: `Config ${newConfigId} (created from update of config ${id})`,
      });

      const newConfig = await this.configRepository.findConfigById(
        newConfigId,
        tenantId,
      );

      return {
        success: true,
        message: `msgFam or version changed. Created new config with ID ${newConfigId} instead of updating existing config ${id}.`,
        config: newConfig!,
      };
    }

    // If only transactionType is changing (not msgFam or version), check for conflicts
    const isTransactionTypeChanging =
      dto.transactionType !== undefined &&
      dto.transactionType !== config.transactionType;

    if (isTransactionTypeChanging) {
      const newTransactionType = dto.transactionType!;

      const existingConfig =
        await this.configRepository.findConfigByMsgFamVersionAndTransactionType(
          config.msgFam,
          config.version,
          newTransactionType,
          tenantId,
        );

      if (existingConfig && existingConfig.id !== id) {
        return {
          success: false,
          message: `Config with message family '${config.msgFam}', transaction type '${newTransactionType}', and version '${config.version}' already exists for this tenant. Please use different values.`,
        };
      }
    }

    // Auto-regenerate endpoint path if needed
    if (
      dto.transactionType !== undefined ||
      dto.msgFam !== undefined ||
      dto.version !== undefined
    ) {
      const newTransactionType = dto.transactionType ?? config.transactionType;
      const newMsgFam = dto.msgFam ?? config.msgFam;
      const newVersion = dto.version ?? config.version;

      updateData.endpointPath = this.generateEndpointPath(
        tenantId,
        newVersion,
        newTransactionType,
        newMsgFam,
      );

      this.logger.log(
        `Auto-generated new endpoint path: ${updateData.endpointPath} for config ${id}`,
      );
    }

    await this.configRepository.updateConfig(id, tenantId, updateData);

    await this.auditService.logAction({
      entityType: 'CONFIG',
      action: 'UPDATE_CONFIG',
      actor: userId,
      tenantId,
      endpointName: `Config ${id}`,
    });

    const updatedConfig = await this.configRepository.findConfigById(
      id,
      tenantId,
    );

    return {
      success: true,
      message: 'Config updated successfully',
      config: updatedConfig!,
    };
  }

  async deleteConfig(
    id: number,
    tenantId: string,
    userId: string,
  ): Promise<ConfigResponseDto> {
    const config = await this.configRepository.findConfigById(id, tenantId);

    if (!config) {
      throw new NotFoundException(`Config with ID ${id} not found`);
    }

    await this.configRepository.deleteConfig(id, tenantId);

    await this.auditService.logAction({
      entityType: 'CONFIG',
      action: 'DELETE_CONFIG',
      actor: userId,
      tenantId,
      endpointName: `Config ${id}`,
    });

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
  ): Promise<ConfigResponseDto> {
    const config = await this.configRepository.findConfigById(id, tenantId);

    if (!config) {
      throw new NotFoundException(`Config with ID ${id} not found`);
    }

    const newMapping = this.createMappingFromDto(mappingDto);
    this.validateMapping(newMapping, config.schema, tenantId);

    const updatedMappings = [...(config.mapping || []), newMapping];

    await this.configRepository.updateConfig(id, tenantId, {
      mapping: updatedMappings,
    });

    await this.auditService.logAction({
      entityType: 'MAPPING',
      action: 'ADD_MAPPING',
      actor: userId,
      tenantId,
      endpointName: `Config ${id}`,
    });

    const updatedConfig = await this.configRepository.findConfigById(
      id,
      tenantId,
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
  ): Promise<ConfigResponseDto> {
    const config = await this.configRepository.findConfigById(id, tenantId);

    if (!config) {
      throw new NotFoundException(`Config with ID ${id} not found`);
    }

    if (!config.mapping || mappingIndex >= config.mapping.length) {
      throw new BadRequestException('Invalid mapping index');
    }

    const updatedMappings = config.mapping.filter(
      (_, idx) => idx !== mappingIndex,
    );

    await this.configRepository.updateConfig(id, tenantId, {
      mapping: updatedMappings.length > 0 ? updatedMappings : [],
    });

    await this.auditService.logAction({
      entityType: 'MAPPING',
      action: 'REMOVE_MAPPING',
      actor: userId,
      tenantId,
      endpointName: `Config ${id}`,
    });

    const updatedConfig = await this.configRepository.findConfigById(
      id,
      tenantId,
    );

    return {
      success: true,
      message: 'Mapping removed successfully',
      config: updatedConfig!,
    };
  }

  async updateMapping(
    id: number,
    mappingIndex: number,
    mappingDto: AddMappingDto,
    tenantId: string,
    userId: string,
  ): Promise<ConfigResponseDto> {
    const config = await this.configRepository.findConfigById(id, tenantId);

    if (!config) {
      throw new NotFoundException(`Config with ID ${id} not found`);
    }

    if (!config.mapping || mappingIndex >= config.mapping.length) {
      throw new BadRequestException('Invalid mapping index');
    }

    const updatedMapping = this.createMappingFromDto(mappingDto);
    this.validateMapping(updatedMapping, config.schema, tenantId);

    const updatedMappings = [...config.mapping];
    updatedMappings[mappingIndex] = updatedMapping;

    await this.configRepository.updateConfig(id, tenantId, {
      mapping: updatedMappings,
    });

    await this.auditService.logAction({
      entityType: 'MAPPING',
      action: 'UPDATE_MAPPING',
      actor: userId,
      tenantId,
      endpointName: `Config ${id}`,
    });

    const updatedConfig = await this.configRepository.findConfigById(
      id,
      tenantId,
    );

    return {
      success: true,
      message: 'Mapping updated successfully',
      config: updatedConfig!,
    };
  }

  async addFunction(
    id: number,
    functionDto: AddFunctionDto,
    tenantId: string,
    userId: string,
  ): Promise<ConfigResponseDto> {
    const config = await this.configRepository.findConfigById(id, tenantId);

    if (!config) {
      throw new NotFoundException(`Config with ID ${id} not found`);
    }

    const newFunction = this.createFunctionFromDto(functionDto);
    this.validateFunction(newFunction, config.schema);

    const updatedFunctions = [...(config.functions || []), newFunction];

    await this.configRepository.updateConfig(id, tenantId, {
      functions: updatedFunctions,
    });

    await this.auditService.logAction({
      entityType: 'FUNCTION',
      action: 'ADD_FUNCTION',
      actor: userId,
      tenantId,
      endpointName: `Config ${id}`,
    });

    const updatedConfig = await this.configRepository.findConfigById(
      id,
      tenantId,
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
  ): Promise<ConfigResponseDto> {
    const config = await this.configRepository.findConfigById(id, tenantId);

    if (!config) {
      throw new NotFoundException(`Config with ID ${id} not found`);
    }

    if (!config.functions || functionIndex >= config.functions.length) {
      throw new BadRequestException('Invalid function index');
    }

    const updatedFunctions = config.functions.filter(
      (_, idx) => idx !== functionIndex,
    );

    await this.configRepository.updateConfig(id, tenantId, {
      functions: updatedFunctions.length > 0 ? updatedFunctions : [],
    });

    await this.auditService.logAction({
      entityType: 'FUNCTION',
      action: 'REMOVE_FUNCTION',
      actor: userId,
      tenantId,
      endpointName: `Config ${id}`,
    });

    const updatedConfig = await this.configRepository.findConfigById(
      id,
      tenantId,
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
  ): Promise<ConfigResponseDto> {
    const config = await this.configRepository.findConfigById(id, tenantId);

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

    await this.configRepository.updateConfig(id, tenantId, {
      functions: updatedFunctions,
    });

    await this.auditService.logAction({
      entityType: 'FUNCTION',
      action: 'UPDATE_FUNCTION',
      actor: userId,
      tenantId,
      endpointName: `Config ${id}`,
    });

    const updatedConfig = await this.configRepository.findConfigById(
      id,
      tenantId,
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
      'addAccountHolder',
      'addEntity',
      'addAccount',
      'transactionRelationship',
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
          // tenantId gets transaction. prefix, others get redis. prefix
          return trimmed === 'tenantId'
            ? `transaction.${trimmed}`
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

  private collectAllPaths(fields: any[]): string[] {
    const paths: string[] = [];

    const traverse = (fieldList: any[]) => {
      for (const field of fieldList) {
        paths.push(field.path);
        if (field.children && field.children.length > 0) {
          traverse(field.children);
        }
      }
    };

    traverse(fields);
    return paths;
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

  private validateNoDuplicateSchemaFields(sourceFields: any[]): string[] {
    const errors: string[] = [];
    const seenNames = new Set<string>();
    const seenPaths = new Set<string>();
    const duplicateNames: string[] = [];
    const duplicatePaths: string[] = [];

    for (let i = 0; i < sourceFields.length; i++) {
      const field = sourceFields[i];

      if (!field.name || !field.path) {
        continue; // Skip invalid fields
      }

      // Check for duplicate field names
      if (seenNames.has(field.name)) {
        const errorMsg = `Duplicate field name '${field.name}' found in schema`;
        errors.push(errorMsg);
        duplicateNames.push(field.name);

        // Log detailed error information
        this.logger.error(`Schema validation failed: ${errorMsg}`, {
          duplicateFieldName: field.name,
          fieldPath: field.path,
          fieldType: field.type,
          fieldIndex: i,
          context: 'validateNoDuplicateSchemaFields',
        });
      } else {
        seenNames.add(field.name);
      }

      // Check for duplicate field paths
      if (seenPaths.has(field.path)) {
        const errorMsg = `Duplicate field path '${field.path}' found in schema`;
        errors.push(errorMsg);
        duplicatePaths.push(field.path);

        // Log detailed error information
        this.logger.error(`Schema validation failed: ${errorMsg}`, {
          duplicateFieldPath: field.path,
          fieldName: field.name,
          fieldType: field.type,
          fieldIndex: i,
          context: 'validateNoDuplicateSchemaFields',
        });
      } else {
        seenPaths.add(field.path);
      }
    }

    // Log summary if duplicates were found
    if (errors.length > 0) {
      this.logger.error(
        `Schema contains ${errors.length} duplicate field error(s)`,
        {
          totalErrors: errors.length,
          duplicateFieldNames: duplicateNames,
          duplicateFieldPaths: duplicatePaths,
          totalFieldsProcessed: sourceFields.length,
          context: 'validateNoDuplicateSchemaFields',
        },
      );
    }

    return errors;
  }

  private createMappingFromDto(dto: AddMappingDto): FieldMapping {
    // Handle explicit transformation specification
    if (dto.transformation) {
      return this.createMappingWithExplicitTransformation(dto);
    }

    // Legacy behavior: Auto-detect transformation based on input fields

    // Many-to-one (concat logic)
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

    // Many-to-one (sum logic)
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

    // One-to-many (split logic)
    if (dto.source && dto.destinations && dto.destinations.length > 0) {
      const mapping: any = {
        source: [dto.source], // Always use array format for consistency
        destination: dto.destinations,
      };
      if (dto.prefix !== undefined) {
        mapping.prefix = dto.prefix;
      }
      mapping.transformation = 'SPLIT';
      mapping.delimiter = dto.delimiter || ',';
      return mapping;
    }

    // Simple mapping
    if (dto.source && dto.destination) {
      const mapping: any = {
        source: [dto.source], // Always use array format for consistency
        destination: dto.destination,
      };
      if (dto.prefix !== undefined) {
        mapping.prefix = dto.prefix;
      }
      mapping.transformation = 'NONE';
      return mapping;
    }

    // Constant mapping
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

  /**
   * Create mapping with explicitly specified transformation
   */
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
    // STRICT TYPE MATCHING: Only exact type matches are allowed
    // No type conversions are permitted (string <-> number, etc.)
    return sourceType === destinationType;
  }

  private validateMapping(
    mapping: FieldMapping,
    schema: JSONSchema,
    _tenantId: string,
  ): void {
    // CONSTANT transformations skip source type validation since they don't use source fields
    if (
      mapping.transformation === 'CONSTANT' ||
      mapping.constantValue !== undefined
    ) {
      // Still validate destination type for constants
      this.validateConstantMapping(mapping);
      return;
    }

    const allPaths = this.extractAllPathsFromSchema(schema);
    const sourceTypes: string[] = [];

    // Validate source fields exist and get their types
    if (mapping.source && Array.isArray(mapping.source)) {
      for (const src of mapping.source) {
        if (!allPaths.includes(src)) {
          throw new BadRequestException(
            `Source field '${src}' not found in schema`,
          );
        }

        // Get source field type
        const sourceType = this.getFieldTypeFromSchema(schema, src);
        if (sourceType) {
          sourceTypes.push(sourceType);
        }
      }
    }

    // Validate destinations exist and check type compatibility
    const destinations = Array.isArray(mapping.destination)
      ? mapping.destination
      : [mapping.destination];

    for (const dest of destinations) {
      if (typeof dest !== 'string' || !dest) {
        continue;
      }

      const isValid = this.tazamaDataModelService.isValidDestinationPath(dest);
      if (!isValid) {
        throw new BadRequestException(
          `Destination field '${dest}' is not a valid Tazama data model field. Use a field from the Tazama internal data model (e.g., entities.id, accounts.id, transactionDetails.Amt).`,
        );
      }

      // Get destination field type and perform comprehensive type validation
      const destinationType = this.tazamaDataModelService.getFieldType(dest);
      if (destinationType && sourceTypes.length > 0) {
        this.validateMappingTypeCompatibility(
          mapping,
          sourceTypes,
          destinationType,
          dest,
        );
      }
    }
  }

  /**
   * Validates constant mappings - ensures constant value type matches destination
   */
  private validateConstantMapping(mapping: FieldMapping): void {
    if (mapping.constantValue === undefined) {
      return;
    }

    const destinations = Array.isArray(mapping.destination)
      ? mapping.destination
      : [mapping.destination];

    for (const dest of destinations) {
      if (typeof dest !== 'string' || !dest) {
        continue;
      }

      const destinationType = this.tazamaDataModelService.getFieldType(dest);
      if (destinationType) {
        const constantType = typeof mapping.constantValue;
        const destTypeLower = destinationType.toLowerCase();

        if (!this.areTypesCompatible(constantType, destTypeLower)) {
          throw new BadRequestException(
            `Constant value type mismatch: Cannot assign constant value '${mapping.constantValue}' of type '${constantType}' to destination field '${dest}' of type '${destTypeLower}'.`,
          );
        }
      }
    }
  }

  /**
   * Comprehensive type compatibility validation based on transformation type
   */
  private validateMappingTypeCompatibility(
    mapping: FieldMapping,
    sourceTypes: string[],
    destinationType: string,
    destinationPath: string,
  ): void {
    const destTypeLower = destinationType.toLowerCase();
    const transformation = mapping.transformation || 'NONE';

    // Log mapping validation for debugging
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

  /**
   * Validate CONCAT transformation: all sources must be string type, result is string
   */
  private validateConcatTypeCompatibility(
    sourceTypes: string[],
    destinationType: string,
    destinationPath: string,
    mapping: FieldMapping,
  ): void {
    // CONCAT always produces a string result
    if (destinationType !== 'string') {
      throw new BadRequestException(
        `CONCAT transformation type mismatch: CONCAT operations always produce string results, but destination field '${destinationPath}' is of type '${destinationType}'. Destination field must be of type 'string'.`,
      );
    }

    // STRICT: All source fields must be strings (no type conversions)
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

  /**
   * Validate SUM transformation: all sources must be numeric, result must be numeric
   */
  private validateSumTypeCompatibility(
    sourceTypes: string[],
    destinationType: string,
    destinationPath: string,
    mapping: FieldMapping,
  ): void {
    // SUM always produces a numeric result - STRICT: must be number only
    if (destinationType !== 'number') {
      throw new BadRequestException(
        `SUM transformation type mismatch: SUM operations produce numeric results, but destination field '${destinationPath}' is of type '${destinationType}'. Destination field must be of type 'number'.`,
      );
    }

    // All source fields must be numeric
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

  /**
   * Validate MATH transformation: all sources must be numeric, result must be numeric
   */
  private validateMathTypeCompatibility(
    sourceTypes: string[],
    destinationType: string,
    destinationPath: string,
    mapping: FieldMapping,
  ): void {
    // MATH always produces a numeric result - STRICT: must be number only
    if (destinationType !== 'number') {
      throw new BadRequestException(
        `MATH transformation type mismatch: MATH operations produce numeric results, but destination field '${destinationPath}' is of type '${destinationType}'. Destination field must be of type 'number'.`,
      );
    }

    // All source fields must be numeric
    for (let i = 0; i < sourceTypes.length; i++) {
      const sourceType = sourceTypes[i];
      const src = mapping.source![i];

      if (sourceType !== 'number') {
        throw new BadRequestException(
          `MATH transformation type mismatch: Source field '${src}' of type '${sourceType}' cannot be used in mathematical operations. Only numeric fields are allowed.`,
        );
      }
    }

    // Validate operator is specified for MATH transformation
    if (!mapping.operator) {
      throw new BadRequestException(
        'MATH transformation validation error: Mathematical operator (ADD, SUBTRACT, MULTIPLY, DIVIDE) must be specified for MATH transformations.',
      );
    }
  }

  /**
   * Validate SPLIT transformation: source must be string, destinations can be string-compatible
   */
  private validateSplitTypeCompatibility(
    sourceTypes: string[],
    destinationType: string,
    destinationPath: string,
    mapping: FieldMapping,
  ): void {
    // SPLIT requires exactly one source field
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

  /**
   * Validate direct mapping (NONE transformation): strict type compatibility
   */
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
          'STRICT TYPE MATCHING: Only exact type matches are allowed. String fields can only map to string fields, number fields can only map to number fields, etc.',
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
          // Generate indexed array paths (existing behavior)
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

  async getFieldInfoFromSchema(
    configId: number,
    fieldPath: string,
    tenantId: string,
  ): Promise<{ type: FieldType; isRequired: boolean } | null> {
    const config = await this.configRepository.findConfigById(
      configId,
      tenantId,
    );
    if (!config) {
      return null;
    }

    try {
      const sourceFields = this.jsonSchemaConverter.convertFromJSONSchema(
        config.schema,
      );

      const findField = (fields: any[], path: string): any => {
        for (const field of fields) {
          if (field.path === path) {
            return field;
          }
          if (field.children) {
            const childField = findField(field.children, path);
            if (childField) {
              return childField;
            }
          }
        }
        return null;
      };

      const field = findField(sourceFields, fieldPath);
      if (field) {
        return {
          type: field.type,
          isRequired: field.isRequired,
        };
      }
    } catch (error) {
      this.logger.warn(
        `Failed to extract field info for path ${fieldPath}:`,
        error,
      );
    }

    return null;
  }

  // ======================== WORKFLOW METHODS ========================

  /**
   * Submit configuration for approval
   */
  async submitForApproval(
    id: number,
    dto: SubmitForApprovalDto,
    tenantId: string,
    userId: string,
    userClaims: string[],
  ): Promise<ConfigResponseDto> {
    const config = await this.configRepository.findConfigById(id, tenantId);
    if (!config) {
      throw new NotFoundException(`Config with ID ${id} not found`);
    }

    const currentStatus = config.status as ConfigStatus;
    const action: WorkflowAction = 'submit_for_approval';

    // Validate user can perform this action
    const validation = this.workflowService.canPerformAction(
      userClaims,
      currentStatus,
      action,
    );
    if (!validation.canPerform) {
      throw new ForbiddenException(validation.message);
    }

    const newStatus = ConfigStatus.UNDER_REVIEW;

    // Update status
    await this.configRepository.updateConfig(id, tenantId, {
      status: newStatus,
    });

    // Log the action
    await this.logStatusChange(
      id,
      currentStatus,
      newStatus,
      action,
      userId,
      dto.comment,
    );

    // Audit the action
    await this.auditService.logAction({
      action: 'submit_for_approval',
      entityType: 'config',
      entityId: id.toString(),
      actor: userId,
      tenantId,
      details: `Configuration submitted for approval${dto.comment ? `: ${dto.comment}` : ''}`,
      newValues: { status: newStatus },
    });
    let createTableQuery = '';
    try {
      const transactionType = config.transactionType.replace(
        /[^a-zA-Z0-9_]/g,
        '_',
      );
      const tableName = `${transactionType}_${tenantId}`;
      createTableQuery = `CREATE TABLE IF NOT EXISTS "${tableName}" (
        id SERIAL PRIMARY KEY,
        config_id INTEGER,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        details JSONB
      );`;
      await this.configRepository.runRawQuery(createTableQuery);
      this.logger.log(`Created transaction history table: ${tableName}`);
      await this.auditService.logAction({
        action: 'create_transaction_history_table',
        entityType: 'config',
        entityId: id.toString(),
        actor: userId,
        tenantId,
        details: `Created transaction history table: ${tableName}`,
      });
    } catch (err) {
      this.logger.error(
        `Failed to create transaction history table: ${err.message}`,
      );
    }

    // Store the query in the config for later export
    const updatedConfig = await this.configRepository.findConfigById(
      id,
      tenantId,
    );
    if (updatedConfig) {
      (updatedConfig as any).createTableQuery = createTableQuery;
    }

    return {
      success: true,
      message: 'Configuration submitted for approval successfully',
      config: updatedConfig || undefined,
    };
  }

  /**
   * Approve configuration
   */
  async approveConfig(
    id: number,
    dto: ApprovalDto,
    tenantId: string,
    userId: string,
    userClaims: string[],
  ): Promise<ConfigResponseDto> {
    const config = await this.configRepository.findConfigById(id, tenantId);
    if (!config) {
      throw new NotFoundException(`Config with ID ${id} not found`);
    }

    const currentStatus = config.status as ConfigStatus;
    const action: WorkflowAction = 'approve';

    // Validate user can perform this action
    const validation = this.workflowService.canPerformAction(
      userClaims,
      currentStatus,
      action,
    );
    if (!validation.canPerform) {
      throw new ForbiddenException(validation.message);
    }

    const newStatus = ConfigStatus.APPROVED;

    // Update status
    await this.configRepository.updateConfig(id, tenantId, {
      status: newStatus,
    });

    // Log the action
    await this.logStatusChange(
      id,
      currentStatus,
      newStatus,
      action,
      userId,
      dto.comment,
    );

    // Audit the action
    await this.auditService.logAction({
      action: 'approve_config',
      entityType: 'config',
      entityId: id.toString(),
      actor: userId,
      tenantId,
      details: `Configuration approved${dto.comment ? `: ${dto.comment}` : ''}`,
      newValues: { status: newStatus },
    });

    return {
      success: true,
      message: 'Configuration approved successfully',
      config:
        (await this.configRepository.findConfigById(id, tenantId)) || undefined,
    };
  }

  /**
   * Reject configuration
   */
  async rejectConfig(
    id: number,
    dto: RejectionDto,
    tenantId: string,
    userId: string,
    userClaims: string[],
  ): Promise<ConfigResponseDto> {
    const config = await this.configRepository.findConfigById(id, tenantId);
    if (!config) {
      throw new NotFoundException(`Config with ID ${id} not found`);
    }

    const currentStatus = config.status as ConfigStatus;
    const action: WorkflowAction = 'reject';

    // Validate user can perform this action
    const validation = this.workflowService.canPerformAction(
      userClaims,
      currentStatus,
      action,
    );
    if (!validation.canPerform) {
      throw new ForbiddenException(validation.message);
    }

    const newStatus = ConfigStatus.REJECTED;

    // Update status
    await this.configRepository.updateConfig(id, tenantId, {
      status: newStatus,
    });

    // Log the action
    await this.logStatusChange(
      id,
      currentStatus,
      newStatus,
      action,
      userId,
      dto.comment,
    );

    // Audit the action
    await this.auditService.logAction({
      action: 'reject_config',
      entityType: 'config',
      entityId: id.toString(),
      actor: userId,
      tenantId,
      details: `Configuration rejected: ${dto.comment}`,
      newValues: { status: newStatus },
    });

    return {
      success: true,
      message: 'Configuration rejected successfully',
      config:
        (await this.configRepository.findConfigById(id, tenantId)) || undefined,
    };
  }

  /**
   * Request changes for configuration
   */
  async requestChanges(
    id: number,
    dto: ChangeRequestDto,
    tenantId: string,
    userId: string,
    userClaims: string[],
  ): Promise<ConfigResponseDto> {
    const config = await this.configRepository.findConfigById(id, tenantId);
    if (!config) {
      throw new NotFoundException(`Config with ID ${id} not found`);
    }

    const currentStatus = config.status as ConfigStatus;
    const action: WorkflowAction = 'request_changes';

    // Validate user can perform this action
    const validation = this.workflowService.canPerformAction(
      userClaims,
      currentStatus,
      action,
    );
    if (!validation.canPerform) {
      throw new ForbiddenException(validation.message);
    }

    const newStatus = ConfigStatus.CHANGES_REQUESTED;

    // Update status
    await this.configRepository.updateConfig(id, tenantId, {
      status: newStatus,
    });

    // Log the action
    await this.logStatusChange(
      id,
      currentStatus,
      newStatus,
      action,
      userId,
      dto.comment,
    );

    // Audit the action
    await this.auditService.logAction({
      action: 'request_changes',
      entityType: 'config',
      entityId: id.toString(),
      actor: userId,
      tenantId,
      details: `Changes requested: ${dto.comment}`,
      newValues: { status: newStatus },
    });

    return {
      success: true,
      message: 'Changes requested successfully',
      config:
        (await this.configRepository.findConfigById(id, tenantId)) || undefined,
    };
  }
  /**
   * Export configuration to SFTP
   */
  async exportConfig(
    id: number,
    dto: StatusTransitionDto,
    tenantId: string,
    userId: string,
    userClaims: string[],
  ): Promise<ConfigResponseDto> {
    const config = await this.configRepository.findConfigById(id, tenantId);
    if (!config) {
      throw new NotFoundException(`Config with ID ${id} not found`);
    }

    const currentStatus = config.status as ConfigStatus;
    const action: WorkflowAction = 'export';

    // Validate user can perform this action
    const validation = this.workflowService.canPerformAction(
      userClaims,
      currentStatus,
      action,
    );
    if (!validation.canPerform) {
      throw new ForbiddenException(validation.message);
    }

    const newStatus = ConfigStatus.EXPORTED;

    // Generate filename similar to job.service.ts
    const nodeEnv = this.nestConfigService.get<string>('NODE_ENV');
    const fileName = `${nodeEnv}_config_${tenantId}_${id}`;

    try {
      // Ensure config includes createTableQuery
      const configToExport = { ...config };
      if (!(configToExport as any).createTableQuery) {
        // Regenerate query if missing
        const transactionType = config.transactionType.replace(
          /[^a-zA-Z0-9_]/g,
          '_',
        );
        const tableName = `${transactionType}_${tenantId}`;
        (configToExport as any).createTableQuery =
          `CREATE TABLE IF NOT EXISTS "${tableName}" (
          id SERIAL PRIMARY KEY,
          config_id INTEGER,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          details JSONB
        );`;
      }
      // Upload config to SFTP with status READY (similar to job.service.ts)
      await this.sftpService.createFile(fileName, {
        ...configToExport,
        status: 'ready',
      });

      this.logger.log(
        `Successfully uploaded config file (${fileName}) to SFTP server.`,
      );

      // Update status
      await this.configRepository.updateConfig(id, tenantId, {
        status: newStatus,
      });

      // Log the action
      await this.logStatusChange(
        id,
        currentStatus,
        newStatus,
        action,
        userId,
        dto.comment,
      );

      // Audit the action
      await this.auditService.logAction({
        action: 'export_config',
        entityType: 'config',
        entityId: id.toString(),
        actor: userId,
        tenantId,
        details: `Configuration exported to SFTP${dto.comment ? `: ${dto.comment}` : ''}`,
        newValues: { status: newStatus },
      });

      return {
        success: true,
        message: `Configuration exported successfully to SFTP (${fileName})`,
        config:
          (await this.configRepository.findConfigById(id, tenantId)) ||
          undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to export config to SFTP: ${error.message}`);
      throw new BadRequestException(
        `Failed to export configuration to SFTP: ${error.message}`,
      );
    }
  }

  /**
   * Deploy configuration
   */
  async deployConfig(
    id: number,
    dto: DeploymentDto,
    tenantId: string,
    userId: string,
    userClaims: string[],
  ): Promise<ConfigResponseDto> {
    const config = await this.configRepository.findConfigById(id, tenantId);
    if (!config) {
      throw new NotFoundException(`Config with ID ${id} not found`);
    }

    const currentStatus = config.status as ConfigStatus;
    const action: WorkflowAction = 'deploy';

    // Validate user can perform this action
    const validation = this.workflowService.canPerformAction(
      userClaims,
      currentStatus,
      action,
    );
    if (!validation.canPerform) {
      throw new ForbiddenException(validation.message);
    }

    const newStatus = ConfigStatus.DEPLOYED;

    // Generate filename similar to job.service.ts
    const nodeEnv = this.nestConfigService.get<string>('NODE_ENV');
    const fileName = `${nodeEnv}_config_${tenantId}_${id}`;

    try {
      // Delete the file from SFTP after successful deployment (similar to job.service.ts)
      await this.sftpService.deleteFile(fileName);

      this.logger.log(
        `Successfully deleted config file (${fileName}) from SFTP server after deployment.`,
      );

      // Update status
      await this.configRepository.updateConfig(id, tenantId, {
        status: newStatus,
      });

      // Log the action
      await this.logStatusChange(
        id,
        currentStatus,
        newStatus,
        action,
        userId,
        dto.comment,
      );

      // Audit the action
      await this.auditService.logAction({
        action: 'deploy_config',
        entityType: 'config',
        entityId: id.toString(),
        actor: userId,
        tenantId,
        details: `Configuration deployed${dto.comment ? `: ${dto.comment}` : ''}`,
        newValues: { status: newStatus },
      });

      return {
        success: true,
        message: 'Configuration deployed successfully',
        config:
          (await this.configRepository.findConfigById(id, tenantId)) ||
          undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to deploy config: ${error.message}`);
      throw new BadRequestException(
        `Failed to deploy configuration: ${error.message}`,
      );
    }
  }

  /**
   * Return configuration to progress (from rejected or changes requested)
   */
  async returnToProgress(
    id: number,
    dto: StatusTransitionDto,
    tenantId: string,
    userId: string,
    userClaims: string[],
  ): Promise<ConfigResponseDto> {
    const config = await this.configRepository.findConfigById(id, tenantId);
    if (!config) {
      throw new NotFoundException(`Config with ID ${id} not found`);
    }

    const currentStatus = config.status as ConfigStatus;
    const action: WorkflowAction = 'return_to_progress';

    // Validate user can perform this action
    const validation = this.workflowService.canPerformAction(
      userClaims,
      currentStatus,
      action,
    );
    if (!validation.canPerform) {
      throw new ForbiddenException(validation.message);
    }

    const newStatus = ConfigStatus.IN_PROGRESS;

    // Update status
    await this.configRepository.updateConfig(id, tenantId, {
      status: newStatus,
    });

    // Log the action
    await this.logStatusChange(
      id,
      currentStatus,
      newStatus,
      action,
      userId,
      dto.comment,
    );

    // Audit the action
    await this.auditService.logAction({
      action: 'return_to_progress',
      entityType: 'config',
      entityId: id.toString(),
      actor: userId,
      tenantId,
      details: `Configuration returned to progress${dto.comment ? `: ${dto.comment}` : ''}`,
      newValues: { status: newStatus },
    });

    return {
      success: true,
      message: 'Configuration returned to progress successfully',
      config:
        (await this.configRepository.findConfigById(id, tenantId)) || undefined,
    };
  }

  /**
   * Get workflow status and available actions for a configuration
   */
  async getWorkflowStatus(
    id: number,
    tenantId: string,
    userClaims: string[],
  ): Promise<any> {
    const config = await this.configRepository.findConfigById(id, tenantId);
    if (!config) {
      throw new NotFoundException(`Config with ID ${id} not found`);
    }

    const currentStatus = config.status as ConfigStatus;
    const permissions = this.workflowService.validateUserPermissions(
      userClaims,
      currentStatus,
      'submit_for_approval',
    );

    return {
      configId: id,
      currentStatus,
      availableActions: {
        canEdit: permissions.canEdit,
        canSubmit: permissions.canSubmit,
        canApprove: permissions.canApprove,
        canReject: permissions.canReject,
        canRequestChanges: permissions.canRequestChanges,
        canDeploy: permissions.canDeploy,
      },
      statusDescription: this.getStatusDescription(currentStatus),
    };
  }

  /**
   * Get audit history for a configuration
   * Includes all workflow actions with comments from approvers
   */
  async getAuditHistory(
    id: number,
    tenantId: string,
  ): Promise<{
    configId: number;
    history: Array<{
      action: string;
      actor: string;
      timestamp: Date;
      details: string;
      previousStatus?: string;
      newStatus?: string;
    }>;
  }> {
    const config = await this.configRepository.findConfigById(id, tenantId);
    if (!config) {
      throw new NotFoundException(`Config with ID ${id} not found`);
    }

    // Get audit logs for this config
    const auditLogs = await this.auditService.getAuditLogs(
      tenantId,
      'config',
      undefined,
      undefined,
      undefined,
      100,
    );

    // Filter logs for this specific config and extract relevant information
    const configLogs = auditLogs
      .filter((log) => log.entity_id === id.toString())
      .map((log) => ({
        action: log.action,
        actor: log.actor,
        timestamp: log.timestamp,
        details: log.details || '',
        previousStatus: log.old_values?.status,
        newStatus: log.new_values?.status,
      }));

    return {
      configId: id,
      history: configLogs,
    };
  }

  /**
   * Private method to log status changes
   */
  private async logStatusChange(
    configId: number,
    previousStatus: ConfigStatus,
    newStatus: ConfigStatus,
    action: WorkflowAction,
    performedBy: string,
    comment?: string,
  ): Promise<void> {
    // Log to a dedicated status change log if needed
    this.logger.log(
      `Config ${configId}: Status changed from ${previousStatus} to ${newStatus} by ${performedBy} (${action})${comment ? ` - ${comment}` : ''}`,
    );
  }

  /**
   * Get human-readable status description
   */
  private getStatusDescription(status: ConfigStatus): string {
    const descriptions: Record<ConfigStatus, string> = {
      [ConfigStatus.IN_PROGRESS]: 'Configuration is being edited',
      [ConfigStatus.UNDER_REVIEW]: 'Configuration is under review by approvers',
      [ConfigStatus.APPROVED]:
        'Configuration has been approved and ready for export',
      [ConfigStatus.EXPORTED]:
        'Configuration has been exported to SFTP and ready for deployment',
      [ConfigStatus.DEPLOYED]: 'Configuration has been deployed to production',
      [ConfigStatus.REJECTED]: 'Configuration has been rejected',
      [ConfigStatus.CHANGES_REQUESTED]:
        'Changes have been requested for this configuration',
    };

    return descriptions[status] || status;
  }
}
