import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import {
  MultiFieldMappingEntity,
  MultiFieldMappingHistoryEntity,
  MappingAction,
} from '../common/multi-field-mapping.interfaces';

@Injectable()
export class MultiFieldMappingsRepository {
  constructor(@Inject('KNEX_CONNECTION') private readonly knex: Knex) {}

  /**
   * Create a new multi-field mapping
   */
  async create(
    mapping: Omit<MultiFieldMappingEntity, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<MultiFieldMappingEntity> {
    const trx = await this.knex.transaction();

    try {
      const [created] = await trx('multi_field_mappings')
        .insert({
          endpoint_id: mapping.endpointId,
          name: mapping.name,
          description: mapping.description,
          source_fields: JSON.stringify(mapping.sourceFields),
          destination_fields: JSON.stringify(mapping.destinationFields),
          transformation: mapping.transformation,
          transformation_config: mapping.transformationConfig
            ? JSON.stringify(mapping.transformationConfig)
            : null,
          constants: mapping.constants
            ? JSON.stringify(mapping.constants)
            : null,
          status: mapping.status,
          order_index: mapping.orderIndex,
          version: mapping.version,
          tenant_id: mapping.tenantId,
          created_by: mapping.createdBy,
          updated_by: mapping.updatedBy,
        })
        .returning('*');

      const mappingEntity = this.mapToEntity(created);

      // Create history record
      await this.createHistoryRecord(
        trx,
        mappingEntity.id!,
        mappingEntity,
        'CREATE',
        mapping.createdBy,
      );

      await trx.commit();
      return mappingEntity;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Find mapping by ID
   */
  async findById(
    id: number,
    tenantId: string,
  ): Promise<MultiFieldMappingEntity | null> {
    const mapping = await this.knex('multi_field_mappings')
      .where({ id, tenant_id: tenantId })
      .first();

    return mapping ? this.mapToEntity(mapping) : null;
  }

  /**
   * Find mappings by endpoint ID
   */
  async findByEndpointId(
    endpointId: number,
    tenantId: string,
  ): Promise<MultiFieldMappingEntity[]> {
    const mappings = await this.knex('multi_field_mappings')
      .where({ endpoint_id: endpointId, tenant_id: tenantId })
      .orderBy('order_index', 'asc')
      .orderBy('created_at', 'asc');

    return mappings.map(this.mapToEntity);
  }

  /**
   * Find active mappings by endpoint ID
   */
  async findActiveMappingsByEndpointId(
    endpointId: number,
    tenantId: string,
  ): Promise<MultiFieldMappingEntity[]> {
    const mappings = await this.knex('multi_field_mappings')
      .where({
        endpoint_id: endpointId,
        tenant_id: tenantId,
        status: 'ACTIVE',
      })
      .orderBy('order_index', 'asc')
      .orderBy('created_at', 'asc');

    return mappings.map(this.mapToEntity);
  }

  /**
   * Find all mappings for a tenant with filtering and pagination
   */
  async findAllByTenant(
    tenantId: string,
    filters: {
      endpointId?: number;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    } = {},
  ): Promise<{
    mappings: MultiFieldMappingEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query = this.knex('multi_field_mappings').where({
      tenant_id: tenantId,
    });

    // Apply filters
    if (filters.endpointId) {
      query.where('endpoint_id', filters.endpointId);
    }

    if (filters.status) {
      query.where('status', filters.status);
    }

    if (filters.search) {
      query.where(function () {
        this.where('name', 'ilike', `%${filters.search}%`).orWhere(
          'description',
          'ilike',
          `%${filters.search}%`,
        );
      });
    }

    // Get total count
    const [{ count }] = await query.clone().count('id as count');
    const total = parseInt(count as string);

    // Apply sorting
    const sortBy = filters.sortBy || 'created_at';
    const sortOrder = filters.sortOrder || 'DESC';
    query.orderBy(sortBy, sortOrder);

    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    query.offset(offset).limit(limit);

    const mappings = await query;

    return {
      mappings: mappings.map(this.mapToEntity),
      total,
      page,
      limit,
    };
  }

  /**
   * Update a mapping
   */
  async update(
    id: number,
    updates: Partial<MultiFieldMappingEntity>,
    tenantId: string,
    updatedBy: string,
    changeReason?: string,
  ): Promise<MultiFieldMappingEntity> {
    const trx = await this.knex.transaction();

    try {
      // Get current mapping for history
      const currentMapping = await this.findById(id, tenantId);
      if (!currentMapping) {
        throw new Error(`Mapping with ID ${id} not found`);
      }

      const updateData: any = {
        updated_by: updatedBy,
        updated_at: new Date(),
      };

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined)
        updateData.description = updates.description;
      if (updates.sourceFields !== undefined)
        updateData.source_fields = JSON.stringify(updates.sourceFields);
      if (updates.destinationFields !== undefined)
        updateData.destination_fields = JSON.stringify(
          updates.destinationFields,
        );
      if (updates.transformation !== undefined)
        updateData.transformation = updates.transformation;
      if (updates.transformationConfig !== undefined)
        updateData.transformation_config = updates.transformationConfig
          ? JSON.stringify(updates.transformationConfig)
          : null;
      if (updates.constants !== undefined)
        updateData.constants = updates.constants
          ? JSON.stringify(updates.constants)
          : null;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.orderIndex !== undefined)
        updateData.order_index = updates.orderIndex;

      // Increment version
      updateData.version = currentMapping.version + 1;

      const [updated] = await trx('multi_field_mappings')
        .where({ id, tenant_id: tenantId })
        .update(updateData)
        .returning('*');

      const updatedMapping = this.mapToEntity(updated);

      // Create history record
      await this.createHistoryRecord(
        trx,
        id,
        updatedMapping,
        'UPDATE',
        updatedBy,
        changeReason,
      );

      await trx.commit();
      return updatedMapping;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Delete a mapping (soft delete by marking as inactive)
   */
  async delete(
    id: number,
    tenantId: string,
    deletedBy: string,
    reason?: string,
  ): Promise<void> {
    const trx = await this.knex.transaction();

    try {
      const currentMapping = await this.findById(id, tenantId);
      if (!currentMapping) {
        throw new Error(`Mapping with ID ${id} not found`);
      }

      // Soft delete by marking as inactive
      const [updated] = await trx('multi_field_mappings')
        .where({ id, tenant_id: tenantId })
        .update({
          status: 'INACTIVE',
          updated_by: deletedBy,
          updated_at: new Date(),
          version: currentMapping.version + 1,
        })
        .returning('*');

      const deletedMapping = this.mapToEntity(updated);

      // Create history record
      await this.createHistoryRecord(
        trx,
        id,
        deletedMapping,
        'DELETE',
        deletedBy,
        reason,
      );

      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Get mapping history
   */
  async getHistory(
    mappingId: number,
    tenantId: string,
  ): Promise<MultiFieldMappingHistoryEntity[]> {
    const history = await this.knex('multi_field_mapping_history as h')
      .join('multi_field_mappings as m', 'h.mapping_id', 'm.id')
      .where('h.mapping_id', mappingId)
      .where('m.tenant_id', tenantId)
      .select('h.*')
      .orderBy('h.version', 'desc');

    return history.map(this.mapToHistoryEntity);
  }

  /**
   * Bulk update mapping statuses
   */
  async bulkUpdateStatus(
    mappingIds: number[],
    status: 'ACTIVE' | 'INACTIVE',
    tenantId: string,
    updatedBy: string,
    reason?: string,
  ): Promise<MultiFieldMappingEntity[]> {
    const trx = await this.knex.transaction();

    try {
      const action: MappingAction =
        status === 'ACTIVE' ? 'ACTIVATE' : 'DEACTIVATE';
      const updatedMappings: MultiFieldMappingEntity[] = [];

      for (const id of mappingIds) {
        const currentMapping = await this.findById(id, tenantId);
        if (currentMapping) {
          const [updated] = await trx('multi_field_mappings')
            .where({ id, tenant_id: tenantId })
            .update({
              status,
              updated_by: updatedBy,
              updated_at: new Date(),
              version: currentMapping.version + 1,
            })
            .returning('*');

          const updatedMapping = this.mapToEntity(updated);
          updatedMappings.push(updatedMapping);

          // Create history record
          await this.createHistoryRecord(
            trx,
            id,
            updatedMapping,
            action,
            updatedBy,
            reason,
          );
        }
      }

      await trx.commit();
      return updatedMappings;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Create a history record
   */
  private async createHistoryRecord(
    trx: Knex.Transaction,
    mappingId: number,
    mappingSnapshot: MultiFieldMappingEntity,
    action: MappingAction,
    changedBy: string,
    changeReason?: string,
  ): Promise<void> {
    await trx('multi_field_mapping_history').insert({
      mapping_id: mappingId,
      mapping_snapshot: JSON.stringify(mappingSnapshot),
      version: mappingSnapshot.version,
      action,
      changed_by: changedBy,
      change_reason: changeReason,
      changed_at: new Date(),
    });
  }

  /**
   * Map database row to entity
   */
  private mapToEntity(row: any): MultiFieldMappingEntity {
    return {
      id: row.id,
      endpointId: row.endpoint_id,
      name: row.name,
      description: row.description,
      sourceFields:
        typeof row.source_fields === 'string'
          ? JSON.parse(row.source_fields)
          : row.source_fields,
      destinationFields:
        typeof row.destination_fields === 'string'
          ? JSON.parse(row.destination_fields)
          : row.destination_fields,
      transformation: row.transformation,
      transformationConfig: row.transformation_config
        ? typeof row.transformation_config === 'string'
          ? JSON.parse(row.transformation_config)
          : row.transformation_config
        : undefined,
      constants: row.constants
        ? typeof row.constants === 'string'
          ? JSON.parse(row.constants)
          : row.constants
        : undefined,
      status: row.status,
      orderIndex: row.order_index,
      version: row.version,
      tenantId: row.tenant_id,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Map database row to history entity
   */
  private mapToHistoryEntity(row: any): MultiFieldMappingHistoryEntity {
    return {
      id: row.id,
      mappingId: row.mapping_id,
      mappingSnapshot: JSON.parse(row.mapping_snapshot),
      version: row.version,
      action: row.action,
      changedBy: row.changed_by,
      changeReason: row.change_reason,
      changedAt: row.changed_at,
    };
  }
}
