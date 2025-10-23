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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
  return decodedToken.preferred_username;
}

function getUserClaims(user: AuthenticatedUser): string[] {
  return user.validClaims || [];
}
@Controller('config')
@UseGuards(TazamaAuthGuard)
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}
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
    return this.configService.createConfig(
      dto,
      getTenantId(user),
      getUserId(user),
    );
  }
  @Post()
  @RequireClaims(TazamaClaims.EDITOR)
  @HttpCode(HttpStatus.CREATED)
  async createConfig(
    @Body() dto: CreateConfigDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.configService.createConfig(
      dto,
      getTenantId(user),
      getUserId(user),
    );
  }
  @Get('pending-approvals')
  @RequireClaims(TazamaClaims.APPROVER)
  async getPendingApprovals(
    @User() user: AuthenticatedUser,
  ): Promise<Config[]> {
    return this.configService.getPendingApprovals(getTenantId(user));
  }
  @Get('transaction/:type')
  @RequireClaims(TazamaClaims.EDITOR)
  async getConfigsByTransactionType(
    @Param('type') type: TransactionType,
    @User() user: AuthenticatedUser,
  ): Promise<Config[]> {
    return this.configService.getConfigsByTransactionType(
      type,
      getTenantId(user),
    );
  }
  @Get('endpoint')
  @RequireClaims(TazamaClaims.EDITOR)
  async getConfigByEndpoint(
    @Query('path') path: string,
    @Query('version') version: string,
    @User() user: AuthenticatedUser,
  ): Promise<Config> {
    const config = await this.configService.getConfigByEndpoint(
      path,
      version || 'v1',
      getTenantId(user),
    );
    if (!config) {
      throw new Error(`Config not found for path ${path} version ${version}`);
    }
    return config;
  }
  @Get(':id')
  @RequireAnyClaims(TazamaClaims.EDITOR, TazamaClaims.APPROVER)
  async getConfigById(
    @Param('id', ParseIntPipe) id: number,
    @User() user: AuthenticatedUser,
  ): Promise<Config> {
    const config = await this.configService.getConfigById(
      id,
      getTenantId(user),
    );
    if (!config) {
      throw new Error(`Config with ID ${id} not found`);
    }
    return config;
  }
  @Get()
  @RequireClaims(TazamaClaims.EDITOR)
  async getAllConfigs(@User() user: AuthenticatedUser): Promise<Config[]> {
    return this.configService.getAllConfigs(getTenantId(user));
  }
  @Put(':id')
  @RequireClaims(TazamaClaims.EDITOR)
  async updateConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConfigDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.configService.updateConfig(
      id,
      dto,
      getTenantId(user),
      getUserId(user),
    );
  }
  @Post('clone')
  @RequireClaims(TazamaClaims.EDITOR)
  async cloneConfig(
    @Body() dto: CloneConfigDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.configService.cloneConfig(
      dto,
      getTenantId(user),
      getUserId(user),
    );
  }
  @Delete(':id')
  @RequireClaims(TazamaClaims.EDITOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteConfig(
    @Param('id', ParseIntPipe) id: number,
    @User() user: AuthenticatedUser,
  ): Promise<void> {
    await this.configService.deleteConfig(
      id,
      getTenantId(user),
      getUserId(user),
    );
  }
  @Post(':id/mapping')
  @RequireClaims(TazamaClaims.EDITOR)
  async addMapping(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddMappingDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.configService.addMapping(
      id,
      dto,
      getTenantId(user),
      getUserId(user),
    );
  }
  @Delete(':id/mapping/:index')
  @RequireClaims(TazamaClaims.EDITOR)
  async removeMapping(
    @Param('id', ParseIntPipe) id: number,
    @Param('index', ParseIntPipe) index: number,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.configService.removeMapping(
      id,
      index,
      getTenantId(user),
      getUserId(user),
    );
  }

  @Post(':id/function')
  @RequireClaims(TazamaClaims.EDITOR)
  async addFunction(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddFunctionDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.configService.addFunction(
      id,
      dto,
      getTenantId(user),
      getUserId(user),
    );
  }

  @Delete(':id/function/:index')
  @RequireClaims(TazamaClaims.EDITOR)
  async removeFunction(
    @Param('id', ParseIntPipe) id: number,
    @Param('index', ParseIntPipe) index: number,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.configService.removeFunction(
      id,
      index,
      getTenantId(user),
      getUserId(user),
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
    return this.configService.updateFunction(
      id,
      index,
      dto,
      getTenantId(user),
      getUserId(user),
    );
  }

  // ======================== WORKFLOW ENDPOINTS ========================

  @Post(':id/workflow/submit')
  @RequireClaims(TazamaClaims.EDITOR)
  async submitForApproval(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitForApprovalDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.configService.submitForApproval(
      id,
      dto,
      getTenantId(user),
      getUserId(user),
      getUserClaims(user),
    );
  }

  @Patch(':id/approve')
  @RequireClaims(TazamaClaims.APPROVER)
  async approveConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApprovalDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.configService.approveConfig(
      id,
      dto,
      getTenantId(user),
      getUserId(user),
      getUserClaims(user),
    );
  }

  @Patch(':id/reject')
  @RequireClaims(TazamaClaims.APPROVER)
  async rejectConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectionDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.configService.rejectConfig(
      id,
      dto,
      getTenantId(user),
      getUserId(user),
      getUserClaims(user),
    );
  }

  @Post(':id/workflow/request-changes')
  @RequireClaims(TazamaClaims.APPROVER)
  async requestChanges(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeRequestDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.configService.requestChanges(
      id,
      dto,
      getTenantId(user),
      getUserId(user),
      getUserClaims(user),
    );
  }

  @Post(':id/workflow/deploy')
  @RequireClaims(TazamaClaims.APPROVER)
  async deployConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DeploymentDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.configService.deployConfig(
      id,
      dto,
      getTenantId(user),
      getUserId(user),
      getUserClaims(user),
    );
  }

  @Post(':id/workflow/return-to-progress')
  @RequireClaims(TazamaClaims.EDITOR)
  async returnToProgress(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StatusTransitionDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return this.configService.returnToProgress(
      id,
      dto,
      getTenantId(user),
      getUserId(user),
      getUserClaims(user),
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
    return this.configService.getWorkflowStatus(
      id,
      getTenantId(user),
      getUserClaims(user),
    );
  }

  @Get(':id/audit-history')
  @RequireAnyClaims(
    TazamaClaims.EDITOR,
    TazamaClaims.APPROVER,
    TazamaClaims.PUBLISHER,
  )
  async getAuditHistory(
    @Param('id', ParseIntPipe) id: number,
    @User() user: AuthenticatedUser,
  ): Promise<any> {
    return this.configService.getAuditHistory(id, getTenantId(user));
  }
}
