import { Injectable, Logger } from '@nestjs/common';
import {
  TazamaCollectionName,
  TazamaCollectionSchema,
  TazamaDestinationPath,
  TazamaFieldType,
  TAZAMA_DATA_MODEL_SCHEMAS,
} from './tazama-data-model.interfaces';

@Injectable()
export class TazamaDataModelService {
  private readonly logger = new Logger(TazamaDataModelService.name);

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

  getCollectionSchema(
    collectionName: TazamaCollectionName,
  ): TazamaCollectionSchema | null {
    return (
      TAZAMA_DATA_MODEL_SCHEMAS.find((s) => s.name === collectionName) || null
    );
  }

  getAllCollectionSchemas(): TazamaCollectionSchema[] {
    return TAZAMA_DATA_MODEL_SCHEMAS;
  }

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

  getRequiredFields(collectionName: TazamaCollectionName): string[] {
    const schema = this.getCollectionSchema(collectionName);
    if (!schema) {
      return [];
    }
    return schema.fields.filter((f) => f.required).map((f) => f.name);
  }

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
      'redis',
    ];
    if (validCollections.includes(collectionName as TazamaCollectionName)) {
      return collectionName as TazamaCollectionName;
    }
    return null;
  }

  extractFieldName(path: TazamaDestinationPath): string | null {
    const parts = path.split('.');
    if (parts.length < 2) {
      return null;
    }
    return parts.slice(1).join('.');
  }
}
