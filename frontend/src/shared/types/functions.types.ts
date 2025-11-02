// Function-related types matching backend interfaces
export type AllowedFunctionName =
  | 'addAccount'
  | 'addAccountHolder'
  | 'addEntity'
  | 'transactionRelationship';

export interface FunctionDefinition {
  params: string[];
  functionName: AllowedFunctionName;
}

export interface AddFunctionDto {
  params: string[];
  functionName: AllowedFunctionName;
}

export interface FunctionResponseDto {
  success: boolean;
  message: string;
  config?: {
    id: number;
    functions?: FunctionDefinition[];
    [key: string]: any;
  };
}

// Function configurations for each function type
export interface FunctionConfig {
  name: AllowedFunctionName;
  displayName: string;
  requiredParameters: {
    name: string;
    displayName: string;
    type: string;
    description: string;
  }[];
  optionalParameters: {
    name: string;
    displayName: string;
    type: string;
    description: string;
  }[];
  configurations: {
    name: string;
    displayName: string;
    parameters: string;
    description: string;
  }[];
}

// Available function configurations
export const FUNCTION_CONFIGS: Record<AllowedFunctionName, FunctionConfig> = {
  addAccount: {
    name: 'addAccount',
    displayName: 'Add Account',
    requiredParameters: [
      {
        name: 'debtorAcctId',
        displayName: 'Debtor Account ID',
        type: 'string',
        description: 'Account identifier for debtor',
      },
      {
        name: 'creditorAcctId',
        displayName: 'Creditor Account ID',
        type: 'string',
        description: 'Account identifier for creditor',
      },
      {
        name: 'tenantId',
        displayName: 'Tenant ID',
        type: 'string',
        description: 'Tenant identifier',
      },
    ],
    optionalParameters: [],
    configurations: [
      {
        name: 'debtor-account',
        displayName: 'Debtor Account',
        parameters: 'debtorAcctId, tenantId',
        description: 'Parameters: debtorAcctId, tenantId',
      },
      {
        name: 'creditor-account',
        displayName: 'Creditor Account',
        parameters: 'creditorAcctId, tenantId',
        description: 'Parameters: creditorAcctId, tenantId',
      },
    ],
  },
  addAccountHolder: {
    name: 'addAccountHolder',
    displayName: 'Add Account Holder',
    requiredParameters: [
      {
        name: 'creditorId',
        displayName: 'Creditor ID',
        type: 'string',
        description: 'Creditor identifier',
      },
      {
        name: 'creditorAcctId',
        displayName: 'Creditor Account ID',
        type: 'string',
        description: 'Creditor account identifier',
      },
      {
        name: 'debtorId',
        displayName: 'Debtor ID',
        type: 'string',
        description: 'Debtor identifier',
      },
      {
        name: 'debtorAcctId',
        displayName: 'Debtor Account ID',
        type: 'string',
        description: 'Debtor account identifier',
      },
      {
        name: 'CreDtTm',
        displayName: 'Creation Date Time',
        type: 'string',
        description: 'Creation timestamp',
      },
      {
        name: 'TenantId',
        displayName: 'Tenant ID',
        type: 'string',
        description: 'Tenant identifier',
      },
    ],
    optionalParameters: [],
    configurations: [
      {
        name: 'debtor-account-holder',
        displayName: 'Debtor Account Holder',
        parameters: 'debtorId, debtorAcctId, CreDtTm, TenantId',
        description: 'Parameters: debtorId, debtorAcctId, CreDtTm, TenantId',
      },
      {
        name: 'creditor-account-holder',
        displayName: 'Creditor Account Holder',
        parameters: 'creditorId, creditorAcctId, CreDtTm, TenantId',
        description: 'Parameters: creditorId, creditorAcctId, CreDtTm, TenantId',
      },
    ],
  },
  addEntity: {
    name: 'addEntity',
    displayName: 'Add Entity',
    requiredParameters: [
      {
        name: 'creditorId',
        displayName: 'Creditor ID',
        type: 'string',
        description: 'Entity identifier for creditor',
      },
      {
        name: 'debtorId',
        displayName: 'Debtor ID',
        type: 'string',
        description: 'Entity identifier for debtor',
      },
      {
        name: 'tenantId',
        displayName: 'Tenant ID',
        type: 'string',
        description: 'Tenant identifier',
      },
      {
        name: 'CreDtTm',
        displayName: 'Creation Date Time',
        type: 'string',
        description: 'Creation timestamp',
      },
    ],
    optionalParameters: [],
    configurations: [
      {
        name: 'creditor-entity',
        displayName: 'Creditor Entity',
        parameters: 'creditorId, tenantId, CreDtTm',
        description: 'Parameters: creditorId, tenantId, CreDtTm',
      },
      {
        name: 'debtor-entity',
        displayName: 'Debtor Entity',
        parameters: 'debtorId, tenantId, CreDtTm',
        description: 'Parameters: debtorId, tenantId, CreDtTm',
      },
    ],
  },
  transactionRelationship: {
    name: 'transactionRelationship',  
    displayName: 'Transaction Relationship',
    requiredParameters: [
      {
        name: 'from',
        displayName: 'From',
        type: 'string',
        description: 'Usually from DataCache, e.g., accounts/${debtorAcctId}',
      },
      {
        name: 'to',
        displayName: 'To',
        type: 'string',
        description: 'Usually from DataCache, e.g., accounts/${creditorAcctId}',
      },
      {
        name: 'TxTp',
        displayName: 'Transaction Type',
        type: 'string',
        description: 'From transaction message',
      },
      {
        name: 'MsgId',
        displayName: 'Message ID',
        type: 'string',
        description: 'From transaction message',
      },
      {
        name: 'CreDtTm',
        displayName: 'Creation Date Time',
        type: 'string',
        description: 'From transaction message',
      },
      {
        name: 'EndToEndId',
        displayName: 'End to End ID',
        type: 'string',
        description: 'From transaction message',
      },
      {
        name: 'TenantId',
        displayName: 'Tenant ID',
        type: 'string',
        description: 'From context or transaction',
      },
    ],
    optionalParameters: [
      {
        name: 'Amt',
        displayName: 'Amount',
        type: 'string',
        description: 'From transaction message (optional)',
      },
      {
        name: 'Ccy',
        displayName: 'Currency',
        type: 'string',
        description: 'From transaction message (optional)',
      },
      {
        name: 'lat',
        displayName: 'Latitude',
        type: 'string',
        description: 'From transaction message (optional)',
      },
      {
        name: 'long',
        displayName: 'Longitude',
        type: 'string',
        description: 'From transaction message (optional)',
      },
      {
        name: 'TxSts',
        displayName: 'Transaction Status',
        type: 'string',
        description: 'Set during processing (optional)',
      },
    ],
    configurations: [
      {
        name: 'create-transaction-relationship',
        displayName: 'Create Transaction Relationship',
        parameters: 'from, to, TxTp, MsgId, CreDtTm, EndToEndId, TenantId',
        description: 'Parameters: from, to, TxTp, MsgId, CreDtTm, EndToEndId, TenantId',
      },
    ],
  }
};
