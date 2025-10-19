import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { DatabaseService } from '../database/database.service';
import { validateTableName } from '../utils/helpers';
import { ConfigType, ISuccess, JobStatus, ScheduleStatus } from '../utils/interfaces';
import { v4 } from 'uuid';
import { CreatePushJobDto } from './dto/create-push-job.dto';
import { Job } from './types/interface';

@Injectable()
export class JobService {

    constructor(
        private readonly db: DatabaseService,
        private readonly loggerService: LoggerService,
    ) { }


    async validateExisting(table_name: string): Promise<void> {
        validateTableName(table_name);
        const result = await this.db.query(
            `SELECT * FROM job WHERE table_name = $1 LIMIT 1;`,
            [table_name]
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

            let path = `/tcs/${job.version}/${tenantId}/enrichment${job.path}`;
            const existing = await this.findByPathAndVersion(path, tenantId, job.version, 'endpoints')
            if (existing.length) {
                throw new Error(`Path ${job.path} with given version ${job.version} already exits`)
            }

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


    async findAll(page: number, limit: number, tenantId: string) {
        if (!Number.isInteger(page) || !Number.isInteger(limit) || page < 1 || limit < 1) {
            throw new BadRequestException('Page and limit must be positive integers.');
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
        NULL AS status,
        created_at,
        'pull' AS type
      FROM job

      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2;
    `;

        const result = await this.db.query(query, [limit, offset, tenantId]);

        return result.rows
    }

    async findOne(id: string, type: ConfigType, tenantId: string) {
        try {
            if (!id || !type) {
                throw new BadRequestException('Both id and type are required.');
            }
            const tableName =
                type === ConfigType.PUSH
                    ? 'endpoints'
                    : 'job'

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
    ): Promise<any[]> {

        try {
            if (!status || !page || !limit) {
                throw new BadRequestException('Status, page, and limit are required.');
            }

            if (page < 1 || limit < 1) {
                throw new BadRequestException('Page and limit must be positive integers.');
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
          NULL AS status,
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
            this.loggerService.error(`Error fetching records by status: ${err.message}`);
            throw new BadRequestException(err.message);
        }
    }

    async findByPathAndVersion(path: string, tenantId: string, version: string, table_name: string) {
        try {

            if (!path || !tenantId) {
                throw new BadRequestException('Both path and tenantId are required.');
            }

            const query = `
      SELECT *
      FROM ${table_name}
      WHERE path = $1
        AND version = $2
        AND tenant_id = $3
      ORDER BY created_at DESC;
    `;

            const result = await this.db.query(query, [path.trim(), version.trim(), tenantId.trim()]);
            const record = result.rows;

            if (!record) {
                throw new NotFoundException(`Endpoint with path "${path}" not found for tenant ${tenantId}.`);
            }

            const filteredRecords = record.map(({ tenant_id, ...rest }) => rest);

            return filteredRecords;
        } catch (err) {
            this.loggerService.error(`Error fetching endpoint by path: ${err.message}`);
            throw new BadRequestException(err.message);
        }
    }

    async updateActivation(id: string, status: ScheduleStatus, table_name: string): Promise<ISuccess> {
        try {
            if (!id || !status || !table_name) {
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
                throw new NotFoundException(`Record with id "${id}" not found in table "${table_name}".`);
            }

            return {
                success: true,
                message: `${table_name} with id ${id} successfully updated`,
            }
        } catch (err) {
            this.loggerService.error(`Error fetching records by status: ${err.message}`);
            throw new BadRequestException(err.message);
        }
    }
    async updateStatus(id: string, status: JobStatus, table_name: string): Promise<ISuccess> {
        try {
            if (!id || !status || !table_name) {
                throw new BadRequestException('Both status and table_name are required.');
            }

            const query = `
      UPDATE ${table_name}
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `;

            const result = await this.db.query(query, [status, id]);

            if (result.rowCount === 0) {
                throw new NotFoundException(`Record with id "${id}" not found in table "${table_name}".`);
            }

            return {
                success: true,
                message: `${table_name} with id ${id} successfully updated`,
            }
        } catch (err) {
            this.loggerService.error(`Error fetching records by status: ${err.message}`);
            throw new BadRequestException(err.message);
        }
    }

}
