import {
  BadRequestException,
  ForbiddenException,
  Injectable
} from '@nestjs/common';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { ISuccess, JobStatus, Schedule } from '@tazama-lf/tcs-lib';
import { AuthenticatedUser } from 'src/auth/auth.types';
import { v4 } from 'uuid';
import { AdminServiceClient } from '../services/admin-service-client.service';
import { SftpService } from '../sftp/sftp.service';
import { validateCronExpression } from '../utils/helpers';
import { CreateScheduleJobDto } from './dto/create-schedule.dto';
import { UpdateScheduleJobDto } from './dto/update-schedule-dto';

@Injectable()
export class SchedulerService {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly sftpService: SftpService,
    private readonly adminServiceClient: AdminServiceClient
  ) { }

  async create(
    schedule: CreateScheduleJobDto,
    tenantId: string,
    token: string,
    status: JobStatus = JobStatus.INPROGRESS,
  ): Promise<ISuccess> {
    try {
      validateCronExpression(schedule.cron);

      const scheduleWithId = {
        ...schedule,
        id: schedule.id ?? v4(),
        tenant_id: tenantId,
        status,
      };

      return await this.adminServiceClient.createSchedule(scheduleWithId, token)

    } catch (error) {
      this.loggerService.error(
        `Error While Creating Schedule : ${error.message}`,
      );
      throw new BadRequestException(error.message);
    }
  }

  async findOne(id: string, token: string): Promise<Schedule | null> {
    return await this.adminServiceClient.findScheduleById(id, token)
  }

  async findAll(
    offset: string,
    limit: string,
    user: AuthenticatedUser,
    filters?: Record<string, unknown>,
  ): Promise<{}> {
    return await this.adminServiceClient.getAllSchedule(offset, limit, user, filters)
  }

  async update(
    id: string,
    attr: UpdateScheduleJobDto,
    token: string
  ): Promise<ISuccess> {
    try {
      const existingSchedule = await this.findOne(id, token);

      if (existingSchedule?.status !== JobStatus.INPROGRESS) {
        throw new ForbiddenException(
          'Only In-Progress Cron jobs can be edited',
        );
      }

      return await this.adminServiceClient.updateSchedule(id, attr, token)

    } catch (err) {
      this.loggerService.error(`Error updating schedule: ${err.message}`);
      throw err;
    }
  }

  async findByStatus(
    status: JobStatus,
    page: number,
    limit: number,
    tenant_id: string,
    token: string
  ): Promise<Schedule[]> {
    try {
      if (!status || !page || !limit) {
        throw new BadRequestException('Status, page, and limit are required.');
      }

      if (page < 1 || limit < 1) {
        throw new BadRequestException(
          'Page and limit must be positive integers.',
        );
      }

      return await this.adminServiceClient.getScheduleByStatus(status, page, limit, tenant_id, token)

    } catch (err) {
      this.loggerService.error(
        `Error fetching records by status: ${err.message}`,
      );
      throw new BadRequestException(err.message);
    }
  }

  async updateStatus(
    id: string,
    tenantId: string,
    status: JobStatus,
    token: string,
    reason?: string
  ): Promise<ISuccess> {
    try {
      if (!status) {
        throw new BadRequestException(
          'Both status and table_name are required.',
        );
      }

      const fileName = `cron_${tenantId}_${id}`;

      switch (status) {
        case JobStatus.REJECTED: {
          if (!reason) {
            throw new BadRequestException(
              'Rejection reason is required when rejecting a job.',
            );
          }
          break;
        }
        case JobStatus.EXPORTED: {
          const existing = await this.findOne(id, token);
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
          const existing = await this.sftpService.readFile(fileName);
          await this.create(existing, tenantId, token, JobStatus.DEPLOYED);
          await this.sftpService.deleteFile(fileName);
          return {
            success: true,
            message: `Job with id ${id} successfully deployed.`,
          };
        }

        default:
          break;
      }

      return await this.adminServiceClient.updateScheduleByStatus(id, status, tenantId, token, reason)

    } catch (err) {
      this.loggerService.error(err.message);
      throw new BadRequestException(err.message);
    }
  }
}
