// SPDX-License-Identifier: Apache-2.0
import { Injectable, Logger } from '@nestjs/common';
import { AdminServiceClient } from '../services/admin-service-client.service';
import { Config, TransactionType } from './config.interfaces';
import { ColumnDef, createTableSQL } from 'src/utils/table-sql';

@Injectable()
export class ConfigRepository {
  private readonly logger = new Logger(ConfigRepository.name);

  constructor(private readonly adminServiceClient: AdminServiceClient) {}

  async runRawQuery(query: string, token: string): Promise<any> {
    this.logger.log('Executing raw SQL query via admin-service');
    return this.adminServiceClient.runRawQuery(query, token);
  }

  async createConfig(
    configData: Omit<Config, 'id' | 'createdAt' | 'updatedAt'>,
    token: string,
  ): Promise<number> {
    const result = await this.adminServiceClient.writeConfig(
      configData as any,
      token,
    );
    if (!result?.id) {
      throw new Error('Failed to create config: no ID returned');
    }
    return result.id;
  }

  async findConfigById(
    id: number,
    tenantId: string,
    token?: string,
  ): Promise<Config | null> {
    try {
      return await this.adminServiceClient.getConfigById(id, token || tenantId);
    } catch {
      return null;
    }
  }

  async findConfigByMsgFamVersionAndTransactionType(
    msgFam: string,
    version: string,
    transactionType: string,
    tenantId: string,
    token?: string,
  ): Promise<Config | null> {
    try {
      const result = await this.adminServiceClient.getAllConfigs(
        token || tenantId,
      );
      const match = result.configs.find(
        (c) =>
          c.msgFam === msgFam &&
          c.version === version &&
          c.transactionType === transactionType,
      );
      return match || null;
    } catch {
      return null;
    }
  }
  async getupdateConfigByStatus(
    id: number,
    status: string,
    token: string,
  ): Promise<Config | null> {
    try {
      const result = await this.adminServiceClient.updateConfigByStatus(
        id,
        status,
        token,
      );
      return result;
    } catch(error) {
      const err = error as Error;
      this.logger.error(`Error updating config status: ${err instanceof Error ? err.message : 'Unknown error'}`);
      throw new Error('Failed to update config status message: ' + err.message);
    }
  }

  async findConfigByEndpoint(
    endpointPath: string,
    version: string,
    tenantId: string,
    token?: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<Config[]> {
    try {
      const result = await this.adminServiceClient.getConfigByEndpoint(
        endpointPath,
        version,
        token || tenantId,
        limit,
        offset,
      );
      return result.configs;
    } catch {
      return [];
    }
  }

  async findConfigsByTenant(
    tenantId: string,
    token?: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<Config[]> {
    try {
      const result = await this.adminServiceClient.getAllConfigs(
        token || tenantId,
        limit,
        offset,
      );
      return result.configs;
    } catch {
      return [];
    }
  }

  async findConfigsByTransactionType(
    transactionType: TransactionType,
    tenantId: string,
    token?: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<Config[]> {
    try {
      const result = await this.adminServiceClient.getConfigsByTransactionType(
        transactionType,
        token || tenantId,
        limit,
        offset,
      );
      return result.configs;
    } catch {
      return [];
    }
  }

  async findConfigByVersionAndTransactionType(
    version: string,
    transactionType: string,
    tenantId: string,
    token?: string,
  ): Promise<Config | null> {
    try {
      const result = await this.adminServiceClient.getAllConfigs(
        token || tenantId,
      );
      const match = result.configs.find(
        (c) => c.version === version && c.transactionType === transactionType,
      );
      return match || null;
    } catch {
      return null;
    }
  }

  async updateConfig(
    id: number,
    tenantId: string,
    updateData: Partial<Config>,
    token: string,
  ): Promise<void> {
    await this.adminServiceClient.writeConfigUpdate(id, updateData, token);
  }
  async updatePublishingStatus(
    id: number,
    publishingStatus: 'active' | 'inactive',
    token: string,
  ): Promise<any> {
    return this.adminServiceClient.updatePublishingStatus(
      id,
      publishingStatus,
      token,
    );
  }

  async deleteConfig(
    id: number,
    tenantId: string,
    token: string,
  ): Promise<void> {
    await this.adminServiceClient.writeConfigDelete(id, token);
  }

  async createDeployedConfig(configData: any, token: string): Promise<number> {
    this.logger.log('Creating deployed config via admin-service');
    const result = await this.adminServiceClient.writeConfig(configData, token);
    if (!result?.id) {
      throw new Error('Failed to create deployed config: no ID returned');
    }
    return result.id;
  }

  async createTransactionTypeTable(
    transactionType: string,
    token: string,
  ): Promise<void> {
    this.logger.log(`Creating table for transaction type: ${transactionType}`);
    const createTableQuery = `CREATE TABLE IF NOT EXISTS "${transactionType}" (
  id SERIAL PRIMARY KEY,
  document JSONB NOT NULL
);`;
    await this.adminServiceClient.runRawQuery(createTableQuery, token);
  }
  async createTazamaDataModelTable(
    tableName: string,
    columns: ColumnDef[],

    token: string,
  ): Promise<void> {

   const createTableQuery = createTableSQL( tableName, columns);
  this.logger.log(`Creating table for TazamaDataModel type: ${tableName} with query: ${createTableQuery}`);
  await this.adminServiceClient.runRawQuery(createTableQuery, token);
}
  async updateConfigStatus(
    id: number,
    status: string,
    token: string,
  ): Promise<void> {
    this.logger.log(`Updating config ${id} status to ${status}`);
    await this.adminServiceClient.writeConfigUpdate(id, { status }, token);
  }
}
