import { Body, Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { RequireEditorRole } from 'src/auth/auth.decorator';
import { ConfigType, JobStatus } from 'src/utils/interfaces';
import { CreatePushJobDto } from './dto/create-push-job.dto';
import { JobService } from './job.service';

@Controller('job')
// @UseGuards(TazamaAuthGuard)
export class JobController {
    constructor(private jobService: JobService) { }

    @Post('/create/push')
    @RequireEditorRole()
    async createPushJob(@Body() job: CreatePushJobDto) {
        return await this.jobService.createPush(job, '1234');
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
        return await this.jobService.findByStatus(status,page,limit)
    }

    @Patch('/update/status/:id')
    async updatePushStatus(@Param('id') id: string, @Query('status') status: JobStatus) {
        return await this.jobService.updateStatus(id, status, 'endpoints')
    }

}
