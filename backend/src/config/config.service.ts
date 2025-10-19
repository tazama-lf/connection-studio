import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigRepository } from './config.repository';
import {
  PayloadParsingService,
  FieldType,
  JSONSchema,
} from '@tazama-lf/tcs-lib';
import { AuditService } from '../audit/audit.service';
import { JSONSchemaConverterService } from '../schemas/json-schema-converter.service';

import { TazamaDataModelService } from '../tazama-data-model/tazama-data-model.service';
import { ConfigWorkflowService } from './config-workflow.service';
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
    private readonly payloadParsingService: PayloadParsingService,
    private readonly auditService: AuditService,
    private readonly jsonSchemaConverter: JSONSchemaConverterService,
    private readonly tazamaDataModelService: TazamaDataModelService,
    private readonly workflowService: ConfigWorkflowService,
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

      const parsingResult =
        await this.payloadParsingService.parsePayloadToSchema(
          dto.payload,
          dto.contentType || ContentType.JSON,
        );

      if (!parsingResult.success) {
        return {
          success: false,
          message: 'Failed to parse payload',
          validation: parsingResult.validation,
        };
      }

      let finalSchema = parsingResult.jsonSchema;
      if (dto.fieldAdjustments && dto.fieldAdjustments.length > 0) {
        this.logger.log(
          `Applying ${dto.fieldAdjustments.length} field adjustments`,
        );

        const adjustedSourceFields =
          this.payloadParsingService.applyFieldAdjustments(
            parsingResult.sourceFields,
            dto.fieldAdjustments,
          );

        // Regenerate JSON schema with adjusted fields
        finalSchema =
          this.jsonSchemaConverter.convertToJSONSchema(adjustedSourceFields);

        this.logger.log(
          'Successfully applied field adjustments and regenerated schema',
        );
      } else {
        this.logger.log('No field adjustments to apply');
      }

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

        const adjustedSourceFields =
          this.payloadParsingService.applyFieldAdjustments(
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
      const adjustedSourceFields =
        this.payloadParsingService.applyFieldAdjustments(
          existingSourceFields,
          dto.fieldAdjustments,
        );

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

  private createMappingFromDto(dto: AddMappingDto): FieldMapping {
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
      return {
        source: dto.sources || [],
        destination: dto.destination,
        transformation: 'CONCAT',
        delimiter: dto.delimiter || ' ',
        ...(dto.prefix !== undefined && { prefix: dto.prefix }),
      };
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
      return {
        source: dto.sumFields || [],
        destination: dto.destination,
        transformation: 'SUM',
        ...(dto.prefix !== undefined && { prefix: dto.prefix }),
      };
    }

    // One-to-many (split logic)
    if (dto.source && dto.destinations && dto.destinations.length > 0) {
      return {
        source: dto.source,
        destination: dto.destinations,
        transformation: 'SPLIT',
        delimiter: dto.delimiter || ',',
        ...(dto.prefix !== undefined && { prefix: dto.prefix }),
      };
    }

    // Simple mapping
    if (dto.source && dto.destination) {
      return {
        source: dto.source,
        destination: dto.destination,
        transformation: 'NONE',
        ...(dto.prefix !== undefined && { prefix: dto.prefix }),
      };
    }

    // Constant mapping
    if (dto.constantValue !== undefined && dto.destination) {
      return {
        destination: dto.destination,
        constantValue: dto.constantValue,
        transformation: 'CONSTANT',
        ...(dto.prefix !== undefined && { prefix: dto.prefix }),
      };
    }

    throw new BadRequestException(
      'Invalid mapping: provide (source, destination), (sources[], destination), (source, destinations[]), or (constantValue, destination)',
    );
  }

  private validateMapping(
    mapping: FieldMapping,
    schema: JSONSchema,
    _tenantId: string,
  ): void {
    // Skip validation for constant mappings (no source field required)
    if (
      mapping.transformation === 'CONSTANT' ||
      mapping.constantValue !== undefined
    ) {
      return;
    }

    const allPaths = this.extractAllPathsFromSchema(schema);

    // Many-to-one (concat logic)
    if (Array.isArray(mapping.source)) {
      for (const src of mapping.source) {
        if (!allPaths.includes(src)) {
          throw new BadRequestException(
            `Source field '${src}' not found in schema`,
          );
        }
      }
    } else {
      // One-to-one or one-to-many
      if (
        typeof mapping.source === 'string' &&
        mapping.source &&
        !allPaths.includes(mapping.source)
      ) {
        throw new BadRequestException(
          `Source field '${mapping.source}' not found in schema`,
        );
      }
    }

    // Validate destination(s) against Tazama internal data model
    if (Array.isArray(mapping.destination)) {
      for (const dest of mapping.destination) {
        const isValid =
          this.tazamaDataModelService.isValidDestinationPath(dest);
        if (!isValid) {
          throw new BadRequestException(
            `Destination field '${dest}' is not a valid Tazama data model field. Use a field from the Tazama internal data model (e.g., entities.Name, accounts.Currency, transactionRelationship.Amt).`,
          );
        }
      }
    } else {
      if (typeof mapping.destination === 'string' && mapping.destination) {
        const isValid = this.tazamaDataModelService.isValidDestinationPath(
          mapping.destination,
        );
        if (!isValid) {
          throw new BadRequestException(
            `Destination field '${mapping.destination}' is not a valid Tazama data model field. Use a field from the Tazama internal data model (e.g., entities.Name, accounts.Currency, transactionRelationship.Amt).`,
          );
        }
      }
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
          paths.push(
            ...this.extractAllPathsFromSchema(
              propSchema.items as JSONSchema,
              `${path}[]`,
            ),
          );
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
      // Convert schema to source fields to get field information
      const sourceFields = this.jsonSchemaConverter.convertFromJSONSchema(
        config.schema,
      );

      // Find the field in the source fields
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

    return {
      success: true,
      message: 'Configuration submitted for approval successfully',
      config:
        (await this.configRepository.findConfigById(id, tenantId)) || undefined,
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
        (await this.configRepository.findConfigById(id, tenantId)) || undefined,
    };
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
        'Configuration has been approved and ready for deployment',
      [ConfigStatus.DEPLOYED]: 'Configuration has been deployed to production',
      [ConfigStatus.REJECTED]: 'Configuration has been rejected',
      [ConfigStatus.CHANGES_REQUESTED]:
        'Changes have been requested for this configuration',
    };

    return descriptions[status] || status;
  }
}
