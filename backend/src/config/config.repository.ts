// SPDX-License-Identifier: Apache-2.0
import { Injectable, Logger } from '@nestjs/common';
import { AdminServiceClient } from '../services/admin-service-client.service';
import { Config, TransactionType } from './config.interfaces';

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
      // If token is provided, use authenticated call; otherwise use tenantId (for backwards compatibility)
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
      const allConfigs = await this.adminServiceClient.getAllConfigs(
        token || tenantId,
      );
      const match = allConfigs.find(
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

  async findConfigByEndpoint(
    endpointPath: string,
    version: string,
    tenantId: string,
    token?: string,
  ): Promise<Config | null> {
    try {
      return await this.adminServiceClient.getConfigByEndpoint(
        endpointPath,
        version,
        token || tenantId,
      );
    } catch {
      return null;
    }
  }

  async findConfigsByTenant(
    tenantId: string,
    token?: string,
  ): Promise<Config[]> {
    try {
      return await this.adminServiceClient.getAllConfigs(token || tenantId);
    } catch {
      return [];
    }
  }

  async findConfigsByTransactionType(
    transactionType: TransactionType,
    tenantId: string,
    token?: string,
  ): Promise<Config[]> {
    try {
      return await this.adminServiceClient.getConfigsByTransactionType(
        transactionType,
        token || tenantId,
      );
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
      const allConfigs = await this.adminServiceClient.getAllConfigs(
        token || tenantId,
      );
      const match = allConfigs.find(
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
}
