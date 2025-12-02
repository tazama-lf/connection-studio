import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { ISuccess, JobStatus, Schedule } from '@tazama-lf/tcs-lib';
import { AuthenticatedUser } from '../auth/auth.types';
import { v4 } from 'uuid';
import { AdminServiceClient } from '../services/admin-service-client.service';
import { SftpService } from '../sftp/sftp.service';
import { validateCronExpression } from '../utils/helpers';
import { CreateScheduleJobDto } from './dto/create-schedule.dto';
import { UpdateScheduleJobDto } from './dto/update-schedule-dto';
import { EventType } from '../enums/events.enum';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class SchedulerService {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly sftpService: SftpService,
    private readonly adminServiceClient: AdminServiceClient,
    private readonly notificationService: NotificationService
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

      return await this.adminServiceClient.createSchedule(
        scheduleWithId,
        token,
      );
    } catch (error) {
      this.loggerService.error(
        `Error While Creating Schedule : ${error.message}`,
      );
      throw new BadRequestException(error.message);
    }
  }

  async findOne(id: string, token: string): Promise<Schedule | null> {
    return await this.adminServiceClient.findScheduleById(id, token);
  }

  async findAll(
    offset: string,
    limit: string,
    user: AuthenticatedUser,
    filters?: Record<string, unknown>,
  ): Promise<{}> {
    return await this.adminServiceClient.getAllSchedule(
      offset,
      limit,
      user,
      filters,
    );
  }

  async update(
    id: string,
    attr: UpdateScheduleJobDto,
    token: string,
  ): Promise<ISuccess> {
    try {
      const existingSchedule = await this.findOne(id, token);

      if (existingSchedule?.status !== JobStatus.INPROGRESS && existingSchedule?.status !== JobStatus.REJECTED) {
        throw new ForbiddenException(
          'Only In-Progress Cron jobs can be edited',
        );
      }

      return await this.adminServiceClient.updateSchedule(id, attr, token);
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
    token: string,
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

      return await this.adminServiceClient.getScheduleByStatus(
        status,
        page,
        limit,
        tenant_id,
        token,
      );
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
    user: AuthenticatedUser,
    reason?: string,
  ): Promise<ISuccess> {
    try {
      if (!status) {
        throw new BadRequestException(
          'Both status and table_name are required.',
        );
      }

      const requiresExistingJob =
        status === JobStatus.APPROVED ||
        status === JobStatus.REVIEW ||
        status === JobStatus.REJECTED ||
        status === JobStatus.EXPORTED;

      let existing: Schedule | null = null;

      if (requiresExistingJob) {
        existing = await this.findOne(id, user.token.tokenString);
      }

      const fileName = `cron_${tenantId}_${id}`;

      switch (status) {
        case JobStatus.REVIEW: {
          await this.notificationService.sendWorkflowNotification(
            EventType.EditorSubmit,
            user,
            { ...existing, status: JobStatus.REVIEW } as Schedule,
            user.token.tokenString,
          )
          break;
        }
        case JobStatus.APPROVED: {
          await this.notificationService.sendWorkflowNotification(
            EventType.ApproverApprove,
            user,
            { ...existing, status: JobStatus.APPROVED } as Schedule,
            user.token.tokenString,
          )
          break;
        }
        case JobStatus.REJECTED: {
          if (!reason) {
            throw new BadRequestException(
              'Rejection reason is required when rejecting a cron job.',
            );
          }

          await this.notificationService.sendWorkflowNotification(
            EventType.ApproverReject,
            user,
            { ...existing, status: JobStatus.REJECTED } as Schedule,
            user.token.tokenString,
          )
          break;
        }
        case JobStatus.EXPORTED: {
          await this.sftpService.createFile(fileName, {
            ...existing,
            status: JobStatus.READY,
          });

          await this.notificationService.sendWorkflowNotification(
            EventType.ExporterExport,
            user,
            { ...existing, status: JobStatus.EXPORTED } as Schedule,
            user.token.tokenString,
          )
          break;
        }
        case JobStatus.DEPLOYED: {
          const fileData = await this.sftpService.readFile(fileName);
          await this.create(fileData, tenantId, user.token.tokenString, JobStatus.DEPLOYED);
          await this.sftpService.deleteFile(fileName);


          await this.notificationService.sendWorkflowNotification(
            EventType.PublisherDeploy,
            user,
            { ...fileData, status: JobStatus.DEPLOYED },
            user.token.tokenString,
          )


          return {
            success: true,
            message: `Schedule with id ${id} successfully deployed.`,
          };
        }

        default:
          break;
      }

      return await this.adminServiceClient.updateScheduleByStatus(
        id,
        status,
        tenantId,
        user.token.tokenString,
        reason,
      );
    } catch (err) {
      this.loggerService.error(err.message);
      throw new BadRequestException(err.message);
    }
  }
}
