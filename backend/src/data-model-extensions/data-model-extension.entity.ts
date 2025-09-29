export enum FieldType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  DATE = 'DATE',
}
export enum ExtensionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DEPRECATED = 'DEPRECATED',
}
export interface DataModelExtension {
  id: string;
  collection: string;
  fieldName: string;
  fieldType: FieldType;
  isRequired: boolean;
  defaultValue: any;
  version: number;
  status: ExtensionStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
export interface ExtensionAuditLog {
  id: string;
  extensionId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ACTIVATE' | 'DEACTIVATE';
  userId: string;
  timestamp: Date;
  previousState?: any;
  newState?: any;
  details?: string;
}
