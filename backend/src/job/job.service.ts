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
  Schedule,
  ScheduleStatus,
  SFTPConnection,
  SourceType,
} from '@tazama-lf/tcs-lib';
import { v4 } from 'uuid';
import { AuthenticatedUser } from '../auth/auth.types';
import { DryRunService } from '../dry-run/dry-run.service';
import { NotifyService } from '../notify/notify.service';
import { AdminServiceClient } from '../services/admin-service-client.service';
import { SftpService } from '../sftp/sftp.service';
import { decrypt, encrypt, validateFileType } from '../utils/helpers';
import { CreatePullJobDto, SFTPConnectionDto } from './dto/create-pull-job.dto';
import { CreatePushJobDto } from './dto/create-push-job.dto';
import { UpdatePullJobDto } from './dto/update-pull-job.dto';
import { UpdatePushJobDto } from './dto/update-push-job.dto';
import { SchedulerService } from '../scheduler/scheduler.service';
import { NotificationService } from '../notification/notification.service';
import { EventType } from '../enums/events.enum';

@Injectable()
export class JobService {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly dryRunService: DryRunService,
    private readonly sftpService: SftpService,
    private readonly notifyService: NotifyService,
    private readonly adminServiceClient: AdminServiceClient,
    private readonly schedulerService: SchedulerService,
    private readonly notificationService: NotificationService
  ) { }

  private handleError(err: unknown): never {
    const message = err instanceof Error ? err.message : String(err);
    this.loggerService.error(message);
    throw new BadRequestException(message);
  }

  private encryptSftpCredentials(
    connection: SFTPConnectionDto
  ): SFTPConnectionDto {
    const encryptedConnection = { ...connection };

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
    user: AuthenticatedUser
  ): Promise<ISuccess> {
    const existingJob = await this.findOne(id, type, user.token.tokenString);

    if (existingJob.status !== JobStatus.INPROGRESS && existingJob.status !== JobStatus.REJECTED) {
      throw new ForbiddenException('Only In-Progress/Rejected jobs can be edited');
    }

    let updatedJob: UpdatePushJobDto | UpdatePullJobDto = {
      ...job,
    };

    if (type === ConfigType.PULL) {
      const pullJob = job as UpdatePullJobDto;

      if (pullJob.source_type === SourceType.SFTP && pullJob.file?.path) {
        validateFileType(pullJob.file.path);
      }

      if (
        pullJob.source_type === SourceType.SFTP &&
        pullJob.connection
      ) {
        const sftpConn = pullJob.connection as SFTPConnectionDto;
        updatedJob = {
          ...updatedJob,
          connection: this.encryptSftpCredentials(sftpConn),
        };
      }
    }

    return await this.adminServiceClient.updateJob(id, updatedJob, type, user.token.tokenString);
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

      const jobWithId = { ...job, id, path, tenant_id: user.tenantId, status };

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

      const newId = job.id ? job.id : v4();

      const jobWithId = {
        ...job,
        id: newId,
        connection,
        tenant_id: user.tenantId,
        status,
      };

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
  ): Promise<Record<string, unknown>> {
    try {
      return await this.adminServiceClient.getAllJobs(
        offset,
        limit,
        user,
        filters,
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
  ): Promise<Record<string, unknown>> {
    try {
      return await this.adminServiceClient.getAllJobsHistory(
        offset,
        limit,
        user,
        filters
      );
    } catch (error: unknown) {
      return this.handleError(error);
    }
  }

  async findOne(
    id: string,
    type: ConfigType,
    token: string
  ): Promise<Job & { schedule_name?: string }> {
    try {
      if (!id) {
        throw new BadRequestException('id is required.');
      }

      const tableName =
        type === ConfigType.PUSH ? 'push_jobs' : 'pull_jobs';

      const record = await this.adminServiceClient.findJobById(
        id,
        tableName,
        token
      );

      if (!record) {
        throw new BadRequestException(
          `${type === ConfigType.PUSH ? 'Push Job' : 'Pull Job'} with id ${id} not found.`
        );
      }

      if (!record.schedule_id) {
        this.loggerService.log('Schedule ID not found')
        return record;
      }

      const schedule = await this.schedulerService.findOne(
        record.schedule_id,
        token
      );

      return schedule
        ? { ...record, schedule_name: schedule.name }
        : record;

    } catch (err) {
      return this.handleError(err);
    }
  }


  async findByStatus(
    status: JobStatus,
    page: number,
    limit: number,
    tenantId: string,
    token: string,
  ): Promise<JobSummary[]> {
    try {
      if (page < 1 || limit < 1) {
        throw new BadRequestException(
          'Page and limit must be positive integers.',
        );
      }

      return await this.adminServiceClient.findJobByStatus(
        tenantId,
        status,
        page,
        limit,
        token,
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
      const { success, data } = await this.adminServiceClient.updateJobActivation(
        id,
        status,
        type,
        user.token.tokenString,
      );

      if (success) {
        await this.notifyService.notifyEnrichment(id, type);
        await this.notificationService.sendWorkflowNotification(
          status === ScheduleStatus.ACTIVE ? EventType.PublisherActivate : EventType.PublisherDeactivate,
          user,
          data,
          user.token.tokenString,
        )
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
      const fileName = `de_${user.tenantId}_${id}`;

      const requiresExistingJob =
        status === JobStatus.APPROVED ||
        status === JobStatus.REVIEW ||
        status === JobStatus.REJECTED ||
        status === JobStatus.EXPORTED;

      let existingJob: Job | null = null;

      if (requiresExistingJob) {
        existingJob = await this.findOne(id, type, user.token.tokenString);
      }

      switch (status) {
        case JobStatus.REVIEW: {
          await this.notificationService.sendWorkflowNotification(
            EventType.EditorSubmit,
            user,
            { ...existingJob, status: JobStatus.REVIEW } as Job,
            user.token.tokenString,
          )
          break;
        }
        case JobStatus.APPROVED: {
          await this.notificationService.sendWorkflowNotification(
            EventType.ApproverApprove,
            user,
            { ...existingJob, status: JobStatus.APPROVED } as Job,
            user.token.tokenString,
          )
          break;
        }
        case JobStatus.REJECTED: {
          if (!reason) {
            throw new BadRequestException(
              'Rejection reason is required when rejecting a job.',
            );
          }

          await this.notificationService.sendWorkflowNotification(
            EventType.ApproverReject,
            user,
            { ...existingJob, status: JobStatus.REJECTED } as Job,
            user.token.tokenString,
          )
          break;
        }

        case JobStatus.EXPORTED: {

          await this.sftpService.createFile(fileName, {
            ...existingJob,
            status: JobStatus.READY,
          });
          await this.notificationService.sendWorkflowNotification(
            EventType.ExporterExport,
            user,
            { ...existingJob, status: JobStatus.EXPORTED } as Job,
            user.token.tokenString,
          )

          break;
        }

        case JobStatus.DEPLOYED: {
          const fileData = await this.sftpService.readFile(fileName);

          let deployPayload = { ...fileData, publishing_status: ScheduleStatus.ACTIVE };

          if (type === ConfigType.PULL) {
            const connection = { ...fileData.connection } as SFTPConnection;

            if (connection.auth_type === AuthType.USERNAME_PASSWORD && connection.password) {
              connection.password = decrypt(connection.password);
            } else connection.private_key &&= decrypt(connection.private_key);

            delete deployPayload.schedule_name;

            deployPayload = { ...deployPayload, connection };

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

          await this.notificationService.sendWorkflowNotification(
            EventType.PublisherDeploy,
            user,
            { ...fileData, status: JobStatus.DEPLOYED },
            user.token.tokenString,
          )

          return {
            success: true,
            message: `Job with id ${id} successfully deployed.`,
          };
        }
      }

      return await this.adminServiceClient.updateJobByStatus(
        id,
        status,
        user.tenantId,
        type,
        user.token.tokenString,
        reason,
      );
    } catch (error: unknown) {
      return this.handleError(error);
    }
  }

}
