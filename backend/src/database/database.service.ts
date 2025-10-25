import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResult } from 'pg';
import SFTPClient from 'ssh2-sftp-client';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private pool: Pool;

  constructor(private readonly configService: ConfigService) {
    this.pool = new Pool({
      connectionString: process.env.CONFIGURATION_DATABASE_URL,
      max: 10,
    });
  }

  async query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
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

  async getConfigFile() {
    const sftp = new SFTPClient();
    await sftp.connect({
      host: this.configService.get<string>('SFTP_HOST_TEST'),
      port: this.configService.get<number>('SFTP_PORT_TEST'),
      username: this.configService.get<string>('SFTP_USERNAME_TEST'),
      password: this.configService.get<string>('SFTP_PASSWORD_TEST'),
    });

    const remotePath = '/upload/config.json';
    const fileExists = await sftp.exists(remotePath);

    let config = {};

    if (fileExists) {
      const fileContent = await sftp.get(remotePath);
      const rawData = fileContent.toString();
      config = JSON.parse(rawData);
    }
    return config;
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
