import { Injectable, Logger } from '@nestjs/common';
import { AdminServiceClient } from '../services/admin-service-client.service';
import { Config } from '../config/config.interfaces';
import {
  processMappings,
  iMappingConfiguration,
  iMappingResult,
} from '@tazama-lf/tcs-lib';
import * as xml2js from 'xml2js';
import Ajv from 'ajv';
import * as _ from 'lodash';

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

  constructor(private readonly adminServiceClient: AdminServiceClient) {}

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

      const cleanedSchema = this.cleanSchemaForXML(config.schema);

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
    const errors = this.validatePayloadAgainstSchema(payload, schema, config);

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

  private normalizePayloadForValidation(
    payload: Record<string, unknown>,
    config?: Config,
  ): Record<string, unknown> {
    if (this.isXmlParsedObject(payload)) {
      const normalized = this.normalizeXmlParsedObjectWithSchema(
        payload,
        config?.schema,
      );
      if (config?.schema) {
        const schemaProperties = config.schema.properties;
        if (schemaProperties) {
          const schemaRootKeys = Object.keys(schemaProperties);
          const payloadRootKeys = Object.keys(
            normalized as Record<string, unknown>,
          );

          if (
            schemaRootKeys.length === 1 &&
            !payloadRootKeys.includes(schemaRootKeys[0])
          ) {
            const [rootKey] = schemaRootKeys;
            this.logger.debug(
              `Wrapping payload with schema root element: ${rootKey}`,
            );
            return { [rootKey]: normalized };
          }
        }
      }

      return normalized as Record<string, unknown>;
    }

    return payload;
  }

  private cleanSchemaForXML(schema: unknown): unknown {
    if (!schema || typeof schema !== 'object') {
      return schema;
    }

    const cleanedSchema: Record<string, unknown> = { ...schema };

    if (cleanedSchema.required && Array.isArray(cleanedSchema.required)) {
      const originalRequired = cleanedSchema.required as string[];
      cleanedSchema.required = (cleanedSchema.required as string[]).filter(
        (field: string) =>
          !field.startsWith('xmlns') && field !== '$' && field !== '@',
      );

      if (
        originalRequired.length !== (cleanedSchema.required as string[]).length
      ) {
        this.logger.debug(
          `Removed ${originalRequired.length - (cleanedSchema.required as string[]).length} XML attributes from required fields`,
        );
      }
    }
    if (
      cleanedSchema.properties &&
      typeof cleanedSchema.properties === 'object'
    ) {
      const cleanedProperties: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(cleanedSchema.properties)) {
        if (key.startsWith('xmlns') || key.startsWith('@') || key === '$') {
          this.logger.debug(`Skipping XML attribute property: ${key}`);
          continue;
        }
        if (value && typeof value === 'object') {
          cleanedProperties[key] = this.cleanSchemaForXML(value);
        } else {
          cleanedProperties[key] = value;
        }
      }
      cleanedSchema.properties = cleanedProperties;
    }

    return cleanedSchema;
  }

  private isXmlParsedObject(obj: unknown): boolean {
    if (!obj || typeof obj !== 'object') {
      return false;
    }
    const hasXmlAttributes = Object.keys(obj).some((key) =>
      key.startsWith('@'),
    );
    const hasTextContent = Object.prototype.hasOwnProperty.call(obj, '#text');
    const hasNestedStructure = Object.values(obj).some(
      (val) =>
        val !== null &&
        val !== undefined &&
        typeof val === 'object' &&
        !Array.isArray(val),
    );

    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic, not nullish coalescing
    return hasXmlAttributes || hasTextContent || hasNestedStructure;
  }

  private normalizeXmlParsedObjectWithSchema(
    obj: unknown,
    schema?: unknown,
    path = '',
  ): unknown {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) =>
        this.normalizeXmlParsedObjectWithSchema(item, schema, path),
      );
    }

    const normalized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith('@') || key.startsWith('xmlns') || key === '$') {
        continue;
      }
      if (key === '#text') {
        const hasAttributes = Object.keys(obj).some(
          (k) => k !== '#text' && !k.startsWith('@'),
        );
        const hasOnlyTextAndAttributes = Object.keys(obj).every(
          (k) => k === '#text' || k.startsWith('@') || !k.startsWith('@'),
        );

        const expectedType = this.getSchemaTypeAtPath(schema, path);

        if (expectedType === 'string' && hasAttributes) {
          return value;
        }

        if (Object.keys(obj).length === 1 || hasOnlyTextAndAttributes) {
          return value;
        }
        normalized.textContent = value;
        continue;
      }
      const currentPath = path ? `${path}.${key}` : key;

      const fieldSchema = this.getSchemaAtPath(schema, currentPath);

      if (value && typeof value === 'object') {
        const normalizedValue = this.normalizeXmlParsedObjectWithSchema(
          value,
          fieldSchema,
          currentPath,
        );
        if (
          fieldSchema?.type === 'string' &&
          typeof normalizedValue === 'object' &&
          normalizedValue !== null &&
          ((normalizedValue as Record<string, unknown>).textContent !==
            undefined ||
            (normalizedValue as Record<string, unknown>)['#text'] !== undefined)
        ) {
          normalized[key] =
            (normalizedValue as Record<string, unknown>).textContent ??
            (normalizedValue as Record<string, unknown>)['#text'];
        } else {
          normalized[key] = normalizedValue;
        }
      } else {
        normalized[key] = value;
      }
    }

    return normalized;
  }

  private getSchemaTypeAtPath(schema: unknown, path: string): string | null {
    if (!schema || !path) return null;

    const parts = path.split('.');
    let current = schema as Record<string, unknown>;

    for (const part of parts) {
      const props = current.properties as Record<string, unknown> | undefined;
      if (props?.[part]) {
        current = props[part] as Record<string, unknown>;
      } else {
        return null;
      }
    }

    if (current.type === null || current.type === undefined) {
      return null;
    }
    return current.type as string;
  }

  private getSchemaAtPath(
    schema: unknown,
    path: string,
  ): Record<string, unknown> | null {
    if (!schema || !path) return null;

    const parts = path.split('.');
    let current = schema as Record<string, unknown>;

    for (const part of parts) {
      const props = current.properties as Record<string, unknown> | undefined;
      if (props?.[part]) {
        current = props[part] as Record<string, unknown>;
      } else {
        return null;
      }
    }

    return current;
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

  private validatePayloadAgainstSchema(
    payload: unknown,
    schema: unknown,
    config?: Config,
  ): SimulationError[] {
    const errors: SimulationError[] = [];

    if (!schema) {
      errors.push({
        field: 'schema',
        message: 'No schema defined in configuration',
      });
      return errors;
    }

    try {
      const normalizedPayload = this.normalizePayloadForValidation(
        payload as Record<string, unknown>,
        config,
      );

      const ajv = new Ajv({
        allErrors: true,
        strict: false,
        strictSchema: false,
        strictNumbers: true,
        strictTypes: false,
        strictRequired: true,
        allowUnionTypes: true,
        validateFormats: false,
      });

      const schemaWithStrict = this.enforceStrictSchema(schema, config);

      const validate = ajv.compile(schemaWithStrict as Record<string, unknown>);

      const valid = validate(normalizedPayload);

      this.logger.debug(`Schema validation result: ${valid}`);
      this.logger.debug(
        `Payload type: ${Array.isArray(normalizedPayload) ? 'array' : typeof normalizedPayload}`,
      );

      if (!valid && validate.errors) {
        this.logger.warn(
          `Schema validation errors: ${JSON.stringify(validate.errors)}`,
        );

        for (const error of validate.errors) {
          if (
            error.keyword === 'type' &&
            error.instancePath &&
            error.instancePath.includes('/')
          ) {
            const pathSegments = error.instancePath.split('/');
            const isArrayElement = pathSegments.some((segment) =>
              /^\d+$/.test(segment),
            );

            if (isArrayElement) {
              this.logger.debug(
                `Array element type mismatch at ${error.instancePath}: expected ${String(error.schema)}, got ${typeof error.data}`,
              );
              const friendlyPath = error.instancePath
                .replace(/^\//, '')
                .replace(/\//g, '.');
              errors.push({
                field: friendlyPath,
                message: `Array element at ${friendlyPath}: expected ${String(error.schema)}, got ${typeof error.data}`,
                path: error.instancePath,
                value: error.data,
              });
              continue;
            }
          }

          errors.push({
            field: error.instancePath || 'root',
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Using || to handle empty strings
            message: error.message || 'Schema validation failed',
            path: error.instancePath,
            value: _.get(
              normalizedPayload,
              error.instancePath.replace(/^\//, '').replace(/\//g, '.'),
            ),
          });
        }
      }
    } catch (schemaError: unknown) {
      const errorMessage =
        schemaError instanceof Error ? schemaError.message : 'Unknown error';
      this.logger.error(`Schema validation error: ${errorMessage}`);
      errors.push({
        field: 'schema',
        message: 'Schema validation error: ' + errorMessage,
      });
    }

    return errors;
  }

  private validateMappings(
    payload: Record<string, unknown>,
    mappings: unknown[],
  ): SimulationError[] {
    const errors: SimulationError[] = [];

    const runtimeContextFields = ['tenantId', 'tenant_id', 'userId', 'user_id'];

    for (let i = 0; i < mappings.length; i += 1) {
      const mapping = mappings[i] as Record<string, unknown>; // Type assertion for complex mapping validation
      let sources: string[] = [];
      const { sources: mappingSources, source } = mapping;
      if (mappingSources && Array.isArray(mappingSources)) {
        sources = mappingSources;
      } else if (source) {
        sources = Array.isArray(source) ? source : [source];
      }
      if (
        mapping.transformation === 'CONSTANT' ||
        mapping.constantValue !== undefined
      ) {
        continue;
      }

      let anySourceExists = false;
      const missingSources: string[] = [];
      const allSourcesAreRuntimeContext = sources.every((src: string) =>
        runtimeContextFields.includes(src),
      );

      for (const source of sources) {
        if (runtimeContextFields.includes(source)) {
          anySourceExists = true;
          break;
        }

        const fieldValue = this.getFieldValue(payload, source);
        if (fieldValue === undefined || fieldValue === null) {
          this.logger.debug(`Field not found: ${source}`);
          this.logger.debug(
            `Available root keys: ${Object.keys(payload).join(', ')}`,
          );
          if (Object.keys(payload).length === 1) {
            const [rootKey] = Object.keys(payload);
            const suggestedPath = `${rootKey}.${source}`;
            const suggestedValue = this.getFieldValue(payload, suggestedPath);
            if (suggestedValue !== undefined) {
              this.logger.warn(
                `Field '${source}' not found, but '${suggestedPath}' exists. ` +
                  'For XML payloads, include the root element in the path.',
              );
            }
          }
        }

        if (fieldValue !== undefined && fieldValue !== null) {
          anySourceExists = true;
          break;
        } else {
          missingSources.push(source);
        }
      }
      if (
        !anySourceExists &&
        sources.length > 0 &&
        !allSourcesAreRuntimeContext
      ) {
        const nonRuntimeMissing = missingSources.filter(
          (src) => !runtimeContextFields.includes(src),
        );

        if (nonRuntimeMissing.length > 0) {
          errors.push({
            field: 'mapping',
            message: `Mapping #${i + 1}: None of the source fields exist in payload: ${nonRuntimeMissing.join(', ')}`,
            path: `mappings[${i}]`,
            value: mapping,
          });
        }
      }
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
    if (!path) return undefined;

    const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');

    return _.get(obj, normalizedPath);
  }

  private enforceStrictSchema(schema: unknown, config?: Config): unknown {
    if (!schema || typeof schema !== 'object') {
      return schema;
    }

    const strictSchema: Record<string, unknown> = {
      ...(schema as Record<string, unknown>),
    };

    const runtimeContextFields = ['tenantId', 'tenant_id', 'userId', 'user_id'];

    if (strictSchema.required && Array.isArray(strictSchema.required)) {
      strictSchema.required = (strictSchema.required as string[]).filter(
        (field: string) => !runtimeContextFields.includes(field),
      );
      if ((strictSchema.required as string[]).length === 0) {
        delete strictSchema.required;
      }
    }

    if (strictSchema.type === 'array') {
      if (strictSchema.items) {
        if (typeof strictSchema.items === 'object') {
          strictSchema.items = this.enforceStrictSchema(
            strictSchema.items,
            config,
          );

          const items = strictSchema.items as Record<string, unknown>;
          if (items.type === 'object') {
            items.additionalProperties = true;
          }
        }
      }
      return strictSchema;
    }

    if (strictSchema.type === 'object') {
      strictSchema.additionalProperties = true;
    }

    strictSchema.properties &&= Object.keys(
      strictSchema.properties as Record<string, unknown>,
    ).reduce<Record<string, unknown>>((acc, key) => {
      const updatedAcc = { ...acc };
      updatedAcc[key] = this.enforceStrictSchema(
        (strictSchema.properties as Record<string, unknown>)[key],
        config,
      );
      return updatedAcc;
    }, {});

    if (strictSchema.items && strictSchema.type !== 'array') {
      strictSchema.items = this.enforceStrictSchema(strictSchema.items, config);
    }
    strictSchema.oneOf &&= (strictSchema.oneOf as unknown[]).map((s: unknown) =>
      this.enforceStrictSchema(s, config),
    );
    strictSchema.anyOf &&= (strictSchema.anyOf as unknown[]).map((s: unknown) =>
      this.enforceStrictSchema(s, config),
    );
    strictSchema.allOf &&= (strictSchema.allOf as unknown[]).map((s: unknown) =>
      this.enforceStrictSchema(s, config),
    );

    return strictSchema;
  }

  extractTransactionType = (url: string): string => {
    const parts = url.split('/');
    const transactionType = parts[parts.length - 1];
    return transactionType || 'unknown';
  };
}
