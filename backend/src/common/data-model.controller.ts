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
    @Param('id') id: string,
    @User() user: AuthenticatedUser,
  ) {
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
    @Param('id') id: string,
    @Body() dto: UpdateDataModelExtensionDto,
    @User() user: AuthenticatedUser,
  ): Promise<DataModelExtensionResponseDto> {
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
    @Param('id') id: string,
    @User() user: AuthenticatedUser,
  ): Promise<DataModelExtensionResponseDto> {
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
}
