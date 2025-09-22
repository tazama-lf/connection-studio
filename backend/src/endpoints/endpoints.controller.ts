import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EndpointsService } from './endpoints.service';
import {
  CreateEndpointDto,
  InferSchemaDto,
  SchemaFieldDto,
  UpdateFieldDto,
  ToggleFieldRequiredDto,
  AddFieldDto,
  ReorderFieldsDto,
} from '../common/dto';
import { FileUploadDto } from '../common/file-upload.dto';
import { FileParsingService } from '../common/file-parsing.service';
import { TazamaAuthGuard } from '../auth/tazama-auth.guard';
import {
  RequireClaim,
  RequireAnyClaims,
  TazamaClaims,
} from '../auth/auth.decorator';
import { User } from '../auth/user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

interface SaveDraftDto {
  schema: SchemaFieldDto[];
  notes: string;
}

@Controller('endpoints')
@UseGuards(TazamaAuthGuard)
export class EndpointsController {
  constructor(
    private readonly endpointsService: EndpointsService,
    private readonly fileParsingService: FileParsingService,
  ) {}

  @Post('infer-schema')
  @RequireClaim(TazamaClaims.EDITOR)
  async inferSchema(
    @Body() dto: InferSchemaDto,
    @User() user: AuthenticatedUser,
  ) {
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';
    const schema = await this.endpointsService.inferSchemaFromPayload(
      dto,
      userIdentity,
    );
    return {
      success: true,
      data: {
        schema,
        fieldsCount: schema.length,
      },
    };
  }

  @Post('upload-payload')
  @RequireClaim(TazamaClaims.EDITOR)
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = FileParsingService.getAllowedMimeTypes();
        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new Error(
              'Invalid file type. Only JSON and XML files are allowed.',
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadPayload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: FileUploadDto,
    @User() user: AuthenticatedUser,
  ) {
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';

    const parsedFile = this.fileParsingService.parseUploadedFile(
      file,
      dto.contentType,
    );

    const schema = await this.endpointsService.inferSchemaFromPayload(
      {
        payload: parsedFile.content,
        contentType: parsedFile.contentType,
      },
      userIdentity,
    );

    return {
      success: true,
      data: {
        schema,
        fieldsCount: schema.length,
        fileInfo: {
          originalName: parsedFile.originalName,
          size: parsedFile.size,
          contentType: parsedFile.contentType,
        },
      },
    };
  }

  @Post('upload-payload-auto-detect')
  @RequireClaim(TazamaClaims.EDITOR)
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = FileParsingService.getAllowedMimeTypes();
        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new Error(
              'Invalid file type. Only JSON and XML files are allowed.',
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadPayloadAutoDetect(
    @UploadedFile() file: Express.Multer.File,
    @User() user: AuthenticatedUser,
  ) {
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';

    const detectedContentType = this.fileParsingService.detectContentType(file);

    const parsedFile = this.fileParsingService.parseUploadedFile(
      file,
      detectedContentType,
    );

    const schema = await this.endpointsService.inferSchemaFromPayload(
      {
        payload: parsedFile.content,
        contentType: parsedFile.contentType,
      },
      userIdentity,
    );

    return {
      success: true,
      data: {
        schema,
        fieldsCount: schema.length,
        fileInfo: {
          originalName: parsedFile.originalName,
          size: parsedFile.size,
          contentType: parsedFile.contentType,
          detectedContentType: detectedContentType,
        },
      },
    };
  }

  @Post()
  @RequireClaim(TazamaClaims.EDITOR)
  async createEndpoint(
    @Body() dto: CreateEndpointDto,
    @User() user: AuthenticatedUser,
  ) {
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';
    const result = await this.endpointsService.createEndpoint(
      dto,
      userIdentity,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Post('validate-schema')
  @RequireClaim(TazamaClaims.EDITOR)
  async validateSchema(
    @Body() fields: SchemaFieldDto[],
    @User() user: AuthenticatedUser,
  ) {
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';
    const validation = await this.endpointsService.validateSchema(
      fields,
      userIdentity,
    );
    return {
      success: validation.isValid,
      data: validation,
    };
  }

  @Put(':id/draft')
  @RequireClaim(TazamaClaims.EDITOR)
  async saveDraft(
    @Param('id', ParseIntPipe) endpointId: number,
    @Body() dto: SaveDraftDto,
    @User() user: AuthenticatedUser,
  ) {
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';
    await this.endpointsService.saveEndpointDraft(
      endpointId,
      dto.schema,
      dto.notes,
      userIdentity,
    );
    return {
      success: true,
      message: 'Draft saved successfully',
    };
  }

  @Post(':id/submit-for-approval')
  @RequireClaim(TazamaClaims.EDITOR)
  async submitForApproval(
    @Param('id', ParseIntPipe) endpointId: number,
    @User() user: AuthenticatedUser,
  ) {
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';
    await this.endpointsService.submitEndpointForApproval(
      endpointId,
      userIdentity,
    );
    return {
      success: true,
      message: 'Endpoint submitted for approval',
    };
  }

  @Post(':id/approve')
  @RequireClaim(TazamaClaims.APPROVER)
  async approveEndpoint(
    @Param('id', ParseIntPipe) endpointId: number,
    @Body() dto: { comments?: string },
    @User() user: AuthenticatedUser,
  ) {
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';
    await this.endpointsService.approveEndpoint(
      endpointId,
      userIdentity,
      dto.comments,
    );
    return {
      success: true,
      message: 'Endpoint approved successfully',
    };
  }

  @Post(':id/reject')
  @RequireClaim(TazamaClaims.APPROVER)
  async rejectEndpoint(
    @Param('id', ParseIntPipe) endpointId: number,
    @Body() dto: { reason: string },
    @User() user: AuthenticatedUser,
  ) {
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';
    await this.endpointsService.rejectEndpoint(
      endpointId,
      userIdentity,
      dto.reason,
    );
    return {
      success: true,
      message: 'Endpoint rejected',
    };
  }

  @Post(':id/publish')
  @RequireClaim(TazamaClaims.PUBLISHER)
  async publishEndpoint(
    @Param('id', ParseIntPipe) endpointId: number,
    @User() user: AuthenticatedUser,
  ) {
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';
    await this.endpointsService.publishEndpoint(endpointId, userIdentity);
    return {
      success: true,
      message: 'Endpoint published to production',
    };
  }

  @Get('pending-approval')
  @RequireAnyClaims(TazamaClaims.APPROVER, TazamaClaims.PUBLISHER)
  async getPendingApprovalEndpoints(@User() _user: AuthenticatedUser) {
    const endpoints = await this.endpointsService.getPendingApprovalEndpoints();
    return {
      success: true,
      data: endpoints,
    };
  }

  @Get('approved')
  @RequireClaim(TazamaClaims.PUBLISHER)
  async getApprovedEndpoints(@User() _user: AuthenticatedUser) {
    const endpoints = await this.endpointsService.getApprovedEndpoints();
    return {
      success: true,
      data: endpoints,
    };
  }

  @Get(':id')
  @RequireAnyClaims(
    TazamaClaims.EDITOR,
    TazamaClaims.APPROVER,
    TazamaClaims.PUBLISHER,
  )
  async getEndpoint(@Param('id', ParseIntPipe) id: number) {
    const endpoint = await this.endpointsService.getEndpointById(id);
    if (!endpoint) {
      return {
        success: false,
        message: 'Endpoint not found',
      };
    }
    return {
      success: true,
      data: endpoint,
    };
  }

  @Get()
  @RequireClaim(TazamaClaims.EDITOR)
  async getMyEndpoints(@User() user: AuthenticatedUser) {
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';
    const endpoints =
      await this.endpointsService.getEndpointsByCreator(userIdentity);
    return {
      success: true,
      data: endpoints,
    };
  }

  // Field editing endpoints
  @Get(':id/schema/fields')
  @RequireClaim(TazamaClaims.EDITOR)
  async getSchemaFields(@Param('id', ParseIntPipe) endpointId: number) {
    const fields = await this.endpointsService.getSchemaFields(endpointId);
    return {
      success: true,
      data: fields,
    };
  }

  @Put(':id/schema/fields/:fieldId')
  @RequireClaim(TazamaClaims.EDITOR)
  async updateSchemaField(
    @Param('id', ParseIntPipe) endpointId: number,
    @Param('fieldId', ParseIntPipe) fieldId: number,
    @Body() dto: UpdateFieldDto,
    @User() user: AuthenticatedUser,
  ) {
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';
    await this.endpointsService.updateSchemaField(
      endpointId,
      fieldId,
      dto,
      userIdentity,
    );
    return {
      success: true,
      message: 'Field updated successfully',
    };
  }

  @Put(':id/schema/fields/:fieldId/toggle-required')
  @RequireClaim(TazamaClaims.EDITOR)
  async toggleFieldRequired(
    @Param('id', ParseIntPipe) endpointId: number,
    @Param('fieldId', ParseIntPipe) fieldId: number,
    @Body() dto: ToggleFieldRequiredDto,
    @User() user: AuthenticatedUser,
  ) {
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';
    await this.endpointsService.toggleFieldRequired(
      endpointId,
      fieldId,
      dto.isRequired,
      userIdentity,
    );
    return {
      success: true,
      message: 'Field requirement status updated successfully',
    };
  }

  @Post(':id/schema/fields')
  @RequireClaim(TazamaClaims.EDITOR)
  async addSchemaField(
    @Param('id', ParseIntPipe) endpointId: number,
    @Body() dto: AddFieldDto,
    @User() user: AuthenticatedUser,
  ) {
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';
    const field = await this.endpointsService.addSchemaField(
      endpointId,
      dto,
      userIdentity,
    );
    return {
      success: true,
      message: 'Field added successfully',
      data: field,
    };
  }

  @Delete(':id/schema/fields/:fieldId')
  @RequireClaim(TazamaClaims.EDITOR)
  async removeSchemaField(
    @Param('id', ParseIntPipe) endpointId: number,
    @Param('fieldId', ParseIntPipe) fieldId: number,
    @User() user: AuthenticatedUser,
  ) {
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';
    await this.endpointsService.removeSchemaField(
      endpointId,
      fieldId,
      userIdentity,
    );
    return {
      success: true,
      message: 'Field removed successfully',
    };
  }

  @Put(':id/schema/fields/reorder')
  @RequireClaim(TazamaClaims.EDITOR)
  async reorderSchemaFields(
    @Param('id', ParseIntPipe) endpointId: number,
    @Body() dto: ReorderFieldsDto,
    @User() user: AuthenticatedUser,
  ) {
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';
    await this.endpointsService.reorderSchemaFields(
      endpointId,
      dto.fieldIds,
      userIdentity,
    );
    return {
      success: true,
      message: 'Fields reordered successfully',
    };
  }
}
