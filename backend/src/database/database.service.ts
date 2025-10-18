import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
    private pool: Pool;

    constructor() {
        this.pool = new Pool({
            connectionString: process.env.CONFIGURATION_DATABASE_URL,
            max: 10,
        });
    }

    async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
        const result = await this.pool.query(sql, params);
        return result;
    }

    async onModuleDestroy() {
        await this.pool.end();
    }
}
