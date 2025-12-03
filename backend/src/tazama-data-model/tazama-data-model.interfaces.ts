/**
 * Tazama Internal Data Model Interfaces
 */
export type TazamaCollectionName = string;
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
  parent_id?: number | null;
  serial_no?: number;
  collection_id?: number;
  description?: string;
  example?: string | number | boolean | Date | Record<string, unknown>;
  properties?: TazamaField[]; // For object types, define nested properties
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
  defaultValue?: string | number | boolean | null;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: Array<string | number | boolean>;
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
