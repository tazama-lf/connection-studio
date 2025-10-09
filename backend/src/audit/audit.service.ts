import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { randomUUID } from 'crypto';

export interface AuditLogEntry {
  action: string;
  entityType: string;
  entityId?: string;
  actor: string;
  tenantId: string;
  endpointName?: string;
  mappingName?: string;
  version?: number;
  details?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status?: 'SUCCESS' | 'FAILURE' | 'PENDING';
  errorMessage?: string;
}

export interface MappingAuditLogEntry {
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ROLLBACK' | 'APPROVE' | 'PUBLISH';
  actor: string;
  tenantId: string;
  mappingName?: string;
  endpointName?: string;
  version?: number;
}

@Injectable()
export class AuditService {
  constructor(@Inject('KNEX_CONNECTION') private readonly knex: Knex) {}

  async logAction(entry: AuditLogEntry): Promise<void> {
    try {
      await this.knex('audit_logs').insert({
        id: randomUUID(),
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        actor: entry.actor,
        endpoint_name: entry.endpointName || entry.mappingName || 'UNKNOWN',
        mapping_name: entry.mappingName,
        version: entry.version,
        tenant_id: entry.tenantId,
        details: entry.details,
        old_values: entry.oldValues ? JSON.stringify(entry.oldValues) : null,
        new_values: entry.newValues ? JSON.stringify(entry.newValues) : null,
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent,
        session_id: entry.sessionId,
        severity: entry.severity || 'MEDIUM',
        status: entry.status || 'SUCCESS',
        error_message: entry.errorMessage,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Failed to log audit entry:', error);
      console.error('Entry data:', entry);
    }
  }

  async logEndpointCreated(
    actor: string,
    endpointName: string,
    tenantId: string,
    version?: number,
  ): Promise<void> {
    await this.logAction({
      action: 'ENDPOINT_CREATED',
      entityType: 'ENDPOINT',
      actor,
      endpointName,
      tenantId,
      version,
    });
  }

  async logSchemaInferred(
    actor: string,
    endpointName: string,
    tenantId: string,
    version?: number,
  ): Promise<void> {
    await this.logAction({
      action: 'SCHEMA_INFERRED',
      entityType: 'SCHEMA',
      actor,
      endpointName,
      tenantId,
      version,
    });
  }

  async logDraftSaved(
    actor: string,
    endpointName: string,
    tenantId: string,
    version?: number,
  ): Promise<void> {
    await this.logAction({
      action: 'DRAFT_SAVED',
      entityType: 'ENDPOINT',
      actor,
      endpointName,
      tenantId,
      version,
    });
  }

  async logSchemaValidated(
    actor: string,
    endpointName: string,
    tenantId: string,
    version?: number,
  ): Promise<void> {
    await this.logAction({
      action: 'SCHEMA_VALIDATED',
      entityType: 'SCHEMA',
      actor,
      endpointName,
      tenantId,
      version,
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

  async logDataModelExtension(
    actor: string,
    extensionId: string,
    action: 'CREATED' | 'UPDATED' | 'DELETED',
    tenantId: string,
    details?: string,
  ): Promise<void> {
    await this.logAction({
      action: `DATA_MODEL_EXTENSION_${action}`,
      entityType: 'DATA_MODEL_EXTENSION',
      entityId: extensionId,
      actor,
      tenantId,
      details,
      severity: 'MEDIUM',
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
    const query = this.knex('audit_logs')
      .where('tenant_id', tenantId)
      .orderBy('timestamp', 'desc')
      .limit(limit);

    if (entityType) {
      query.where('entity_type', entityType);
    }

    if (actor) {
      query.where('actor', actor);
    }

    if (startDate) {
      query.where('timestamp', '>=', startDate);
    }

    if (endDate) {
      query.where('timestamp', '<=', endDate);
    }

    return query;
  }

  /**
   * Log mapping-related actions with simplified audit trail
   */
  async logMappingAction(entry: MappingAuditLogEntry): Promise<void> {
    try {
      await this.knex('audit_logs').insert({
        id: randomUUID(),
        action: entry.action,
        actor: entry.actor,
        endpoint_name: entry.endpointName || entry.mappingName || 'UNKNOWN',
        version: entry.version,
        tenant_id: entry.tenantId,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Failed to log mapping audit entry:', error);
      throw error;
    }
  }

  /**
   * Get audit logs by endpoint or mapping name
   */
  async getAuditLogsByName(
    name: string,
    tenantId: string,
    limit = 100,
  ): Promise<any[]> {
    return await this.knex('audit_logs')
      .select('action', 'actor', 'endpoint_name', 'version', 'timestamp')
      .where('endpoint_name', name)
      .where('tenant_id', tenantId)
      .orderBy('timestamp', 'desc')
      .limit(limit);
  }
}
