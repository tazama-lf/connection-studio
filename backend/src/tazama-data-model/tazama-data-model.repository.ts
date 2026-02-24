import { Injectable } from '@nestjs/common';
import { AdminServiceClient } from '../services/admin-service-client.service';


@Injectable()
export class TazamaDataModelRepository {
  constructor(private readonly adminServiceClient: AdminServiceClient) { }


  async getDataModelJson(
    tenantId: string,
    token: string,
  ): Promise<Record<string, unknown> | null> {
    const response = await this.adminServiceClient.getDataModelJson(
      tenantId,
      token,
    );
    return response.data ?? null;
  }

  async putDataModelJson(
    tenantId: string,
    dataModelJson: Record<string, unknown>,
    token: string,
  ): Promise<{ tenant_id: string; updated_at: string }> {
    const response = await this.adminServiceClient.putDataModelJson(
      tenantId,
      dataModelJson,
      token,
    );
    return response.data;
  }
}
