import { Body, Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { CreateScheduleJobDto } from './dto/create-schedule.dto';
import { UpdateScheduleJobDto } from './dto/update-schedule-dto';

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

    @Patch('/:id')
    async update(@Param('id') id: string, @Body() body: UpdateScheduleJobDto) {
        return this.schedulerService.update(parseInt(id), body);
    }
}
