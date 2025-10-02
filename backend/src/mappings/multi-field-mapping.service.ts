import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { MultiFieldMappingsRepository } from './multi-field-mappings.repository';
import { TazamaDataModelService } from './tazama-data-model.service';
import { EndpointsService } from '../endpoints/endpoints.service';
import { AuditService } from '../audit/audit.service';
import { MultiFieldMappingEntity } from '../common/multi-field-mapping.interfaces';
import {
  CreateMultiFieldMappingDto,
  UpdateMultiFieldMappingDto,
  GetMappingsQueryDto,
  SimulateMappingDto,
  BulkMappingOperationDto,
} from './multi-field-mapping.dto';

@Injectable()
export class MultiFieldMappingService {
  constructor(
    private readonly multiFieldMappingsRepository: MultiFieldMappingsRepository,
    private readonly tazamaDataModelService: TazamaDataModelService,
    private readonly endpointsService: EndpointsService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create a new multi-field mapping
   */
  async createMapping(
    dto: CreateMultiFieldMappingDto,
    userId: string,
    tenantId: string,
  ): Promise<MultiFieldMappingEntity> {
    // Validate endpoint exists
    const endpoint = await this.endpointsService.getEndpointById(
      dto.endpointId,
      tenantId,
    );
    if (!endpoint) {
      throw new BadRequestException(
        `Endpoint with ID ${dto.endpointId} not found`,
      );
    }

    // Validate source fields exist in endpoint schema
    for (const sourceField of dto.sourceFields) {
      const schemaField = endpoint.schemaJson?.sourceFields?.find(
        (field) => field.path === sourceField.path,
      );
      if (!schemaField) {
        throw new BadRequestException(
          `Source field '${sourceField.path}' not found in endpoint schema`,
        );
      }
    }

    // Validate destination fields against Tazama data model
    for (const destField of dto.destinationFields) {
      if (!destField.isExtension) {
        const isValid =
          await this.tazamaDataModelService.validateDestinationFieldPath(
            destField.path,
            tenantId,
          );
        if (!isValid) {
          throw new BadRequestException(
            `Destination field '${destField.path}' not found in Tazama data model`,
          );
        }
      }
    }

    // Check for duplicate mapping names within the same endpoint
    const existingMappings =
      await this.multiFieldMappingsRepository.findByEndpointId(
        dto.endpointId,
        tenantId,
      );

    if (existingMappings) {
      const duplicateName = existingMappings.find((m) => m.name === dto.name);
      if (duplicateName) {
        throw new ConflictException(
          `Mapping with name '${dto.name}' already exists for this endpoint`,
        );
      }
    }

    const mappingData: Omit<
      MultiFieldMappingEntity,
      'id' | 'createdAt' | 'updatedAt'
    > = {
      endpointId: dto.endpointId,
      name: dto.name,
      description: dto.description,
      sourceFields: dto.sourceFields,
      destinationFields: dto.destinationFields,
      transformation: dto.transformation,
      transformationConfig: dto.transformationConfig,
      constants: dto.constants || {},
      status: dto.status,
      orderIndex: dto.orderIndex || 0,
      version: 1,
      tenantId,
      createdBy: userId,
    };

    const createdMapping =
      await this.multiFieldMappingsRepository.create(mappingData);

    // Log the mapping creation
    await this.auditService.logMappingAction({
      action: 'CREATE',
      actor: userId,
      tenantId,
      mappingName: createdMapping.name,
      version: createdMapping.version,
    });

    return createdMapping;
  }

  /**
   * Get mappings with filtering and pagination
   */
  async getMappings(
    query: GetMappingsQueryDto,
    tenantId: string,
  ): Promise<{
    mappings: MultiFieldMappingEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.multiFieldMappingsRepository.findAllByTenant(tenantId, {
      endpointId: query.endpointId,
      status: query.status,
      search: query.search,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  /**
   * Get mapping by ID
   */
  async getMappingById(
    id: number,
    tenantId: string,
  ): Promise<MultiFieldMappingEntity> {
    const mapping = await this.multiFieldMappingsRepository.findById(
      id,
      tenantId,
    );
    if (!mapping) {
      throw new NotFoundException(`Mapping with ID ${id} not found`);
    }
    return mapping;
  }

  /**
   * Get mappings by endpoint ID
   */
  async getMappingsByEndpointId(
    endpointId: number,
    tenantId: string,
  ): Promise<MultiFieldMappingEntity[]> {
    return this.multiFieldMappingsRepository.findByEndpointId(
      endpointId,
      tenantId,
    );
  }

  /**
   * Update mapping
   */
  async updateMapping(
    id: number,
    dto: UpdateMultiFieldMappingDto,
    userId: string,
    tenantId: string,
  ): Promise<MultiFieldMappingEntity> {
    // Check if mapping exists
    const existingMapping = await this.getMappingById(id, tenantId);
    if (!existingMapping) {
      throw new NotFoundException(`Mapping with ID ${id} not found`);
    }

    const updatedMapping = await this.multiFieldMappingsRepository.update(
      id,
      dto,
      tenantId,
      userId,
      dto.changeReason,
    );

    return updatedMapping;
  }

  /**
   * Delete mapping
   */
  async deleteMapping(
    id: number,
    userId: string,
    tenantId: string,
    // reason?: string,
  ): Promise<void> {
    // const mapping = await this.getMappingById(id, tenantId);
    await this.multiFieldMappingsRepository.delete(id, userId, tenantId);
  }

  /**
   * Bulk operation on mappings
   */
  async bulkOperation(
    bulkDto: BulkMappingOperationDto,
    userId: string,
    tenantId: string,
  ): Promise<MultiFieldMappingEntity[]> {
    const status = bulkDto.action === 'ACTIVATE' ? 'ACTIVE' : 'INACTIVE';

    const updatedMappings =
      await this.multiFieldMappingsRepository.bulkUpdateStatus(
        bulkDto.mappingIds,
        status,
        tenantId,
        userId,
        bulkDto.reason,
      );

    // Log bulk operation
    for (const mapping of updatedMappings) {
      await this.auditService.logMappingAction({
        action: 'UPDATE',
        actor: userId,
        tenantId,
        mappingName: mapping.name,
        version: mapping.version,
      });
    }

    return updatedMappings;
  }

  /**
   * Simulate mapping
   */
  async simulateMapping(simulationDto: SimulateMappingDto): Promise<any> {
    const startTime = Date.now();

    // Get the mapping
    const mapping = await this.getMappingById(
      simulationDto.mappingId,
      simulationDto.tenantId,
    );

    // Check if mapping is active
    if (mapping.status !== 'ACTIVE') {
      throw new BadRequestException('Cannot simulate inactive mapping');
    }

    // Transform the test payload
    const transformedOutput: Record<string, any> = {};
    const errors: string[] = [];

    try {
      // Map source fields to destination fields
      for (let i = 0; i < mapping.sourceFields.length; i++) {
        const sourceField = mapping.sourceFields[i];
        const destField = mapping.destinationFields[i];

        // Get value from test payload using dot notation
        const value = this.getValueFromPath(
          simulationDto.testPayload,
          sourceField.path,
        );

        // Check if required field is missing
        if (value === undefined && sourceField.isRequired) {
          errors.push(
            `Required source field '${sourceField.path}' is missing or undefined`,
          );
          continue;
        }

        // Set value in output using dot notation
        if (value !== undefined) {
          transformedOutput[destField.path] = value;
        }
      }
    } catch (error) {
      errors.push(`Transformation error: ${error.message || 'Unknown error'}`);
    }

    const processingTime = Math.max(Date.now() - startTime, 1); // Ensure at least 1ms

    return {
      success: errors.length === 0,
      transformedOutput,
      processingTime,
      validationResult: {
        errors,
      },
    };
  }

  /**
   * Helper method to get value from object using dot notation
   */
  private getValueFromPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get mapping tree view
   */
  async getMappingTreeView(id: number, tenantId: string): Promise<any> {
    const mapping = await this.getMappingById(id, tenantId);

    const sourceNodes = mapping.sourceFields.map((field) => ({
      path: field.path,
      type: field.type,
      isRequired: field.isRequired,
    }));

    const destinationNodes = mapping.destinationFields.map((field) => ({
      path: field.path,
      type: field.type,
      isRequired: field.isRequired,
      isExtension: field.isExtension,
    }));

    const transformationNodes =
      mapping.transformation && mapping.transformation !== 'NONE'
        ? [
            {
              name: mapping.transformation,
              config: mapping.transformationConfig,
            },
          ]
        : [];

    return {
      mappingId: mapping.id,
      mappingName: mapping.name,
      sourceNodes,
      destinationNodes,
      transformationNodes,
    };
  }
}
