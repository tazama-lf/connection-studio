import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataModelExtensionRepository } from './data-model-extension.repository';
import { TazamaDataModelService } from './tazama-data-model.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateDataModelExtensionDto,
  UpdateDataModelExtensionDto,
  DataModelExtensionResponseDto,
} from './data-model-extension.dto';
import {
  TazamaDataModelExtension,
  TazamaCollectionName,
} from './tazama-data-model.interfaces';
@Injectable()
export class DataModelExtensionService {
  private readonly logger = new Logger(DataModelExtensionService.name);
  constructor(
    private readonly extensionRepository: DataModelExtensionRepository,
    private readonly tazamaDataModelService: TazamaDataModelService,
    private readonly auditService: AuditService,
  ) {}
  async createExtension(
    dto: CreateDataModelExtensionDto,
    tenantId: string,
    userId: string,
  ): Promise<DataModelExtensionResponseDto> {
    this.logger.log(
      `Creating data model extension: ${dto.collection}.${dto.fieldName} for tenant ${tenantId}`,
    );
    try {
      // Validate collection exists
      const collectionSchema = this.tazamaDataModelService.getCollectionSchema(
        dto.collection,
      );
      if (!collectionSchema) {
        return {
          success: false,
          message: `Invalid collection: ${dto.collection}`,
        };
      }
      // Check if field already exists in base schema
      const existingField = collectionSchema.fields.find(
        (f) => f.name === dto.fieldName,
      );
      if (existingField) {
        return {
          success: false,
          message: `Field '${dto.fieldName}' already exists in the base schema for collection '${dto.collection}'`,
        };
      }
      // Check if extension already exists for this tenant
      const existingExtension =
        await this.extensionRepository.findByCollectionAndField(
          dto.collection,
          dto.fieldName,
          tenantId,
        );
      if (existingExtension) {
        return {
          success: false,
          message: `Extension for field '${dto.fieldName}' in collection '${dto.collection}' already exists`,
        };
      }
      // Validate field name (no special characters except underscore)
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(dto.fieldName)) {
        return {
          success: false,
          message: `Invalid field name: '${dto.fieldName}'. Must start with a letter or underscore and contain only alphanumeric characters and underscores.`,
        };
      }
      const extensionData: Omit<TazamaDataModelExtension, 'id' | 'createdAt'> =
        {
          collection: dto.collection,
          fieldName: dto.fieldName,
          fieldType: dto.fieldType,
          description: dto.description,
          isRequired: dto.isRequired || false,
          defaultValue: dto.defaultValue,
          validation: dto.validation,
          tenantId,
          createdBy: userId,
          version: 1,
        };
      const extensionId = await this.extensionRepository.create(extensionData);
      await this.auditService.logAction({
        action: 'CREATE_DATA_MODEL_EXTENSION',
        actor: userId,
        tenantId,
        endpointName: `Extension: ${dto.collection}.${dto.fieldName}`,
      });
      const extension = await this.extensionRepository.findById(
        extensionId,
        tenantId,
      );
      this.logger.log(
        `Successfully created data model extension ${extensionId}`,
      );
      return {
        success: true,
        message: 'Data model extension created successfully',
        extension,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create data model extension: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        message: `Failed to create extension: ${error.message}`,
      };
    }
  }
  async getExtensionById(
    id: number,
    tenantId: string,
  ): Promise<TazamaDataModelExtension | null> {
    return this.extensionRepository.findById(id, tenantId);
  }
  async getExtensionsByCollection(
    collection: TazamaCollectionName,
    tenantId: string,
  ): Promise<TazamaDataModelExtension[]> {
    return this.extensionRepository.findByCollection(collection, tenantId);
  }
  async getAllExtensions(
    tenantId: string,
  ): Promise<TazamaDataModelExtension[]> {
    return this.extensionRepository.findAllByTenant(tenantId);
  }
  async updateExtension(
    id: number,
    dto: UpdateDataModelExtensionDto,
    tenantId: string,
    userId: string,
  ): Promise<DataModelExtensionResponseDto> {
    const extension = await this.extensionRepository.findById(id, tenantId);
    if (!extension) {
      throw new NotFoundException(
        `Data model extension with ID ${id} not found`,
      );
    }
    await this.extensionRepository.update(id, tenantId, dto);
    await this.auditService.logAction({
      action: 'UPDATE_DATA_MODEL_EXTENSION',
      actor: userId,
      tenantId,
      endpointName: `Extension ${id}`,
    });
    const updatedExtension = await this.extensionRepository.findById(
      id,
      tenantId,
    );
    return {
      success: true,
      message: 'Data model extension updated successfully',
      extension: updatedExtension,
    };
  }
  async deleteExtension(
    id: number,
    tenantId: string,
    userId: string,
  ): Promise<DataModelExtensionResponseDto> {
    const extension = await this.extensionRepository.findById(id, tenantId);
    if (!extension) {
      throw new NotFoundException(
        `Data model extension with ID ${id} not found`,
      );
    }
    await this.extensionRepository.delete(id, tenantId);
    await this.auditService.logAction({
      action: 'DELETE_DATA_MODEL_EXTENSION',
      actor: userId,
      tenantId,
      endpointName: `Extension ${id}: ${extension.collection}.${extension.fieldName}`,
    });
    return {
      success: true,
      message: 'Data model extension deleted successfully',
    };
  }
  /**
   * Get all available destination paths including extensions
   */
  async getAllDestinationPathsWithExtensions(
    tenantId: string,
  ): Promise<string[]> {
    const basePaths = this.tazamaDataModelService.getAllDestinationPaths();
    const extensions = await this.extensionRepository.findAllByTenant(tenantId);
    const extensionPaths = extensions.map(
      (ext) => `${ext.collection}.${ext.fieldName}`,
    );
    return [...basePaths, ...extensionPaths].sort();
  }
  /**
   * Validate if a destination path is valid (including extensions)
   */
  async isValidDestinationPath(
    path: string,
    tenantId: string,
  ): Promise<boolean> {
    // Check base schema first
    if (this.tazamaDataModelService.isValidDestinationPath(path)) {
      return true;
    }
    // Check extensions
    const [collection, fieldName] = path.split('.');
    if (!collection || !fieldName) {
      return false;
    }
    const extension = await this.extensionRepository.findByCollectionAndField(
      collection as TazamaCollectionName,
      fieldName,
      tenantId,
    );
    return extension !== null;
  }
}
