import { Injectable, Logger } from '@nestjs/common';
import { ConfigRepository } from '../config/config.repository';
import { TazamaDataModelService } from '../common/tazama-data-model.service';
import { FieldMapping, Config } from '../common/config.interfaces';
import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import * as xml2js from 'xml2js';

export interface SimulatePayloadDto {
  endpointId: number;
  payloadType: 'application/json' | 'application/xml';
  payload: any;
}

export interface SimulationError {
  field: string;
  message: string;
  path?: string;
  value?: any;
}

export interface SimulationResult {
  status: 'PASSED' | 'FAILED';
  errors: SimulationError[];
  transformedPayload: any;
  summary: {
    endpointId: number;
    tenantId: string;
    timestamp: string;
    validatedBy?: string;
    mappingsApplied: number;
    validationSteps: {
      schemaValidation: 'PASSED' | 'FAILED';
      mappingExecution: 'PASSED' | 'FAILED';
      tazamaValidation: 'PASSED' | 'FAILED';
    };
  };
}

@Injectable()
export class SimulationService {
  private readonly logger = new Logger(SimulationService.name);
  private readonly ajv: Ajv;

  constructor(
    private readonly configRepository: ConfigRepository,
    private readonly tazamaDataModelService: TazamaDataModelService,
  ) {
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv);
  }

  async simulateMapping(
    dto: SimulatePayloadDto,
    tenantId: string,
    userId?: string,
  ): Promise<SimulationResult> {
    const timestamp = new Date().toISOString();
    const errors: SimulationError[] = [];
    let transformedPayload = {};
    let mappingsApplied = 0;

    try {
      // Step 1: Load Configuration
      const config = await this.getEndpointConfig(dto.endpointId, tenantId);
      if (!config) {
        return this.createFailedResult(
          dto,
          timestamp,
          userId,
          [
            {
              field: 'endpointId',
              message: `Configuration not found for endpoint ${dto.endpointId}`,
            },
          ],
          tenantId,
        );
      }

      // Step 2: Parse Payload (JSON/XML)
      let parsedPayload: any;
      try {
        parsedPayload = await this.parsePayload(dto.payload, dto.payloadType);
      } catch (parseError: any) {
        errors.push({
          field: 'payload',
          message: `Failed to parse ${dto.payloadType}: ${parseError.message}`,
          value: dto.payload,
        });
        return this.createFailedResult(
          dto,
          timestamp,
          userId,
          errors,
          tenantId,
        );
      }

      // Step 3: Schema Validation
      const schemaValidation = this.validateSchema(
        parsedPayload,
        config.schema,
      );
      if (!schemaValidation.valid) {
        errors.push(...schemaValidation.errors);
      }

      // Step 4: Apply Field Mappings
      let mappingResult = {
        result: parsedPayload,
        applied: 0,
        errors: [] as SimulationError[],
      };

      if (config.mapping && config.mapping.length > 0) {
        mappingResult = this.applyMappings(parsedPayload, config.mapping);
        transformedPayload = mappingResult.result;
        mappingsApplied = mappingResult.applied;
        errors.push(...mappingResult.errors);
      } else {
        // No mappings defined - return original payload
        transformedPayload = parsedPayload;
      }

      // Step 5: Tazama Validation
      const tazamaValidation =
        await this.validateTazamaModel(transformedPayload);
      if (!tazamaValidation.valid) {
        errors.push(...tazamaValidation.errors);
      }

      // Step 6: Generate Result
      const status = errors.length === 0 ? 'PASSED' : 'FAILED';

      return {
        status,
        errors,
        transformedPayload,
        summary: {
          endpointId: dto.endpointId,
          tenantId,
          timestamp,
          validatedBy: userId,
          mappingsApplied,
          validationSteps: {
            schemaValidation: schemaValidation.valid ? 'PASSED' : 'FAILED',
            mappingExecution: mappingResult
              ? mappingResult.errors.length === 0
                ? 'PASSED'
                : 'FAILED'
              : 'PASSED',
            tazamaValidation: tazamaValidation.valid ? 'PASSED' : 'FAILED',
          },
        },
      };
    } catch (error: any) {
      return this.createFailedResult(
        dto,
        timestamp,
        userId,
        [{ field: 'system', message: `Simulation error: ${error.message}` }],
        tenantId,
      );
    }
  }

  private async getEndpointConfig(
    endpointId: number,
    tenantId: string,
  ): Promise<Config | null> {
    return this.configRepository.findConfigById(endpointId, tenantId);
  }

  /**
   * Parse payload based on content type
   */
  private async parsePayload(payload: any, payloadType: string): Promise<any> {
    if (payloadType === 'application/xml') {
      // If payload is already an object, assume it's been parsed
      if (typeof payload === 'object') {
        return payload;
      }

      // Parse XML string to object
      const parser = new xml2js.Parser({
        explicitArray: false,
        ignoreAttrs: false,
        mergeAttrs: true,
      });
      return await parser.parseStringPromise(payload);
    }

    // For JSON, if it's a string, parse it
    if (typeof payload === 'string') {
      return JSON.parse(payload);
    }

    // Already an object
    return payload;
  }

  /**
   * Validate payload against JSON schema
   */
  private validateSchema(
    payload: any,
    schema: any,
  ): { valid: boolean; errors: SimulationError[] } {
    if (!schema) {
      return { valid: true, errors: [] };
    }

    const validate = this.ajv.compile(schema);
    const valid = validate(payload);

    if (valid) {
      return { valid: true, errors: [] };
    }

    const errors: SimulationError[] = (validate.errors || []).map(
      (error: ErrorObject) => ({
        field: error.instancePath
          ? error.instancePath.replace('/', '')
          : error.schemaPath,
        message: error.message || 'Validation error',
        path: error.instancePath,
        value: error.data,
      }),
    );

    return { valid: false, errors };
  }

  /**
   * Apply field mappings with transformations
   */
  private applyMappings(
    sourcePayload: any,
    mappings: FieldMapping[],
  ): {
    result: any;
    applied: number;
    errors: SimulationError[];
  } {
    const result: any = {};
    const errors: SimulationError[] = [];
    let applied = 0;

    for (const mapping of mappings) {
      try {
        const success = this.applyMapping(sourcePayload, result, mapping);
        if (success) {
          applied++;
        }
      } catch (error: any) {
        errors.push({
          field: Array.isArray(mapping.destination)
            ? mapping.destination.join(', ')
            : mapping.destination,
          message: `Mapping error: ${error.message}`,
          path: Array.isArray(mapping.source)
            ? mapping.source.join(', ')
            : mapping.source,
        });
      }
    }

    return { result, applied, errors };
  }

  /**
   * Apply a single mapping transformation
   */
  private applyMapping(
    sourcePayload: any,
    result: any,
    mapping: FieldMapping,
  ): boolean {
    const {
      source,
      destination,
      transformation = 'NONE',
      delimiter = ' ',
    } = mapping;

    const transformationType = transformation;

    switch (transformationType) {
      case 'NONE':
        return this.applyNoneMapping(
          sourcePayload,
          result,
          source as string,
          destination as string,
        );

      case 'CONCAT':
        return this.applyConcatMapping(
          sourcePayload,
          result,
          source as string[],
          destination as string,
          delimiter,
        );

      case 'SPLIT':
        return this.applySplitMapping(
          sourcePayload,
          result,
          source as string,
          destination as string[],
          delimiter,
        );

      case 'SUM':
        return this.applySumMapping(
          sourcePayload,
          result,
          source as string[],
          destination as string,
        );

      default:
        throw new Error(
          `Unknown transformation type: ${String(transformationType)}`,
        );
    }
  }

  /**
   * ONE-TO-ONE: Direct copy (NONE transformation)
   */
  private applyNoneMapping(
    sourcePayload: any,
    result: any,
    sourcePath: string,
    destinationPath: string,
  ): boolean {
    const sourceValue = this.getNestedValue(sourcePayload, sourcePath);
    if (sourceValue !== undefined) {
      this.setNestedValue(result, destinationPath, sourceValue);
      return true;
    }
    return false;
  }

  /**
   * MANY-TO-ONE: Combine multiple fields (CONCAT transformation)
   */
  private applyConcatMapping(
    sourcePayload: any,
    result: any,
    sourcePaths: string[],
    destinationPath: string,
    delimiter: string,
  ): boolean {
    const values: string[] = [];

    for (const sourcePath of sourcePaths) {
      const value = this.getNestedValue(sourcePayload, sourcePath);
      if (value !== undefined && value !== null) {
        values.push(String(value));
      }
    }

    if (values.length > 0) {
      const concatenatedValue = values.join(delimiter);
      this.setNestedValue(result, destinationPath, concatenatedValue);
      return true;
    }

    return false;
  }

  /**
   * ONE-TO-MANY: Split one field into multiple (SPLIT transformation)
   */
  private applySplitMapping(
    sourcePayload: any,
    result: any,
    sourcePath: string,
    destinationPaths: string[],
    delimiter: string,
  ): boolean {
    const sourceValue = this.getNestedValue(sourcePayload, sourcePath);

    if (sourceValue !== undefined && sourceValue !== null) {
      const splitValues = String(sourceValue).split(delimiter);

      for (
        let i = 0;
        i < Math.min(splitValues.length, destinationPaths.length);
        i++
      ) {
        const trimmedValue = splitValues[i].trim();
        if (trimmedValue) {
          this.setNestedValue(result, destinationPaths[i], trimmedValue);
        }
      }

      return true;
    }

    return false;
  }

  /**
   * MANY-TO-ONE: Sum multiple numeric fields (SUM transformation)
   */
  private applySumMapping(
    sourcePayload: any,
    result: any,
    sourcePaths: string[],
    destinationPath: string,
  ): boolean {
    let sum = 0;
    let hasValues = false;

    for (const sourcePath of sourcePaths) {
      const value = this.getNestedValue(sourcePayload, sourcePath);
      if (value !== undefined && value !== null) {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          sum += numValue;
          hasValues = true;
        }
      }
    }

    if (hasValues) {
      this.setNestedValue(result, destinationPath, sum);
      return true;
    }

    return false;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Validate transformed payload against Tazama data model
   */
  private async validateTazamaModel(
    transformedPayload: any,
  ): Promise<{ valid: boolean; errors: SimulationError[] }> {
    const errors: SimulationError[] = [];

    try {
      // Check if all destination fields in the payload are valid Tazama paths
      this.validateTazamaFields(transformedPayload, '', errors);

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error: any) {
      this.logger.warn(`Tazama validation error: ${error.message}`);
      return {
        valid: false,
        errors: [
          {
            field: 'tazama',
            message: `Tazama validation failed: ${error.message}`,
            value: transformedPayload,
          },
        ],
      };
    }
  }

  /**
   * Recursively validate fields against Tazama data model
   */
  private validateTazamaFields(
    obj: any,
    basePath: string,
    errors: SimulationError[],
  ): void {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = basePath ? `${basePath}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Nested object - recurse deeper
        this.validateTazamaFields(value, currentPath, errors);
      } else {
        // Leaf field - validate path exists in Tazama model
        if (basePath) {
          // Only validate if we have a collection.field pattern
          const isValid =
            this.tazamaDataModelService.isValidDestinationPath(currentPath);
          if (!isValid) {
            errors.push({
              field: currentPath,
              message: `Invalid Tazama destination path: ${currentPath}`,
              path: currentPath,
              value: value,
            });
          }
        }
      }
    }
  }

  private createFailedResult(
    dto: SimulatePayloadDto,
    timestamp: string,
    userId: string | undefined,
    errors: SimulationError[],
    tenantId: string,
  ): SimulationResult {
    return {
      status: 'FAILED',
      errors,
      transformedPayload: {},
      summary: {
        endpointId: dto.endpointId,
        tenantId,
        timestamp,
        validatedBy: userId,
        mappingsApplied: 0,
        validationSteps: {
          schemaValidation: 'FAILED',
          mappingExecution: 'FAILED',
          tazamaValidation: 'FAILED',
        },
      },
    };
  }
}
