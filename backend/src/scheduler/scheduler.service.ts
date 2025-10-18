import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { DatabaseService } from '../database/database.service';
import { ISuccess } from 'src/utils/interfaces';
import { validateCronExpression } from '../utils/helpers';
import { CreateScheduleJobDto } from './dto/create-schedule.dto';
import { ScheduleDto } from './dto/schedule.dto';
import { Schedule } from './types/scheduler-interfaces';

@Injectable()
export class SchedulerService {

    constructor(private readonly db: DatabaseService, private readonly loggerService: LoggerService) { }

    async create(schedule: CreateScheduleJobDto): Promise<ISuccess> {
        try {
            validateCronExpression(schedule.cron);

            const res = await this.db.query(
                `SELECT * FROM schedule WHERE name = $1 LIMIT 1;`,
                [schedule.name]
            );

            if (res.length) {
                throw new BadRequestException(`Schedule with name '${schedule.name}' already exists.`);
            }

            const keys = Object.keys(schedule);
            const values = Object.values(schedule);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

            const insertQuery = `
      INSERT INTO schedule (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING id;
    `;
            const result = await this.db.query(insertQuery, values);
            const insertedId = result.rows[0].id;


            return {
                success: true,
                message: `Schedule with id ${insertedId} successfully created`,
            }
        } catch (error) {
            this.loggerService.error(`Error While Creating Schedule : ${error.message}`)
            throw error;
        }
    }

    async findOne(id: number): Promise<Schedule> {
        const query = `SELECT * FROM schedule WHERE id = $1 LIMIT 1;`;
        const result = await this.db.query(query, [id]);
        const schedule = result.rows[0] || null;
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
        const result = await this.db.query(
            `SELECT * FROM schedule LIMIT $1 OFFSET $2;`,
            [limit, offset]
        );

        const data = result.rows;

        return data;
    }

    async update(id: number, attr: Partial<ScheduleDto>): Promise<ISuccess> {

        const keys = Object.keys(attr);
        const values = Object.values(attr);
        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
        const query = `UPDATE schedule SET ${setClause} WHERE id = $${keys.length + 1};`;

        const result = await this.db.query(query, [...values, id]);

        const updatedRows = result.rowCount;

        if (updatedRows === 0) {
            throw new NotFoundException(`Schedule with id ${id} not found or no changes were made`);
        }
        return {
            success: true,
            message: `Schedule with id ${id} successfully updated`,
        }
    }
}
