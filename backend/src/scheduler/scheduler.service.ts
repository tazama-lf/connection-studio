import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import {
  ISuccess,
  JobStatus,
  PaginatedResult,
  Schedule,
} from '@tazama-lf/tcs-lib';
import { AuthenticatedUser } from '../auth/auth.types';
import { v4 } from 'uuid';
import { AdminServiceClient } from '../services/admin-service-client.service';
import { SftpService } from '../sftp/sftp.service';
import { validateCronExpression } from '../utils/helpers';
import { CreateScheduleJobDto } from './dto/create-schedule.dto';
import { UpdateScheduleJobDto } from './dto/update-schedule-dto';
import { EventType } from '../enums/events.enum';
import { NotificationService } from '../notification/notification.service';
import { RbacService } from '../utils/rbac/rbacHelper';

@Injectable()
export class SchedulerService {
  private readonly rbacService = new RbacService();

  constructor(
    private readonly loggerService: LoggerService,
    private readonly sftpService: SftpService,
    private readonly adminServiceClient: AdminServiceClient,
    private readonly notificationService: NotificationService,
  ) {}

  async create(
    schedule: CreateScheduleJobDto,
    tenantId: string,
    token: string,
    status: JobStatus = JobStatus.INPROGRESS,
  ): Promise<ISuccess> {
    try {
      validateCronExpression(schedule.cron);

      const scheduleWithId = structuredClone(schedule) as Schedule;
      scheduleWithId.id = schedule.id ? schedule.id : v4();
      scheduleWithId.tenant_id = tenantId;
      scheduleWithId.status = status;

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

  async findOne(id: string, user: AuthenticatedUser): Promise<Schedule | null> {
    const schedule = await this.adminServiceClient.findScheduleById(
      id,
      user.token.tokenString,
    );

    if (!schedule) {
      return null;
    }

    const userRole = user.actorRole.toLowerCase();
    if (
      !userRole ||
      !['editor', 'approver', 'publisher', 'exporter'].includes(userRole)
    ) {
      throw new ForbiddenException('Invalid user role');
    }

    const { allowedStatuses } = this.rbacService.getTier2({
      role: userRole as 'editor' | 'approver' | 'publisher' | 'exporter',
      endpointKey: 'Get :id',
    });

    if (!allowedStatuses?.includes(schedule.status)) {
      throw new ForbiddenException(
        `Role '${userRole}' cannot act on resources in status '${schedule.status}'`,
      );
    }

    return schedule;
  }

  async findAll(
    offset: string,
    limit: string,
    user: AuthenticatedUser,
    filters?: Record<string, unknown>,
  ): Promise<PaginatedResult<Schedule>> {
    const updatedFilters = { ...filters };

    if (!updatedFilters.status) {
      const userRole = user.actorRole.toLowerCase();
      if (
        userRole &&
        ['editor', 'approver', 'publisher', 'exporter'].includes(userRole)
      ) {
        const { allowedStatuses } = this.rbacService.getTier2({
          role: userRole as 'editor' | 'approver' | 'publisher' | 'exporter',
          endpointKey: 'Post /all',
        });

        if (allowedStatuses?.length) {
          updatedFilters.status = allowedStatuses.join(',');
        }
      }
    }
    return await this.adminServiceClient.getAllSchedule(
      offset,
      limit,
      user,
      updatedFilters,
    );
  }

  async updateSchedule(
    id: string,
    attr: UpdateScheduleJobDto,
    user: AuthenticatedUser,
  ): Promise<ISuccess> {
    try {
      const existingSchedule = await this.findOne(id, user);

      if (!existingSchedule) {
        throw new BadRequestException('Schedule not found');
      }

      const userRole = user.actorRole.toLowerCase();
      if (!userRole || !['editor'].includes(userRole)) {
        throw new ForbiddenException('Invalid user role');
      }

      // Tier 2: Check if role can act on current status
      const tier2Result = this.rbacService.checkTier2({
        role: userRole as 'editor',
        endpointKey: 'Patch /update/:id',
        currentStatus: existingSchedule.status,
      });

      if (!tier2Result.allowed) {
        throw new ForbiddenException(
          tier2Result.reason ?? 'Not authorized to update this schedule',
        );
      }

      return await this.adminServiceClient.updateSchedule(
        id,
        attr,
        user.token.tokenString,
      );
    } catch (err) {
      this.loggerService.error(`Error updating schedule: ${err.message}`);
      throw err;
    }
  }

  async findByStatus(
    status: JobStatus,
    page: number,
    limit: number,
    user: AuthenticatedUser,
  ): Promise<Schedule[]> {
    try {
      if (page < 1 || limit < 1) {
        throw new BadRequestException(
          'Page and limit must be positive integers.',
        );
      }

      const userRole = user.actorRole.toLowerCase();
      if (
        !userRole ||
        !['editor', 'approver', 'publisher', 'exporter'].includes(userRole)
      ) {
        throw new ForbiddenException('Invalid user role');
      }

      const { allowedStatuses } = this.rbacService.getTier2({
        role: userRole as 'editor' | 'approver' | 'publisher' | 'exporter',
        endpointKey: 'Get /get/status',
      });

      if (!allowedStatuses?.includes(status)) {
        throw new ForbiddenException(
          `Role '${userRole}' cannot act on resources in status '${status}'`,
        );
      }

      return await this.adminServiceClient.getScheduleByStatus(
        status,
        page,
        limit,
        user.tenantId,
        user.token.tokenString,
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
      const userRole = user.actorRole.toLowerCase();
      let existingSchedule: Schedule | null = null;
      
      if (userRole === 'publisher' && status === JobStatus.DEPLOYED) {
        const fileName = `cron_${tenantId}_${id}`;
        
        try {
          existingSchedule = (await this.sftpService.readFile(
            fileName,
          )) as Schedule;
        } catch (error) {
          throw new BadRequestException(
            `Cannot read schedule ${id} from SFTP: ${error.message}`,
          );
        }
      } else {
        existingSchedule = await this.findOne(id, user);

        if (!existingSchedule) {
          throw new BadRequestException('Schedule not found');
        }
      }

      if (
        !userRole ||
        !['editor', 'approver', 'publisher', 'exporter'].includes(userRole)
      ) {
        throw new ForbiddenException('Invalid user role');
      }

      const tier2Result = this.rbacService.checkTier2({
        role: userRole as 'editor' | 'approver' | 'publisher' | 'exporter',
        endpointKey: 'Patch /update/status/:id',
        currentStatus: existingSchedule.status,
      });

      if (!tier2Result.allowed) {
        throw new ForbiddenException(
          tier2Result.reason ?? 'Not authorized to update this schedule status',
        );
      }

      const tier3Result = this.rbacService.checkTier3({
        role: userRole as 'editor' | 'approver' | 'publisher' | 'exporter',
        endpointKey: 'Patch /update/status/:id',
        currentStatus: existingSchedule.status,
        targetStatus: status,
      });

      if (!tier3Result.allowed) {
        throw new ForbiddenException(
          tier3Result.reason ??
            'Not authorized to perform this status transition',
        );
      }

      let result: ISuccess | null = null;
      if (status !== JobStatus.DEPLOYED) {
        result = await this.adminServiceClient.updateScheduleByStatus(
          id,
          status,
          tenantId,
          user.token.tokenString,
          reason,
        );
      }

      const requiresExistingJob =
        status === JobStatus.APPROVED ||
        status === JobStatus.REVIEW ||
        status === JobStatus.REJECTED ||
        status === JobStatus.EXPORTED;

      let existing: Schedule | null = null;

      if (requiresExistingJob) {
        existing = existingSchedule;
      }

      const fileName = `cron_${tenantId}_${id}`;

      switch (status) {
        case JobStatus.REVIEW: {
          const updated = structuredClone(existing!);
          updated.status = JobStatus.REVIEW;

          await this.notificationService.sendWorkflowNotification(
            EventType.EditorSubmit,
            user,
            updated,
            user.token.tokenString,
          );
          break;
        }
        case JobStatus.APPROVED: {
          const updated = structuredClone(existing!);
          updated.status = JobStatus.APPROVED;

          await this.notificationService.sendWorkflowNotification(
            EventType.ApproverApprove,
            user,
            updated,
            user.token.tokenString,
          );
          break;
        }
        case JobStatus.REJECTED: {
          if (!reason) {
            throw new BadRequestException(
              'Rejection reason is required when rejecting a cron job.',
            );
          }

          const updated = structuredClone(existing!);
          updated.status = JobStatus.REJECTED;

          await this.notificationService.sendWorkflowNotification(
            EventType.ApproverReject,
            user,
            updated,
            user.token.tokenString,
          );
          break;
        }
        case JobStatus.EXPORTED: {
          const exportPayload = structuredClone(existing!);
          exportPayload.status = JobStatus.READY;

          await this.sftpService.createFile(fileName, exportPayload);

          const updated = structuredClone(existing!);
          updated.status = JobStatus.EXPORTED;

          await this.notificationService.sendWorkflowNotification(
            EventType.ExporterExport,
            user,
            updated,
            user.token.tokenString,
          );
          break;
        }
        case JobStatus.DEPLOYED: {
          const fileData = existingSchedule!;
          
          await this.create(
            fileData,
            tenantId,
            user.token.tokenString,
            JobStatus.DEPLOYED,
          );
          
          const fileName = `cron_${tenantId}_${id}`;
          await this.sftpService.deleteFile(fileName);

          const updated = structuredClone(fileData);
          updated.status = JobStatus.DEPLOYED;

          await this.notificationService.sendWorkflowNotification(
            EventType.PublisherDeploy,
            user,
            updated,
            user.token.tokenString,
          );

          return {
            success: true,
            message: `Schedule with id ${id} successfully deployed.`,
          };
        }

        default:
          break;
      }

      return (
        result ?? {
          success: true,
          message: 'Cron Job Status updated successfully',
        }
      );
    } catch (err) {
      this.loggerService.error(err.message);
      throw new BadRequestException(err.message);
    }
  }
}
