import {
  BadRequestException,
  ForbiddenException,
  Injectable
} from '@nestjs/common';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import {
  AuthType,
  ConfigType,
  ISuccess,
  Job,
  JobStatus,
  JobSummary,
  ScheduleStatus,
  SFTPConnection,
  SourceType
} from '@tazama-lf/tcs-lib';
import { AuthenticatedUser } from 'src/auth/auth.types';
import { v4 } from 'uuid';
import { DatabaseService } from '../database/database.service';
import { DryRunService } from '../dry-run/dry-run.service';
import { NotifyService } from '../notify/notify.service';
import { AdminServiceClient } from '../services/admin-service-client.service';
import { SftpService } from '../sftp/sftp.service';
import {
  decrypt,
  encrypt,
  validateFileType
} from '../utils/helpers';
import { CreatePullJobDto, SFTPConnectionDto } from './dto/create-pull-job.dto';
import { CreatePushJobDto } from './dto/create-push-job.dto';
import { UpdatePullJobDto } from './dto/update-pull-job.dto';
import { UpdatePushJobDto } from './dto/update-push-job.dto';

@Injectable()
export class JobService {
  constructor(
    private readonly db: DatabaseService,
    private readonly loggerService: LoggerService,
    private readonly dryRunService: DryRunService,
    private readonly sftpService: SftpService,
    private readonly notifyService: NotifyService,
    private readonly adminServiceClient: AdminServiceClient
  ) { }


  async updateJob(
    id: string,
    job: UpdatePushJobDto | UpdatePullJobDto,
    type: ConfigType,
    token: string
  ): Promise<ISuccess> {

    const existingJob = await this.findOne(id, ConfigType.PUSH, token);

    if (existingJob.status !== JobStatus.INPROGRESS) {
      throw new ForbiddenException('Only In-Progress jobs can be edited');
    }

    return await this.adminServiceClient.updateJob(id, job, type, token)
  }

  async createPush(
    job: CreatePushJobDto,
    tenantId: string,
    token: string,
    status: JobStatus = JobStatus.INPROGRESS,
  ): Promise<ISuccess> {
    try {

      await this.adminServiceClient.validateExisting(job.table_name, token);
      const id = job.id ?? v4();

      const path =
        status === JobStatus.DEPLOYED
          ? job.path
          : `/${tenantId}/enrichment/${job.version}/${job.path}`;

      const jobWithId = { ...job, id, path, tenant_id: tenantId, status };

      const { id: newId } = await this.adminServiceClient.createPushJob(jobWithId, token)


      if (!newId) {
        this.loggerService.error('Failed to create push job.');
        throw new Error('Failed to create push job.');
      }

      if (status === JobStatus.DEPLOYED) {
        await this.notifyService.notifyEnrichment(job.id, ConfigType.PUSH);
      }

      return {
        success: true,
        message: `Job with id ${id} successfully created`,
      };
    } catch (err) {
      this.loggerService.error(err.message);
      throw new BadRequestException(err.message);
    }
  }

  async createPull(
    job: CreatePullJobDto,
    tenantId: string,
    token: string,
    status: JobStatus = JobStatus.INPROGRESS,
  ): Promise<ISuccess> {
    try {
      await this.adminServiceClient.validateExisting(job.table_name, token);

      const exist = await this.adminServiceClient.findScheduleById(job.schedule_id, token)

      if (
        !exist ||
        (exist.status !== JobStatus.APPROVED &&
          exist.status !== JobStatus.EXPORTED &&
          exist.status !== JobStatus.DEPLOYED)
      ) {
        throw new BadRequestException(
          `Schedule with Id "${job.schedule_id}" not found or is not approved yet.`,
        );
      }

      let connection = job.connection;
      if (job.source_type === SourceType.SFTP) {
        validateFileType(job.file.path);
        const sftpConn = connection as SFTPConnectionDto;
        if (
          sftpConn.auth_type === AuthType.USERNAME_PASSWORD &&
          sftpConn.password
        ) {
          connection = {
            ...sftpConn,
            password: encrypt(sftpConn.password),
          };
        } else if (sftpConn.private_key) {
          connection = {
            ...sftpConn,
            private_key: encrypt(sftpConn.private_key),
          };
        }
      }
      await this.dryRunService.dryRun(job);

      const new_id = job.id ?? v4();

      const jobWithId = {
        ...job,
        id: new_id,
        connection,
        tenant_id: tenantId,
        status
      };

      const { id } = await this.adminServiceClient.createPullJob(jobWithId, token)

      if (status === JobStatus.DEPLOYED) {
        await this.notifyService.notifyEnrichment(new_id, ConfigType.PULL);
      }

      return {
        success: true,
        message: `Job with id ${id} successfully created`,
      };
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.loggerService.error(err.message);
        throw new BadRequestException(err.message);
      } else {
        this.loggerService.error(`${JSON.stringify(err)}`);
      }

      if (Array.isArray(err)) {
        const messages = err.flatMap((e) => Object.values(e.constraints ?? {}));
        throw new BadRequestException(messages);
      }

      throw new BadRequestException('Invalid request payload');
    }
  }

  async findAll(
    offset: string,
    limit: string,
    user: AuthenticatedUser,
    filters?: Record<string, unknown>,
  ): Promise<{}> {
    try {
      return await this.adminServiceClient.getAllJobs(offset, limit, user, filters)
    } catch (error) {
      this.loggerService.error(`Error fetching records: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string, type: ConfigType, token: string): Promise<Job> {
    try {
      if (!id || !type) {
        throw new BadRequestException('Both id and type are required.');
      }
      const tableName = type === ConfigType.PUSH ? 'endpoints' : 'job';

      const record = await this.adminServiceClient.findJobById(id, tableName, token)
      if (!record) {
        throw new BadRequestException(
          `${type === ConfigType.PUSH ? 'Endpoint' : 'Job'} with id ${id} not found.`,
        );
      }

      return record;
    } catch (err) {
      this.loggerService.error(`Error fetching ${type} record: ${err.message}`);
      throw err;
    }
  }

  async findByStatus(
    status: JobStatus,
    page: number,
    limit: number,
    tenantId: string,
    token: string
  ): Promise<JobSummary[]> {
    try {
      if (!tenantId || !status || !page || !limit) {
        throw new BadRequestException(
          'Tenant ID, status, page, and limit are required.',
        );
      }

      if (page < 1 || limit < 1) {
        throw new BadRequestException(
          'Page and limit must be positive integers.',
        );
      }

      return await this.adminServiceClient.findJobByStatus(tenantId, status, page, limit, token)

    } catch (err) {
      this.loggerService.error(
        `Error fetching records by status for tenant ${tenantId}: ${err.message}`,
      );
      throw new BadRequestException(err.message);
    }
  }


  async updateActivation(
    id: string,
    status: ScheduleStatus,
    table_name: string,
    token: string,
  ): Promise<ISuccess> {
    try {
      if (!status || !table_name) {
        throw new BadRequestException(
          'Both status and table_name are required.',
        );
      }
      const { success } = await this.adminServiceClient.updateJobActivation(id, status, table_name, token)

      if (success) {
        await this.notifyService.notifyEnrichment(id, ConfigType.PUSH);
      }

      return {
        success: true,
        message: `${table_name} with id ${id} successfully updated`,
      };
    } catch (err) {
      this.loggerService.error(
        `Error fetching records by status: ${err.message}`,
      );
      throw new BadRequestException(err.message);
    }
  }

  async updateStatus(
    id: string,
    status: JobStatus,
    type: ConfigType,
    tenantId: string,
    token: string,
    reason?: string
  ): Promise<ISuccess> {
    try {
      if (!status || !type) {
        throw new BadRequestException('Both status and type are required.');
      }

      const fileName = `de_${tenantId}_${id}`;

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
          const existingJob = await this.findOne(id, type, token);
          await this.sftpService.createFile(fileName, {
            ...existingJob,
            status: JobStatus.READY,
          });

          this.loggerService.log(
            `Successfully uploaded config file (${fileName}) on SFTP server.`,
          );
          break;
        }
        case JobStatus.DEPLOYED: {
          const existingJob = await this.sftpService.readFile(fileName);
          if (type === ConfigType.PULL) {
            const connection = { ...existingJob.connection } as SFTPConnection;

            if (
              connection.auth_type === AuthType.USERNAME_PASSWORD &&
              connection.password
            ) {
              connection.password = decrypt(connection.password);
            } else if (connection.private_key) {
              connection.private_key = decrypt(connection.private_key);
            }

            await this.createPull(
              {
                ...existingJob,
                connection,
                publishing_status: ScheduleStatus.ACTIVE,
              },
              tenantId,
              token,
              JobStatus.DEPLOYED,
            );
          } else {
            await this.createPush(
              { ...existingJob, publishing_status: ScheduleStatus.ACTIVE },
              tenantId,
              token,
              JobStatus.DEPLOYED,
            );
          }
          await this.sftpService.deleteFile(fileName);
          return {
            success: true,
            message: `$Job with id ${id} successfully deployed.`,
          };
        }

        default:
          break;
      }


      return await this.adminServiceClient.updateJobByStatus(id, status, tenantId, type, token, reason)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.loggerService.error(`${message}`);
      throw new BadRequestException(message);
    }
  }
}
