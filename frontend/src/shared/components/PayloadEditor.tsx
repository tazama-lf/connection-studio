import { XMLParser } from 'fast-xml-parser';
import { ArrowDownToLine, Code2, FilePlus, FileText, List, Settings2, SparklesIcon, Terminal, XCircle } from 'lucide-react';
import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import ReactJson from 'react-json-view';
import * as yup from 'yup';
import type {
  FieldAdjustment,
  SchemaField,
} from '../../features/config/services/configApi';
import { Button } from './Button';
interface PayloadEditorProps {
  value: string;
  onChange: (value: string) => void;
  endpointData?: EndpointFormData;
  onEndpointDataChange?: (data: EndpointFormData) => void;
  configId?: number; // Optional config ID for schema updates
  onFieldAdjustmentsChange?: (fieldAdjustments: FieldAdjustment[]) => void; // Callback for field adjustments
  onSchemaChange?: (schema: any) => void; // Callback for current schema
  existingSchemaFields?: SchemaField[] | InferredField[]; // Existing schema fields when editing (can be either format)
  isEditMode?: boolean; // Explicitly control whether to show Add/Remove field buttons
  tenantId?: string; // Tenant ID for endpoint preview
  readOnly?: boolean; // When true, disable all editing functionality
  isCloning?: boolean; // When true, allow editing even for existing configs
  shouldCreateNew?: boolean; // When true, treat as creating a new config even if editing existing one
  onValidationErrorsChange?: (errors: {
    version: string;
    transactionType: string;
  }) => void; // Callback for validation errors
  payloadError?: any; // External payload error from parent component
  setPayloadError?: any; // Callback to set external payload error
}
interface EndpointFormData {
  version: string;
  transactionType: string;
  description: string;
  contentType: string;
  msgFam?: string;
}
interface InferredField {
  path: string;
  type: 'String' | 'Number' | 'Boolean' | 'Object' | 'Array';
  parent?: string;
  level: number;
  required: boolean;
}
export interface PayloadEditorRef {
  validateAllFields: () => boolean;
}

export const PayloadEditor = forwardRef<PayloadEditorRef, PayloadEditorProps>(({
  value,
  onChange,
  endpointData: initialEndpointData,
  onEndpointDataChange,
  configId,
  onFieldAdjustmentsChange,
  onSchemaChange,
  existingSchemaFields,
  isEditMode = false, // Default to false - only true when explicitly editing existing config
  tenantId = 'tenant-id', // Default placeholder if not provided
  readOnly = false,
  isCloning = false,
  shouldCreateNew = true,
  onValidationErrorsChange,
  payloadError,
  setPayloadError,
}, ref) => {
  const [endpointData, setEndpointData] = useState<EndpointFormData>(
    initialEndpointData || {
      version: '',
      transactionType: '',
      description: '',
      contentType: 'application/json',
      msgFam: '',
    },
  );
  const [inferredFields, setInferredFields] = useState<InferredField[]>([]);
  const [showInferredFields, setShowInferredFields] = useState(false);
  const [fieldGenerationError, setFieldGenerationError] = useState<
    string | null
  >(null);
  const [isGeneratingFields, setIsGeneratingFields] = useState(false);
  const [showAddFieldForm, setShowAddFieldForm] = useState(false);
  const [newField, setNewField] = useState({
    path: '',
    type: 'String' as InferredField['type'],
    required: false,
  });
  const [isPayloadValid, setIsPayloadValid] = useState<boolean>(false);
  const [payloadValidationMessage, setPayloadValidationMessage] =
    useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<{
    version: string;
    transactionType: string;
    eventType: string;
    payload: string;
  }>({
    version: '',
    transactionType: '',
    eventType: '',
    payload: '',
  });
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const capitalizeFirstLetter = (string: string): string => string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  const safeJsonParse = (
    jsonString: string,
  ): { success: boolean; data?: any; error?: string } => {
    try {
      const parsed = JSON.parse(jsonString ?? '{}');
      return { success: true, data: parsed };
    } catch (error) {
      return { success: false, error: 'Invalid JSON format' };
    }
  };
  const versionSchema = yup
    .string()
    .required('Version is required')
    .matches(
      /^v?\d+\.\d+\.\d+$/,
      'Version must follow semantic versioning format (e.g: 1.0.0 or v1.0.0)',
    );
  const transactionTypeSchema = yup
    .string()
    .required('Transaction Type is required')
    .matches(
      /^[a-z_][a-z0-9_]*$/,
      'Transaction Type must start with a lowercase letter or underscore and contain only lowercase letters, numbers, or underscores'
    );

  const eventTypeSchema = yup
    .string()
    .notRequired() // Optional field
    .test(
      'format',
      'Event Type must be alphanumeric and can only contain _, -, / in the middle (not at start or end)',
      (value) => {
        if (!value || value.trim() === '') {
          return true;
        }
        return /^[a-zA-Z0-9]+([_\-\/][a-zA-Z0-9]+)*$/.test(value);
      },
    );
  const validateVersion = (version: string): string => {
    try {
      versionSchema.validateSync(version);
      return '';
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        return err.message;
      }
      return 'Invalid version format';
    }
  };
  const validateTransactionType = (transactionType: string): string => {
    try {
      transactionTypeSchema.validateSync(transactionType);
      return '';
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        return err.message;
      }
      return 'Invalid transaction type format';
    }
  };
  const validateEventType = (eventType: string): string => {
    try {
      eventTypeSchema.validateSync(eventType);
      return '';
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        return err.message;
      }
      return 'Invalid event type format';
    }
  };
  const validateAllFields = () => {
    const versionError = validateVersion(endpointData.version);
    const transactionTypeError = validateTransactionType(
      endpointData.transactionType,
    );
    const eventTypeError = validateEventType(endpointData.msgFam ?? '');
    const errors = {
      version: versionError,
      transactionType: transactionTypeError,
      eventType: eventTypeError,
      payload: '',
    };
    setFieldErrors(errors);
    setShowValidationErrors(true);
    if (onValidationErrorsChange) {
      onValidationErrorsChange({
        version: versionError,
        transactionType: transactionTypeError,
      });
    }
    return !versionError && !transactionTypeError && !eventTypeError;
  };
  // Expose validation function through ref
  useImperativeHandle(ref, () => ({
    validateAllFields,
  }), [endpointData.version, endpointData.transactionType, endpointData.msgFam]);
  const validatePayloadContent = (
    payloadValue: string,
    contentType: string,
  ): { isValid: boolean; message: string; error: string } => {

    if (!payloadValue) {
      return { isValid: true, message: '', error: '' };
    }
    if (contentType === 'application/json') {
      try {
        JSON.parse(payloadValue);
        return {
          isValid: true,
          message: 'Valid JSON format detected',
          error: '',
        };
      } catch (e) {
        return {
          isValid: false,
          message: 'Invalid JSON format',
          error: 'Invalid JSON format',
        };
      }
    } else if (contentType === 'application/xml') {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(payloadValue, 'text/xml');
        const parseError = xmlDoc.getElementsByTagName('parsererror');
        if (parseError.length > 0) {
          return {
            isValid: false,
            message: 'Invalid XML format',
            error: 'Invalid XML format',
          };
        } else {
          return {
            isValid: true,
            message: 'Valid XML format detected',
            error: '',
          };
        }
      } catch (e) {
        return {
          isValid: false,
          message: 'Invalid XML format',
          error: 'Invalid XML format',
        };
      }
    }
    return { isValid: false, message: '', error: 'Unsupported content type' };
  };
  const handleAddField = () => {
    if (!newField.path.trim()) {
      return;
    }
    const existsAlready = inferredFields.some(
      (f) => f.path === newField.path.trim(),
    );
    if (existsAlready) {
      return; // Don't add duplicates
    }
    const level = (newField.path.match(/\./g) || []).length;
    const pathParts = newField.path.split('.');
    const parent =
      pathParts.length > 1 ? pathParts.slice(0, -1).join('.') : undefined;
    const fieldToAdd: InferredField = {
      path: newField.path.trim(),
      type: newField.type,
      level,
      parent,
      required: newField.required,
    };
    setInferredFields((prev) =>
      [...prev, fieldToAdd].sort((a, b) => a.path.localeCompare(b.path)),
    );
    setNewField({
      path: '',
      type: 'String',
      required: false,
    });
    setShowAddFieldForm(false);
  };
  const convertSchemaFieldsToInferredFields = (
    schemaFields: SchemaField[],
  ): InferredField[] => {
    const convertFields = (fields: SchemaField[]): InferredField[] => {
      const inferredFields: InferredField[] = [];
      fields.forEach((field) => {
        const dotCount = (field.path.match(/\./g) || []).length;
        const level = dotCount;
        if (field.type === 'array' && field.children) {
        }
        const inferredField: InferredField = {
          path: field.path,
          type: capitalizeFirstLetter(field.type) as InferredField['type'],
          level,
          parent: field.path.includes('.')
            ? field.path.includes('.0.')
              ? field.path.substring(0, field.path.lastIndexOf('.0.') + 2)
              : field.path.substring(0, field.path.lastIndexOf('.'))
            : undefined,
          required: field.isRequired,
        };
        inferredFields.push(inferredField);
        if (field.children && field.children.length > 0) {
          const childFields = convertFields(field.children);
          if (field.type === 'array' && field.arrayElementType === 'object') {
          }
          inferredFields.push(...childFields);
        }
      });
      return inferredFields;
    };
    return convertFields(schemaFields);
  };
  useEffect(() => {
    if (initialEndpointData) {
      setEndpointData(initialEndpointData);
    }
  }, [initialEndpointData]);
  useEffect(() => {
    if (existingSchemaFields && existingSchemaFields.length > 0) {
      if (
        existingSchemaFields[0] &&
        typeof existingSchemaFields[0] === 'object' &&
        'path' in existingSchemaFields[0] &&
        'type' in existingSchemaFields[0] &&
        'level' in existingSchemaFields[0]
      ) {
        setInferredFields(existingSchemaFields as InferredField[]);
        setShowInferredFields(true);
      } else {
        const inferredFields = convertSchemaFieldsToInferredFields(
          existingSchemaFields as SchemaField[],
        );
        setInferredFields(inferredFields);
        setShowInferredFields(true);
      }
    } else if (
      configId &&
      (!existingSchemaFields || existingSchemaFields.length === 0)
    ) {
      setShowInferredFields(true);
      setInferredFields([]);
    } else if (!configId) {
      setShowInferredFields(true);
      setInferredFields([]);
    }
  }, [existingSchemaFields, configId]); // Removed hasUserMadeEdits dependency
  useEffect(() => {
    setShowInferredFields(true);
  }, []); // Only run once on component mount
  useEffect(() => {
    if (onFieldAdjustmentsChange && inferredFields.length > 0) {
      const fieldAdjustments = inferredFields.map((field) => ({
        path: field.path,
        type: field.type.toUpperCase() as
          | 'STRING'
          | 'NUMBER'
          | 'BOOLEAN'
          | 'OBJECT'
          | 'ARRAY',
        isRequired: field.required,
      }));
      onFieldAdjustmentsChange(fieldAdjustments);
    }
  }, [inferredFields, onFieldAdjustmentsChange]);
  useEffect(() => {
    if (onSchemaChange) {
      if (inferredFields.length > 0) {
        onSchemaChange(inferredFields);
      } else {
      }
    }
  }, [inferredFields, onSchemaChange]);
  const handleGenerateFields = async () => {
    if (!value.trim()) {
      setFieldGenerationError('Please enter a payload first.');
      return;
    }
    if (isGeneratingFields) {
      return;
    }
    setIsGeneratingFields(true);
    setFieldGenerationError(null);
    try {
      const schema = generateSchemaFromPayload(value, endpointData.contentType);
      if (schema) {
        const convertSchemaToFields = (
          schemaFields: SchemaField[],
          level = 0,
          parentPath = '',
        ): InferredField[] => {
          const fields: InferredField[] = [];
          schemaFields.forEach((field) => {
            fields.push({
              path: field.path,
              type: capitalizeFirstLetter(field.type) as InferredField['type'],
              level,
              parent:
                parentPath ||
                (field.path.includes('.')
                  ? field.path.substring(0, field.path.lastIndexOf('.'))
                  : undefined),
              required: field.isRequired,
            });
            if (field.children) {
              fields.push(
                ...convertSchemaToFields(field.children, level + 1, field.path),
              );
            }
          });
          return fields;
        };
        const fields = convertSchemaToFields(schema);
        setInferredFields(fields);
        setShowInferredFields(true);
      } else {
        setFieldGenerationError('Failed to generate schema from payload');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      setFieldGenerationError(`Schema inference failed: ${errorMessage}`);
    } finally {
      setIsGeneratingFields(false);
    }
  };
  const handleEndpointDataChange = (
    field: keyof EndpointFormData,
    newValue: string,
  ) => {
    let sanitizedValue = newValue;
    if (
      field === 'version' ||
      field === 'transactionType' ||
      field === 'msgFam'
    ) {
      sanitizedValue = newValue.replace(/\s/g, '');
    }
    const updatedData = { ...endpointData, [field]: sanitizedValue };
    setEndpointData(updatedData);
    if (onEndpointDataChange) {
      onEndpointDataChange(updatedData);
    }
    if (showValidationErrors) {
      const errorFieldMap: Record<string, string> = {
        version: 'version',
        transactionType: 'transactionType',
        msgFam: 'eventType',
      };
      const errorField = errorFieldMap[field] || field;
      setFieldErrors((prev) => ({
        ...prev,
        [errorField]: '',
      }));
    }
    if (field === 'contentType') {
      const payloadValidation = validatePayloadContent(value ?? '', newValue);
      setIsPayloadValid(payloadValidation.isValid);
      setPayloadValidationMessage(payloadValidation.message);
      setFieldErrors((prev) => ({ ...prev, payload: payloadValidation.error }));
    }
  };
  const validatePayload = (payloadValue: string, contentType: string) => {
    const validation = validatePayloadContent(payloadValue, contentType);
    setIsPayloadValid(validation.isValid);
    setPayloadValidationMessage(validation.message);
    setFieldErrors((prev) => ({ ...prev, payload: validation.error }));
  };
  
  useEffect(() => {
    validatePayload(value, endpointData.contentType);
  }, [value, endpointData.contentType]);
  useEffect(() => {
    setFieldErrors({
      version: '',
      transactionType: '',
      eventType: '',
      payload: '',
    });
  }, [endpointData.version, endpointData.transactionType, endpointData.msgFam]);
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileName = file.name.toLowerCase();
      const isJsonFile = fileName.endsWith('.json');
      const isXmlFile = fileName.endsWith('.xml');
      const expectedContentType = endpointData.contentType;
      const isJsonExpected = expectedContentType === 'application/json';
      const isXmlExpected = expectedContentType === 'application/xml';
      if ((isJsonExpected && !isJsonFile) || (isXmlExpected && !isXmlFile)) {
        const expectedFormat = isJsonExpected ? 'JSON (.json)' : 'XML (.xml)';
        const actualFormat = isJsonFile
          ? 'JSON'
          : isXmlFile
            ? 'XML'
            : 'unknown';
        setFieldErrors((prev) => ({
          ...prev,
          payload: `File format mismatch: Expected ${expectedFormat} file but received ${actualFormat} file. Please select the correct file type or change the Content Type setting.`,
        }));
        event.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        let contentValidationError = '';
        if (isJsonExpected) {
          try {
            JSON.parse(content);
          } catch (error) {
            contentValidationError =
              'Invalid JSON file: The uploaded file contains invalid JSON format.';
          }
        } else if (isXmlExpected) {
          try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(content, 'text/xml');
            const parseError = xmlDoc.getElementsByTagName('parsererror');
            if (parseError.length > 0) {
              contentValidationError =
                'Invalid XML file: The uploaded file contains invalid XML format.';
            }
          } catch (error) {
            contentValidationError =
              'Invalid XML file: The uploaded file contains invalid XML format.';
          }
        }
        if (contentValidationError) {
          setFieldErrors((prev) => ({
            ...prev,
            payload: contentValidationError,
          }));
          event.target.value = '';
          return;
        }
        setFieldErrors((prev) => ({ ...prev, payload: '' }));
        onChange(content);
      };
      reader.readAsText(file);
    }
  };
  const generateSchemaFromPayload = (
    payload: string,
    contentType: string,
  ): any => {
    if (contentType === 'application/json') {
      try {
        const parsed = JSON.parse(payload);
        return generateJSONSchema(parsed);
      } catch (e) {
        throw new Error('Invalid JSON format');
      }
    } else if (contentType === 'application/xml') {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(payload, 'text/xml');
        const parseError = xmlDoc.getElementsByTagName('parsererror');
        if (parseError.length > 0) {
          throw new Error('XML parsing error');
        }
        const xmlparser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: '',
        });
        const jsonResult = xmlparser.parse(payload);
        return generateJSONSchema(jsonResult);
      } catch (e) {
        throw new Error('Invalid XML format');
      }
    }
    return null;
  };
  const generateJSONSchema = (obj: any, path = ''): SchemaField[] => {
    const schema: SchemaField[] = [];
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      Object.entries(obj).forEach(([key, value]) => {
        const fieldPath = path ? `${path}.${key}` : key;
        let fieldType: string;
        if (Array.isArray(value)) {
          fieldType = 'array';
        } else if (value && typeof value === 'object') {
          fieldType = 'object';
        } else {
          fieldType = typeof value;
        }
        const field: SchemaField = {
          name: key,
          path: fieldPath,
          type: fieldType as
            | 'string'
            | 'number'
            | 'boolean'
            | 'object'
            | 'array',
          isRequired: true,
        };
        if (
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value)
        ) {
          field.children = generateJSONSchema(value, fieldPath);
        } else if (Array.isArray(value) && value.length > 0) {
          const firstElement = value[0];
          if (
            typeof firstElement === 'object' &&
            firstElement !== null &&
            !Array.isArray(firstElement)
          ) {
            field.path = `${fieldPath}[0]`;
            field.children = generateJSONSchema(
              firstElement,
              `${fieldPath}[0]`,
            );
            field.arrayElementType = 'object';
          } else if (Array.isArray(firstElement)) {
            field.children = [];
            field.arrayElementType = 'array';
          } else {
            field.arrayElementType = typeof firstElement;
          }
        }
        schema.push(field);
      });
    }
    return schema;
  };
  const generateXMLSchema = (element: Element, path = ''): SchemaField[] => {
    const schema: SchemaField[] = [];
    const fieldPath = path ? `${path}.${element.tagName}` : element.tagName;
    const field: SchemaField = {
      name: element.tagName,
      path: fieldPath,
      type: 'object',
      isRequired: true,
    };
    const children: SchemaField[] = [];
    if (element.attributes && element.attributes.length > 0) {
      Array.from(element.attributes).forEach((attr) => {
        children.push({
          name: attr.name,
          path: `${fieldPath}.${attr.name}`,
          type: 'string',
          isRequired: true,
        });
      });
    }
    const childElements = Array.from(element.children);
    if (childElements.length > 0) {
      const elementGroups = new Map<string, Element[]>();
      childElements.forEach((child) => {
        const {tagName} = child;
        if (!elementGroups.has(tagName)) {
          elementGroups.set(tagName, []);
        }
        elementGroups.get(tagName)!.push(child);
      });
      elementGroups.forEach((elements, tagName) => {
        if (elements.length === 1) {
          const childSchemas = generateXMLSchema(elements[0], fieldPath);
          children.push(...childSchemas);
        } else {
          const arrayField: SchemaField = {
            name: tagName,
            path: `${fieldPath}.${tagName}`,
            type: 'array',
            isRequired: true,
            arrayElementType: 'object',
          };
          if (elements.length > 0) {
            const templateSchema = generateXMLSchema(
              elements[0],
              `${fieldPath}.${tagName}.0`,
            );
            if (templateSchema.length > 0 && templateSchema[0].children) {
              arrayField.children = templateSchema[0].children;
            }
          }
          children.push(arrayField);
        }
      });
    }
    if (element.textContent?.trim() && childElements.length === 0) {
      field.type = 'string';
    }
    if (children.length > 0) {
      field.children = children;
    }
    schema.push(field);
    return schema;
  };
  const convertInferredFieldsToSchemaFields = (
    fields: InferredField[],
  ): SchemaField[] => {
    const schemaFields: SchemaField[] = [];
    const rootFields = fields.filter((f) => f.level === 0);
    rootFields.forEach((rootField) => {
      const schemaField: SchemaField = {
        name: rootField.path.split('.').pop() || rootField.path,
        path: rootField.path,
        type: rootField.type.toLowerCase() as
          | 'string'
          | 'number'
          | 'boolean'
          | 'object'
          | 'array',
        isRequired: rootField.required,
      };
      const directChildren = fields.filter(
        (f) =>
          f.path !== rootField.path &&
          f.path.startsWith(rootField.path + '.') &&
          f.level === rootField.level + 1,
      );
      if (directChildren.length > 0) {
        schemaField.children = convertInferredFieldsToSchemaFields(
          fields.filter((f) => f.path.startsWith(rootField.path + '.')),
        );
      }
      schemaFields.push(schemaField);
    });
    return schemaFields;
  };
  const sampleJsonPayload = `{
  "pain001": {
    "GroupHeader": {
      "MessageId": "MSG20251031001",
      "CreationDateTime": "2025-10-31T15:19:24Z",
      "NumberOfTransactions": "1",
      "InitiatingParty": {
        "Name": "ACME Corp"
      }
    },
    "PaymentInformation": {
      "PaymentInformationId": "PMTINF20251031001",
      "PaymentMethod": "TRF",
      "RequestedExecutionDate": "2025-11-01",
      "Debtor": {
        "Name": "ACME Corp"
      },
      "DebtorAccount": {
        "IBAN": "DE89370400440532013000"
      },
      "DebtorAgent": {
        "BIC": "DEUTDEFF"
      },
      "CreditTransferTransactionInformation": [
        {
          "PaymentId": {
            "EndToEndId": "E2E20251031001"
          },
          "Amount": {
            "InstructedAmount": {
              "Currency": "EUR",
              "Value": "1000.00"
            }
          },
          "CreditorAgent": {
            "BIC": "COBADEFF"
          },
          "Creditor": {
            "Name": "John Doe"
          },
          "CreditorAccount": {
            "IBAN": "DE75512108001245126199"
          }
        }
      ]
    }
  },
  "TenantId":"123"
}`;
  const sampleXmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.11">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>TXN12345</MsgId>
      <CreDtTm>2023-10-15T10:30:00</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>INSTR001</InstrId>
        <EndToEndId>E2E001</EndToEndId>
      </PmtId>
      <IntrBkSttlmAmt Ccy="USD">100.00</IntrBkSttlmAmt>
      <Dbtr>
        <Nm>John Doe</Nm>
        <Id>
          <PrvtId>CUST123</PrvtId>
        </Id>
      </Dbtr>
      <Cdtr>
        <Nm>Jane Smith</Nm>
        <Id>
          <PrvtId>CUST456</PrvtId>
        </Id>
      </Cdtr>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;
  const FormattedJsonSection = () => {
    const parseResult = safeJsonParse(value);
    if (parseResult.success && parseResult.data) {
      return (
        <ReactJson
          src={parseResult.data}
          onEdit={(e) => { onChange(JSON.stringify(e.updated_src, null, 2)); }}
          onAdd={(e) => { onChange(JSON.stringify(e.updated_src, null, 2)); }}
          onDelete={(e) => { onChange(JSON.stringify(e.updated_src, null, 2)); }}
          theme="rjv-default"
          name={false}
          displayDataTypes={false}
          displayObjectSize={true}
          enableClipboard={true}
          collapsed={false}
          style={{ fontSize: '13px' }}
        />
      );
    }
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <svg
            className="w-12 h-12 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.732 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-sm">Invalid JSON format</p>
          <p className="text-xs mt-1">Enter valid JSON to see preview</p>
        </div>
      </div>
    );
  };
  return (
    <div className="space-y-4">
      { }
      <div className="">
        <h3 className="text-base font-semibold flex items-center gap-1 text-blue-900 mb-4">
          <Settings2 className="text-blue-500" size={16} /> Endpoint
          Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          { }
          <div>
            <label
              htmlFor="version"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Version *
            </label>
            {(() => {
              const isReadOnly = readOnly || (!isCloning && !!configId);
              return (
                <input
                  id="version"
                  type="text"
                  value={endpointData.version}
                  onChange={(e) =>
                    { handleEndpointDataChange('version', e.target.value); }
                  }
                  onKeyPress={(e) => {
                    const char = e.key;
                    const currentValue = (e.target as HTMLInputElement).value;
                    if (
                      !/[0-9.]/.test(char) &&
                      !(char === 'v' && currentValue.length === 0)
                    ) {
                      e.preventDefault();
                    }
                  }}
                  placeholder="1.0.0"
                  className={`block w-full px-3 py-3 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm [&:-webkit-autofill]:bg-white  ${isReadOnly
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : fieldErrors.version
                      ? 'bg-white border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'bg-white border-gray-300'
                    }`}
                  readOnly={isReadOnly}
                />
              );
            })()}
            {showValidationErrors && fieldErrors.version && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.version}</p>
            )}
          </div>
          { }
          <div>
            <label
              htmlFor="msgFam"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Event Type
            </label>
            {(() => {
              const isReadOnly = readOnly || (!isCloning && !!configId);
              return (
                <input
                  id="msgFam"
                  type="text"
                  value={endpointData.msgFam || ''}
                  onChange={(e) =>
                    { handleEndpointDataChange('msgFam', e.target.value); }
                  }
                  onKeyPress={(e) => {
                    const char = e.key;
                    if (!/[a-zA-Z0-9_\-/]/.test(char)) {
                      e.preventDefault();
                    }
                  }}
                  placeholder="iso-20022"
                  className={`block w-full px-3 py-3 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm [&:-webkit-autofill]:bg-white ${isReadOnly
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : fieldErrors.eventType
                      ? 'bg-white border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'bg-white border-gray-300'
                    }`}
                  readOnly={isReadOnly}
                />
              );
            })()}
            {showValidationErrors && fieldErrors.eventType && (
              <p className="mt-1 text-sm text-red-600">
                {fieldErrors.eventType}
              </p>
            )}
          </div>
          { }
          <div>
            <label
              htmlFor="transaction-type"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Transaction Type *
            </label>
            {(() => {
              const isReadOnly = readOnly || (!isCloning && !!configId);
              return (
                <input
                  id="transaction-type"
                  type="text"
                  value={endpointData.transactionType || ''}
                  onChange={(e) =>
                    { handleEndpointDataChange('transactionType', e.target.value.toLowerCase()); }
                  }
                  onKeyPress={(e) => {
                    const char = e.key;
                    if (!/[a-zA-Z0-9_\-]/.test(char)) {
                      e.preventDefault();
                    }
                  }}
                  placeholder="e.g., pacs.008, pain.001"
                  className={`block w-full px-3 py-3 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm [&:-webkit-autofill]:bg-white ${isReadOnly
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : fieldErrors.transactionType
                      ? 'bg-white border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'bg-white border-gray-300'
                    }`}
                  readOnly={isReadOnly}
                />
              );
            })()}
            {showValidationErrors && fieldErrors.transactionType && (
              <p className="mt-1 text-sm text-red-600">
                {fieldErrors.transactionType}
              </p>
            )}
          </div>
          { }
          <div>
            <label
              htmlFor="content-type"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Content Type *
            </label>
            {(() => {
              const isReadOnly = readOnly || (!isCloning && !!configId);
              return (
                <select
                  id="content-type"
                  value={endpointData.contentType}
                  onChange={(e) =>
                    { handleEndpointDataChange('contentType', e.target.value); }
                  }
                  className={`block w-full px-3 py-3 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm [&:-webkit-autofill]:bg-white ${isReadOnly
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : 'bg-white border-gray-300'
                    }`}
                  disabled={isReadOnly}
                >
                  <option value="application/json">application/json</option>
                  <option value="application/xml">application/xml</option>
                </select>
              );
            })()}
          </div>
        </div>
        { }
        { }
        { }
        {endpointData.transactionType && (
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  Endpoint Path Preview
                </h4>
                { }
                <div className="bg-white border border-blue-200 rounded px-3 py-2 font-mono text-sm text-gray-900">
                  /{tenantId}/{endpointData.version || 'v1'}/
                  {endpointData.msgFam ? `${endpointData.msgFam}/` : ''}
                  {endpointData.transactionType}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {!readOnly && (shouldCreateNew || isCloning) && (
        <div>
          <div className="flex justify-between items-center mb-3 mt-10">
            <h3 className="text-base font-semibold flex items-center gap-1 text-blue-900">
              {configId ? (
                <>
                  <List className="text-blue-500" size={16} /> Configuration
                  Schema
                </>
              ) : (
                <>
                  <FileText className="text-blue-500" size={16} /> Configuration
                  Payload
                </>
              )}
            </h3>
            <div className="flex items-center space-x-2">
              {!isEditMode && !value && !readOnly && (
                <div className="flex space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className=" cursor-pointer"
                    style={{ backgroundColor: '#2b7fff', color: 'white' }}
                    icon={<FilePlus size={16} />}
                    onClick={() =>
                      { onChange(
                        endpointData.contentType === 'application/json'
                          ? sampleJsonPayload
                          : sampleXmlPayload,
                      ); }
                    }
                  >
                    Load{' '}
                    {endpointData.contentType === 'application/json'
                      ? 'JSON'
                      : 'XML'}{' '}
                    Sample
                  </Button>
                </div>
              )}
              {!readOnly && !isEditMode && value && (
                <Button
                  variant="secondary"
                  size="sm"
                  style={{ background: '#ff474d', color: 'white' }}
                  icon={<XCircle size={16} />}
                  className="cursor-pointer"
                  onClick={() => { onChange(''); }}
                >
                  Clear
                </Button>
              )}
              <div className="">
                {!readOnly && !isEditMode && (
                  <>
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept=".xml,.json"
                      onChange={handleFileUpload}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className=" cursor-pointer"
                      icon={<ArrowDownToLine size={16} />}
                      style={{ backgroundColor: '#2b7fff', color: 'white' }}
                      onClick={() =>
                        document.getElementById('file-upload')?.click()
                      }
                    >
                      Import File
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
          {payloadError &&
            !(payloadValidationMessage || fieldErrors.payload) && (
              <div className="my-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg
                      className="w-5 h-5 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-red-900 mb-1">
                      Error
                    </h4>
                    <p className="text-sm text-red-700">{payloadError}</p>
                  </div>
                  <button
                    onClick={() => setPayloadError(null)}
                    className="flex-shrink-0 text-red-500 hover:text-red-700"
                    title="Dismiss error"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          { }
          {!readOnly &&
            !isEditMode &&
            (payloadValidationMessage || fieldErrors.payload) && (
              <div
                className={`p-3 border rounded-md mb-3 mt-5 ${fieldErrors.payload
                  ? 'bg-red-50 border-red-200'
                  : isPayloadValid
                    ? 'bg-green-50 border-green-200'
                    : 'bg-yellow-50 border-yellow-200'
                  }`}
              >
                <p
                  className={`text-sm ${fieldErrors.payload
                    ? 'text-red-700'
                    : isPayloadValid
                      ? 'text-green-700'
                      : 'text-yellow-700'
                    }`}
                >
                  {fieldErrors.payload || payloadValidationMessage}
                </p>
              </div>
            )}
        </div>
      )}
      { }
      {!isEditMode && (shouldCreateNew || isCloning) && (
        <>
          <div className="flex gap-5 w-full">
            { }
            <div className="flex-1">
              <h4 className="text-sm font-bold flex items-center gap-1 text-gray-700 mb-2">
                <Terminal className="text-blue-500" size={16} /> Raw Input
              </h4>
              <div className=" rounded-md relative bg-white">
                <textarea
                  value={value}
                  onChange={(e) => { onChange(e.target.value); }}
                  className="w-full h-[400px] p-4 font-mono text-sm bg-white focus:outline-none border rounded-md resize-none scrollbar-hide"
                  spellCheck={false}
                  placeholder={`Enter your ${endpointData.contentType === 'application/json' ? 'JSON' : 'XML'} payload here...`}
                  readOnly={readOnly}
                />
              </div>
            </div>
            { }
            {endpointData.contentType === 'application/json' && (
              <div className="flex-1">
                <h4 className="text-sm font-bold flex items-center gap-1 text-gray-700 mb-2">
                  <Code2 className="text-blue-500" size={16} /> Formatted
                  Preview
                </h4>
                <div className="border rounded-md relative bg-white p-4 h-[400px] overflow-auto">
                  {FormattedJsonSection()}
                </div>
              </div>
            )}
          </div>
          { }
          <div className="my-6">
            {fieldGenerationError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 text-center">
                {fieldGenerationError}
              </div>
            )}
            { }
            {value && isPayloadValid && (
              <div className="text-center mb-4">
                <Button
                  variant="primary"
                  className=" cursor-pointer"
                  onClick={handleGenerateFields}
                  disabled={isGeneratingFields || !value.trim() || readOnly}
                  icon={<SparklesIcon size={16} />}
                >
                  {isGeneratingFields
                    ? 'Generating...'
                    : inferredFields.length > 0
                      ? 'Generate Fields'
                      : 'Generate Fields'}
                </Button>
              </div>
            )}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                {value.trim()
                  ? 'Click "Generate Fields" to create schema fields from your payload above.'
                  : 'Enter a payload above, then click "Generate Fields" to create schema fields.'}
              </p>
            </div>
          </div>
        </>
      )}
      { }
      {isEditMode && !readOnly && (
        <div className="my-5 mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900 mb-1">
                Edit Mode
              </h4>
              <p className="text-sm text-blue-700">
                Use the field editor below to add, remove, or modify schema
                fields.
              </p>
            </div>
          </div>
        </div>
      )}
      { }
      {showInferredFields && (
        <div className="mt-6 space-y-4">
          {(isEditMode || readOnly || inferredFields.length > 0) && (
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-semibold flex items-center gap-1 text-blue-900">
                    <List className="text-blue-500" size={16} /> Schema Fields
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {readOnly
                      ? 'Review the schema fields below for this configuration.'
                      : configId
                        ? 'Manually change type and requirements below.'
                        : 'Generate schema fields from your payload above, then adjust field types and requirements below.'}
                  </p>
                </div>
              </div>
            </div>
          )}
          { }
          {inferredFields.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              { }
              { }
              { }
              {isEditMode && !readOnly && (
                <div className="mt-4">
                  {!showAddFieldForm ? (
                    <button
                      onClick={() => { setShowAddFieldForm(true); }}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      Add Your First Field
                    </button>
                  ) : (
                    <div className="max-w-md mx-auto p-4 border border-gray-300 rounded-lg bg-gray-50 text-left">
                      <h4 className="text-sm font-medium text-gray-900 mb-3 text-center">
                        Add Your First Field
                      </h4>
                      <div className="space-y-3">
                        { }
                        <div>
                          <label
                            htmlFor="empty-field-path"
                            className="block text-xs font-medium text-gray-700 mb-1"
                          >
                            Field Path *
                          </label>
                          <input
                            id="empty-field-path"
                            type="text"
                            value={newField.path}
                            onChange={(e) =>
                              { setNewField((prev) => ({
                                ...prev,
                                path: e.target.value,
                              })); }
                            }
                            placeholder="e.g., user.name or address.street"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Use dots for nested fields (parent.child)
                          </p>
                        </div>
                        { }
                        <div>
                          <label
                            htmlFor="empty-field-type"
                            className="block text-xs font-medium text-gray-700 mb-1"
                          >
                            Type
                          </label>
                          <select
                            id="empty-field-type"
                            value={newField.type}
                            onChange={(e) =>
                              { setNewField((prev) => ({
                                ...prev,
                                type: e.target.value as InferredField['type'],
                              })); }
                            }
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                          >
                            <option value="String">String</option>
                            <option value="Number">Number</option>
                            <option value="Boolean">Boolean</option>
                            <option value="Object">Object</option>
                            <option value="Array">Array</option>
                          </select>
                        </div>
                        { }
                        <div className="flex items-center">
                          <input
                            id="empty-field-required"
                            type="checkbox"
                            checked={newField.required}
                            onChange={(e) =>
                              { setNewField((prev) => ({
                                ...prev,
                                required: e.target.checked,
                              })); }
                            }
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label
                            htmlFor="empty-field-required"
                            className="ml-2 text-sm text-gray-700"
                          >
                            Required field
                          </label>
                        </div>
                        { }
                        <div className="flex justify-center space-x-2 mt-4">
                          <button
                            onClick={() => {
                              setShowAddFieldForm(false);
                              setNewField({
                                path: '',
                                type: 'String',
                                required: false,
                              });
                            }}
                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleAddField}
                            disabled={!newField.path.trim()}
                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            Add Field
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              { }
              <div className="mb-3 p-2 bg-slate-50 rounded border border-slate-200">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-slate-700">
                      {inferredFields.length} fields
                    </span>
                    <span className="text-slate-600">
                      {inferredFields.filter((f) => f.required).length} required
                    </span>
                    <span className="text-slate-600">
                      {inferredFields.filter((f) => !f.required).length}{' '}
                      optional
                    </span>
                  </div>
                </div>
              </div>
              { }
              {isEditMode && !readOnly && (
                <div className="mb-4">
                  {!showAddFieldForm ? (
                    <button
                      onClick={() => { setShowAddFieldForm(true); }}
                      className="inline-flex items-center px-3 py-1 border border-dashed border-gray-300 rounded text-sm text-gray-600 bg-white hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      Add Field
                    </button>
                  ) : (
                    <div className="p-3 border border-gray-200 rounded bg-gray-50">
                      <div className="grid grid-cols-12 gap-2 items-center">
                        { }
                        <div className="col-span-5">
                          <input
                            type="text"
                            value={newField.path}
                            onChange={(e) =>
                              { setNewField((prev) => ({
                                ...prev,
                                path: e.target.value,
                              })); }
                            }
                            placeholder="Field path (e.g., user.name)"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        { }
                        <div className="col-span-2">
                          <select
                            value={newField.type}
                            onChange={(e) =>
                              { setNewField((prev) => ({
                                ...prev,
                                type: e.target.value as InferredField['type'],
                              })); }
                            }
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="String">String</option>
                            <option value="Number">Number</option>
                            <option value="Boolean">Boolean</option>
                            <option value="Object">Object</option>
                            <option value="Array">Array</option>
                          </select>
                        </div>
                        { }
                        <div className="col-span-2 flex items-center">
                          <input
                            type="checkbox"
                            checked={newField.required}
                            onChange={(e) =>
                              { setNewField((prev) => ({
                                ...prev,
                                required: e.target.checked,
                              })); }
                            }
                            className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label className="ml-1.5 text-xs text-gray-600">
                            Required
                          </label>
                        </div>
                        { }
                        <div className="col-span-3 flex justify-end gap-1">
                          <button
                            onClick={() => {
                              setShowAddFieldForm(false);
                              setNewField({
                                path: '',
                                type: 'String',
                                required: false,
                              });
                            }}
                            className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleAddField}
                            disabled={!newField.path.trim()}
                            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              { }
              <div className="border border-gray-200 rounded-lg">
                <div
                  className="space-y-2 p-2"
                  style={{
                    minWidth: `${Math.max(1000, 800 + Math.max(...inferredFields.map((f) => f.level)) * 40)}px`,
                  }}
                >
                  {inferredFields.map((field, index) => (
                    <div
                      key={index}
                      className="p-3 bg-white rounded border border-gray-200 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex gap-3 items-center w-full">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center">
                            { }
                            <div
                              className="flex items-center w-full"
                              style={{ paddingLeft: `${field.level * 24}px` }}
                            >
                              <input
                                type="text"
                                value={field.path}
                                readOnly
                                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-900 font-mono min-w-0"
                                title={field.path}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="w-32 flex-shrink-0">
                          <select
                            value={field.type}
                            onChange={(e) => {
                              const updatedFields = [...inferredFields];
                              updatedFields[index] = {
                                ...field,
                                type: e.target.value as InferredField['type'],
                              };
                              setInferredFields(updatedFields);
                            }}
                            disabled={readOnly}
                            className="w-full px-2 py-2 bg-white border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                          >
                            <option value="String">String</option>
                            <option value="Number">Number</option>
                            <option value="Boolean">Boolean</option>
                            <option value="Object">Object</option>
                            <option value="Array">Array</option>
                          </select>
                        </div>
                        <div className="w-28 flex-shrink-0 flex items-center justify-between">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id={`required-${index}`}
                              checked={field.required}
                              onChange={(e) => {
                                const updatedFields = [...inferredFields];
                                updatedFields[index] = {
                                  ...field,
                                  required: e.target.checked,
                                };
                                updatedFields.forEach((f, i) => {
                                  if (f.path.startsWith(field.path + '.')) {
                                    updatedFields[i] = {
                                      ...f,
                                      required: e.target.checked,
                                    };
                                  }
                                });
                                setInferredFields(updatedFields);
                              }}
                              disabled={readOnly}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <label
                              htmlFor={`required-${index}`}
                              className="ml-2 text-sm text-gray-600 cursor-pointer whitespace-nowrap"
                            >
                              Required
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          { }
          { }
        </div>
      )}
    </div>
  );
});

PayloadEditor.displayName = 'PayloadEditor';
