import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import {
  AuthType,
  ConfigType,
  ISuccess,
  JobStatus,
  ScheduleStatus,
  SFTPConnection,
  SourceType
} from '@tazama-lf/tcs-lib';
import { v4 } from 'uuid';
import { DatabaseService } from '../database/database.service';
import { DryRunService } from '../dry-run/dry-run.service';
import { NotifyService } from '../notify/notify.service';
import { SftpService } from '../sftp/sftp.service';
import {
  decrypt,
  encrypt,
  validateFileType,
  validateTableName,
} from '../utils/helpers';
import { CreatePullJobDto, SFTPConnectionDto } from './dto/create-pull-job.dto';
import { CreatePushJobDto } from './dto/create-push-job.dto';
import { UpdatePullJobDto } from './dto/update-pull-job.dto';
import { UpdatePushJobDto } from './dto/update-push-job.dto';
import { type EndpointJobRecord } from './types/job.interface';

@Injectable()
export class JobService {
  constructor(
    private readonly db: DatabaseService,
    private readonly loggerService: LoggerService,
    private readonly dryRunService: DryRunService,
    private readonly sftpService: SftpService,
    private readonly notifyService: NotifyService,
  ) { }

  async validateExisting(table_name: string): Promise<void> {
    validateTableName(table_name);
    const jobResult = await this.db.query(
      'SELECT * FROM job WHERE table_name = $1 LIMIT 1;',
      [table_name],
    );
    const endpointResult = await this.db.query(
      'SELECT * FROM endpoints WHERE table_name = $1 LIMIT 1;',
      [table_name],
    );

    const existingJob = jobResult.rows[0] || endpointResult.rows[0];
    const exists = (await this.db.tableExist(table_name)) || existingJob;
    if (exists) {
      this.loggerService.error('Table Already Exists');
      throw new BadRequestException('Table Already Exists');
    }
  }

  async updateJob(
    id: string,
    job: UpdatePushJobDto | UpdatePullJobDto,
    type: ConfigType,
  ): Promise<ISuccess> {
    const tableName = type === ConfigType.PUSH ? 'endpoints' : 'job';

    const existingJob = await this.findOne(id, ConfigType.PUSH);

    if (existingJob.status !== JobStatus.INPROGRESS) {
      throw new ForbiddenException('Only In-Progress jobs can be edited');
    }

    const keys = Object.keys(job);
    const values = Object.values(job);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    const query = `UPDATE ${tableName} SET ${setClause} WHERE id = $${keys.length + 1};`;

    const result = await this.db.query(query, [...values, id]);

    if (!result.rowCount) {
      throw new NotFoundException(
        `${type} Job with id ${id} not found or no changes were made`,
      );
    }

    return {
      success: true,
      message: `Job with id ${id} successfully updated`,
    };
  }

  async createPush(
    job: CreatePushJobDto,
    tenantId: string,
    status: JobStatus = JobStatus.INPROGRESS,
  ): Promise<ISuccess> {
    try {

      await this.validateExisting(job.table_name);
      const id = job.id ?? v4();

      const path =
        status === JobStatus.DEPLOYED
          ? job.path
          : `/${tenantId}/enrichment/${job.version}${job.path}`;

      const jobWithId = { ...job, id, path, tenant_id: tenantId, status };

      const keys = Object.keys(jobWithId);
      const values = Object.values(jobWithId);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

      const insertQuery = `
                    INSERT INTO endpoints (${keys.join(', ')})
                     VALUES (${placeholders})
                      RETURNING *;
                      `;

      const insertRes = await this.db.query(insertQuery, values);
      const newJob = insertRes.rows[0];

      if (!newJob) {
        this.loggerService.error('Failed to create push job.');
        throw new Error('Failed to create push job.');
      }

      if (status === JobStatus.DEPLOYED) {
        await this.notifyService.notifyEnrichment(job.id, ConfigType.PUSH);
      }

      return {
        success: true,
        message: `Job with id ${id} successfully updated`,
      };
    } catch (err) {
      this.loggerService.error(err.message);
      throw new BadRequestException(err.message);
    }
  }

  async createPull(
    job: CreatePullJobDto,
    tenantId: string,
    status: JobStatus = JobStatus.INPROGRESS,
  ): Promise<ISuccess> {
    try {
      await this.validateExisting(job.table_name);

      const checkScheduleQuery = `
                 SELECT * 
                  FROM schedule 
                     WHERE id = $1 
                         LIMIT 1;
                     `;

      const scheduleResult = await this.db.query(checkScheduleQuery, [
        job.schedule_id,
      ]);
      const exist = scheduleResult.rows[0];
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

      const keys = Object.keys(jobWithId);
      const values = Object.values(jobWithId);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

      const insertQuery = `
                 INSERT INTO job (${keys.join(', ')})
                  VALUES (${placeholders})
                  RETURNING *;
                     `;
      const insertResult = await this.db.query(insertQuery, values);
      const { id } = insertResult.rows[0];

      if (status === JobStatus.DEPLOYED) {
        await this.notifyService.notifyEnrichment(new_id, ConfigType.PUSH);
      }

      return {
        success: true,
        message: `Job with id ${id} successfully updated`,
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
    page: number,
    limit: number,
    tenantId: string
  ): Promise<EndpointJobRecord[]> {
    try {
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
      const query = `
      SELECT 
        id,
        endpoint_name,
        path,
        mode,
        table_name,
        description,
        version,
        status,
        publishing_status,
        created_at,
        'push' AS type
      FROM endpoints
      WHERE tenant_id = $3

      UNION ALL

      SELECT 
        id,
        endpoint_name,
        NULL AS path,
        mode,
        table_name,
        description,
        version,
        status,
        publishing_status,
        created_at,
        'pull' AS type
      FROM job
      WHERE tenant_id = $3

      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2;
    `;

      const result = await this.db.query(query, [limit, offset, tenantId]);
      return result.rows as EndpointJobRecord[];
    } catch (error) {
      this.loggerService.error(`Error fetching records: ${error.message}`);
      throw error;
    }
  }



  async findOne(id: string, type: ConfigType) {
    try {
      if (!id || !type) {
        throw new BadRequestException('Both id and type are required.');
      }
      const tableName = type === ConfigType.PUSH ? 'endpoints' : 'job';

      const query = `SELECT * FROM ${tableName} WHERE id = $1 LIMIT 1;`;
      const result = await this.db.query(query, [id]);

      const record = result.rows[0];
      if (!record) {
        throw new BadRequestException(
          `${type === ConfigType.PUSH ? 'Endpoint' : 'Job'} with id ${id} not found.`,
        );
      }

      if (tableName === 'job' && record.schedule_id) {
        const scheduleQuery =
          'SELECT name, cron FROM schedule WHERE id = $1 LIMIT 1;';
        const scheduleResult = await this.db.query(scheduleQuery, [
          record.schedule_id,
        ]);
        const schedule = scheduleResult.rows[0] || null;

        return {
          ...record,
          schedule,
        };
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
  ): Promise<[]> {
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

      const offset = (page - 1) * limit;

      const query = `
      (
        SELECT 
          id,
          endpoint_name,
          path,
          mode,
          table_name,
          description,
          version,
          status,
          publishing_status,
          created_at,
          'push' AS type
        FROM endpoints
        WHERE tenant_id = $1
          AND status = $2
      )
      UNION ALL
      (
        SELECT 
          id,
          endpoint_name,
          NULL AS path,
          mode,
          table_name,
          description,
          version,
          status,
          publishing_status,
          created_at,
          'pull' AS type
        FROM job
        WHERE tenant_id = $1
          AND status = $2
      )
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4;
    `;

      const result = await this.db.query(query, [tenantId, status, limit, offset]);
      return result.rows;
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

  ): Promise<ISuccess> {
    try {
      if (!status || !table_name) {
        throw new BadRequestException(
          'Both status and table_name are required.',
        );
      }



      const query = `
                 UPDATE ${table_name}
                 SET publishing_status = $1, updated_at = NOW()
                 WHERE id = $2
                 RETURNING *;
                    `;

      const result = await this.db.query(query, [status, id]);

      if (result.rowCount === 0) {
        throw new NotFoundException(
          `Record with id "${id}" not found in table "${table_name}".`,
        );
      }

      await this.notifyService.notifyEnrichment(id, ConfigType.PUSH);

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
          const existingJob = await this.findOne(id, type);
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

            const { schedule, ...jobPayload } = existingJob;

            await this.createPull(
              {
                ...jobPayload,
                connection,
                publishing_status: ScheduleStatus.ACTIVE,
              },
              tenantId,
              JobStatus.DEPLOYED,
            );
          } else {
            await this.createPush(
              { ...existingJob, publishing_status: ScheduleStatus.ACTIVE },
              tenantId,
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

      const tableName = type === ConfigType.PUSH ? 'endpoints' : 'job';
      const updateQuery =
        status === JobStatus.REJECTED
          ? `
          UPDATE ${tableName}
          SET status = $1, comments = $2, updated_at = NOW()
          WHERE id = $3
          RETURNING id;
        `
          : `
          UPDATE ${tableName}
          SET status = $1, updated_at = NOW()
          WHERE id = $2
          RETURNING id;
        `;

      const params =
        status === JobStatus.REJECTED ? [status, reason, id] : [status, id];

      const result = await this.db.query(updateQuery, params);


      if (!result.rowCount) {
        throw new NotFoundException(
          `Record with id "${id}" not found in table "${tableName}".`,
        );
      }

      return {
        success: true,
        message: `${tableName} with id ${id} successfully updated.`,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.loggerService.error(`${message}`);
      throw new BadRequestException(message);
    }
  }
}
