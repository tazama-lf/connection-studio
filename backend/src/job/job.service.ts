import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { DatabaseService } from 'src/database/database.service';
import { validateTableName } from 'src/utils/helpers';
import { ConfigType, ISuccess } from 'src/utils/interfaces';
import { v4 } from 'uuid';
import { CreatePushJobDto } from './dto/create-push-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
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

            const checkQuery = `SELECT * FROM endpoints WHERE path = $1 LIMIT 1;`;
            const existingRes = await this.db.query(checkQuery, [job.path]);
            const existing = existingRes.rows[0];

            if (existing) {
                throw new BadRequestException(`Endpoint "${job.path}" already exists.`);
            }


            let path = `/tcs/${job.version}/${tenantId}/enrichment${job.path}`;
            const jobWithId = { ...job, id: v4(), path };
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
            return newJob;
        } catch (err) {
            this.loggerService.error(err.message);
            throw new BadRequestException(err.message);
        }
    }


    async findAll(page: number, limit: number) {
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

        const result = await this.db.query(query, [limit, offset]);

        return result.rows
    }

    async findOne(id: string, type: ConfigType) {
        try {
            if (!id || !type) {
                throw new BadRequestException('Both id and type are required.');
            }
            const tableName =
                type === ConfigType.PUSH
                    ? 'endpoints'
                    : 'job'

            const query = `SELECT * FROM ${tableName} WHERE id = $1 LIMIT 1;`;
            const result = await this.db.query(query, [id.trim()]);

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


    async updatePush(id: string, attr: UpdateJobDto): Promise<ISuccess> {
        try {

            const job = await this.findOne(id, attr.type)

            const keys = Object.keys(attr);
            const values = Object.values(attr);
            const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
            const query = `UPDATE endpoints SET ${setClause} WHERE id = $${keys.length + 1};`;

            const result = await this.db.query(query, [...values, id]);
            const updatedRows = result.rowCount;

            if (!updatedRows) {
                throw new NotFoundException(`Endpoint with id ${id} not found or no changes were made`);
            }

            return {
                success: true,
                message: `Endpoint with id ${id} successfully cloned`,
            }
        } catch (err) {
            this.loggerService.error(`Error updating endpoint: ${err.message}`);
            throw err;
        }
    }

}
