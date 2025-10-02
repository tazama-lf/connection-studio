import React, { useState } from 'react';
import { Button } from './Button';
import { UploadIcon, SparklesIcon } from 'lucide-react';
import { apiClient } from '../services/apiClient';

interface PayloadEditorProps {
  value: string;
  onChange: (value: string) => void;
  isNewEndpoint?: boolean;
  transactionType?: 'transfers' | 'payments';
  onTransactionTypeChange?: (type: 'transfers' | 'payments') => void;
  onEndpointDataChange?: (data: EndpointFormData) => void;
}

interface EndpointFormData {
  path: string;
  method: string;
  version: string;
  transactionType: string;
  description: string;
  contentType: string;
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
  transactionType = 'transfers',
  onTransactionTypeChange,
  onEndpointDataChange
}) => {

  
  // New state for endpoint form data
  const [endpointData, setEndpointData] = useState<EndpointFormData>({
    path: '',
    method: 'POST',
    version: '1.0',
    transactionType: 'Transfers',
    description: '',
    contentType: 'application/json',
  });

  // Derive format from contentType
  const format = endpointData.contentType === 'application/xml' ? 'xml' : 'json';
  const [inferredFields, setInferredFields] = useState<InferredField[]>([]);
  const [showInferredFields, setShowInferredFields] = useState(false);
  const [isGeneratingFields, setIsGeneratingFields] = useState(false);
  const [fieldGenerationError, setFieldGenerationError] = useState<string | null>(null);

  const handleTransactionTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as 'transfers' | 'payments';
    const transactionTypeValue = newType === 'transfers' ? 'Transfers' : 'Payments';
    
    const updatedData = { ...endpointData, transactionType: transactionTypeValue };
    setEndpointData(updatedData);
    
    if (onTransactionTypeChange) {
      onTransactionTypeChange(newType);
    }
    if (onEndpointDataChange) {
      onEndpointDataChange(updatedData);
    }
  };

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

  const handleGenerateFields = async () => {
    if (!value.trim()) {
      setFieldGenerationError('Please enter a payload first.');
      return;
    }

    // Validate JSON format
    try {
      JSON.parse(value);
    } catch (err) {
      setFieldGenerationError('Invalid JSON format. Please fix the payload before generating fields.');
      return;
    }

    setIsGeneratingFields(true);
    setFieldGenerationError(null);

    try {
      const response = await apiClient.post<{
        success: boolean;
        data: {
          schema: Array<{
            name: string;
            path: string;
            type: string;
            children?: any[];
            isRequired: boolean;
          }>;
          fieldsCount: number;
        };
      }>('/endpoints/infer-schema', {
        payload: value,
        contentType: endpointData.contentType,
      });



      if (response.success && response.data.schema) {
        // Convert backend schema format to frontend InferredField format
        const convertedFields: InferredField[] = [];
        
        const flattenFields = (fields: any[], parentPath = '', level = 0) => {
          fields.forEach(field => {
            // Map backend field type to frontend type (capitalize first letter)
            const frontendType = field.type.charAt(0).toUpperCase() + field.type.slice(1) as 'String' | 'Number' | 'Boolean' | 'Object' | 'Array';
            
            convertedFields.push({
              path: field.path,
              type: frontendType,
              parent: parentPath,
              level: level,
            });
            
            // Recursively flatten children if they exist
            if (field.children && field.children.length > 0) {
              flattenFields(field.children, field.path, level + 1);
            }
          });
        };
        
        flattenFields(response.data.schema);
        
        setInferredFields(convertedFields);
        setShowInferredFields(true);
      } else {
        setFieldGenerationError('Failed to generate fields from payload');
      }
    } catch (error) {
      console.error('Error generating fields:', error);
      setFieldGenerationError('Failed to generate fields. Please check your connection and try again.');
    } finally {
      setIsGeneratingFields(false);
    }
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
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:acmt.023.001.02">
  <AcctId>
    <Id>12345</Id>
    <Ccy>USD</Ccy>
    <Nm>John Doe</Nm>
  </AcctId>
</Document>`;

  return (
    <div className="space-y-4">
      {/* Endpoint Configuration Form */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Endpoint Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Endpoint Path */}
          <div>
            <label htmlFor="endpoint-path" className="block text-sm font-medium text-gray-700 mb-1">
              Endpoint Path *
            </label>
            <input
              id="endpoint-path"
              type="text"
              value={endpointData.path}
              onChange={(e) => handleEndpointDataChange('path', e.target.value)}
              placeholder="/api/v1/transfers"
              className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* HTTP Method */}
          <div>
            <label htmlFor="http-method" className="block text-sm font-medium text-gray-700 mb-1">
              HTTP Method *
            </label>
            <select
              id="http-method"
              value={endpointData.method}
              onChange={(e) => handleEndpointDataChange('method', e.target.value)}
              className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>

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
            <select 
              id="transaction-type" 
              value={transactionType} 
              onChange={handleTransactionTypeChange} 
              className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="transfers">Transfers</option>
              <option value="payments">Payments</option>
            </select>
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
        <div>
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
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Sample Payload</h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Format:</label>
            <span className="px-2 py-1 border border-gray-300 rounded text-sm bg-gray-50">
              {format.toUpperCase()}
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
              onClick={() => onChange(format === 'json' ? sampleJsonPayload : sampleXmlPayload)}
            >
              Load {format.toUpperCase()} Sample
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
          placeholder={`Enter your ${format.toUpperCase()} payload here...`} 
        />
      </div>

      {/* Format Validation Status */}
      {value && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-700">
            Valid {format.toUpperCase()} format detected
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
              Define the structure of your {format.toUpperCase()} schema based
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
