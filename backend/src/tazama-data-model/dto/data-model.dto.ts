import { IsValidPayload } from '../../decorators/is-valid-payload.decorator';

export class DataModelDto {
  @IsValidPayload()
  data_model_json!: Record<string, unknown>;
}
