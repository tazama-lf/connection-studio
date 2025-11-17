import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResult } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private pool: Pool;

  constructor(private readonly configService: ConfigService) {
    this.pool = new Pool({
      connectionString: process.env.CONFIGURATION_DATABASE_URL,
      max: 10,
    });
  }

  async query(sql: string, params?: unknown[]): Promise<QueryResult<any>> {
    const result = await this.pool.query(sql, params);
    return result;
  }

  async tableExist(tableName: string): Promise<boolean> {
    const cleanName = tableName.trim().toLowerCase();
    const query = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    ) AS exists;
  `;

    const result = await this.pool.query(query, [cleanName]);
    return result.rows[0]?.exists || false;
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
