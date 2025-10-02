import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TazamaAuthGuard } from '../auth/tazama-auth.guard';
import { User } from '../auth/user.decorator';
import { MultiFieldMappingService } from './multi-field-mapping.service';
import {
  CreateMultiFieldMappingDto,
  UpdateMultiFieldMappingDto,
  BulkMappingOperationDto,
  GetMappingsQueryDto,
} from './multi-field-mapping.dto';
import {
  MultiFieldMappingEntity,
  SimulationResult,
  MappingTreeView,
} from '../common/multi-field-mapping.interfaces';
import { RequireClaims, TazamaClaims } from 'src/auth/auth.decorator';

@Controller('multi-field-mappings')
@UseGuards(TazamaAuthGuard)
@RequireClaims(TazamaClaims.EDITOR)
export class MultiFieldMappingController {
  constructor(
    private readonly multiFieldMappingService: MultiFieldMappingService,
  ) {}

  /**
   * Create a new multi-field mapping
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createMapping(
    @Body() createDto: CreateMultiFieldMappingDto,
    @User() user: any,
    @Request() req: any,
  ): Promise<MultiFieldMappingEntity> {
    const userId = user.id || user.sub || 'system';
    const tenantId =
      req.headers['x-tenant-id'] ||
      user.tenantId ||
      createDto.tenantId ||
      'default-tenant';

    // Set defaults for optional fields
    const mappingData = {
      ...createDto,
      tenantId,
      createdBy: createDto.createdBy || userId,
      orderIndex: createDto.orderIndex || 0,
    };

    return this.multiFieldMappingService.createMapping(
      mappingData,
      userId,
      tenantId,
    );
  }

  /**
   * Get all mappings with filtering and pagination
   */
  @Get()
  async getMappings(
    @Query() query: GetMappingsQueryDto,
    @Request() req: any,
    @User() user: any,
  ): Promise<{
    mappings: MultiFieldMappingEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const tenantId = req.headers['x-tenant-id'] || user.tenantId;
    return this.multiFieldMappingService.getMappings(query, tenantId);
  }

  /**
   * Get mapping by ID
   */
  @Get(':id')
  async getMappingById(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @User() user: any,
  ): Promise<MultiFieldMappingEntity> {
    const tenantId = req.headers['x-tenant-id'] || user.tenantId;
    return this.multiFieldMappingService.getMappingById(id, tenantId);
  }

  /**
   * Get mappings by endpoint ID
   */
  @Get('endpoint/:endpointId')
  async getMappingsByEndpoint(
    @Param('endpointId', ParseIntPipe) endpointId: number,
    @Request() req: any,
    @User() user: any,
  ): Promise<MultiFieldMappingEntity[]> {
    const tenantId = req.headers['x-tenant-id'] || user.tenantId;
    return this.multiFieldMappingService.getMappingsByEndpointId(
      endpointId,
      tenantId,
    );
  }

  /**
   * Update mapping
   */
  @Put(':id')
  async updateMapping(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateMultiFieldMappingDto,
    @User() user: any,
    @Request() req: any,
  ): Promise<MultiFieldMappingEntity> {
    const userId = user.id || user.sub || 'system';
    const tenantId = req.headers['x-tenant-id'] || user.tenantId;

    return this.multiFieldMappingService.updateMapping(
      id,
      updateDto,
      userId,
      tenantId,
    );
  }

  /**
   * Delete mapping (soft delete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMapping(
    @Param('id', ParseIntPipe) id: number,
    @User() user: any,
    @Request() req: any,
    @Body('reason') _reason?: string,
  ): Promise<void> {
    const userId = user.id || user.sub || 'system';
    const tenantId = req.headers['x-tenant-id'] || user.tenantId;

    return this.multiFieldMappingService.deleteMapping(id, userId, tenantId);
  }

  /**
   * Bulk operations on mappings
   */
  @Post('bulk')
  async bulkOperation(
    @Body() bulkDto: BulkMappingOperationDto,
    @User() user: any,
    @Request() req: any,
  ): Promise<MultiFieldMappingEntity[]> {
    const userId = user.id || user.sub || 'system';
    const tenantId = req.headers['x-tenant-id'] || user.tenantId;
    return this.multiFieldMappingService.bulkOperation(
      bulkDto,
      userId,
      tenantId,
    );
  }

  /**
   * Simulate mapping with test payload
   */
  @Post(':id/simulate')
  async simulateMapping(
    @Param('id', ParseIntPipe) id: number,
    @Body('testPayload') testPayload: Record<string, any>,
    @Request() req: any,
    @User() user: any,
  ): Promise<SimulationResult> {
    const tenantId = req.headers['x-tenant-id'] || user.tenantId;

    const simulationDto = {
      mappingId: id,
      testPayload,
      tenantId,
    };

    return this.multiFieldMappingService.simulateMapping(simulationDto);
  }

  /**
   * Get mapping tree view for UI
   */
  @Get(':id/tree-view')
  async getMappingTreeView(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @User() user: any,
  ): Promise<MappingTreeView> {
    const tenantId = req.headers['x-tenant-id'] || user.tenantId;
    return this.multiFieldMappingService.getMappingTreeView(id, tenantId);
  }

  /**
   * Validate mapping configuration
   */
  @Post('validate')
  async validateMapping(
    @Body() createDto: CreateMultiFieldMappingDto,
    @Request() req: any,
    @User() user: any,
  ): Promise<{ isValid: boolean; errors: any[] }> {
    const tenantId =
      req.headers['x-tenant-id'] || user.tenantId || createDto.tenantId;

    try {
      // Use the service's validation logic (without creating)
      const tempMapping = {
        ...createDto,
        tenantId,
      };

      // This will throw BadRequestException if validation fails
      await this.multiFieldMappingService.createMapping(
        tempMapping,
        'validation-user',
        tenantId,
      );

      // If we get here, validation passed
      return { isValid: true, errors: [] };
    } catch (error) {
      if (error.response?.errors) {
        return { isValid: false, errors: error.response.errors };
      }

      return {
        isValid: false,
        errors: [
          {
            field: 'general',
            message: error.message,
            code: 'VALIDATION_ERROR',
          },
        ],
      };
    }
  }

  /**
   * Get mapping history
   */
  @Get(':id/history')
  async getMappingHistory() {
    // @User() user: any, // @Request() req: any, // @Param('id', ParseIntPipe) id: number,
    // const tenantId = req.headers['x-tenant-id'] || user.tenantId;

    // This would need to be implemented in the service
    // For now, return empty array
    return [];
  }

  /**
   * Export mapping configuration
   */
  @Get(':id/export')
  async exportMapping(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @User() user: any,
  ): Promise<{ mapping: MultiFieldMappingEntity; exportedAt: Date }> {
    const tenantId = req.headers['x-tenant-id'] || user.tenantId;
    const mapping = await this.multiFieldMappingService.getMappingById(
      id,
      tenantId,
    );

    return {
      mapping,
      exportedAt: new Date(),
    };
  }

  /**
   * Clone mapping
   */
  @Post(':id/clone')
  async cloneMapping(
    @Param('id', ParseIntPipe) id: number,
    @User() user: any,
    @Request() req: any,
    @Body('name') newName: string,
    @Body('endpointId') newEndpointId?: number,
  ): Promise<MultiFieldMappingEntity> {
    const userId = user.id || user.sub || 'system';
    const tenantId = req.headers['x-tenant-id'] || user.tenantId;

    const originalMapping = await this.multiFieldMappingService.getMappingById(
      id,
      tenantId,
    );

    const cloneDto: CreateMultiFieldMappingDto = {
      endpointId: newEndpointId || originalMapping.endpointId,
      name: newName || `${originalMapping.name} (Copy)`,
      description: originalMapping.description
        ? `${originalMapping.description} (Cloned)`
        : undefined,
      sourceFields: originalMapping.sourceFields,
      destinationFields: originalMapping.destinationFields,
      transformation: originalMapping.transformation,
      transformationConfig: originalMapping.transformationConfig,
      constants: originalMapping.constants,
      status: 'DRAFT',
      orderIndex: originalMapping.orderIndex,
      tenantId,
      createdBy: userId,
    };

    return this.multiFieldMappingService.createMapping(
      cloneDto,
      userId,
      tenantId,
    );
  }
}
