import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { TazamaCollectionSchema, TazamaField } from './tazama-data-model.interfaces';
import { CreateDestinationTypeDto, CreateFieldDto, DestinationTypeResponse, FieldResponse } from './tazama-data-model.dto';

@Injectable()
export class TazamaDataModelRepository {
  constructor(private readonly databaseService: DatabaseService) {}


  // used 
  /**
   * Get all collections from the database
   */
  async getAllCollections(tenantId = 'default'): Promise<TazamaCollectionSchema[]> {
    const query = `
      SELECT 
        dt.destination_type_id,
        dt.name as collection_name,
        dt.collection_type,
        dt.description as collection_description
      FROM destination d
      JOIN destination_type dt ON d.destination_id = dt.destination_id
      WHERE d.tenant_id = $1
      ORDER BY dt.name
    `;
    
    const result = await this.databaseService.query(query, [tenantId]);
    const collections: TazamaCollectionSchema[] = [];
    
    for (const row of result.rows) {
      const fields = await this.getCollectionFields(row.destination_type_id);
      
      collections.push({
        name: row.collection_name,
        type: row.collection_type as 'node' | 'edge',
        description: row.collection_description,
        fields,
      });
    }
    
    return collections;
  }


 
  // help for the above getCollectionField
  /**
   * Get all fields for a collection with nested object support
   */
  private async getCollectionFields(collectionId: number): Promise<TazamaField[]> {
    const query = `
      SELECT 
        dtf.field_id,
        dtf.name as field_name,
        dtf.field_type,
        dtf.parent_id,
        dtf.serial_no,
        dtf.is_active
      FROM destination_type_fields dtf
      WHERE dtf.collection_id = $1 AND dtf.is_active = true
      ORDER BY dtf.serial_no, dtf.field_id
    `;
    
    const result = await this.databaseService.query(query, [collectionId]);
    
    // Separate root fields and nested fields
    const rootFields: any[] = [];
    const nestedFieldsMap = new Map<number, any[]>();
    
    for (const row of result.rows) {
      const field = {
        field_id: row.field_id,
        name: row.field_name,
        type: row.field_type,
        required: false, // We removed is_required from schema
        parent_id: row.parent_id,
        serial_no: row.serial_no,
      };
      
      if (row.parent_id === null) {
        // Root field
        rootFields.push(field);
      } else {
        // Nested field - group by parent_id
        if (!nestedFieldsMap.has(row.parent_id)) {
          nestedFieldsMap.set(row.parent_id, []);
        }
        nestedFieldsMap.get(row.parent_id)!.push(field);
      }
    }
    
    // Build the hierarchical structure
    const fields: TazamaField[] = [];
    
    for (const rootField of rootFields) {
      const tazamaField: TazamaField = {
        name: rootField.name,
        type: rootField.type,
        required: rootField.required,
      };
      
      // If this is an object type, add nested properties
      if (rootField.type === 'object') {
        const nestedFields = nestedFieldsMap.get(rootField.serial_no) || [];
        tazamaField.properties = nestedFields.map(nf => ({
          name: nf.name,
          type: nf.type,
          required: nf.required,
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
  async createDestinationType(dto: CreateDestinationTypeDto): Promise<DestinationTypeResponse> {
    const query = `
      INSERT INTO destination_type (collection_type, name, description, destination_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING destination_type_id, collection_type, name, description, destination_id, created_at
    `;

    const result = await this.databaseService.query(query, [
      dto.collection_type,
      dto.name,
      dto.description || null,
      dto.destination_id,
    ]);

    return result.rows[0];
  }


  // use
  /**
   * Check if destination type exists
   */
  async destinationTypeExists(destinationTypeId: number): Promise<boolean> {
    const query = `
      SELECT destination_type_id FROM destination_type WHERE destination_type_id = $1
    `;
    const result = await this.databaseService.query(query, [destinationTypeId]);
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
    const result = await this.databaseService.query(query, [destinationTypeId]);
    return result.rows[0].next_serial;
  }

  /**
   * Add a field to a destination type
   */
  async addFieldToDestinationType(
    destinationTypeId: number, 
    dto: CreateFieldDto, 
    serialNo?: number
  ): Promise<FieldResponse> {
    const query = `
      INSERT INTO destination_type_fields (name, field_type, parent_id, is_active, serial_no, collection_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING field_id, name, field_type, parent_id, is_active, serial_no, collection_id
    `;

    const result = await this.databaseService.query(query, [
      dto.name,
      dto.field_type,
      dto.parent_id || null,
      dto.is_active !== undefined ? dto.is_active : true,
      serialNo || null,
      destinationTypeId,
    ]);

    return result.rows[0];
  }
}