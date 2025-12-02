import { Injectable } from '@nestjs/common';
import {
  parsePayloadToSchema,
  applyFieldAdjustments,
  validatePayloadStructure,
  type PayloadParsingResult,
} from '@tazama-lf/tcs-lib';
import { ContentType , SchemaField , AdjustFieldDto, SchemaValidationResultDto } from '@tazama-lf/tcs-lib';

@Injectable()
export class PayloadParsingService {
  async parsePayloadToSchema(
    payload: string,
    contentType: ContentType,
    filename?: string,
  ): Promise<PayloadParsingResult | undefined> {
    return await parsePayloadToSchema(payload, contentType, filename);
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
    return await validatePayloadStructure(payload, contentType);
  }
}
