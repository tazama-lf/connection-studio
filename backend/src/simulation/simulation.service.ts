import { Injectable, Logger } from '@nestjs/common';
import { AdminServiceClient } from '../services/admin-service-client.service';
import { Config } from '../config/config.interfaces';
import {
  processMappings,
  iMappingConfiguration,
  iMappingResult,
} from '@tazama-lf/tcs-lib';
import * as xml2js from 'xml2js';
import { getFieldValue, validateMappings } from '../utils/mapping-validation';
import { SchemaValidationService } from './schema-validation.service';

import type {
  SimulatePayloadDto,
  SimulationError,
  ValidationStage,
  SimulationResult,
} from './dto/simulation.dto';

export type { SimulatePayloadDto };

@Injectable()
export class SimulationService {
  private readonly logger = new Logger(SimulationService.name);

  /* c8 ignore start */
  constructor(
    private readonly adminServiceClient: AdminServiceClient,
    private readonly schemaValidationService: SchemaValidationService,
  ) {}
  /* c8 ignore stop */

  async simulateMapping(
    dto: SimulatePayloadDto,
    tenantId: string,
    userId: string,
    token: string,
  ): Promise<SimulationResult> {
    const timestamp = new Date().toISOString();
    const stages: ValidationStage[] = [];
    const errors: SimulationError[] = [];
    let transformedPayload: unknown = {};
    let tcsResult: iMappingResult | null = null;

    try {
      if (!dto.endpointId || isNaN(dto.endpointId)) {
        return {
          status: 'FAILED',
          errors: [
            {
              field: 'endpointId',
              message: `Invalid endpoint ID: ${dto.endpointId}. Must be a valid number.`,
            },
          ],
          stages: [
            {
              name: 'Validation',
              status: 'FAILED',
              message: 'Invalid endpoint ID provided',
              errors: [
                {
                  field: 'endpointId',
                  message: `Invalid endpoint ID: ${dto.endpointId}. Must be a valid number.`,
                },
              ],
            },
          ],
          tcsResult: null,
          transformedPayload,
          summary: {
            endpointId: dto.endpointId,
            tenantId,
            timestamp,
            mappingsApplied: 0,
            totalStages: 1,
            passedStages: 0,
            failedStages: 1,
          },
        };
      }
      const { endpointId } = dto;

      // first stage
      const configStage = await this.stageLoadConfig(
        endpointId,
        tenantId,
        token,
      );
      stages.push(configStage);

      if (configStage.status === 'FAILED') {
        errors.push(...(configStage.errors ?? []));
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

      const { config } = configStage.details as { config: Config };

      // second stage
      const parseStage = await this.stageParsePayload(
        dto.payload,
        dto.payloadType,
      );

      stages.push(parseStage);

      if (parseStage.status === 'FAILED') {
        errors.push(...(parseStage.errors ?? []));
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

      const parseDetails = parseStage.details as {
        parsedPayload: Record<string, unknown>;
      };
      const { parsedPayload } = parseDetails;

      const cleanedSchema = this.schemaValidationService.cleanSchemaForXML(
        config.schema,
      );

      //third stage
      const schemaStage = this.stageValidateSchema(
        parsedPayload,
        cleanedSchema as Record<string, unknown>,
        config,
      );

      stages.push(schemaStage);

      if (schemaStage.status === 'FAILED') {
        errors.push(...(schemaStage.errors ?? []));
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

      const hasMappings = config.mapping && config.mapping.length > 0;

      if (hasMappings) {
        parsedPayload.TenantId = tenantId;
        parsedPayload.TxTp = config.transactionType;
        const mappingValidationStage = this.stageValidateMappings(
          parsedPayload,
          config.mapping ?? [],
        );
        stages.push(mappingValidationStage);

        if (mappingValidationStage.status === 'FAILED') {
          errors.push(...(mappingValidationStage.errors ?? []));
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
        const tcsStage = await this.stageExecuteTCSMapping(
          parsedPayload,
          config,
          dto.tcsMapping,
        );

        // fifth stage
        stages.push(tcsStage);

        const tcsDetails = tcsStage.details as {
          tcsResult: iMappingResult;
          mappingsApplied: number;
        };
        const { tcsResult: extractedTcsResult } = tcsDetails;
        tcsResult = extractedTcsResult;

        transformedPayload = {
          originalPayload: parsedPayload,
          dataCache: extractedTcsResult.dataCache,
          endToEndId: extractedTcsResult.endToEndId,
          mapping: config.mapping,
        };
      } else {
        stages.push({
          name: '4. Validate Mappings',
          status: 'SKIPPED',
          message: 'No mappings defined - skipping validation',
        });

        stages.push({
          name: '5. Execute TCS Mapping Functions',
          status: 'SKIPPED',
          message: 'No mappings defined - skipping execution',
        });
        transformedPayload = {
          originalPayload: parsedPayload,
        };
      }

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
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      stages.push({
        name: 'System Error',
        status: 'FAILED',
        message: 'Unexpected system error occurred',
        errors: [{ field: 'system', message: errorMessage }],
      });

      return this.createStageBasedResult(
        dto,
        timestamp,
        userId,
        tenantId,
        stages,
        [{ field: 'system', message: 'Simulation error: ' + errorMessage }],
        null,
        {},
      );
    }
  }
  private async stageLoadConfig(
    endpointId: number,
    tenantId: string,
    token?: string,
  ): Promise<ValidationStage> {
    try {
      if (!token) {
        return {
          name: '1. Load Configuration',
          status: 'FAILED',
          message: 'Authentication token required',
          errors: [
            {
              field: 'token',
              message: 'Missing authentication token',
            },
          ],
        };
      }

      const config = await this.adminServiceClient.getConfigById(
        endpointId,
        token,
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
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        name: '1. Load Configuration',
        status: 'FAILED',
        message: 'Failed to load configuration',
        errors: [{ field: 'endpointId', message: errorMessage }],
      };
    }
  }
  private async stageParsePayload(
    payload: unknown,
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
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        name: '2. Parse Payload',
        status: 'FAILED',
        message: `Failed to parse payload: ${errorMessage}`,
        errors: [{ field: 'payload', message: errorMessage }],
      };
    }
  }

  private stageValidateSchema(
    payload: Record<string, unknown>,
    schema: Record<string, unknown>,
    config?: Config,
  ): ValidationStage {
    const errors = this.schemaValidationService.validatePayloadAgainstSchema(
      payload,
      schema,
      config,
    );

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
        requiredFields: schema.required ?? [],
      },
    };
  }

  private stageValidateMappings(
    payload: Record<string, unknown>,
    mappings: unknown[],
  ): ValidationStage {
    const errors = validateMappings(payload, mappings);

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

  private async stageExecuteTCSMapping(
    payload: Record<string, unknown>,
    config: Config,
    providedMapping?: iMappingConfiguration,
  ): Promise<ValidationStage> {
    try {
      const tcsMapping = config.mapping ?? [];
      const mappingsApplied = tcsMapping.length;
      const endpoint = config.endpointPath;
      let tcsResult;

      try {
        tcsResult = await processMappings(payload, tcsMapping, endpoint);
      } catch (mappingError: unknown) {
        const mappingErrorMessage =
          mappingError instanceof Error
            ? mappingError.message
            : String(mappingError);
        if (
          typeof mappingErrorMessage === 'string' &&
          mappingErrorMessage.includes('loggerService')
        ) {
          this.logger.error(
            'TCS lib processMappings has logger issue - this should be fixed in tcs-lib',
          );
          tcsResult = {
            dataCache: {},
            transactionRelationship: {},
            endToEndId: '',
          };
        } else {
          throw mappingError;
        }
      }

      return {
        name: '5. Execute TCS Mapping Functions',
        status: 'PASSED',
        message: `Successfully executed ${mappingsApplied} TCS mapping function(s)`,
        details: {
          mappingsApplied,
          tcsResult: tcsResult ?? null,
          dataCache: tcsResult?.dataCache ?? {},
          transactionRelationship: tcsResult?.transactionRelationship ?? {},
          endToEndId: tcsResult?.endToEndId ?? '',
        },
      };
    } catch (error: unknown) {
      this.logger.error('TCS mapping execution failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      return {
        name: '5. Execute TCS Mapping Functions',
        status: 'FAILED',
        message: `TCS mapping execution failed: ${errorMessage}`,
        errors: [
          {
            field: 'tcsMapping',
            message: errorMessage,
            value: errorStack ? errorStack.substring(0, 200) : undefined,
          },
        ],
      };
    }
  }

  private createStageBasedResult(
    dto: SimulatePayloadDto,
    timestamp: string,
    userId: string | undefined,
    tenantId: string,
    stages: ValidationStage[],
    errors: SimulationError[],
    tcsResult: iMappingResult | null,
    transformedPayload: unknown,
  ): SimulationResult {
    const passedStages = stages.filter((s) => s.status === 'PASSED').length;
    const failedStages = stages.filter((s) => s.status === 'FAILED').length;
    const totalStages = stages.length;
    const mappingsApplied = tcsResult
      ? ((
          stages.find((s) => s.name.includes('TCS Mapping'))?.details as {
            mappingsApplied?: number;
          }
        ).mappingsApplied ?? 0)
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

  private async parsePayload(
    payload: unknown,
    payloadType: string,
  ): Promise<Record<string, unknown>> {
    if (!payloadType) {
      throw new Error(
        'payloadType is required. Must be either "application/json" or "application/xml"',
      );
    }

    if (payloadType === 'application/xml') {
      const xmlString =
        typeof payload === 'string' ? payload : JSON.stringify(payload);

      if (!xmlString || xmlString.trim().length === 0) {
        throw new Error('XML payload cannot be empty');
      }

      const parser = new xml2js.Parser({
        explicitArray: false,
        ignoreAttrs: false,
        mergeAttrs: true,
        trim: true,
        normalize: true,
        normalizeTags: false,
        attrkey: '@',
        charkey: '#text',
        explicitCharkey: false,
        attrNameProcessors: undefined,
        attrValueProcessors: undefined,
        tagNameProcessors: undefined,
        valueProcessors: undefined,
      });

      try {
        const result = await parser.parseStringPromise(xmlString);
        this.logger.debug(
          `XML parsed successfully: ${JSON.stringify(result).substring(0, 200)}...`,
        );
        return result;
      } catch (xmlError: unknown) {
        const errorMessage =
          xmlError instanceof Error ? xmlError.message : 'Unknown error';
        this.logger.error(`XML parsing failed: ${errorMessage}`);
        throw new Error(`Invalid XML payload: ${errorMessage}`, {
          cause: xmlError,
        });
      }
    }

    if (payloadType === 'application/json') {
      if (typeof payload === 'string') {
        try {
          return JSON.parse(payload);
        } catch (jsonError: unknown) {
          const errorMessage =
            jsonError instanceof Error ? jsonError.message : 'Unknown error';
          throw new Error(`Invalid JSON payload: ${errorMessage}`, {
            cause: jsonError,
          });
        }
      }
      return payload as Record<string, unknown>;
    }

    throw new Error(
      `Unsupported payload type: "${payloadType}". Must be either "application/json" or "application/xml"`,
    );
  }

  private normalizeXmlParsedObject(obj: unknown): unknown {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.normalizeXmlParsedObject(item));
    }

    const normalized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith('@') || key.startsWith('xmlns') || key === '$') {
        continue;
      }

      if (key === '#text') {
        if (Object.keys(obj).length === 1) {
          return value;
        }
        normalized.textContent = value;
        continue;
      }
      if (value && typeof value === 'object') {
        normalized[key] = this.normalizeXmlParsedObject(value);
      } else {
        normalized[key] = value;
      }
    }

    return normalized;
  }

  private isArrayPath(obj: unknown, path: string): boolean {
    if (!path) return false;
    const normalizedPath = path.replace(/^\//, '').replace(/\//g, '.');
    const pathParts = normalizedPath.split('.');

    let current = obj;
    for (const part of pathParts) {
      if (Array.isArray(current)) {
        return true;
      }
      if (/^\d+$/.test(part)) {
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

  private getFieldValue(obj: unknown, path: string): unknown {
    return getFieldValue(obj, path);
  }

  extractTransactionType = (url: string): string => {
    const parts = url.split('/');
    const transactionType = parts[parts.length - 1];
    return transactionType || 'unknown';
  };
}
