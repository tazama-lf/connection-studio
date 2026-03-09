import {
  AuthType,
  FileType,
  IngestMode,
  JobStatus,
  ScheduleStatus,
  SourceType,
} from '@tazama-lf/tcs-lib';
import { Expose, Transform, Type } from 'class-transformer';
import { CreatePullJobDto } from './create-pull-job.dto';

export class HTTPConnectionDto {
  @Expose()
  url: string;

  @Expose()
  headers: Record<string, string>;
}

export class SFTPConnectionDto {
  @Expose()
  host: string;

  @Expose()
  port: number;

  @Expose()
  auth_type: AuthType;

  @Expose()
  user_name: string;
}

class FileSettingDto {
  @Expose()
  path: string;

  @Expose()
  file_type: FileType;

  @Expose()
  delimiter: string;
}

export class PullJobResponseDto {
  @Expose()
  id: string;

  @Expose()
  tenant_id: string;

  @Expose()
  schedule_id: string;

  @Expose()
  schedule_name: string;

  @Expose()
  endpoint_name: string;

  @Expose()
  source_type: SourceType;

  @Expose()
  description: string;

  @Expose()
  @Type((opts) => {
    const obj = opts?.object as CreatePullJobDto;
    switch (obj.source_type) {
      case SourceType.HTTP:
        return HTTPConnectionDto;
      case SourceType.SFTP:
        return SFTPConnectionDto;
    }
  })
  connection: HTTPConnectionDto | SFTPConnectionDto;

  @Expose()
  @Transform(({ obj, value }) => {
    if (obj?.source_type === SourceType.SFTP) {
      return value;
    }
    return undefined;
  })
  @Type(() => FileSettingDto)
  file?: FileSettingDto;

  @Expose()
  table_name: string;

  @Expose()
  mode: IngestMode;

  @Expose()
  version: string;

  @Expose()
  status: JobStatus;

  @Expose()
  publishing_status: ScheduleStatus;

  @Expose()
  created_at: Date;

  @Expose()
  updated_at: Date;

  @Expose()
  comments: string;
}
