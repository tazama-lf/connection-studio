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
  type ChangeRequestDto,
  type DeploymentDto,
  type StatusTransitionDto,
} from './config.interfaces';
import {
  RequireClaims,
  TazamaClaims,
  RequireAnyClaims,
} from '../auth/auth.decorator';
import { FileParsingService } from '../services/file-parsing.service';
function getTenantId(user: AuthenticatedUser): string {
  return user.token.tenantId || 'default';
}
function decodeTokenString(tokenString: string): any {
  try {
    const jwt = require('jsonwebtoken');
    return jwt.decode(tokenString);
  } catch {
    return null;
  }
}
function getUserId(user: AuthenticatedUser): string {
  const decodedToken = decodeTokenString(user.token.tokenString);
  const userId = decodedToken.preferred_username;
  
  // ✅ LOG: Extract email from JWT in Connection Studio Controller
  Logger.log(`📧 [ConfigController] Extracted user ID (email) from JWT:`);
  Logger.log(`   - preferred_username: ${decodedToken.preferred_username || 'N/A'}`);
  Logger.log(`   - email field: ${decodedToken.email || 'N/A'}`);
  Logger.log(`   - Final userId: ${userId || 'NOT FOUND'}`);
  Logger.log(`   - sub: ${decodedToken.sub || 'N/A'}`);
  Logger.log(`   - clientId: ${decodedToken.clientId || 'N/A'}`);
  
  return userId;
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
    private readonly fileParsingService: FileParsingService,
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
      throw new Error('No file uploaded');
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
      throw new Error(result.message || 'Failed to create config');
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
      throw new Error(result.message || 'Failed to create config');
    }

    return {
      success: true,
      message: 'Config created successfully',
      config: result.config,
      validation: result.validation,
    };
  }
  @Get('pending-approvals')
  @RequireClaims(TazamaClaims.APPROVER)
  async getPendingApprovals(
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto[]> {
    return this.adminServiceClient.forwardRequest(
      'GET',
      '/v1/admin/tcs/config/pending-approvals',
      undefined,
      buildForwardHeaders(user),
    );
  }
  @Get('transaction/:type')
  @RequireClaims(TazamaClaims.EDITOR)
  async getConfigsByTransactionType(
    @Param('type') type: TransactionType,
    @User() user: AuthenticatedUser,
  ): Promise<Config[]> {
    return this.adminServiceClient.forwardRequest(
      'GET',
      `/v1/admin/tcs/config/transaction/${type}`,
      undefined,
      buildForwardHeaders(user),
    );
  }
  @Get('endpoint')
  @RequireClaims(TazamaClaims.EDITOR)
  async getConfigByEndpoint(
    @Query('path') path: string,
    @Query('version') version: string,
    @User() user: AuthenticatedUser,
  ): Promise<Config> {
    const config = await this.adminServiceClient.forwardRequest(
      'GET',
      `/v1/admin/tcs/config/endpoint?path=${encodeURIComponent(path)}&version=${encodeURIComponent(version || 'v1')}`,
      undefined,
      buildForwardHeaders(user),
    );
    if (!config) {
      throw new Error(`Config not found for path ${path} version ${version}`);
    }
    return config;
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
      throw new Error(`Configuration with ID ${id} not found`);
    }
    return config;
  }
  @Get()
  @RequireAnyClaims(
    TazamaClaims.EDITOR,
    TazamaClaims.APPROVER,
    TazamaClaims.PUBLISHER,
    TazamaClaims.EXPORTER,
  )
  async getAllConfigs(@User() user: AuthenticatedUser): Promise<Config[]> {
    return this.adminServiceClient.forwardRequest(
      'GET',
      '/v1/admin/tcs/config',
      undefined,
      buildForwardHeaders(user),
    );
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

  @Patch(':id/approve')
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

  @Post(':id/workflow/request-changes')
  @RequireClaims(TazamaClaims.APPROVER)
  async requestChanges(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeRequestDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.adminServiceClient.forwardRequest(
      'POST',
      `/v1/admin/tcs/config/${id}/workflow/request-changes`,
      dto,
      buildForwardHeaders(user),
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
    return this.configService.deployConfig(
      id,
      dto,
      getTenantId(user),
      getUserId(user),
      getUserClaims(user),
      token,
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
}
