import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import {
  Endpoint,
  EndpointSchema,
  SchemaField,
  EndpointStatus,
} from '../common/interfaces';

@Injectable()
export class EndpointsRepository {
  constructor(@Inject('KNEX_CONNECTION') private readonly knex: Knex) {}

  async createEndpoint(
    endpointData: Omit<Endpoint, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<number> {
    const [endpoint] = await this.knex('endpoints')
      .insert({
        path: endpointData.path,
        method: endpointData.method,
        version: endpointData.version,
        transaction_type: endpointData.transactionType,
        status: endpointData.status,
        description: endpointData.description,
        created_by: endpointData.createdBy,
      })
      .returning('id');

    return endpoint.id;
  }

  async findEndpointById(id: number): Promise<Endpoint | null> {
    const endpoint = await this.knex('endpoints').where('id', id).first();

    if (!endpoint) return null;

    return this.mapToEndpoint(endpoint);
  }

  async findEndpointsByCreator(createdBy: string): Promise<Endpoint[]> {
    const endpoints = await this.knex('endpoints')
      .where('created_by', createdBy)
      .orderBy('created_at', 'desc');

    return endpoints.map(this.mapToEndpoint);
  }

  async findEndpointsByStatus(status: EndpointStatus): Promise<Endpoint[]> {
    const endpoints = await this.knex('endpoints')
      .where('status', status)
      .orderBy('created_at', 'desc');

    return endpoints.map(this.mapToEndpoint);
  }

  async updateEndpointStatus(
    id: number,
    status: EndpointStatus,
  ): Promise<void> {
    await this.knex('endpoints').where('id', id).update({
      status,
      updated_at: new Date(),
    });
  }

  async createSchemaVersion(
    endpointId: number,
    schema: SchemaField[],
    createdBy: string,
  ): Promise<number> {
    const [schemaVersion] = await this.knex('schema_versions')
      .insert({
        endpoint_id: endpointId,
        version: await this.getNextSchemaVersion(endpointId),
        schema_definition: JSON.stringify(schema),
        created_by: createdBy,
      })
      .returning('id');

    await this.insertSchemaFields(schemaVersion.id, schema);

    return schemaVersion.id;
  }

  async getLatestSchemaVersion(
    endpointId: number,
  ): Promise<EndpointSchema | null> {
    const schemaVersion = await this.knex('schema_versions')
      .where('endpoint_id', endpointId)
      .orderBy('version', 'desc')
      .first();

    if (!schemaVersion) return null;

    return {
      version: schemaVersion.version,
      fields: JSON.parse(schemaVersion.schema_definition),
      createdBy: schemaVersion.created_by,
      createdAt: schemaVersion.created_at,
    };
  }

  private async getNextSchemaVersion(endpointId: number): Promise<number> {
    const result = await this.knex('schema_versions')
      .where('endpoint_id', endpointId)
      .max('version as maxVersion')
      .first();

    return (result?.maxVersion || 0) + 1;
  }

  private async insertSchemaFields(
    schemaVersionId: number,
    fields: SchemaField[],
    parentFieldId?: number,
  ): Promise<void> {
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const [insertedField] = await this.knex('schema_fields')
        .insert({
          schema_version_id: schemaVersionId,
          name: field.name,
          path: field.path,
          type: field.type,
          is_required: field.isRequired,
          parent_field_id: parentFieldId,
          array_element_type: field.arrayElementType,
          validation_rules: null,
          field_order: i,
        })
        .returning('id');

      if (field.children && field.children.length > 0) {
        await this.insertSchemaFields(
          schemaVersionId,
          field.children,
          insertedField.id,
        );
      }
    }
  }

  private mapToEndpoint(row: any): Endpoint {
    return {
      id: row.id,
      path: row.path,
      method: row.method,
      version: row.version,
      transactionType: row.transaction_type,
      status: row.status,
      description: row.description,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
