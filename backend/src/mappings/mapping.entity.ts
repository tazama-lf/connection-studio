export enum MappingStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  UNDER_REVIEW = 'UNDER_REVIEW',
  READY_FOR_DEPLOYMENT = 'READY_FOR_DEPLOYMENT',
  DEPLOYED = 'DEPLOYED',
  SUSPENDED = 'SUSPENDED',
  PUBLISHED = 'PUBLISHED',
  DEPRECATED = 'DEPRECATED',
}
export enum TransformationType {
  NONE = 'NONE',
  CONCAT = 'CONCAT',
  SUM = 'SUM',
  SPLIT = 'SPLIT',
}
export interface SourceField {
  path: string;
  type: string;
  isRequired: boolean;
}
export interface DestinationField {
  path: string;
  type: string;
  isRequired: boolean;
}
export interface Constants {
  [key: string]: any;
}
export interface Mapping {
  id: string;
  name: string;
  version: number;
  status: MappingStatus;
  endpointId?: number;
  sourceFields: SourceField[];
  destinationFields: DestinationField[];
  transformation: TransformationType;
  constants: Constants | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
