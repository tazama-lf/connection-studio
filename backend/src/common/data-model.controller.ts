import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { DataModelExtensionService } from './data-model-extension.service';
import { TazamaDataModelService } from './tazama-data-model.service';
import { TazamaAuthGuard } from '../auth/tazama-auth.guard';
import { RequireEditorRole } from '../auth/auth.decorator';
import { User } from '../auth/user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  CreateDataModelExtensionDto,
  UpdateDataModelExtensionDto,
  DataModelExtensionResponseDto,
} from './data-model-extension.dto';
import type { TazamaCollectionName } from './tazama-data-model.interfaces';
@Controller('data-model')
@UseGuards(TazamaAuthGuard)
@RequireEditorRole()
export class DataModelController {
  private readonly logger = new Logger(DataModelController.name);
  constructor(
    private readonly dataModelExtensionService: DataModelExtensionService,
    private readonly tazamaDataModelService: TazamaDataModelService,
  ) {}
  /**
   * Get the complete Tazama data model schema
   */
  @Get('schema')
  async getSchema() {
    const schemas = this.tazamaDataModelService.getAllCollectionSchemas();
    return {
      success: true,
      schemas,
    };
  }
  /**
   * Get all available destination paths for mapping
   */
  @Get('destination-paths')
  async getDestinationPaths(@User() user: AuthenticatedUser) {
    const paths =
      await this.dataModelExtensionService.getAllDestinationPathsWithExtensions(
        user.tenantId,
      );
    return {
      success: true,
      paths,
    };
  }
  /**
   * Get destination options formatted for UI dropdowns
   */
  @Get('destination-options')
  async getDestinationOptions(@User() user: AuthenticatedUser) {
    const baseOptions = this.tazamaDataModelService.getDestinationOptions();
    const extensions = await this.dataModelExtensionService.getAllExtensions(
      user.tenantId,
    );
    const extensionOptions = extensions.map((ext) => ({
      value: `${ext.collection}.${ext.fieldName}`,
      label: `${ext.collection}.${ext.fieldName}`,
      collection: ext.collection,
      field: ext.fieldName,
      type: ext.fieldType,
      required: ext.isRequired || false,
      description: ext.description,
      isExtension: true,
    }));
    return {
      success: true,
      options: [...baseOptions, ...extensionOptions].sort((a, b) =>
        a.label.localeCompare(b.label),
      ),
    };
  }
  /**
   * Get all data model extensions for the tenant
   */
  @Get('extensions')
  async getAllExtensions(@User() user: AuthenticatedUser) {
    const extensions = await this.dataModelExtensionService.getAllExtensions(
      user.tenantId,
    );
    return {
      success: true,
      extensions,
    };
  }
  /**
   * Get extensions for a specific collection
   */
  @Get('extensions/collection/:collection')
  async getExtensionsByCollection(
    @Param('collection') collection: TazamaCollectionName,
    @User() user: AuthenticatedUser,
  ) {
    const extensions =
      await this.dataModelExtensionService.getExtensionsByCollection(
        collection,
        user.tenantId,
      );
    return {
      success: true,
      extensions,
    };
  }
  /**
   * Get a specific extension by ID
   */
  @Get('extensions/:id')
  async getExtensionById(
    @Param('id') idStr: string,
    @User() user: AuthenticatedUser,
  ) {
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return {
        success: false,
        message: 'Invalid extension ID',
      };
    }
    const extension = await this.dataModelExtensionService.getExtensionById(
      id,
      user.tenantId,
    );
    return {
      success: true,
      extension,
    };
  }
  /**
   * Create a new data model extension
   */
  @Post('extensions')
  async createExtension(
    @Body() dto: CreateDataModelExtensionDto,
    @User() user: AuthenticatedUser,
  ): Promise<DataModelExtensionResponseDto> {
    return this.dataModelExtensionService.createExtension(
      dto,
      user.tenantId,
      user.userId,
    );
  }
  /**
   * Update an existing data model extension
   */
  @Put('extensions/:id')
  async updateExtension(
    @Param('id') idStr: string,
    @Body() dto: UpdateDataModelExtensionDto,
    @User() user: AuthenticatedUser,
  ): Promise<DataModelExtensionResponseDto> {
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return {
        success: false,
        message: 'Invalid extension ID',
      };
    }
    return this.dataModelExtensionService.updateExtension(
      id,
      dto,
      user.tenantId,
      user.userId,
    );
  }
  /**
   * Delete a data model extension
   */
  @Delete('extensions/:id')
  async deleteExtension(
    @Param('id') idStr: string,
    @User() user: AuthenticatedUser,
  ): Promise<DataModelExtensionResponseDto> {
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return {
        success: false,
        message: 'Invalid extension ID',
      };
    }
    return this.dataModelExtensionService.deleteExtension(
      id,
      user.tenantId,
      user.userId,
    );
  }
  /**
   * Validate a destination path
   */
  @Post('validate-destination')
  async validateDestination(
    @Body() body: { path: string },
    @User() user: AuthenticatedUser,
  ) {
    const isValid = await this.dataModelExtensionService.isValidDestinationPath(
      body.path,
      user.tenantId,
    );
    let fieldInfo: any = null;
    if (isValid) {
      const fieldType = this.tazamaDataModelService.getFieldType(body.path);
      const description = this.tazamaDataModelService.getFieldDescription(
        body.path,
      );
      const example = this.tazamaDataModelService.getFieldExample(body.path);
      const required = this.tazamaDataModelService.isFieldRequired(body.path);
      fieldInfo = {
        type: fieldType,
        description,
        example,
        required,
      };
    }
    return {
      success: true,
      isValid,
      fieldInfo,
    };
  }
  /**
   * Get mapping suggestions for a destination field
   * Returns recommended transformation types based on field type
   */
  @Get('mapping-suggestions/:destinationPath')
  async getMappingSuggestions(
    @Param('destinationPath') destinationPath: string,
    @User() _user: AuthenticatedUser,
  ) {
    const fieldType = this.tazamaDataModelService.getFieldType(destinationPath);
    const description =
      this.tazamaDataModelService.getFieldDescription(destinationPath);
    const example =
      this.tazamaDataModelService.getFieldExample(destinationPath);
    const required =
      this.tazamaDataModelService.isFieldRequired(destinationPath);
    const suggestions = this.getSuggestedTransformations(fieldType);
    return {
      success: true,
      destinationPath,
      fieldInfo: {
        type: fieldType,
        description,
        example,
        required,
      },
      suggestedTransformations: suggestions,
    };
  }
  /**
   * Helper method to suggest transformations based on field type
   */
  private getSuggestedTransformations(fieldType: string | null) {
    if (!fieldType) {
      return [];
    }
    const suggestions: Array<{
      transformation: string;
      description: string;
      sourceType: 'single' | 'multiple';
      example: string;
    }> = [];
    suggestions.push({
      transformation: 'NONE',
      description: 'Direct 1-to-1 mapping (copy value as-is)',
      sourceType: 'single',
      example: 'source: "transactionId" → destination value',
    });
    if (fieldType === 'STRING') {
      suggestions.push({
        transformation: 'CONCAT',
        description: 'Combine multiple source fields with a delimiter',
        sourceType: 'multiple',
        example: 'sources: ["firstName", "lastName"] + " " → "John Doe"',
      });
      suggestions.push({
        transformation: 'SPLIT',
        description: 'Split one source field into multiple parts',
        sourceType: 'single',
        example: 'source: "fullName" split by " " → ["John", "Doe"]',
      });
    }
    if (fieldType === 'NUMBER') {
      suggestions.push({
        transformation: 'SUM',
        description: 'Sum multiple numeric source fields',
        sourceType: 'multiple',
        example: 'sources: [100, 200, 50] → 350',
      });
    }
    return suggestions;
  }
  /**
   * Get destination fields grouped by collection with stats
   */
  @Get('destination-fields-grouped')
  async getDestinationFieldsGrouped(@User() user: AuthenticatedUser) {
    const baseOptions = this.tazamaDataModelService.getDestinationOptions();
    const extensions = await this.dataModelExtensionService.getAllExtensions(
      user.tenantId,
    );
    const grouped: Record<string, any[]> = {};
    for (const option of baseOptions) {
      if (!grouped[option.collection]) {
        grouped[option.collection] = [];
      }
      grouped[option.collection].push({
        ...option,
        isExtension: false,
      });
    }
    for (const ext of extensions) {
      if (!grouped[ext.collection]) {
        grouped[ext.collection] = [];
      }
      grouped[ext.collection].push({
        value: `${ext.collection}.${ext.fieldName}`,
        label: `${ext.collection}.${ext.fieldName}`,
        collection: ext.collection,
        field: ext.fieldName,
        type: ext.fieldType,
        required: ext.isRequired || false,
        description: ext.description,
        isExtension: true,
      });
    }
    const stats = {
      totalCollections: Object.keys(grouped).length,
      totalFields: Object.values(grouped).reduce(
        (sum, fields) => sum + fields.length,
        0,
      ),
      totalBaseFields: baseOptions.length,
      totalExtensions: extensions.length,
      requiredFields: Object.values(grouped)
        .flat()
        .filter((f: any) => f.required).length,
    };
    return {
      success: true,
      grouped,
      stats,
    };
  }
}
