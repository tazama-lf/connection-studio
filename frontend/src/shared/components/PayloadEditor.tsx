import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import {
  UploadIcon,
  SparklesIcon,
  LoaderCircle,
  MinusCircle,
} from 'lucide-react';
import {
  type SchemaField,
  type FieldAdjustment,
} from '../../features/config/services/configApi';
import ReactJson from 'react-json-view';

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

export const PayloadEditor: React.FC<PayloadEditorProps> = ({
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
}) => {
  // New state for endpoint form data
  const [endpointData, setEndpointData] = useState<EndpointFormData>(
    initialEndpointData || {
      version: '',
      transactionType: '',
      description: '',
      contentType: 'application/json',
      msgFam: '',
    },
  );

  // State for inferred fields from schema generation
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

  // State for payload validation
  const [isPayloadValid, setIsPayloadValid] = useState<boolean>(false);
  const [payloadValidationMessage, setPayloadValidationMessage] =
    useState<string>('');

  // State for field validation errors
  const [fieldErrors, setFieldErrors] = useState<{
    version: string;
    transactionType: string;
    payload: string;
  }>({
    version: '',
    transactionType: '',
    payload: '',
  });

  // Helper function for capitalizing strings
  const capitalizeFirstLetter = (string: string): string => {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  };

  // Helper function to safely parse JSON
  const safeJsonParse = (
    jsonString: string,
  ): { success: boolean; data?: any; error?: string } => {
    try {
      const parsed = JSON.parse(jsonString || '{}');
      return { success: true, data: parsed };
    } catch (error) {
      return { success: false, error: 'Invalid JSON format' };
    }
  };

  // Validation functions
  const validateVersion = (version: string): string => {
    if (!version || !version.trim()) {
      return 'Version is required';
    }
    return '';
  };

  const validateTransactionType = (transactionType: string): string => {
    if (!transactionType || !transactionType.trim()) {
      return 'Transaction type is required';
    }
    return '';
  };

  const validatePayloadContent = (
    payloadValue: string,
    contentType: string,
    checkRequired: boolean = false,
  ): { isValid: boolean; message: string; error: string } => {
    // Only check if payload is required when explicitly requested (e.g., on save)
    if (checkRequired && (!payloadValue || !payloadValue.trim())) {
      return { isValid: false, message: '', error: 'Payload is required' };
    }

    // If payload is empty but we're not checking required, consider it valid (not yet filled)
    if (!payloadValue || !payloadValue.trim()) {
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

  // Handle adding a new field manually
  const handleAddField = () => {
    if (!newField.path.trim()) {
      return;
    }

    // Check if field already exists
    const existsAlready = inferredFields.some(
      (f) => f.path === newField.path.trim(),
    );
    if (existsAlready) {
      return; // Don't add duplicates
    }

    // Calculate the level based on dots in path
    const level = (newField.path.match(/\./g) || []).length;

    // Determine parent path
    const pathParts = newField.path.split('.');
    const parent =
      pathParts.length > 1 ? pathParts.slice(0, -1).join('.') : undefined;

    // Create new field
    const fieldToAdd: InferredField = {
      path: newField.path.trim(),
      type: newField.type,
      level,
      parent,
      required: newField.required,
    };

    // Add to fields list
    setInferredFields((prev) =>
      [...prev, fieldToAdd].sort((a, b) => a.path.localeCompare(b.path)),
    );

    // Reset form
    setNewField({
      path: '',
      type: 'String',
      required: false,
    });
    setShowAddFieldForm(false);

    console.log('✅ Added new field manually:', fieldToAdd);
  };

  // Convert SchemaField array to InferredField array for editing existing configs
  const convertSchemaFieldsToInferredFields = (
    schemaFields: SchemaField[],
  ): InferredField[] => {
    const convertFields = (fields: SchemaField[]): InferredField[] => {
      const inferredFields: InferredField[] = [];

      fields.forEach((field) => {
        // Calculate level from the path itself (count dots and .0. separately)
        // For "CstmrCdtTrfInitn.GrpHdr.InitgPty.Id.PrvtId.Othr" -> level 5
        // For "CstmrCdtTrfInitn.GrpHdr.InitgPty.Id.PrvtId.Othr.0.Id" -> level 7
        const dotCount = (field.path.match(/\./g) || []).length;
        const level = dotCount;

        // Debug logging for array fields
        if (field.type === 'array' && field.children) {
          console.log(`🔍 Processing array field: ${field.path}`, {
            arrayElementType: field.arrayElementType,
            childrenCount: field.children.length,
            childrenPaths: field.children.map((c) => c.path),
            level,
          });
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

        // Recursively convert child fields
        if (field.children && field.children.length > 0) {
          // Process children regardless of type - they have their own paths and levels
          const childFields = convertFields(field.children);
          if (field.type === 'array' && field.arrayElementType === 'object') {
            console.log(
              `✅ Array ${field.path} generated ${childFields.length} child fields:`,
              childFields.map((f) => f.path),
            );
          }
          inferredFields.push(...childFields);
        }
      });

      return inferredFields;
    };

    return convertFields(schemaFields);
  };

  // Sync local state with parent when editing existing endpoint
  useEffect(() => {
    if (initialEndpointData) {
      setEndpointData(initialEndpointData);
      console.log(
        'PayloadEditor - Updated with existing endpoint data:',
        initialEndpointData,
      );
    }
  }, [initialEndpointData]);

  // Initialize with existing schema fields when editing, or when returning from other steps
  useEffect(() => {
    // Load existing schema fields whenever they change (including when returning from other steps)
    if (existingSchemaFields && existingSchemaFields.length > 0) {
      console.log('🚨🚨🚨 ARRAY DEBUG START 🚨🚨🚨');
      console.log(
        'PayloadEditor - Converting existing schema fields:',
        existingSchemaFields,
      );
      console.log(
        '🔢 Raw schema fields received:',
        existingSchemaFields.length,
      );

      // Check if existingSchemaFields is already InferredField[] format
      if (
        existingSchemaFields[0] &&
        typeof existingSchemaFields[0] === 'object' &&
        'path' in existingSchemaFields[0] &&
        'type' in existingSchemaFields[0] &&
        'level' in existingSchemaFields[0]
      ) {
        console.log(
          '🚨 Schema is already InferredField[] format, using directly',
        );
        setInferredFields(existingSchemaFields as InferredField[]);
        setShowInferredFields(true);
        console.log(
          'PayloadEditor - Initialized with existing InferredField[]:',
          existingSchemaFields,
        );
        console.log(
          `🔢 FINAL RESULT: Total fields loaded: ${existingSchemaFields.length}`,
        );
      } else {
        // Legacy: Convert SchemaField[] to InferredField[]
        console.log(
          '🚨 Schema is SchemaField[] format, converting to InferredField[]',
        );
        console.log(
          '🚨 First few SchemaFields:',
          existingSchemaFields
            .slice(0, 5)
            .map((f: any) => ({ name: f.name, path: f.path, type: f.type })),
        );
        const inferredFields = convertSchemaFieldsToInferredFields(
          existingSchemaFields as SchemaField[],
        );
        console.log(
          '🚨 First few InferredFields after conversion:',
          inferredFields
            .slice(0, 5)
            .map((f) => ({ path: f.path, type: f.type, level: f.level })),
        );
        setInferredFields(inferredFields);
        setShowInferredFields(true);
        console.log(
          'PayloadEditor - Initialized with existing schema fields:',
          inferredFields,
        );
        console.log(
          `🔢 FINAL RESULT: Total fields loaded: ${inferredFields.length}`,
        );
      }

      console.log('🚨🚨🚨 ARRAY DEBUG END 🚨🚨🚨');
    } else if (
      configId &&
      (!existingSchemaFields || existingSchemaFields.length === 0)
    ) {
      // When editing existing config but no schema fields exist, show empty schema editor
      console.log(
        'PayloadEditor - Showing empty schema editor for existing config',
      );
      setShowInferredFields(true);
      setInferredFields([]);
    } else if (!configId) {
      console.log('PayloadEditor - No existing schema fields provided');
      // For new endpoints, also show the schema editor
      setShowInferredFields(true);
      setInferredFields([]);
    }
  }, [existingSchemaFields, configId]); // Removed hasUserMadeEdits dependency

  // Always show the schema fields section (no auto-generation)
  useEffect(() => {
    setShowInferredFields(true);
  }, []); // Only run once on component mount

  // Notify parent component when field adjustments change
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

  // Notify parent component when schema changes
  useEffect(() => {
    if (onSchemaChange) {
      // IMPORTANT: Call onSchemaChange whenever inferredFields changes, even if empty
      // This ensures parent component (EditEndpointModal) always has the latest schema state
      if (inferredFields.length > 0) {
        // Pass the InferredField[] array directly to preserve all field information
        console.log(
          '📤 PayloadEditor: Notifying parent of schema change:',
          inferredFields.length,
          'fields',
        );
        onSchemaChange(inferredFields);
      } else {
        // If no fields, notify parent with null to prevent stale data
        console.log('📤 PayloadEditor: Notifying parent of empty schema');
        // Don't set to null - let parent decide what to do with existing schema
        // onSchemaChange(null);
      }
    }
  }, [inferredFields, onSchemaChange]);

  // Manual generation function for new connections
  const handleGenerateFields = async () => {
    console.log('🔄 handleGenerateFields called');
    console.log('📄 Current payload value:', value);
    console.log('📏 Payload length:', value?.length);
    console.log('🎨 Content type:', endpointData.contentType);

    if (!value.trim()) {
      setFieldGenerationError('Please enter a payload first.');
      return;
    }

    // Prevent multiple simultaneous calls
    if (isGeneratingFields) {
      console.log('⚠️ Generation already in progress, ignoring duplicate call');
      return;
    }

    setIsGeneratingFields(true);
    setFieldGenerationError(null);

    try {
      console.log('🔍 Generating schema from payload...');
      // Generate schema from the current payload
      const schema = generateSchemaFromPayload(value, endpointData.contentType);
      console.log('✅ Generated schema:', schema);

      if (schema) {
        // Convert schema to InferredField format for display
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
        console.log('✅ Converted to inferred fields:', fields);
        console.log('📊 Total fields generated:', fields.length);

        setInferredFields(fields);
        setShowInferredFields(true);

        console.log('✅ Fields successfully set in state');
      } else {
        console.error('❌ Schema generation returned null');
        setFieldGenerationError('Failed to generate schema from payload');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ Schema inference error:', error);
      setFieldGenerationError(`Schema inference failed: ${errorMessage}`);
    } finally {
      setIsGeneratingFields(false);
    }
  };

  const handleEndpointDataChange = (
    field: keyof EndpointFormData,
    newValue: string,
  ) => {
    // Remove spaces from version, transactionType, and msgFam fields as they're used in URL paths
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

    // Validate the changed field
    let newFieldErrors = { ...fieldErrors };
    if (field === 'version') {
      newFieldErrors.version = validateVersion(sanitizedValue);
    } else if (field === 'transactionType') {
      newFieldErrors.transactionType = validateTransactionType(sanitizedValue);
    }

    setFieldErrors(newFieldErrors);

    // If content type changed, re-validate the payload
    if (field === 'contentType') {
      const payloadValidation = validatePayloadContent(value || '', newValue);
      setIsPayloadValid(payloadValidation.isValid);
      setPayloadValidationMessage(payloadValidation.message);
      setFieldErrors((prev) => ({ ...prev, payload: payloadValidation.error }));
    }
  };

  // Validation function to check if payload is valid JSON or XML
  const validatePayload = (payloadValue: string, contentType: string) => {
    const validation = validatePayloadContent(payloadValue, contentType);
    setIsPayloadValid(validation.isValid);
    setPayloadValidationMessage(validation.message);
    setFieldErrors((prev) => ({ ...prev, payload: validation.error }));
  };

  // Validate payload when it changes or when component mounts
  useEffect(() => {
    validatePayload(value, endpointData.contentType);
  }, [value, endpointData.contentType]);

  // Initialize field validation on mount and when endpointData changes
  // Note: Validation errors are only shown when user attempts to save, not on initial load
  useEffect(() => {
    // Don't set validation errors on initial load - only validate when saving
    setFieldErrors({
      version: '',
      transactionType: '',
      payload: '',
    });
  }, [endpointData.version, endpointData.transactionType]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file extension against selected content type
      const fileName = file.name.toLowerCase();
      const isJsonFile = fileName.endsWith('.json');
      const isXmlFile = fileName.endsWith('.xml');

      const expectedContentType = endpointData.contentType;
      const isJsonExpected = expectedContentType === 'application/json';
      const isXmlExpected = expectedContentType === 'application/xml';

      // Validate file extension matches content type
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
        // Clear the file input
        event.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;

        // Validate file content matches the expected format
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
          // Clear the file input
          event.target.value = '';
          return;
        }

        // Clear any previous errors and set the content
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

        // Generate comprehensive XML schema starting from root
        // Keep the root element (e.g., university, transaction) in the schema
        const rootSchema = generateXMLSchema(xmlDoc.documentElement);

        return rootSchema;
      } catch (e) {
        throw new Error('Invalid XML format');
      }
    }
    return null;
  };

  const generateJSONSchema = (obj: any, path = ''): SchemaField[] => {
    const schema: SchemaField[] = [];

    console.log(`🔍 generateJSONSchema called with path: "${path}"`);
    console.log(
      `📦 Object keys:`,
      obj && typeof obj === 'object' ? Object.keys(obj) : 'Not an object',
    );

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

        console.log(
          `  ➡️ Processing field: ${fieldPath}, type: ${fieldType}, isArray: ${Array.isArray(value)}`,
        );

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
          // Handle nested objects - recursively process
          console.log(`    🔄 Recursing into nested object at ${fieldPath}`);
          field.children = generateJSONSchema(value, fieldPath);
        } else if (Array.isArray(value) && value.length > 0) {
          const firstElement = value[0];
          console.log(
            `    📋 Array at ${fieldPath}, first element type:`,
            typeof firstElement,
            'isArray:',
            Array.isArray(firstElement),
          );

          if (
            typeof firstElement === 'object' &&
            firstElement !== null &&
            !Array.isArray(firstElement)
          ) {
            // Generate schema for array elements with objects
            // IMPORTANT: Use [0] notation for arrays to match schema utils expectations
            console.log(
              `    🔄 Recursing into array element object at ${fieldPath}[0]`,
            );
            // Update the field path to include [0] so it matches children paths
            field.path = `${fieldPath}[0]`;
            field.children = generateJSONSchema(
              firstElement,
              `${fieldPath}[0]`,
            );
            field.arrayElementType = 'object';
          } else if (Array.isArray(firstElement)) {
            // Handle arrays of arrays
            console.log(`    📋 Array of arrays at ${fieldPath}`);
            field.children = [];
            field.arrayElementType = 'array';
          } else {
            // Primitive array elements (string, number, boolean)
            console.log(`    🔤 Primitive array at ${fieldPath}`);
            field.arrayElementType = typeof firstElement;
          }
        }

        console.log(
          `  ✅ Created field: ${fieldPath}, has children:`,
          !!field.children,
          'children count:',
          field.children?.length || 0,
        );
        schema.push(field);
      });
    }

    console.log(
      `✅ generateJSONSchema returning ${schema.length} fields for path "${path}"`,
    );
    return schema;
  };

  const generateXMLSchema = (element: Element, path = ''): SchemaField[] => {
    const schema: SchemaField[] = [];
    const fieldPath = path ? `${path}.${element.tagName}` : element.tagName;

    // Create the main element field
    const field: SchemaField = {
      name: element.tagName,
      path: fieldPath,
      type: 'object',
      isRequired: true,
    };

    const children: SchemaField[] = [];

    // Handle XML attributes - xml2js mergeAttrs puts these as properties of the element
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

    // Handle child elements - xml2js makes these properties too
    const childElements = Array.from(element.children);
    if (childElements.length > 0) {
      // Group elements by tag name to handle multiple elements with same name
      const elementGroups = new Map<string, Element[]>();
      childElements.forEach((child) => {
        const tagName = child.tagName;
        if (!elementGroups.has(tagName)) {
          elementGroups.set(tagName, []);
        }
        elementGroups.get(tagName)!.push(child);
      });

      elementGroups.forEach((elements, tagName) => {
        if (elements.length === 1) {
          // Single element - xml2js creates direct property
          const childSchemas = generateXMLSchema(elements[0], fieldPath);
          children.push(...childSchemas);
        } else {
          // Multiple elements with same name - xml2js creates array
          const arrayField: SchemaField = {
            name: tagName,
            path: `${fieldPath}.${tagName}`,
            type: 'array',
            isRequired: true,
            arrayElementType: 'object',
          };

          if (elements.length > 0) {
            // Use first element as template for array items
            // Generate schema but only use the children, not the element wrapper itself
            const templateSchema = generateXMLSchema(
              elements[0],
              `${fieldPath}.${tagName}.0`,
            );
            if (templateSchema.length > 0 && templateSchema[0].children) {
              // Extract only the children to avoid duplicate nesting
              // (disciplines.discipline -> just the children of discipline, not discipline itself)
              arrayField.children = templateSchema[0].children;
            }
          }

          children.push(arrayField);
        }
      });
    }

    // Handle text content for leaf nodes
    if (element.textContent?.trim() && childElements.length === 0) {
      field.type = 'string';
    }

    // Add children if we have any
    if (children.length > 0) {
      field.children = children;
    }

    schema.push(field);
    return schema;
  };

  // Convert InferredField array back to SchemaField array for API updates
  const convertInferredFieldsToSchemaFields = (
    fields: InferredField[],
  ): SchemaField[] => {
    const schemaFields: SchemaField[] = [];

    // Process only root level fields first
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

      // Find direct children for this field
      const directChildren = fields.filter(
        (f) =>
          f.path !== rootField.path &&
          f.path.startsWith(rootField.path + '.') &&
          f.level === rootField.level + 1,
      );

      if (directChildren.length > 0) {
        // Recursively process children
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
  }
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
          onEdit={(e) => onChange(JSON.stringify(e.updated_src, null, 2))}
          onAdd={(e) => onChange(JSON.stringify(e.updated_src, null, 2))}
          onDelete={(e) => onChange(JSON.stringify(e.updated_src, null, 2))}
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
      {/* Endpoint Configuration Form */}
      <div className="">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Endpoint Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Version */}
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
                    handleEndpointDataChange('version', e.target.value)
                  }
                  placeholder="1.0"
                  className={`block w-full px-3 py-3 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm [&:-webkit-autofill]:bg-white  ${
                    isReadOnly
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : fieldErrors.version
                        ? 'bg-white border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'bg-white border-gray-300'
                  }`}
                  readOnly={isReadOnly}
                />
              );
            })()}
            {fieldErrors.version && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.version}</p>
            )}
          </div>

          {/* Event Type (Optional) */}
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
                    handleEndpointDataChange('msgFam', e.target.value)
                  }
                  placeholder="iso-20022"
                  className={`block w-full px-3 py-3 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm [&:-webkit-autofill]:bg-white ${
                    isReadOnly
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : 'bg-white border-gray-300'
                  }`}
                  readOnly={isReadOnly}
                />
              );
            })()}
          </div>

          {/* Transaction Type */}
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
                    handleEndpointDataChange('transactionType', e.target.value)
                  }
                  placeholder="e.g., pacs.008, pain.001"
                  className={`block w-full px-3 py-3 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm [&:-webkit-autofill]:bg-white ${
                    isReadOnly
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : fieldErrors.transactionType
                        ? 'bg-white border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'bg-white border-gray-300'
                  }`}
                  readOnly={isReadOnly}
                />
              );
            })()}
            {fieldErrors.transactionType && (
              <p className="mt-1 text-sm text-red-600">
                {fieldErrors.transactionType}
              </p>
            )}
          </div>

          {/* Content Type */}
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
                    handleEndpointDataChange('contentType', e.target.value)
                  }
                  className={`block w-full px-3 py-3 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm [&:-webkit-autofill]:bg-white ${
                    isReadOnly
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : 'bg-white border-gray-300'
                  }`}
                  // readOnly={isReadOnly}
                  disabled={isReadOnly}
                >
                  <option value="application/json">application/json</option>
                  <option value="application/xml">application/xml</option>
                </select>
              );
            })()}
          </div>
        </div>

        {/* Description */}
        {/* <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={endpointData.description}
            onChange={(e) => handleEndpointDataChange('description', e.target.value)}
            placeholder="Brief description of this endpoint..."
            rows={2}
            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div> */}

        {/* Real-time Endpoint Path Preview */}
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
                {/* <p className="text-xs text-blue-700 mb-2">This endpoint will be accessible at:</p> */}
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

      {!readOnly && (
        <div>
          <div className="flex justify-between items-center mb-3 mt-10">
            <h3 className="text-lg font-medium text-gray-900">
              {configId ? 'Configuration Schema' : 'Configuration Payload'}
            </h3>
            <div className="flex items-center space-x-2">
              {!isEditMode && !value && !readOnly && (
                <div className="flex space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className=" cursor-pointer"
                    icon={<LoaderCircle size={16} />}
                    onClick={() =>
                      onChange(
                        endpointData.contentType === 'application/json'
                          ? sampleJsonPayload
                          : sampleXmlPayload,
                      )
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
                  icon={<MinusCircle size={16} />}
                  className="cursor-pointer"
                  onClick={() => onChange('')}
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
                      icon={<UploadIcon size={16} />}
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

          {/* Format Validation Status - Full Width Below Heading */}
          {!readOnly &&
            !isEditMode &&
            (payloadValidationMessage || fieldErrors.payload) && (
              <div
                className={`p-3 border rounded-md mb-3 mt-5 ${
                  fieldErrors.payload
                    ? 'bg-red-50 border-red-200'
                    : isPayloadValid
                      ? 'bg-green-50 border-green-200'
                      : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <p
                  className={`text-sm ${
                    fieldErrors.payload
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

      {/* Code Editor - Hide completely in edit mode */}
      {!isEditMode && (
        <>
          <div className="flex gap-5 w-full">
            {/* Left Side - Raw Input */}
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Raw Input
              </h4>
              <div className=" rounded-md relative bg-white">
                <textarea
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="w-full h-[400px] p-4 font-mono text-sm bg-white focus:outline-none border rounded-md resize-none scrollbar-hide"
                  spellCheck={false}
                  placeholder={`Enter your ${endpointData.contentType === 'application/json' ? 'JSON' : 'XML'} payload here...`}
                  readOnly={readOnly}
                />
              </div>
            </div>

            {/* Right Side - Formatted Preview */}
            {endpointData.contentType === 'application/json' && (
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Formatted Preview
                </h4>
                <div className="border rounded-md relative bg-white p-4 h-[400px] overflow-auto">
                  {FormattedJsonSection()}
                </div>
              </div>
            )}
          </div>

          {/* Schema Generation Info */}
          <div className="my-6">
            {fieldGenerationError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 text-center">
                {fieldGenerationError}
              </div>
            )}

            {/* Show Generate Fields button for creation mode */}
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

      {/* Edit Mode Info */}
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

      {/* Schema Fields Section */}
      {showInferredFields && (
        <div className="mt-6 space-y-4">
          {(isEditMode || readOnly || inferredFields.length > 0) && (
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Schema Fields
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {readOnly
                      ? 'Review the schema fields below for this configuration.'
                      : configId
                        ? 'Manually add, remove, and edit schema fields below.'
                        : 'Generate schema fields from your payload above, then adjust field types and requirements below.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Field Editor Content */}
          {inferredFields.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {/* <p className="text-sm">No schema fields generated yet.</p> */}
              {/* <p className="text-xs mt-1">
                    {configId 
                      ? 'Use the field editor to manually add schema fields for this config:'
                      : 'Enter a valid JSON or XML payload above, then click "Generate Fields from Payload" to create schema fields.'
                    }
                  </p> */}

              {/* Add Field Button for Empty State - Only in edit mode and not read-only */}
              {isEditMode && !readOnly && (
                <div className="mt-4">
                  {!showAddFieldForm ? (
                    <button
                      onClick={() => setShowAddFieldForm(true)}
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
                        {/* Field Path Input */}
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
                              setNewField((prev) => ({
                                ...prev,
                                path: e.target.value,
                              }))
                            }
                            placeholder="e.g., user.name or address.street"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Use dots for nested fields (parent.child)
                          </p>
                        </div>

                        {/* Field Type Select */}
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
                              setNewField((prev) => ({
                                ...prev,
                                type: e.target.value as InferredField['type'],
                              }))
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

                        {/* Required Checkbox */}
                        <div className="flex items-center">
                          <input
                            id="empty-field-required"
                            type="checkbox"
                            checked={newField.required}
                            onChange={(e) =>
                              setNewField((prev) => ({
                                ...prev,
                                required: e.target.checked,
                              }))
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

                        {/* Action Buttons */}
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
              {/* Field Summary */}
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

              {/* Add Field Section - Only show when editing existing configs and not read-only */}
              {isEditMode && !readOnly && (
                <div className="mb-4">
                  {!showAddFieldForm ? (
                    <button
                      onClick={() => setShowAddFieldForm(true)}
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
                        {/* Field Path Input */}
                        <div className="col-span-5">
                          <input
                            type="text"
                            value={newField.path}
                            onChange={(e) =>
                              setNewField((prev) => ({
                                ...prev,
                                path: e.target.value,
                              }))
                            }
                            placeholder="Field path (e.g., user.name)"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* Field Type Select */}
                        <div className="col-span-2">
                          <select
                            value={newField.type}
                            onChange={(e) =>
                              setNewField((prev) => ({
                                ...prev,
                                type: e.target.value as InferredField['type'],
                              }))
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

                        {/* Required Checkbox */}
                        <div className="col-span-2 flex items-center">
                          <input
                            type="checkbox"
                            checked={newField.required}
                            onChange={(e) =>
                              setNewField((prev) => ({
                                ...prev,
                                required: e.target.checked,
                              }))
                            }
                            className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label className="ml-1.5 text-xs text-gray-600">
                            Required
                          </label>
                        </div>

                        {/* Action Buttons */}
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

              {/* Fields container with single scroll for all fields */}
              <div className="overflow-x-auto overflow-y-auto max-h-96 border border-gray-200 rounded-lg">
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
                            {/* Simple spacing-based indentation with full width */}
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
                              console.log(
                                `🔄 Type changed for field "${field.path}": ${field.type} → ${e.target.value}`,
                              );
                              const updatedFields = [...inferredFields];
                              updatedFields[index] = {
                                ...field,
                                type: e.target.value as InferredField['type'],
                              };
                              console.log(
                                '📊 Updated fields after type change:',
                                updatedFields.map((f) => ({
                                  path: f.path,
                                  type: f.type,
                                  required: f.required,
                                })),
                              );
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
                                console.log(
                                  `☑️ Required changed for field "${field.path}": ${field.required} → ${e.target.checked}`,
                                );
                                const updatedFields = [...inferredFields];

                                // Update current field
                                updatedFields[index] = {
                                  ...field,
                                  required: e.target.checked,
                                };

                                // Update all child fields with same required status
                                updatedFields.forEach((f, i) => {
                                  if (f.path.startsWith(field.path + '.')) {
                                    updatedFields[i] = {
                                      ...f,
                                      required: e.target.checked,
                                    };
                                  }
                                });

                                console.log(
                                  '📊 Updated fields after required change (with children):',
                                  updatedFields.map((f) => ({
                                    path: f.path,
                                    type: f.type,
                                    required: f.required,
                                  })),
                                );
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

          {/* Schema Edit Info */}
          {/* {configId && inferredFields.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="text-blue-600">
                  <SaveIcon size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-blue-900">Schema Changes Ready</h4>
                  <p className="text-xs text-blue-700 mt-1">
                    Your schema field changes will be saved when you click the main "Save" button above.
                  </p>
                </div>
              </div>
            </div>
          )} */}
        </div>
      )}
    </div>
  );
};
