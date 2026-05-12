import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { TazamaDataModelRepository } from './tazama-data-model.repository';


interface ErrorWithMessage {
  message: string;
  stack?: string;
}


@Injectable()
export class TazamaDataModelService {
  private readonly logger = new Logger(TazamaDataModelService.name);

  /* c8 ignore start */
  constructor(private readonly repository: TazamaDataModelRepository) { }
  /* c8 ignore stop */

  async getDataModelJson(
    tenantId: string,
    token: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      this.logger.log(`Getting data model JSON for tenant: ${tenantId}`);
      const result = await this.repository.getDataModelJson(tenantId, token);
      this.logger.log(
        `Successfully retrieved data model JSON for tenant: ${tenantId}`,
      );
      return result;
    } catch (error: unknown) {
      const errorWithMessage = error as ErrorWithMessage;
      const errorMessage = errorWithMessage.message || 'Unknown error';
      this.logger.error(`Failed to get data model JSON: ${errorMessage}`);
      throw new BadRequestException(
        `Failed to get data model JSON: ${errorMessage}`,
      );
    }
  }

  async putDataModelJson(
    tenantId: string,
    dataModelJson: Record<string, unknown>,
    token: string,
  ): Promise<{ tenant_id: string; updated_at: string }> {
    try {
      this.logger.log(`Saving data model JSON for tenant: ${tenantId}`);
      const result = await this.repository.putDataModelJson(
        tenantId,
        dataModelJson,
        token,
      );
      this.logger.log(
        `Successfully saved data model JSON for tenant: ${tenantId}`,
      );
      return result;
    } catch (error: unknown) {
      const errorWithMessage = error as ErrorWithMessage;
      const errorMessage = errorWithMessage.message || 'Unknown error';
      this.logger.error(`Failed to save data model JSON: ${errorMessage}`);
      throw new BadRequestException(
        `Failed to save data model JSON: ${errorMessage}`,
      );
    }
  }
}
