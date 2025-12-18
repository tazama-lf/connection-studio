import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { TazamaFieldType, TazamaField } from './tazama-data-model.interfaces';
import { TazamaDataModelRepository } from './tazama-data-model.repository';
import {
  CreateDestinationTypeDto,
  CreateFieldDto,
  DestinationTypeResponse,
  FieldResponse,
} from './tazama-data-model.dto';

interface FieldOption {
  value: string;
  label: string;
  collection: string;
  field?: string;
  type?: string;
  required: boolean;
  parent_id: number | null;
  serial_no: number;
  collection_id: number;
  properties?: FieldProperty[];
}

interface FieldProperty {
  name: string;
  type: string;
  required: boolean;
}

interface ErrorWithMessage {
  message: string;
  stack?: string;
}

interface FieldSelectOption {
  value: string;
  label: string;
  collection: string;
  field?: string;
  type?: TazamaFieldType;
  required: boolean;
  parent_id: number | null;
  serial_no: number;
  collection_id: number;
  properties?: FieldProperty[];
}

@Injectable()
export class TazamaDataModelService {
  private readonly logger = new Logger(TazamaDataModelService.name);

  constructor(private readonly repository: TazamaDataModelRepository) {}

  async getDestinationOptions(
    tenantId = 'default',
    token: string,
  ): Promise<FieldSelectOption[]> {
    const schemas = await this.repository.getAllCollections(tenantId, token);
    const options: FieldOption[] = [];

    const processField = (
      schemaName: string,
      field: TazamaField,
      parentPath?: string,
      parentFieldPath?: string,
    ): void => {
      const path = parentPath
        ? `${parentPath}.${field.name}`
        : `${schemaName}.${field.name}`;

      const fieldPath = parentFieldPath
        ? `${parentFieldPath}.${field.name}`
        : field.name;

      const base: FieldOption = {
        value: path,
        label: path,
        collection: schemaName,
        field: fieldPath,
        type: field.type.toUpperCase(),
        required: field.required,
        parent_id: field.parent_id ?? null,
        serial_no: field.serial_no ?? 0,
        collection_id: field.collection_id ?? 0,
      };

      if (field.type === 'object' && field.properties?.length) {
        base.properties = field.properties.map((prop: TazamaField) => ({
          name: prop.name,
          type: prop.type,
          required: prop.required,
        }));
        options.push(base);
        field.properties.forEach((sub: TazamaField) => {
          processField(schemaName, sub, path, fieldPath);
        });
      } else {
        options.push(base);
      }
    };

    for (const schema of schemas) {
      if (schema.fields.length === 0) {
        
        const emptyCollectionMarker: FieldOption = {
          value: `${schema.name}.__empty__`,
          label: schema.name,
          collection: schema.name,
          field: '__empty__', 
          type: 'OBJECT',
          required: false,
          parent_id: null,
          serial_no: 0,
          collection_id: schema.collection_id ?? 0,
          properties: [],
        };
        this.logger.log(`Empty collection encountered: ${schema.name}`);
        options.push(emptyCollectionMarker);
      } else {
        for (const field of schema.fields) {
          if (field.name === '_id' || field.name === '_rev') continue;
          processField(schema.name, field);
        }
      }
    }

    const resultOptions: FieldSelectOption[] = options
      .map((opt) => ({
        value: opt.value,
        label: opt.label,
        collection: opt.collection,
        field: opt.field,
        type: opt.type ? (opt.type.toUpperCase() as TazamaFieldType) : undefined,
        required: opt.required,
        parent_id: opt.parent_id,
        serial_no: opt.serial_no,
        collection_id: opt.collection_id,
        properties: opt.properties,
      }))
      .filter((opt) => opt.field !== undefined && opt.type !== undefined);

    return resultOptions.sort((a, b) => a.label.localeCompare(b.label));
  }

  async createDestinationType(
    dto: CreateDestinationTypeDto,
    token: string,
  ): Promise<DestinationTypeResponse> {
    try {
      const result = await this.repository.createDestinationType(dto, token);
      this.logger.log(
        `Created destination type: ${dto.name} with ID: ${result.destination_type_id}`,
      );
      return result;
    } catch (error: unknown) {
      const errorWithMessage = error as ErrorWithMessage;
      const errorMessage = errorWithMessage.message || 'Unknown error';
      const errorStack = errorWithMessage.stack;
      this.logger.error(
        `Failed to create destination type: ${errorMessage}`,
        errorStack,
      );
      throw new BadRequestException(
        `Failed to create destination type: ${errorMessage}`,
      );
    }
  }

  async addFieldToDestinationType(
    destinationTypeId: number,
    dto: CreateFieldDto,
    token: string,
  ): Promise<FieldResponse> {
    const exists = await this.repository.destinationTypeExists(
      destinationTypeId,
      token,
    );
    if (!exists) {
      throw new BadRequestException(
        `Destination type with ID ${destinationTypeId} not found`,
      );
    }

    try {
      const sanitizedDto: CreateFieldDto = {
        ...dto,
        parent_id:
          dto.parent_id === undefined
            ? undefined
            : typeof (dto.parent_id as any) === 'string' &&
                (dto.parent_id as any).trim() === ''
              ? undefined
              : dto.parent_id,
        serial_no:
          dto.serial_no === undefined
            ? undefined
            : typeof (dto.serial_no as any) === 'string' &&
                (dto.serial_no as any).trim() === ''
              ? undefined
              : dto.serial_no,
      };

      const result = await this.repository.addFieldToDestinationType(
        destinationTypeId,
        sanitizedDto,
        token,
        sanitizedDto.serial_no,
      );
      this.logger.log(
        `Added field: ${result.name} to destination type: ${destinationTypeId}`,
      );
      return result;
    } catch (error: unknown) {
      const errorWithMessage = error as ErrorWithMessage;
      const errorMessage = errorWithMessage.message || 'Unknown error';
      const errorStack = errorWithMessage.stack;
      this.logger.error(`Failed to add field: ${errorMessage}`, errorStack);
      throw new BadRequestException(`Failed to add field: ${errorMessage}`);
    }
  }
}
