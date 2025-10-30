import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
import { IngestMode } from '@tazama-lf/tcs-lib';


export class CreatePushJobDto {
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
}
