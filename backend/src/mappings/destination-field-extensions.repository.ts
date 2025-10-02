import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import {
  DestinationFieldExtension,
  FieldType,
  ExtensionFieldStatus,
  ExtensionFieldCategory,
} from '../common/interfaces';

@Injectable()
export class DestinationFieldExtensionsRepository {
  constructor(@Inject('KNEX_CONNECTION') private readonly knex: Knex) {}

  /**
   * Create a new destination field extension
   */
  async create(
    extension: Omit<
      DestinationFieldExtension,
      'id' | 'createdAt' | 'updatedAt'
    >,
  ): Promise<DestinationFieldExtension> {
    const [created] = await this.knex('destination_field_extensions')
      .insert({
        name: extension.name,
        path: extension.path,
        type: extension.type,
        is_required: extension.isRequired,
        description: extension.description,
        parent_id: extension.parentId,
        order_index: extension.orderIndex,
        category: extension.category,
        collection: extension.collection,
        status: extension.status,
        version: extension.version,
        tenant_id: extension.tenantId,
        created_by: extension.createdBy,
        updated_by: extension.updatedBy,
      })
      .returning('*');

    return this.mapToEntity(created);
  }

  /**
   * Find all active extensions for a tenant
   */
  async findActiveByTenant(
    tenantId: string,
  ): Promise<DestinationFieldExtension[]> {
    const extensions = await this.knex('destination_field_extensions')
      .where({ tenant_id: tenantId, status: 'ACTIVE' })
      .orderBy('category', 'asc')
      .orderBy('order_index', 'asc')
      .orderBy('path', 'asc');

    return extensions.map(this.mapToEntity);
  }

  /**
   * Find extensions by category
   */
  async findByCategory(
    tenantId: string,
    category: ExtensionFieldCategory,
  ): Promise<DestinationFieldExtension[]> {
    const extensions = await this.knex('destination_field_extensions')
      .where({ tenant_id: tenantId, category })
      .orderBy('order_index', 'asc')
      .orderBy('path', 'asc');

    return extensions.map(this.mapToEntity);
  }

  /**
   * Find extensions by collection
   */
  async findByCollection(
    tenantId: string,
    collection: string,
  ): Promise<DestinationFieldExtension[]> {
    const extensions = await this.knex('destination_field_extensions')
      .where({ tenant_id: tenantId, collection })
      .orderBy('order_index', 'asc')
      .orderBy('path', 'asc');

    return extensions.map(this.mapToEntity);
  }

  /**
   * Find extension by ID
   */
  async findById(
    id: number,
    tenantId: string,
  ): Promise<DestinationFieldExtension | null> {
    const extension = await this.knex('destination_field_extensions')
      .where({ id, tenant_id: tenantId })
      .first();

    return extension ? this.mapToEntity(extension) : null;
  }

  /**
   * Find extension by path
   */
  async findByPath(
    path: string,
    tenantId: string,
  ): Promise<DestinationFieldExtension | null> {
    const extension = await this.knex('destination_field_extensions')
      .where({ path, tenant_id: tenantId })
      .first();

    return extension ? this.mapToEntity(extension) : null;
  }

  /**
   * Update an extension
   */
  async update(
    id: number,
    updates: Partial<DestinationFieldExtension>,
    tenantId: string,
  ): Promise<DestinationFieldExtension> {
    const updateData: any = {
      updated_at: new Date(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.path !== undefined) updateData.path = updates.path;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.isRequired !== undefined)
      updateData.is_required = updates.isRequired;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.parentId !== undefined) updateData.parent_id = updates.parentId;
    if (updates.orderIndex !== undefined)
      updateData.order_index = updates.orderIndex;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.collection !== undefined)
      updateData.collection = updates.collection;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.version !== undefined) updateData.version = updates.version;
    if (updates.updatedBy !== undefined)
      updateData.updated_by = updates.updatedBy;

    const [updated] = await this.knex('destination_field_extensions')
      .where({ id, tenant_id: tenantId })
      .update(updateData)
      .returning('*');

    if (!updated) {
      throw new Error(`Destination field extension with ID ${id} not found`);
    }

    return this.mapToEntity(updated);
  }

  /**
   * Delete an extension
   */
  async delete(id: number, tenantId: string): Promise<void> {
    const deleted = await this.knex('destination_field_extensions')
      .where({ id, tenant_id: tenantId })
      .del();

    if (deleted === 0) {
      throw new Error(`Destination field extension with ID ${id} not found`);
    }
  }

  /**
   * Get extensions with hierarchical structure
   */
  async findHierarchicalByTenant(
    tenantId: string,
  ): Promise<DestinationFieldExtension[]> {
    const extensions = await this.knex('destination_field_extensions')
      .where({ tenant_id: tenantId, status: 'ACTIVE' })
      .orderBy('category', 'asc')
      .orderBy('order_index', 'asc');

    const mapped = extensions.map(this.mapToEntity);
    return this.buildHierarchy(mapped);
  }

  /**
   * Build hierarchical structure from flat list
   */
  private buildHierarchy(
    extensions: DestinationFieldExtension[],
  ): DestinationFieldExtension[] {
    const extensionMap = new Map<number, DestinationFieldExtension>();
    const rootExtensions: DestinationFieldExtension[] = [];

    // Create map for quick lookup
    extensions.forEach((ext) => {
      ext.children = [];
      if (ext.id) {
        extensionMap.set(ext.id, ext);
      }
    });

    // Build hierarchy
    extensions.forEach((ext) => {
      if (ext.parentId) {
        const parent = extensionMap.get(ext.parentId);
        if (parent?.children) {
          parent.children.push(ext);
        }
      } else {
        rootExtensions.push(ext);
      }
    });

    return rootExtensions;
  }

  /**
   * Map database row to entity
   */
  private mapToEntity(row: any): DestinationFieldExtension {
    return {
      id: row.id,
      name: row.name,
      path: row.path,
      type: row.type as FieldType,
      isRequired: row.is_required,
      description: row.description,
      parentId: row.parent_id,
      orderIndex: row.order_index,
      category: row.category as ExtensionFieldCategory,
      collection: row.collection,
      status: row.status as ExtensionFieldStatus,
      version: row.version,
      tenantId: row.tenant_id,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
