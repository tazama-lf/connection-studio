import { IsObject, IsNotEmptyObject } from 'class-validator';

export class DataModelDto {
  @IsObject()
  @IsNotEmptyObject()
  data_model_json!: Record<string, unknown>;
}
