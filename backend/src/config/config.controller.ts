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
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminServiceClient } from '../services/admin-service-client.service';
import { ConfigService } from './config.service';
import { NotificationService } from '../notification/notification.service';
import { TazamaAuthGuard } from '../auth/tazama-auth.guard';
import { User } from '../auth/user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CreateConfigDto, UpdateConfigDto } from '../dto/config/dto';
import {
  type CloneConfigDto,
  type AddMappingDto,
  type AddFunctionDto,
  type ConfigResponseDto,
  type Config,
  ContentType,
  type SubmitForApprovalDto,
  type ApprovalDto,
  type RejectionDto,
  ConfigStatus,
  type DeploymentDto,
  type StatusTransitionDto,
} from '../config/config.interfaces';
import {
  RequireClaims,
  TazamaClaims,
  RequireAnyClaims,
} from '../auth/auth.decorator';
import * as jwt from 'jsonwebtoken';
interface DecodedUserInfo {
  preferredUsername: string;
  realmRoles: string[];
  tenantDetails: string[];
}

function getTenantId(user: AuthenticatedUser): string {
  const tenantId = user.token.tenantId || user.tenantId;
  if (!tenantId) {
    throw new Error('Tenant ID not found in user token or claims');
  }
  return tenantId;
}

function decodeTokenString(tokenString: string): jwt.JwtPayload | null {
  try {
    return jwt.decode(tokenString) as jwt.JwtPayload;
  } catch {
    return null;
  }
}

export function decodeValidatedToken(user: AuthenticatedUser): DecodedUserInfo {
  let decoded = decodeTokenString(user.token.tokenString);

  if (!decoded) {
    throw new Error('Invalid token: unable to decode');
  }

  if (decoded.tokenString && typeof decoded.tokenString === 'string') {
    const innerDecoded = decodeTokenString(decoded.tokenString);
    if (innerDecoded) {
      decoded = innerDecoded;
    }
  }

  if (!decoded.preferred_username) {
    throw new Error(
      `Invalid token: preferred_username missing. Available keys: ${Object.keys(decoded).join(', ')}`,
    );
  }

  if (!decoded.realm_access || !Array.isArray(decoded.realm_access.roles)) {
    throw new Error('Invalid token: realm_access.roles missing or invalid');
  }

  if (!Array.isArray(decoded.tenant_details)) {
    throw new Error('Invalid token: tenant_details missing or invalid');
  }

  return {
    preferredUsername: decoded.preferred_username,
    realmRoles: decoded.realm_access.roles,
    tenantDetails: decoded.tenant_details,
  };
}

function getUserClaims(user: AuthenticatedUser): string[] {
  return user.validClaims || [];
}

function getTokenString(user: AuthenticatedUser): string {
  return user.token.tokenString;
}

function buildForwardHeaders(user: AuthenticatedUser): Record<string, string> {
  return {
    Authorization: `Bearer ${getTokenString(user)}`,
    'x-tenant-id': getTenantId(user),
    'x-user-id': decodeValidatedToken(user).preferredUsername,
    'x-user-claims': JSON.stringify(getUserClaims(user)),
  };
}

@Controller('config')
@UseGuards(TazamaAuthGuard)
export class ConfigController {
  constructor(
    private readonly adminServiceClient: AdminServiceClient,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
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

  private async sendWorkflowNotification(
    event:
      | 'editor_submit'
      | 'approver_approve'
      | 'exporter_export'
      | 'publisher_deploy'
      | 'publisher_activate'
      | 'publisher_deactivate',
    configId: number,
    user: AuthenticatedUser,
    config: Config,
    authToken: string,
    comment?: string,
  ): Promise<void> {
    const decodedToken = decodeValidatedToken(user);
    const groupName =
      decodedToken.tenantDetails.length > 0
        ? decodedToken.tenantDetails[0].replace(/\//g, '')
        : null;

    if (!groupName) {
      throw new Error('Group name not found in tenant details');
    }

    await this.notificationService.sendGenericWorkflowNotification({
      event,
      configId,
      tenantId: getTenantId(user),
      actorEmail: decodedToken.preferredUsername,
      actorName: decodedToken.preferredUsername,
      config,
      authToken: authToken,
      groupName: groupName,
      comment,
    });
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

    // const validTransactionTypes = Object.values(TransactionType);
    // if (!validTransactionTypes.includes(transactionType as TransactionType)) {
    //   throw new BadRequestException(
    //     `Invalid transactionType. Must be one of: ${validTransactionTypes.join(', ')}`,
    //   );
    // }

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
      decodeValidatedToken(user).preferredUsername,
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
      decodeValidatedToken(user).preferredUsername,
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
    @Param('type') type: string,
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
    @Headers('authorization') authorization: string,
  ): Promise<ConfigResponseDto> {
    const authToken = authorization?.split(' ')[1] as string;
    const result = await this.adminServiceClient.forwardRequest(
      'POST',
      `/v1/admin/tcs/config/${id}/workflow/submit`,
      dto,
      buildForwardHeaders(user),
    );

    console.log(' Result after submit for approval ', result);
    if (result?.success) {
      const config = result.config || result.data || {};
      await this.sendWorkflowNotification(
        'editor_submit',
        id,
        user,
        config,
        authToken,
        dto.comment,
      );
    }

    return result;
  }

  @Post(':id/workflow/approve')
  @RequireClaims(TazamaClaims.APPROVER)
  async approveConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApprovalDto,
    @User() user: AuthenticatedUser,
    @Headers('authorization') authorization: string,
  ): Promise<ConfigResponseDto> {
    const authToken = authorization?.split(' ')[1];

    const result = await this.adminServiceClient.forwardRequest(
      'POST',
      `/v1/admin/tcs/config/${id}/workflow/approve`,
      dto,
      buildForwardHeaders(user),
    );

    if (result?.success) {
      const config = result.config || result.data || {};
      await this.sendWorkflowNotification(
        'approver_approve',
        id,
        user,
        config,
        authToken,
        dto.comment,
      );
    }

    return result;
  }

  /**
   * @deprecated Use POST /config/:id/workflow/approve instead
   */
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
    const token = authorization?.replace('Bearer ', '') || getTokenString(user);
    return this.configService.updateStatusToExported(
      id,
      dto,
      getTenantId(user),
      decodeValidatedToken(user).preferredUsername,
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
    @Headers('authorization') authorization: string,
  ): Promise<ConfigResponseDto> {
    const token = authorization?.replace('Bearer ', '') as string;

    await this.configService.exportConfig(
      id,
      dto,
      getTenantId(user),
      decodeValidatedToken(user).preferredUsername,
      getUserClaims(user),
      token,
    );

    const result = await this.adminServiceClient.forwardRequest(
      'POST',
      `/v1/admin/tcs/config/${id}/workflow/export`,
      dto,
      buildForwardHeaders(user),
    );

    if (result?.success) {
      const config = result.config || result.data || {};
      await this.sendWorkflowNotification(
        'exporter_export',
        id,
        user,
        config,
        token,
        dto.comment,
      );
    }

    return result;
  }

  @Post(':id/workflow/deploy')
  @RequireClaims(TazamaClaims.PUBLISHER)
  async deployConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DeploymentDto,
    @User() user: AuthenticatedUser,
    @Headers('authorization') authorization: string,
  ): Promise<ConfigResponseDto> {
    const token = authorization?.replace('Bearer ', '') as string;

    await this.configService.deployConfig(
      id,
      dto,
      getTenantId(user),
      decodeValidatedToken(user).preferredUsername,
      getUserClaims(user),
      token,
    );

    const result = await this.adminServiceClient.forwardRequest(
      'POST',
      `/v1/admin/tcs/config/${id}/workflow/deploy`,
      dto,
      buildForwardHeaders(user),
    );

    if (result?.success) {
      const config = result.config || result.data || {};
      await this.sendWorkflowNotification(
        'publisher_deploy',
        id,
        user,
        config,
        token,
        dto.comment,
      );
    }

    return result;
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
    @Headers('authorization') authorization: string,
  ): Promise<ConfigResponseDto> {
    const token = authorization?.replace('Bearer ', '') as string;
    const result = await this.configService.updatePublishingStatus(
      id,
      dto.publishing_status,
      getTenantId(user),
      decodeValidatedToken(user).preferredUsername,
      getTokenString(user),
    );

    if (result?.success) {
      const config = result.config as Config;
      await this.sendWorkflowNotification(
        dto.publishing_status === 'active'
          ? 'publisher_activate'
          : 'publisher_deactivate',
        id,
        user,
        config,
        token,
        `Publishing status changed to ${dto.publishing_status}`,
      );
    }

    return result;
  }
}
