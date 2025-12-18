import type { JSONSchema } from '@tazama-lf/tcs-lib';

export interface SftpConfigDataDto {
  id: number;
  msgFam?: string | null;
  transactionType?: string | null;
  contentType?: string;
  endpointPath?: string | null;
  publishingStatus?: 'active' | 'inactive';
  version: string;
  schema: JSONSchema | null;
  mapping: any[] | null;
  functions: any;
  credentials?: any;
  createdBy?: string;
  createdAt?: Date;
}
