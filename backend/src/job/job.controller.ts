import { Body, Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { RequireEditorRole } from '../auth/auth.decorator';
import { ConfigType, JobStatus, ScheduleStatus } from '../utils/interfaces';
import { CreatePushJobDto } from './dto/create-push-job.dto';
import { JobService } from './job.service';
import { CreatePullJobDto } from './dto/create-pull-job.dto';

@Controller('job')
// @UseGuards(TazamaAuthGuard)
export class JobController {
    constructor(private readonly jobService: JobService) { }

    @Post('/create/push')
    @RequireEditorRole()
    async createPushJob(@Body() job: CreatePushJobDto) {
        return await this.jobService.createPush(job, '1234');
    }


    @Post('/create/pull')
    // @RequireEditorRole()
    async createPullJob(@Body() job: CreatePullJobDto) {
        return await this.jobService.createPull(job, '1234');
    }

    @Get('/all')
    @RequireEditorRole()
    async getAll(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    ) {
        return this.jobService.findAll(page, limit, '1234');
    }

    @Get('/:id')
    async getById(@Param('id') id: string, @Query('type') type: ConfigType) {
        return await this.jobService.findOne(id, type, '1234')
    }

    @Get('/get/status')
    async getByStatus(
        @Query('status') status: JobStatus,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,) {
        return await this.jobService.findByStatus(status, page, limit)
    }

    @Patch('/update/status/:id')
    async updateStatus(@Param('id') id: string, @Query('status') status: JobStatus, @Query('type') type: ConfigType) {
        return await this.jobService.updateStatus(id, status, type === ConfigType.PUSH ? 'endpoints' : 'job')
    }

    @Patch('/update/activation/:id')
    async update(@Param('id') id: string, @Query('status') status: ScheduleStatus, @Query('type') type: ConfigType) {
        return await this.jobService.updateActivation(id, status, type === ConfigType.PUSH ? 'endpoints' : 'job')
    }

}
