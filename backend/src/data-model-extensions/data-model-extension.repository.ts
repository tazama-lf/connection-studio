import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import {
  DataModelExtension,
  ExtensionAuditLog,
  ExtensionStatus,
} from './data-model-extension.entity';
import { AddFieldDto, UpdateExtensionDto } from './data-model-extension.dto';
@Injectable()
export class DataModelExtensionRepository {
  constructor(@Inject('KNEX_CONNECTION') private readonly knex: Knex) {}
  async addField(dto: AddFieldDto): Promise<DataModelExtension> {
    const nextVersion = await this.getNextVersion(dto.collection);
    const id = uuidv4();
    const now = new Date();
    const extensionData = {
      id,
      collection: dto.collection,
      field_name: dto.fieldName,
      field_type: dto.fieldType,
      is_required: dto.required,
      default_value: dto.defaultValue ? JSON.stringify(dto.defaultValue) : null,
      version: nextVersion,
      status: ExtensionStatus.ACTIVE,
      created_by: dto.createdBy,
      created_at: now,
      updated_at: now,
    };
    await this.knex('data_model_extensions').insert(extensionData);
    const extension = await this.findById(id);
    if (!extension) {
      throw new Error('Failed to create extension');
    }
    return extension;
  }
  async findAll(): Promise<DataModelExtension[]> {
    const rows = await this.knex('data_model_extensions')
      .select('*')
      .orderBy('created_at', 'desc');
    return rows.map(this.mapToExtension);
  }
  async findById(id: string): Promise<DataModelExtension | null> {
    const row = await this.knex('data_model_extensions')
      .select('*')
      .where('id', id)
      .first();
    if (!row) return null;
    return this.mapToExtension(row);
  }
  async findByCollection(
    collection: string,
    status?: ExtensionStatus,
    version?: number,
  ): Promise<DataModelExtension[]> {
    let query = this.knex('data_model_extensions')
      .select('*')
      .where('collection', collection);
    if (status) {
      query = query.where('status', status);
    }
    if (version) {
      query = query.where('version', version);
    }
    const rows = await query
      .orderBy('version', 'desc')
      .orderBy('field_name', 'asc');
    return rows.map(this.mapToExtension);
  }
  async update(
    id: string,
    dto: UpdateExtensionDto,
  ): Promise<DataModelExtension> {
    const updateData: any = {
      updated_at: new Date(),
    };
    if (dto.fieldName !== undefined) {
      updateData.field_name = dto.fieldName;
    }
    if (dto.fieldType !== undefined) {
      updateData.field_type = dto.fieldType;
    }
    if (dto.required !== undefined) {
      updateData.is_required = dto.required;
    }
    if (dto.defaultValue !== undefined) {
      updateData.default_value = dto.defaultValue
        ? JSON.stringify(dto.defaultValue)
        : null;
    }
    if (dto.status !== undefined) {
      updateData.status = dto.status;
    }
    await this.knex('data_model_extensions').where('id', id).update(updateData);
    const extension = await this.findById(id);
    if (!extension) {
      throw new Error('Extension not found after update');
    }
    return extension;
  }
  async delete(id: string): Promise<void> {
    await this.knex('data_model_extensions').where('id', id).del();
  }
  async getNextVersion(collection: string): Promise<number> {
    const result = await this.knex('data_model_extensions')
      .select(this.knex.raw('MAX(version) as max_version'))
      .where('collection', collection)
      .first();
    return result?.max_version ? result.max_version + 1 : 1;
  }
  async findByFieldName(
    collection: string,
    fieldName: string,
  ): Promise<DataModelExtension[]> {
    const rows = await this.knex('data_model_extensions')
      .select('*')
      .where('collection', collection)
      .where('field_name', fieldName)
      .orderBy('version', 'desc');
    return rows.map(this.mapToExtension);
  }
  async addAuditLog(
    auditLog: Omit<ExtensionAuditLog, 'id' | 'timestamp'>,
  ): Promise<ExtensionAuditLog> {
    const id = uuidv4();
    const timestamp = new Date();
    const logData = {
      id,
      extension_id: auditLog.extensionId,
      action: auditLog.action,
      user_id: auditLog.userId,
      timestamp,
      previous_state: auditLog.previousState
        ? JSON.stringify(auditLog.previousState)
        : null,
      new_state: auditLog.newState ? JSON.stringify(auditLog.newState) : null,
      details: auditLog.details,
    };
    await this.knex('data_model_extension_audit_logs').insert(logData);
    return {
      id,
      timestamp,
      ...auditLog,
    };
  }
  async getAuditLogs(extensionId: string): Promise<ExtensionAuditLog[]> {
    const rows = await this.knex('data_model_extension_audit_logs')
      .select('*')
      .where('extension_id', extensionId)
      .orderBy('timestamp', 'desc');
    return rows.map((row) => ({
      id: row.id,
      extensionId: row.extension_id,
      action: row.action,
      userId: row.user_id,
      timestamp: new Date(row.timestamp),
      previousState: row.previous_state
        ? JSON.parse(row.previous_state)
        : undefined,
      newState: row.new_state ? JSON.parse(row.new_state) : undefined,
      details: row.details,
    }));
  }
  private mapToExtension(row: any): DataModelExtension {
    return {
      id: row.id,
      collection: row.collection,
      fieldName: row.field_name,
      fieldType: row.field_type,
      isRequired: row.is_required,
      defaultValue: row.default_value ? JSON.parse(row.default_value) : null,
      version: row.version,
      status: row.status,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
