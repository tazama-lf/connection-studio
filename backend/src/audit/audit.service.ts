import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DatabaseService,
  DbAuditLogEntry as AuditLogEntry,
} from '@tazama-lf/tcs-lib';

export interface MappingAuditLogEntry {
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ROLLBACK' | 'APPROVE' | 'PUBLISH';
  actor: string;
  tenantId: string;
  mappingName?: string;
  endpointName?: string;
  version?: string;
}

@Injectable()
export class AuditService {
  private readonly dbService: DatabaseService;

  constructor(private readonly configService: ConfigService) {
    // Initialize DatabaseService with config from environment
    const dbConfig = {
      host: this.configService.get<string>('DB_HOST') || 'localhost',
      port: this.configService.get<number>('DB_PORT') || 5432,
      database: this.configService.get<string>('DB_NAME') || 'postgres',
      user: this.configService.get<string>('DB_USER') || 'postgres',
      password: this.configService.get<string>('DB_PASS') || 'newpassword',
    };
    this.dbService = new DatabaseService(dbConfig);
  }

  // Simple log method for compatibility with external services
  log(): void {
    // This method is required for compatibility with external FileParsingService
    // but can be a no-op since we use logAction for actual audit logging
  }

  async logAction(entry: AuditLogEntry): Promise<void> {
    return await this.dbService.logAction(entry);
  }

  async logEndpointCreated(
    actor: string,
    endpointName: string,
    tenantId: string,
    version?: string,
  ): Promise<void> {
    await this.logAction({
      action: 'ENDPOINT_CREATED',
      entityType: 'ENDPOINT',
      actor,
      endpointName,
      tenantId,
      version: version !== undefined ? Number(version) : undefined,
    });
  }

  async logSchemaInferred(
    actor: string,
    endpointName: string,
    tenantId: string,
    version?: string,
  ): Promise<void> {
    await this.logAction({
      action: 'SCHEMA_INFERRED',
      entityType: 'SCHEMA',
      actor,
      endpointName,
      tenantId,
      version: version !== undefined ? Number(version) : undefined,
    });
  }

  async logDraftSaved(
    actor: string,
    endpointName: string,
    tenantId: string,
    version?: string,
  ): Promise<void> {
    await this.logAction({
      action: 'DRAFT_SAVED',
      entityType: 'ENDPOINT',
      actor,
      endpointName,
      tenantId,
      version: version !== undefined ? Number(version) : undefined,
    });
  }

  async logSchemaValidated(
    actor: string,
    endpointName: string,
    tenantId: string,
    version?: string,
  ): Promise<void> {
    await this.logAction({
      action: 'SCHEMA_VALIDATED',
      entityType: 'SCHEMA',
      actor,
      endpointName,
      tenantId,
      version: version !== undefined ? Number(version) : undefined,
    });
  }

  async logConfigCreated(
    actor: string,
    configId: string,
    tenantId: string,
    details?: string,
  ): Promise<void> {
    await this.logAction({
      action: 'CONFIG_CREATED',
      entityType: 'CONFIG',
      entityId: configId,
      actor,
      tenantId,
      details,
      severity: 'MEDIUM',
    });
  }

  async logConfigUpdated(
    actor: string,
    configId: string,
    tenantId: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
  ): Promise<void> {
    await this.logAction({
      action: 'CONFIG_UPDATED',
      entityType: 'CONFIG',
      entityId: configId,
      actor,
      tenantId,
      oldValues,
      newValues,
      severity: 'MEDIUM',
    });
  }

  async logConfigDeleted(
    actor: string,
    configId: string,
    tenantId: string,
    details?: string,
  ): Promise<void> {
    await this.logAction({
      action: 'CONFIG_DELETED',
      entityType: 'CONFIG',
      entityId: configId,
      actor,
      tenantId,
      details,
      severity: 'HIGH',
    });
  }

  async logConfigCloned(
    actor: string,
    sourceConfigId: string,
    newConfigId: string,
    tenantId: string,
  ): Promise<void> {
    await this.logAction({
      action: 'CONFIG_CLONED',
      entityType: 'CONFIG',
      entityId: newConfigId,
      actor,
      tenantId,
      details: `Cloned from config ${sourceConfigId}`,
      severity: 'MEDIUM',
    });
  }

  async logMappingCreated(
    actor: string,
    configId: string,
    tenantId: string,
    mappingDetails: Record<string, any>,
  ): Promise<void> {
    await this.logAction({
      action: 'MAPPING_CREATED',
      entityType: 'MAPPING',
      entityId: configId,
      actor,
      tenantId,
      newValues: mappingDetails,
      severity: 'MEDIUM',
    });
  }

  async logMappingUpdated(
    actor: string,
    configId: string,
    tenantId: string,
    oldMapping: Record<string, any>,
    newMapping: Record<string, any>,
  ): Promise<void> {
    await this.logAction({
      action: 'MAPPING_UPDATED',
      entityType: 'MAPPING',
      entityId: configId,
      actor,
      tenantId,
      oldValues: oldMapping,
      newValues: newMapping,
      severity: 'MEDIUM',
    });
  }

  async logMappingDeleted(
    actor: string,
    configId: string,
    tenantId: string,
    mappingDetails: Record<string, any>,
  ): Promise<void> {
    await this.logAction({
      action: 'MAPPING_DELETED',
      entityType: 'MAPPING',
      entityId: configId,
      actor,
      tenantId,
      oldValues: mappingDetails,
      severity: 'MEDIUM',
    });
  }

  async logFieldAdjustment(
    actor: string,
    configId: string,
    tenantId: string,
    fieldPath: string,
    oldValue: any,
    newValue: any,
  ): Promise<void> {
    await this.logAction({
      action: 'FIELD_ADJUSTED',
      entityType: 'FIELD',
      entityId: configId,
      actor,
      tenantId,
      details: `Field: ${fieldPath}`,
      oldValues: { [fieldPath]: oldValue },
      newValues: { [fieldPath]: newValue },
      severity: 'MEDIUM',
    });
  }

  async logAuthentication(
    actor: string,
    tenantId: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logAction({
      action: success ? 'AUTH_SUCCESS' : 'AUTH_FAILURE',
      entityType: 'AUTH',
      actor,
      tenantId,
      ipAddress,
      userAgent,
      status: success ? 'SUCCESS' : 'FAILURE',
      severity: success ? 'LOW' : 'HIGH',
    });
  }

  async logError(
    actor: string,
    tenantId: string,
    errorMessage: string,
    details?: string,
  ): Promise<void> {
    await this.logAction({
      action: 'ERROR_OCCURRED',
      entityType: 'SYSTEM',
      actor,
      tenantId,
      details,
      errorMessage,
      status: 'FAILURE',
      severity: 'HIGH',
    });
  }

  async getAuditLogs(
    tenantId: string,
    entityType?: string,
    actor?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100,
  ): Promise<any[]> {
    return await this.dbService.getAuditLogs(
      tenantId,
      entityType,
      actor,
      startDate,
      endDate,
      limit,
    );
  }

  /**
   * Log mapping-related actions with simplified audit trail
   */
  async logMappingAction(entry: MappingAuditLogEntry): Promise<void> {
    await this.logAction({
      action: entry.action,
      entityType: 'MAPPING',
      actor: entry.actor,
      tenantId: entry.tenantId,
      endpointName: entry.endpointName,
      mappingName: entry.mappingName,
      version: entry.version !== undefined ? Number(entry.version) : undefined,
    });
  }

  /**
   * Get audit logs by endpoint or mapping name
   */
  async getAuditLogsByName(
    name: string,
    tenantId: string,
    limit = 100,
  ): Promise<any[]> {
    return await this.dbService.getAuditLogsByName(name, tenantId, limit);
  }
}
