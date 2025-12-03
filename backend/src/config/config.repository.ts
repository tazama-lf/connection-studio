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
    return await this.adminServiceClient.runRawQuery(query, token);
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
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error finding config by msgFam/version/transactionType: ${err.message}`);
      throw error;
    }
  }
  async getupdateConfigByStatus(
    id: number,
    status: string,
    token: string,
    comment?: string,
  ): Promise<Config | null> {
    try {
      const result = await this.adminServiceClient.updateConfigByStatus(
        id,
        status,
        token,
        comment,
      );
      return result;
    } catch(error) {
      const err = error as Error;
      this.logger.error(`Error updating config status: ${err instanceof Error ? err.message : 'Unknown error'}`);
      throw new Error('Failed to update config status message: ' + err.message);
    }
  }

  // async findConfigByEndpoint(
  //   endpointPath: string,
  //   version: string,
  //   tenantId: string,
  //   token?: string,
  //   limit = 10,
  //   offset = 0,
  // ): Promise<Config[]> {
  //   try {
  //     const result = await this.adminServiceClient.getConfigByEndpoint(
  //       endpointPath,
  //       version,
  //       token || tenantId,
  //       limit,
  //       offset,
  //     );
  //     return result.configs;
  //   } catch {
  //     return [];
  //   }
  // }

  // async findConfigsByTenant(
  //   tenantId: string,
  //   token?: string,
  //   limit = 10,
  //   offset = 0,
  // ): Promise<Config[]> {
  //   try {
  //     const result = await this.adminServiceClient.getAllConfigs(
  //       token || tenantId,
  //       limit,
  //       offset,
  //     );
  //     return result.configs;
  //   } catch {
  //     return [];
  //   }
  // }

  // async findConfigsByTransactionType(
  //   transactionType: TransactionType,
  //   tenantId: string,
  //   token?: string,
  //   limit = 10,
  //   offset = 0,
  // ): Promise<Config[]> {
  //   try {
  //     const result = await this.adminServiceClient.getConfigsByTransactionType(
  //       transactionType,
  //       token || tenantId,
  //       limit,
  //       offset,
  //     );
  //     return result.configs;
  //   } catch {
  //     return [];
  //   }
  // }

  // async findConfigByVersionAndTransactionType(
  //   version: string,
  //   transactionType: string,
  //   tenantId: string,
  //   token?: string,
  // ): Promise<Config | null> {
  //   try {
  //     const result = await this.adminServiceClient.getAllConfigs(
  //       token || tenantId,
  //     );
  //     const match = result.configs.find(
  //       (c) => c.version === version && c.transactionType === transactionType,
  //     );
  //     return match || null;
  //   } catch {
  //     return null;
  //   }
  // }

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
    return await this.adminServiceClient.updatePublishingStatus(
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

  async getAllConfigsWithFilters(
    offset: number,
    limit: number,
    filters: Record<string, any>,
    token: string,
  ): Promise<Config[]> {
    return await this.adminServiceClient.forwardRequest(
      'POST',
      `/v1/admin/tcs/config/${offset}/${limit}`,
      filters,
      { Authorization: `Bearer ${token}` },
    );
  }

  // async getPendingApprovals(
  //   offset: number,
  //   limit: number,
  //   token: string,
  // ): Promise<any[]> {
  //   return await this.adminServiceClient.forwardRequest(
  //     'GET',
  //     `/v1/admin/tcs/config/pending-approvals/${offset}/${limit}`,
  //     undefined,
  //     { Authorization: `Bearer ${token}` },
  //   );
  // }

  async addMapping(
    id: number,
    mappingData: any,
    token: string,
  ): Promise<any> {
    return await this.adminServiceClient.forwardRequest(
      'POST',
      `/v1/admin/tcs/config/${id}/mapping`,
      mappingData,
      { Authorization: `Bearer ${token}` },
    );
  }

  async removeMapping(
    id: number,
    index: number,
    token: string,
  ): Promise<any> {
    return await this.adminServiceClient.forwardRequest(
      'DELETE',
      `/v1/admin/tcs/config/${id}/mapping/${index}`,
      undefined,
      { Authorization: `Bearer ${token}` },
    );
  }

  async addFunction(
    id: number,
    functionData: any,
    token: string,
  ): Promise<any> {
    return await this.adminServiceClient.forwardRequest(
      'POST',
      `/v1/admin/tcs/config/${id}/function`,
      functionData,
      { Authorization: `Bearer ${token}` },
    );
  }

  async removeFunction(
    id: number,
    index: number,
    token: string,
  ): Promise<any> {
    return await this.adminServiceClient.forwardRequest(
      'DELETE',
      `/v1/admin/tcs/config/${id}/function/${index}`,
      undefined,
      { Authorization: `Bearer ${token}` },
    );
  }

  async updateFunction(
    id: number,
    index: number,
    functionData: any,
    token: string,
  ): Promise<any> {
    return await this.adminServiceClient.forwardRequest(
      'PUT',
      `/v1/admin/tcs/config/${id}/function/${index}`,
      functionData,
      { Authorization: `Bearer ${token}` },
    );
  }

  // async returnToProgress(
  //   id: number,
  //   data: any,
  //   token: string,
  // ): Promise<any> {
  //   return await this.adminServiceClient.forwardRequest(
  //     'POST',
  //     `/v1/admin/tcs/config/${id}/workflow/return-to-progress`,
  //     data,
  //     { Authorization: `Bearer ${token}` },
  //   );
  // }

  // async getWorkflowStatus(
  //   id: number,
  //   token: string,
  // ): Promise<any> {
  //   return await this.adminServiceClient.forwardRequest(
  //     'GET',
  //     `/v1/admin/tcs/config/${id}/workflow/status`,
  //     undefined,
  //     { Authorization: `Bearer ${token}` },
  //   );
  // }

  // async getAuditHistory(
  //   id: number,
  //   token: string,
  // ): Promise<any> {
  //   return await this.adminServiceClient.forwardRequest(
  //     'GET',
  //     `/v1/admin/tcs/config/${id}/audit-history`,
  //     undefined,
  //     { Authorization: `Bearer ${token}` },
  //   );
  // }

  // async updateStatusDirect(
  //   id: number,
  //   status: string,
  //   token: string,
  // ): Promise<any> {
  //   return await this.adminServiceClient.forwardRequest(
  //     'PATCH',
  //     `/v1/admin/tcs/config/${id}/status`,
  //     { status },
  //     { Authorization: `Bearer ${token}` },
  //   );
  // }

  async updateConfigViaWrite(
    id: number,
    updateData: any,
    token: string,
  ): Promise<any> {
    return await this.adminServiceClient.forwardRequest(
      'PUT',
      `/v1/admin/tcs/config/${id}/write`,
      updateData,
      { Authorization: `Bearer ${token}` },
    );
  }

  async deleteConfigViaWrite(
    id: number,
    token: string,
  ): Promise<void> {
    await this.adminServiceClient.forwardRequest(
      'DELETE',
      `/v1/admin/tcs/config/${id}/write`,
      undefined,
      { Authorization: `Bearer ${token}` },
    );
  }
}
