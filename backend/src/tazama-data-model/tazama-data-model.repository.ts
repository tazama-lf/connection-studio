import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  TazamaCollectionSchema,
  TazamaField,
} from './tazama-data-model.interfaces';
import {
  CreateDestinationTypeDto,
  CreateFieldDto,
  DestinationTypeResponse,
  FieldResponse,
} from './tazama-data-model.dto';

interface CollectionRow {
  destination_type_id: number;
  collection_name: string;
  collection_type: 'node' | 'edge';
  collection_description: string;
}

interface FieldRow {
  field_id: number;
  field_name: string;
  field_type: string;
  parent_id: number | null;
  serial_no: number;
  collection_id: number;
  is_active: boolean;
}

interface DatabaseResult<T = unknown> {
  rows: T[];
}

interface CreateDestinationTypeRow {
  destination_type_id: number;
  collection_type: string;
  name: string;
  description?: string;
  destination_id: number;
  created_at: Date;
}

interface SerialNumberRow {
  next_serial: number;
}

interface ExistsRow {
  destination_type_id: number;
}

@Injectable()
export class TazamaDataModelRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  // used
  /**
   * Get all collections from the database
   */
  async getAllCollections(
    tenantId = 'default',
  ): Promise<TazamaCollectionSchema[]> {
    const query = `
      SELECT 
        dt.destination_type_id,
        dt.name as collection_name,
        dt.collection_type,
        dt.description as collection_description,
        dt.destination_type_id as destination_type_id,
        dt.destination_id as destination_id
      FROM destination d
      JOIN destination_type dt ON d.destination_id = dt.destination_id
      WHERE d.tenant_id = $1
      ORDER BY dt.name
    `;

    const result = (await this.databaseService.query(query, [
      tenantId,
    ])) as DatabaseResult<CollectionRow>;

    // Process collections concurrently to avoid no-await-in-loop
    const collectionsPromises = result.rows.map(async (row) => {
      const fields = await this.getCollectionFields(row.destination_type_id);

      return {
        name: row.collection_name,
        type: row.collection_type,
        description: row.collection_description,
        collection_id: row.destination_type_id,
        fields,
      };
    });

    const collections = await Promise.all(collectionsPromises);
    return collections;
  }

  // help for the above getCollectionField
  /**
   * Get all fields for a collection with nested object support
   */
  private async getCollectionFields(
    collectionId: number,
  ): Promise<TazamaField[]> {
    const query = `
      SELECT 
        dtf.field_id,
        dtf.name as field_name,
        dtf.field_type,
        dtf.parent_id,
        dtf.serial_no,
        dtf.collection_id,
        dtf.is_active
      FROM destination_type_fields dtf
      WHERE dtf.collection_id = $1 AND dtf.is_active = true
      ORDER BY dtf.serial_no, dtf.field_id
    `;

    const result = (await this.databaseService.query(query, [
      collectionId,
    ])) as DatabaseResult<FieldRow>;

    // Separate root fields and nested fields
    const rootFields: FieldRow[] = [];
    const nestedFieldsMap = new Map<number, FieldRow[]>();

    for (const row of result.rows) {
      if (row.parent_id === null) {
        // Root field
        rootFields.push(row);
      } else {
        // Nested field - group by parent_id
        if (!nestedFieldsMap.has(row.parent_id)) {
          nestedFieldsMap.set(row.parent_id, []);
        }
        nestedFieldsMap.get(row.parent_id)!.push(row);
      }
    }

    // Build the hierarchical structure
    const fields: TazamaField[] = [];

    for (const rootField of rootFields) {
      const tazamaField: TazamaField = {
        name: rootField.field_name,
        type: rootField.field_type as
          | 'string'
          | 'number'
          | 'boolean'
          | 'object'
          | 'date',
        required: false, // We removed is_required from schema
        parent_id: rootField.parent_id,
        serial_no: rootField.serial_no,
        collection_id: rootField.collection_id,
      };

      // If this is an object type, add nested properties
      if (rootField.field_type === 'object') {
        const nestedFields = nestedFieldsMap.get(rootField.serial_no) ?? [];
        tazamaField.properties = nestedFields.map((nf) => ({
          name: nf.field_name,
          type: nf.field_type as
            | 'string'
            | 'number'
            | 'boolean'
            | 'object'
            | 'date',
          required: false,
          parent_id: nf.parent_id,
          serial_no: nf.serial_no,
          collection_id: nf.collection_id,
        }));
      }

      fields.push(tazamaField);
    }

    return fields;
  }

  // use
  /**
   * Create a new destination type (collection)
   */
  async createDestinationType(
    dto: CreateDestinationTypeDto,
  ): Promise<DestinationTypeResponse> {
    const query = `
      INSERT INTO destination_type (collection_type, name, description, destination_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING destination_type_id, collection_type, name, description, destination_id, created_at
    `;

    const result = (await this.databaseService.query(query, [
      dto.collection_type,
      dto.name,
      dto.description ?? null,
      dto.destination_id,
    ])) as DatabaseResult<CreateDestinationTypeRow>;

    return result.rows[0] as DestinationTypeResponse;
  }

  // use
  /**
   * Check if destination type exists
   */
  async destinationTypeExists(destinationTypeId: number): Promise<boolean> {
    const query = `
      SELECT destination_type_id FROM destination_type WHERE destination_type_id = $1
    `;
    const result = (await this.databaseService.query(query, [
      destinationTypeId,
    ])) as DatabaseResult<ExistsRow>;
    return result.rows.length > 0;
  }

  /**
   * Get the next serial number for a destination type
   */
  async getNextSerialNumber(destinationTypeId: number): Promise<number> {
    const query = `
      SELECT COALESCE(MAX(serial_no), 0) + 1 as next_serial
      FROM destination_type_fields
      WHERE collection_id = $1 AND parent_id IS NULL
    `;
    const result = (await this.databaseService.query(query, [
      destinationTypeId,
    ])) as DatabaseResult<SerialNumberRow>;
    return result.rows[0].next_serial;
  }

  /**
   * Add a field to a destination type
   */
  async addFieldToDestinationType(
    destinationTypeId: number,
    dto: CreateFieldDto,
    serialNo?: number,
  ): Promise<FieldResponse> {
    const query = `
      INSERT INTO destination_type_fields (name, field_type, parent_id, is_active, serial_no, collection_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING field_id, name, field_type, parent_id, is_active, serial_no, collection_id
    `;

    const result = (await this.databaseService.query(query, [
      dto.name,
      dto.field_type,
      dto.parent_id ?? null,
      dto.is_active ?? true,
      serialNo ?? null,
      destinationTypeId,
    ])) as DatabaseResult<FieldRow>;

    const [row] = result.rows;
    return {
      field_id: row.field_id,
      name: row.field_name,
      field_type: row.field_type,
      parent_id: row.parent_id ?? undefined,
      is_active: row.is_active,
      serial_no: row.serial_no,
      collection_id: destinationTypeId,
    };
  }
}
