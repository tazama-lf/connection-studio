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
import { JobStatus } from '@tazama-lf/tcs-lib';
import {
  RequireAnyClaims,
  TazamaClaims
} from 'src/auth/auth.decorator';
import { type AuthenticatedUser } from 'src/auth/auth.types';
import { TazamaAuthGuard } from 'src/auth/tazama-auth.guard';
import { User } from 'src/auth/user.decorator';
import { CreateScheduleJobDto } from './dto/create-schedule.dto';
import { UpdateScheduleJobDto } from './dto/update-schedule-dto';
import { SchedulerService } from './scheduler.service';

@Controller('scheduler')
@UseGuards(TazamaAuthGuard)
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) { }

  @Post('/create')
  @RequireAnyClaims(TazamaClaims.EDITOR)
  async createJob(
    @Body() schedule: CreateScheduleJobDto,
    @User() user: AuthenticatedUser,
  ) {
    return this.schedulerService.create(schedule, user.tenantId, user.token.tokenString);
  }

  @Get('/all')
  @RequireAnyClaims(
    TazamaClaims.EDITOR,
    TazamaClaims.APPROVER,
    TazamaClaims.EXPORTER,
    TazamaClaims.PUBLISHER,
  )
  async getAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @User() user: AuthenticatedUser,
  ) {
    return this.schedulerService.findAll(page, limit, user.tenantId);
  }

  @Patch('/update/:id')
  @RequireAnyClaims(TazamaClaims.EDITOR)
  async update(
    @Param('id') id: string,
    @Body() body: UpdateScheduleJobDto,
    @User() user: AuthenticatedUser,
  ) {
    return this.schedulerService.update(id, body, user.tenantId);
  }

  @Get('/:id')
  @RequireAnyClaims(
    TazamaClaims.EDITOR,
    TazamaClaims.APPROVER,
    TazamaClaims.EXPORTER,
    TazamaClaims.PUBLISHER,
  )
  async getById(@Param('id') id: string) {
    return this.schedulerService.findOne(id);
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
    @User() user: AuthenticatedUser
  ) {
    return await this.schedulerService.findByStatus(status, page, limit, user.tenantId);
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
  ) {
    return await this.schedulerService.updateStatus(id, user.tenantId, status, user.token.tokenString, reason);
  }
}
