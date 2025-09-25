import React, { useState, useEffect } from 'react';
import { XIcon, PlayIcon, DatabaseIcon, CheckCircleIcon, UploadIcon, DownloadIcon, CodeIcon } from 'lucide-react';
import { Button } from './Button';
import { dataEnrichmentApi } from '../../features/data-enrichment/services/enrichmentApi';
import type { ScheduleResponse } from '../../features/data-enrichment/types';
interface DataEnrichmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: any) => void;
}
export const DataEnrichmentFormModal: React.FC<DataEnrichmentFormModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [currentStep, setCurrentStep] = useState<'config' | 'preview' | 'summary'>('config');
  const [configurationType, setConfigurationType] = useState<'pull' | 'push'>('pull');
  
  // Schedule selection state
  const [availableSchedules, setAvailableSchedules] = useState<ScheduleResponse[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  
  // Form submission state
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    configurationType: 'pull',
    // Pull configuration fields
    sourceType: 'sftp',
    host: '',
    port: '',
    username: '',
    password: '',
    authType: 'password',
    privateKey: '',
    headers: '',
    pathPattern: '',
    fileFormat: 'csv',
    delimiter: ',',
    hasHeaderRow: true,
    encoding: 'utf8',
    // Push configuration fields
    endpointPath: '',
    schemaDefinition: '',
    ingestMode: 'append',
    // Common fields
    targetSchema: '',
    targetTable: '',
    targetCollection: ''
  });
  const [previewData, setPreviewData] = useState<any>({
    totalRows: 0,
    validRows: 0,
    invalidRows: 0,
    previewRows: [],
    validationErrors: []
  });
  const [samplePayload, setSamplePayload] = useState<string>(`{
  "records": [
    {
      "id": "001",
      "name": "John Smith",
      "email": "john@example.com",
      "status": "active",
      "createdAt": "2023-11-01T10:30:00Z"
    },
    {
      "id": "002",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "status": "active",
      "createdAt": "2023-11-02T14:15:00Z"
    }
  ],
  "metadata": {
    "source": "CRM",
    "version": "1.0",
    "totalCount": 2
  }
}`);
  const [inferredSchema, setInferredSchema] = useState<string>('');

  // Load available schedules when modal opens
  useEffect(() => {
    const loadSchedules = async () => {
      if (!isOpen) return;
      
      try {
        setSchedulesLoading(true);
        const schedules = await dataEnrichmentApi.getAllSchedules();
        setAvailableSchedules(schedules);
      } catch (error) {
        console.error('Failed to load schedules:', error);
      } finally {
        setSchedulesLoading(false);
      }
    };

    loadSchedules();
  }, [isOpen]);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const {
      name,
      value,
      type
    } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    if (name === 'configurationType') {
      setConfigurationType(value as 'pull' | 'push');
    }
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  const handleTestRun = () => {
    // In a real application, this would make an API call to test the connection and parse a sample file
    // For now, we'll simulate a successful test with mock data
    const mockPreviewData = {
      totalRows: 156,
      validRows: 148,
      invalidRows: 8,
      previewRows: [{
        id: '001',
        name: 'John Smith',
        email: 'john@example.com',
        status: 'active'
      }, {
        id: '002',
        name: 'Jane Doe',
        email: 'jane@example.com',
        status: 'active'
      }, {
        id: '003',
        name: 'Bob Johnson',
        email: 'bob@example.com',
        status: 'inactive'
      }],
      validationErrors: [{
        row: 45,
        field: 'email',
        error: 'Invalid email format'
      }, {
        row: 67,
        field: 'status',
        error: 'Value not in allowed list'
      }, {
        row: 89,
        field: 'id',
        error: 'Duplicate ID'
      }]
    };
    setPreviewData(mockPreviewData);
    setCurrentStep('preview');
  };
  const handleInferSchema = () => {
    try {
      const payload = JSON.parse(samplePayload);
      // Generate a basic schema from the sample payload
      const generateSchema = (obj: any, path: string = ''): any => {
        if (Array.isArray(obj) && obj.length > 0) {
          // If it's an array, infer schema from the first item
          return {
            type: 'array',
            items: generateSchema(obj[0])
          };
        } else if (typeof obj === 'object' && obj !== null) {
          // If it's an object, process each property
          const properties: any = {};
          const required: string[] = [];
          Object.entries(obj).forEach(([key, value]) => {
            properties[key] = generateSchema(value, path ? `${path}.${key}` : key);
            required.push(key);
          });
          return {
            type: 'object',
            properties,
            required
          };
        } else {
          // For primitive types
          const type = typeof obj;
          return {
            type: type === 'number' ? 'number' : type === 'boolean' ? 'boolean' : 'string'
          };
        }
      };
      const schema = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        ...generateSchema(payload)
      };
      setInferredSchema(JSON.stringify(schema, null, 2));
    } catch (error) {
      console.error('Error inferring schema:', error);
      setInferredSchema('Error: Invalid JSON payload');
    }
  };
  const handleSave = async () => {
    try {
      setIsCreating(true);
      setCreateError(null);
      
      // Validate required fields
      if (!formData.name || !formData.description || !selectedScheduleId) {
        setCreateError('Please fill in all required fields including selecting a schedule');
        return;
      }

      // Validate source-specific fields
      if (formData.sourceType === 'http') {
        if (!formData.host) {
          setCreateError('Please provide a URL for HTTP configuration');
          return;
        }
      } else if (formData.sourceType === 'sftp') {
        if (!formData.host || !formData.username || !formData.password) {
          setCreateError('Please fill in all SFTP connection details (host, username, password)');
          return;
        }
      }

      // Build the request payload based on source type
      const basePayload = {
        config_type: (configurationType === 'pull' ? 'Pull' : 'Push') as 'Pull' | 'Push',
        endpoint_name: formData.name,
        schedule_id: selectedScheduleId,
        source_type: formData.sourceType.toUpperCase() as 'HTTP' | 'SFTP',
        description: formData.description,
        table_name: formData.targetTable || formData.name.toLowerCase().replace(/\s+/g, '_')
      };

      let payload: any;

      if (formData.sourceType === 'http') {
        // HTTP configuration
        let headers = { 'content-type': 'application/json' };
        
        if (formData.headers && formData.headers.trim()) {
          try {
            headers = JSON.parse(formData.headers);
            // Validate that parsed result is an object
            if (typeof headers !== 'object' || headers === null || Array.isArray(headers)) {
              setCreateError('Headers must be a valid JSON object, not an array or null.');
              return;
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown JSON error';
            setCreateError(`Invalid JSON format in headers: ${errorMessage}. Please check your JSON syntax.`);
            return;
          }
        }
        payload = {
          ...basePayload,
          source_type: 'HTTP' as const,
          connection: {
            url: formData.host, // Using host field for URL in HTTP case
            headers
          }
        };
      } else {
        // SFTP configuration
        payload = {
          ...basePayload,
          source_type: 'SFTP' as const,
          connection: {
            host: formData.host,
            port: parseInt(formData.port) || 22,
            auth_type: 'USERNAME_PASSWORD' as const,
            user_name: formData.username,
            password: formData.password
          },
          file: {
            path: formData.pathPattern || '/data.csv',
            file_type: formData.fileFormat.toUpperCase() as 'CSV' | 'JSON' | 'TSV',
            delimiter: formData.delimiter || ',',
            header: formData.hasHeaderRow,
            encoding: formData.encoding as 'utf-8' | 'ascii' | 'latin1' | 'utf16le'
          }
        };
      }

      // Create the endpoint using the API
      const response = await dataEnrichmentApi.createJob(payload);
      
      // Call the parent's onSave with the created endpoint
      onSave(response);
      onClose();
    } catch (error) {
      console.error('Failed to create endpoint:', error);
      setCreateError('Failed to create endpoint. Please check your configuration and try again.');
    } finally {
      setIsCreating(false);
    }
  };
  const renderConfigTypeSelector = () => <div className="mb-6" data-id="element-806">
      <label className="block text-sm font-medium text-gray-700 mb-2" data-id="element-807">
        Configuration Type
      </label>
      <div className="flex space-x-4" data-id="element-808">
        <label className="inline-flex items-center" data-id="element-809">
          <input type="radio" name="configurationType" value="pull" checked={configurationType === 'pull'} onChange={handleInputChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300" data-id="element-810" />
          <span className="ml-2 flex items-center" data-id="element-811">
            <DownloadIcon size={16} className="mr-1 text-blue-500" data-id="element-812" />
            Pull (SFTP/HTTP)
          </span>
        </label>
        <label className="inline-flex items-center" data-id="element-813">
          <input type="radio" name="configurationType" value="push" checked={configurationType === 'push'} onChange={handleInputChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300" data-id="element-814" />
          <span className="ml-2 flex items-center" data-id="element-815">
            <UploadIcon size={16} className="mr-1 text-purple-500" data-id="element-816" />
            Push (REST API)
          </span>
        </label>
      </div>
      <p className="mt-1 text-sm text-gray-500" data-id="element-817">
        {configurationType === 'pull' ? 'Pull configuration allows you to fetch data from external sources like SFTP or HTTP endpoints.' : 'Push configuration creates a REST API endpoint where external systems can send data to your system.'}
      </p>
    </div>;
  const renderPullConfigForm = () => <div className="space-y-6" data-id="element-818">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-id="element-819">
        <div data-id="element-820">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-821">
            Endpoint Name
          </label>
          <input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Enter endpoint name" required data-id="element-822" />
        </div>
        <div data-id="element-823">
          <label htmlFor="sourceType" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-824">
            Source Type
          </label>
          <select id="sourceType" name="sourceType" value={formData.sourceType} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required data-id="element-825">
            <option value="sftp" data-id="element-826">SFTP</option>
            <option value="http" data-id="element-827">HTTP</option>
          </select>
        </div>
      </div>
      <div data-id="element-828">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-829">
          Description
        </label>
        <textarea id="description" name="description" value={formData.description} onChange={handleInputChange} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Enter endpoint description" data-id="element-830" />
      </div>
      
      {/* Schedule Selection */}
      <div>
        <label htmlFor="schedule" className="block text-sm font-medium text-gray-700 mb-1">
          Associated Schedule *
        </label>
        {schedulesLoading ? (
          <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
            Loading schedules...
          </div>
        ) : (
          <select
            id="schedule"
            name="schedule"
            value={selectedScheduleId || ''}
            onChange={(e) => setSelectedScheduleId(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Select a schedule</option>
            {availableSchedules.map((schedule) => (
              <option key={schedule.id} value={schedule.id}>
                {schedule.name} - {schedule.cron} ({schedule.iterations} iterations)
              </option>
            ))}
          </select>
        )}
        {availableSchedules.length === 0 && !schedulesLoading && (
          <p className="text-sm text-red-600 mt-1">
            No schedules available. Please create a schedule in CRON Job Management first.
          </p>
        )}
      </div>
      
      <div className="bg-blue-50 p-4 rounded-md" data-id="element-831">
        <h3 className="text-md font-medium text-blue-900 mb-3" data-id="element-832">
          Connection Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-id="element-833">
          <div data-id="element-834">
            <label htmlFor="host" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-835">
              {formData.sourceType === 'sftp' ? 'Host' : 'URL'}
            </label>
            <input type="text" id="host" name="host" value={formData.host} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder={formData.sourceType === 'sftp' ? 'sftp.example.com' : 'https://api.example.com/data'} required data-id="element-836" />
          </div>
          {formData.sourceType === 'sftp' && <div data-id="element-837">
              <label htmlFor="port" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-838">
                Port
              </label>
              <input type="text" id="port" name="port" value={formData.port} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="22" data-id="element-839" />
            </div>}
          {formData.sourceType === 'sftp' && <>
              <div data-id="element-840">
                <label htmlFor="authType" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-841">
                  Authentication Type
                </label>
                <select id="authType" name="authType" value={formData.authType} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" data-id="element-842">
                  <option value="password" data-id="element-843">Username & Password</option>
                  <option value="key" data-id="element-844">Private Key</option>
                </select>
              </div>
              <div data-id="element-845">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-846">
                  Username
                </label>
                <input type="text" id="username" name="username" value={formData.username} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Enter username" required data-id="element-847" />
              </div>
              {formData.authType === 'password' ? <div data-id="element-848">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-849">
                    Password
                  </label>
                  <input type="password" id="password" name="password" value={formData.password} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Enter password" data-id="element-850" />
                </div> : <div className="md:col-span-2" data-id="element-851">
                  <label htmlFor="privateKey" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-852">
                    Private Key
                  </label>
                  <textarea id="privateKey" name="privateKey" value={formData.privateKey} onChange={handleInputChange} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Enter private key" data-id="element-853" />
                </div>}
            </>}
          {formData.sourceType === 'http' && <div className="md:col-span-2" data-id="element-854">
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="headers" className="block text-sm font-medium text-gray-700" data-id="element-855">
                  Headers (JSON format)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, headers: '{\n  "content-type": "application/json"\n}'})}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Basic JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, headers: '{\n  "content-type": "application/json",\n  "Authorization": "Bearer your-token-here"\n}'})}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    With Auth
                  </button>
                </div>
              </div>
              <textarea 
                id="headers" 
                name="headers" 
                value={formData.headers} 
                onChange={handleInputChange} 
                rows={3} 
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm" 
                placeholder='{\n  "content-type": "application/json",\n  "Authorization": "Bearer your-token"\n}' 
                data-id="element-856" 
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter headers as valid JSON. Example: <code>{`{"content-type": "application/json"}`}</code>
              </p>
            </div>}
        </div>
      </div>
      <div className="bg-green-50 p-4 rounded-md" data-id="element-857">
        <h3 className="text-md font-medium text-green-900 mb-3" data-id="element-858">
          File Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-id="element-859">
          <div data-id="element-860">
            <label htmlFor="pathPattern" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-861">
              {formData.sourceType === 'sftp' ? 'Path/Pattern' : 'Endpoint Path'}
            </label>
            <input type="text" id="pathPattern" name="pathPattern" value={formData.pathPattern} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder={formData.sourceType === 'sftp' ? '/inbound/*.csv' : '/api/data'} required data-id="element-862" />
          </div>
          <div data-id="element-863">
            <label htmlFor="fileFormat" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-864">
              File Format
            </label>
            <select id="fileFormat" name="fileFormat" value={formData.fileFormat} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" data-id="element-865">
              <option value="csv" data-id="element-866">CSV</option>
              <option value="tsv" data-id="element-867">TSV</option>
              <option value="json" data-id="element-868">JSON</option>
            </select>
          </div>
          {(formData.fileFormat === 'csv' || formData.fileFormat === 'tsv') && <>
              <div data-id="element-869">
                <label htmlFor="delimiter" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-870">
                  Delimiter
                </label>
                <input type="text" id="delimiter" name="delimiter" value={formData.delimiter} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder={formData.fileFormat === 'csv' ? ',' : '\t'} maxLength={1} data-id="element-871" />
              </div>
              <div className="flex items-center h-full pt-6" data-id="element-872">
                <input type="checkbox" id="hasHeaderRow" name="hasHeaderRow" checked={formData.hasHeaderRow} onChange={handleInputChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" data-id="element-873" />
                <label htmlFor="hasHeaderRow" className="ml-2 block text-sm text-gray-700" data-id="element-874">
                  Has header row
                </label>
              </div>
              <div data-id="element-875">
                <label htmlFor="encoding" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-876">
                  Encoding
                </label>
                <select id="encoding" name="encoding" value={formData.encoding} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" data-id="element-877">
                  <option value="utf8" data-id="element-878">UTF-8</option>
                  <option value="ascii" data-id="element-879">ASCII</option>
                  <option value="latin1" data-id="element-880">Latin-1</option>
                  <option value="utf16le" data-id="element-881">UTF-16</option>
                </select>
              </div>
            </>}
        </div>
      </div>
      <div className="bg-purple-50 p-4 rounded-md" data-id="element-882">
        <h3 className="text-md font-medium text-purple-900 mb-3" data-id="element-883">
          Target PostgreSQL Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-id="element-884">
          <div data-id="element-885">
            <label htmlFor="targetSchema" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-886">
              Schema
            </label>
            <input type="text" id="targetSchema" name="targetSchema" value={formData.targetSchema} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="public" required data-id="element-887" />
          </div>
          <div data-id="element-888">
            <label htmlFor="targetTable" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-889">
              Table
            </label>
            <input type="text" id="targetTable" name="targetTable" value={formData.targetTable} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="customers" required data-id="element-890" />
          </div>
        </div>
      </div>
    </div>;
  const renderPushConfigForm = () => <div className="space-y-6" data-id="element-891">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-id="element-892">
        <div data-id="element-893">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-894">
            Endpoint Name
          </label>
          <input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Enter endpoint name" required data-id="element-895" />
        </div>
        <div data-id="element-896">
          <label htmlFor="endpointPath" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-897">
            API Path Pattern
          </label>
          <div className="flex items-center" data-id="element-898">
            <span className="text-gray-500 mr-1" data-id="element-899">/v1/enrich/</span>
            <input type="text" id="endpointPath" name="endpointPath" value={formData.endpointPath} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="customers/data" required data-id="element-900" />
          </div>
        </div>
      </div>
      <div data-id="element-901">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-902">
          Description
        </label>
        <textarea id="description" name="description" value={formData.description} onChange={handleInputChange} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Enter endpoint description" data-id="element-903" />
      </div>
      <div className="bg-blue-50 p-4 rounded-md" data-id="element-904">
        <h3 className="text-md font-medium text-blue-900 mb-3" data-id="element-905">
          Payload Schema Definition
        </h3>
        <div className="space-y-4" data-id="element-906">
          <div data-id="element-907">
            <label htmlFor="samplePayload" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-908">
              Sample Payload (to infer schema)
            </label>
            <textarea id="samplePayload" value={samplePayload} onChange={e => setSamplePayload(e.target.value)} rows={8} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm" placeholder='{"records": [{"id": "001", "name": "John Doe"}]}' data-id="element-909" />
          </div>
          <div className="flex justify-end" data-id="element-910">
            <Button variant="secondary" size="sm" icon={<CodeIcon size={16} data-id="element-912" />} onClick={handleInferSchema} data-id="element-911">
              Infer JSON Schema
            </Button>
          </div>
          <div data-id="element-913">
            <label htmlFor="schemaDefinition" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-914">
              JSON Schema Definition
            </label>
            <textarea id="schemaDefinition" name="schemaDefinition" value={inferredSchema || formData.schemaDefinition} onChange={handleInputChange} rows={10} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm" placeholder='{"type": "object", "properties": {...}, "required": [...]}' data-id="element-915" />
            <p className="mt-1 text-xs text-gray-500" data-id="element-916">
              This schema will be used to validate incoming payloads. Invalid
              payloads will be rejected.
            </p>
          </div>
        </div>
      </div>
      <div className="bg-green-50 p-4 rounded-md" data-id="element-917">
        <h3 className="text-md font-medium text-green-900 mb-3" data-id="element-918">
          Ingest Settings
        </h3>
        <div className="space-y-4" data-id="element-919">
          <div data-id="element-920">
            <label htmlFor="ingestMode" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-921">
              Ingest Mode
            </label>
            <select id="ingestMode" name="ingestMode" value={formData.ingestMode} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" data-id="element-922">
              <option value="append" data-id="element-923">
                Append - Add new records to existing data
              </option>
              <option value="replace" data-id="element-924">
                Replace - Archive existing data and append new data
              </option>
            </select>
            <p className="mt-1 text-xs text-gray-500" data-id="element-925">
              {formData.ingestMode === 'append' ? 'Append mode adds new records to the existing dataset.' : 'Replace mode archives the current dataset and creates a new version with the uploaded data.'}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-id="element-926">
            <div data-id="element-927">
              <label htmlFor="targetCollection" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-928">
                Target Collection
              </label>
              <input type="text" id="targetCollection" name="targetCollection" value={formData.targetCollection} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="customers" required data-id="element-929" />
            </div>
          </div>
        </div>
      </div>
      <div className="bg-yellow-50 p-4 rounded-md" data-id="element-930">
        <h3 className="text-md font-medium text-yellow-900 mb-3" data-id="element-931">
          Metadata Capture
        </h3>
        <div className="space-y-2" data-id="element-932">
          <p className="text-sm text-gray-700" data-id="element-933">
            The following metadata will be automatically captured for each
            document:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1" data-id="element-934">
            <li data-id="element-935">Source system identifier</li>
            <li data-id="element-936">Ingest timestamp</li>
            <li data-id="element-937">Dataset/version identifier</li>
            <li data-id="element-938">Ingest mode (append/replace)</li>
            <li data-id="element-939">User who created/updated the endpoint</li>
          </ul>
        </div>
      </div>
    </div>;
  const renderConfigStep = () => <div className="space-y-6" data-id="element-940">
      {renderConfigTypeSelector()}
      {configurationType === 'pull' ? renderPullConfigForm() : renderPushConfigForm()}
      <div className="flex justify-end space-x-4" data-id="element-941">
        <Button variant="secondary" onClick={onClose} data-id="element-942">
          Cancel
        </Button>
        <Button variant="primary" icon={<PlayIcon size={16} data-id="element-944" />} onClick={handleTestRun} data-id="element-943">
          Test Run
        </Button>
      </div>
    </div>;
  const renderPreviewStep = () => <div className="space-y-6" data-id="element-945">
      <div className="bg-green-50 p-4 rounded-md" data-id="element-946">
        <h3 className="text-md font-medium text-green-900 mb-3" data-id="element-947">
          Test Run Results
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-4" data-id="element-948">
          <div className="bg-white p-3 rounded-md shadow-sm" data-id="element-949">
            <p className="text-sm text-gray-500" data-id="element-950">Total Rows</p>
            <p className="text-xl font-semibold" data-id="element-951">{previewData.totalRows}</p>
          </div>
          <div className="bg-white p-3 rounded-md shadow-sm" data-id="element-952">
            <p className="text-sm text-gray-500" data-id="element-953">Valid Rows</p>
            <p className="text-xl font-semibold text-green-600" data-id="element-954">
              {previewData.validRows}
            </p>
          </div>
          <div className="bg-white p-3 rounded-md shadow-sm" data-id="element-955">
            <p className="text-sm text-gray-500" data-id="element-956">Invalid Rows</p>
            <p className="text-xl font-semibold text-red-600" data-id="element-957">
              {previewData.invalidRows}
            </p>
          </div>
        </div>
      </div>
      {previewData.validationErrors.length > 0 && <div className="bg-red-50 p-4 rounded-md" data-id="element-958">
          <h3 className="text-md font-medium text-red-900 mb-3" data-id="element-959">
            Validation Errors
          </h3>
          <div className="max-h-40 overflow-y-auto" data-id="element-960">
            <table className="min-w-full divide-y divide-gray-200" data-id="element-961">
              <thead className="bg-gray-50" data-id="element-962">
                <tr data-id="element-963">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-964">
                    Row
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-965">
                    Field
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-966">
                    Error
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200" data-id="element-967">
                {previewData.validationErrors.map((error: any, index: number) => <tr key={index} data-id="element-968">
                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500" data-id="element-969">
                      {error.row}
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500" data-id="element-970">
                      {error.field}
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-sm text-red-500" data-id="element-971">
                      {error.error}
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </div>}
      <div className="bg-white p-4 rounded-md shadow border border-gray-200" data-id="element-972">
        <h3 className="text-md font-medium text-gray-900 mb-3" data-id="element-973">Data Preview</h3>
        <div className="overflow-x-auto" data-id="element-974">
          <table className="min-w-full divide-y divide-gray-200" data-id="element-975">
            <thead className="bg-gray-50" data-id="element-976">
              <tr data-id="element-977">
                {previewData.previewRows.length > 0 && Object.keys(previewData.previewRows[0]).map(header => <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-978">
                      {header}
                    </th>)}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200" data-id="element-979">
              {previewData.previewRows.map((row: Record<string, any>, rowIndex: number) => <tr key={rowIndex} data-id="element-980">
                  {Object.values(row).map((value, colIndex) => <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-id="element-981">
                      {String(value)}
                    </td>)}
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>
      {configurationType === 'push' && <div className="bg-blue-50 p-4 rounded-md" data-id="element-982">
          <h3 className="text-md font-medium text-blue-900 mb-3" data-id="element-983">
            API Response Example
          </h3>
          <pre className="bg-white p-3 rounded border border-gray-200 text-sm font-mono overflow-x-auto" data-id="element-984">
            {`{
  "success": true,
  "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "stats": {
    "accepted": ${previewData.validRows},
    "rejected": ${previewData.invalidRows},
    "total": ${previewData.totalRows}
  },
  "timestamp": "${new Date().toISOString()}"
}`}
          </pre>
        </div>}
      <div className="flex justify-end space-x-4" data-id="element-985">
        <Button variant="secondary" onClick={() => setCurrentStep('config')} data-id="element-986">
          Back to Configuration
        </Button>
        <Button variant="primary" icon={<DatabaseIcon size={16} data-id="element-988" />} onClick={() => setCurrentStep('summary')} data-id="element-987">
          Continue
        </Button>
      </div>
    </div>;
  const renderSummaryStep = () => <div className="space-y-6" data-id="element-989">
      <div className="flex items-center justify-center py-4" data-id="element-990">
        <div className="bg-green-100 rounded-full p-3" data-id="element-991">
          <CheckCircleIcon size={32} className="text-green-600" data-id="element-992" />
        </div>
      </div>
      <div className="text-center" data-id="element-993">
        <h3 className="text-lg font-medium text-gray-900 mb-2" data-id="element-994">
          Ready to Create Endpoint
        </h3>
        <p className="text-gray-500" data-id="element-995">
          Your data enrichment endpoint has been validated and is ready to be
          created.
        </p>
      </div>
      <div className="bg-gray-50 p-4 rounded-md" data-id="element-996">
        <h3 className="text-md font-medium text-gray-900 mb-3" data-id="element-997">
          Endpoint Summary
        </h3>
        <div className="space-y-3" data-id="element-998">
          <div className="grid grid-cols-3 gap-4" data-id="element-999">
            <div className="col-span-1 text-sm font-medium text-gray-500" data-id="element-1000">
              Type:
            </div>
            <div className="col-span-2 text-sm text-gray-900 flex items-center" data-id="element-1001">
              {configurationType === 'pull' ? <>
                  <DownloadIcon size={16} className="mr-1 text-blue-500" data-id="element-1002" />
                  Pull Configuration (SFTP/HTTP)
                </> : <>
                  <UploadIcon size={16} className="mr-1 text-purple-500" data-id="element-1003" />
                  Push Configuration (REST API)
                </>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4" data-id="element-1004">
            <div className="col-span-1 text-sm font-medium text-gray-500" data-id="element-1005">
              Name:
            </div>
            <div className="col-span-2 text-sm text-gray-900" data-id="element-1006">
              {formData.name}
            </div>
          </div>
          {configurationType === 'pull' ? <>
              <div className="grid grid-cols-3 gap-4" data-id="element-1007">
                <div className="col-span-1 text-sm font-medium text-gray-500" data-id="element-1008">
                  Source Type:
                </div>
                <div className="col-span-2 text-sm text-gray-900" data-id="element-1009">
                  {formData.sourceType.toUpperCase()}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4" data-id="element-1010">
                <div className="col-span-1 text-sm font-medium text-gray-500" data-id="element-1011">
                  Connection:
                </div>
                <div className="col-span-2 text-sm text-gray-900" data-id="element-1012">
                  {formData.sourceType === 'sftp' ? `${formData.host}:${formData.port || '22'}` : formData.host}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4" data-id="element-1013">
                <div className="col-span-1 text-sm font-medium text-gray-500" data-id="element-1014">
                  Path/Pattern:
                </div>
                <div className="col-span-2 text-sm text-gray-900" data-id="element-1015">
                  {formData.pathPattern}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4" data-id="element-1016">
                <div className="col-span-1 text-sm font-medium text-gray-500" data-id="element-1017">
                  File Format:
                </div>
                <div className="col-span-2 text-sm text-gray-900" data-id="element-1018">
                  {formData.fileFormat.toUpperCase()}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4" data-id="element-1019">
                <div className="col-span-1 text-sm font-medium text-gray-500" data-id="element-1020">
                  Target:
                </div>
                <div className="col-span-2 text-sm text-gray-900" data-id="element-1021">{`${formData.targetSchema}.${formData.targetTable}`}</div>
              </div>
            </> : <>
              <div className="grid grid-cols-3 gap-4" data-id="element-1022">
                <div className="col-span-1 text-sm font-medium text-gray-500" data-id="element-1023">
                  API Endpoint:
                </div>
                <div className="col-span-2 text-sm text-gray-900" data-id="element-1024">{`/v1/enrich/${formData.endpointPath}`}</div>
              </div>
              <div className="grid grid-cols-3 gap-4" data-id="element-1025">
                <div className="col-span-1 text-sm font-medium text-gray-500" data-id="element-1026">
                  Ingest Mode:
                </div>
                <div className="col-span-2 text-sm text-gray-900 capitalize" data-id="element-1027">
                  {formData.ingestMode}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4" data-id="element-1028">
                <div className="col-span-1 text-sm font-medium text-gray-500" data-id="element-1029">
                  Target Collection:
                </div>
                <div className="col-span-2 text-sm text-gray-900" data-id="element-1030">
                  {formData.targetCollection}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4" data-id="element-1031">
                <div className="col-span-1 text-sm font-medium text-gray-500" data-id="element-1032">
                  Schema:
                </div>
                <div className="col-span-2 text-sm text-gray-900" data-id="element-1033">
                  <span className="text-green-600" data-id="element-1034">Defined and validated</span>
                </div>
              </div>
            </>}
          <div className="grid grid-cols-3 gap-4" data-id="element-1035">
            <div className="col-span-1 text-sm font-medium text-gray-500" data-id="element-1036">
              Validation:
            </div>
            <div className="col-span-2 text-sm text-gray-900" data-id="element-1037">
              {previewData.invalidRows === 0 ? <span className="text-green-600" data-id="element-1038">All rows valid</span> : <span className="text-yellow-600" data-id="element-1039">
                  {previewData.invalidRows} invalid rows
                </span>}
            </div>
          </div>
        </div>
      </div>
      <div className="bg-blue-50 p-4 rounded-md" data-id="element-1040">
        <p className="text-sm text-blue-700" data-id="element-1041">
          <strong data-id="element-1042">Note:</strong> This endpoint will be created with version 1.0
          and all changes will be audit-logged.
        </p>
      </div>
      {createError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded" data-id="error-message">
          {createError}
        </div>
      )}
      <div className="flex justify-end space-x-4" data-id="element-1043">
        <Button variant="secondary" onClick={() => setCurrentStep('preview')} disabled={isCreating} data-id="element-1044">
          Back
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={isCreating} data-id="element-1045">
          {isCreating ? 'Creating Endpoint...' : 'Create Endpoint'}
        </Button>
      </div>
    </div>;
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-id="element-1046">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden relative z-10" data-id="element-1047">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200" data-id="element-1048">
          <h2 className="text-xl font-semibold text-gray-800" data-id="element-1049">
            Define New Data Enrichment Endpoint
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" data-id="element-1050">
            <XIcon size={24} data-id="element-1051" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]" data-id="element-1052">
          {currentStep === 'config' && renderConfigStep()}
          {currentStep === 'preview' && renderPreviewStep()}
          {currentStep === 'summary' && renderSummaryStep()}
        </div>
      </div>
    </div>;
};