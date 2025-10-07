import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigRepository } from './config.repository';
import { PayloadParsingService } from '../common/payload-parsing.service';
import { AuditService } from '../audit/audit.service';
import { JSONSchemaConverterService } from '../schemas/json-schema-converter.service';
import {
  Config,
  CreateConfigDto,
  UpdateConfigDto,
  ConfigResponseDto,
  FieldMapping,
  ContentType,
  ConfigStatus,
  TransactionType,
  AddMappingDto,
} from '../common/config.interfaces';
import { JSONSchema } from '../common/json-schema.interfaces';

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

      const validation = this.validateSchema(parsingResult.jsonSchema);
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
        schema: parsingResult.jsonSchema,
        mapping: dto.mapping,
        status: ConfigStatus.IN_PROGRESS,
        tenantId,
        createdBy: userId,
      };

      const configId = await this.configRepository.createConfig(configData);

      await this.auditService.logAction({
        action: 'CREATE_CONFIG',
        actor: userId,
        tenantId,
        endpointName: `${dto.msgFam || ''} - ${endpointPath}`,
      });

      const config = await this.configRepository.findConfigById(
        configId,
        tenantId,
      );

      this.logger.log(`Successfully created config ${configId}`);

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

  async getConfigById(id: number, tenantId: string): Promise<Config | null> {
    return this.configRepository.findConfigById(id, tenantId);
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

    await this.configRepository.updateConfig(id, tenantId, dto);

    await this.auditService.logAction({
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
    this.validateMapping(newMapping, config.schema);

    const updatedMappings = [...(config.mapping || []), newMapping];

    await this.configRepository.updateConfig(id, tenantId, {
      mapping: updatedMappings,
    });

    await this.auditService.logAction({
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
        source: dto.sources,
        destination: dto.destination,
        delimiter: dto.delimiter || ' ',
      };
    }

    if (dto.source && dto.destination) {
      return {
        source: dto.source,
        destination: dto.destination,
      };
    }

    throw new BadRequestException(
      'Invalid mapping: provide either (source, destination) or (sources[], destination)',
    );
  }

  private validateMapping(mapping: FieldMapping, schema: JSONSchema): void {
    const allPaths = this.extractAllPathsFromSchema(schema);

    if (Array.isArray(mapping.source)) {
      for (const source of mapping.source) {
        if (!allPaths.includes(source)) {
          throw new BadRequestException(
            `Source field '${source}' not found in schema`,
          );
        }
      }
    } else {
      if (
        typeof mapping.source === 'string' &&
        !allPaths.includes(mapping.source)
      ) {
        throw new BadRequestException(
          `Source field '${mapping.source}' not found in schema`,
        );
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
}
