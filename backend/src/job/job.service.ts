import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import {
  AuthType,
  ConfigType,
  ISuccess,
  Job,
  JobStatus,
  ScheduleStatus,
  SFTPConnection,
  SourceType
} from '@tazama-lf/tcs-lib';
import { SftpService } from 'src/sftp/sftp.service';
import { v4 } from 'uuid';
import { DatabaseService } from '../database/database.service';
import { DryRunService } from '../dry-run/dry-run.service';
import { encrypt, validateFileType, validateTableName } from '../utils/helpers';
import { CreatePullJobDto, SFTPConnectionDto } from './dto/create-pull-job.dto';
import { CreatePushJobDto } from './dto/create-push-job.dto';

@Injectable()
export class JobService {
  constructor(
    private readonly db: DatabaseService,
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
    private readonly dryRunService: DryRunService,
    private readonly sftpService: SftpService,
  ) { }

  async validateExisting(table_name: string): Promise<void> {
    validateTableName(table_name);
    const result = await this.db.query(
      'SELECT * FROM job WHERE table_name = $1 LIMIT 1;',
      [table_name],
    );

    const existingJob = result.rows[0] || null;
    const exists = (await this.db.tableExist(table_name)) || existingJob;
    if (exists) {
      this.loggerService.error('Table Already Exists');
      throw new BadRequestException('Table Already Exists');
    }
  }

  async createPush(job: CreatePushJobDto, tenantId: string): Promise<Job> {
    try {
      await this.validateExisting(job.table_name);

      const path = `/tcs/${job.version}/${tenantId}/enrichment${job.path}`;

      const jobWithId = { ...job, id: v4(), path, tenant_id: tenantId };
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
      const { tenant_id, ...safeJob } = newJob;
      return safeJob;
    } catch (err) {
      this.loggerService.error(err.message);
      throw new BadRequestException(err.message);
    }
  }

  async createPull(job: CreatePullJobDto, tenantId: string): Promise<ISuccess> {
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
      if (!exist) {
        throw new BadRequestException(
          `Schedule Id "${job.schedule_id}" not found`,
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

      const jobWithId = { ...job, id: v4(), connection, tenant_id: tenantId };
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

      return {
        success: true,
        message: `Job with id ${id} successfully updated`,
      }
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

  async findAll(page: number, limit: number, tenantId: string) {
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
        record_status,
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
        record_status,
        created_at,
        'pull' AS type
      FROM job

      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2;
    `;

    const result = await this.db.query(query, [limit, offset, tenantId]);

    return result.rows;
  }

  async findOne(id: string, type: ConfigType, tenantId: string) {
    try {
      if (!id || !type) {
        throw new BadRequestException('Both id and type are required.');
      }
      const tableName = type === ConfigType.PUSH ? 'endpoints' : 'job';

      const query = `SELECT * FROM ${tableName} WHERE id = $1 AND tenant_id = $2 LIMIT 1;`;
      const result = await this.db.query(query, [id.trim(), tenantId.trim()]);

      const record = result.rows[0];
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
  ): Promise<[]> {
    try {
      if (!status || !page || !limit) {
        throw new BadRequestException('Status, page, and limit are required.');
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
          record_status,
          created_at,
          'push' AS type
        FROM endpoints
        WHERE status = $1
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
          record_status,
          created_at,
          'pull' AS type
        FROM job
      )
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;
    `;

      const result = await this.db.query(query, [status, limit, offset]);
      return result.rows;
    } catch (err) {
      this.loggerService.error(
        `Error fetching records by status: ${err.message}`,
      );
      throw new BadRequestException(err.message);
    }
  }

  async updateActivation(id: string, status: ScheduleStatus, table_name: string): Promise<ISuccess> {
    try {
      if (!status || !table_name) {
        throw new BadRequestException('Both status and table_name are required.');
      }

      const query = `
                 UPDATE ${table_name}
                 SET record_status = $1, updated_at = NOW()
                 WHERE id = $2
                 RETURNING *;
                    `;

      const result = await this.db.query(query, [status, id]);

      if (result.rowCount === 0) {
        throw new NotFoundException(
          `Record with id "${id}" not found in table "${table_name}".`,
        );
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
  ): Promise<ISuccess> {
    try {
      if (!status || !type) {
        throw new BadRequestException('Both status and type are required.');
      }

      const table_name = type === ConfigType.PUSH ? 'endpoints' : 'job';

      const existingSchedule = await this.findOne(id, type, tenantId);

      if (existingSchedule.status === JobStatus.APPROVED) {
        throw new ForbiddenException(
          'Approved job cannot be edited. Please create a new job instead.',
        );
      }

      if (status === JobStatus.EXPORTED) {
        const nodeEnv = this.configService.get<string>('NODE_ENV');
        const sftpHost = this.configService.get<string>('SFTP_HOST_CONSUMER');

        if (nodeEnv !== 'dev') {
          throw new BadRequestException(
            `Exported status can only be set in the dev environment.`,
          );
        }

        if (!sftpHost) {
          throw new BadRequestException(`Consumer SFTP server credentials not provided.`);
        }

        const fileName = `/upload/${nodeEnv}_de_${tenantId}_${id}.json`;

        await this.sftpService.createFile(fileName, existingSchedule);

        this.loggerService.log(
          `Successfully uploaded config file (${fileName}) on SFTP server.`,
        );
      }

      const query = `
      UPDATE ${table_name}
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `;

      const result = await this.db.query(query, [status, id]);

      if (result.rowCount === 0) {
        throw new NotFoundException(
          `Record with id "${id}" not found in table "${table_name}".`,
        );
      }

      return {
        success: true,
        message: `${table_name} with id ${id} successfully updated`,
      };
    } catch (err) {
      this.loggerService.error(
        `Error updating job status: ${err instanceof Error ? err.message : err}`,
      );
      throw new BadRequestException(err.message);
    }
  }
}
