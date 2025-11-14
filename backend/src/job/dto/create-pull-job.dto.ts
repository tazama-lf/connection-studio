import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  AuthType,
  FileType,
  IngestMode,
  ScheduleStatus,
  SourceType,
} from '@tazama-lf/tcs-lib';

class HTTPConnectionDto {
  @IsString()
  url: string;

  @IsObject()
  @IsNotEmpty()
  headers: Record<string, string>;
}

export class SFTPConnectionDto {
  @IsString()
  host: string;

  @IsNumber()
  @IsNotEmpty()
  port: number;

  @IsEnum(AuthType)
  auth_type: AuthType;

  @IsString()
  @IsNotEmpty()
  user_name: string;

  @IsString()
  @IsNotEmpty()
  @ValidateIf(
    (o: SFTPConnectionDto) => o.auth_type === AuthType.USERNAME_PASSWORD,
  )
  password?: string;

  @IsString()
  @IsNotEmpty()
  @ValidateIf((o: SFTPConnectionDto) => o.auth_type === AuthType.PRIVATE_KEY)
  private_key?: string;
}

class FileSettingDto {
  @IsString()
  path: string;

  @IsEnum(FileType)
  file_type: FileType;

  @IsString()
  delimiter: string;
}

export class CreatePullJobDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  endpoint_name: string;

  @IsUUID()
  @IsNotEmpty()
  schedule_id: string;

  @IsEnum(SourceType)
  @IsNotEmpty()
  source_type: SourceType;

  @IsString()
  @IsNotEmpty()
  description: string;

  @ValidateNested()
  @Type((opts) => {
    if (!opts?.object) {
      return Object;
    }
    const obj = opts.object as CreatePullJobDto;
    if (obj.source_type === SourceType.HTTP) {
      return HTTPConnectionDto;
    }
    if (obj.source_type === SourceType.SFTP) {
      return SFTPConnectionDto;
    }
    return Object;
  })
  connection: HTTPConnectionDto | SFTPConnectionDto;

  @ValidateNested()
  @Type((opts) => {
    const obj = opts?.object as CreatePullJobDto;
    if (obj?.source_type === SourceType.SFTP) {
      return FileSettingDto;
    }
    return Object;
  })
  file: FileSettingDto;

  @IsString()
  @IsNotEmpty()
  table_name: string;

  @IsOptional()
  @IsEnum(IngestMode)
  mode?: IngestMode = IngestMode.APPEND;

  @IsString()
  @IsNotEmpty()
  version: string;

  @IsOptional()
  @IsEnum(ScheduleStatus)
  publishing_status?: ScheduleStatus = ScheduleStatus.INACTIVE;
}
