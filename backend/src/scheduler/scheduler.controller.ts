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
} from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { CreateScheduleJobDto } from './dto/create-schedule.dto';
import { UpdateScheduleJobDto } from './dto/update-schedule-dto';
import { JobStatus } from '@tazama-lf/tcs-lib';

@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) { }

  @Post('/create')
  async createJob(@Body() schedule: CreateScheduleJobDto) {
    return this.schedulerService.create(schedule);
  }

  @Get('/all')
  async getAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.schedulerService.findAll(page, limit);
  }

  @Patch('/update/:id')
  async update(@Param('id') id: string, @Body() body: UpdateScheduleJobDto) {
    return this.schedulerService.update(id, body);
  }

  @Get('/:id')
  async getById(@Param('id') id: string) {
    return this.schedulerService.findOne(id);
  }

  @Patch('/update/status/:id')
  async updateStatus(
    @Param('id') id: string,
    @Query('status') status: JobStatus,
  ) {
    return await this.schedulerService.updateStatus(
      id,
      status,
    );
  }
}
