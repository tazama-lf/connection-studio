export interface InferredField {
  path: string;
  type: 'String' | 'Number' | 'Boolean' | 'Object' | 'Array';
  parent?: string;
  level: number;
  required: boolean;
}

export interface EndpointFormData {
  version: string;
  transactionType: string;
  description: string;
  contentType: string;
  msgFam?: string;
  relatedTransaction?: string;
}

export interface PayloadEditorRef {
  validateAllFields: () => boolean;
}
