import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { TazamaDataModelRepository } from './tazama-data-model.repository';
import { validatePayloadContent } from '../utils/helpers';

interface ErrorWithMessage {
  message: string;
  stack?: string;
}

@Injectable()
export class TazamaDataModelService {
  private readonly logger = new Logger(TazamaDataModelService.name);

  /* c8 ignore start */
  constructor(private readonly repository: TazamaDataModelRepository) {}
  /* c8 ignore stop */

  private isEmptyValue(value: unknown): boolean {
    return value === null || typeof value === 'undefined';
  }

  private isInvalidKey(key: string): boolean {
    if (key.trim() === '') {
      return true;
    }
    try {
      const parsed = JSON.parse(key);
      return typeof parsed === 'object' && parsed !== null;
    } catch {
      return false;
    }
  }
  private findInvalidArrayField(json: unknown[], path: string): string | null {
    for (const [index, item] of json.entries()) {
      const itemPath = `${path}[${index}]`;
      if (this.isEmptyValue(item)) {
        return itemPath;
      }
      const nestedInvalid = this.findInvalidField(item, itemPath);
      if (nestedInvalid) {
        return nestedInvalid;
      }
    }
    return null;
  }

  private findInvalidField(json: unknown, path = ''): string | null {
    if (Array.isArray(json)) {
      return this.findInvalidArrayField(json, path);
    }

    if (!json || typeof json !== 'object') {
      return null;
    }

    for (const [key, value] of Object.entries(
      json as Record<string, unknown>,
    )) {
      const fieldPath = path ? `${path}.${key}` : key;

      if (key.trim() === '') {
        return path ? `${path}.<empty key>` : '<empty key>';
      }

      if (this.isInvalidKey(key)) {
        return fieldPath;
      }

      if (value && typeof value === 'object') {
        const nestedInvalid = this.findInvalidField(value, fieldPath);
        if (nestedInvalid) {
          return nestedInvalid;
        }
      } else if (this.isEmptyValue(value)) {
        return fieldPath;
      }
    }

    return null;
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
    const payloadValidation = validatePayloadContent(
      dataModelJson,
      'application/json',
    );
    if (!payloadValidation.isValid) {
      this.logger.error(
        `Rejected invalid data model JSON for tenant: ${tenantId}: ${payloadValidation.message}`,
      );
      throw new BadRequestException(payloadValidation.message);
    }

    const invalidField = this.findInvalidField(dataModelJson);
    if (invalidField) {
      this.logger.error(
        `Rejected data model JSON with invalid field "${invalidField}" for tenant: ${tenantId}`,
      );
      throw new BadRequestException(
        `Field "${invalidField}" has an empty or invalid name/value. Please provide a valid name and value before saving.`,
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
