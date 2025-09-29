import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DataModelExtensionRepository } from './data-model-extension.repository';
import {
  DataModelExtension,
  ExtensionAuditLog,
  FieldType,
  ExtensionStatus,
} from './data-model-extension.entity';
import {
  AddFieldDto,
  UpdateExtensionDto,
  ValidateFieldDto,
} from './data-model-extension.dto';
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}
export interface AuditFriendlyExtension extends DataModelExtension {
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ACTIVATE' | 'DEACTIVATE';
  userId: string;
  timestamp: Date;
  validationErrors?: ValidationError[];
  auditLogId?: string;
}
@Injectable()
export class DataModelExtensionService {
  constructor(private readonly repository: DataModelExtensionRepository) {}
  /**
   * Adds a new field extension to a collection with validation and audit logging
   */
  async addField(
    collection: string,
    fieldName: string,
    fieldType: FieldType,
    required: boolean,
    defaultValue?: any,
    userId?: string,
  ): Promise<AuditFriendlyExtension> {
    const dto: AddFieldDto = {
      collection,
      fieldName,
      fieldType,
      required,
      defaultValue,
      createdBy: userId || 'system',
    };
    const validationErrors = await this.validateField(dto);
    if (validationErrors.length > 0) {
      throw new BadRequestException({
        message: 'Field validation failed',
        errors: validationErrors,
      });
    }
    const existingFields = await this.repository.findByFieldName(
      collection,
      fieldName,
    );
    const activeField = existingFields.find(
      (f) => f.status === ExtensionStatus.ACTIVE,
    );
    if (activeField) {
      throw new ConflictException(
        `Field '${fieldName}' already exists in collection '${collection}'`,
      );
    }
    const extension = await this.repository.addField(dto);
    const auditLog = await this.repository.addAuditLog({
      extensionId: extension.id,
      action: 'CREATE',
      userId: userId || 'system',
      newState: extension,
      details: `Added field '${fieldName}' of type '${fieldType}' to collection '${collection}'`,
    });
    return {
      ...extension,
      action: 'CREATE',
      userId: userId || 'system',
      timestamp: new Date(),
      auditLogId: auditLog.id,
    };
  }
  /**
   * Lists all extensions for a collection with optional filtering
   */
  async listExtensions(
    collection: string,
    status?: ExtensionStatus,
    version?: number,
  ): Promise<DataModelExtension[]> {
    if (!collection || collection.trim().length === 0) {
      throw new BadRequestException('Collection name is required');
    }
    const extensions = await this.repository.findByCollection(
      collection,
      status,
      version,
    );
    if (extensions.length === 0 && !status && !version) {
      throw new NotFoundException(
        `No extensions found for collection '${collection}'`,
      );
    }
    return extensions;
  }
  /**
   * Removes an extension (soft delete by marking as INACTIVE)
   */
  async removeExtension(
    id: string,
    userId?: string,
  ): Promise<AuditFriendlyExtension> {
    const extension = await this.repository.findById(id);
    if (!extension) {
      throw new NotFoundException(`Extension with id '${id}' not found`);
    }
    if (extension.status === ExtensionStatus.INACTIVE) {
      throw new ConflictException('Extension is already inactive');
    }
    const previousState = { ...extension };
    const updatedExtension = await this.repository.update(id, {
      status: ExtensionStatus.INACTIVE,
    });
    const auditLog = await this.repository.addAuditLog({
      extensionId: id,
      action: 'DELETE',
      userId: userId || 'system',
      previousState,
      newState: updatedExtension,
      details: `Removed extension '${extension.fieldName}' from collection '${extension.collection}'`,
    });
    return {
      ...updatedExtension,
      action: 'DELETE',
      userId: userId || 'system',
      timestamp: new Date(),
      auditLogId: auditLog.id,
    };
  }
  /**
   * Updates an existing extension with validation and audit logging
   */
  async updateExtension(
    id: string,
    dto: UpdateExtensionDto,
    userId?: string,
  ): Promise<AuditFriendlyExtension> {
    const existingExtension = await this.repository.findById(id);
    if (!existingExtension) {
      throw new NotFoundException(`Extension with id '${id}' not found`);
    }
    if (existingExtension.status === ExtensionStatus.INACTIVE) {
      throw new ConflictException('Cannot update inactive extension');
    }
    const fieldConfig: ValidateFieldDto = {
      fieldType: dto.fieldType ?? existingExtension.fieldType,
      required: dto.required ?? existingExtension.isRequired,
      defaultValue: dto.defaultValue ?? existingExtension.defaultValue,
    };
    const validationErrors = this.validateFieldConfig(fieldConfig);
    if (validationErrors.length > 0) {
      throw new BadRequestException({
        message: 'Field validation failed',
        errors: validationErrors,
      });
    }
    const previousState = { ...existingExtension };
    const updatedExtension = await this.repository.update(id, dto);
    const auditLog = await this.repository.addAuditLog({
      extensionId: id,
      action: 'UPDATE',
      userId: userId || 'system',
      previousState,
      newState: updatedExtension,
      details: `Updated extension '${existingExtension.fieldName}' in collection '${existingExtension.collection}'`,
    });
    return {
      ...updatedExtension,
      action: 'UPDATE',
      userId: userId || 'system',
      timestamp: new Date(),
      auditLogId: auditLog.id,
    };
  }
  /**
   * Gets the audit history for an extension
   */
  async getExtensionAuditHistory(
    extensionId: string,
  ): Promise<ExtensionAuditLog[]> {
    const extension = await this.repository.findById(extensionId);
    if (!extension) {
      throw new NotFoundException(
        `Extension with id '${extensionId}' not found`,
      );
    }
    return this.repository.getAuditLogs(extensionId);
  }
  /**
   * Activates an inactive extension
   */
  async activateExtension(
    id: string,
    userId?: string,
  ): Promise<AuditFriendlyExtension> {
    const extension = await this.repository.findById(id);
    if (!extension) {
      throw new NotFoundException(`Extension with id '${id}' not found`);
    }
    if (extension.status === ExtensionStatus.ACTIVE) {
      throw new ConflictException('Extension is already active');
    }
    const previousState = { ...extension };
    const updatedExtension = await this.repository.update(id, {
      status: ExtensionStatus.ACTIVE,
    });
    const auditLog = await this.repository.addAuditLog({
      extensionId: id,
      action: 'ACTIVATE',
      userId: userId || 'system',
      previousState,
      newState: updatedExtension,
      details: `Activated extension '${extension.fieldName}' in collection '${extension.collection}'`,
    });
    return {
      ...updatedExtension,
      action: 'ACTIVATE',
      userId: userId || 'system',
      timestamp: new Date(),
      auditLogId: auditLog.id,
    };
  }
  /**
   * Gets all extensions across all collections (admin function)
   */
  async getAllExtensions(): Promise<DataModelExtension[]> {
    return this.repository.findAll();
  }
  /**
   * Validates field configuration
   */
  private async validateField(dto: AddFieldDto): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    if (!dto.collection || dto.collection.trim().length === 0) {
      errors.push({
        field: 'collection',
        message: 'Collection name is required',
        code: 'REQUIRED_FIELD_MISSING',
      });
    }
    if (!dto.fieldName || dto.fieldName.trim().length === 0) {
      errors.push({
        field: 'fieldName',
        message: 'Field name is required',
        code: 'REQUIRED_FIELD_MISSING',
      });
    }
    if (dto.fieldName && !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(dto.fieldName)) {
      errors.push({
        field: 'fieldName',
        message:
          'Field name must start with a letter and contain only letters, numbers, and underscores',
        code: 'INVALID_FIELD_NAME_FORMAT',
      });
    }
    if (dto.collection && !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(dto.collection)) {
      errors.push({
        field: 'collection',
        message:
          'Collection name must start with a letter and contain only letters, numbers, and underscores',
        code: 'INVALID_COLLECTION_NAME_FORMAT',
      });
    }
    const fieldConfigErrors = this.validateFieldConfig({
      fieldType: dto.fieldType,
      required: dto.required,
      defaultValue: dto.defaultValue,
    });
    errors.push(...fieldConfigErrors);
    return errors;
  }
  /**
   * Validates field type and default value compatibility
   */
  private validateFieldConfig(config: ValidateFieldDto): ValidationError[] {
    const errors: ValidationError[] = [];
    if (
      config.required &&
      (config.defaultValue === undefined || config.defaultValue === null)
    ) {
      errors.push({
        field: 'defaultValue',
        message: 'Required fields must have a default value',
        code: 'REQUIRED_FIELD_MISSING_DEFAULT',
      });
    }
    if (config.defaultValue !== undefined && config.defaultValue !== null) {
      const typeValidationError = this.validateDefaultValueType(
        config.fieldType,
        config.defaultValue,
      );
      if (typeValidationError) {
        errors.push(typeValidationError);
      }
    }
    return errors;
  }
  /**
   * Validates that default value matches the field type
   */
  private validateDefaultValueType(
    fieldType: FieldType,
    defaultValue: any,
  ): ValidationError | null {
    switch (fieldType) {
      case FieldType.STRING:
        if (typeof defaultValue !== 'string') {
          return {
            field: 'defaultValue',
            message: `Default value must be a string for STRING field type, got ${typeof defaultValue}`,
            code: 'TYPE_MISMATCH',
          };
        }
        break;
      case FieldType.NUMBER:
        if (typeof defaultValue !== 'number' || isNaN(defaultValue)) {
          return {
            field: 'defaultValue',
            message: `Default value must be a valid number for NUMBER field type, got ${typeof defaultValue}`,
            code: 'TYPE_MISMATCH',
          };
        }
        break;
      case FieldType.BOOLEAN:
        if (typeof defaultValue !== 'boolean') {
          return {
            field: 'defaultValue',
            message: `Default value must be a boolean for BOOLEAN field type, got ${typeof defaultValue}`,
            code: 'TYPE_MISMATCH',
          };
        }
        break;
      case FieldType.DATE:
        if (
          !(defaultValue instanceof Date) &&
          typeof defaultValue !== 'string'
        ) {
          return {
            field: 'defaultValue',
            message: `Default value must be a Date object or ISO string for DATE field type, got ${typeof defaultValue}`,
            code: 'TYPE_MISMATCH',
          };
        }
        if (typeof defaultValue === 'string') {
          const parsedDate = new Date(defaultValue);
          if (isNaN(parsedDate.getTime())) {
            return {
              field: 'defaultValue',
              message:
                'Default value must be a valid date string for DATE field type',
              code: 'INVALID_DATE_FORMAT',
            };
          }
        }
        break;
      default:
        return {
          field: 'fieldType',
          message: `Unsupported field type: ${fieldType as string}`,
          code: 'UNSUPPORTED_FIELD_TYPE',
        };
    }
    return null;
  }
  /**
   * Validates that all required extensions have default values or are mapped
   */
  async validateCollectionExtensions(
    collection: string,
    mappedFields?: string[],
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const extensions = await this.listExtensions(
      collection,
      ExtensionStatus.ACTIVE,
    );
    const requiredExtensions = extensions.filter((ext) => ext.isRequired);
    const mappedFieldsSet = new Set(mappedFields || []);
    for (const extension of requiredExtensions) {
      const hasDefaultValue =
        extension.defaultValue !== null && extension.defaultValue !== undefined;
      const isMapped = mappedFieldsSet.has(extension.fieldName);
      if (!hasDefaultValue && !isMapped) {
        errors.push({
          field: extension.fieldName,
          message: `Required field '${extension.fieldName}' in collection '${collection}' has no default value and is not mapped`,
          code: 'REQUIRED_FIELD_NOT_SATISFIED',
        });
      }
    }
    return errors;
  }
}
