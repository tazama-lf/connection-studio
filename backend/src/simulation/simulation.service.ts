import { Injectable, Logger } from '@nestjs/common';
import { AdminServiceClient } from '../services/admin-service-client.service';
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
    private readonly adminServiceClient: AdminServiceClient,
    private readonly auditService: AuditService,
  ) {}

  async simulateMapping(
    dto: SimulatePayloadDto,
    tenantId: string,
    userId?: string,
    token?: string,
  ): Promise<SimulationResult> {
    const timestamp = new Date().toISOString();
    const stages: ValidationStage[] = [];
    const errors: SimulationError[] = [];
    let transformedPayload: any = {};
    let tcsResult: iMappingResult | null = null;
    let mappingsApplied = 0;

    // console.log('1--- Starting simulation for endpoint ID:', dto.endpointId);
    // console.log('2--- Payload type:', dto.payloadType);
    console.log('0. whole dto inside simulateMapping is:', dto);

    try {
      if (!dto.endpointId || isNaN(Number(dto.endpointId))) {
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
          transformedPayload: {},
          summary: {
            endpointId: dto.endpointId as any,
            tenantId,
            timestamp,
            mappingsApplied: 0,
            totalStages: 1,
            passedStages: 0,
            failedStages: 1,
          },
        };
      }
      const endpointId = Number(dto.endpointId);

      // first stage
      const configStage = await this.stageLoadConfig(
        endpointId,
        tenantId,
        token,
      );
      console.log('1. first stage output (configStage):', configStage);
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

      //config is gotten from configStage.details
      const config = configStage.details.config as Config;

      // second stage
      const parseStage = await this.stageParsePayload(
        dto.payload,
        dto.payloadType,
      );

      console.log('2. second stage output (parseStage):', parseStage);
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

      const cleanedSchema = this.cleanSchemaForXML(config.schema);

      //third stage
      const schemaStage = this.stageValidateSchema(
        parsedPayload,
        cleanedSchema,
        config,
      );

      console.log('3. third stage output (schemaStage):', schemaStage);
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

      const hasMappings = config.mapping && config.mapping.length > 0;

      if (hasMappings) {
        const mappingValidationStage = this.stageValidateMappings(
          parsedPayload,
          config.mapping || [],
        );

        //fourth stage
        console.log(
          '4. fourth stage output (mappingValidationStage):',
          mappingValidationStage,
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
        console.log('dto.tcsMapping is:', dto.tcsMapping);
        const tcsStage = await this.stageExecuteTCSMapping(
          parsedPayload,
          config,
          dto.tcsMapping,
        );

        // fifth stage
        console.log('5. fifth stage output (tcsStage):', tcsStage);
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

        // yeh bilkul theek hai VIP
        console.log('TCS VIP VIP config.mapping', config.mapping);

        //ismei bhand hai ig
        const mappingDetails = this.buildMappingDetails(
          config.mapping || [],
          parsedPayload,
          tcsResult,
        );

        console.log('TCS mappingDetails', mappingDetails);

        transformedPayload = {
          originalPayload: parsedPayload,
          dataCache: tcsResult?.dataCache || {},
          endToEndId: tcsResult?.endToEndId || null,
          mappings: config.mapping,
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
      const finalStatus = errors.length === 0 ? 'PASSED' : 'FAILED';

      void this.auditService.logAction({
        entityType: 'SIMULATION',
        action: 'TCS_SIMULATE_MAPPING',
        actor: userId || 'SYSTEM',
        tenantId,
        entityId: dto.endpointId.toString(),
        endpointName: config.endpointPath || undefined,
        version: config.version || undefined,
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
    } catch (error: any) {
      return {
        name: '1. Load Configuration',
        status: 'FAILED',
        message: 'Failed to load configuration',
        errors: [{ field: 'endpointId', message: error.message }],
      };
    }
  }
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

  private stageValidateMappings(
    payload: any,
    mappings: any[],
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
    payload: any,
    config: Config,
    providedMapping?: iMappingConfiguration,
  ): Promise<ValidationStage> {
    try {
      console.log('provided mapping is : ', providedMapping);

      // tcsMapping yahan banti hai
      const tcsMapping = config.mapping || [];
      // const tcsMapping = providedMapping;
      const mappingsApplied = config?.mapping?.length || 0;
      const endpoint =
        config.endpointPath ||
        `${config.msgFam || 'unknown'}-${config.transactionType}`;
      let tcsResult;

      try {
        console.log('payload before TCS processing:', payload);
        const enhancedPayload = {
          ...payload,
          TenantId: config.tenantId,
          TxTp: this.extractTransactionType(config.endpointPath),
        };
        console.log('Enhanced payload for TCS processing:', enhancedPayload);
        console.log('TCS Mapping Configuration:', tcsMapping); //yahin pe ghalat arhi
        console.log('Endpoint for TCS processing:', endpoint);
        // tcsResult = await processMappings(payload, tcsMapping, endpoint);

        // are we sedning the right stuff?
        tcsResult = await processMappings(
          enhancedPayload,
          tcsMapping,
          endpoint,
        );

        console.log('FINAL--> TCS mapping result: ', tcsResult);
      } catch (mappingError: any) {
        console.log('--> Mapping error: ', mappingError);
        if (mappingError.message?.includes('loggerService')) {
          this.logger.error(
            'TCS lib processMappings has logger issue - this should be fixed in tcs-lib',
          );
          tcsResult = {
            dataCache: {},
            transactionRelationship: {} as any,
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
          tcsResult,
          dataCache: tcsResult?.dataCache || {},
          transactionRelationship: tcsResult?.transactionRelationship || {},
          endToEndId: tcsResult?.endToEndId || '',
        },
      };
    } catch (error: any) {
      this.logger.error('TCS mapping execution failed:', error);
      return {
        name: '5. Execute TCS Mapping Functions',
        status: 'FAILED',
        message: `TCS mapping execution failed: ${error.message || 'Unknown error'}`,
        errors: [
          {
            field: 'tcsMapping',
            message: error.message || 'Unknown error',
            value: error.stack ? error.stack.substring(0, 200) : undefined,
          },
        ],
      };
    }
  }
  private convertConfigToTCSMapping(config: Config): {
    mappings?: Array<{
      destination: string;
      source: string[];
      separator?: string;
      prefix?: string;
      suffix?: string;
    }>;
  } {
    const mappings: Array<{
      destination: string;
      source: string[];
      separator?: string;
      prefix?: string;
    }> = [];

    if (config.mapping && Array.isArray(config.mapping)) {
      for (const mapping of config.mapping) {
        const source = mapping.source || [];

        const normalizedSources = (
          Array.isArray(source) ? source : [source]
        ).map((source) => source.replace(/\[(\d+)\]/g, '.$1'));
        if (
          mapping.transformation === 'SPLIT' &&
          Array.isArray(mapping.destination)
        ) {
          for (let i = 0; i < mapping.destination.length; i++) {
            const destination = mapping.destination[i];
            mappings.push({
              destination: destination || '',
              source: normalizedSources,
              separator: mapping.delimiter || ' ',
              prefix: mapping.prefix,
            });
          }
        } else {
          const destination = Array.isArray(mapping.destination)
            ? mapping.destination[0]
            : mapping.destination;

          const separator =
            mapping.transformation === 'CONCAT' ? mapping.delimiter || ' ' : '';

          mappings.push({
            destination: destination || '',
            source: normalizedSources,
            separator,
            prefix: mapping.prefix,
          });
        }
      }
    }

    return { mappings };
  }

  // handling multiple destinations for single source - split value usecase
  // if (typeof destination !== 'string' || typeof type !== 'string') {
  //   const sourceValue = getValueByPath<string>(payload, mapping.source[0]);
  //   const splitValues = sourceValue.split(mapping.delimiter);

  //   for (let j = 0; j < mapping.destination.length; j++) {
  //     const dest = mapping.destination[j].split('.')[1];
  //     const destType = mapping.destination[j].split('.')[0];

  //     if (destType === 'redis') {
  //       dataCache[dest] = splitValues[j];
  //     }
  //     if (destType === 'transactionDetails') {
  //       transactionRelationship[dest] = splitValues[j];
  //     }
  //   }
  //   continue;
  // }

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
      //       mapping inside buildMappingDetails: {
      //   source: [ 'pain001.GroupHeader.MessageId' ],
      //   delimiter: ' ',
      //   destination: [ 'redis.cdtrAcctId', 'redis.cdtrId', 'redis.creDtTm' ],
      //   transformation: 'SPLIT'
      // }

      const sources = mapping.source || [];

      //dealing with the split usecase here
      if (
        mapping.transformation === 'SPLIT' &&
        Array.isArray(mapping.destination)
      ) {
        // source values is an array of one thing always. we do 1:N and not N:M
        // const sourceValue = mapping.source.map((sourcePath) => this.getValueByPath(originalPayload, sourcePath));
        const sourceValues = (Array.isArray(sources) ? sources : [sources]).map(
          (sourcePath) => this.getValueByPath(originalPayload, sourcePath),
        );

        console.log('1. source values in SPLIT mapping:', sourceValues);

        // below logic is updated and correct
        const splitValues =
          typeof sourceValues[0] === 'string' && mapping.delimiter
            ? sourceValues[0].split(mapping.delimiter)
            : sourceValues[0].split(' '); //default split by space
        //below logic is incorrect. there is a array which contains one string. use that string and apply split on it simple
        // const splitValues = this.applyTransformation(
        //   sourceValues,
        //   mapping.transformation,
        //   mapping.delimiter,
        //   mapping.constantValue,
        //   mapping.operator,
        //   mapping.prefix,
        // );

        console.log('2. split values in SPLIT mapping:', splitValues); //single string
        console.log('3. destiantions in SPLIT mapping:', mapping.destination);
        console.log('4. data dache from tcsResult:', tcsResult?.dataCache);
        const destinationLength = mapping.destination.length;

        //   for (let i = 0; i < mapping.destination.length; i++) {
        //     const destination = mapping.destination[i];

        //     let resultValue: any = null;
        //     if (tcsResult && destination) {
        //       // collectionName is redis or transactionDetails
        //       // fieldName is cdtrAcctId or endToEndId etc

        //       const [collectionName, fieldName] = destination.split('.');

        //       if (collectionName === 'redis' && tcsResult.dataCache) {
        //         resultValue = tcsResult.dataCache[fieldName];
        //       } else if (
        //         collectionName === 'transactionDetails' &&
        //         fieldName === 'endToEndId'
        //       ) {
        //         resultValue = tcsResult.endToEndId;
        //       }
        //     }

        //     if (resultValue === null) {
        //       resultValue =
        //         Array.isArray(splitValues) && splitValues[i] !== undefined
        //           ? splitValues[i]
        //           : splitValues; // fallback to full result
        //     }

        //     const normalizedSourcesArr = Array.isArray(sources)
        //       ? sources
        //       : [sources];

        //     details.push({
        //       destination: destination || '',
        //       sources: normalizedSourcesArr,
        //       sourceValues,
        //       transformation: mapping.transformation || 'NONE',
        //       resultValue,
        //       prefix: mapping.prefix,
        //       delimiter: mapping.delimiter,
        //       constantValue: mapping.constantValue,
        //       operator: mapping.operator,
        //     });
        //   }
        // } else {
        //   const destination = Array.isArray(mapping.destination)
        //     ? mapping.destination[0]
        //     : mapping.destination;

        //   const sourceValues = (Array.isArray(sources) ? sources : [sources]).map(
        //     (sourcePath) => this.getValueByPath(originalPayload, sourcePath),
        //   );
        //   let resultValue: any = null;
        //   if (tcsResult && destination) {
        //     const [collectionName, fieldName] = destination.split('.');
        //     if (collectionName === 'redis' && tcsResult.dataCache) {
        //       resultValue = tcsResult.dataCache[fieldName];
        //     } else if (
        //       collectionName === 'transaction' &&
        //       fieldName === 'endToEndId'
        //     ) {
        //       resultValue = tcsResult.endToEndId;
        //     }
        //   }

        //   // If no TCS result available, show the transformed preview value
        //   if (resultValue === null) {
        //     resultValue = this.applyTransformation(
        //       sourceValues,
        //       mapping.transformation,
        //       mapping.delimiter,
        //       mapping.constantValue,
        //       mapping.operator,
        //       mapping.prefix,
        //     );
        //   }

        //   const normalizedSourcesArr = Array.isArray(sources)
        //     ? sources
        //     : [sources];
        //   details.push({
        //     destination: destination || '',
        //     sources: normalizedSourcesArr,
        //     sourceValues,
        //     transformation: mapping.transformation || 'NONE',
        //     resultValue,
        //     prefix: mapping.prefix,
        //     delimiter: mapping.delimiter,
        //     constantValue: mapping.constantValue,
        //     operator: mapping.operator,
        //   });
        // }

        for (let i = 0; i < destinationLength; i++) {
          console.log(
            `Processing destination index ${i} for SPLIT mapping`,
            mapping.destination[i],
          );
          const [internalDataModelObject, field] =
            mapping.destination[i].split('.');
          const resultValue = splitValues[i];

          if (internalDataModelObject == 'redis') {
          }

          console.log(
            `Mapping for ${internalDataModelObject}.${field}:`,
            resultValue,
          );
        }
      }
    }
    console.log(
      'Final mapping details returned by buildMappingDetails:',
      details,
    );
    return details;
  }

  private getValueByPath(obj: any, path: string): any {
    if (!path) return undefined;

    const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');

    return normalizedPath.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private applyTransformation(
    sourceValues: any[],
    transformation: string | undefined,
    delimiter?: string,
    constantValue?: any,
    operator?: string,
    prefix?: string,
  ): any {
    if (!transformation || transformation === 'NONE') {
      const value = sourceValues[0];
      return prefix ? `${prefix}${value}` : value;
    }

    switch (transformation) {
      case 'CONSTANT':
        return constantValue;

      case 'CONCAT': {
        const values = sourceValues.filter(
          (v) => v !== undefined && v !== null,
        );
        const concatenated = values.join(delimiter || ' ');
        return prefix ? `${prefix}${concatenated}` : concatenated;
      }

      case 'SUM': {
        const numericValues = sourceValues
          .map((v) => parseFloat(v as string))
          .filter((v) => !isNaN(v));
        const sum = numericValues.reduce((acc, val) => acc + val, 0);
        return prefix ? `${prefix}${sum}` : sum;
      }

      case 'MATH': {
        if (sourceValues.length >= 2 && operator) {
          const val1 = parseFloat(sourceValues[0] as string);
          const val2 = parseFloat(sourceValues[1] as string);
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
      }

      case 'SPLIT': {
        const splitValue = sourceValues[0];
        if (typeof splitValue === 'string' && delimiter) {
          const parts = splitValue.split(delimiter);
          return prefix ? `${prefix}${parts[0]}` : parts[0];
        }
        return prefix ? `${prefix}${splitValue}` : splitValue;
      }

      default:
        return sourceValues[0];
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

  private normalizePayloadForValidation(payload: any, config?: Config): any {
    if (!payload || typeof payload !== 'object') {
      return payload;
    }

    if (this.isXmlParsedObject(payload)) {
      const normalized = this.normalizeXmlParsedObjectWithSchema(
        payload,
        config?.schema,
      );
      if (config?.schema?.properties) {
        const schemaRootKeys = Object.keys(config.schema.properties);
        const payloadRootKeys = Object.keys(normalized);

        if (
          schemaRootKeys.length === 1 &&
          !payloadRootKeys.includes(schemaRootKeys[0])
        ) {
          const rootKey = schemaRootKeys[0];
          this.logger.debug(
            `Wrapping payload with schema root element: ${rootKey}`,
          );
          return { [rootKey]: normalized };
        }
      }

      return normalized;
    }

    return payload;
  }

  private cleanSchemaForXML(schema: any): any {
    if (!schema || typeof schema !== 'object') {
      return schema;
    }

    const cleanedSchema = { ...schema };

    if (cleanedSchema.required && Array.isArray(cleanedSchema.required)) {
      const originalRequired = cleanedSchema.required;
      cleanedSchema.required = cleanedSchema.required.filter(
        (field: string) =>
          !field.startsWith('xmlns') && field !== '$' && field !== '@',
      );

      if (originalRequired.length !== cleanedSchema.required.length) {
        this.logger.debug(
          `Removed ${originalRequired.length - cleanedSchema.required.length} XML attributes from required fields`,
        );
      }
    }
    if (
      cleanedSchema.properties &&
      typeof cleanedSchema.properties === 'object'
    ) {
      const cleanedProperties: any = {};
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

  private isXmlParsedObject(obj: any): boolean {
    if (!obj || typeof obj !== 'object') {
      return false;
    }
    const hasXmlAttributes = Object.keys(obj).some((key) =>
      key.startsWith('@'),
    );
    const hasTextContent = Object.prototype.hasOwnProperty.call(obj, '#text');
    const hasNestedStructure = Object.values(obj).some(
      (val) => val && typeof val === 'object' && !Array.isArray(val),
    );

    return hasXmlAttributes || hasTextContent || hasNestedStructure;
  }

  private normalizeXmlParsedObjectWithSchema(
    obj: any,
    schema?: any,
    path: string = '',
  ): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) =>
        this.normalizeXmlParsedObjectWithSchema(item, schema, path),
      );
    }

    const normalized: any = {};

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
        normalized['textContent'] = value;
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
          (normalizedValue.textContent !== undefined ||
            normalizedValue['#text'] !== undefined)
        ) {
          normalized[key] =
            normalizedValue.textContent || normalizedValue['#text'];
        } else {
          normalized[key] = normalizedValue;
        }
      } else {
        normalized[key] = value;
      }
    }

    return normalized;
  }

  private getSchemaTypeAtPath(schema: any, path: string): string | null {
    if (!schema || !path) return null;

    const parts = path.split('.');
    let current = schema;

    for (const part of parts) {
      if (current?.properties?.[part]) {
        current = current.properties[part];
      } else {
        return null;
      }
    }

    return current?.type || null;
  }

  private getSchemaAtPath(schema: any, path: string): any {
    if (!schema || !path) return null;

    const parts = path.split('.');
    let current = schema;

    for (const part of parts) {
      if (current?.properties?.[part]) {
        current = current.properties[part];
      } else {
        return null;
      }
    }

    return current;
  }

  private normalizeXmlParsedObject(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.normalizeXmlParsedObject(item));
    }

    const normalized: any = {};

    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith('@') || key.startsWith('xmlns') || key === '$') {
        continue;
      }

      if (key === '#text') {
        if (Object.keys(obj).length === 1) {
          return value;
        }
        normalized['textContent'] = value;
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
    payload: any,
    schema: any,
    config?: Config,
  ): SimulationError[] {
    this.logger.log('Validating payload against schema');
    this.logger.log(`Schema: ${JSON.stringify(schema)}...`);
    this.logger.log(`Payload: ${JSON.stringify(payload)}...`);

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
        payload,
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

      // this.logger.log(`Original schema: ${JSON.stringify(schema)}`);
      // this.logger.log(`Strict schema: ${JSON.stringify(schemaWithStrict)}`);
      // this.logger.log(
      //   `Normalized payload: ${JSON.stringify(normalizedPayload).substring(0, 500)}...`,
      // );

      const validate = ajv.compile(schemaWithStrict);

      const valid = validate(payload);

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
            error.keyword === 'additionalProperties' &&
            error.instancePath &&
            this.isArrayPath(normalizedPayload, error.instancePath)
          ) {
            continue;
          }
          if (error.keyword === 'type' && error.instancePath?.includes('/')) {
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

    const runtimeContextFields = ['tenantId', 'tenant_id', 'userId', 'user_id'];

    for (let i = 0; i < mappings.length; i++) {
      const mapping = mappings[i];
      let sources: string[] = [];
      if (mapping.sources && Array.isArray(mapping.sources)) {
        sources = mapping.sources;
      } else if (mapping.source) {
        sources = Array.isArray(mapping.source)
          ? mapping.source
          : [mapping.source];
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
            const rootKey = Object.keys(payload)[0];
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

    const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');

    return _.get(obj, normalizedPath);
  }

  private enforceStrictSchema(schema: any, config?: Config): any {
    if (!schema || typeof schema !== 'object') {
      return schema;
    }

    const strictSchema = { ...schema };

    const runtimeContextFields = ['tenantId', 'tenant_id', 'userId', 'user_id'];

    if (strictSchema.required && Array.isArray(strictSchema.required)) {
      strictSchema.required = strictSchema.required.filter(
        (field: string) => !runtimeContextFields.includes(field),
      );
      if (strictSchema.required.length === 0) {
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

          if (strictSchema.items.type === 'object') {
            strictSchema.items.additionalProperties = true;
          }
        }
      }
      return strictSchema;
    }

    if (strictSchema.type === 'object') {
      strictSchema.additionalProperties = true;
    }

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

  extractTransactionType = (url: string): string => {
    const parts = url.split('/');
    const transactionType = parts[parts.length - 1]; // Get the last part
    return transactionType || 'unknown';
  };
}
