// Function-related types matching backend interfaces
export type AllowedFunctionName =
  | 'addAccount'
  | 'addAccountHolder'
  | 'addEntity';

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
  parameters: {
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
    parameters: [
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
    parameters: [
      {
        name: 'accountHolderId',
        displayName: 'Account Holder ID',
        type: 'string',
        description: 'Account holder identifier',
      },
      {
        name: 'name',
        displayName: 'Name',
        type: 'string',
        description: 'Account holder name',
      },
      {
        name: 'tenantId',
        displayName: 'Tenant ID',
        type: 'string',
        description: 'Tenant identifier',
      },
    ],
    configurations: [
      {
        name: 'create-account-holder',
        displayName: 'Create Account Holder',
        parameters: 'accountHolderId, name, tenantId',
        description: 'Parameters: accountHolderId, name, tenantId',
      },
    ],
  },
  addEntity: {
    name: 'addEntity',
    displayName: 'Add Entity',
    parameters: [
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
};
