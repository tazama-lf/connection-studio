import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import { Mapping, MappingStatus } from './mapping.entity';
import { CreateMappingDto, UpdateMappingDto } from './mapping.dto';
@Injectable()
export class MappingRepository {
  constructor(@Inject('KNEX_CONNECTION') private readonly knex: Knex) {}
  async create(createMappingDto: CreateMappingDto): Promise<Mapping> {
    const nextVersion = await this.getNextVersion(createMappingDto.name);
    const id = uuidv4();
    const now = new Date();
    const sourceFieldsPlain = createMappingDto.sourceFields.map((field) => ({
      path: field.path,
      type: field.type,
      isRequired: field.isRequired,
    }));
    const destinationFieldsPlain = createMappingDto.destinationFields.map(
      (field) => ({
        path: field.path,
        type: field.type,
        isRequired: field.isRequired,
      }),
    );
    const mappingData = {
      id,
      name: createMappingDto.name,
      version: nextVersion,
      status: createMappingDto.status || MappingStatus.IN_PROGRESS,
      endpoint_id: createMappingDto.endpointId || null,
      source_fields: sourceFieldsPlain,
      destination_fields: destinationFieldsPlain,
      transformation: createMappingDto.transformation,
      constants: createMappingDto.constants || {},
      created_by: createMappingDto.createdBy || 'system',
      created_at: now,
      updated_at: now,
    };
    await this.knex.raw(
      `
      INSERT INTO mappings (
        id, name, version, status, endpoint_id, source_fields, destination_fields, 
        transformation, constants, created_by, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?, ?::jsonb, ?, ?, ?
      )
    `,
      [
        mappingData.id,
        mappingData.name,
        mappingData.version,
        mappingData.status,
        mappingData.endpoint_id,
        JSON.stringify(mappingData.source_fields),
        JSON.stringify(mappingData.destination_fields),
        mappingData.transformation,
        JSON.stringify(mappingData.constants),
        mappingData.created_by,
        mappingData.created_at,
        mappingData.updated_at,
      ],
    );
    const mapping = await this.findById(id);
    if (!mapping) {
      throw new Error('Failed to create mapping');
    }
    return mapping;
  }
  async findAll(): Promise<Mapping[]> {
    const rows = await this.knex('mappings')
      .select('*')
      .orderBy('created_at', 'desc');
    return rows.map(this.mapToMapping);
  }
  async findById(id: string): Promise<Mapping | null> {
    const row = await this.knex('mappings').select('*').where('id', id).first();
    if (!row) return null;
    return this.mapToMapping(row);
  }
  async findByName(name: string): Promise<Mapping[]> {
    const rows = await this.knex('mappings')
      .select('*')
      .where('name', name)
      .orderBy('version', 'desc');
    return rows.map(this.mapToMapping);
  }
  async findLatestByName(name: string): Promise<Mapping | null> {
    const row = await this.knex('mappings')
      .select('*')
      .where('name', name)
      .orderBy('version', 'desc')
      .first();
    if (!row) return null;
    return this.mapToMapping(row);
  }
  async update(
    id: string,
    updateMappingDto: UpdateMappingDto,
  ): Promise<Mapping> {
    const updateData: any = {
      updated_at: new Date(),
    };
    if (updateMappingDto.name !== undefined) {
      updateData.name = updateMappingDto.name;
    }
    if (updateMappingDto.status !== undefined) {
      updateData.status = updateMappingDto.status;
    }
    if (updateMappingDto.endpointId !== undefined) {
      updateData.endpoint_id = updateMappingDto.endpointId;
    }
    if (updateMappingDto.sourceFields !== undefined) {
      updateData.source_fields = updateMappingDto.sourceFields;
    }
    if (updateMappingDto.destinationFields !== undefined) {
      updateData.destination_fields = updateMappingDto.destinationFields;
    }
    if (updateMappingDto.transformation !== undefined) {
      updateData.transformation = updateMappingDto.transformation;
    }
    if (updateMappingDto.constants !== undefined) {
      updateData.constants = updateMappingDto.constants || null;
    }
    await this.knex('mappings').where('id', id).update(updateData);
    const mapping = await this.findById(id);
    if (!mapping) {
      throw new Error('Mapping not found after update');
    }
    return mapping;
  }
  async delete(id: string): Promise<void> {
    await this.knex('mappings').where('id', id).del();
  }
  async getNextVersion(name: string): Promise<number> {
    const result = await this.knex('mappings')
      .select(this.knex.raw('MAX(version) as max_version'))
      .where('name', name)
      .first();
    return result?.max_version ? result.max_version + 1 : 1;
  }
  private mapToMapping(row: any): Mapping {
    return {
      id: row.id,
      name: row.name,
      version: row.version,
      status: row.status,
      endpointId: row.endpoint_id,
      sourceFields: row.source_fields,
      destinationFields: row.destination_fields,
      transformation: row.transformation,
      constants: row.constants || null,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
