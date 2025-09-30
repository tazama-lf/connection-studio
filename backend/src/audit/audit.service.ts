import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { randomUUID } from 'crypto';

export interface AuditLogEntry {
  action: string;
  actor: string;
  tenantId: string;
  endpointName?: string;
  mappingName?: string;
  version?: number;
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
        actor: entry.actor,
        endpoint_name: entry.endpointName || entry.mappingName || 'UNKNOWN',
        version: entry.version,
        tenant_id: entry.tenantId,
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
      actor,
      endpointName,
      tenantId,
      version,
    });
  }

  async getAuditLogs(
    tenantId: string,
    endpointName?: string,
    limit = 100,
  ): Promise<any[]> {
    const query = this.knex('audit_logs')
      .select('*')
      .where('tenant_id', tenantId)
      .orderBy('timestamp', 'desc')
      .limit(limit);

    if (endpointName) {
      query.where('endpoint_name', endpointName);
    }

    return await query;
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
