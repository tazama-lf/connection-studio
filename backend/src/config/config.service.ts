import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigRepository } from './config.repository';
import {
  PayloadParsingService,
  FieldType,
  JSONSchema,
} from '@tazama-lf/tcs-lib';
import { AuditService } from '../audit/audit.service';
import { JSONSchemaConverterService } from '../schemas/json-schema-converter.service';

import { TazamaDataModelService } from '../data-model-extensions/tazama-data-model.service';
import { DataModelExtensionService } from '../data-model-extensions/data-model-extension.service';
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
    private readonly dataModelExtensionService: DataModelExtensionService,
  ) {}

  async createConfig(
    dto: CreateConfigDto,
    tenantId: string,
    userId: string,
  ): Promise<ConfigResponseDto> {
    this.logger.log(
      `Creating config for ${dto.msgFam} - ${dto.transactionType}`,
    );

    try {
      const version = dto.version || 'v1';
      const existingConfig =
        await this.configRepository.findConfigByVersionAndTransactionType(
          version,
          dto.transactionType,
          tenantId,
        );

      if (existingConfig) {
        return {
          success: false,
          message: `Config with version '${version}' for transaction type '${dto.transactionType}' already exists for this tenant. Please use a different version.`,
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
      // First, fetch the source config
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

      // Check if the new transaction type already exists for this tenant
      const existingConfig =
        await this.configRepository.findConfigByVersionAndTransactionType(
          dto.newVersion || sourceConfig.version,
          dto.newTransactionType,
          tenantId,
        );

      if (existingConfig) {
        return {
          success: false,
          message: `Config with message family '${dto.newMsgFam || sourceConfig.msgFam}', transaction type '${dto.newTransactionType}', and version '${dto.newVersion || sourceConfig.version}' already exists for this tenant. Please use different values.`,
        };
      }

      // Prepare the new config data by cloning the source
      const newMsgFam = dto.newMsgFam || sourceConfig.msgFam;
      const newVersion = dto.newVersion || sourceConfig.version;

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
        status: ConfigStatus.IN_PROGRESS, // Reset status to in-progress
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

    // Check if this update requires creating a new config row
    // This happens when key fields that are part of the unique constraint change
    const isVersionChanging =
      dto.version !== undefined && dto.version !== config.version;
    const isTransactionTypeChanging =
      dto.transactionType !== undefined &&
      dto.transactionType !== config.transactionType;
    const isMsgFamChanging =
      dto.msgFam !== undefined && dto.msgFam !== config.msgFam;

    const requiresNewRow =
      isVersionChanging || isTransactionTypeChanging || isMsgFamChanging;

    if (requiresNewRow) {
      // Create a new config with the updated fields
      const newVersion = dto.version ?? config.version;
      const newTransactionType = dto.transactionType ?? config.transactionType;
      const newMsgFam = dto.msgFam ?? config.msgFam;

      // Check if this new combination would conflict with an existing config
      const existingConfig =
        await this.configRepository.findConfigByVersionAndTransactionType(
          newVersion,
          newTransactionType,
          tenantId,
        );

      if (existingConfig && existingConfig.id !== id) {
        return {
          success: false,
          message: `Config with message family '${newMsgFam}', transaction type '${newTransactionType}', and version '${newVersion}' already exists for this tenant. Please use different values.`,
        };
      }

      const newEndpointPath = this.generateEndpointPath(
        tenantId,
        newVersion,
        newTransactionType,
        newMsgFam,
      );

      // Create new config with all the data from the original plus updates
      const newConfigData: Omit<Config, 'id' | 'createdAt' | 'updatedAt'> = {
        msgFam: newMsgFam,
        transactionType: newTransactionType,
        endpointPath: newEndpointPath,
        version: newVersion,
        contentType: dto.contentType ?? config.contentType,
        schema: finalSchema ?? config.schema,
        mapping: dto.mapping ?? config.mapping,
        status: config.status,
        tenantId,
        createdBy: userId, // New config created by the user making the update
      };

      const newConfigId =
        await this.configRepository.createConfig(newConfigData);

      await this.auditService.logAction({
        entityType: 'CONFIG',
        action: 'CREATE_CONFIG',
        actor: userId,
        tenantId,
        endpointName: `${newMsgFam} - ${newEndpointPath} (versioned from ${id})`,
      });

      const newConfig = await this.configRepository.findConfigById(
        newConfigId,
        tenantId,
      );

      this.logger.log(
        `Created new config ${newConfigId} as version update from config ${id}`,
      );

      return {
        success: true,
        message: 'New config version created successfully',
        config: newConfig!,
      };
    }

    // Regular update for non-version-changing fields
    const updateData = { ...dto };

    // Use finalSchema if field adjustments were applied
    if (finalSchema) {
      updateData.schema = finalSchema;
    }

    // Auto-regenerate endpoint path if needed (for non-version changes)
    if (dto.transactionType !== undefined || dto.msgFam !== undefined) {
      const newTransactionType = dto.transactionType ?? config.transactionType;
      const newMsgFam = dto.msgFam ?? config.msgFam;

      updateData.endpointPath = this.generateEndpointPath(
        tenantId,
        config.version, // Keep the same version for regular updates
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
    await this.validateMapping(newMapping, config.schema, tenantId);

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
    await this.validateMapping(updatedMapping, config.schema, tenantId);

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
      };
    }

    // One-to-many (split logic)
    if (dto.source && dto.destinations && dto.destinations.length > 0) {
      return {
        source: dto.source,
        destination: dto.destinations,
        transformation: 'SPLIT',
        delimiter: dto.delimiter || ',',
      };
    }

    // Simple mapping
    if (dto.source && dto.destination) {
      return {
        source: dto.source,
        destination: dto.destination,
        transformation: 'NONE',
      };
    }

    throw new BadRequestException(
      'Invalid mapping: provide (source, destination), (sources[], destination), or (source, destinations[])',
    );
  }

  private async validateMapping(
    mapping: FieldMapping,
    schema: JSONSchema,
    tenantId: string,
  ): Promise<void> {
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
          await this.dataModelExtensionService.isValidDestinationPath(
            dest,
            tenantId,
          );
        if (!isValid) {
          throw new BadRequestException(
            `Destination field '${dest}' is not a valid Tazama data model field. Use a field from the Tazama internal data model (e.g., entities.Name, accounts.Currency, transactionRelationship.Amt) or create a data model extension.`,
          );
        }
      }
    } else {
      if (typeof mapping.destination === 'string' && mapping.destination) {
        const isValid =
          await this.dataModelExtensionService.isValidDestinationPath(
            mapping.destination,
            tenantId,
          );
        if (!isValid) {
          throw new BadRequestException(
            `Destination field '${mapping.destination}' is not a valid Tazama data model field. Use a field from the Tazama internal data model (e.g., entities.Name, accounts.Currency, transactionRelationship.Amt) or create a data model extension.`,
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
}
