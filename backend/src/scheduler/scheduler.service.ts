import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { Knex } from 'knex';
import { CreateScheduleJobDto } from './dto/create-schedule.dto';
import { Schedule } from './types/scheduler-interfaces';
import { ScheduleDto } from './dto/schedule.dto';
import { ISuccess } from 'src/utils/interfaces';
import { validateCronExpression } from '../utils/helpers';

@Injectable()
export class SchedulerService {

    constructor(@Inject('KNEX_CONNECTION') private readonly knex: Knex, private readonly loggerService: LoggerService) { }

    async create(schedule: CreateScheduleJobDto): Promise<ISuccess> {
        try {
            validateCronExpression(schedule.cron);

            const existing = await this.knex('schedule')
                .where({ name: schedule.name })
                .first();
            if (existing) {
                throw new BadRequestException(`Schedule with name '${schedule.name}' already exists.`);
            }

            const [result] = await this.knex('schedule').insert(schedule).returning('id');
            return {
                success: true,
                message: `Schedule with id ${result.id} successfully crreated`,
            }
        } catch (error) {
            this.loggerService.error(`Error While Creating Schedule : ${error.message}`)
            throw error;
        }
    }

    async findOne(id: number): Promise<Schedule> {
        const schedule = await this.knex<Schedule>('schedule').where({ id }).first();
        if (!schedule) {
            throw new NotFoundException(`Configuration with id ${id} not found`);
        }
        return schedule;
    }


    async findAll(page: number, limit: number): Promise<Schedule[]> {
        if (!Number.isInteger(page) || !Number.isInteger(limit) || page < 1 || limit < 1) {
            throw new BadRequestException('Page and limit must be positive integers.');
        }

        const offset = (page - 1) * limit;
        const data = await this.knex('schedule')
            .select('*')
            .limit(limit)
            .offset(offset);

        return data;
    }

    async update(id: number, attr: Partial<ScheduleDto>): Promise<ISuccess> {
        const updatedRows = await this.knex<Schedule>('schedule').where({ id }).update(attr);
        if (updatedRows === 0) {
            throw new NotFoundException(`Schedule with id ${id} not found or no changes were made`);
        }
        return {
            success: true,
            message: `Schedule with id ${id} successfully updated`,
        }
    }
}
