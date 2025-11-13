import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Req,
  Headers,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminServiceClient } from '../services/admin-service-client.service';
import { ConfigService } from './config.service';
import { TazamaAuthGuard } from '../auth/tazama-auth.guard';
import { User } from '../auth/user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  type CreateConfigDto,
  type UpdateConfigDto,
  type CloneConfigDto,
  type AddMappingDto,
  type AddFunctionDto,
  type ConfigResponseDto,
  type Config,
  ContentType,
  type TransactionType,
  type SubmitForApprovalDto,
  type ApprovalDto,
  type RejectionDto,
  ConfigStatus,
  type DeploymentDto,
  type StatusTransitionDto,
} from './config.interfaces';
import {
  RequireClaims,
  TazamaClaims,
  RequireAnyClaims,
} from '../auth/auth.decorator';
import { FileParsingService } from '../services/file-parsing.service';
import * as jwt from 'jsonwebtoken';
import { filter } from 'rxjs';

function getTenantId(user: AuthenticatedUser): string {
  return user.token.tenantId || 'default';
}

function decodeTokenString(tokenString: string): jwt.JwtPayload | null {
  try {
    return jwt.decode(tokenString) as jwt.JwtPayload;
  } catch {
    return null;
  }
}

function getUserId(user: AuthenticatedUser): string {
  const decodedToken = decodeTokenString(user.token.tokenString);
  if (!decodedToken) {
    return 'unknown';
  }
  const userId = decodedToken.preferred_username as string;
  return userId || 'unknown';
}

function getUserClaims(user: AuthenticatedUser): string[] {
  return user.validClaims || [];
}

function buildForwardHeaders(user: AuthenticatedUser): Record<string, string> {
  return {
    Authorization: `Bearer ${user.token.tokenString}`,
    'x-tenant-id': getTenantId(user),
    'x-user-id': getUserId(user),
    'x-user-claims': JSON.stringify(getUserClaims(user)),
  };
}

@Controller('config')
@UseGuards(TazamaAuthGuard)
export class ConfigController {
  constructor(
    private readonly adminServiceClient: AdminServiceClient,
    // private readonly fileParsingService: FileParsingService,
    private readonly configService: ConfigService,
  ) {}
  private autoDetectContentType(
    filename: string,
    content: string,
  ): ContentType {
    const lowercaseFilename = filename.toLowerCase();
    if (lowercaseFilename.endsWith('.json')) {
      return ContentType.JSON;
    }
    if (lowercaseFilename.endsWith('.xml')) {
      return ContentType.XML;
    }
    try {
      JSON.parse(content.trim());
      return ContentType.JSON;
    } catch {
      return ContentType.XML;
    }
  }

  private generateEndpointPath(
    tenantId: string,
    version: string,
    transactionType: string,
    msgFam?: string,
  ): string {
    const basePath = `/${tenantId}/${version}`;
    if (msgFam?.trim()) {
      return `${basePath}/${msgFam}/${transactionType}`;
    }
    return `${basePath}/${transactionType}`;
  }
    @Post('/:offset/:limit')
  @RequireAnyClaims(
    TazamaClaims.EDITOR,
    TazamaClaims.APPROVER,
    TazamaClaims.PUBLISHER,
    TazamaClaims.EXPORTER,
  )
  async getAllConfigs(
    @Param('offset') offset: string,
    @Param('limit') limit: string,
    @User() user: AuthenticatedUser,
    @Body() filters?: Record<string, any>,
  ): Promise<Config[]> {
    return this.adminServiceClient.forwardRequest(
      'POST',
      `/v1/admin/tcs/config/${offset}/${limit}`,
      filters,
      buildForwardHeaders(user),
    );
  }
  @Post('upload')
  @RequireClaims(TazamaClaims.EDITOR)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async createConfigFromFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('msgFam') msgFam: string,
    @Body('transactionType') transactionType: string,
    @Body('version') version: string,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const content = file.buffer.toString('utf8');
    const autoDetectedContentType = this.autoDetectContentType(
      file.originalname,
      content,
    );

    const dto: CreateConfigDto = {
      msgFam,
      transactionType,
      version,
      payload: content,
      contentType: autoDetectedContentType,
    };

    const result = await this.configService.createConfig(
      dto,
      getTenantId(user),
      getUserId(user),
      user.token.tokenString,
    );

    if (!result.success) {
      throw new BadRequestException(
        result.message || 'Failed to create config',
      );
    }

    return {
      success: true,
      message: 'Config created successfully from file',
      config: result.config,
      validation: result.validation,
    };
  }

  @Post()
  @RequireClaims(TazamaClaims.EDITOR)
  @HttpCode(HttpStatus.CREATED)
  async createConfig(
    @Body() dto: CreateConfigDto,
    @User() user: AuthenticatedUser,
    @Req() request: any,
  ): Promise<ConfigResponseDto> {
    const authHeader = request.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');

    const result = await this.configService.createConfig(
      dto,
      getTenantId(user),
      getUserId(user),
      token,
    );

    if (!result.success) {
      throw new BadRequestException(
        result.message || 'Failed to create config',
      );
    }

    return {
      success: true,
      message: 'Config created successfully',
      config: result.config,
      validation: result.validation,
    };
  }
  @Get('pending-approvals/:offset/:limit')
  @RequireClaims(TazamaClaims.APPROVER)
  async getPendingApprovals(
    @Param('offset') offset: string,
    @Param('limit') limit: string,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto[]> {
    return this.adminServiceClient.forwardRequest(
      'GET',
      `/v1/admin/tcs/config/pending-approvals/${offset}/${limit}`,
      undefined,
      buildForwardHeaders(user),
    );
  }

  @Get('transaction/:type/:offset/:limit')
  @RequireClaims(TazamaClaims.EDITOR)
  async getConfigsByTransactionType(
    @Param('type') type: TransactionType,
    @Param('offset') offset: string,
    @Param('limit') limit: string,
    @User() user: AuthenticatedUser,
  ): Promise<Config[]> {
    return this.adminServiceClient.forwardRequest(
      'GET',
      `/v1/admin/tcs/config/transaction/${type}/${offset}/${limit}`,
      undefined,
      buildForwardHeaders(user),
    );
  }

  @Get('endpoint/:path/:version/:offset/:limit')
  @RequireClaims(TazamaClaims.EDITOR)
  async getConfigByEndpoint(
    @Param('path') path: string,
    @Param('version') version: string,
    @Param('offset') offset: string,
    @Param('limit') limit: string,
    @User() user: AuthenticatedUser,
  ): Promise<Config[]> {
    const configs = await this.adminServiceClient.forwardRequest(
      'GET',
      `/v1/admin/tcs/config/endpoint/${encodeURIComponent(path)}/${encodeURIComponent(version || 'v1')}/${offset}/${limit}`,
      undefined,
      buildForwardHeaders(user),
    );
    return configs;
  }
  @Get(':id')
  @RequireAnyClaims(
    TazamaClaims.EDITOR,
    TazamaClaims.APPROVER,
    TazamaClaims.PUBLISHER,
    TazamaClaims.EXPORTER,
  )
  async getConfigById(
    @Param('id', ParseIntPipe) id: number,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    const config = await this.adminServiceClient.forwardRequest(
      'GET',
      `/v1/admin/tcs/config/${id}`,
      undefined,
      buildForwardHeaders(user),
    );
    if (!config) {
      throw new NotFoundException(`Configuration with ID ${id} not found`);
    }
    return config;
  }

  @Put(':id')
  @RequireClaims(TazamaClaims.EDITOR)
  async updateConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConfigDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.adminServiceClient.forwardRequest(
      'PUT',
      `/v1/admin/tcs/config/${id}/write`,
      dto,
      buildForwardHeaders(user),
    );
  }

  @Post('clone')
  @RequireClaims(TazamaClaims.EDITOR)
  async cloneConfig(
    @Body() dto: CloneConfigDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.adminServiceClient.forwardRequest(
      'POST',
      '/v1/admin/tcs/config/clone',
      dto,
      buildForwardHeaders(user),
    );
  }
  @Delete(':id')
  @RequireClaims(TazamaClaims.EDITOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteConfig(
    @Param('id', ParseIntPipe) id: number,
    @User() user: AuthenticatedUser,
  ): Promise<void> {
    await this.adminServiceClient.forwardRequest(
      'DELETE',
      `/v1/admin/tcs/config/${id}/write`,
      undefined,
      buildForwardHeaders(user),
    );
  }
  @Post(':id/mapping')
  @RequireClaims(TazamaClaims.EDITOR)
  async addMapping(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddMappingDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.adminServiceClient.forwardRequest(
      'POST',
      `/v1/admin/tcs/config/${id}/mapping`,
      dto,
      buildForwardHeaders(user),
    );
  }
  @Delete(':id/mapping/:index')
  @RequireClaims(TazamaClaims.EDITOR)
  async removeMapping(
    @Param('id', ParseIntPipe) id: number,
    @Param('index', ParseIntPipe) index: number,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.adminServiceClient.forwardRequest(
      'DELETE',
      `/v1/admin/tcs/config/${id}/mapping/${index}`,
      undefined,
      buildForwardHeaders(user),
    );
  }

  @Post(':id/function')
  @RequireClaims(TazamaClaims.EDITOR)
  async addFunction(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddFunctionDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.adminServiceClient.forwardRequest(
      'POST',
      `/v1/admin/tcs/config/${id}/function`,
      dto,
      buildForwardHeaders(user),
    );
  }

  @Delete(':id/function/:index')
  @RequireClaims(TazamaClaims.EDITOR)
  async removeFunction(
    @Param('id', ParseIntPipe) id: number,
    @Param('index', ParseIntPipe) index: number,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.adminServiceClient.forwardRequest(
      'DELETE',
      `/v1/admin/tcs/config/${id}/function/${index}`,
      undefined,
      buildForwardHeaders(user),
    );
  }

  @Put(':id/function/:index')
  @RequireClaims(TazamaClaims.EDITOR)
  async updateFunction(
    @Param('id', ParseIntPipe) id: number,
    @Param('index', ParseIntPipe) index: number,
    @Body() dto: AddFunctionDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.adminServiceClient.forwardRequest(
      'PUT',
      `/v1/admin/tcs/config/${id}/function/${index}`,
      dto,
      buildForwardHeaders(user),
    );
  }

  @Post(':id/workflow/submit')
  @RequireClaims(TazamaClaims.EDITOR)
  async submitForApproval(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitForApprovalDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.adminServiceClient.forwardRequest(
      'POST',
      `/v1/admin/tcs/config/${id}/workflow/submit`,
      dto,
      buildForwardHeaders(user),
    );
  }

  @Post(':id/workflow/approve')
  @RequireClaims(TazamaClaims.APPROVER)
  async approveConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApprovalDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.adminServiceClient.forwardRequest(
      'POST',
      `/v1/admin/tcs/config/${id}/workflow/approve`,
      dto,
      buildForwardHeaders(user),
    );
  }

  @Patch(':id/approve')
  @RequireClaims(TazamaClaims.APPROVER)
  async approveConfigLegacy(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApprovalDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.adminServiceClient.forwardRequest(
      'POST',
      `/v1/admin/tcs/config/${id}/workflow/approve`,
      dto,
      buildForwardHeaders(user),
    );
  }

  @Patch(':id/reject')
  @RequireClaims(TazamaClaims.APPROVER)
  async rejectConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectionDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.adminServiceClient.forwardRequest(
      'POST',
      `/v1/admin/tcs/config/${id}/workflow/reject`,
      dto,
      buildForwardHeaders(user),
    );
  }

  @Post(':id/update-status-to-exported')
  @RequireClaims(TazamaClaims.EXPORTER)
  async updateStatusToExported(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StatusTransitionDto,
    @User() user: AuthenticatedUser,
    @Headers('authorization') authorization?: string,
  ): Promise<ConfigResponseDto> {
    const token = authorization?.replace('Bearer ', '') || '';
    return this.configService.updateStatusToExported(
      id,
      dto,
      getTenantId(user),
      getUserId(user),
      getUserClaims(user),
      token,
    );
  }

  @Post(':id/workflow/export')
  @RequireClaims(TazamaClaims.EXPORTER)
  async exportConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StatusTransitionDto,
    @User() user: AuthenticatedUser,
    @Headers('authorization') authorization?: string,
  ): Promise<ConfigResponseDto> {
    const token = authorization?.replace('Bearer ', '') || '';
     await this.adminServiceClient.forwardRequest(
      'POST',
      `/v1/admin/tcs/config/${id}/workflow/export`,
      dto,
      buildForwardHeaders(user),
    );

     return this.configService.exportConfig(
      id,
      dto,
      getTenantId(user),
      getUserId(user),
      getUserClaims(user),
      token,
    );


  }

  @Post(':id/workflow/deploy')
  @RequireClaims(TazamaClaims.PUBLISHER)
  async deployConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DeploymentDto,
    @User() user: AuthenticatedUser,
    @Headers('authorization') authorization?: string,
  ): Promise<ConfigResponseDto> {
    const token = authorization?.replace('Bearer ', '') || '';    
    // await this.configService.deployConfig(
    //   id,
    //   dto,
    //   getTenantId(user),
    //   getUserId(user),
    //   getUserClaims(user),
    //   token,
    // );

    return await this.adminServiceClient.forwardRequest(
      'POST',
      `/v1/admin/tcs/config/${id}/workflow/export`,
      dto,
      buildForwardHeaders(user),
    );
  }

  @Post(':id/workflow/return-to-progress')
  @RequireClaims(TazamaClaims.EDITOR)
  async returnToProgress(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StatusTransitionDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.adminServiceClient.forwardRequest(
      'POST',
      `/v1/admin/tcs/config/${id}/workflow/return-to-progress`,
      dto,
      buildForwardHeaders(user),
    );
  }

  @Get(':id/workflow/status')
  @RequireAnyClaims(
    TazamaClaims.EDITOR,
    TazamaClaims.APPROVER,
    TazamaClaims.PUBLISHER,
  )
  async getWorkflowStatus(
    @Param('id', ParseIntPipe) id: number,
    @User() user: AuthenticatedUser,
  ): Promise<any> {
    return this.adminServiceClient.forwardRequest(
      'GET',
      `/v1/admin/tcs/config/${id}/workflow/status`,
      undefined,
      buildForwardHeaders(user),
    );
  }

  @Get(':id/audit-history')
  @RequireAnyClaims(
    TazamaClaims.EDITOR,
    TazamaClaims.APPROVER,
    TazamaClaims.PUBLISHER,
    TazamaClaims.EXPORTER,
  )
  async getAuditHistory(
    @Param('id', ParseIntPipe) id: number,
    @User() user: AuthenticatedUser,
  ): Promise<any> {
    return this.adminServiceClient.forwardRequest(
      'GET',
      `/v1/admin/tcs/config/${id}/audit-history`,
      undefined,
      buildForwardHeaders(user),
    );
  }
  @Patch('/update/status/:id')
  @RequireAnyClaims(TazamaClaims.EXPORTER, TazamaClaims.PUBLISHER)
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Query('status') status: ConfigStatus,
    @User() user: AuthenticatedUser,
  ): Promise<any> {
    return this.adminServiceClient.forwardRequest(
      'PATCH',
      `/v1/admin/tcs/config/${id}/status`,
      { status },
      buildForwardHeaders(user),
    );
  }

  @Patch(':id/publishing-status')
  @RequireAnyClaims(TazamaClaims.PUBLISHER)
  async updatePublishingStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { publishing_status: 'active' | 'inactive' },
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    console.log('Updating publishing status:', {id});
    return this.configService.updatePublishingStatus(
      id,
      dto.publishing_status,
      user.tenantId,
      user.userId,
      user.token.tokenString,
    );
  }
}
