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
  ISuccess,
  JobStatus,
  PaginatedResult,
  Schedule,
} from '@tazama-lf/tcs-lib';
import { RequireAnyClaims, TazamaClaims } from 'src/auth/auth.decorator';
import type { AuthenticatedUser } from 'src/auth/auth.types';
import { TazamaAuthGuard } from 'src/auth/tazama-auth.guard';
import { User } from 'src/auth/user.decorator';
import { CreateScheduleJobDto } from './dto/create-schedule.dto';
import { UpdateScheduleJobDto } from './dto/update-schedule-dto';
import { SchedulerService } from './scheduler.service';

@Controller('scheduler')
@UseGuards(TazamaAuthGuard)
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Post('/create')
  @RequireAnyClaims(TazamaClaims.EDITOR)
  async createJob(
    @Body() schedule: CreateScheduleJobDto,
    @User() user: AuthenticatedUser,
  ): Promise<ISuccess> {
    return await this.schedulerService.create(
      schedule,
      user.tenantId,
      user.token.tokenString,
    );
  }

  @Post('/all')
  @RequireAnyClaims(
    TazamaClaims.EDITOR,
    TazamaClaims.APPROVER,
    TazamaClaims.EXPORTER,
    TazamaClaims.PUBLISHER,
  )
  async getAll(
    @Query('offset') offset: string,
    @Query('limit') limit: string,
    @User() user: AuthenticatedUser,
    @Body() filters?: Record<string, unknown>,
  ): Promise<PaginatedResult<Schedule>> {
    return await this.schedulerService.findAll(offset, limit, user, filters);
  }

  @Patch('/update/:id')
  @RequireAnyClaims(TazamaClaims.EDITOR)
  async update(
    @Param('id') id: string,
    @Body() body: UpdateScheduleJobDto,
    @User() user: AuthenticatedUser,
  ): Promise<ISuccess> {
    return await this.schedulerService.update(id, body, user);
  }

  @Get('/:id')
  @RequireAnyClaims(
    TazamaClaims.EDITOR,
    TazamaClaims.APPROVER,
    TazamaClaims.EXPORTER,
    TazamaClaims.PUBLISHER,
  )
  async getById(
    @Param('id') id: string,
    @User() user: AuthenticatedUser,
  ): Promise<Schedule | null> {
    return await this.schedulerService.findOne(id, user);
  }

  @Get('/get/status')
  @RequireAnyClaims(
    TazamaClaims.EDITOR,
    TazamaClaims.APPROVER,
    TazamaClaims.EXPORTER,
    TazamaClaims.PUBLISHER,
  )
  async getByStatus(
    @Query('status') status: JobStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @User() user: AuthenticatedUser,
  ): Promise<Schedule[]> {
    return await this.schedulerService.findByStatus(
      status,
      page,
      limit,
      user,
    );
  }

  @Patch('/update/status/:id')
  @RequireAnyClaims(
    TazamaClaims.EDITOR,
    TazamaClaims.APPROVER,
    TazamaClaims.EXPORTER,
    TazamaClaims.PUBLISHER,
  )
  async updateStatus(
    @Param('id') id: string,
    @Query('status') status: JobStatus,
    @User() user: AuthenticatedUser,
    @Body('reason') reason?: string,
  ): Promise<ISuccess> {
    return await this.schedulerService.updateStatus(
      id,
      user.tenantId,
      status,
      user,
      reason,
    );
  }
}
