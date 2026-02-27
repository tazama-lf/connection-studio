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
import {
  ConfigType,
  ISuccess,
  Job,
  JobStatus,
  JobSummary,
  PaginatedResult,
  PullJobHistory,
  ScheduleStatus,
} from '@tazama-lf/tcs-lib';
import { plainToInstance } from 'class-transformer';
import type { AuthenticatedUser } from 'src/auth/auth.types';
import { TazamaAuthGuard } from 'src/auth/tazama-auth.guard';
import { User } from 'src/auth/user.decorator';
import {
  RequireAnyClaims,
  RequireEditorRole,
  TazamaClaims,
} from '../auth/auth.decorator';
import { CreatePullJobDto } from './dto/create-pull-job.dto';
import { CreatePushJobDto } from './dto/create-push-job.dto';
import { PullJobResponseDto } from './dto/fetch-pull-job.dto';
import { PushJob } from './dto/push-job.dto';
import { UpdatePullJobDto } from './dto/update-pull-job.dto';
import { UpdatePushJobDto } from './dto/update-push-job.dto';
import { JobService } from './job.service';

@Controller('job')
@UseGuards(TazamaAuthGuard)
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post('/create/push')
  @RequireAnyClaims(TazamaClaims.EDITOR)
  async createPushJob(
    @Body() job: CreatePushJobDto,
    @User() user: AuthenticatedUser,
  ): Promise<ISuccess> {
    return await this.jobService.createPush(job, user);
  }

  @Post('/create/pull')
  @RequireAnyClaims(TazamaClaims.EDITOR)
  async createPullJob(
    @Body() job: CreatePullJobDto,
    @User() user: AuthenticatedUser,
  ): Promise<ISuccess> {
    return await this.jobService.createPull(job, user);
  }

  @Patch('/update/:id')
  @RequireEditorRole()
  async updateJob(
    @Param('id') id: string,
    @Body() job: UpdatePushJobDto | UpdatePullJobDto,
    @Query('type') type: ConfigType,
    @User() user: AuthenticatedUser,
  ): Promise<ISuccess> {
    return await this.jobService.updateJob(id, job, type, user);
  }

  @Post('/all')
  @RequireAnyClaims(
    TazamaClaims.EDITOR,
    TazamaClaims.APPROVER,
    TazamaClaims.EXPORTER,
    TazamaClaims.PUBLISHER,
  )
  async getAllJobs(
    @Query('offset') offset: string,
    @Query('limit') limit: string,
    @User() user: AuthenticatedUser,
    @Body() filters?: Record<string, unknown>,
  ): Promise<PaginatedResult<Job>> {
    return await this.jobService.findAll(offset, limit, user, filters);
  }

  @Post('/history')
  @RequireAnyClaims(TazamaClaims.PUBLISHER)
  async getAllHistory(
    @Query('offset') offset: string,
    @Query('limit') limit: string,
    @User() user: AuthenticatedUser,
    @Body() filters?: Record<string, unknown>,
  ): Promise<PaginatedResult<PullJobHistory>> {
    return await this.jobService.findAllHistory(offset, limit, user, filters);
  }

  @Get('/:id')
  @RequireAnyClaims(
    TazamaClaims.EDITOR,
    TazamaClaims.APPROVER,
    TazamaClaims.EXPORTER,
    TazamaClaims.PUBLISHER,
  )
  async getJobById(
    @Param('id') id: string,
    @Query('type') type: ConfigType,
    @User() user: AuthenticatedUser,
  ): Promise<PullJobResponseDto | PushJob> {
    const record = await this.jobService.findOne(id, type, user);
    if (type === ConfigType.PULL) {
      return plainToInstance(PullJobResponseDto, record, {
        excludeExtraneousValues: true,
      });
    }

    return plainToInstance(PushJob, record, { excludeExtraneousValues: true });
  }

  @Get('/get/status')
  @RequireAnyClaims(
    TazamaClaims.EDITOR,
    TazamaClaims.APPROVER,
    TazamaClaims.EXPORTER,
    TazamaClaims.PUBLISHER,
  )
  async getJobByStatus(
    @Query('status') status: JobStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @User() user: AuthenticatedUser,
  ): Promise<JobSummary[]> {
    return await this.jobService.findByStatus(status, page, limit, user);
  }

  @Patch('/update/status/:id')
  @RequireAnyClaims(
    TazamaClaims.EDITOR,
    TazamaClaims.APPROVER,
    TazamaClaims.EXPORTER,
    TazamaClaims.PUBLISHER,
  )
  async updateJobStatus(
    @Param('id') id: string,
    @Query('status') status: JobStatus,
    @Query('type') type: ConfigType,
    @User() user: AuthenticatedUser,
    @Body('reason') reason?: string,
  ): Promise<ISuccess> {
    return await this.jobService.updateStatus(id, status, type, user, reason);
  }

  @Patch('/update/activation/:id')
  @RequireAnyClaims(TazamaClaims.PUBLISHER)
  async updateJobActivation(
    @Param('id') id: string,
    @Query('status') status: ScheduleStatus,
    @Query('type') type: ConfigType,
    @User() user: AuthenticatedUser,
  ): Promise<ISuccess> {
    return await this.jobService.updateActivation(id, status, type, user);
  }
}
