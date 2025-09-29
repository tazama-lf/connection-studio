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
  ParseUUIDPipe,
  ParseIntPipe,
  ParseBoolPipe,
  ParseEnumPipe,
} from '@nestjs/common';
import { DataModelExtensionService } from './data-model-extension.service';
import { AddFieldDto, UpdateExtensionDto } from './data-model-extension.dto';
import { FieldType, ExtensionStatus } from './data-model-extension.entity';
import { TazamaAuthGuard } from '../auth/tazama-auth.guard';
import { RequireClaim, TazamaClaims } from '../auth/auth.decorator';
import { User } from '../auth/user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
@Controller('data-model-extensions')
@UseGuards(TazamaAuthGuard)
export class DataModelExtensionController {
  constructor(private readonly extensionService: DataModelExtensionService) {}
  @Post('fields')
  @RequireClaim(TazamaClaims.EDITOR)
  async addField(
    @Body() addFieldDto: AddFieldDto,
    @User() user: AuthenticatedUser,
  ) {
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';
    const extension = await this.extensionService.addField(
      addFieldDto.collection,
      addFieldDto.fieldName,
      addFieldDto.fieldType,
      addFieldDto.required,
      addFieldDto.defaultValue,
      userIdentity,
    );
    return {
      success: true,
      data: extension,
      message: `Field '${addFieldDto.fieldName}' added to collection '${addFieldDto.collection}' successfully`,
    };
  }
  @Get('collections/:collection')
  @RequireClaim(TazamaClaims.EDITOR)
  async listExtensions(
    @Param('collection') collection: string,
    @Query('status') status?: ExtensionStatus,
    @Query('version', new ParseIntPipe({ optional: true })) version?: number,
  ) {
    const extensions = await this.extensionService.listExtensions(
      collection,
      status,
      version,
    );
    return {
      success: true,
      data: extensions,
      message: `Retrieved ${extensions.length} extensions for collection '${collection}'`,
    };
  }
  @Delete(':id')
  @RequireClaim(TazamaClaims.EDITOR)
  async removeExtension(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: AuthenticatedUser,
  ) {
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';
    const extension = await this.extensionService.removeExtension(
      id,
      userIdentity,
    );
    return {
      success: true,
      data: extension,
      message: 'Extension removed successfully',
    };
  }
  @Put(':id')
  @RequireClaim(TazamaClaims.EDITOR)
  async updateExtension(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateExtensionDto,
    @User() user: AuthenticatedUser,
  ) {
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';
    const extension = await this.extensionService.updateExtension(
      id,
      updateDto,
      userIdentity,
    );
    return {
      success: true,
      data: extension,
      message: 'Extension updated successfully',
    };
  }
  @Put(':id/activate')
  @RequireClaim(TazamaClaims.EDITOR)
  async activateExtension(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: AuthenticatedUser,
  ) {
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';
    const extension = await this.extensionService.activateExtension(
      id,
      userIdentity,
    );
    return {
      success: true,
      data: extension,
      message: 'Extension activated successfully',
    };
  }
  @Get(':id/audit')
  @RequireClaim(TazamaClaims.EDITOR)
  async getAuditHistory(@Param('id', ParseUUIDPipe) id: string) {
    const auditLogs = await this.extensionService.getExtensionAuditHistory(id);
    return {
      success: true,
      data: auditLogs,
      message: `Retrieved ${auditLogs.length} audit log entries`,
    };
  }
  @Get()
  @RequireClaim('ADMIN')
  async getAllExtensions() {
    const extensions = await this.extensionService.getAllExtensions();
    return {
      success: true,
      data: extensions,
      message: `Retrieved ${extensions.length} extensions across all collections`,
    };
  }
  @Post('collections/:collection/validate')
  @RequireClaim(TazamaClaims.EDITOR)
  async validateCollectionExtensions(
    @Param('collection') collection: string,
    @Body('mappedFields') mappedFields?: string[],
  ) {
    const validationErrors =
      await this.extensionService.validateCollectionExtensions(
        collection,
        mappedFields,
      );
    return {
      success: validationErrors.length === 0,
      data: {
        isValid: validationErrors.length === 0,
        errors: validationErrors,
      },
      message:
        validationErrors.length === 0
          ? 'All required extensions are satisfied'
          : `${validationErrors.length} validation errors found`,
    };
  }
  @Post('fields/direct')
  @RequireClaim(TazamaClaims.EDITOR)
  async addFieldDirect(
    @Body('collection') collection: string,
    @Body('fieldName') fieldName: string,
    @Body('fieldType', new ParseEnumPipe(FieldType)) fieldType: FieldType,
    @Body('required', ParseBoolPipe) required: boolean,
    @Body('defaultValue') defaultValue: any,
    @User() user: AuthenticatedUser,
  ) {
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';
    const extension = await this.extensionService.addField(
      collection,
      fieldName,
      fieldType,
      required,
      defaultValue,
      userIdentity,
    );
    return {
      success: true,
      data: extension,
      message: `Field '${fieldName}' added to collection '${collection}' successfully`,
    };
  }
}
