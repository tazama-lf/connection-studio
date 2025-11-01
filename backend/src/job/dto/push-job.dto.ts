import { Expose } from 'class-transformer';
import { IngestMode } from '@tazama-lf/tcs-lib';

export class PushJob {
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
}
