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

  // Note: null/undefined are intentionally NOT treated as empty here, some
  // root fields (e.g. redis) are legitimately set to null to mean "no value
  // yet". Only blank/whitespace-only strings count as an "empty field" a
  // user left unfilled while editing.
  private isEmptyValue(value: unknown): boolean {
    return typeof value === 'string' && value.trim() === '';
  }

  private hasEmptyField(json: unknown): boolean {
    if (Array.isArray(json)) {
      return json.some(
        (item) => this.hasEmptyField(item) || this.isEmptyValue(item),
      );
    }

    if (!json || typeof json !== 'object') {
      return false;
    }

    return Object.entries(json as Record<string, unknown>).some(
      ([key, value]) => {
        if (key.trim() === '') {
          return true;
        }
        if (value && typeof value === 'object') {
          return this.hasEmptyField(value);
        }
        return this.isEmptyValue(value);
      },
    );
  }

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
    if (this.hasEmptyField(dataModelJson)) {
      this.logger.error(
        `Rejected data model JSON with empty field(s) for tenant: ${tenantId}`,
      );
      throw new BadRequestException(
        'Data model JSON contains one or more empty field names or values. Please provide a name and value for every field before saving.',
      );
    }

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
