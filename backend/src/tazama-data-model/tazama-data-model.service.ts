import { Injectable, Logger } from '@nestjs/common';
import {
  TazamaCollectionName,
  TazamaCollectionSchema,
  TazamaDestinationPath,
  TazamaFieldType,
} from './tazama-data-model.interfaces';
import { TazamaDataModelRepository } from './tazama-data-model.repository';

@Injectable()
export class TazamaDataModelService {
  private readonly logger = new Logger(TazamaDataModelService.name);

  constructor(private readonly repository: TazamaDataModelRepository) {}

  // async isValidDestinationPath(path: TazamaDestinationPath, tenantId: string = 'default'): Promise<boolean> {
  //   const [collectionName, ...rest] = path.split('.');
  //   const fieldPath = rest.join('.');
  //   if (!collectionName || !fieldPath) return false;
    
  //   const schema = await this.repository.getCollectionByName(collectionName, tenantId);
  //   if (!schema) return false;
    
  //   const checkNested = (fields: any[], target: string): boolean => {
  //     for (const f of fields) {
  //       if (f.name === target) return true;
  //       if (target.startsWith(f.name + '.') && f.properties?.length) {
  //         const subPath = target.slice(f.name.length + 1);
  //         return checkNested(f.properties, subPath);
  //       }
  //     }
  //     return false;
  //   };
  //   return checkNested(schema.fields, fieldPath);
  // }

  // async getCollectionSchema(
  //   collectionName: TazamaCollectionName,
  //   tenantId: string = 'default'
  // ): Promise<TazamaCollectionSchema | null> {
  //   return await this.repository.getCollectionByName(collectionName, tenantId);
  // }


  // async getFieldType(path: TazamaDestinationPath, tenantId: string = 'default'): Promise<TazamaFieldType | null> {
  //   const [collectionName, fieldName] = path.split('.');
  //   const schema = await this.getCollectionSchema(
  //     collectionName as TazamaCollectionName,
  //     tenantId
  //   );
  //   if (!schema) return null;
  //   const field = schema.fields.find((f) => f.name === fieldName);
  //   return field?.type ? (field.type.toUpperCase() as TazamaFieldType) : null;
  // }


  // used from controller
  async getDestinationOptions(tenantId: string = 'default'): Promise<Array<{
    value: TazamaDestinationPath;
    label: string;
    collection: string;
    field: string;
    type: TazamaFieldType;
    required: boolean;
    properties?: any[];
  }>> {
    const schemas = await this.repository.getAllCollections(tenantId);
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
    
    for (const schema of schemas) {
      for (const field of schema.fields) {
        if (field.name === '_id' || field.name === '_rev') continue;
        processField(schema.name, field);
      }
    }

    return options.sort((a, b) => a.label.localeCompare(b.label));
  }



}
