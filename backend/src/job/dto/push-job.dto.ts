import { Expose } from 'class-transformer';
import { IngestMode, JobStatus } from '@tazama-lf/tcs-lib';

export class PushJob {
  @Expose()
  id: string;

  @Expose()
  endpoint_name: string;

  @Expose()
  path: string;

  @Expose()
  description: string;

  @Expose()
  mode: IngestMode;

  @Expose()
  table_name: string;

  @Expose()
  version: string;

  @Expose()
  status: JobStatus;

  @Expose()
  comments: string;

  @Expose()
  created_at: Date;

  @Expose()
  updated_at: Date;
}
