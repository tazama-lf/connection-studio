import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { DatabaseService } from '../database/database.service';
import { validateCronExpression } from '../utils/helpers';
import { CreateScheduleJobDto } from './dto/create-schedule.dto';
import { UpdateScheduleJobDto } from './dto/update-schedule-dto';
import { Schedule, ISuccess, JobStatus } from '@tazama-lf/tcs-lib';
import { ConfigService } from '@nestjs/config';
import { SftpService } from '../sftp/sftp.service';
import { v4 } from 'uuid';

@Injectable()
export class SchedulerService {
  constructor(
    private readonly db: DatabaseService,
    private readonly loggerService: LoggerService,
    private readonly configService: ConfigService,
    private readonly sftpService: SftpService
  ) { }

  async create(schedule: CreateScheduleJobDto, tenantId: string, status: JobStatus = JobStatus.INPROGRESS): Promise<ISuccess> {
    try {
      validateCronExpression(schedule.cron);

      const scheduleWithId = { ...schedule, id: v4(), tenant_id: tenantId, status };
      const keys = Object.keys(scheduleWithId);
      const values = Object.values(scheduleWithId);
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
      };
    } catch (error) {
      this.loggerService.error(
        `Error While Creating Schedule : ${error.message}`,
      );
      throw new BadRequestException(error.message);
    }
  }

  async findOne(id: string): Promise<Schedule> {
    const query = 'SELECT * FROM schedule WHERE id = $1 LIMIT 1;';
    const result = await this.db.query(query, [id]);
    const schedule = result.rows[0] || null;
    if (!schedule) {
      throw new NotFoundException(`Configuration with id ${id} not found`);
    }
    return schedule;
  }

  async findAll(page: number, limit: number, tenantId: string): Promise<Schedule[]> {
    if (
      !Number.isInteger(page) ||
      !Number.isInteger(limit) ||
      page < 1 ||
      limit < 1
    ) {
      throw new BadRequestException(
        'Page and limit must be positive integers.',
      );
    }

    const offset = (page - 1) * limit;
    const result = await this.db.query(
      'SELECT * FROM schedule WHERE tenant_id = $1 LIMIT $2 OFFSET $3;',
      [tenantId, limit, offset],
    );

    const data = result.rows;

    return data;
  }

  async update(id: string, attr: UpdateScheduleJobDto, tenantId: string): Promise<ISuccess> {
    try {

      const existingSchedule = await this.findOne(id);

      if (existingSchedule.status === JobStatus.APPROVED) {
        throw new ForbiddenException(
          'Approved cron jobs cannot be edited. Please create a new cron job instead.'
        );
      }

      const keys = Object.keys(attr);
      const values = Object.values(attr);
      const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
      const query = `UPDATE schedule SET ${setClause} WHERE id = $${keys.length + 1};`;

      const result = await this.db.query(query, [...values, id]);

      const updatedRows = result.rowCount;

      if (!updatedRows) {
        throw new NotFoundException(
          `Schedule with id ${id} not found or no changes were made`,
        );
      }
      return {
        success: true,
        message: `Schedule with id ${id} successfully updated`,
      };
    } catch (err) {
      this.loggerService.error(`Error updating schedule: ${err.message}`);
      throw err;
    }
  }

  async updateStatus(id: string, tenantId: string, status: JobStatus): Promise<ISuccess> {
    try {
      if (!status) {
        throw new BadRequestException('Both status and table_name are required.');
      }

      const existing = await this.findOne(id);
      const nodeEnv = this.configService.get<string>('NODE_ENV');
      const fileName = `${nodeEnv}_cron_${tenantId}_${id}`;

      switch (status) {
        case JobStatus.EXPORTED: {

          await this.sftpService.createFile(fileName, {
            ...existing,
            status: JobStatus.READY,
          });

          this.loggerService.log(
            `Successfully uploaded config file (${fileName}) on SFTP server.`,
          );
          break;
        }

        case JobStatus.DEPLOYED: {
          await this.create(existing, tenantId, JobStatus.DEPLOYED);
          await this.sftpService.deleteFile(fileName)
          break;
        }

        default:
          break;
      }

      const query = `
                  UPDATE schedule
                   SET status = $1, updated_at = NOW()
                       WHERE id = $2
                          RETURNING *;
                      `;

      const result = await this.db.query(query, [status, id]);

      if (result.rowCount === 0) {
        throw new NotFoundException(
          `Record with id "${id}" not found`,
        );
      }

      return {
        success: true,
        message: `Cron Job with id ${id} successfully updated`,
      };

    } catch (err) {
      this.loggerService.error(err.message);
      throw new BadRequestException(err.message);
    }
  }
}
