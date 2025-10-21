/**
 * Tazama Internal Data Model Interfaces
 */
export type TazamaCollectionName =
  | 'entities'
  | 'accounts'
  | 'account_holder'
  | 'transactionRelationship'
  | 'transactionDetails'
  | 'redis';
export type TazamaFieldType =
  | 'STRING'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'DATE'
  | 'OBJECT'
  | 'ARRAY';
export type TazamaDestinationPath = string;
export interface TazamaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object';
  required: boolean;
  description?: string;
  example?: any;
}
export interface TazamaCollectionSchema {
  name: TazamaCollectionName;
  type: 'node' | 'edge';
  description: string;
  fields: TazamaField[];
}
export interface TazamaDataModelExtension {
  id: number;
  collection: TazamaCollectionName;
  fieldName: string;
  fieldType: TazamaFieldType;
  description?: string;
  isRequired: boolean;
  defaultValue?: any;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: any[];
  };
  tenantId: string;
  createdBy: string;
  createdAt: Date | string;
  version: number;
}


export interface TransactionDetails {
  source: string;
  destination: string;
  TxTp: string;
  TenantId: string;
  MsgId: string;
  CreDtTm: string;
  Amt?: string;
  Ccy?: string;
  EndToEndId: string;
  lat?: string;
  long?: string;
  TxSts?: string;
}

export const TAZAMA_DATA_MODEL_SCHEMAS: TazamaCollectionSchema[] = [
  {
    name: 'entities',
    type: 'node',
    description: 'Individuals or organizations involved in transactions',
    fields: [
      {
        name: '_key',
        type: 'string',
        required: true,
        description: 'Unique entity identifier',
        example: 'ENTITY001',
      },
      {
        name: 'Name',
        type: 'string',
        required: false,
        description: 'Entity name',
        example: 'John Doe',
      },
      {
        name: 'Type',
        type: 'string',
        required: false,
        description: 'Entity type (INDIVIDUAL or ORGANIZATION)',
        example: 'INDIVIDUAL',
      },
    ],
  },
  {
    name: 'accounts',
    type: 'node',
    description: 'Financial accounts',
    fields: [
      {
        name: '_key',
        type: 'string',
        required: true,
        description: 'Unique account identifier',
        example: 'ACC001',
      },
      {
        name: 'Currency',
        type: 'string',
        required: false,
        description: 'Currency code',
        example: 'USD',
      },
    ],
  },
  {
    name: 'account_holder',
    type: 'edge',
    description: 'Relationships between entities and accounts',
    fields: [
      {
        name: '_key',
        type: 'string',
        required: true,
        description: 'Unique relationship identifier',
        example: 'REL001',
      },
      {
        name: '_from',
        type: 'string',
        required: true,
        description: 'Source entity',
        example: 'entities/ENTITY001',
      },
      {
        name: '_to',
        type: 'string',
        required: true,
        description: 'Target account',
        example: 'accounts/ACC001',
      },
    ],
  },
  {
    name: 'transactionRelationship',
    type: 'edge',
    description: 'Transaction relationships between accounts',
    fields: [
      {
        name: '_key',
        type: 'string',
        required: true,
        description: 'Unique transaction identifier',
        example: 'TXN001',
      },
      {
        name: 'Amt',
        type: 'number',
        required: true,
        description: 'Transaction amount',
        example: 100.5,
      },
      {
        name: 'Ccy',
        type: 'string',
        required: false,
        description: 'Currency code',
        example: 'USD',
      },
    ],
  },
  {
    name: 'transactionDetails',
    type: 'node',
    description: 'Transaction details for the Tazama internal data model',
    fields: [
      {
        name: 'source',
        type: 'string',
        required: true,
        description: 'Source of the transaction',
        example: 'SOURCE-001',
      },
      {
        name: 'destination',
        type: 'string',
        required: true,
        description: 'Destination of the transaction',
        example: 'DEST-001',
      },
      {
        name: 'TxTp',
        type: 'string',
        required: true,
        description: 'Transaction type',
        example: 'pacs.008.001.10',
      },
      {
        name: 'TenantId',
        type: 'string',
        required: true,
        description: 'Tenant identifier',
        example: 'tenant-123',
      },
      {
        name: 'MsgId',
        type: 'string',
        required: true,
        description: 'Message identifier',
        example: 'MSG-12345',
      },
      {
        name: 'CreDtTm',
        type: 'string',
        required: true,
        description: 'Creation date time',
        example: '2023-10-15T14:30:00Z',
      },
      {
        name: 'Amt',
        type: 'string',
        required: false,
        description: 'Transaction amount',
        example: '1000.50',
      },
      {
        name: 'Ccy',
        type: 'string',
        required: false,
        description: 'Currency code',
        example: 'USD',
      },
      {
        name: 'EndToEndId',
        type: 'string',
        required: true,
        description: 'End-to-end identifier',
        example: 'E2E-67890',
      },
      {
        name: 'lat',
        type: 'string',
        required: false,
        description: 'Latitude coordinate',
        example: '40.7128',
      },
      {
        name: 'long',
        type: 'string',
        required: false,
        description: 'Longitude coordinate',
        example: '-74.0060',
      },
      {
        name: 'TxSts',
        type: 'string',
        required: false,
        description: 'Transaction status',
        example: 'COMPLETED',
      },
    ],
  },
  {
    name: 'redis',
    type: 'node',
    description:
      'Redis cache/store - Flat key-value mappings for fast lookup and caching',
    fields: [
      {
        name: 'dbtrId',
        type: 'string',
        required: false,
        description: 'Debtor ID',
        example: 'DBTR-12345',
      },
      {
        name: 'cdtrId',
        type: 'string',
        required: false,
        description: 'Creditor ID',
        example: 'CDTR-67890',
      },
      {
        name: 'dbtrAcctId',
        type: 'string',
        required: false,
        description: 'Debtor Account ID',
        example: 'ACCT-001',
      },
      {
        name: 'cdtrAcctId',
        type: 'string',
        required: false,
        description: 'Creditor Account ID',
        example: 'ACCT-002',
      },
      {
        name: 'evtId',
        type: 'string',
        required: false,
        description: 'Event ID',
        example: 'EVT-12345',
      },
      {
        name: 'creDtTm',
        type: 'string',
        required: false,
        description: 'Creation Date Time',
        example: '2023-10-15T14:30:00Z',
      },
      {
        name: 'instdAmt',
        type: 'object',
        required: false,
        description: 'Instructed Amount with currency',
        example: { amt: 1000.5, ccy: 'USD' },
      },
      {
        name: 'intrBkSttlmAmt',
        type: 'object',
        required: false,
        description: 'Interbank Settlement Amount with currency',
        example: { amt: 1000.5, ccy: 'USD' },
      },
      {
        name: 'xchgRate',
        type: 'number',
        required: false,
        description: 'Exchange Rate',
        example: 1.2,
      },
    ],
  },
];
