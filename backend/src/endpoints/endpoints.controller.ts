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
  ParsePayloadDto,
  CreateEndpointWithSchemaDto,
  EndpointLifecycleTransitionDto,
  ParsedSchemaResponseDto,
  EndpointCreationResponseDto,
  ConstantFieldDto,
  FormulaFieldDto,
} from '../common/schema-workflow.dto';
import { FileParsingService } from '../common/file-parsing.service';
import { TazamaAuthGuard } from '../auth/tazama-auth.guard';
import {
  RequireClaim,
  RequireAnyClaims,
  TazamaClaims,
} from '../auth/auth.decorator';
import { User } from '../auth/user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

@Controller('endpoints')
@UseGuards(TazamaAuthGuard)
export class EndpointsController {
  constructor(
    private readonly endpointsService: EndpointsService,
    private readonly fileParsingService: FileParsingService,
  ) {}

  // ================================
  // USER STORY #300 ENDPOINTS
  // ================================

  /**
   * User Story #300: Parse payload and generate schema (no persistence)
   * Allows Editor to paste JSON/XML and see generated schema before saving
   */
  @Post('parse-payload')
  @RequireClaim(TazamaClaims.EDITOR)
  async parsePayloadAndGenerateSchema(
    @Body() dto: ParsePayloadDto,
    @User() user: AuthenticatedUser,
  ): Promise<ParsedSchemaResponseDto> {
    const tenantId = user.token.tenantId;

    return await this.endpointsService.parsePayloadAndGenerateSchema(
      dto,
      tenantId,
    );
  }

  /**
   * User Story #300: Create endpoint with generated schema
   * Saves schema_json with only source fields in endpoints table
   */
  @Post('create-with-generated-schema')
  @RequireClaim(TazamaClaims.EDITOR)
  async createEndpointWithGeneratedSchema(
    @Body() dto: CreateEndpointWithSchemaDto,
    @User() user: AuthenticatedUser,
  ): Promise<EndpointCreationResponseDto> {
    const tenantId = user.token.tenantId;
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';

    return await this.endpointsService.createEndpointWithGeneratedSchema(
      dto,
      tenantId,
      userIdentity,
    );
  }

  /**
   * User Story #300: Update endpoint source fields with adjustments
   * Allow Editor to modify types and isRequired flags
   */
  @Put(':id/source-fields/bulk-update')
  @RequireClaim(TazamaClaims.EDITOR)
  async updateEndpointSourceFields(
    @Param('id', ParseIntPipe) endpointId: number,
    @Body()
    fieldAdjustments: { path: string; type: string; isRequired: boolean }[],
    @User() user: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string }> {
    const tenantId = user.token.tenantId;
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';

    return await this.endpointsService.updateEndpointSourceFields(
      endpointId,
      fieldAdjustments,
      tenantId,
      userIdentity,
    );
  }

  /**
   * User Story #300: Implement endpoint lifecycle transitions
   * IN_PROGRESS → UNDER_REVIEW → PENDING_APPROVAL → READY_FOR_DEPLOYMENT → DEPLOYED
   */
  @Post(':id/transition-status')
  @RequireAnyClaims(
    TazamaClaims.EDITOR,
    TazamaClaims.APPROVER,
    TazamaClaims.PUBLISHER,
  )
  async transitionEndpointStatus(
    @Param('id', ParseIntPipe) endpointId: number,
    @Body() dto: EndpointLifecycleTransitionDto,
    @User() user: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string; newStatus?: string }> {
    const tenantId = user.token.tenantId;
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';
    const userRoles = user.token.claims || [];

    return await this.endpointsService.transitionEndpointStatus(
      endpointId,
      dto,
      tenantId,
      userIdentity,
      userRoles,
    );
  }

  /**
   * User Story #300: Get endpoints with tenant isolation
   */
  @Get('by-tenant')
  @RequireClaim(TazamaClaims.EDITOR)
  async getEndpointsByTenant(
    @User() user: AuthenticatedUser,
  ): Promise<{ success: boolean; endpoints: any[] }> {
    const tenantId = user.token.tenantId;

    const endpoints =
      await this.endpointsService.getEndpointsByTenant(tenantId);

    return {
      success: true,
      endpoints,
    };
  }

  /**
   * User Story #300: Get endpoint with schema validation
   */
  @Get(':id/with-validation')
  @RequireClaim(TazamaClaims.EDITOR)
  async getEndpointWithValidation(
    @Param('id', ParseIntPipe) endpointId: number,
    @User() user: AuthenticatedUser,
  ): Promise<{ success: boolean; endpoint?: any; validation?: any }> {
    const tenantId = user.token.tenantId;

    const result = await this.endpointsService.getEndpointWithSchema(
      endpointId,
      tenantId,
    );

    return {
      success: result.endpoint !== null,
      endpoint: result.endpoint,
      validation: result.validation,
    };
  }

  /**
   * User Story #300: File upload with payload parsing
   */
  @Post('upload-and-parse')
  @RequireClaim(TazamaClaims.EDITOR)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFileAndParsePayload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: { contentType: string },
    @User() user: AuthenticatedUser,
  ): Promise<ParsedSchemaResponseDto> {
    const tenantId = user.token.tenantId;

    if (!file) {
      return {
        success: false,
        validation: {
          success: false,
          errors: ['No file uploaded'],
          warnings: [],
        },
      };
    }

    const parseDto: ParsePayloadDto = {
      payload: file.buffer.toString('utf-8'),
      contentType: dto.contentType as any,
      filename: file.originalname,
    };

    return await this.endpointsService.parsePayloadAndGenerateSchema(
      parseDto,
      tenantId,
    );
  }

  /**
   * User Story #300: Add constant field to endpoint schema
   */
  @Post(':id/constant-fields')
  @RequireClaim(TazamaClaims.EDITOR)
  async addConstantField(
    @Param('id', ParseIntPipe) endpointId: number,
    @Body() constantFieldDto: ConstantFieldDto,
    @User() user: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string }> {
    const tenantId = user.token.tenantId;
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';

    return await this.endpointsService.addConstantField(
      endpointId,
      constantFieldDto,
      tenantId,
      userIdentity,
    );
  }

  /**
   * User Story #300: Add formula field to endpoint schema
   */
  @Post(':id/formula-fields')
  @RequireClaim(TazamaClaims.EDITOR)
  async addFormulaField(
    @Param('id', ParseIntPipe) endpointId: number,
    @Body() formulaFieldDto: FormulaFieldDto,
    @User() user: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string }> {
    const tenantId = user.token.tenantId;
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';

    return await this.endpointsService.addFormulaField(
      endpointId,
      formulaFieldDto,
      tenantId,
      userIdentity,
    );
  }

  /**
   * User Story #300: Remove constant field from endpoint schema
   */
  @Delete(':id/constant-fields/:fieldPath')
  @RequireClaim(TazamaClaims.EDITOR)
  async removeConstantField(
    @Param('id', ParseIntPipe) endpointId: number,
    @Param('fieldPath') fieldPath: string,
    @User() user: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string }> {
    const tenantId = user.token.tenantId;
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';

    return await this.endpointsService.removeConstantField(
      endpointId,
      decodeURIComponent(fieldPath),
      tenantId,
      userIdentity,
    );
  }

  /**
   * User Story #300: Remove formula field from endpoint schema
   */
  @Delete(':id/formula-fields/:fieldPath')
  @RequireClaim(TazamaClaims.EDITOR)
  async removeFormulaField(
    @Param('id', ParseIntPipe) endpointId: number,
    @Param('fieldPath') fieldPath: string,
    @User() user: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string }> {
    const tenantId = user.token.tenantId;
    const userIdentity =
      user.token.clientId || user.token.sub || 'unknown-user';

    return await this.endpointsService.removeFormulaField(
      endpointId,
      decodeURIComponent(fieldPath),
      tenantId,
      userIdentity,
    );
  }
}
