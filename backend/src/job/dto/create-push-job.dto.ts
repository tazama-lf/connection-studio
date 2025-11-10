import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { IngestMode, ScheduleStatus } from '@tazama-lf/tcs-lib';

export class CreatePushJobDto {
  @IsOptional()
  @IsString()
  id: string;

  @IsString()
  @IsNotEmpty()
  endpoint_name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\/.*/, { message: 'Path must start with a forward slash' })
  path: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(IngestMode)
  @IsNotEmpty()
  mode: IngestMode = IngestMode.APPEND;

  @IsString()
  @IsNotEmpty()
  table_name: string;

  @IsString()
  @IsNotEmpty()
  version: string;

  @IsOptional()
  @IsString()
  publishing_status: ScheduleStatus = ScheduleStatus.INACTIVE;
}
