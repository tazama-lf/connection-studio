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
  mapping: Array<Record<string, unknown>> | null;
  functions: Record<string, unknown> | Array<Record<string, unknown>> | null;
  credentials?: Record<string, unknown>;
  createdBy?: string;
  createdAt?: Date;
}
