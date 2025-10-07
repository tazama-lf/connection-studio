import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { UploadIcon, SparklesIcon } from 'lucide-react';
import { type SchemaField } from '../../features/config/services/configApi';

interface PayloadEditorProps {
  value: string;
  onChange: (value: string) => void;
  endpointData?: EndpointFormData;
  onEndpointDataChange?: (data: EndpointFormData) => void;
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
}

export const PayloadEditor: React.FC<PayloadEditorProps> = ({
  value,
  onChange,
  endpointData: initialEndpointData,
  onEndpointDataChange
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
  const [isGeneratingFields, setIsGeneratingFields] = useState(false);
  const [fieldGenerationError, setFieldGenerationError] = useState<string | null>(null);

  // Sync local state with parent when editing existing endpoint
  useEffect(() => {
    if (initialEndpointData) {
      setEndpointData(initialEndpointData);
      console.log('PayloadEditor - Updated with existing endpoint data:', initialEndpointData);
    }
  }, [initialEndpointData]);

  const handleEndpointDataChange = (field: keyof EndpointFormData, value: string) => {
    const updatedData = { ...endpointData, [field]: value };
    setEndpointData(updatedData);
    if (onEndpointDataChange) {
      onEndpointDataChange(updatedData);
    }
  };

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
        return generateXMLSchema(xmlDoc.documentElement);
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
        const fieldType = Array.isArray(value) ? 'array' : typeof value;
        
        const field: SchemaField = {
          name: key,
          path: fieldPath,
          type: fieldType as 'string' | 'number' | 'boolean' | 'object' | 'array',
          isRequired: true
        };

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          field.children = generateJSONSchema(value, fieldPath);
        } else if (Array.isArray(value) && value.length > 0) {
          const firstElement = value[0];
          if (typeof firstElement === 'object' && firstElement !== null) {
            field.children = generateJSONSchema(firstElement, `${fieldPath}[0]`);
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
    
    const field: SchemaField = {
      name: element.tagName,
      path: fieldPath,
      type: 'object',
      isRequired: true
    };

    const children: SchemaField[] = [];
    const childElements = Array.from(element.children);
    
    if (childElements.length > 0) {
      childElements.forEach(child => {
        children.push(...generateXMLSchema(child, fieldPath));
      });
      field.children = children;
    } else if (element.textContent?.trim()) {
      field.type = 'string';
    }
    
    schema.push(field);
    return schema;
  };

  const handleGenerateFields = async () => {
    if (!value.trim()) {
      setFieldGenerationError('Please enter a payload first.');
      return;
    }

    setIsGeneratingFields(true);
    setFieldGenerationError(null);

    try {
      // Generate schema locally without saving to database
      const schema = generateSchemaFromPayload(value, endpointData.contentType);
      
      if (schema) {
        // Convert schema to InferredField format for display
        const convertSchemaToFields = (schemaFields: SchemaField[], level = 0): InferredField[] => {
          const fields: InferredField[] = [];
          
          schemaFields.forEach((field) => {
            fields.push({
              path: field.path,
              type: capitalizeFirstLetter(field.type) as InferredField['type'],
              level,
              parent: field.path.includes('.') ? field.path.substring(0, field.path.lastIndexOf('.')) : undefined,
            });
            
            if (field.children) {
              fields.push(...convertSchemaToFields(field.children, level + 1));
            }
          });
          
          return fields;
        };

        const fields = convertSchemaToFields(schema);
        setInferredFields(fields);
        setShowInferredFields(true);
        
        console.log('Schema generated locally, fields created:', fields);
        console.log('Generated schema:', schema);
      } else {
        setFieldGenerationError('Failed to generate schema from payload');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setFieldGenerationError(`Schema inference failed: ${errorMessage}`);
      console.error('Schema inference error:', error);
    } finally {
      setIsGeneratingFields(false);
    }
  };

  const capitalizeFirstLetter = (string: string): string => {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
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
  },
  "items": [
    {
      "id": "ITEM-1",
      "name": "Product A",
      "quantity": 2,
      "price": 45.25
    }
  ]
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
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Sample Payload</h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Format:</label>
            <span className="px-2 py-1 border border-gray-300 rounded text-sm bg-gray-50">
              {endpointData.contentType === 'application/json' ? 'JSON' : 'XML'}
            </span>
          </div>
          <div className="border-l border-gray-300 pl-4">
            <input type="file" id="file-upload" className="hidden" accept=".xml,.json" onChange={handleFileUpload} />
            <Button 
              variant="secondary" 
              size="sm" 
              icon={<UploadIcon size={16} />} 
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              Import File
            </Button>
          </div>
        </div>
      </div>

      {/* Sample Payload Buttons */}
      {!value && (
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

      {/* Code Editor */}
      <div className="border rounded-md">
        <textarea 
          value={value} 
          onChange={e => onChange(e.target.value)} 
          className="w-full h-96 p-4 font-mono text-sm bg-gray-50" 
          spellCheck="false" 
          placeholder={`Enter your ${endpointData.contentType === 'application/json' ? 'JSON' : 'XML'} payload here...`} 
        />
      </div>

      {/* Format Validation Status */}
      {value && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-700">
            Valid {endpointData.contentType === 'application/json' ? 'JSON' : 'XML'} format detected
          </p>
        </div>
      )}

      {/* Generate Schema Button */}
      <div className="flex flex-col items-center my-6">
        {fieldGenerationError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 text-center">
            {fieldGenerationError}
          </div>
        )}
        <Button 
          variant="primary" 
          icon={<SparklesIcon size={18} />} 
          onClick={handleGenerateFields}
          disabled={isGeneratingFields || !value.trim()}
        >
          {isGeneratingFields ? 'Generating...' : 'Generate Fields'}
        </Button>
      </div>

      {/* Inferred Fields Section */}
      {showInferredFields && inferredFields.length > 0 && (
        <div className="mt-8 space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Generated Fields
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Define the structure of your {endpointData.contentType === 'application/json' ? 'JSON' : 'XML'} schema based
              on the input data. For each field, specify its data type.
            </p>
          </div>
          
          {/* Dynamic Fields from Schema */}
          <div className="space-y-4">
            {inferredFields.map((field, index) => (
              <div key={index} className={`${field.level > 0 ? 'ml-' + (field.level * 4) + ' border-l-2 border-gray-200 pl-4' : ''}`}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Field Path
                    </label>
                    <input 
                      type="text" 
                      value={field.path} 
                      readOnly 
                      className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select 
                      value={field.type} 
                      className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      onChange={(e) => {
                        const updatedFields = [...inferredFields];
                        updatedFields[index].type = e.target.value as 'String' | 'Number' | 'Boolean' | 'Object' | 'Array';
                        setInferredFields(updatedFields);
                      }}
                    >
                      <option value="String">String</option>
                      <option value="Number">Number</option>
                      <option value="Boolean">Boolean</option>
                      <option value="Object">Object</option>
                      <option value="Array">Array</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};