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
import { RequireAnyClaims, RequireEditorRole } from '../auth/auth.decorator';
import { CreatePullJobDto } from './dto/create-pull-job.dto';
import { CreatePushJobDto } from './dto/create-push-job.dto';
import { JobService } from './job.service';
import { TazamaAuthGuard } from 'src/auth/tazama-auth.guard';
import { type AuthenticatedUser } from 'src/auth/auth.types';

@Controller('job')
@UseGuards(TazamaAuthGuard)
export class JobController {
  constructor(private readonly jobService: JobService) { }

  @Post('/create/push')
  @RequireEditorRole()
  async createPushJob(@Body() job: CreatePushJobDto, user: AuthenticatedUser) {
    return await this.jobService.createPush(job, user.tenantId);
  }

  @Post('/create/pull')
  @RequireEditorRole()
  async createPullJob(@Body() job: CreatePullJobDto, user: AuthenticatedUser) {
    return await this.jobService.createPull(job, user.tenantId);
  }

  @Get('/all')
  @RequireAnyClaims()
  async getAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    user: AuthenticatedUser
  ) {
    return this.jobService.findAll(page, limit, user.tenantId);
  }

  @Get('/:id')
  @RequireAnyClaims()
  async getById(@Param('id') id: string, @Query('type') type: ConfigType) {
    return await this.jobService.findOne(id, type);
  }

  @Get('/get/status')
  @RequireAnyClaims()
  async getByStatus(
    @Query('status') status: JobStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return await this.jobService.findByStatus(status, page, limit);
  }

  @Patch('/update/status/:id')
  @RequireAnyClaims()
  async updateStatus(
    @Param('id') id: string,
    @Query('status') status: JobStatus,
    @Query('type') type: ConfigType,
    user: AuthenticatedUser
  ) {
    return await this.jobService.updateStatus(
      id,
      status,
      type,
      user.tenantId
    );
  }

  @Patch('/update/activation/:id')
  @RequireEditorRole()
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
