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
    const processField = (
      schemaName: string,
      field: any,
      parentPath?: string,
    ) => {
      const path = parentPath
        ? `${parentPath}.${field.name}`
        : `${schemaName}.${field.name}`;
      paths.push(path);
      if (field.type === 'object' && field.properties?.length) {
        field.properties.forEach((sub: any) =>
          processField(schemaName, sub, path),
        );
      }
    };
    for (const schema of TAZAMA_DATA_MODEL_SCHEMAS) {
      for (const field of schema.fields) {
        if (field.name === '_id' || field.name === '_rev') continue;
        processField(schema.name, field);
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
      const paths: TazamaDestinationPath[] = [];
      const processField = (field: any, parentPath?: string) => {
        const path = parentPath
          ? `${parentPath}.${field.name}`
          : `${schema.name}.${field.name}`;
        paths.push(path);
        if (field.type === 'object' && field.properties?.length) {
          field.properties.forEach((sub: any) => processField(sub, path));
        }
      };
      schema.fields
        .filter((f) => f.name !== '_id' && f.name !== '_rev')
        .forEach((field) => processField(field));
      grouped[schema.name] = paths;
    }
    return grouped as Record<TazamaCollectionName, TazamaDestinationPath[]>;
  }

  isValidDestinationPath(path: TazamaDestinationPath): boolean {
    const [collectionName, ...rest] = path.split('.');
    const fieldPath = rest.join('.');
    if (!collectionName || !fieldPath) return false;
    const schema = TAZAMA_DATA_MODEL_SCHEMAS.find(
      (s) => s.name === collectionName,
    );
    if (!schema) return false;
    const checkNested = (fields: any[], target: string): boolean => {
      for (const f of fields) {
        if (f.name === target) return true;
        if (target.startsWith(f.name + '.') && f.properties?.length) {
          const subPath = target.slice(f.name.length + 1);
          return checkNested(f.properties, subPath);
        }
      }
      return false;
    };
    return checkNested(schema.fields, fieldPath);
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
    if (!schema) return null;
    const field = schema.fields.find((f) => f.name === fieldName);
    return field?.type ? (field.type.toUpperCase() as TazamaFieldType) : null;
  }

  isFieldRequired(path: TazamaDestinationPath): boolean {
    const [collectionName, fieldName] = path.split('.');
    const schema = this.getCollectionSchema(
      collectionName as TazamaCollectionName,
    );
    if (!schema) return false;
    const field = schema.fields.find((f) => f.name === fieldName);
    return field?.required || false;
  }

  getRequiredFields(collectionName: TazamaCollectionName): string[] {
    const schema = this.getCollectionSchema(collectionName);
    if (!schema) return [];
    return schema.fields.filter((f) => f.required).map((f) => f.name);
  }

  getFieldDescription(path: TazamaDestinationPath): string | null {
    const [collectionName, fieldName] = path.split('.');
    const schema = this.getCollectionSchema(
      collectionName as TazamaCollectionName,
    );
    if (!schema) return null;
    const field = schema.fields.find((f) => f.name === fieldName);
    return field?.description || null;
  }

  getFieldExample(path: TazamaDestinationPath): any {
    const [collectionName, fieldName] = path.split('.');
    const schema = this.getCollectionSchema(
      collectionName as TazamaCollectionName,
    );
    if (!schema) return null;
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
    properties?: any[];
  }> {
    const options: any[] = [];
    const processField = (
      schemaName: string,
      field: any,
      parentPath?: string,
      parentFieldPath?: string,
    ) => {
      const path = parentPath
        ? `${parentPath}.${field.name}`
        : `${schemaName}.${field.name}`;

      const fieldPath = parentFieldPath
        ? `${parentFieldPath}.${field.name}`
        : field.name;

      const base: {
        value: string;
        label: string;
        collection: string;
        field: string;
        type: string;
        required: boolean;
        properties?: any[];
      } = {
        value: path,
        label: path,
        collection: schemaName,
        field: fieldPath,
        type: field.type.toUpperCase(),
        required: field.required,
      };
      if (field.type === 'object' && field.properties?.length) {
        base.properties = field.properties.map((prop: any) => ({
          name: prop.name,
          type: prop.type,
          required: prop.required,
        }));
        options.push(base);
        field.properties.forEach((sub: any) =>
          processField(schemaName, sub, path, fieldPath),
        );
      } else {
        options.push(base);
      }
    };
    for (const schema of TAZAMA_DATA_MODEL_SCHEMAS) {
      for (const field of schema.fields) {
        if (field.name === '_id' || field.name === '_rev') continue;
        processField(schema.name, field);
      }
    }
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }

  getCollectionTypes(): string[] {
    return ['transactionDetails', 'redis'];
  }

  extractCollectionName(
    path: TazamaDestinationPath,
  ): TazamaCollectionName | null {
    const [collectionName] = path.split('.');
    const validCollections: TazamaCollectionName[] = [
      'transactionDetails',
      'redis',
    ];
    if (validCollections.includes(collectionName as TazamaCollectionName)) {
      return collectionName as TazamaCollectionName;
    }
    return null;
  }

  extractFieldName(path: TazamaDestinationPath): string | null {
    const parts = path.split('.');
    if (parts.length < 2) return null;
    return parts.slice(1).join('.');
  }
}
