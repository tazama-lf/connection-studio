import { Injectable } from '@nestjs/common';
import {
  parsePayloadToSchema,
  applyFieldAdjustments,
  validatePayloadStructure,
  type PayloadParsingResult,
} from '@tazama-lf/tcs-lib';
import { ContentType } from '@tazama-lf/tcs-lib';
import { SchemaField } from '@tazama-lf/tcs-lib';
import { AdjustFieldDto, SchemaValidationResultDto } from '@tazama-lf/tcs-lib';

@Injectable()
export class PayloadParsingService {
  async parsePayloadToSchema(
    payload: string,
    contentType: ContentType,
    filename?: string,
  ): Promise<PayloadParsingResult | undefined> {
    return parsePayloadToSchema(payload, contentType, filename);
  }

  applyFieldAdjustments(
    sourceFields: SchemaField[],
    adjustments: AdjustFieldDto[],
  ): SchemaField[] {
    return applyFieldAdjustments(sourceFields, adjustments);
  }

  async validatePayloadStructure(
    payload: string,
    contentType: ContentType,
  ): Promise<SchemaValidationResultDto> {
    return validatePayloadStructure(payload, contentType);
  }
}
