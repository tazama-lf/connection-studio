import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from './config.service';
// import { NotificationService } from '../notification/notification.service';
import { TazamaAuthGuard } from '../auth/tazama-auth.guard';
import { User } from '../auth/user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CreateConfigDto, UpdateConfigDto } from '../dto/config/dto';
import {
  type AddMappingDto,
  type AddFunctionDto,
  type ConfigResponseDto,
  type Config,
  type SubmitForApprovalDto,
  type ApprovalDto,
  type RejectionDto,
  type DeploymentDto,
  type StatusTransitionDto,
} from '../config/config.interfaces';
import {
  RequireClaims,
  TazamaClaims,
  RequireAnyClaims,
} from '../auth/auth.decorator';
import { EventType } from 'src/enums/events.enum';

@Controller('config')
@UseGuards(TazamaAuthGuard)
export class ConfigController {
  constructor(
    private readonly configService: ConfigService,
    // private readonly notificationService: NotificationService,
  ) {}

  @Post('/:id/mapping')
  @RequireClaims(TazamaClaims.EDITOR)
  async addMapping(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddMappingDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return await this.configService.addMappingViaService(
      id,
      dto,
      user.token.tokenString,
    );
  }
  @Delete(':id/mapping/:index')
  @RequireClaims(TazamaClaims.EDITOR)
  async removeMapping(
    @Param('id', ParseIntPipe) id: number,
    @Param('index', ParseIntPipe) index: number,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return await this.configService.removeMappingViaService(
      id,
      index,
      user.token.tokenString,
    );
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
      user.tenantId,
      user.userId,
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
  // @Get('pending-approvals/:offset/:limit')
  // @RequireClaims(TazamaClaims.APPROVER)
  // async getPendingApprovals(
  //   @Param('offset') offset: string,
  //   @Param('limit') limit: string,
  //   @User() user: AuthenticatedUser,
  // ): Promise<ConfigResponseDto[]> {
  //   return await this.configService.getPendingApprovals(
  //     parseInt(offset),
  //     parseInt(limit),
  //     user.token.tokenString,
  //   );
  // }

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
    return await this.configService.getConfigById(
      id,
      user.tenantId,
      user.token.tokenString,
    );
  }

  @Put(':id')
  @RequireClaims(TazamaClaims.EDITOR)
  async updateConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConfigDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return await this.configService.updateConfigViaWrite(
      id,
      dto,
      user.token.tokenString,
    );
  }

  @Post(':id/function')
  @RequireClaims(TazamaClaims.EDITOR)
  async addFunction(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddFunctionDto,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return await this.configService.addFunctionViaService(
      id,
      dto,
      user.token.tokenString,
    );
  }

  @Delete(':id/function/:index')
  @RequireClaims(TazamaClaims.EDITOR)
  async removeFunction(
    @Param('id', ParseIntPipe) id: number,
    @Param('index', ParseIntPipe) index: number,
    @User() user: AuthenticatedUser,
  ): Promise<ConfigResponseDto> {
    return await this.configService.removeFunctionViaService(
      id,
      index,
      user.token.tokenString,
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
    return await this.configService.updateFunctionViaService(
      id,
      index,
      dto,
      user.token.tokenString,
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
    const token = authorization?.replace('Bearer ', '');

    const result = await this.configService.submitConfig(id, dto, user, token);

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
    const token = authorization?.replace('Bearer ', '');

    const result = await this.configService.approveConfig(id, dto, user, token);
    return result;
  }

  @Post(':id/workflow/export')
  @RequireClaims(TazamaClaims.EXPORTER)
  async exportConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StatusTransitionDto,
    @User() user: AuthenticatedUser,
    @Headers('authorization') authorization: string,
  ): Promise<ConfigResponseDto> {
    const token = authorization?.replace('Bearer ', '');

    const result = await this.configService.exportConfig(id, dto, user, token);

    // const result = await this.adminServiceClient.forwardRequest(
    //   'POST',
    //   `/v1/admin/tcs/config/${id}/workflow/export`,
    //   dto,
    //   buildForwardHeaders(user),
    // );

    // if (result.success) {
    //   const config = result.config!;
    //   await this.notificationService.sendWorkflowNotification(
    //     EventType.ExporterExport,
    //     user,
    //     config,
    //     token,
    //     dto.comment,
    //   );
    // }

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
    const token = authorization?.replace('Bearer ', '');

    const result = await this.configService.deployConfig(
      id,
      dto,
      user,
      user.tenantId,
      user.userId,
      token,
    );

    // const result = await this.adminServiceClient.forwardRequest(
    //   'POST',
    //   `/v1/admin/tcs/config/${id}/workflow/deploy`,
    //   dto,
    //   buildForwardHeaders(user),
    // );

    // if (result?.success) {
    //   const config = result.config!;
    //   await this.notificationService.sendWorkflowNotification(
    //     EventType.PublisherDeploy,
    //     user,
    //     config,
    //     token,
    //     dto.comment,
    //   );
    // }

    return result;
  }

  @Patch(':id/publishing-status')
  @RequireAnyClaims(TazamaClaims.PUBLISHER)
  async updatePublishingStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { publishing_status: 'active' | 'inactive' },
    @User() user: AuthenticatedUser,
    @Headers('authorization') authorization: string,
  ): Promise<ConfigResponseDto> {
    const token = authorization?.replace('Bearer ', '');
    const result = await this.configService.updatePublishingStatus(
      id,
      dto.publishing_status,
      user.tenantId,
      user,
      token,
    );

    // if (result?.success) {
    //   const config = result.config!;
    //   await this.notificationService.sendWorkflowNotification(
    //     dto.publishing_status === 'active'
    //       ? EventType.PublisherActivate
    //       : EventType.PublisherDeactivate,
    //     user,
    //     config,
    //     token,
    //     `Publishing status changed to ${dto.publishing_status}`,
    //   );
    // }

    return result;
  }
  @Post(':id/reject')
  @RequireClaims(TazamaClaims.APPROVER)
  async rejectConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectionDto,
    @User() user: AuthenticatedUser,
    @Headers('authorization') authorization: string,
  ): Promise<ConfigResponseDto> {
    const token = authorization?.replace('Bearer ', '');

    const result = await this.configService.rejectConfig(id, dto, user, token);

    return result;
  }
  @Delete(':id')
  @RequireClaims(TazamaClaims.EDITOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteConfig(
    @Param('id', ParseIntPipe) id: number,
    @User() user: AuthenticatedUser,
  ): Promise<void> {
    await this.configService.deleteConfigViaWrite(id, user.token.tokenString);
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
    return await this.configService.getAllConfigs(
      parseInt(offset),
      parseInt(limit),
      filters || {},
      user.token.tokenString,
    );
  }
}
