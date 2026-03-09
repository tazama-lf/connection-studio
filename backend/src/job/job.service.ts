import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import {
  AuthType,
  ConfigType,
  ISuccess,
  Job,
  JobStatus,
  JobSummary,
  PaginatedResult,
  PullJobHistory,
  ScheduleStatus,
  SFTPConnection,
  SourceType,
} from '@tazama-lf/tcs-lib';
import { v4 } from 'uuid';
import { AuthenticatedUser } from '../auth/auth.types';
import { DryRunService } from '../dry-run/dry-run.service';
import { EventType } from '../enums/events.enum';
import { NotificationService } from '../notification/notification.service';
import { NotifyService } from '../notify/notify.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { AdminServiceClient } from '../services/admin-service-client.service';
import { SftpService } from '../sftp/sftp.service';
import { RbacService } from '../utils/rbac/rbacHelper';
import {
  decrypt,
  encrypt,
  escapeRegex,
  validateFileType,
} from '../utils/helpers';
import { CreatePullJobDto, SFTPConnectionDto } from './dto/create-pull-job.dto';
import { CreatePushJobDto } from './dto/create-push-job.dto';
import { UpdatePullJobDto } from './dto/update-pull-job.dto';
import { UpdatePushJobDto } from './dto/update-push-job.dto';

@Injectable()
export class JobService {
  private readonly rbacService = new RbacService();

  constructor(
    private readonly loggerService: LoggerService,
    private readonly dryRunService: DryRunService,
    private readonly sftpService: SftpService,
    private readonly notifyService: NotifyService,
    private readonly adminServiceClient: AdminServiceClient,
    private readonly schedulerService: SchedulerService,
    private readonly notificationService: NotificationService,
  ) {}

  private handleError(err: unknown): never {
    const message = err instanceof Error ? err.message : String(err);
    this.loggerService.error(message);
    throw new BadRequestException(message);
  }

  private encryptSftpCredentials(
    connection: SFTPConnectionDto,
  ): SFTPConnectionDto {
    const encryptedConnection = Object.assign({}, connection);

    if (
      connection.auth_type === AuthType.USERNAME_PASSWORD &&
      connection.password
    ) {
      encryptedConnection.password = encrypt(connection.password);
    } else if (connection.private_key) {
      encryptedConnection.private_key = encrypt(connection.private_key);
    }

    return encryptedConnection;
  }

  async updateJob(
    id: string,
    job: UpdatePushJobDto | UpdatePullJobDto,
    type: ConfigType,
    user: AuthenticatedUser,
  ): Promise<ISuccess> {
    const existingJob = await this.findOne(id, type, user);

    const userRole = user.actorRole.toLowerCase();
    if (
      !userRole ||
      !['editor', 'approver', 'publisher', 'exporter'].includes(userRole)
    ) {
      throw new ForbiddenException('Invalid user role');
    }

    const tier2Result = this.rbacService.checkTier2({
      role: userRole as 'editor' | 'approver' | 'publisher' | 'exporter',
      endpointKey: 'Patch /update/:id',
      currentStatus: existingJob.status,
    });

    if (!tier2Result.allowed) {
      throw new ForbiddenException(
        tier2Result.reason ?? 'Not authorized to update this job',
      );
    }

    let updatedJob: UpdatePushJobDto | UpdatePullJobDto = Object.assign(
      {},
      job,
    );

    if (type === ConfigType.PULL) {
      const pullJob = job as UpdatePullJobDto;
      if (pullJob.source_type === SourceType.SFTP && pullJob.file?.path) {
        validateFileType(pullJob.file.path);
      }
      if (pullJob.source_type === SourceType.SFTP && pullJob.connection) {
        const sftpConn = pullJob.connection as SFTPConnectionDto;
        updatedJob = Object.assign({}, updatedJob, {
          connection: this.encryptSftpCredentials(sftpConn),
        });
      }
    }

    return await this.adminServiceClient.updateJob(
      id,
      updatedJob,
      type,
      user.token.tokenString,
    );
  }

  async createPush(
    job: CreatePushJobDto,
    user: AuthenticatedUser,
    status: JobStatus = JobStatus.INPROGRESS,
  ): Promise<ISuccess> {
    try {
      const id = job.id ? job.id : v4();

      const path =
        status === JobStatus.DEPLOYED
          ? job.path
          : `/${user.tenantId}/enrichment/${job.version}${job.path}`;

      const jobWithId = Object.assign({}, job, {
        id,
        path,
        tenant_id: user.tenantId,
        status,
      });

      const result = await this.adminServiceClient.createPushJob(
        jobWithId,
        user.token.tokenString,
      );

      if (!result.success) {
        throw new Error('Failed to create push job.');
      }

      if (status === JobStatus.DEPLOYED) {
        await this.notifyService.notifyEnrichment(id, ConfigType.PUSH);
      }

      return result;
    } catch (err: unknown) {
      return this.handleError(err);
    }
  }

  async createPull(
    job: CreatePullJobDto,
    user: AuthenticatedUser,
    status: JobStatus = JobStatus.INPROGRESS,
  ): Promise<ISuccess> {
    try {
      const exist = await this.adminServiceClient.findScheduleById(
        job.schedule_id,
        user.token.tokenString,
      );

      if (
        !exist ||
        ![JobStatus.APPROVED, JobStatus.EXPORTED, JobStatus.DEPLOYED].includes(
          exist.status,
        )
      ) {
        throw new BadRequestException(
          `Schedule with Id "${job.schedule_id}" not found or not approved.`,
        );
      }

      let { connection } = job;

      if (job.source_type === SourceType.SFTP) {
        validateFileType(job.file.path);
        const sftpConn = job.connection as SFTPConnectionDto;
        connection = this.encryptSftpCredentials(sftpConn);
      }

      await this.dryRunService.dryRun(job);

      const newId = job.id ?? v4();

      const jobWithId = structuredClone(job) as Job;
      jobWithId.id = newId;
      jobWithId.connection = connection;
      jobWithId.tenant_id = user.tenantId;
      jobWithId.status = status;

      const result = await this.adminServiceClient.createPullJob(
        jobWithId,
        user.token.tokenString,
      );

      if (status === JobStatus.DEPLOYED) {
        await this.notifyService.notifyEnrichment(newId, ConfigType.PULL);
      }

      return result;
    } catch (err: unknown) {
      if (Array.isArray(err)) {
        const messages = err.flatMap((e) => Object.values(e.constraints ?? {}));
        throw new BadRequestException(messages);
      }

      return this.handleError(err);
    }
  }

  async findAll(
    offset: string,
    limit: string,
    user: AuthenticatedUser,
    filters?: Record<string, unknown>,
  ): Promise<PaginatedResult<Job>> {
    try {
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

      return await this.adminServiceClient.getAllJobs(
        offset,
        limit,
        user,
        updatedFilters,
      );
    } catch (error: unknown) {
      return this.handleError(error);
    }
  }

  async findAllHistory(
    offset: string,
    limit: string,
    user: AuthenticatedUser,
    filters?: Record<string, unknown>,
  ): Promise<PaginatedResult<PullJobHistory>> {
    try {
      return await this.adminServiceClient.getAllJobsHistory(
        offset,
        limit,
        user,
        filters,
      );
    } catch (error: unknown) {
      return this.handleError(error);
    }
  }

  async findOne(
    id: string,
    type: ConfigType,
    user: AuthenticatedUser,
  ): Promise<Job & { schedule_name?: string }> {
    try {
      if (!id) {
        throw new BadRequestException('id is required.');
      }

      const tableName = type === ConfigType.PUSH ? 'tcs_push_jobs' : 'tcs_pull_jobs';

      const record = await this.adminServiceClient.findJobById(
        id,
        tableName,
        user.token.tokenString,
      );

      if (!record) {
        throw new BadRequestException(
          `${type === ConfigType.PUSH ? 'Push Job' : 'Pull Job'} with id ${id} not found.`,
        );
      }

      if (!record.schedule_id) {
        this.loggerService.log('Schedule ID not found');
        return record;
      }

      const schedule = await this.schedulerService.findOne(
        record.schedule_id,
        user,
      );

      return schedule ? { ...record, schedule_name: schedule.name } : record;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async findByStatus(
    status: JobStatus,
    page: number,
    limit: number,
    user: AuthenticatedUser,
  ): Promise<JobSummary[]> {
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

      return await this.adminServiceClient.findJobByStatus(
        user.tenantId,
        status,
        page,
        limit,
        user.token.tokenString,
      );
    } catch (err: unknown) {
      return this.handleError(err);
    }
  }

  async updateActivation(
    id: string,
    status: ScheduleStatus,
    type: ConfigType,
    user: AuthenticatedUser,
  ): Promise<ISuccess> {
    try {
      const { success, data } =
        await this.adminServiceClient.updateJobActivation(
          id,
          status,
          type,
          user.token.tokenString,
        );

      if (success) {
        await this.notifyService.notifyEnrichment(id, type);
        await this.notificationService.sendWorkflowNotification(
          status === ScheduleStatus.ACTIVE
            ? EventType.PublisherActivate
            : EventType.PublisherDeactivate,
          user,
          data,
          user.token.tokenString,
        );
      }

      return {
        success: true,
        message: `Job with id ${id} successfully updated`,
      };
    } catch (err: unknown) {
      return this.handleError(err);
    }
  }

  async updateStatus(
    id: string,
    status: JobStatus,
    type: ConfigType,
    user: AuthenticatedUser,
    reason?: string,
  ): Promise<ISuccess> {
    try {
      const userRole = user.actorRole.toLowerCase();
      const safeTenantId = escapeRegex(user.tenantId);
      const fileName = `de_${safeTenantId}_${id}`;
      
      let existingJob: Job & { schedule_name?: string };

      if (userRole === 'publisher' && status === JobStatus.DEPLOYED) {
        try {
          existingJob = (await this.sftpService.readFile(fileName)) as Job;
        } catch (error) {
          throw new BadRequestException(
            `Cannot read job ${id} from SFTP: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      } else {
        existingJob = await this.findOne(id, type, user);
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
        currentStatus: existingJob.status,
      });

      if (!tier2Result.allowed) {
        throw new ForbiddenException(
          tier2Result.reason ?? 'Not authorized to update this job status',
        );
      }

      const tier3Result = this.rbacService.checkTier3({
        role: userRole as 'editor' | 'approver' | 'publisher' | 'exporter',
        endpointKey: 'Patch /update/status/:id',
        currentStatus: existingJob.status,
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
        result = await this.adminServiceClient.updateJobByStatus(
          id,
          status,
          user.tenantId,
          type,
          user.token.tokenString,
          reason,
        );
      }

      const requiresExistingJob =
        status === JobStatus.APPROVED ||
        status === JobStatus.REVIEW ||
        status === JobStatus.REJECTED ||
        status === JobStatus.EXPORTED;

      let existingJobForSwitch: Job | null = null;

      if (requiresExistingJob) {
        existingJobForSwitch = existingJob;
      }

      switch (status) {
        case JobStatus.REVIEW: {
          const updatedJob = structuredClone(existingJobForSwitch)!;
          updatedJob.status = JobStatus.REVIEW;
          await this.notificationService.sendWorkflowNotification(
            EventType.EditorSubmit,
            user,
            updatedJob,
            user.token.tokenString,
          );
          break;
        }
        case JobStatus.APPROVED: {
          const updatedJob = structuredClone(existingJobForSwitch)!;
          updatedJob.status = JobStatus.APPROVED;

          await this.notifyService.notifyEnrichment(
            existingJobForSwitch!.id,
            ConfigType.PULL,
          );

          await this.notificationService.sendWorkflowNotification(
            EventType.ApproverApprove,
            user,
            updatedJob,
            user.token.tokenString,
          );
          break;
        }
        case JobStatus.REJECTED: {
          if (!reason) {
            throw new BadRequestException(
              'Rejection reason is required when rejecting a job.',
            );
          }

          const updatedJob = structuredClone(existingJobForSwitch)!;
          updatedJob.status = JobStatus.REJECTED;
          await this.notificationService.sendWorkflowNotification(
            EventType.ApproverReject,
            user,
            updatedJob,
            user.token.tokenString,
          );
          break;
        }

        case JobStatus.EXPORTED: {
          const exportPayload = structuredClone(existingJobForSwitch!);
          exportPayload.status = JobStatus.READY;

          await this.sftpService.createFile(fileName, exportPayload);

          const updatedJob = structuredClone(existingJobForSwitch!);
          updatedJob.status = JobStatus.EXPORTED;

          await this.notificationService.sendWorkflowNotification(
            EventType.ExporterExport,
            user,
            updatedJob,
            user.token.tokenString,
          );

          break;
        }

        case JobStatus.DEPLOYED: {
          // Job already read from SFTP for publisher role
          const fileData = existingJob as Job;

          const deployPayload: Job = structuredClone(fileData);
          deployPayload.publishing_status = ScheduleStatus.ACTIVE;

          if (type === ConfigType.PULL) {
            const connection = structuredClone(
              fileData.connection,
            ) as SFTPConnection;

            if (
              connection.auth_type === AuthType.USERNAME_PASSWORD &&
              connection.password
            ) {
              connection.password = decrypt(connection.password);
            } else {
              connection.private_key &&= decrypt(connection.private_key);
            }

            delete deployPayload.schedule_name;
            deployPayload.connection = connection;

            await this.createPull(
              deployPayload as CreatePullJobDto,
              user,
              JobStatus.DEPLOYED,
            );
          } else {
            await this.createPush(
              deployPayload as CreatePushJobDto,
              user,
              JobStatus.DEPLOYED,
            );
          }

          await this.sftpService.deleteFile(fileName);

          const updatedJob: Job = structuredClone(fileData);
          updatedJob.status = JobStatus.DEPLOYED;

          await this.notificationService.sendWorkflowNotification(
            EventType.PublisherDeploy,
            user,
            updatedJob,
            user.token.tokenString,
          );

          return {
            success: true,
            message: `Job with id ${id} successfully deployed.`,
          };
        }
        default:
          break;
      }

      return (
        result ?? { success: true, message: 'Job Status updated successfully' }
      );
    } catch (error: unknown) {
      return this.handleError(error);
    }
  }
}
