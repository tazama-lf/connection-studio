import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  TazamaCollectionName,
  TazamaCollectionSchema,
  TazamaDestinationPath,
  TazamaFieldType,
} from './tazama-data-model.interfaces';
import { TazamaDataModelRepository } from './tazama-data-model.repository';
import { CreateDestinationTypeDto, CreateFieldDto, DestinationTypeResponse, FieldResponse } from './tazama-data-model.dto';

@Injectable()
export class TazamaDataModelService {
  private readonly logger = new Logger(TazamaDataModelService.name);

  constructor(private readonly repository: TazamaDataModelRepository) {}

  // remove
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






  // used from controller for GET
  
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

  /**
   * Create a new destination type (collection)
   */
  async createDestinationType(dto: CreateDestinationTypeDto): Promise<DestinationTypeResponse> {
    try {
      const result = await this.repository.createDestinationType(dto);
      this.logger.log(`Created destination type: ${dto.name} with ID: ${result.destination_type_id}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to create destination type: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to create destination type: ${error.message}`);
    }
  }

  /**
   * Add a single field to a destination type
   */
  async addFieldToDestinationType(
    destinationTypeId: number,
    dto: CreateFieldDto
  ): Promise<FieldResponse> {
    // Validate destination type exists
    const exists = await this.repository.destinationTypeExists(destinationTypeId);
    if (!exists) {
      throw new BadRequestException(`Destination type with ID ${destinationTypeId} not found`);
    }

    try {
      // Get next serial number if not provided and it's a root field
      let serialNo = dto.serial_no;
      if (!serialNo && !dto.parent_id) {
        serialNo = await this.repository.getNextSerialNumber(destinationTypeId);
      }

      const result = await this.repository.addFieldToDestinationType(destinationTypeId, dto, serialNo);
      this.logger.log(`Added field: ${dto.name} to destination type: ${destinationTypeId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to add field: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to add field: ${error.message}`);
    }
  }


}
