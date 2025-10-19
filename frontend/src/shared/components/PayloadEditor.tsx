import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { UploadIcon, SaveIcon, SparklesIcon } from 'lucide-react';
import { type SchemaField, type FieldAdjustment } from '../../features/config/services/configApi';
import { convertInferredFieldsToJsonSchema } from '../utils/schemaUtils';

interface PayloadEditorProps {
  value: string;
  onChange: (value: string) => void;
  endpointData?: EndpointFormData;
  onEndpointDataChange?: (data: EndpointFormData) => void;
  configId?: number; // Optional config ID for schema updates
  onFieldAdjustmentsChange?: (fieldAdjustments: FieldAdjustment[]) => void; // Callback for field adjustments
  onSchemaChange?: (schema: any) => void; // Callback for current schema
  existingSchemaFields?: SchemaField[]; // Existing schema fields when editing
  isEditMode?: boolean; // Explicitly control whether to show Add/Remove field buttons
  tenantId?: string; // Tenant ID for endpoint preview
  readOnly?: boolean; // When true, disable all editing functionality
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
  readOnly = false
}) => {

  
  // New state for endpoint form data
  const [endpointData, setEndpointData] = useState<EndpointFormData>(
    initialEndpointData || {
      version: '1.0',
      transactionType: '',
      description: '',
      contentType: 'application/json',
      msgFam: '',
    }
  );

  // State for inferred fields from schema generation
  const [inferredFields, setInferredFields] = useState<InferredField[]>([]);
  const [showInferredFields, setShowInferredFields] = useState(false);

  const [fieldGenerationError, setFieldGenerationError] = useState<string | null>(null);
  const [isGeneratingFields, setIsGeneratingFields] = useState(false);
  const [hasUserMadeEdits, setHasUserMadeEdits] = useState(false);
  const [showAddFieldForm, setShowAddFieldForm] = useState(false);
  const [newField, setNewField] = useState({
    path: '',
    type: 'String' as InferredField['type'],
    required: false
  });

  // State for payload validation
  const [isPayloadValid, setIsPayloadValid] = useState<boolean>(false);
  const [payloadValidationMessage, setPayloadValidationMessage] = useState<string>('');

  // Helper function for capitalizing strings
  const capitalizeFirstLetter = (string: string): string => {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  };

  // Handle adding a new field manually
  const handleAddField = () => {
    if (!newField.path.trim()) {
      return;
    }

    // Check if field already exists
    const existsAlready = inferredFields.some(f => f.path === newField.path.trim());
    if (existsAlready) {
      return; // Don't add duplicates
    }

    // Calculate the level based on dots in path
    const level = (newField.path.match(/\./g) || []).length;
    
    // Determine parent path
    const pathParts = newField.path.split('.');
    const parent = pathParts.length > 1 ? pathParts.slice(0, -1).join('.') : undefined;

    // Create new field
    const fieldToAdd: InferredField = {
      path: newField.path.trim(),
      type: newField.type,
      level,
      parent,
      required: newField.required
    };

    // Add to fields list
    setInferredFields(prev => [...prev, fieldToAdd].sort((a, b) => a.path.localeCompare(b.path)));
    setHasUserMadeEdits(true);
    
    // Reset form
    setNewField({
      path: '',
      type: 'String',
      required: false
    });
    setShowAddFieldForm(false);
    
    console.log('✅ Added new field manually:', fieldToAdd);
  };



  // Convert SchemaField array to InferredField array for editing existing configs
  const convertSchemaFieldsToInferredFields = (schemaFields: SchemaField[]): InferredField[] => {
    const convertFields = (fields: SchemaField[], level = 0): InferredField[] => {
      const inferredFields: InferredField[] = [];
      
      fields.forEach(field => {
        const inferredField: InferredField = {
          path: field.path,
          type: capitalizeFirstLetter(field.type) as InferredField['type'],
          level,
          parent: field.path.includes('.') ? field.path.substring(0, field.path.lastIndexOf('.')) : undefined,
          required: field.isRequired
        };
        
        inferredFields.push(inferredField);
        
        // Recursively convert child fields
        if (field.children && field.children.length > 0) {
          const childFields = convertFields(field.children, level + 1);
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
      console.log('PayloadEditor - Updated with existing endpoint data:', initialEndpointData);
    }
  }, [initialEndpointData]);

  // Initialize with existing schema fields when editing, but don't overwrite user edits
  useEffect(() => {
    // Only initialize if user hasn't made manual edits yet
    if (!hasUserMadeEdits && existingSchemaFields && existingSchemaFields.length > 0) {
      console.log('PayloadEditor - Converting existing schema fields (initial load):', existingSchemaFields);
      const inferredFields = convertSchemaFieldsToInferredFields(existingSchemaFields);
      setInferredFields(inferredFields);
      setShowInferredFields(true);
      console.log('PayloadEditor - Initialized with existing schema fields:', inferredFields);
      console.log(`PayloadEditor - Total fields loaded: ${inferredFields.length}`);
    } else if (!hasUserMadeEdits && configId && (!existingSchemaFields || existingSchemaFields.length === 0)) {
      // When editing existing config but no schema fields exist, show empty schema editor
      console.log('PayloadEditor - Showing empty schema editor for existing config');
      setShowInferredFields(true);
      setInferredFields([]);
    } else if (!hasUserMadeEdits && !configId) {
      console.log('PayloadEditor - No existing schema fields provided');
      // For new endpoints, also show the schema editor
      setShowInferredFields(true);
      setInferredFields([]);
    } else if (hasUserMadeEdits) {
      console.log('🔒 User has made manual edits - preserving current schema fields');
    }
  }, [existingSchemaFields, configId, hasUserMadeEdits]);

  // Always show the schema fields section (no auto-generation)
  useEffect(() => {
    setShowInferredFields(true);
  }, []); // Only run once on component mount

  // Notify parent component when field adjustments change
  useEffect(() => {
    if (onFieldAdjustmentsChange && inferredFields.length > 0) {
      const fieldAdjustments = inferredFields.map(field => ({
        path: field.path,
        type: field.type.toUpperCase() as 'STRING' | 'NUMBER' | 'BOOLEAN' | 'OBJECT' | 'ARRAY',
        isRequired: field.required
      }));
      onFieldAdjustmentsChange(fieldAdjustments);
    }
  }, [inferredFields, onFieldAdjustmentsChange]);

  // Notify parent component when schema changes
  useEffect(() => {
    if (onSchemaChange && inferredFields.length > 0) {
      const currentSchema = convertInferredFieldsToJsonSchema(inferredFields);
      if (currentSchema) {
        onSchemaChange(currentSchema);
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

    setIsGeneratingFields(true);
    setFieldGenerationError(null);

    try {
      console.log('🔍 Generating schema from payload...');
      // Generate schema from the current payload
      const schema = generateSchemaFromPayload(value, endpointData.contentType);
      console.log('✅ Generated schema:', schema);
      
      if (schema) {
        // Convert schema to InferredField format for display
        const convertSchemaToFields = (schemaFields: SchemaField[], level = 0, parentPath = ''): InferredField[] => {
          const fields: InferredField[] = [];
          
          schemaFields.forEach((field) => {
            fields.push({
              path: field.path,
              type: capitalizeFirstLetter(field.type) as InferredField['type'],
              level,
              parent: parentPath || (field.path.includes('.') ? field.path.substring(0, field.path.lastIndexOf('.')) : undefined),
              required: field.isRequired,
            });
            
            if (field.children) {
              fields.push(...convertSchemaToFields(field.children, level + 1, field.path));
            }
          });
          
          return fields;
        };

        const fields = convertSchemaToFields(schema);
        console.log('✅ Converted to inferred fields:', fields);
        console.log('📊 Total fields generated:', fields.length);
        
        setInferredFields(fields);
        setShowInferredFields(true);
        setHasUserMadeEdits(true); // Mark that fields have been generated/regenerated
        
        console.log('✅ Fields successfully set in state');
      } else {
        console.error('❌ Schema generation returned null');
        setFieldGenerationError('Failed to generate schema from payload');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ Schema inference error:', error);
      setFieldGenerationError(`Schema inference failed: ${errorMessage}`);
    } finally {
      setIsGeneratingFields(false);
    }
  };

  const handleEndpointDataChange = (field: keyof EndpointFormData, newValue: string) => {
    const updatedData = { ...endpointData, [field]: newValue };
    setEndpointData(updatedData);
    if (onEndpointDataChange) {
      onEndpointDataChange(updatedData);
    }
    
    // If content type changed, re-validate the payload
    if (field === 'contentType') {
      validatePayload(value || '', newValue);
    }
  };

  // Validation function to check if payload is valid JSON or XML
  const validatePayload = (payloadValue: string, contentType: string) => {
    if (!payloadValue || !payloadValue.trim()) {
      setIsPayloadValid(false);
      setPayloadValidationMessage('');
      return;
    }

    if (contentType === 'application/json') {
      try {
        JSON.parse(payloadValue);
        setIsPayloadValid(true);
        setPayloadValidationMessage('Valid JSON format detected');
      } catch (e) {
        setIsPayloadValid(false);
        setPayloadValidationMessage('Invalid JSON format');
      }
    } else if (contentType === 'application/xml') {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(payloadValue, 'text/xml');
        const parseError = xmlDoc.getElementsByTagName('parsererror');
        if (parseError.length > 0) {
          setIsPayloadValid(false);
          setPayloadValidationMessage('Invalid XML format');
        } else {
          setIsPayloadValid(true);
          setPayloadValidationMessage('Valid XML format detected');
        }
      } catch (e) {
        setIsPayloadValid(false);
        setPayloadValidationMessage('Invalid XML format');
      }
    }
  };

  // Validate payload when it changes or when component mounts
  useEffect(() => {
    validatePayload(value, endpointData.contentType);
  }, [value, endpointData.contentType]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        const content = e.target?.result as string;
        onChange(content);
      };
      reader.readAsText(file);
    }
  };



  const generateSchemaFromPayload = (payload: string, contentType: string): any => {
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
          type: fieldType as 'string' | 'number' | 'boolean' | 'object' | 'array',
          isRequired: true
        };

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Handle nested objects
          field.children = generateJSONSchema(value, fieldPath);
        } else if (Array.isArray(value) && value.length > 0) {
          const firstElement = value[0];
          if (typeof firstElement === 'object' && firstElement !== null) {
            // Generate schema for array elements
            // For array children, generate paths relative to the array element
            // This will create paths like: fieldPath.childName which extractFieldName can handle
            field.children = generateJSONSchema(firstElement, fieldPath);
            field.arrayElementType = 'object';
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
    
    // Create the main element field
    const field: SchemaField = {
      name: element.tagName,
      path: fieldPath,
      type: 'object',
      isRequired: true
    };

    const children: SchemaField[] = [];
    
    // Handle XML attributes - xml2js mergeAttrs puts these as properties of the element
    if (element.attributes && element.attributes.length > 0) {
      Array.from(element.attributes).forEach(attr => {
        children.push({
          name: attr.name,
          path: `${fieldPath}.${attr.name}`,
          type: 'string',
          isRequired: true
        });
      });
    }
    
    // Handle child elements - xml2js makes these properties too
    const childElements = Array.from(element.children);
    if (childElements.length > 0) {
      // Group elements by tag name to handle multiple elements with same name
      const elementGroups = new Map<string, Element[]>();
      childElements.forEach(child => {
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
            arrayElementType: 'object'
          };
          
          if (elements.length > 0) {
            // Use first element as template for array items
            // Generate schema but only use the children, not the element wrapper itself
            const templateSchema = generateXMLSchema(elements[0], `${fieldPath}.${tagName}[0]`);
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
  const convertInferredFieldsToSchemaFields = (fields: InferredField[]): SchemaField[] => {
    const schemaFields: SchemaField[] = [];
    
    // Process only root level fields first
    const rootFields = fields.filter(f => f.level === 0);
    
    rootFields.forEach(rootField => {
      const schemaField: SchemaField = {
        name: rootField.path.split('.').pop() || rootField.path,
        path: rootField.path,
        type: rootField.type.toLowerCase() as 'string' | 'number' | 'boolean' | 'object' | 'array',
        isRequired: rootField.required,
      };

      // Find direct children for this field
      const directChildren = fields.filter(f => 
        f.path !== rootField.path && 
        f.path.startsWith(rootField.path + '.') &&
        f.level === rootField.level + 1
      );

      if (directChildren.length > 0) {
        // Recursively process children
        schemaField.children = convertInferredFieldsToSchemaFields(
          fields.filter(f => f.path.startsWith(rootField.path + '.'))
        );
      }

      schemaFields.push(schemaField);
    });

    return schemaFields;
  };





  const sampleJsonPayload = `{
  "transaction": {
    "id": "TX12345",
    "amount": 100.5,
    "currency": "USD",
    "status": "pending"
  },
  "customer": {
    "id": "C789",
    "name": "John Doe",
    "email": "john@example.com"
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

  return (
    <div className="space-y-4">
      {/* Endpoint Configuration Form */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Endpoint Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Version */}
          <div>
            <label htmlFor="version" className="block text-sm font-medium text-gray-700 mb-1">
              Version *
            </label>
            <input
              id="version"
              type="text"
              value={endpointData.version}
              onChange={(e) => handleEndpointDataChange('version', e.target.value)}
              placeholder="1.0"
              className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              readOnly={readOnly}
            />
          </div>

          {/* Transaction Type */}
          <div>
            <label htmlFor="transaction-type" className="block text-sm font-medium text-gray-700 mb-1">
              Transaction Type *
            </label>
               <input
              id="transaction-type"
              type="text"
              value={endpointData.transactionType || ''}
              onChange={(e) => handleEndpointDataChange('transactionType', e.target.value)}
              placeholder="e.g., pacs.008, pain.001"
              className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              readOnly={readOnly}
            />
           
          </div>

          {/* Message Family (Optional) */}
          <div>
            <label htmlFor="msgFam" className="block text-sm font-medium text-gray-700 mb-1">
              Message Family
            </label>
            <input
              id="msgFam"
              type="text"
              value={endpointData.msgFam || ''}
              onChange={(e) => handleEndpointDataChange('msgFam', e.target.value)}
              placeholder="optional"
              className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              readOnly={readOnly}
            />
          </div>

          {/* Content Type */}
          <div>
            <label htmlFor="content-type" className="block text-sm font-medium text-gray-700 mb-1">
              Content Type *
            </label>
            <select
              id="content-type"
              value={endpointData.contentType}
              onChange={(e) => handleEndpointDataChange('contentType', e.target.value)}
              className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled={readOnly}
            >
              <option value="application/json">application/json</option>
              <option value="application/xml">application/xml</option>
            </select>
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
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900 mb-1">Endpoint Path Preview</h4>
                <p className="text-xs text-blue-700 mb-2">This endpoint will be accessible at:</p>
                <div className="bg-white border border-blue-200 rounded px-3 py-2 font-mono text-sm text-gray-900">
                  /{tenantId}/{endpointData.version || 'v1'}/{endpointData.msgFam ? `${endpointData.msgFam}/` : ''}{endpointData.transactionType}
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  💡 This path will be saved to the database once you complete all steps
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">
          {configId ? 'Configuration Schema' : 'Configuration Payload'}
        </h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Format:</label>
            <span className="px-2 py-1 border border-gray-300 rounded text-sm bg-gray-50">
              {endpointData.contentType === 'application/json' ? 'JSON' : 'XML'}
            </span>
          </div>
          <div className="border-l border-gray-300 pl-4">
            {!readOnly && (
              <>
                <input type="file" id="file-upload" className="hidden" accept=".xml,.json" onChange={handleFileUpload} />
                <Button 
                  variant="secondary" 
                  size="sm" 
                  icon={<UploadIcon size={16} />} 
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  Import File
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sample Payload Buttons - Only show when NOT in edit mode */}
      {!isEditMode && !value && !readOnly && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700 mb-2">Need a starting point? Try these sample payloads:</p>
          <div className="flex space-x-2">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => onChange(endpointData.contentType === 'application/json' ? sampleJsonPayload : sampleXmlPayload)}
            >
              Load {endpointData.contentType === 'application/json' ? 'JSON' : 'XML'} Sample
            </Button>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => onChange('')}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Code Editor - Hide completely in edit mode */}
      {!isEditMode && (
        <>
          <div className="border rounded-md relative">
            <textarea 
              value={value} 
              onChange={(e) => onChange(e.target.value)} 
              className="w-full h-96 p-4 font-mono text-sm bg-gray-50"
              spellCheck="false" 
              placeholder={`Enter your ${endpointData.contentType === 'application/json' ? 'JSON' : 'XML'} payload here...`}
              readOnly={readOnly}
            />
          </div>

          {/* Format Validation Status */}
          {payloadValidationMessage && (
            <div className={`p-3 ${isPayloadValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-md`}>
              <p className={`text-sm ${isPayloadValid ? 'text-green-700' : 'text-red-700'}`}>
                {payloadValidationMessage}
              </p>
            </div>
          )}

          {/* Schema Generation Info */}
          <div className="my-6">
            {fieldGenerationError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 text-center">
                {fieldGenerationError}
              </div>
            )}
            
            {/* Show Generate Fields button for creation mode */}
            {value && (
              <div className="text-center mb-4">
                <Button
                  variant="primary"
                  onClick={handleGenerateFields}
                  disabled={isGeneratingFields || !value.trim() || readOnly}
                  icon={<SparklesIcon size={16} />}
                >
                  {isGeneratingFields ? 'Generating...' : inferredFields.length > 0 ? 'Regenerate Fields' : 'Generate Fields'}
                </Button>
                {inferredFields.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    💡 You can modify your payload and regenerate fields as many times as needed
                  </p>
                )}
              </div>
            )}
            
            <div className="text-center">
              <p className="text-sm text-gray-600">
                {value.trim() 
                  ? 'Click "Generate Fields" to create schema fields from your payload above.'
                  : 'Enter a payload above, then click "Generate Fields" to create schema fields.'
                }
              </p>
            </div>
          </div>
        </>
      )}
      
      {/* Edit Mode Info */}
      {isEditMode && !readOnly && (
        <div className="my-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900 mb-1">Edit Mode</h4>
              <p className="text-sm text-blue-700">
                Use the field editor below to add, remove, or modify schema fields.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Schema Fields Section */}
      {showInferredFields && (
        <div className="mt-8 space-y-4">
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
                      ? 'Manually add, remove, and edit schema fields below. The payload above is read-only in edit mode.'
                      : 'Generate schema fields from your payload above, then adjust field types and requirements below.'
                  }
                </p>
              </div>
              
              {/* Generate Fields Button - Only for new configs */}
              {/* {!configId && value.trim() && endpointData.contentType && (
                <Button
                  variant="secondary"
                  icon={<SparklesIcon size={16} />}
                  onClick={handleGenerateFields}
                  disabled={isGeneratingFields}
                  size="sm"
                >
                  {isGeneratingFields ? 'Generating...' : 'Generate Fields from Payload'}
                </Button>
              )} */}
            </div>
          </div>
          
          {/* Field Editor Content */}
              {inferredFields.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No schema fields generated yet.</p>
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
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Your First Field
                      </button>
                    ) : (
                      <div className="max-w-md mx-auto p-4 border border-gray-300 rounded-lg bg-gray-50 text-left">
                        <h4 className="text-sm font-medium text-gray-900 mb-3 text-center">Add Your First Field</h4>
                        <div className="space-y-3">
                          {/* Field Path Input */}
                          <div>
                            <label htmlFor="empty-field-path" className="block text-xs font-medium text-gray-700 mb-1">
                              Field Path *
                            </label>
                            <input
                              id="empty-field-path"
                              type="text"
                              value={newField.path}
                              onChange={(e) => setNewField(prev => ({ ...prev, path: e.target.value }))}
                              placeholder="e.g., user.name or address.street"
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">Use dots for nested fields (parent.child)</p>
                          </div>

                          {/* Field Type Select */}
                          <div>
                            <label htmlFor="empty-field-type" className="block text-xs font-medium text-gray-700 mb-1">
                              Type
                            </label>
                            <select
                              id="empty-field-type"
                              value={newField.type}
                              onChange={(e) => setNewField(prev => ({ ...prev, type: e.target.value as InferredField['type'] }))}
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
                              onChange={(e) => setNewField(prev => ({ ...prev, required: e.target.checked }))}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="empty-field-required" className="ml-2 text-sm text-gray-700">
                              Required field
                            </label>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex justify-center space-x-2 mt-4">
                            <button
                              onClick={() => {
                                setShowAddFieldForm(false);
                                setNewField({ path: '', type: 'String', required: false });
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
                      {inferredFields.filter(f => f.required).length} required
                    </span>
                    <span className="text-slate-600">
                      {inferredFields.filter(f => !f.required).length} optional
                    </span>
                  </div>
                  {hasUserMadeEdits && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-xs">
                      <svg className="w-2.5 h-2.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                      </svg>
                      Modified
                    </span>
                  )}
                </div>
              </div>

              {/* Add Field Section - Only show when editing existing configs and not read-only */}
              {isEditMode && !readOnly && (
                <div className="mb-4">
                  {!showAddFieldForm ? (
                    <button
                      onClick={() => setShowAddFieldForm(true)}
                      className="inline-flex items-center px-3 py-1.5 border border-dashed border-gray-300 rounded text-sm text-gray-600 bg-white hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
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
                          onChange={(e) => setNewField(prev => ({ ...prev, path: e.target.value }))}
                          placeholder="Field path (e.g., user.name)"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      {/* Field Type Select */}
                      <div className="col-span-2">
                        <select
                          value={newField.type}
                          onChange={(e) => setNewField(prev => ({ ...prev, type: e.target.value as InferredField['type'] }))}
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
                          onChange={(e) => setNewField(prev => ({ ...prev, required: e.target.checked }))}
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
                            setNewField({ path: '', type: 'String', required: false });
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

              <div className="space-y-2">
                {inferredFields.map((field, index) => (
                <div key={index} className={`${field.level > 0 ? 'ml-' + (field.level * 4) + ' border-l-2 border-gray-300 pl-3' : ''} p-3 bg-white rounded border border-gray-200 hover:border-gray-300 transition-colors`}>
                  <div className="grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-6">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${
                          field.level === 0 ? 'bg-slate-50 text-slate-600 border-slate-200' : 
                          field.level === 1 ? 'bg-gray-50 text-gray-500 border-gray-200' : 
                          'bg-neutral-50 text-neutral-500 border-neutral-200'
                        }`}>
                          L{field.level}
                        </span>
                        <input 
                          type="text" 
                          value={field.path} 
                          readOnly 
                          className="flex-1 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm text-gray-900 font-mono text-xs" 
                          title={field.path}
                        />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <select
                        value={field.type}
                        onChange={(e) => {
                          console.log(`🔄 Type changed for field "${field.path}": ${field.type} → ${e.target.value}`);
                          const updatedFields = [...inferredFields];
                          updatedFields[index] = { ...field, type: e.target.value as InferredField['type'] };
                          console.log('📊 Updated fields after type change:', updatedFields.map(f => ({ path: f.path, type: f.type, required: f.required })));
                          setInferredFields(updatedFields);
                          setHasUserMadeEdits(true);
                        }}
                        disabled={readOnly}
                        className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      >
                        <option value="String">String</option>
                        <option value="Number">Number</option>
                        <option value="Boolean">Boolean</option>
                        <option value="Object">Object</option>
                        <option value="Array">Array</option>
                      </select>
                    </div>
                    <div className="col-span-3 flex items-center justify-between">
                      <div className="flex items-center">
                        <input 
                          type="checkbox" 
                          id={`required-${index}`}
                          checked={field.required}
                          onChange={(e) => {
                            console.log(`☑️ Required changed for field "${field.path}": ${field.required} → ${e.target.checked}`);
                            const updatedFields = [...inferredFields];
                            
                            // Update current field
                            updatedFields[index] = { ...field, required: e.target.checked };
                            
                            // Update all child fields with same required status
                            updatedFields.forEach((f, i) => {
                              if (f.path.startsWith(field.path + '.')) {
                                updatedFields[i] = { ...f, required: e.target.checked };
                              }
                            });
                            
                            console.log('📊 Updated fields after required change (with children):', updatedFields.map(f => ({ path: f.path, type: f.type, required: f.required })));
                            setInferredFields(updatedFields);
                            setHasUserMadeEdits(true);
                          }}
                          disabled={readOnly}
                          className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <label htmlFor={`required-${index}`} className="ml-1.5 text-xs text-gray-600 cursor-pointer">
                          {field.required ? 'Required' : 'Optional'}
                        </label>
                      </div>
                      
                      {/* Remove Button - Only show when editing existing configs and not read-only */}
                      {isEditMode && !readOnly && (
                        <button
                          type="button"
                          onClick={() => {
                            console.log(`🗑️ Deleting field "${field.path}" and all children`);
                            // Remove this field and any child fields
                            const updatedFields = inferredFields.filter(f => 
                              f.path !== field.path && !f.path.startsWith(field.path + '.')
                            );
                            console.log('📊 Updated fields after deletion:', updatedFields.map(f => ({ path: f.path, type: f.type, required: f.required })));
                            setInferredFields(updatedFields);
                            setHasUserMadeEdits(true);
                          }}
                          className="inline-flex items-center px-2 py-1 border border-red-200 text-xs rounded text-red-600 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-1 focus:ring-red-300 transition-colors"
                          title={`Remove ${field.path} and all its children`}
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                </div>
              </div>
            ))}
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