import { Injectable, Logger } from '@nestjs/common';
import { ConfigRepository } from '../config/config.repository';
import { Config } from '../config/config.interfaces';
import { AuditService } from '../audit/audit.service';
import {
  processMappings,
  iMappingConfiguration,
  iMappingResult,
} from '@tazama-lf/tcs-lib';
import * as xml2js from 'xml2js';
import Ajv from 'ajv';
import * as _ from 'lodash';

export interface SimulatePayloadDto {
  endpointId: number;
  payloadType: 'application/json' | 'application/xml';
  payload: any;
  tcsMapping?: iMappingConfiguration;
}

export interface SimulationError {
  field: string;
  message: string;
  path?: string;
  value?: any;
}

export interface ValidationStage {
  name: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  message: string;
  errors?: SimulationError[];
  details?: any;
}

export interface SimulationResult {
  status: 'PASSED' | 'FAILED';
  errors: SimulationError[];
  stages: ValidationStage[];
  tcsResult: iMappingResult | null;
  transformedPayload: any;
  summary: {
    endpointId: number;
    tenantId: string;
    timestamp: string;
    validatedBy?: string;
    mappingsApplied: number;
    totalStages: number;
    passedStages: number;
    failedStages: number;
  };
}

@Injectable()
export class SimulationService {
  private readonly logger = new Logger(SimulationService.name);

  constructor(
    private readonly configRepository: ConfigRepository,
    private readonly auditService: AuditService,
  ) {}

  async simulateMapping(
    dto: SimulatePayloadDto,
    tenantId: string,
    userId?: string,
  ): Promise<SimulationResult> {
    const timestamp = new Date().toISOString();
    const stages: ValidationStage[] = [];
    const errors: SimulationError[] = [];
    let transformedPayload: any = {};
    let tcsResult: iMappingResult | null = null;
    let mappingsApplied = 0;

    try {
      // Stage 1: Load Configuration
      const configStage = await this.stageLoadConfig(dto.endpointId, tenantId);
      stages.push(configStage);

      if (configStage.status === 'FAILED') {
        errors.push(...(configStage.errors || []));
        return this.createStageBasedResult(
          dto,
          timestamp,
          userId,
          tenantId,
          stages,
          errors,
          null,
          {},
        );
      }

      const config = configStage.details.config as Config;

      // Stage 2: Parse Payload
      const parseStage = await this.stageParsePayload(
        dto.payload,
        dto.payloadType,
      );
      stages.push(parseStage);

      if (parseStage.status === 'FAILED') {
        errors.push(...(parseStage.errors || []));
        return this.createStageBasedResult(
          dto,
          timestamp,
          userId,
          tenantId,
          stages,
          errors,
          null,
          {},
        );
      }

      const parsedPayload = parseStage.details.parsedPayload;

      // Stage 3: Validate Schema
      const schemaStage = this.stageValidateSchema(
        parsedPayload,
        config.schema,
      );
      stages.push(schemaStage);

      if (schemaStage.status === 'FAILED') {
        errors.push(...(schemaStage.errors || []));
        return this.createStageBasedResult(
          dto,
          timestamp,
          userId,
          tenantId,
          stages,
          errors,
          null,
          { originalPayload: parsedPayload },
        );
      }

      // Stage 4: Validate Mappings Configuration
      const mappingValidationStage = this.stageValidateMappings(
        parsedPayload,
        config.mapping || [],
      );
      stages.push(mappingValidationStage);

      if (mappingValidationStage.status === 'FAILED') {
        errors.push(...(mappingValidationStage.errors || []));
        return this.createStageBasedResult(
          dto,
          timestamp,
          userId,
          tenantId,
          stages,
          errors,
          null,
          { originalPayload: parsedPayload },
        );
      }

      // Stage 5: Execute TCS Mapping Functions
      const tcsStage = await this.stageExecuteTCSMapping(
        parsedPayload,
        config,
        dto.tcsMapping,
      );
      stages.push(tcsStage);

      if (tcsStage.status === 'FAILED') {
        errors.push(...(tcsStage.errors || []));
        return this.createStageBasedResult(
          dto,
          timestamp,
          userId,
          tenantId,
          stages,
          errors,
          null,
          { originalPayload: parsedPayload },
        );
      }

      tcsResult = tcsStage.details.tcsResult;
      mappingsApplied = tcsStage.details.mappingsApplied;
      transformedPayload = {
        originalPayload: parsedPayload,
        dataCache: tcsResult?.dataCache || {},
        transactionRelationship: tcsResult?.transactionRelationship || {},
        endToEndId: tcsResult?.endToEndId || '',
      };

      // All stages passed!
      const finalStatus = errors.length === 0 ? 'PASSED' : 'FAILED';

      this.auditService.logAction({
        entityType: 'SIMULATION',
        action: 'TCS_SIMULATE_MAPPING',
        actor: userId || 'SYSTEM',
        tenantId,
        entityId: dto.endpointId.toString(),
        details: `Simulation ${finalStatus} for endpoint ${dto.endpointId}, mappings applied: ${mappingsApplied}, stages: ${stages.filter((s) => s.status === 'PASSED').length}/${stages.length}`,
        status: finalStatus === 'PASSED' ? 'SUCCESS' : 'FAILURE',
        severity: finalStatus === 'PASSED' ? 'LOW' : 'MEDIUM',
      });

      return this.createStageBasedResult(
        dto,
        timestamp,
        userId,
        tenantId,
        stages,
        errors,
        tcsResult,
        transformedPayload,
      );
    } catch (error: any) {
      stages.push({
        name: 'System Error',
        status: 'FAILED',
        message: 'Unexpected system error occurred',
        errors: [{ field: 'system', message: error.message }],
      });

      return this.createStageBasedResult(
        dto,
        timestamp,
        userId,
        tenantId,
        stages,
        [{ field: 'system', message: 'Simulation error: ' + error.message }],
        null,
        {},
      );
    }
  }

  /**
   * Stage 1: Load Configuration
   */
  private async stageLoadConfig(
    endpointId: number,
    tenantId: string,
  ): Promise<ValidationStage> {
    try {
      const config = await this.configRepository.findConfigById(
        endpointId,
        tenantId,
      );

      if (!config) {
        return {
          name: '1. Load Configuration',
          status: 'FAILED',
          message: 'Configuration not found',
          errors: [
            {
              field: 'endpointId',
              message: `Configuration with ID ${endpointId} not found`,
            },
          ],
        };
      }

      return {
        name: '1. Load Configuration',
        status: 'PASSED',
        message: `Configuration loaded successfully (ID: ${endpointId})`,
        details: { config },
      };
    } catch (error: any) {
      return {
        name: '1. Load Configuration',
        status: 'FAILED',
        message: 'Failed to load configuration',
        errors: [{ field: 'endpointId', message: error.message }],
      };
    }
  }

  /**
   * Stage 2: Parse Payload
   */
  private async stageParsePayload(
    payload: any,
    payloadType: string,
  ): Promise<ValidationStage> {
    try {
      const parsedPayload = await this.parsePayload(payload, payloadType);

      return {
        name: '2. Parse Payload',
        status: 'PASSED',
        message: `Payload parsed successfully as ${payloadType}`,
        details: { parsedPayload, payloadType },
      };
    } catch (error: any) {
      return {
        name: '2. Parse Payload',
        status: 'FAILED',
        message: `Failed to parse payload: ${error.message}`,
        errors: [{ field: 'payload', message: error.message }],
      };
    }
  }

  /**
   * Stage 3: Validate Schema
   */
  private stageValidateSchema(payload: any, schema: any): ValidationStage {
    const errors = this.validatePayloadAgainstSchema(payload, schema);

    if (errors.length > 0) {
      return {
        name: '3. Validate Schema',
        status: 'FAILED',
        message: `Schema validation failed: ${errors.length} error(s) found`,
        errors,
        details: { schema, payload },
      };
    }

    return {
      name: '3. Validate Schema',
      status: 'PASSED',
      message: 'Payload conforms to the saved schema',
      details: {
        schemaType: schema.type,
        requiredFields: schema.required || [],
      },
    };
  }

  /**
   * Stage 4: Validate Mappings
   */
  private stageValidateMappings(
    payload: any,
    mappings: any[],
  ): ValidationStage {
    if (!mappings || mappings.length === 0) {
      return {
        name: '4. Validate Mappings',
        status: 'FAILED',
        message: 'No mappings defined in configuration',
        errors: [{ field: 'mapping', message: 'No mappings defined' }],
      };
    }

    const errors = this.validateMappings(payload, mappings);

    if (errors.length > 0) {
      return {
        name: '4. Validate Mappings',
        status: 'FAILED',
        message: `Mapping validation failed: ${errors.length} error(s) found`,
        errors,
        details: {
          totalMappings: mappings.length,
          invalidMappings: errors.length,
        },
      };
    }

    return {
      name: '4. Validate Mappings',
      status: 'PASSED',
      message: `All ${mappings.length} mapping(s) validated successfully`,
      details: { totalMappings: mappings.length },
    };
  }

  /**
   * Stage 5: Execute TCS Mapping Functions
   */
  private async stageExecuteTCSMapping(
    payload: any,
    config: Config,
    providedMapping?: iMappingConfiguration,
  ): Promise<ValidationStage> {
    try {
      const tcsMapping =
        providedMapping || this.convertConfigToTCSMapping(config);
      const mappingsApplied = tcsMapping.mappings?.length || 0;

      if (mappingsApplied === 0) {
        return {
          name: '5. Execute TCS Mapping Functions',
          status: 'FAILED',
          message: 'No TCS mappings to execute',
          errors: [
            { field: 'tcsMapping', message: 'No TCS mappings configured' },
          ],
        };
      }

      const tcsResult = processMappings(payload, tcsMapping);

      return {
        name: '5. Execute TCS Mapping Functions',
        status: 'PASSED',
        message: `Successfully executed ${mappingsApplied} TCS mapping function(s)`,
        details: {
          mappingsApplied,
          tcsResult,
          dataCache: tcsResult?.dataCache || {},
          endToEndId: tcsResult?.endToEndId || '',
        },
      };
    } catch (error: any) {
      return {
        name: '5. Execute TCS Mapping Functions',
        status: 'FAILED',
        message: `TCS mapping execution failed: ${error.message}`,
        errors: [{ field: 'tcsMapping', message: error.message }],
      };
    }
  }

  /**
   * Convert config mappings to TCS lib format
   */
  private convertConfigToTCSMapping(config: Config): iMappingConfiguration {
    const mappings: Array<{
      destination: string;
      sources: string[];
      separator?: string;
      prefix?: string;
    }> = [];

    if (config.mapping && Array.isArray(config.mapping)) {
      for (const mapping of config.mapping) {
        const sources = Array.isArray(mapping.source)
          ? mapping.source
          : mapping.source
            ? [mapping.source]
            : [];

        const destination = Array.isArray(mapping.destination)
          ? mapping.destination[0]
          : mapping.destination;

        mappings.push({
          destination: destination || '',
          sources,
          separator: '',
          prefix: mapping.prefix,
        });
      }
    }

    return { mappings };
  }

  /**
   * Create stage-based result
   */
  private createStageBasedResult(
    dto: SimulatePayloadDto,
    timestamp: string,
    userId: string | undefined,
    tenantId: string,
    stages: ValidationStage[],
    errors: SimulationError[],
    tcsResult: iMappingResult | null,
    transformedPayload: any,
  ): SimulationResult {
    const passedStages = stages.filter((s) => s.status === 'PASSED').length;
    const failedStages = stages.filter((s) => s.status === 'FAILED').length;
    const totalStages = stages.length;
    const mappingsApplied = tcsResult
      ? stages.find((s) => s.name.includes('TCS Mapping'))?.details
          ?.mappingsApplied || 0
      : 0;

    return {
      status: errors.length === 0 ? 'PASSED' : 'FAILED',
      errors,
      stages,
      tcsResult,
      transformedPayload,
      summary: {
        endpointId: dto.endpointId,
        tenantId,
        timestamp,
        validatedBy: userId,
        mappingsApplied,
        totalStages,
        passedStages,
        failedStages,
      },
    };
  }

  private async getEndpointConfig(
    endpointId: number,
    tenantId: string,
  ): Promise<Config | null> {
    return this.configRepository.findConfigById(endpointId, tenantId);
  }

  private async parsePayload(payload: any, payloadType: string): Promise<any> {
    if (!payloadType) {
      throw new Error(
        'payloadType is required. Must be either "application/json" or "application/xml"',
      );
    }

    if (payloadType === 'application/xml') {
      const xmlString =
        typeof payload === 'string' ? payload : JSON.stringify(payload);
      const parser = new xml2js.Parser({
        explicitArray: false,
        ignoreAttrs: false,
        mergeAttrs: true,
      });
      return parser.parseStringPromise(xmlString);
    }

    if (payloadType === 'application/json') {
      if (typeof payload === 'string') {
        return JSON.parse(payload);
      }
      return payload;
    }

    throw new Error(
      `Unsupported payload type: "${payloadType}". Must be either "application/json" or "application/xml"`,
    );
  }

  /**
   * Validate payload against JSON schema
   */
  private validatePayloadAgainstSchema(
    payload: any,
    schema: any,
  ): SimulationError[] {
    this.logger.debug('Validating payload against schema');
    this.logger.debug(`Schema: ${JSON.stringify(schema).substring(0, 500)}...`);
    this.logger.debug(
      `Payload: ${JSON.stringify(payload).substring(0, 500)}...`,
    );

    const errors: SimulationError[] = [];

    if (!schema) {
      errors.push({
        field: 'schema',
        message: 'No schema defined in configuration',
      });
      return errors;
    }

    try {
      const ajv = new Ajv({
        allErrors: true,
        strict: false,
        strictSchema: false,
        strictNumbers: true,
        strictTypes: true,
        strictRequired: true,
        allowUnionTypes: false,
        validateFormats: false,
      });

      const schemaWithStrict = this.enforceStrictSchema(schema);

      this.logger.log(`Original schema: ${JSON.stringify(schema)}`);
      this.logger.log(`Strict schema: ${JSON.stringify(schemaWithStrict)}`);

      const validate = ajv.compile(schemaWithStrict);

      const valid = validate(payload);

      this.logger.debug(`Schema validation result: ${valid}`);
      this.logger.debug(
        `Payload type: ${Array.isArray(payload) ? 'array' : typeof payload}`,
      );

      if (!valid && validate.errors) {
        this.logger.warn(
          `Schema validation errors: ${JSON.stringify(validate.errors)}`,
        );

        for (const error of validate.errors) {
          if (
            error.keyword === 'additionalProperties' &&
            error.instancePath &&
            this.isArrayPath(payload, error.instancePath)
          ) {
            continue;
          }

          errors.push({
            field: error.instancePath || 'root',
            message: error.message || 'Schema validation failed',
            path: error.instancePath,
            value: _.get(
              payload,
              error.instancePath?.replace(/^\//, '').replace(/\//g, '.'),
            ),
          });
        }
      }
    } catch (schemaError: any) {
      this.logger.error(`Schema validation error: ${schemaError.message}`);
      errors.push({
        field: 'schema',
        message: 'Schema validation error: ' + schemaError.message,
      });
    }

    return errors;
  }

  private validateMappings(payload: any, mappings: any[]): SimulationError[] {
    const errors: SimulationError[] = [];

    for (let i = 0; i < mappings.length; i++) {
      const mapping = mappings[i];
      const sources = Array.isArray(mapping.source)
        ? mapping.source
        : mapping.source
          ? [mapping.source]
          : [];

      if (
        mapping.transformation === 'CONSTANT' ||
        mapping.constantValue !== undefined
      ) {
        continue;
      }

      let anySourceExists = false;
      const missingSources: string[] = [];

      for (const source of sources) {
        const fieldValue = this.getFieldValue(payload, source);
        if (fieldValue !== undefined && fieldValue !== null) {
          anySourceExists = true;
          break;
        } else {
          missingSources.push(source);
        }
      }

      if (!anySourceExists && sources.length > 0) {
        errors.push({
          field: 'mapping',
          message: `Mapping #${i + 1}: None of the source fields exist in payload: ${missingSources.join(', ')}`,
          path: `mappings[${i}]`,
          value: mapping,
        });
      }

      // Validate destination format
      if (!mapping.destination) {
        errors.push({
          field: 'mapping',
          message: `Mapping #${i + 1}: Missing destination field`,
          path: `mappings[${i}]`,
        });
      }
    }

    return errors;
  }

  private isArrayPath(obj: any, path: string): boolean {
    if (!path) return false;

    const normalizedPath = path.replace(/^\//, '').replace(/\//g, '.');
    const pathParts = normalizedPath.split('.');

    let current = obj;
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];

      if (Array.isArray(current)) {
        return true;
      }

      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        break;
      }
    }

    return Array.isArray(current);
  }

  private getFieldValue(obj: any, path: string): any {
    if (!path) return undefined;

    const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');

    return _.get(obj, normalizedPath);
  }

  private enforceStrictSchema(schema: any): any {
    if (!schema || typeof schema !== 'object') {
      return schema;
    }

    const strictSchema = { ...schema };

    if (strictSchema.type === 'array') {
      if (strictSchema.items) {
        if (typeof strictSchema.items === 'object') {
          strictSchema.items = this.enforceStrictSchema(strictSchema.items);
        }
      }
      return strictSchema;
    }

    if (
      strictSchema.type === 'object' &&
      strictSchema.additionalProperties === undefined
    ) {
      strictSchema.additionalProperties = false;
    }

    if (strictSchema.properties) {
      strictSchema.properties = Object.keys(strictSchema.properties).reduce(
        (acc, key) => {
          acc[key] = this.enforceStrictSchema(strictSchema.properties[key]);
          return acc;
        },
        {} as any,
      );
    }

    if (strictSchema.items && strictSchema.type !== 'array') {
      strictSchema.items = this.enforceStrictSchema(strictSchema.items);
    }

    if (strictSchema.oneOf) {
      strictSchema.oneOf = strictSchema.oneOf.map((s: any) =>
        this.enforceStrictSchema(s),
      );
    }
    if (strictSchema.anyOf) {
      strictSchema.anyOf = strictSchema.anyOf.map((s: any) =>
        this.enforceStrictSchema(s),
      );
    }
    if (strictSchema.allOf) {
      strictSchema.allOf = strictSchema.allOf.map((s: any) =>
        this.enforceStrictSchema(s),
      );
    }

    return strictSchema;
  }
}
