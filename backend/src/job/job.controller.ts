import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigType, JobStatus, ScheduleStatus } from '@tazama-lf/tcs-lib';
import { RequireAnyClaims, RequireEditorRole, TazamaClaims } from '../auth/auth.decorator';
import { CreatePullJobDto } from './dto/create-pull-job.dto';
import { CreatePushJobDto } from './dto/create-push-job.dto';
import { JobService } from './job.service';
import { TazamaAuthGuard } from 'src/auth/tazama-auth.guard';
import { type AuthenticatedUser } from 'src/auth/auth.types';
import { User } from 'src/auth/user.decorator';

@Controller('job')
@UseGuards(TazamaAuthGuard)
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post('/create/push')
  @RequireAnyClaims(TazamaClaims.EDITOR)
  async createPushJob(@Body() job: CreatePushJobDto,@User() user: AuthenticatedUser) {
    return await this.jobService.createPush(job, user.tenantId);
  }

  @Post('/create/pull')
  @RequireAnyClaims(TazamaClaims.EDITOR)
  async createPullJob(@Body() job: CreatePullJobDto,@User() user: AuthenticatedUser) {
    return await this.jobService.createPull(job, user.tenantId);
  }

  @Get('/all')
  @RequireAnyClaims(TazamaClaims.EDITOR, TazamaClaims.APPROVER, TazamaClaims.EXPORTER, TazamaClaims.PUBLISHER)
  async getAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @User() user: AuthenticatedUser
  ) {
    return this.jobService.findAll(page, limit, user.tenantId);
  }

  @Get('/:id')
  @RequireAnyClaims(TazamaClaims.EDITOR, TazamaClaims.APPROVER, TazamaClaims.EXPORTER, TazamaClaims.PUBLISHER)
  async getById(@Param('id') id: string, @Query('type') type: ConfigType) {
    return await this.jobService.findOne(id, type);
  }

  @Get('/get/status')
  @RequireAnyClaims(TazamaClaims.EDITOR, TazamaClaims.APPROVER, TazamaClaims.EXPORTER, TazamaClaims.PUBLISHER)
  async getByStatus(
    @Query('status') status: JobStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return await this.jobService.findByStatus(status, page, limit);
  }

  @Patch('/update/status/:id')
  @RequireAnyClaims(TazamaClaims.EDITOR, TazamaClaims.APPROVER, TazamaClaims.EXPORTER, TazamaClaims.PUBLISHER)
  async updateStatus(
    @Param('id') id: string,
    @Query('status') status: JobStatus,
    @Query('type') type: ConfigType,
    @User() user: AuthenticatedUser
  ) {
    return await this.jobService.updateStatus(
      id,
      status,
      type,
      user.tenantId
    );
  }

  @Patch('/update/activation/:id')
  @RequireAnyClaims(TazamaClaims.EDITOR)
  async update(
    @Param('id') id: string,
    @Query('status') status: ScheduleStatus,
    @Query('type') type: ConfigType,
  ) {
    return await this.jobService.updateActivation(
      id,
      status,
      type === ConfigType.PUSH ? 'endpoints' : 'job',
    );
  }
}
