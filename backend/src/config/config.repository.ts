// SPDX-License-Identifier: Apache-2.0
import { Injectable, Logger } from '@nestjs/common';
import { AdminServiceClient } from '../services/admin-service-client.service';
import { Config } from './config.interfaces';
import { ColumnDef } from '../utils/table-sql';

@Injectable()
export class ConfigRepository {
  private readonly logger = new Logger(ConfigRepository.name);

  constructor(private readonly adminServiceClient: AdminServiceClient) {}

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
      return await this.adminServiceClient.getConfigById(id, token ?? tenantId);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error finding config by ID ${id}: ${err.message}`);
      throw error;
    }
  }

  async findConfigByMsgFamVersionAndTransactionType(
    msgFam: string,
    version: string,
    transactionType: string,
    tenantId: string,
    token?: string,
  ): Promise<Config | null> {
    const result = await this.adminServiceClient.getAllConfigs(
      token ?? tenantId,
    );
    const match = result.configs.find(
      (c) =>
        c.msgFam === msgFam &&
        c.version === version &&
        c.transactionType === transactionType,
    );
    return match ?? null;
  }
  async getupdateConfigByStatus(
    id: number,
    status: string,
    token: string,
    comment?: string,
  ): Promise<Config | null> {
    return await this.adminServiceClient.updateConfigByStatus(
      id,
      status,
      token,
      comment,
    );
  }
  async updatePublishingStatus(
    id: number,
    publishingStatus: 'active' | 'inactive',
    token: string,
  ): Promise<any> {
    return await this.adminServiceClient.updatePublishingStatus(
      id,
      publishingStatus,
      token,
    );
  }

  async createDeployedConfig(configData: any, token: string): Promise<number> {
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
    await this.adminServiceClient.createTransactionTypeTable(
      transactionType,
      token,
    );
  }
  async createTazamaDataModelTable(
    tableName: string,
    columns: ColumnDef[],
    token: string,
  ): Promise<void> {
    await this.adminServiceClient.createTazamaDataModelTable(
      tableName,
      columns,
      token,
    );
  }
  async updateConfigStatus(
    id: number,
    status: string,
    token: string,
  ): Promise<void> {
    await this.adminServiceClient.writeConfigUpdate(id, { status }, token);
  }

  async getAllConfigsWithFilters(
    offset: number,
    limit: number,
    filters: Record<string, any>,
    token: string,
  ): Promise<Config[]> {
    return await this.adminServiceClient.getAllConfigsWithFilters(
      offset,
      limit,
      filters,
      token,
    );
  }

  async addMapping(id: number, mappingData: any, token: string): Promise<any> {
    return await this.adminServiceClient.addMapping(id, mappingData, token);
  }

  async removeMapping(id: number, index: number, token: string): Promise<any> {
    return await this.adminServiceClient.removeMapping(id, index, token);
  }

  async addFunction(
    id: number,
    functionData: any,
    token: string,
  ): Promise<any> {
    return await this.adminServiceClient.addFunction(id, functionData, token);
  }

  async removeFunction(id: number, index: number, token: string): Promise<any> {
    return await this.adminServiceClient.removeFunction(id, index, token);
  }

  async updateConfigViaWrite(
    id: number,
    updateData: any,
    token: string,
  ): Promise<any> {
    return await this.adminServiceClient.writeConfigUpdate(
      id,
      updateData,
      token,
    );
  }
}
