import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PayloadType {
  JSON = 'json',
  XML = 'xml',
}

export class SimulatePayloadDto {
  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  configId: number;

  @IsString()
  @IsNotEmpty()
  testPayload: string;

  @IsEnum(PayloadType)
  @IsOptional()
  payloadType?: PayloadType;

  @IsObject()
  @IsOptional()
  tcsMapping?: Record<string, unknown>;
}
