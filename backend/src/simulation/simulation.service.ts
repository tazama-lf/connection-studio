import { Injectable, Logger } from '@nestjs/common';
import { ConfigRepository } from '../config/config.repository';
import { Config, FieldMapping } from '../config/config.interfaces';
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
        config,
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

      // Stage 4: Validate Mappings Configuration (Optional)
      // If no mappings are defined, skip mapping stages
      const hasMappings = config.mapping && config.mapping.length > 0;

      if (hasMappings) {
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

        const mappingDetails = this.buildMappingDetails(
          config.mapping || [],
          parsedPayload,
          tcsResult,
        );

        transformedPayload = {
          originalPayload: parsedPayload,
          dataCache: tcsResult?.dataCache || {},
          endToEndId: tcsResult?.endToEndId || null,
          mappings: mappingDetails,
        };
      } else {
        // No mappings defined - skip mapping stages
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

        // No mapping results, just include original payload
        transformedPayload = {
          originalPayload: parsedPayload,
        };
      }

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
  private stageValidateSchema(
    payload: any,
    schema: any,
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
    // This method should only be called when mappings exist
    // The caller checks for empty mappings before calling this
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

      // This method should only be called when mappings exist
      // The caller checks for empty mappings before calling this
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
        // Source is always an array for consistency
        const sources = mapping.source || [];

        const normalizedSources = sources.map((source) =>
          source.replace(/\[(\d+)\]/g, '.$1'),
        );

        const destination = Array.isArray(mapping.destination)
          ? mapping.destination[0]
          : mapping.destination;

        const separator =
          mapping.transformation === 'CONCAT' ? mapping.delimiter || ' ' : '';

        mappings.push({
          destination: destination || '',
          sources: normalizedSources,
          separator,
          prefix: mapping.prefix,
        });
      }
    }

    return { mappings };
  }

  private buildMappingDetails(
    mappings: FieldMapping[],
    originalPayload: any,
    tcsResult: iMappingResult | null,
  ): Array<{
    destination: string;
    sources: string[];
    sourceValues: any[];
    transformation: string;
    resultValue: any;
    prefix?: string;
    delimiter?: string;
    constantValue?: any;
    operator?: string;
  }> {
    const details: Array<{
      destination: string;
      sources: string[];
      sourceValues: any[];
      transformation: string;
      resultValue: any;
      prefix?: string;
      delimiter?: string;
      constantValue?: any;
      operator?: string;
    }> = [];

    for (const mapping of mappings) {
      const sources = mapping.source || [];
      const destination = Array.isArray(mapping.destination)
        ? mapping.destination[0]
        : mapping.destination;

      // Extract source values from original payload
      const sourceValues = sources.map((sourcePath) =>
        this.getValueByPath(originalPayload, sourcePath),
      );

      // Determine the result value from tcsResult based on destination
      let resultValue: any = null;
      if (tcsResult && destination) {
        const [collectionName, fieldName] = destination.split('.');
        if (collectionName === 'redis' && tcsResult.dataCache) {
          resultValue = tcsResult.dataCache[fieldName];
        } else if (
          collectionName === 'transaction' &&
          fieldName === 'endToEndId'
        ) {
          resultValue = tcsResult.endToEndId;
        }
      }

      // If no TCS result available, show the transformed preview value
      if (resultValue === null) {
        resultValue = this.applyTransformation(
          sourceValues,
          mapping.transformation,
          mapping.delimiter,
          mapping.constantValue,
          mapping.operator,
          mapping.prefix,
        );
      }

      details.push({
        destination: destination || '',
        sources,
        sourceValues,
        transformation: mapping.transformation || 'NONE',
        resultValue,
        prefix: mapping.prefix,
        delimiter: mapping.delimiter,
        constantValue: mapping.constantValue,
        operator: mapping.operator,
      });
    }

    return details;
  }

  private getValueByPath(obj: any, path: string): any {
    if (!path) return undefined;

    const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');

    return normalizedPath.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Apply transformation to source values to show preview of what the result would be
   */
  private applyTransformation(
    sourceValues: any[],
    transformation: string | undefined,
    delimiter?: string,
    constantValue?: any,
    operator?: string,
    prefix?: string,
  ): any {
    if (!transformation || transformation === 'NONE') {
      // For no transformation, return first source value with prefix if applicable
      const value = sourceValues[0];
      return prefix ? `${prefix}${value}` : value;
    }

    switch (transformation) {
      case 'CONSTANT':
        return constantValue;

      case 'CONCAT':
        const values = sourceValues.filter(
          (v) => v !== undefined && v !== null,
        );
        const concatenated = values.join(delimiter || ' ');
        return prefix ? `${prefix}${concatenated}` : concatenated;

      case 'SUM':
        const numericValues = sourceValues
          .map((v) => parseFloat(v))
          .filter((v) => !isNaN(v));
        const sum = numericValues.reduce((acc, val) => acc + val, 0);
        return prefix ? `${prefix}${sum}` : sum;

      case 'MATH':
        if (sourceValues.length >= 2 && operator) {
          const val1 = parseFloat(sourceValues[0]);
          const val2 = parseFloat(sourceValues[1]);
          if (!isNaN(val1) && !isNaN(val2)) {
            let result: number;
            switch (operator) {
              case 'ADD':
                result = val1 + val2;
                break;
              case 'SUBTRACT':
                result = val1 - val2;
                break;
              case 'MULTIPLY':
                result = val1 * val2;
                break;
              case 'DIVIDE':
                result = val2 !== 0 ? val1 / val2 : 0;
                break;
              default:
                result = val1;
            }
            return prefix ? `${prefix}${result}` : result;
          }
        }
        return sourceValues[0];

      case 'SPLIT':
        // For split transformation, this would be shown in preview
        // but actual implementation would depend on how many destinations there are
        const splitValue = sourceValues[0];
        if (typeof splitValue === 'string' && delimiter) {
          const parts = splitValue.split(delimiter);
          return prefix ? `${prefix}${parts[0]}` : parts[0]; // Show first part in preview
        }
        return prefix ? `${prefix}${splitValue}` : splitValue;

      default:
        return sourceValues[0];
    }
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
      } catch (xmlError: any) {
        this.logger.error(`XML parsing failed: ${xmlError.message}`);
        throw new Error(`Invalid XML payload: ${xmlError.message}`);
      }
    }

    if (payloadType === 'application/json') {
      if (typeof payload === 'string') {
        try {
          return JSON.parse(payload);
        } catch (jsonError: any) {
          throw new Error(`Invalid JSON payload: ${jsonError.message}`);
        }
      }
      return payload;
    }

    throw new Error(
      `Unsupported payload type: "${payloadType}". Must be either "application/json" or "application/xml"`,
    );
  }

  /**
   * Normalize payload for schema validation, handling XML-specific structures
   */
  private normalizePayloadForValidation(payload: any, _config?: Config): any {
    if (!payload || typeof payload !== 'object') {
      return payload;
    }

    // If this looks like an XML-parsed object, apply normalization
    if (this.isXmlParsedObject(payload)) {
      return this.normalizeXmlParsedObject(payload);
    }

    return payload;
  }

  /**
   * Check if object looks like it came from XML parsing
   */
  private isXmlParsedObject(obj: any): boolean {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    // Look for common XML parsing indicators
    const hasXmlAttributes = Object.keys(obj).some((key) =>
      key.startsWith('@'),
    );
    const hasTextContent = Object.prototype.hasOwnProperty.call(obj, '#text');
    const hasNestedStructure = Object.values(obj).some(
      (val) => val && typeof val === 'object' && !Array.isArray(val),
    );

    return hasXmlAttributes || hasTextContent || hasNestedStructure;
  }

  /**
   * Normalize XML-parsed object structure for schema validation
   */
  private normalizeXmlParsedObject(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.normalizeXmlParsedObject(item));
    }

    const normalized: any = {};

    for (const [key, value] of Object.entries(obj)) {
      // Skip XML attributes for schema validation (they start with @)
      if (key.startsWith('@')) {
        continue;
      }

      // Handle text content specially
      if (key === '#text') {
        // If the object only has text content, return just the text
        if (Object.keys(obj).length === 1) {
          return value;
        }
        // Otherwise, include it as a property
        normalized['textContent'] = value;
        continue;
      }

      // Recursively normalize nested objects
      if (value && typeof value === 'object') {
        normalized[key] = this.normalizeXmlParsedObject(value);
      } else {
        normalized[key] = value;
      }
    }

    return normalized;
  }

  /**
   * Validate payload against JSON schema
   */
  private validatePayloadAgainstSchema(
    payload: any,
    schema: any,
    config?: Config,
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
      // Handle XML payload normalization for schema validation
      const normalizedPayload = this.normalizePayloadForValidation(
        payload,
        config,
      );

      const ajv = new Ajv({
        allErrors: true,
        strict: false,
        strictSchema: false,
        strictNumbers: true,
        strictTypes: false, // More lenient for XML-parsed content
        strictRequired: true,
        allowUnionTypes: true, // Allow for XML attribute/text content variations
        validateFormats: false,
      });

      const schemaWithStrict = this.enforceStrictSchema(schema, config);

      this.logger.log(`Original schema: ${JSON.stringify(schema)}`);
      this.logger.log(`Strict schema: ${JSON.stringify(schemaWithStrict)}`);
      this.logger.log(
        `Normalized payload: ${JSON.stringify(normalizedPayload).substring(0, 500)}...`,
      );

      const validate = ajv.compile(schemaWithStrict);

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
          // Skip certain benign errors for arrays
          if (
            error.keyword === 'additionalProperties' &&
            error.instancePath &&
            this.isArrayPath(normalizedPayload, error.instancePath)
          ) {
            continue;
          }

          // Handle array element type mismatches more gracefully
          if (error.keyword === 'type' && error.instancePath?.includes('/')) {
            const pathSegments = error.instancePath.split('/');
            const isArrayElement = pathSegments.some((segment) =>
              /^\d+$/.test(segment),
            );

            if (isArrayElement) {
              this.logger.debug(
                `Array element type mismatch at ${error.instancePath}: expected ${String(error.schema)}, got ${typeof error.data}`,
              );
              // Convert array index errors to more user-friendly messages
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
            message: error.message || 'Schema validation failed',
            path: error.instancePath,
            value: _.get(
              normalizedPayload,
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
      // Source is always an array for consistency
      const sources = mapping.source || [];

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

    // Convert JSON Pointer style path to dot notation
    const normalizedPath = path.replace(/^\//, '').replace(/\//g, '.');
    const pathParts = normalizedPath.split('.');

    let current = obj;
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];

      // Check if current level is an array
      if (Array.isArray(current)) {
        return true;
      }

      // Check if the part is a numeric index (indicating array access)
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

  private getFieldValue(obj: any, path: string): any {
    if (!path) return undefined;

    // Normalize array notation: convert [index] to .index
    const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');

    return _.get(obj, normalizedPath);
  }

  private enforceStrictSchema(schema: any, config?: Config): any {
    if (!schema || typeof schema !== 'object') {
      return schema;
    }

    const strictSchema = { ...schema };

    // Handle array schemas
    if (strictSchema.type === 'array') {
      if (strictSchema.items) {
        if (typeof strictSchema.items === 'object') {
          strictSchema.items = this.enforceStrictSchema(
            strictSchema.items,
            config,
          );

          // For arrays of objects, ensure additionalProperties is allowed
          if (strictSchema.items.type === 'object') {
            strictSchema.items.additionalProperties = true;
          }
        }
      }
      return strictSchema;
    }

    // Handle object schemas
    if (strictSchema.type === 'object') {
      strictSchema.additionalProperties = true;
    }

    // Recursively process nested schemas
    if (strictSchema.properties) {
      strictSchema.properties = Object.keys(strictSchema.properties).reduce(
        (acc, key) => {
          acc[key] = this.enforceStrictSchema(
            strictSchema.properties[key],
            config,
          );
          return acc;
        },
        {} as any,
      );
    }

    if (strictSchema.items && strictSchema.type !== 'array') {
      strictSchema.items = this.enforceStrictSchema(strictSchema.items, config);
    }

    // Handle schema composition keywords
    if (strictSchema.oneOf) {
      strictSchema.oneOf = strictSchema.oneOf.map((s: any) =>
        this.enforceStrictSchema(s, config),
      );
    }
    if (strictSchema.anyOf) {
      strictSchema.anyOf = strictSchema.anyOf.map((s: any) =>
        this.enforceStrictSchema(s, config),
      );
    }
    if (strictSchema.allOf) {
      strictSchema.allOf = strictSchema.allOf.map((s: any) =>
        this.enforceStrictSchema(s, config),
      );
    }

    return strictSchema;
  }
}
