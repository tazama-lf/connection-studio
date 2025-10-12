import { Injectable, Logger } from '@nestjs/common';
import { ConfigRepository } from '../config/config.repository';
import { TazamaDataModelService } from '../data-model-extensions/tazama-data-model.service';
import { FieldMapping, Config } from '../config/config.interfaces';
import { AuditService } from '../audit/audit.service';
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
    private readonly auditService: AuditService,
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
      let parsedPayload: any;
      try {
        parsedPayload = await this.parsePayload(dto.payload, dto.payloadType);
      } catch (parseError: any) {
        errors.push({
          field: 'payload',
          message: `Failed to parse ${dto.payloadType}: ${parseError.message}`,
          value: dto.payload,
        });
        let validationPayload = parsedPayload;
        if (dto.payloadType === 'application/xml' && parsedPayload) {
          const rootKeys = Object.keys(parsedPayload);
          if (rootKeys.length === 1) {
            validationPayload = parsedPayload[rootKeys[0]];
          }
        }
        const schemaValidation = this.validateSchema(
          validationPayload,
          config.schema,
        );
        if (!schemaValidation.valid) {
          errors.push(...schemaValidation.errors);
        }
        return this.createFailedResult(
          dto,
          timestamp,
          userId,
          errors,
          tenantId,
        );
      }
      const schemaValidation = this.validateSchema(
        parsedPayload,
        config.schema,
      );
      if (!schemaValidation.valid) {
        errors.push(...schemaValidation.errors);
      }
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
        transformedPayload = parsedPayload;
      }
      const tazamaValidation =
        await this.validateTazamaModel(transformedPayload);
      if (!tazamaValidation.valid) {
        errors.push(...tazamaValidation.errors);
      }
      const status = errors.length === 0 ? 'PASSED' : 'FAILED';

      this.auditService.logAction({
        entityType: 'SIMULATION',
        action: 'SIMULATE_MAPPING',
        actor: userId || 'SYSTEM',
        tenantId,
        entityId: dto.endpointId.toString(),
        details: `Simulation ${status} for endpoint ${dto.endpointId}, mappings applied: ${mappingsApplied}, errors: ${errors.length}`,
        status: status === 'PASSED' ? 'SUCCESS' : 'FAILURE',
        severity: status === 'PASSED' ? 'LOW' : 'MEDIUM',
      });

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

  private async parsePayload(payload: any, payloadType: string): Promise<any> {
    if (payloadType === 'application/xml') {
      if (typeof payload === 'object') {
        return payload;
      }
      const parser = new xml2js.Parser({
        explicitArray: false,
        ignoreAttrs: false,
        mergeAttrs: true,
      });
      return await parser.parseStringPromise(payload);
    }
    if (typeof payload === 'string') {
      return JSON.parse(payload);
    }
    return payload;
  }

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
        const sourcePath = mapping.source
          ? Array.isArray(mapping.source)
            ? mapping.source.join(', ')
            : mapping.source
          : 'constant';
        errors.push({
          field: Array.isArray(mapping.destination)
            ? mapping.destination.join(', ')
            : mapping.destination,
          message: `Mapping error: ${error.message}`,
          path: sourcePath,
        });
      }
    }
    return { result, applied, errors };
  }

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
      constantValue,
      operator = 'ADD',
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
      case 'MATH':
        return this.applyMathMapping(
          sourcePayload,
          result,
          source as string[],
          destination as string,
          operator,
        );
      case 'CONSTANT':
        return this.applyConstantMapping(
          result,
          destination as string,
          constantValue,
        );
      default:
        throw new Error(
          `Unknown transformation type: ${String(transformationType)}`,
        );
    }
  }
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

  private applyMathMapping(
    sourcePayload: any,
    result: any,
    sourcePaths: string[],
    destinationPath: string,
    operator: 'ADD' | 'SUBTRACT' | 'MULTIPLY' | 'DIVIDE',
  ): boolean {
    const values: number[] = [];
    for (const sourcePath of sourcePaths) {
      const value = this.getNestedValue(sourcePayload, sourcePath);
      if (value !== undefined && value !== null) {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          values.push(numValue);
        }
      }
    }
    if (values.length === 0) {
      return false;
    }
    let result_value: number;
    switch (operator) {
      case 'ADD':
        result_value = values.reduce((acc, val) => acc + val, 0);
        break;
      case 'SUBTRACT':
        if (values.length < 2) {
          throw new Error('SUBTRACT operation requires at least 2 values');
        }
        result_value = values.reduce((acc, val, index) =>
          index === 0 ? val : acc - val,
        );
        break;
      case 'MULTIPLY':
        result_value = values.reduce((acc, val) => acc * val, 1);
        break;
      case 'DIVIDE':
        if (values.length < 2) {
          throw new Error('DIVIDE operation requires at least 2 values');
        }
        result_value = values.reduce((acc, val, index) => {
          if (index === 0) return val;
          if (val === 0) {
            throw new Error('Division by zero is not allowed');
          }
          return acc / val;
        });
        break;
      default:
        throw new Error(`Unknown operator: ${String(operator)}`);
    }
    this.setNestedValue(result, destinationPath, result_value);
    return true;
  }
  private applyConstantMapping(
    result: any,
    destinationPath: string,
    constantValue: any,
  ): boolean {
    if (constantValue !== undefined && constantValue !== null) {
      this.setNestedValue(result, destinationPath, constantValue);
      return true;
    }
    return false;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

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

  private async validateTazamaModel(
    transformedPayload: any,
  ): Promise<{ valid: boolean; errors: SimulationError[] }> {
    const errors: SimulationError[] = [];
    try {
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
        this.validateTazamaFields(value, currentPath, errors);
      } else {
        if (basePath) {
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
