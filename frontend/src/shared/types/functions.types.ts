// Function-related types matching backend interfaces
export type AllowedFunctionName =
  | 'addAccount'
  | 'addAccountHolder'
  | 'addEntity'
  | 'saveTransactionDetails';

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
        name: 'dbtrAcctId',
        displayName: 'Debtor Account ID',
        type: 'string',
        description: 'Account identifier for debtor',
      },
      {
        name: 'cdtrAcctId',
        displayName: 'Creditor Account ID',
        type: 'string',
        description: 'Account identifier for creditor',
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
        name: 'debtor-account',
        displayName: 'Debtor Account',
        parameters: 'dbtrAcctId, TenantId',
        description: 'Parameters: dbtrAcctId, TenantId',
      },
      {
        name: 'creditor-account',
        displayName: 'Creditor Account',
        parameters: 'cdtrAcctId, TenantId',
        description: 'Parameters: cdtrAcctId, TenantId',
      },
    ],
  },
  addEntity: {
    name: 'addEntity',
    displayName: 'Add Entity',
    requiredParameters: [
      {
        name: 'cdtrId',
        displayName: 'Creditor ID',
        type: 'string',
        description: 'Entity identifier for creditor',
      },
      {
        name: 'dbtrId',
        displayName: 'Debtor ID',
        type: 'string',
        description: 'Entity identifier for debtor',
      },
      {
        name: 'TenantId',
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
        parameters: 'cdtrId, TenantId, CreDtTm',
        description: 'Parameters: cdtrId, TenantId, CreDtTm',
      },
      {
        name: 'debtor-entity',
        displayName: 'Debtor Entity',
        parameters: 'dbtrId, TenantId, CreDtTm',
        description: 'Parameters: dbtrId, TenantId, CreDtTm',
      },
    ],
  },
  addAccountHolder: {
    name: 'addAccountHolder',
    displayName: 'Add Account Holder',
    requiredParameters: [
      {
        name: 'cdtrId',
        displayName: 'Creditor ID',
        type: 'string',
        description: 'Creditor identifier',
      },
      {
        name: 'cdtrAcctId',
        displayName: 'Creditor Account ID',
        type: 'string',
        description: 'Creditor account identifier',
      },
      {
        name: 'dbtrId',
        displayName: 'Debtor ID',
        type: 'string',
        description: 'Debtor identifier',
      },
      {
        name: 'dbtrAcctId',
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
        parameters: 'dbtrId, dbtrAcctId, CreDtTm, TenantId',
        description: 'Parameters: dbtrId, dbtrAcctId, CreDtTm, TenantId',
      },
      {
        name: 'creditor-account-holder',
        displayName: 'Creditor Account Holder',
        parameters: 'cdtrId, cdtrAcctId, CreDtTm, TenantId',
        description: 'Parameters: cdtrId, cdtrAcctId, CreDtTm, TenantId',
      },
    ],
  },
  saveTransactionDetails: {
    name: 'saveTransactionDetails',  
    // saveTransactionDetails
    displayName: 'Save Transaction Details',
    requiredParameters: [
      {
        name: 'source',
        displayName: 'source',
        type: 'string',
        description: 'Usually from DataCache, e.g., accounts/${debtorAcctId}',
      },
      {
        name: 'destination',
        displayName: 'destination',
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
        parameters: 'source, destination, TxTp, MsgId, CreDtTm, EndToEndId, TenantId',
        description: 'Parameters: source, destination, TxTp, MsgId, CreDtTm, EndToEndId, TenantId',
      },
    ],
  }
};
