import { Injectable, Logger, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import {
  TazamaDataModelExtension,
  TazamaCollectionName,
  TazamaFieldType,
} from './tazama-data-model.interfaces';
@Injectable()
export class DataModelExtensionRepository {
  private readonly logger = new Logger(DataModelExtensionRepository.name);
  private readonly tableName = 'data_model_extensions';
  constructor(@Inject('KNEX_CONNECTION') private readonly knex: Knex) {}
  async create(
    extension: Omit<TazamaDataModelExtension, 'id' | 'createdAt'>,
  ): Promise<number> {
    this.logger.log(
      `Creating data model extension: ${extension.collection}.${extension.fieldName}`,
    );
    const [result] = await this.knex(this.tableName)
      .insert({
        collection: extension.collection,
        field_name: extension.fieldName,
        field_type: extension.fieldType,
        description: extension.description,
        is_required: extension.isRequired || false,
        default_value: extension.defaultValue
          ? JSON.stringify(extension.defaultValue)
          : null,
        validation: extension.validation
          ? JSON.stringify(extension.validation)
          : null,
        tenant_id: extension.tenantId,
        created_by: extension.createdBy,
        version: extension.version || 1,
      })
      .returning('id');
    return result.id;
  }
  async findById(
    id: number,
    tenantId: string,
  ): Promise<TazamaDataModelExtension | null> {
    const result = await this.knex(this.tableName)
      .where({ id, tenant_id: tenantId })
      .first();
    if (!result) {
      return null;
    }
    return this.mapToExtension(result);
  }
  async findByCollection(
    collection: TazamaCollectionName,
    tenantId: string,
  ): Promise<TazamaDataModelExtension[]> {
    const results = await this.knex(this.tableName)
      .where({ collection, tenant_id: tenantId })
      .orderBy('created_at', 'desc');
    return results.map((row) => this.mapToExtension(row));
  }
  async findByCollectionAndField(
    collection: TazamaCollectionName,
    fieldName: string,
    tenantId: string,
  ): Promise<TazamaDataModelExtension | null> {
    const result = await this.knex(this.tableName)
      .where({
        collection,
        field_name: fieldName,
        tenant_id: tenantId,
      })
      .first();
    if (!result) {
      return null;
    }
    return this.mapToExtension(result);
  }
  async findAllByTenant(tenantId: string): Promise<TazamaDataModelExtension[]> {
    const results = await this.knex(this.tableName)
      .where({ tenant_id: tenantId })
      .orderBy(['collection', 'field_name']);
    return results.map((row) => this.mapToExtension(row));
  }
  async update(
    id: number,
    tenantId: string,
    updates: Partial<TazamaDataModelExtension>,
  ): Promise<void> {
    const updateData: any = {};
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.isRequired !== undefined)
      updateData.is_required = updates.isRequired;
    if (updates.defaultValue !== undefined)
      updateData.default_value = JSON.stringify(updates.defaultValue);
    if (updates.validation !== undefined)
      updateData.validation = JSON.stringify(updates.validation);
    await this.knex(this.tableName)
      .where({ id, tenant_id: tenantId })
      .update(updateData);
  }
  async delete(id: number, tenantId: string): Promise<void> {
    await this.knex(this.tableName).where({ id, tenant_id: tenantId }).delete();
  }
  private mapToExtension(row: any): TazamaDataModelExtension {
    return {
      id: row.id,
      collection: row.collection as TazamaCollectionName,
      fieldName: row.field_name,
      fieldType: row.field_type as TazamaFieldType,
      description: row.description,
      isRequired: row.is_required,
      defaultValue:
        row.default_value && typeof row.default_value === 'string'
          ? JSON.parse(row.default_value)
          : row.default_value,
      validation:
        row.validation && typeof row.validation === 'string'
          ? JSON.parse(row.validation)
          : row.validation,
      tenantId: row.tenant_id,
      createdBy: row.created_by,
      createdAt: row.created_at,
      version: row.version,
    };
  }
}
