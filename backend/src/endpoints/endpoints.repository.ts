import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import {
  Endpoint,
  SchemaField,
  EndpointStatus,
  UnifiedSchema,
  SourceSchema,
  FieldType,
} from '../common/interfaces';
import { CreateEndpointWithSourceFieldsDto } from '../common/schema-workflow.dto';

@Injectable()
export class EndpointsRepository {
  constructor(@Inject('KNEX_CONNECTION') private readonly knex: Knex) {}

  async createEndpoint(
    endpointData: Omit<Endpoint, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>,
    tenantId: string,
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
        tenant_id: tenantId,
        schema_json: endpointData.schemaJson
          ? JSON.stringify(endpointData.schemaJson)
          : null,
        schema_version: endpointData.schemaVersion || 1,
      })
      .returning('id');

    return endpoint.id;
  }

  // User Story #300: Create endpoint with source fields only
  async createEndpointWithSourceSchema(
    dto: CreateEndpointWithSourceFieldsDto,
    sourceSchema: SourceSchema,
    createdBy: string,
    tenantId: string,
  ): Promise<number> {
    const [endpoint] = await this.knex('endpoints')
      .insert({
        name: dto.name,
        path: dto.path,
        method: dto.method,
        version: dto.version,
        transaction_type: dto.transactionType,
        status: EndpointStatus.IN_PROGRESS,
        description: dto.description,
        created_by: createdBy,
        tenant_id: tenantId,
        schema_json: JSON.stringify(sourceSchema),
        schema_version: sourceSchema.version,
      })
      .returning('id');

    return endpoint.id;
  }

  // User Story #300: Update endpoint with source schema only
  async updateEndpointSourceSchema(
    endpointId: number,
    sourceSchema: SourceSchema,
    createdBy: string,
    tenantId: string,
  ): Promise<void> {
    await this.knex('endpoints')
      .where('id', endpointId)
      .where('tenant_id', tenantId)
      .update({
        schema_json: JSON.stringify(sourceSchema),
        schema_version: sourceSchema.version,
        updated_at: this.knex.fn.now(),
      });
  }

  async findEndpointById(
    id: number,
    tenantId: string,
  ): Promise<Endpoint | null> {
    const endpoint = await this.knex('endpoints')
      .where('id', id)
      .where('tenant_id', tenantId)
      .first();

    if (!endpoint) return null;

    return this.mapToEndpoint(endpoint);
  }

  async findEndpointsByCreator(
    createdBy: string,
    tenantId: string,
  ): Promise<Endpoint[]> {
    const endpoints = await this.knex('endpoints')
      .where('created_by', createdBy)
      .where('tenant_id', tenantId)
      .orderBy('created_at', 'desc');

    return endpoints.map(this.mapToEndpoint);
  }

  async findEndpointsByStatus(
    status: EndpointStatus,
    tenantId: string,
  ): Promise<Endpoint[]> {
    const endpoints = await this.knex('endpoints')
      .where('status', status)
      .where('tenant_id', tenantId)
      .orderBy('created_at', 'desc');

    return endpoints.map(this.mapToEndpoint);
  }

  async updateEndpointStatus(
    id: number,
    status: EndpointStatus,
    tenantId: string,
  ): Promise<void> {
    await this.knex('endpoints')
      .where('id', id)
      .where('tenant_id', tenantId)
      .update({
        status,
        updated_at: new Date(),
      });
  }

  async updateEndpointUnifiedSchema(
    endpointId: number,
    unifiedSchema: UnifiedSchema,
    tenantId: string,
  ): Promise<void> {
    await this.knex('endpoints')
      .where('id', endpointId)
      .where('tenant_id', tenantId)
      .update({
        schema_json: JSON.stringify(unifiedSchema),
        updated_at: this.knex.fn.now(),
      });
  }

  async updateEndpointSchema(
    endpointId: number,
    schema: SchemaField[],
    createdBy: string,
    tenantId: string,
  ): Promise<void> {
    const nextVersion = await this.getNextSchemaVersion(endpointId, tenantId);

    await this.knex('endpoints')
      .where('id', endpointId)
      .where('tenant_id', tenantId)
      .update({
        schema_json: JSON.stringify(schema),
        schema_version: nextVersion,
        updated_at: new Date(),
      });
  }

  /**
   * User Story #300: Update endpoint with enhanced schema (supports constant/formula fields)
   */
  async updateEndpointEnhancedSchema(
    endpointId: number,
    schema: any, // EnhancedSourceSchema
    createdBy: string,
    tenantId: string,
  ): Promise<void> {
    const nextVersion = await this.getNextSchemaVersion(endpointId, tenantId);

    // Update the schema version inside the JSON object to match database version
    const schemaWithUpdatedVersion = {
      ...schema,
      version: nextVersion,
      lastUpdated: new Date(),
      createdBy,
    };

    await this.knex('endpoints')
      .where('id', endpointId)
      .where('tenant_id', tenantId)
      .update({
        schema_json: JSON.stringify(schemaWithUpdatedVersion),
        schema_version: nextVersion,
        updated_at: new Date(),
      });
  }

  async getEndpointSchema(
    endpointId: number,
    tenantId: string,
  ): Promise<SchemaField[] | null> {
    const endpoint = await this.knex('endpoints')
      .where('id', endpointId)
      .where('tenant_id', tenantId)
      .select('schema_json')
      .first();

    if (!endpoint?.schema_json) return null;

    try {
      return typeof endpoint.schema_json === 'string'
        ? JSON.parse(endpoint.schema_json)
        : endpoint.schema_json;
    } catch (error) {
      console.warn(
        `Failed to parse schema JSON for endpoint ${endpointId}:`,
        error,
      );
      return null;
    }
  }

  validateSchemaStructure(schema: SchemaField[]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const paths = new Set<string>();

    const validateField = (field: SchemaField, _parentPath = ''): void => {
      if (paths.has(field.path)) {
        errors.push(`Duplicate path found: ${field.path}`);
      } else {
        paths.add(field.path);
      }

      if (!field.name || !field.path || !field.type) {
        errors.push('Invalid field structure: missing required properties');
      }

      if (field.children && Array.isArray(field.children)) {
        if (field.type !== FieldType.OBJECT) {
          errors.push(
            `Field ${field.path} has children but type is not 'object'`,
          );
        }
        field.children.forEach((child) => validateField(child, field.path));
      }

      if (field.type === FieldType.ARRAY && !field.arrayElementType) {
        errors.push(`Array field ${field.path} missing arrayElementType`);
      }
    };

    schema.forEach((field) => validateField(field));

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private async getNextSchemaVersion(
    endpointId: number,
    tenantId: string,
  ): Promise<number> {
    const result = await this.knex('endpoints')
      .where('id', endpointId)
      .where('tenant_id', tenantId)
      .select('schema_version')
      .first();

    return (result?.schema_version || 0) + 1;
  }

  private mapToEndpoint(row: any): Endpoint {
    let schemaJson: SourceSchema | undefined;

    if (row.schema_json) {
      try {
        const parsedSchema =
          typeof row.schema_json === 'string'
            ? JSON.parse(row.schema_json)
            : row.schema_json;

        // Check if it's a SourceSchema, UnifiedSchema, or legacy SchemaField[]
        if (Array.isArray(parsedSchema)) {
          // Legacy format - convert to SourceSchema (User Story #300)
          schemaJson = {
            sourceFields: parsedSchema,
            version: 1,
            lastUpdated: new Date(),
            createdBy: row.created_by,
          };
        } else if (
          parsedSchema.sourceFields &&
          !parsedSchema.destinationFields
        ) {
          // New SourceSchema format (User Story #300)
          schemaJson = parsedSchema;
        } else {
          // Legacy UnifiedSchema - extract only source fields for User Story #300
          schemaJson = {
            sourceFields: parsedSchema.sourceFields || [],
            version: parsedSchema.version || 1,
            lastUpdated: parsedSchema.lastUpdated || new Date(),
            createdBy: parsedSchema.createdBy || row.created_by,
          };
        }
      } catch (error) {
        console.warn(
          `Failed to parse schema JSON for endpoint ${row.id}:`,
          error,
        );
        schemaJson = undefined;
      }
    }

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
      tenantId: row.tenant_id,
      schemaJson,
      schemaVersion: row.schema_version,
    };
  }
}
