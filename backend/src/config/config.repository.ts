import { Injectable, Logger, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { Config, FieldMapping } from '../common/config.interfaces';
import { JSONSchema } from '../common/json-schema.interfaces';

@Injectable()
export class ConfigRepository {
  private readonly logger = new Logger(ConfigRepository.name);

  constructor(@Inject('KNEX_CONNECTION') private readonly knex: Knex) {}

  async createConfig(
    config: Omit<Config, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<number> {
    this.logger.log(
      `Creating config for ${config.msgFam} - ${config.transactionType}`,
    );

    const [result] = await this.knex('config')
      .insert({
        msg_fam: config.msgFam,
        transaction_type: config.transactionType,
        endpoint_path: config.endpointPath,
        version: config.version,
        content_type: config.contentType,
        schema: JSON.stringify(config.schema),
        mapping: config.mapping ? JSON.stringify(config.mapping) : null,
        status: config.status,
        tenant_id: config.tenantId,
        created_by: config.createdBy,
      })
      .returning('id');

    return result.id;
  }

  async findConfigById(id: number, tenantId: string): Promise<Config | null> {
    const result = await this.knex('config')
      .where({ id, tenant_id: tenantId })
      .first();

    if (!result) {
      return null;
    }

    return this.mapToConfig(result);
  }

  async findConfigByEndpoint(
    endpointPath: string,
    version: string,
    tenantId: string,
  ): Promise<Config | null> {
    const result = await this.knex('config')
      .where({
        endpoint_path: endpointPath,
        version: version,
        tenant_id: tenantId,
      })
      .first();

    if (!result) {
      return null;
    }

    return this.mapToConfig(result);
  }

  async findConfigsByTenant(tenantId: string): Promise<Config[]> {
    const results = await this.knex('config')
      .where({ tenant_id: tenantId })
      .orderBy('created_at', 'desc');

    return results.map((row) => this.mapToConfig(row));
  }

  async findConfigsByTransactionType(
    transactionType: string,
    tenantId: string,
  ): Promise<Config[]> {
    const results = await this.knex('config')
      .where({
        transaction_type: transactionType,
        tenant_id: tenantId,
      })
      .orderBy('created_at', 'desc');

    return results.map((row) => this.mapToConfig(row));
  }

  async findConfigByVersionAndTransactionType(
    version: string,
    transactionType: string,
    tenantId: string,
  ): Promise<Config | null> {
    const result = await this.knex('config')
      .where({
        version,
        transaction_type: transactionType,
        tenant_id: tenantId,
      })
      .first();

    return result ? this.mapToConfig(result) : null;
  }

  async updateConfig(
    id: number,
    tenantId: string,
    updates: {
      msgFam?: string;
      transactionType?: string;
      endpointPath?: string;
      version?: string;
      contentType?: string;
      schema?: JSONSchema;
      mapping?: FieldMapping[];
    },
  ): Promise<void> {
    const updateData: any = {};

    if (updates.msgFam !== undefined) updateData.msg_fam = updates.msgFam;
    if (updates.transactionType !== undefined)
      updateData.transaction_type = updates.transactionType;
    if (updates.endpointPath !== undefined)
      updateData.endpoint_path = updates.endpointPath;
    if (updates.version !== undefined) updateData.version = updates.version;
    if (updates.contentType !== undefined)
      updateData.content_type = updates.contentType;
    if (updates.schema !== undefined)
      updateData.schema = JSON.stringify(updates.schema);
    if (updates.mapping !== undefined)
      updateData.mapping = JSON.stringify(updates.mapping);

    await this.knex('config')
      .where({ id, tenant_id: tenantId })
      .update(updateData);
  }

  async deleteConfig(id: number, tenantId: string): Promise<void> {
    await this.knex('config').where({ id, tenant_id: tenantId }).delete();
  }

  private mapToConfig(row: any): Config {
    return {
      id: row.id,
      msgFam: row.msg_fam,
      transactionType: row.transaction_type,
      endpointPath: row.endpoint_path,
      version: row.version,
      contentType: row.content_type,
      schema:
        typeof row.schema === 'string' ? JSON.parse(row.schema) : row.schema,
      mapping:
        row.mapping === null
          ? null
          : typeof row.mapping === 'string'
            ? JSON.parse(row.mapping)
            : row.mapping,
      status: row.status,
      tenantId: row.tenant_id,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
