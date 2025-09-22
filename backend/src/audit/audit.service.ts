import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';

export interface AuditLogEntry {
  action: string;
  editorIdentity: string;
  endpointName: string;
  details?: any;
}

@Injectable()
export class AuditService {
  constructor(@Inject('KNEX_CONNECTION') private readonly knex: Knex) {}

  async logAction(entry: AuditLogEntry): Promise<void> {
    try {
      await this.knex('audit_logs').insert({
        action: entry.action,
        editor_identity: entry.editorIdentity,
        endpoint_name: entry.endpointName,
        details: entry.details ? JSON.stringify(entry.details) : null,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Failed to log audit entry:', error);
    }
  }

  async logEndpointCreated(
    editorIdentity: string,
    endpointName: string,
    details: any,
  ): Promise<void> {
    await this.logAction({
      action: 'ENDPOINT_CREATED',
      editorIdentity,
      endpointName,
      details,
    });
  }

  async logSchemaInferred(
    editorIdentity: string,
    endpointName: string,
    details: any,
  ): Promise<void> {
    await this.logAction({
      action: 'SCHEMA_INFERRED',
      editorIdentity,
      endpointName,
      details,
    });
  }

  async logDraftSaved(
    editorIdentity: string,
    endpointName: string,
    details: any,
  ): Promise<void> {
    await this.logAction({
      action: 'DRAFT_SAVED',
      editorIdentity,
      endpointName,
      details,
    });
  }

  async logSchemaValidated(
    editorIdentity: string,
    endpointName: string,
    details: any,
  ): Promise<void> {
    await this.logAction({
      action: 'SCHEMA_VALIDATED',
      editorIdentity,
      endpointName,
      details,
    });
  }

  async getAuditLogs(endpointName?: string, limit = 100): Promise<any[]> {
    const query = this.knex('audit_logs')
      .select('*')
      .orderBy('timestamp', 'desc')
      .limit(limit);

    if (endpointName) {
      query.where('endpoint_name', endpointName);
    }

    return await query;
  }
}
