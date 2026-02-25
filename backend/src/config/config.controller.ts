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
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from './config.service';
import { TazamaAuthGuard } from '../auth/tazama-auth.guard';
import { User } from '../auth/user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  CreateConfigDto,
  UpdateConfigDto,
  SubmitForApprovalDto,
  ApprovalDto,
  RejectionDto,
  DeploymentDto,
  StatusTransitionDto,
  WorkflowActionDto,
} from './dto';
import type {
  AddMappingDto,
  AddFunctionDto,
  ConfigResponseDto,
  Config,
} from '../config/config.interfaces';
import {
  RequireClaims,
  TazamaClaims,
  RequireAnyClaims,
} from '../auth/auth.decorator';
import type { CreateConfigDto as TcsLibCreateConfigDto } from '@tazama-lf/tcs-lib';

@Controller('config')
@UseGuards(TazamaAuthGuard)
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}
  @Get('/api/status')
  @RequireAnyClaims(
    TazamaClaims.EDITOR,
    TazamaClaims.APPROVER,
    TazamaClaims.PUBLISHER,
  )
  getConfigStatus(@User() user: AuthenticatedUser): string[] {
    return this.configService.getConfigStatus(user);
  }
  @Post('/:id/mapping')
  @RequireClaims(TazamaClaims.EDITOR)
  async addMapping(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddMappingDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return (await this.configService.addMappingViaService(
      id,
      dto as unknown as Record<string, unknown>,
      user.token.tokenString,
    )) as ConfigResponseDto;
  }
  @Delete(':id/mapping/:index')
  @RequireClaims(TazamaClaims.EDITOR)
  async removeMapping(
    @Param('id', ParseIntPipe) id: number,
    @Param('index', ParseIntPipe) index: number,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return (await this.configService.removeMappingViaService(
      id,
      index,
      user.token.tokenString,
    )) as ConfigResponseDto;
  }
  @Post()
  @RequireClaims(TazamaClaims.EDITOR)
  @HttpCode(HttpStatus.CREATED)
  async createConfig(
    @Body() dto: CreateConfigDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    const result = await this.configService.createConfig(
      dto as unknown as TcsLibCreateConfigDto,
      user,
    );

    if (!result.success) {
      throw new BadRequestException(
        result.message || 'Failed to create config',
      );
    }

    return result;
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
    return await this.configService.getConfigById(id, user);
  }

  @Put(':id')
  @RequireClaims(TazamaClaims.EDITOR)
  async updateConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConfigDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return (await this.configService.updateConfigViaWrite(
      id,
      dto as unknown as Record<string, unknown>,
      user,
    )) as ConfigResponseDto;
  }

  @Post(':id/function')
  @RequireClaims(TazamaClaims.EDITOR)
  async addFunction(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddFunctionDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return (await this.configService.addFunctionViaService(
      id,
      dto as unknown as Record<string, unknown>,
      user.token.tokenString,
    )) as ConfigResponseDto;
  }

  @Delete(':id/function/:index')
  @RequireClaims(TazamaClaims.EDITOR)
  async removeFunction(
    @Param('id', ParseIntPipe) id: number,
    @Param('index', ParseIntPipe) index: number,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return (await this.configService.removeFunctionViaService(
      id,
      index,
      user.token.tokenString,
    )) as ConfigResponseDto;
  }
  @Post(':id/workflow')
  @RequireAnyClaims(
    TazamaClaims.EDITOR,
    TazamaClaims.APPROVER,
    TazamaClaims.PUBLISHER,
    TazamaClaims.EXPORTER,
  )
  async workflow(
    @Param('id', ParseIntPipe) id: number,
    @Query('action') action: string,
    @Body()
    dto:
      | SubmitForApprovalDto
      | ApprovalDto
      | RejectionDto
      | DeploymentDto
      | StatusTransitionDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    if (!action) {
      throw new BadRequestException('Action is required as query parameter');
    }

    const normalizedAction = action.toLowerCase();
    let actionDto: WorkflowActionDto;

    switch (normalizedAction) {
      case 'submit':
        actionDto = { action: 'submit', data: dto as SubmitForApprovalDto };
        break;
      case 'approve':
        actionDto = { action: 'approve', data: dto as ApprovalDto };
        break;
      case 'reject':
        actionDto = { action: 'reject', data: dto as RejectionDto };
        break;
      case 'export':
        actionDto = { action: 'export', data: dto as StatusTransitionDto };
        break;
      case 'deploy':
        actionDto = { action: 'deploy', data: dto as DeploymentDto };
        break;
      default:
        throw new BadRequestException(`Unknown workflow action: ${action}`);
    }

    return await this.configService.handleWorkflowAction(
      id,
      actionDto,
      user,
      user.token.tokenString,
    );
  }
  @Patch('update/status/:id')
  @RequireAnyClaims(
    TazamaClaims.EDITOR,
    TazamaClaims.APPROVER,
    TazamaClaims.PUBLISHER,
  )
  async updateConfigStatus(
    @Param('id', ParseIntPipe) id: number,
    @Query('status') status: string,
    @User() user: AuthenticatedUser,
    @Headers('authorization') authorization: string,
  ): Promise<ConfigResponseDto> {
    const token = authorization.replace('Bearer ', '');
    if (!status) {
      throw new BadRequestException('Status is required as query parameter');
    }

    return await this.configService.updateConfigStatus(id, status, user, token);
  }

  @Patch(':id/publishing-status')
  @RequireAnyClaims(TazamaClaims.PUBLISHER, TazamaClaims.APPROVER)
  async updatePublishingStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { publishing_status: 'active' | 'inactive' },
    @User() user: AuthenticatedUser,
    @Headers('authorization') authorization: string,
  ): Promise<ConfigResponseDto> {
    const token = authorization.replace('Bearer ', '');
    const result = await this.configService.updatePublishingStatus(
      id,
      dto.publishing_status,
      user.tenantId,
      user,
      token,
    );
    return result;
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
    @Body() filters?: Record<string, unknown>,
  ): Promise<Config[]> {
    return await this.configService.getAllConfigs(
      parseInt(offset, 10),
      parseInt(limit, 10),
      filters ?? {},
      user,
    );
  }
}
