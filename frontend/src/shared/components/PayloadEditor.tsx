import React, { useState } from 'react';
import { Button } from './Button';
import { UploadIcon, SparklesIcon, PlusIcon, XIcon } from 'lucide-react';
interface PayloadEditorProps {
  value: string;
  onChange: (value: string) => void;
  isNewEndpoint?: boolean;
  transactionType?: 'transfers' | 'payments';
  onTransactionTypeChange?: (type: 'transfers' | 'payments') => void;
}
interface InferredField {
  path: string;
  type: 'String' | 'Number' | 'Boolean' | 'Object' | 'Array';
  parent?: string;
  level: number;
}
interface ConstantField {
  name: string;
  type: 'String' | 'Number' | 'Boolean';
  value: string;
}
interface FormulaField {
  name: string;
  type: 'String' | 'Number' | 'Boolean';
  formula: string;
}
interface AddConstantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (field: ConstantField) => void;
}
interface AddFormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (field: FormulaField) => void;
}
const AddConstantModal: React.FC<AddConstantModalProps> = ({
  isOpen,
  onClose,
  onAdd
}) => {
  const [field, setField] = useState<ConstantField>({
    name: '',
    type: 'String',
    value: ''
  });
  if (!isOpen) return null;
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(field);
    onClose();
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center" data-id="element-346">
      <div className="bg-white rounded-lg w-full max-w-md p-6" data-id="element-347">
        <div className="flex justify-between items-center mb-4" data-id="element-348">
          <h3 className="text-lg font-medium text-gray-900" data-id="element-349">
            Add Constant Field
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" data-id="element-350">
            <XIcon size={20} data-id="element-351" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" data-id="element-352">
          <div className="grid grid-cols-2 gap-4" data-id="element-353">
            <div data-id="element-354">
              <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-355">
                Field Name
              </label>
              <input type="text" value={field.name} onChange={e => setField({
              ...field,
              name: e.target.value
            })} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="constant" required data-id="element-356" />
            </div>
            <div data-id="element-357">
              <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-358">
                Type
              </label>
              <select value={field.type} onChange={e => setField({
              ...field,
              type: e.target.value as any
            })} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" data-id="element-359">
                <option value="String" data-id="element-360">String</option>
                <option value="Number" data-id="element-361">Number</option>
                <option value="Boolean" data-id="element-362">Boolean</option>
              </select>
            </div>
          </div>
          <div data-id="element-363">
            <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-364">
              Value
            </label>
            <input type="text" value={field.value} onChange={e => setField({
            ...field,
            value: e.target.value
          })} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="Constant value" required data-id="element-365" />
          </div>
          <div className="flex justify-end space-x-3 pt-4" data-id="element-366">
            <Button variant="secondary" onClick={onClose} data-id="element-367">
              Cancel
            </Button>
            <Button variant="primary" type="submit" data-id="element-368">
              Add Constant Field
            </Button>
          </div>
        </form>
      </div>
    </div>;
};
const AddFormulaModal: React.FC<AddFormulaModalProps> = ({
  isOpen,
  onClose,
  onAdd
}) => {
  const [field, setField] = useState<FormulaField>({
    name: '',
    type: 'Number',
    formula: ''
  });
  const [selectedField, setSelectedField] = useState<string>('');
  if (!isOpen) return null;
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(field);
    onClose();
  };
  const handleInsertField = () => {
    if (selectedField) {
      setField({
        ...field,
        formula: field.formula + `{${selectedField}}`
      });
    }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center" data-id="element-369">
      <div className="bg-white rounded-lg w-full max-w-md p-6" data-id="element-370">
        <div className="flex justify-between items-center mb-6" data-id="element-371">
          <h3 className="text-lg font-medium text-gray-900" data-id="element-372">
            Add Formula Field
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" data-id="element-373">
            <XIcon size={20} data-id="element-374" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6" data-id="element-375">
          <div className="space-y-1" data-id="element-376">
            <label className="block text-sm font-medium text-gray-700" data-id="element-377">
              Field Name
            </label>
            <input type="text" value={field.name} onChange={e => setField({
            ...field,
            name: e.target.value
          })} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="calculated" required data-id="element-378" />
          </div>
          <div className="space-y-1" data-id="element-379">
            <label className="block text-sm font-medium text-gray-700" data-id="element-380">
              Output Type
            </label>
            <select value={field.type} onChange={e => setField({
            ...field,
            type: e.target.value as any
          })} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" data-id="element-381">
              <option value="Number" data-id="element-382">Number</option>
              <option value="String" data-id="element-383">String</option>
              <option value="Boolean" data-id="element-384">Boolean</option>
            </select>
          </div>
          <div className="space-y-1" data-id="element-385">
            <label className="block text-sm font-medium text-gray-700" data-id="element-386">
              Available Fields
            </label>
            <div className="flex space-x-2" data-id="element-387">
              <select value={selectedField} onChange={e => setSelectedField(e.target.value)} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" data-id="element-388">
                <option value="" data-id="element-389">-- Select a field to insert --</option>
                <option value="transaction.id" data-id="element-390">transaction.id</option>
                <option value="transaction.amount" data-id="element-391">transaction.amount</option>
                <option value="transaction.currency" data-id="element-392">
                  transaction.currency
                </option>
                <option value="transaction.status" data-id="element-393">transaction.status</option>
                <option value="customer.id" data-id="element-394">customer.id</option>
                <option value="customer.name" data-id="element-395">customer.name</option>
                <option value="customer.email" data-id="element-396">customer.email</option>
              </select>
              <button type="button" onClick={handleInsertField} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" data-id="element-397">
                Insert
              </button>
            </div>
          </div>
          <div className="space-y-1" data-id="element-398">
            <label className="block text-sm font-medium text-gray-700" data-id="element-399">
              Formula Expression
            </label>
            <input type="text" value={field.formula} onChange={e => setField({
            ...field,
            formula: e.target.value
          })} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="e.g., {items[0].price} * {quantity}" required data-id="element-400" />
            <p className="text-xs text-gray-500 mt-1" data-id="element-401">
              Use {'{fieldPath}'} to reference other fields
            </p>
          </div>
          <div className="flex justify-end space-x-3 pt-4" data-id="element-402">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" data-id="element-403">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-green-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500" data-id="element-404">
              Add Formula Field
            </button>
          </div>
        </form>
      </div>
    </div>;
};
export const PayloadEditor: React.FC<PayloadEditorProps> = ({
  value,
  onChange,
  isNewEndpoint: _isNewEndpoint = false,
  transactionType = 'transfers',
  onTransactionTypeChange
}) => {
  const [format, setFormat] = useState<'json' | 'xml'>('json');
  const [inferredFields, setInferredFields] = useState<InferredField[]>([]);
  const [showInferredFields, setShowInferredFields] = useState(false);
  const [constantFields, setConstantFields] = useState<ConstantField[]>([]);
  const [formulaFields, setFormulaFields] = useState<FormulaField[]>([]);
  const [showAddConstantModal, setShowAddConstantModal] = useState(false);
  const [showAddFormulaModal, setShowAddFormulaModal] = useState(false);
  const handleTransactionTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as 'transfers' | 'payments';
    if (onTransactionTypeChange) {
      onTransactionTypeChange(newType);
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
  const handleGenerateFields = () => {
    // Create sample fields to match the image
    const sampleFields: InferredField[] = [{
      path: 'transaction',
      type: 'Object',
      level: 0
    }, {
      path: 'transaction.id',
      type: 'String',
      parent: 'transaction',
      level: 1
    }, {
      path: 'transaction.amount',
      type: 'Number',
      parent: 'transaction',
      level: 1
    }, {
      path: 'transaction.currency',
      type: 'String',
      parent: 'transaction',
      level: 1
    }, {
      path: 'transaction.status',
      type: 'String',
      parent: 'transaction',
      level: 1
    }, {
      path: 'customer',
      type: 'Object',
      level: 0
    }, {
      path: 'customer.id',
      type: 'String',
      parent: 'customer',
      level: 1
    }, {
      path: 'customer.name',
      type: 'String',
      parent: 'customer',
      level: 1
    }, {
      path: 'customer.email',
      type: 'String',
      parent: 'customer',
      level: 1
    }];
    setInferredFields(sampleFields);
    setShowInferredFields(true);
  };
  const handleAddConstantField = (field: ConstantField) => {
    setConstantFields([...constantFields, field]);
  };
  const handleAddFormulaField = (field: FormulaField) => {
    setFormulaFields([...formulaFields, field]);
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
  return <div className="space-y-4" data-id="element-405">
      {/* Transaction Type Dropdown */}
      <div className="mb-4" data-id="element-406">
        <label htmlFor="transaction-type" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-407">
          Transaction Type
        </label>
        <select id="transaction-type" value={transactionType} onChange={handleTransactionTypeChange} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" data-id="element-408">
          <option value="transfers" data-id="element-409">Transfers</option>
          <option value="payments" data-id="element-410">Payments</option>
        </select>
      </div>
      <div className="flex justify-between items-center" data-id="element-411">
        <h3 className="text-lg font-medium text-gray-900" data-id="element-412">Sample Payload</h3>
        <div className="flex items-center space-x-4" data-id="element-413">
          <div className="flex rounded-md shadow-sm" data-id="element-414">
            <button type="button" onClick={() => setFormat('xml')} className={`px-4 py-2 text-sm font-medium rounded-l-md ${format === 'xml' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:text-gray-500 border border-gray-300'}`} data-id="element-415">
              XML
            </button>
            <button type="button" onClick={() => setFormat('json')} className={`px-4 py-2 text-sm font-medium rounded-r-md ${format === 'json' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:text-gray-500 border border-gray-300'}`} data-id="element-416">
              JSON
            </button>
          </div>
          <div className="flex items-center space-x-2" data-id="element-417">
            <input type="file" id="file-upload" className="hidden" accept=".xml,.json" onChange={handleFileUpload} data-id="element-418" />
            <Button variant="secondary" size="sm" icon={<UploadIcon size={16} data-id="element-420" />} onClick={() => document.getElementById('file-upload')?.click()} data-id="element-419">
              Import File
            </Button>
          </div>
        </div>
      </div>
      {/* Code Editor */}
      <div className="border rounded-md" data-id="element-421">
        <textarea value={value || (format === 'json' ? sampleJsonPayload : sampleXmlPayload)} onChange={e => onChange(e.target.value)} className="w-full h-96 p-4 font-mono text-sm bg-gray-50" spellCheck="false" placeholder={`Enter your ${format.toUpperCase()} payload here...`} data-id="element-422" />
      </div>
      {/* Format Validation Status */}
      {value && <div className="p-3 bg-green-50 border border-green-200 rounded-md" data-id="element-423">
          <p className="text-sm text-green-700" data-id="element-424">
            Valid {format.toUpperCase()} format detected
          </p>
        </div>}
      {/* Generate Schema Button */}
      <div className="flex justify-center my-6" data-id="element-425">
        <Button variant="primary" icon={<SparklesIcon size={18} data-id="element-427" />} onClick={handleGenerateFields} data-id="element-426">
          Generate Fields
        </Button>
      </div>
      {/* Inferred Fields Section */}
      {showInferredFields && inferredFields.length > 0 && <div className="mt-8 space-y-4" data-id="element-428">
          <div data-id="element-429">
            <h3 className="text-lg font-medium text-gray-900" data-id="element-430">
              Generated Fields
            </h3>
            <p className="text-sm text-gray-600 mt-1" data-id="element-431">
              Define the structure of your {format.toUpperCase()} schema based
              on the input data. For each field, specify its data type.
            </p>
          </div>
          {/* Transaction parent field */}
          <div data-id="element-432">
            <div className="mb-2" data-id="element-433">
              <div className="grid grid-cols-2 gap-4" data-id="element-434">
                <div data-id="element-435">
                  <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-436">
                    Field Path
                  </label>
                  <input type="text" value="transaction" readOnly className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" data-id="element-437" />
                </div>
                <div data-id="element-438">
                  <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-439">
                    Type
                  </label>
                  <select value="Object" className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" data-id="element-440">
                    <option value="String" data-id="element-441">String</option>
                    <option value="Number" data-id="element-442">Number</option>
                    <option value="Boolean" data-id="element-443">Boolean</option>
                    <option value="Object" data-id="element-444">Object</option>
                    <option value="Array" data-id="element-445">Array</option>
                  </select>
                </div>
              </div>
            </div>
            {/* Transaction child fields */}
            <div className="border border-gray-200 rounded-md p-4 mb-6" data-id="element-446">
              {/* transaction.id field */}
              <div className="mb-4" data-id="element-447">
                <div className="grid grid-cols-2 gap-4" data-id="element-448">
                  <div data-id="element-449">
                    <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-450">
                      Field Path
                    </label>
                    <input type="text" value="transaction.id" readOnly className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" data-id="element-451" />
                  </div>
                  <div data-id="element-452">
                    <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-453">
                      Type
                    </label>
                    <select value="String" className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" data-id="element-454">
                      <option value="String" data-id="element-455">String</option>
                      <option value="Number" data-id="element-456">Number</option>
                      <option value="Boolean" data-id="element-457">Boolean</option>
                      <option value="Object" data-id="element-458">Object</option>
                      <option value="Array" data-id="element-459">Array</option>
                    </select>
                  </div>
                </div>
              </div>
              {/* transaction.amount field */}
              <div className="mb-4" data-id="element-460">
                <div className="grid grid-cols-2 gap-4" data-id="element-461">
                  <div data-id="element-462">
                    <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-463">
                      Field Path
                    </label>
                    <input type="text" value="transaction.amount" readOnly className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" data-id="element-464" />
                  </div>
                  <div data-id="element-465">
                    <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-466">
                      Type
                    </label>
                    <select value="Number" className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" data-id="element-467">
                      <option value="String" data-id="element-468">String</option>
                      <option value="Number" data-id="element-469">Number</option>
                      <option value="Boolean" data-id="element-470">Boolean</option>
                      <option value="Object" data-id="element-471">Object</option>
                      <option value="Array" data-id="element-472">Array</option>
                    </select>
                  </div>
                </div>
              </div>
              {/* transaction.currency field */}
              <div className="mb-4" data-id="element-473">
                <div className="grid grid-cols-2 gap-4" data-id="element-474">
                  <div data-id="element-475">
                    <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-476">
                      Field Path
                    </label>
                    <input type="text" value="transaction.currency" readOnly className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" data-id="element-477" />
                  </div>
                  <div data-id="element-478">
                    <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-479">
                      Type
                    </label>
                    <select value="String" className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" data-id="element-480">
                      <option value="String" data-id="element-481">String</option>
                      <option value="Number" data-id="element-482">Number</option>
                      <option value="Boolean" data-id="element-483">Boolean</option>
                      <option value="Object" data-id="element-484">Object</option>
                      <option value="Array" data-id="element-485">Array</option>
                    </select>
                  </div>
                </div>
              </div>
              {/* transaction.status field */}
              <div data-id="element-486">
                <div className="grid grid-cols-2 gap-4" data-id="element-487">
                  <div data-id="element-488">
                    <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-489">
                      Field Path
                    </label>
                    <input type="text" value="transaction.status" readOnly className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" data-id="element-490" />
                  </div>
                  <div data-id="element-491">
                    <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-492">
                      Type
                    </label>
                    <select value="String" className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" data-id="element-493">
                      <option value="String" data-id="element-494">String</option>
                      <option value="Number" data-id="element-495">Number</option>
                      <option value="Boolean" data-id="element-496">Boolean</option>
                      <option value="Object" data-id="element-497">Object</option>
                      <option value="Array" data-id="element-498">Array</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            {/* Customer parent field */}
            <div className="mb-2" data-id="element-499">
              <div className="grid grid-cols-2 gap-4" data-id="element-500">
                <div data-id="element-501">
                  <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-502">
                    Field Path
                  </label>
                  <input type="text" value="customer" readOnly className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" data-id="element-503" />
                </div>
                <div data-id="element-504">
                  <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-505">
                    Type
                  </label>
                  <select value="Object" className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" data-id="element-506">
                    <option value="String" data-id="element-507">String</option>
                    <option value="Number" data-id="element-508">Number</option>
                    <option value="Boolean" data-id="element-509">Boolean</option>
                    <option value="Object" data-id="element-510">Object</option>
                    <option value="Array" data-id="element-511">Array</option>
                  </select>
                </div>
              </div>
            </div>
            {/* Customer child fields */}
            <div className="border border-gray-200 rounded-md p-4" data-id="element-512">
              {/* customer.id field */}
              <div className="mb-4" data-id="element-513">
                <div className="grid grid-cols-2 gap-4" data-id="element-514">
                  <div data-id="element-515">
                    <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-516">
                      Field Path
                    </label>
                    <input type="text" value="customer.id" readOnly className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" data-id="element-517" />
                  </div>
                  <div data-id="element-518">
                    <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-519">
                      Type
                    </label>
                    <select value="String" className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" data-id="element-520">
                      <option value="String" data-id="element-521">String</option>
                      <option value="Number" data-id="element-522">Number</option>
                      <option value="Boolean" data-id="element-523">Boolean</option>
                      <option value="Object" data-id="element-524">Object</option>
                      <option value="Array" data-id="element-525">Array</option>
                    </select>
                  </div>
                </div>
              </div>
              {/* customer.name field */}
              <div className="mb-4" data-id="element-526">
                <div className="grid grid-cols-2 gap-4" data-id="element-527">
                  <div data-id="element-528">
                    <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-529">
                      Field Path
                    </label>
                    <input type="text" value="customer.name" readOnly className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" data-id="element-530" />
                  </div>
                  <div data-id="element-531">
                    <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-532">
                      Type
                    </label>
                    <select value="String" className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" data-id="element-533">
                      <option value="String" data-id="element-534">String</option>
                      <option value="Number" data-id="element-535">Number</option>
                      <option value="Boolean" data-id="element-536">Boolean</option>
                      <option value="Object" data-id="element-537">Object</option>
                      <option value="Array" data-id="element-538">Array</option>
                    </select>
                  </div>
                </div>
              </div>
              {/* customer.email field */}
              <div data-id="element-539">
                <div className="grid grid-cols-2 gap-4" data-id="element-540">
                  <div data-id="element-541">
                    <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-542">
                      Field Path
                    </label>
                    <input type="text" value="customer.email" readOnly className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" data-id="element-543" />
                  </div>
                  <div data-id="element-544">
                    <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-545">
                      Type
                    </label>
                    <select value="String" className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" data-id="element-546">
                      <option value="String" data-id="element-547">String</option>
                      <option value="Number" data-id="element-548">Number</option>
                      <option value="Boolean" data-id="element-549">Boolean</option>
                      <option value="Object" data-id="element-550">Object</option>
                      <option value="Array" data-id="element-551">Array</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>}
      {/* Constant Fields Section */}
      {showInferredFields && <div className="mt-8" data-id="element-552">
          <div className="flex justify-between items-center mb-4" data-id="element-553">
            <h3 className="text-lg font-medium text-gray-900" data-id="element-554">
              Constant Fields
            </h3>
            <Button variant="secondary" size="sm" icon={<PlusIcon size={16} data-id="element-556" />} onClick={() => setShowAddConstantModal(true)} data-id="element-555">
              Add Constant Field
            </Button>
          </div>
          {constantFields.length > 0 ? <div className="space-y-4" data-id="element-557">
              {constantFields.map((field, index) => <div key={index} className="border border-gray-200 rounded-md p-4" data-id="element-558">
                  <div className="grid grid-cols-3 gap-4" data-id="element-559">
                    <div data-id="element-560">
                      <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-561">
                        Field Name
                      </label>
                      <input type="text" value={field.name} readOnly className="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm sm:text-sm" data-id="element-562" />
                    </div>
                    <div data-id="element-563">
                      <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-564">
                        Type
                      </label>
                      <input type="text" value={field.type} readOnly className="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm sm:text-sm" data-id="element-565" />
                    </div>
                    <div data-id="element-566">
                      <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-567">
                        Value
                      </label>
                      <input type="text" value={field.value} readOnly className="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm sm:text-sm" data-id="element-568" />
                    </div>
                  </div>
                </div>)}
            </div> : <div className="text-center py-4 border border-gray-200 rounded-md" data-id="element-569">
              <p className="text-sm text-gray-500" data-id="element-570">
                No constant fields added yet
              </p>
            </div>}
        </div>}
      {/* Formula Fields Section */}
      {showInferredFields && <div className="mt-8" data-id="element-571">
          <div className="flex justify-between items-center mb-4" data-id="element-572">
            <h3 className="text-lg font-medium text-gray-900" data-id="element-573">
              Formula Fields
            </h3>
            <Button variant="secondary" size="sm" icon={<PlusIcon size={16} data-id="element-575" />} onClick={() => setShowAddFormulaModal(true)} data-id="element-574">
              Add Formula Field
            </Button>
          </div>
          {formulaFields.length > 0 ? <div className="space-y-4" data-id="element-576">
              {formulaFields.map((field, index) => <div key={index} className="border border-gray-200 rounded-md p-4" data-id="element-577">
                  <div className="grid grid-cols-3 gap-4" data-id="element-578">
                    <div data-id="element-579">
                      <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-580">
                        Field Name
                      </label>
                      <input type="text" value={field.name} readOnly className="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm sm:text-sm" data-id="element-581" />
                    </div>
                    <div data-id="element-582">
                      <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-583">
                        Type
                      </label>
                      <input type="text" value={field.type} readOnly className="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm sm:text-sm" data-id="element-584" />
                    </div>
                    <div data-id="element-585">
                      <label className="block text-sm font-medium text-gray-700 mb-1" data-id="element-586">
                        Formula
                      </label>
                      <input type="text" value={field.formula} readOnly className="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm sm:text-sm" data-id="element-587" />
                    </div>
                  </div>
                </div>)}
            </div> : <div className="text-center py-4 border border-gray-200 rounded-md" data-id="element-588">
              <p className="text-sm text-gray-500" data-id="element-589">
                No formula fields added yet
              </p>
            </div>}
        </div>}
      {/* Add Constant Field Modal */}
      <AddConstantModal isOpen={showAddConstantModal} onClose={() => setShowAddConstantModal(false)} onAdd={handleAddConstantField} data-id="element-590" />
      {/* Add Formula Field Modal */}
      <AddFormulaModal isOpen={showAddFormulaModal} onClose={() => setShowAddFormulaModal(false)} onAdd={handleAddFormulaField} data-id="element-591" />
    </div>;
};