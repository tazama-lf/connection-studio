import { Injectable } from '@nestjs/common';
import {
  SchemaField,
  FieldType,
  DestinationFieldExtension,
} from '../common/interfaces';
import { DestinationFieldExtensionsRepository } from './destination-field-extensions.repository';

@Injectable()
export class TazamaDataModelService {
  constructor(
    private readonly extensionsRepository: DestinationFieldExtensionsRepository,
  ) {}

  /**
   * Get the core Tazama internal data model fields
   * These are the predefined destination fields that remain constant
   */
  getTazamaInternalFields(): SchemaField[] {
    return [
      {
        name: 'AccountDebtor',
        path: 'AccountDebtor',
        type: FieldType.OBJECT,
        isRequired: true,
        children: [
          {
            name: 'Identification',
            path: 'AccountDebtor.Identification',
            type: FieldType.STRING,
            isRequired: true,
          },
          {
            name: 'Name',
            path: 'AccountDebtor.Name',
            type: FieldType.STRING,
            isRequired: false,
          },
          {
            name: 'Type',
            path: 'AccountDebtor.Type',
            type: FieldType.STRING,
            isRequired: false,
          },
        ],
      },
      {
        name: 'AccountCreditor',
        path: 'AccountCreditor',
        type: FieldType.OBJECT,
        isRequired: true,
        children: [
          {
            name: 'Identification',
            path: 'AccountCreditor.Identification',
            type: FieldType.STRING,
            isRequired: true,
          },
          {
            name: 'Name',
            path: 'AccountCreditor.Name',
            type: FieldType.STRING,
            isRequired: false,
          },
          {
            name: 'Type',
            path: 'AccountCreditor.Type',
            type: FieldType.STRING,
            isRequired: false,
          },
        ],
      },
      {
        name: 'Amount',
        path: 'Amount',
        type: FieldType.OBJECT,
        isRequired: true,
        children: [
          {
            name: 'Currency',
            path: 'Amount.Currency',
            type: FieldType.STRING,
            isRequired: true,
          },
          {
            name: 'Amount',
            path: 'Amount.Amount',
            type: FieldType.NUMBER,
            isRequired: true,
          },
        ],
      },
      {
        name: 'TransactionReference',
        path: 'TransactionReference',
        type: FieldType.STRING,
        isRequired: true,
      },
      {
        name: 'TransactionType',
        path: 'TransactionType',
        type: FieldType.STRING,
        isRequired: true,
      },
      {
        name: 'Timestamp',
        path: 'Timestamp',
        type: FieldType.STRING,
        isRequired: true,
      },
      {
        name: 'PaymentClearingSystemReference',
        path: 'PaymentClearingSystemReference',
        type: FieldType.STRING,
        isRequired: false,
      },
      {
        name: 'EndToEndReference',
        path: 'EndToEndReference',
        type: FieldType.STRING,
        isRequired: false,
      },
      {
        name: 'ProcessingDate',
        path: 'ProcessingDate',
        type: FieldType.STRING,
        isRequired: false,
      },
      {
        name: 'ValueDate',
        path: 'ValueDate',
        type: FieldType.STRING,
        isRequired: false,
      },
    ];
  }

  /**
   * Get all destination fields including internal Tazama fields + extensions
   */
  async getAllDestinationFields(tenantId: string): Promise<SchemaField[]> {
    const internalFields = this.getTazamaInternalFields();
    const extensions =
      await this.extensionsRepository.findActiveByTenant(tenantId);

    // Convert extensions to SchemaField format
    const extensionFields = this.convertExtensionsToSchemaFields(extensions);

    return [...internalFields, ...extensionFields];
  }

  /**
   * Get destination fields by category
   */
  async getDestinationFieldsByCategory(
    tenantId: string,
    category: string,
  ): Promise<SchemaField[]> {
    if (category === 'INTERNAL') {
      return this.getTazamaInternalFields();
    }

    const extensions = await this.extensionsRepository.findByCategory(
      tenantId,
      category as any,
    );

    return this.convertExtensionsToSchemaFields(extensions);
  }

  /**
   * Find a destination field by path
   */
  async findDestinationFieldByPath(
    path: string,
    tenantId: string,
  ): Promise<SchemaField | null> {
    // First check internal fields
    const internalFields = this.getTazamaInternalFields();
    const internalField = this.findFieldByPath(internalFields, path);
    if (internalField) {
      return internalField;
    }

    // Then check extensions
    const extension = await this.extensionsRepository.findByPath(
      path,
      tenantId,
    );
    if (extension) {
      return this.convertExtensionToSchemaField(extension);
    }

    return null;
  }

  /**
   * Validate that a destination field path exists
   */
  async validateDestinationFieldPath(
    path: string,
    tenantId: string,
  ): Promise<boolean> {
    const field = await this.findDestinationFieldByPath(path, tenantId);
    return field !== null;
  }

  /**
   * Get all available destination field paths
   */
  async getAllDestinationFieldPaths(tenantId: string): Promise<string[]> {
    const allFields = await this.getAllDestinationFields(tenantId);
    return this.extractAllPaths(allFields);
  }

  /**
   * Convert extension entities to SchemaField format
   */
  private convertExtensionsToSchemaFields(
    extensions: DestinationFieldExtension[],
  ): SchemaField[] {
    return extensions.map((ext) => this.convertExtensionToSchemaField(ext));
  }

  /**
   * Convert single extension to SchemaField
   */
  private convertExtensionToSchemaField(
    extension: DestinationFieldExtension,
  ): SchemaField {
    return {
      name: extension.name,
      path: extension.path,
      type: extension.type,
      isRequired: extension.isRequired,
      children: extension.children
        ? extension.children.map((child) =>
            this.convertExtensionToSchemaField(child),
          )
        : undefined,
    };
  }

  /**
   * Find a field by path in a nested structure
   */
  private findFieldByPath(
    fields: SchemaField[],
    path: string,
  ): SchemaField | null {
    for (const field of fields) {
      if (field.path === path) {
        return field;
      }
      if (field.children) {
        const found = this.findFieldByPath(field.children, path);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  /**
   * Extract all paths from a nested field structure
   */
  private extractAllPaths(fields: SchemaField[]): string[] {
    const paths: string[] = [];

    for (const field of fields) {
      paths.push(field.path);
      if (field.children) {
        paths.push(...this.extractAllPaths(field.children));
      }
    }

    return paths;
  }
}
