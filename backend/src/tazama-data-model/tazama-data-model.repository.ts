import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { TazamaCollectionSchema, TazamaField } from './tazama-data-model.interfaces';

@Injectable()
export class TazamaDataModelRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get all collections from the database
   */
  async getAllCollections(tenantId: string = 'default'): Promise<TazamaCollectionSchema[]> {
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
        name: row.collection_name as any,
        type: row.collection_type as 'node' | 'edge',
        description: row.collection_description,
        fields: fields,
      });
    }
    
    return collections;
  }

  /**
   * Get a specific collection by name
   */
  // async getCollectionByName(
  //   collectionName: string, 
  //   tenantId: string = 'default'
  // ): Promise<TazamaCollectionSchema | null> {
  //   const query = `
  //     SELECT 
  //       dt.destination_type_id,
  //       dt.name as collection_name,
  //       dt.collection_type,
  //       dt.description as collection_description
  //     FROM destination d
  //     JOIN destination_type dt ON d.destination_id = dt.destination_id
  //     WHERE d.tenant_id = $1 AND dt.name = $2
  //   `;
    
  //   const result = await this.databaseService.query(query, [tenantId, collectionName]);
    
  //   if (result.rows.length === 0) {
  //     return null;
  //   }
    
  //   const row = result.rows[0];
  //   const fields = await this.getCollectionFields(row.destination_type_id);
    
  //   return {
  //     name: row.collection_name as any,
  //     type: row.collection_type as 'node' | 'edge',
  //     description: row.collection_description,
  //     fields: fields,
  //   };
  // }

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
        type: rootField.type as any,
        required: rootField.required,
      };
      
      // If this is an object type, add nested properties
      if (rootField.type === 'object') {
        const nestedFields = nestedFieldsMap.get(rootField.serial_no) || [];
        tazamaField.properties = nestedFields.map(nf => ({
          name: nf.name,
          type: nf.type as any,
          required: nf.required,
        }));
      }
      
      fields.push(tazamaField);
    }
    
    return fields;
  }

  // these 2 below we arent using for now
  /**
   * Add a new field to a collection
   */
  async addFieldToCollection(
    collectionName: string,
    field: Omit<TazamaField, 'properties'>,
    tenantId: string = 'default'
  ): Promise<number> {
    // First get the collection ID
    const collectionQuery = `
      SELECT dt.destination_type_id
      FROM destination d
      JOIN destination_type dt ON d.destination_id = dt.destination_id
      WHERE d.tenant_id = $1 AND dt.name = $2
    `;
    
    const collectionResult = await this.databaseService.query(collectionQuery, [tenantId, collectionName]);
    
    if (collectionResult.rows.length === 0) {
      throw new Error(`Collection ${collectionName} not found`);
    }
    
    const collectionId = collectionResult.rows[0].destination_type_id;
    
    // Get next serial number
    const serialQuery = `
      SELECT COALESCE(MAX(serial_no), 0) + 1 as next_serial
      FROM destination_type_fields
      WHERE collection_id = $1 AND parent_id IS NULL
    `;
    
    const serialResult = await this.databaseService.query(serialQuery, [collectionId]);
    const nextSerial = serialResult.rows[0].next_serial;
    
    // Insert the new field
    const insertQuery = `
      INSERT INTO destination_type_fields (name, field_type, serial_no, collection_id)
      VALUES ($1, $2, $3, $4)
      RETURNING field_id
    `;
    
    const result = await this.databaseService.query(insertQuery, [
      field.name,
      field.type,
      nextSerial,
      collectionId,
    ]);
    
    return result.rows[0].field_id;
  }

  /**
   * Add nested property to an object field
   */
  async addNestedProperty(
    collectionName: string,
    parentFieldName: string,
    property: Pick<TazamaField, 'name' | 'type' | 'required'>,
    tenantId: string = 'default'
  ): Promise<number> {
    // Get parent field serial_no
    const parentQuery = `
      SELECT dtf.serial_no, dtf.collection_id
      FROM destination d
      JOIN destination_type dt ON d.destination_id = dt.destination_id
      JOIN destination_type_fields dtf ON dt.destination_type_id = dtf.collection_id
      WHERE d.tenant_id = $1 AND dt.name = $2 AND dtf.name = $3 AND dtf.parent_id IS NULL
    `;
    
    const parentResult = await this.databaseService.query(parentQuery, [tenantId, collectionName, parentFieldName]);
    
    if (parentResult.rows.length === 0) {
      throw new Error(`Parent field ${parentFieldName} not found in collection ${collectionName}`);
    }
    
    const { serial_no: parentSerialNo, collection_id: collectionId } = parentResult.rows[0];
    
    // Insert the nested property
    const insertQuery = `
      INSERT INTO destination_type_fields (name, field_type, parent_id, collection_id)
      VALUES ($1, $2, $3, $4)
      RETURNING field_id
    `;
    
    const result = await this.databaseService.query(insertQuery, [
      property.name,
      property.type,
      parentSerialNo,
      collectionId,
    ]);
    
    return result.rows[0].field_id;
  }
}