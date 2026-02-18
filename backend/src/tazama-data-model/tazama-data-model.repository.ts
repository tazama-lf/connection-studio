import { Injectable } from '@nestjs/common';
import { AdminServiceClient } from '../services/admin-service-client.service';
import { TazamaCollectionSchema } from './tazama-data-model.interfaces';
import {
  CreateDestinationTypeDto,
  CreateFieldDto,
  DestinationTypeResponse,
  FieldResponse,
} from './tazama-data-model.dto';

@Injectable()
export class TazamaDataModelRepository {
  constructor(private readonly adminServiceClient: AdminServiceClient) {}

  async getAllCollections(
    tenantId: string,
    token: string,
  ): Promise<TazamaCollectionSchema[]> {
    const response = (await this.adminServiceClient.getAllCollections(
      tenantId,
      token,
    )) as { data?: TazamaCollectionSchema[] };
    return response.data ?? [];
  }

  async createDestinationType(
    dto: CreateDestinationTypeDto,
    token: string,
  ): Promise<DestinationTypeResponse> {
    const response = (await this.adminServiceClient.createDestinationType(
      dto,
      token,
    )) as { data: DestinationTypeResponse };
    return response.data;
  }

  async destinationTypeExists(
    destinationTypeId: number,
    token: string,
  ): Promise<boolean> {
    const response = (await this.adminServiceClient.destinationTypeExists(
      destinationTypeId,
      token,
    )) as { exists?: boolean };
    return response.exists ?? false;
  }

  async addFieldToDestinationType(
    destinationTypeId: number,
    dto: CreateFieldDto,
    token: string,
    serialNo?: number,
  ): Promise<FieldResponse> {
    const fieldDto = {
      ...dto,
      serial_no: serialNo,
    };
    const response = (await this.adminServiceClient.addFieldToDestinationType(
      destinationTypeId,
      fieldDto,
      token,
    )) as { data: FieldResponse };
    return response.data;
  }
}
