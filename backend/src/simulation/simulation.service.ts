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

export interface SimulationResult {
  status: 'PASSED' | 'FAILED';
  errors: SimulationError[];
  tcsResult: iMappingResult | null;
  transformedPayload: any;
  summary: {
    endpointId: number;
    tenantId: string;
    timestamp: string;
    validatedBy?: string;
    mappingsApplied: number;
    validationSteps: {
      payloadParsing: 'PASSED' | 'FAILED';
      mappingExecution: 'PASSED' | 'FAILED';
    };
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

    try {
      // Get endpoint configuration
      const config = await this.getEndpointConfig(dto.endpointId, tenantId);
      if (!config) {
        return this.createFailedResult(
          dto,
          timestamp,
          userId,
          [{ field: 'endpointId', message: 'Configuration not found' }],
          tenantId,
        );
      }

      const errors: SimulationError[] = [];
      let tcsResult: iMappingResult | null = null;
      let transformedPayload: any = {};

      // Parse payload
      let parsedPayload: any;
      try {
        parsedPayload = await this.parsePayload(dto.payload, dto.payloadType);
      } catch (parseError: any) {
        errors.push({
          field: 'payload',
          message: 'Failed to parse payload: ' + parseError.message,
        });
        return this.createFailedResult(
          dto,
          timestamp,
          userId,
          errors,
          tenantId,
        );
      }

      // Apply TCS mappings
      let mappingsApplied = 0;
      try {
        const tcsMapping =
          dto.tcsMapping || this.createDefaultTCSMapping(config);
        mappingsApplied = tcsMapping.mappings?.length || 0;

        tcsResult = await processMappings(parsedPayload, tcsMapping);

        transformedPayload = {
          originalPayload: parsedPayload,
          dataCache: tcsResult?.dataCache || {},
          transactionRelationship: tcsResult?.transactionRelationship || {},
          endToEndId: tcsResult?.endToEndId || '',
        };
      } catch (mappingError: any) {
        errors.push({
          field: 'mapping',
          message: 'TCS mapping error: ' + mappingError.message,
        });
        transformedPayload = {
          originalPayload: parsedPayload,
          dataCache: {},
          transactionRelationship: {},
          endToEndId: '',
        };
      }

      const status = errors.length === 0 ? 'PASSED' : 'FAILED';

      this.auditService.logAction({
        entityType: 'SIMULATION',
        action: 'TCS_SIMULATE_MAPPING',
        actor: userId || 'SYSTEM',
        tenantId,
        entityId: dto.endpointId.toString(),
        details:
          'TCS simulation ' +
          status +
          ' for endpoint ' +
          dto.endpointId +
          ', mappings applied: ' +
          mappingsApplied +
          ', errors: ' +
          errors.length,
        status: status === 'PASSED' ? 'SUCCESS' : 'FAILURE',
        severity: status === 'PASSED' ? 'LOW' : 'MEDIUM',
      });

      return {
        status,
        errors,
        tcsResult,
        transformedPayload,
        summary: {
          endpointId: dto.endpointId,
          tenantId,
          timestamp,
          validatedBy: userId,
          mappingsApplied,
          validationSteps: {
            payloadParsing: 'PASSED',
            mappingExecution: errors.length === 0 ? 'PASSED' : 'FAILED',
          },
        },
      };
    } catch (error: any) {
      return this.createFailedResult(
        dto,
        timestamp,
        userId,
        [{ field: 'system', message: 'Simulation error: ' + error.message }],
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
      const parser = new xml2js.Parser({
        explicitArray: false,
        ignoreAttrs: false,
        mergeAttrs: true,
      });
      return parser.parseStringPromise(payload);
    }

    if (payloadType === 'application/json') {
      if (typeof payload === 'string') {
        return JSON.parse(payload);
      }
      return payload;
    }

    throw new Error('Unsupported payload type: ' + payloadType);
  }

  private createDefaultTCSMapping(_config: Config): iMappingConfiguration {
    const mappings: Array<{
      destination: string;
      sources: string[];
      separator?: string;
      prefix?: string;
      suffix?: string;
    }> = [];

    mappings.push(
      {
        destination: 'transaction.endToEndId',
        sources: ['endToEndIdentification', 'endToEndId', 'id'],
        separator: '',
      },
      {
        destination: 'redis.transactionKey',
        sources: ['id', 'transactionId'],
        prefix: 'TXN_',
        separator: '_',
      },
    );

    return { mappings };
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
      tcsResult: null,
      transformedPayload: {},
      summary: {
        endpointId: dto.endpointId,
        tenantId,
        timestamp,
        validatedBy: userId,
        mappingsApplied: 0,
        validationSteps: {
          payloadParsing: 'FAILED',
          mappingExecution: 'FAILED',
        },
      },
    };
  }
}
