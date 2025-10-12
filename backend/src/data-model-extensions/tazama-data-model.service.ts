import { Injectable, Logger } from '@nestjs/common';
import {
  TazamaCollectionName,
  TazamaCollectionSchema,
  TazamaDestinationPath,
  TazamaFieldType,
  TAZAMA_DATA_MODEL_SCHEMAS,
} from './tazama-data-model.interfaces';

/**
 * Service for managing the Tazama Internal Data Model
 *
 * Provides utilities for:
 * - Retrieving available destination fields for mapping
 * - Validating destination paths
 * - Managing data model schema definitions
 */
@Injectable()
export class TazamaDataModelService {
  private readonly logger = new Logger(TazamaDataModelService.name);

  /**
   * Get all available destination paths for mapping
   * Returns a flat list of collection.field paths
   */
  getAllDestinationPaths(): TazamaDestinationPath[] {
    const paths: TazamaDestinationPath[] = [];
    for (const schema of TAZAMA_DATA_MODEL_SCHEMAS) {
      for (const field of schema.fields) {
        if (field.name === '_id' || field.name === '_rev') {
          continue;
        }
        paths.push(`${schema.name}.${field.name}`);
      }
    }
    return paths.sort();
  }

  /**
   * Get destination paths grouped by collection
   */
  getDestinationPathsByCollection(): Record<
    TazamaCollectionName,
    TazamaDestinationPath[]
  > {
    const grouped: Record<string, TazamaDestinationPath[]> = {};
    for (const schema of TAZAMA_DATA_MODEL_SCHEMAS) {
      grouped[schema.name] = schema.fields
        .filter((field) => field.name !== '_id' && field.name !== '_rev')
        .map((field) => `${schema.name}.${field.name}`);
    }
    return grouped as Record<TazamaCollectionName, TazamaDestinationPath[]>;
  }

  /**
   * Validate if a destination path exists in the data model
   */
  isValidDestinationPath(path: TazamaDestinationPath): boolean {
    const [collectionName, fieldName] = path.split('.');
    if (!collectionName || !fieldName) {
      return false;
    }
    const schema = TAZAMA_DATA_MODEL_SCHEMAS.find(
      (s) => s.name === collectionName,
    );
    if (!schema) {
      return false;
    }
    return schema.fields.some((f) => f.name === fieldName);
  }

  /**
   * Get schema for a specific collection
   */
  getCollectionSchema(
    collectionName: TazamaCollectionName,
  ): TazamaCollectionSchema | null {
    return (
      TAZAMA_DATA_MODEL_SCHEMAS.find((s) => s.name === collectionName) || null
    );
  }

  /**
   * Get all collection schemas
   */
  getAllCollectionSchemas(): TazamaCollectionSchema[] {
    return TAZAMA_DATA_MODEL_SCHEMAS;
  }

  /**
   * Get field type from a destination path
   */
  getFieldType(path: TazamaDestinationPath): TazamaFieldType | null {
    const [collectionName, fieldName] = path.split('.');
    const schema = this.getCollectionSchema(
      collectionName as TazamaCollectionName,
    );
    if (!schema) {
      return null;
    }
    const field = schema.fields.find((f) => f.name === fieldName);
    return field?.type ? (field.type.toUpperCase() as TazamaFieldType) : null;
  }

  /**
   * Check if a field is required in the data model
   */
  isFieldRequired(path: TazamaDestinationPath): boolean {
    const [collectionName, fieldName] = path.split('.');
    const schema = this.getCollectionSchema(
      collectionName as TazamaCollectionName,
    );
    if (!schema) {
      return false;
    }
    const field = schema.fields.find((f) => f.name === fieldName);
    return field?.required || false;
  }

  /**
   * Get all required fields for a collection
   */
  getRequiredFields(collectionName: TazamaCollectionName): string[] {
    const schema = this.getCollectionSchema(collectionName);
    if (!schema) {
      return [];
    }
    return schema.fields.filter((f) => f.required).map((f) => f.name);
  }

  /**
   * Get field description from destination path
   */
  getFieldDescription(path: TazamaDestinationPath): string | null {
    const [collectionName, fieldName] = path.split('.');
    const schema = this.getCollectionSchema(
      collectionName as TazamaCollectionName,
    );
    if (!schema) {
      return null;
    }
    const field = schema.fields.find((f) => f.name === fieldName);
    return field?.description || null;
  }

  /**
   * Get example value for a field
   */
  getFieldExample(path: TazamaDestinationPath): any {
    const [collectionName, fieldName] = path.split('.');
    const schema = this.getCollectionSchema(
      collectionName as TazamaCollectionName,
    );
    if (!schema) {
      return null;
    }
    const field = schema.fields.find((f) => f.name === fieldName);
    return field?.example || null;
  }

  /**
   * Get searchable/filterable destination options for UI dropdowns
   */
  getDestinationOptions(): Array<{
    value: TazamaDestinationPath;
    label: string;
    collection: string;
    field: string;
    type: TazamaFieldType;
    required: boolean;
    description?: string;
    example?: any;
  }> {
    const options: Array<{
      value: TazamaDestinationPath;
      label: string;
      collection: string;
      field: string;
      type: TazamaFieldType;
      required: boolean;
      description?: string;
      example?: any;
    }> = [];

    for (const schema of TAZAMA_DATA_MODEL_SCHEMAS) {
      for (const field of schema.fields) {
        if (field.name === '_id' || field.name === '_rev') {
          continue;
        }
        const path = `${schema.name}.${field.name}`;
        options.push({
          value: path,
          label: `${schema.name}.${field.name}`,
          collection: schema.name,
          field: field.name,
          type: field.type.toUpperCase() as TazamaFieldType,
          required: field.required,
          description: field.description,
          example: field.example,
        });
      }
    }
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }

  /**
   * Extract collection name from destination path
   */
  extractCollectionName(
    path: TazamaDestinationPath,
  ): TazamaCollectionName | null {
    const [collectionName] = path.split('.');
    const validCollections: TazamaCollectionName[] = [
      'entities',
      'accounts',
      'account_holder',
      'transactionRelationship',
      'transactionHistory',
    ];
    if (validCollections.includes(collectionName as TazamaCollectionName)) {
      return collectionName as TazamaCollectionName;
    }
    return null;
  }

  /**
   * Extract field name from destination path
   */
  extractFieldName(path: TazamaDestinationPath): string | null {
    const parts = path.split('.');
    if (parts.length < 2) {
      return null;
    }
    return parts.slice(1).join('.'); // Support nested paths like "geoLocation.lat"
  }
}
