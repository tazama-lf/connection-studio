/**
 * Tazama Internal Data Model Interfaces
 */
export type TazamaCollectionName =
  | 'entities'
  | 'accounts'
  | 'account_holder'
  | 'transactionRelationship'
  | 'transactionHistory'
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
  {
    name: 'redis',
    type: 'node',
    description:
      'Redis cache/store - Flat key-value mappings for fast lookup and caching',
    fields: [
      // Transaction Identifiers
      {
        name: 'transactionID',
        type: 'string',
        required: false,
        description: 'Unique transaction identifier',
        example: 'TXN-12345',
      },
      {
        name: 'endToEndId',
        type: 'string',
        required: false,
        description: 'End-to-end transaction ID',
        example: 'E2E-67890',
      },
      {
        name: 'messageId',
        type: 'string',
        required: false,
        description: 'Message identifier',
        example: 'MSG-12345',
      },
      {
        name: 'transactionType',
        type: 'string',
        required: false,
        description: 'Transaction type code',
        example: 'pacs.008.001.10',
      },

      // Amount & Currency
      {
        name: 'amount',
        type: 'number',
        required: false,
        description: 'Transaction amount',
        example: 1000.5,
      },
      {
        name: 'currency',
        type: 'string',
        required: false,
        description: 'Currency code (ISO 4217)',
        example: 'USD',
      },

      // Debtor Information (Flat)
      {
        name: 'debtorName',
        type: 'string',
        required: false,
        description: 'Debtor full name',
        example: 'John Doe',
      },
      {
        name: 'debtorId',
        type: 'string',
        required: false,
        description: 'Debtor identification number',
        example: 'ID-12345',
      },
      {
        name: 'debtorAccountId',
        type: 'string',
        required: false,
        description: 'Debtor account identifier',
        example: 'ACC-001',
      },
      {
        name: 'debtorAccountType',
        type: 'string',
        required: false,
        description: 'Debtor account type',
        example: 'SAVINGS',
      },
      {
        name: 'debtorBankId',
        type: 'string',
        required: false,
        description: 'Debtor bank/institution identifier',
        example: 'BANK-001',
      },
      {
        name: 'debtorCountry',
        type: 'string',
        required: false,
        description: 'Debtor country code (ISO 3166)',
        example: 'US',
      },
      {
        name: 'debtorPhone',
        type: 'string',
        required: false,
        description: 'Debtor phone number',
        example: '+1234567890',
      },
      {
        name: 'debtorEmail',
        type: 'string',
        required: false,
        description: 'Debtor email address',
        example: 'john@example.com',
      },

      // Creditor Information (Flat)
      {
        name: 'creditorName',
        type: 'string',
        required: false,
        description: 'Creditor full name',
        example: 'Jane Smith',
      },
      {
        name: 'creditorId',
        type: 'string',
        required: false,
        description: 'Creditor identification number',
        example: 'ID-67890',
      },
      {
        name: 'creditorAccountId',
        type: 'string',
        required: false,
        description: 'Creditor account identifier',
        example: 'ACC-002',
      },
      {
        name: 'creditorAccountType',
        type: 'string',
        required: false,
        description: 'Creditor account type',
        example: 'CHECKING',
      },
      {
        name: 'creditorBankId',
        type: 'string',
        required: false,
        description: 'Creditor bank/institution identifier',
        example: 'BANK-002',
      },
      {
        name: 'creditorCountry',
        type: 'string',
        required: false,
        description: 'Creditor country code (ISO 3166)',
        example: 'GB',
      },
      {
        name: 'creditorPhone',
        type: 'string',
        required: false,
        description: 'Creditor phone number',
        example: '+4412345678',
      },
      {
        name: 'creditorEmail',
        type: 'string',
        required: false,
        description: 'Creditor email address',
        example: 'jane@example.com',
      },

      // Timestamp & Date Fields
      {
        name: 'timestamp',
        type: 'string',
        required: false,
        description: 'Transaction timestamp (ISO 8601)',
        example: '2023-10-15T14:30:00Z',
      },
      {
        name: 'createdDate',
        type: 'string',
        required: false,
        description: 'Creation date',
        example: '2023-10-15',
      },
      {
        name: 'valueDate',
        type: 'string',
        required: false,
        description: 'Value date',
        example: '2023-10-16',
      },

      // Transaction Details
      {
        name: 'description',
        type: 'string',
        required: false,
        description: 'Transaction description/purpose',
        example: 'Payment for services',
      },
      {
        name: 'reference',
        type: 'string',
        required: false,
        description: 'Transaction reference number',
        example: 'REF-12345',
      },
      {
        name: 'status',
        type: 'string',
        required: false,
        description: 'Transaction status',
        example: 'COMPLETED',
      },
      {
        name: 'channel',
        type: 'string',
        required: false,
        description: 'Transaction channel (MOBILE, WEB, ATM, etc.)',
        example: 'MOBILE',
      },

      // Risk & Fraud Scoring
      {
        name: 'riskScore',
        type: 'number',
        required: false,
        description: 'Risk score (0-100)',
        example: 25.5,
      },
      {
        name: 'fraudScore',
        type: 'number',
        required: false,
        description: 'Fraud probability score (0-100)',
        example: 15.3,
      },
      {
        name: 'fraudFlag',
        type: 'boolean',
        required: false,
        description: 'Fraud detected flag',
        example: false,
      },
      {
        name: 'alertLevel',
        type: 'string',
        required: false,
        description: 'Alert level (LOW, MEDIUM, HIGH, CRITICAL)',
        example: 'LOW',
      },

      // Location & IP Information
      {
        name: 'ipAddress',
        type: 'string',
        required: false,
        description: 'IP address of transaction initiator',
        example: '192.168.1.1',
      },
      {
        name: 'geoLocation',
        type: 'string',
        required: false,
        description: 'Geographic location coordinates',
        example: '40.7128,-74.0060',
      },
      {
        name: 'deviceId',
        type: 'string',
        required: false,
        description: 'Device identifier',
        example: 'DEV-123456',
      },

      // Additional Metadata
      {
        name: 'sessionId',
        type: 'string',
        required: false,
        description: 'Session identifier',
        example: 'SESS-789012',
      },
      {
        name: 'merchantId',
        type: 'string',
        required: false,
        description: 'Merchant identifier (for card transactions)',
        example: 'MERCH-456',
      },
      {
        name: 'merchantName',
        type: 'string',
        required: false,
        description: 'Merchant name',
        example: 'Amazon Inc',
      },
      {
        name: 'categoryCode',
        type: 'string',
        required: false,
        description: 'Merchant category code (MCC)',
        example: '5411',
      },

      // Processing Information
      {
        name: 'processingStatus',
        type: 'string',
        required: false,
        description: 'Processing status',
        example: 'PENDING',
      },
      {
        name: 'approvalCode',
        type: 'string',
        required: false,
        description: 'Approval/authorization code',
        example: 'AUTH-123',
      },
      {
        name: 'rejectionReason',
        type: 'string',
        required: false,
        description: 'Reason for rejection/failure',
        example: 'INSUFFICIENT_FUNDS',
      },

      // Custom Fields (for flexibility)
      {
        name: 'customField1',
        type: 'string',
        required: false,
        description: 'Custom field 1 - configurable',
        example: 'custom_value_1',
      },
      {
        name: 'customField2',
        type: 'string',
        required: false,
        description: 'Custom field 2 - configurable',
        example: 'custom_value_2',
      },
      {
        name: 'customField3',
        type: 'string',
        required: false,
        description: 'Custom field 3 - configurable',
        example: 'custom_value_3',
      },
      {
        name: 'metadata',
        type: 'string',
        required: false,
        description: 'Additional metadata (JSON string)',
        example: '{"key":"value"}',
      },

      // TTL for Redis expiry
      {
        name: 'ttl',
        type: 'number',
        required: false,
        description: 'Time-to-live in seconds (for Redis expiry)',
        example: 3600,
      },
    ],
  },
];
