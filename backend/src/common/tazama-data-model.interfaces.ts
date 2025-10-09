/**
 * Tazama Internal Data Model Interfaces
 */
export type TazamaCollectionName =
  | 'entities'
  | 'accounts'
  | 'account_holder'
  | 'transactionRelationship'
  | 'transactionHistory';
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
    name: 'transactionHistory',
    type: 'node',
    description: 'Historical transaction records',
    fields: [
      {
        name: '_key',
        type: 'string',
        required: true,
        description: 'Unique history record identifier',
        example: 'HIST001',
      },
      {
        name: 'TransactionId',
        type: 'string',
        required: true,
        description: 'Reference to transaction',
        example: 'TXN001',
      },
      {
        name: 'Validated',
        type: 'boolean',
        required: false,
        description: 'Whether fraud checks passed',
        example: true,
      },
    ],
  },
];
