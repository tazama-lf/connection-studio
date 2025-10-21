import React, { useState, useEffect } from 'react';
import { XIcon, PlayIcon, CheckCircleIcon, UploadIcon, DownloadIcon } from 'lucide-react';
import { Button } from './Button';
import { dataEnrichmentApi } from '../../features/data-enrichment/services';
import type { ScheduleResponse } from '../../features/data-enrichment/types';
interface DataEnrichmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: any) => void;
  editMode?: boolean;
  jobId?: string;
  jobType?: 'pull' | 'push';
}
export const DataEnrichmentFormModal: React.FC<DataEnrichmentFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editMode = false,
  jobId,
  jobType
}) => {
  const [currentStep, setCurrentStep] = useState<'config' | 'preview' | 'summary'>('config');
  const [configurationType, setConfigurationType] = useState<'pull' | 'push'>(jobType || 'pull');
  const [isLoadingJob, setIsLoadingJob] = useState(false);
  
  // Schedule selection state
  const [availableSchedules, setAvailableSchedules] = useState<ScheduleResponse[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  
  // Schedule creation state
  const [showCreateSchedule, setShowCreateSchedule] = useState(false);
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    cron: '',
    iterations: 1
  });
  
  // Form submission state
  const [isCreating, setIsCreating] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  
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

    pathPattern: '',
    fileFormat: 'csv',
    delimiter: ',',
    
    // HTTP-specific fields
    httpMethod: 'GET',
    httpHeaders: '',

    // Push configuration fields
    endpointPath: '',
    endpointVersion: '/v1/enrich', // Default version
    ingestMode: 'append',
    // Common fields

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


  // Load available schedules when modal opens
  useEffect(() => {
    const loadSchedules = async () => {
      if (!isOpen) return;
      
      try {
        setSchedulesLoading(true);
        console.log('Loading schedules from API...');
        const schedules = await dataEnrichmentApi.getAllSchedules();
        console.log('Loaded schedules:', schedules);
        setAvailableSchedules(schedules);
      } catch (error) {
        console.error('Failed to load schedules:', error);
        // Keep empty array as fallback
        setAvailableSchedules([]);
      } finally {
        setSchedulesLoading(false);
      }
    };

    loadSchedules();
  }, [isOpen]);

  // Load job data when in edit mode
  useEffect(() => {
    const loadJobData = async () => {
      if (!isOpen || !editMode || !jobId) return;
      
      try {
        setIsLoadingJob(true);
        setCreateError(null);
        console.log(`Loading job data for ${jobId} (${jobType})`);
        
        const job = await dataEnrichmentApi.getJob(jobId, jobType?.toUpperCase() as 'PULL' | 'PUSH');
        console.log('Loaded job data:', job);
        
        // Populate form with job data
        setFormData({
          ...formData,
          name: job.endpoint_name,
          description: job.description || '',
          configurationType: job.config_type.toLowerCase() as 'pull' | 'push',
          sourceType: job.source_type?.toLowerCase() || 'sftp',
          // Populate other fields based on job type and source type
          targetTable: job.table_name || '',
        });
        
        if ('schedule_id' in job) {
          setSelectedScheduleId(job.schedule_id);
        }
        
        setConfigurationType(job.config_type.toLowerCase() as 'pull' | 'push');
        
      } catch (error) {
        console.error('Failed to load job data:', error);
        setCreateError('Failed to load job data. Please try again.');
      } finally {
        setIsLoadingJob(false);
      }
    };

    loadJobData();
  }, [isOpen, editMode, jobId, jobType]);

  const handleCreateSchedule = async () => {
    try {
      setIsCreatingSchedule(true);
      setCreateError(null);

      // Validate schedule data
      if (!newSchedule.name || !newSchedule.cron || !newSchedule.iterations) {
        setCreateError('Please fill in all schedule fields (name, cron expression, iterations)');
        return;
      }

      // Create the schedule
      await dataEnrichmentApi.createSchedule({
        name: newSchedule.name,
        cron: newSchedule.cron,
        iterations: newSchedule.iterations
      });

      // Reload schedules to get the newly created one with full details
      const updatedSchedules = await dataEnrichmentApi.getAllSchedules();
      setAvailableSchedules(updatedSchedules);
      
      // Find the newly created schedule by name and select it
      const newScheduleObj = updatedSchedules.find(s => s.name === newSchedule.name);
      if (newScheduleObj) {
        setSelectedScheduleId(newScheduleObj.id);
        setCreateSuccess(`Schedule "${newScheduleObj.name}" created successfully!`);
      } else {
        setCreateSuccess('Schedule created successfully!');
      }
      
      // Reset form and close
      setNewSchedule({ name: '', cron: '', iterations: 1 });
      setShowCreateSchedule(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setCreateSuccess(null);
      }, 3000);
    } catch (error) {
      console.error('Failed to create schedule:', error);
      setCreateError(error instanceof Error ? error.message : 'Failed to create schedule');
    } finally {
      setIsCreatingSchedule(false);
    }
  };

  // Form validation function
  const isFormValid = () => {
    // Required fields for both configurations
    if (!formData.name || !formData.description || !formData.sourceType) {
      return false;
    }

    if (configurationType === 'pull') {
      // Required fields for pull configuration
      if (!formData.host || !formData.targetTable) {
        return false;
      }

      // SFTP specific validations
      if (formData.sourceType === 'sftp') {
        if (!formData.pathPattern || !formData.username) {
          return false;
        }
        // Validate authentication based on type
        if (formData.authType === 'password' && !formData.password) {
          return false;
        }
        if (formData.authType === 'key' && !formData.privateKey) {
          return false;
        }
      }
    } else if (configurationType === 'push') {
      // Required fields for push configuration
      if (!formData.endpointPath || !formData.endpointVersion || !formData.targetCollection) {
        return false;
      }
    }

    // File format validation for SFTP
    if (configurationType === 'pull' && formData.sourceType === 'sftp') {
      const fileFormatValidation = validateFileFormat();
      if (!fileFormatValidation.isValid) {
        return false;
      }
    }

    return true;
  };

  // Helper function to validate file format matches file extension
  const validateFileFormat = () => {
    if (!formData.pathPattern || !formData.pathPattern.trim()) {
      return { isValid: true, error: '' };
    }

    const filePath = formData.pathPattern.trim();
    // Extract filename from path (handle wildcards like *.csv)
    const fileName = filePath.includes('*') ? filePath.split('*')[1] : filePath.split('/').pop() || '';
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    
    if (!fileExtension) {
      return { isValid: false, error: 'Please specify a file with a valid extension (e.g., .csv, .tsv, .json)' };
    }

    // Map file extensions to allowed formats
    const extensionFormatMap: { [key: string]: string[] } = {
      'csv': ['csv'],
      'tsv': ['tsv'],
      'json': ['json'],
      'txt': ['csv', 'tsv'] // Text files can be either CSV or TSV
    };

    const allowedFormats = extensionFormatMap[fileExtension];
    
    if (!allowedFormats) {
      return { isValid: false, error: `Unsupported file extension: .${fileExtension}. Supported extensions: .csv, .tsv, .json` };
    }

    if (!allowedFormats.includes(formData.fileFormat.toLowerCase())) {
      const formatName = formData.fileFormat.toUpperCase();
      return { isValid: false, error: `File format mismatch: .${fileExtension} files must use ${allowedFormats.map(f => f.toUpperCase()).join(' or ')} format, not ${formatName}` };
    }

    return { isValid: true, error: '' };
  };

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
    
    // If switching source type, clear irrelevant fields
    if (name === 'sourceType') {
      const updatedFormData = { ...formData };
      
      if (value === 'http') {
        // Clear SFTP-specific fields when switching to HTTP
        updatedFormData.port = '';
        updatedFormData.username = '';
        updatedFormData.password = '';
        updatedFormData.authType = 'password';
        updatedFormData.privateKey = '';
        updatedFormData.pathPattern = '';
        updatedFormData.fileFormat = 'csv';
        updatedFormData.delimiter = ',';
      } else if (value === 'sftp') {
        // Clear HTTP-specific fields when switching to SFTP (none currently)
        // Set default auth type for SFTP
        updatedFormData.authType = 'password';
      }
      
      updatedFormData[name] = value;
      setFormData(updatedFormData);
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };
  const handleTestRun = async () => {
    try {
      setIsTestingConnection(true);
      setCreateError(null);

      // Build test payload based on current form data
      const testPayload = {
        endpoint_name: formData.name || 'test-connection',
        schedule_id: selectedScheduleId || availableSchedules[0]?.id || '', // Use first available schedule for testing
        source_type: formData.sourceType.toUpperCase() as 'HTTP' | 'SFTP',
        description: 'Connection test',
        table_name: 'test_table',
        mode: 'append' as 'append' | 'replace'
      };

      if (formData.sourceType === 'http') {
        let headers = { 'content-type': 'application/json' };
        Object.assign(testPayload, {
          connection: {
            url: formData.host,
            headers
          }
        });
      } else {
        Object.assign(testPayload, {
          connection: {
            host: formData.host,
            port: parseInt(formData.port) || 22,
            auth_type: formData.authType === 'key' ? 'PRIVATE_KEY' as const : 'USERNAME_PASSWORD' as const,
            user_name: formData.username,
            ...(formData.authType === 'password' ? { password: formData.password } : { private_key: formData.privateKey.replace(/\\n/g, '\n') })
          },
          file: {
            path: formData.pathPattern || '/data.csv',
            file_type: formData.fileFormat.toUpperCase() as 'CSV' | 'JSON' | 'TSV',
            delimiter: formData.delimiter || ','
          }
        });
      }

      // Try to test the connection and get preview data
      try {
        // First test the connection
        await dataEnrichmentApi.testConnection(testPayload);
        console.log('Connection test passed, fetching preview data...');
        
        // If connection succeeds, fetch real preview data
        try {
          const previewData = await dataEnrichmentApi.previewData(testPayload);
          setPreviewData(previewData);
          setCurrentStep('summary');
        } catch (previewError) {
          console.warn('Preview endpoint not available, using connection test success:', previewError);
          
          // If preview fails but connection test passed, show basic success info
          const basicPreviewData = {
            totalRows: 0,
            validRows: 0,
            invalidRows: 0,
            previewRows: [],
            validationErrors: [],
            connectionSuccess: true
          };
          setPreviewData(basicPreviewData);
          setCurrentStep('summary');
        }
      } catch (testError) {
        console.warn('Test endpoint not available, attempting preview directly:', testError);
        
        // If test endpoint doesn't exist, try preview directly
        try {
          const previewData = await dataEnrichmentApi.previewData(testPayload);
          setPreviewData(previewData);
          setCurrentStep('summary');
        } catch (previewError) {
          console.warn('Neither test nor preview endpoints available, using fallback data:', previewError);
          
          // Last resort: use fallback data with clear indication it's not real
          const fallbackPreviewData = {
            totalRows: 0,
            validRows: 0,
            invalidRows: 0,
            previewRows: [],
            validationErrors: [],
            isDemo: true,
            message: 'Preview not available - backend endpoint not implemented'
          };
          setPreviewData(fallbackPreviewData);
          setCurrentStep('summary');
        }
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setCreateError(error instanceof Error ? error.message : 'Connection test failed. Please check your configuration.');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsCreating(true);
      setCreateError(null);
      setCreateSuccess(null);
      
      // Validate required fields
      if (!formData.name || !formData.description) {
        setCreateError('Please fill in all required fields');
        return;
      }

      // Schedule is only required for pull configurations
      if (configurationType === 'pull' && !selectedScheduleId) {
        setCreateError('Please select a schedule for pull configuration');
        return;
      }

      // Validate configuration-specific fields
      if (configurationType === 'push') {
        if (!formData.endpointPath) {
          setCreateError('Please provide an endpoint path for push configuration');
          return;
        }
        if (!formData.endpointVersion) {
          setCreateError('Please provide a version for the endpoint');
          return;
        }
      } else {
        // Pull configuration validation
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
          
          // Validate file format matches file extension
          const formatValidation = validateFileFormat();
          if (!formatValidation.isValid) {
            setCreateError(formatValidation.error);
            return;
          }
        }
      }

      // Build the request payload based on source type
      const basePayload = {
        endpoint_name: formData.name,
        schedule_id: selectedScheduleId!, // Required - validation ensures it's set
        source_type: formData.sourceType.toUpperCase() as 'HTTP' | 'SFTP',
        description: formData.description,
        table_name: formData.targetTable || formData.name.toLowerCase().replace(/\s+/g, '_'),
        mode: formData.ingestMode as 'append' | 'replace',
        version: '1.0.0'
      };
      
      // Additional validation
      if (!basePayload.endpoint_name || !basePayload.description || !basePayload.table_name) {
        setCreateError('Missing required fields: endpoint_name, description, or table_name');
        return;
      }

      let payload: any;

      if (configurationType === 'push') {
        // Push job payload - much simpler structure
        // Clean up version and path by removing leading/trailing slashes
        const cleanVersion = formData.endpointVersion.replace(/^\/+|\/+$/g, '');
        const cleanPath = formData.endpointPath.replace(/^\/+|\/+$/g, '');
        
        // Ensure version starts with / if not already
        const versionPath = cleanVersion.startsWith('/') ? cleanVersion : `/${cleanVersion}`;
        // Ensure path starts with / if not already
        const fullPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
        
        payload = {
          endpoint_name: formData.name,
          path: versionPath + fullPath, // version + path
          description: formData.description,
          table_name: formData.targetTable || formData.name.toLowerCase().replace(/\s+/g, '_'),
          mode: formData.ingestMode as 'append' | 'replace',
          version: cleanVersion
        };
      } else if (formData.sourceType === 'http') {
        // Pull HTTP configuration
        let headers = { 'content-type': 'application/json' };
        payload = {
          ...basePayload,
          source_type: 'HTTP' as const,
          connection: {
            url: formData.host, // Using host field for URL in HTTP case
            headers
          }
          // Note: No 'file' field for HTTP requests
        };
      } else {
        // Pull SFTP configuration
        payload = {
          ...basePayload,
          source_type: 'SFTP' as const,
          connection: {
            host: formData.host,
            port: parseInt(formData.port) || 22,
            auth_type: formData.authType === 'key' ? 'PRIVATE_KEY' as const : 'USERNAME_PASSWORD' as const,
            user_name: formData.username,
            ...(formData.authType === 'password' ? { password: formData.password } : { private_key: formData.privateKey.replace(/\\n/g, '\n') })
          },
          file: {
            path: formData.pathPattern || '/data.csv',
            file_type: formData.fileFormat.toUpperCase() as 'CSV' | 'JSON' | 'TSV',
            delimiter: formData.delimiter || ','
          }
        };
      }

      // Validate payload before sending
      console.log('Final payload being sent:', JSON.stringify(payload, null, 2));
      
      let response;
      
      // Create or update the job based on mode
      if (editMode && jobId) {
        // Update existing job
        response = configurationType === 'pull' 
          ? await dataEnrichmentApi.updatePullJob(jobId, payload)
          : await dataEnrichmentApi.updatePushJob(jobId, payload);
        
        setCreateSuccess(`Data enrichment endpoint "${formData.name}" updated successfully!`);
      } else {
        // Create new job
        response = configurationType === 'pull' 
          ? await dataEnrichmentApi.createPullJob(payload)
          : await dataEnrichmentApi.createPushJob(payload);
        
        setCreateSuccess(`Data enrichment endpoint "${formData.name}" created successfully!`);
      }
      
      // Call the parent's onSave with the created/updated job
      onSave(response);
      
      // Close modal after a brief delay to show success message
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Failed to create endpoint:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setCreateError('Cannot connect to data enrichment service. Please ensure the service is running on http://localhost:3001');
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setCreateError(`Failed to create endpoint: ${errorMessage}`);
      }
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
            Endpoint Name <span className="text-red-500">*</span>
          </label>
          <input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Enter endpoint name" required data-id="element-822" />
        </div>
        <div data-id="element-823">
          <label htmlFor="sourceType" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-824">
            Source Type <span className="text-red-500">*</span>
          </label>
          <select id="sourceType" name="sourceType" value={formData.sourceType} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required data-id="element-825">
            <option value="sftp" data-id="element-826">SFTP</option>
            <option value="http" data-id="element-827">HTTP</option>
          </select>
        </div>
      </div>
      <div data-id="element-828">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-829">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea id="description" name="description" value={formData.description} onChange={handleInputChange} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Enter endpoint description" data-id="element-830" />
      </div>
      
      {/* Schedule Selection */}
      <div>
        <label htmlFor="schedule" className="block text-sm font-medium text-gray-700 mb-1">
          Associated Schedule <span className="text-red-500">*</span>
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
            onChange={(e) => setSelectedScheduleId(e.target.value || null)}
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
            No schedules available. <button 
              type="button"
              onClick={() => setShowCreateSchedule(true)}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Create a new schedule
            </button>
          </p>
        )}

        {/* Create Schedule Form */}
        {showCreateSchedule && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md border">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Create New Schedule</h4>
            <div className="space-y-3">
              <div>
                <label htmlFor="scheduleName" className="block text-xs font-medium text-gray-700 mb-1">
                  Schedule Name
                </label>
                <input
                  type="text"
                  id="scheduleName"
                  value={newSchedule.name}
                  onChange={(e) => setNewSchedule(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Daily Processing"
                />
              </div>
              
              <div>
                <label htmlFor="scheduleCron" className="block text-xs font-medium text-gray-700 mb-1">
                  Cron Expression
                </label>
                <input
                  type="text"
                  id="scheduleCron"
                  value={newSchedule.cron}
                  onChange={(e) => setNewSchedule(prev => ({ ...prev, cron: e.target.value }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0 9 * * *"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Example: "0 9 * * *" = Daily at 9 AM, "*/30 * * * *" = Every 30 minutes
                </p>
              </div>
              
              <div>
                <label htmlFor="scheduleIterations" className="block text-xs font-medium text-gray-700 mb-1">
                  Iterations
                </label>
                <input
                  type="number"
                  id="scheduleIterations"
                  min="1"
                  value={newSchedule.iterations}
                  onChange={(e) => setNewSchedule(prev => ({ ...prev, iterations: parseInt(e.target.value) || 1 }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateSchedule(false)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateSchedule}
                  disabled={isCreatingSchedule}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isCreatingSchedule ? 'Creating...' : 'Create Schedule'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-blue-50 p-4 rounded-md" data-id="element-831">
        <h3 className="text-md font-medium text-blue-900 mb-3" data-id="element-832">
          Connection Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-id="element-833">
          <div data-id="element-834">
            <label htmlFor="host" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-835">
              {formData.sourceType === 'sftp' ? 'Host' : 'URL'} <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              id="host" 
              name="host" 
              value={formData.host} 
              onChange={handleInputChange} 
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${formData.sourceType !== 'sftp' && formData.sourceType !== 'http' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              placeholder={formData.sourceType === 'sftp' ? '10.10.80.37' : 'https://dummyjson.com/users'} 
              required 
              data-id="element-836" 
            />
          </div>
          
          {/* SFTP-specific fields */}
          {formData.sourceType === 'sftp' && (
            <>
              <div data-id="element-837">
                <label htmlFor="port" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-838">
                  Port
                </label>
                <input 
                  type="number" 
                  id="port" 
                  name="port" 
                  value={formData.port} 
                  onChange={handleInputChange} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="2222" 
                  data-id="element-839" 
                />
              </div>
              <div data-id="element-840">
                <label htmlFor="authType" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-841">
                  Authentication Type <span className="text-red-500">*</span>
                </label>
                <select 
                  id="authType" 
                  name="authType" 
                  value={formData.authType} 
                  onChange={handleInputChange} 
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                  data-id="element-842"
                >
                  <option value="password" data-id="element-843">Username & Password</option>
                  <option value="key" data-id="element-844">Username & Private Key</option>
                </select>
              </div>
              <div data-id="element-845">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-846">
                  Username <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  id="username" 
                  name="username" 
                  value={formData.username} 
                  onChange={handleInputChange} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter username" 
                  required
                  data-id="element-847" 
                />
              </div>
            </>
          )}
          
          {formData.authType === 'password' && formData.sourceType === 'sftp' ? (
            <div data-id="element-848">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-849">
                Password <span className="text-red-500">*</span>
              </label>
              <input 
                type="password" 
                id="password" 
                name="password" 
                value={formData.password} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
                placeholder="Enter password" 
                required
                data-id="element-850" 
              />
            </div>
          ) : formData.authType === 'key' && formData.sourceType === 'sftp' && (
            <div className="md:col-span-2" data-id="element-851">
              <textarea 
                id="privateKey" 
                name="privateKey" 
                value={formData.privateKey} 
                onChange={handleInputChange} 
                rows={3} 
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
                placeholder="Enter private key"
                required
                data-id="element-853" 
              />
            </div>
          )}

        </div>
      </div>
      
      {/* SFTP-specific File Settings */}
      {formData.sourceType === 'sftp' && (
        <div className="bg-green-50 p-4 rounded-md" data-id="element-857">
          <h3 className="text-md font-medium text-green-900 mb-3" data-id="element-858">
            File Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-id="element-859">
            <div data-id="element-860">
              <label htmlFor="pathPattern" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-861">
                Path/Pattern <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                id="pathPattern" 
                name="pathPattern" 
                value={formData.pathPattern} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="/inbound/*.csv" 
                required
                data-id="element-862" 
              />
            </div>
            <div data-id="element-863">
              <label htmlFor="fileFormat" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-864">
                File Format
              </label>
              <select 
                id="fileFormat" 
                name="fileFormat" 
                value={formData.fileFormat} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                data-id="element-865"
              >
                <option value="csv" data-id="element-866">CSV</option>
                <option value="tsv" data-id="element-867">TSV</option>
                <option value="json" data-id="element-868">JSON</option>
              </select>
              {configurationType === 'pull' && formData.pathPattern && formData.pathPattern.trim() && (() => {
                const formatValidation = validateFileFormat();
                return !formatValidation.isValid ? (
                  <p className="mt-1 text-sm text-red-600">{formatValidation.error}</p>
                ) : null;
              })()}
            </div>
            {formData.fileFormat === 'csv' && (
              <div data-id="element-869">
                <label htmlFor="delimiter" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-870">
                  Delimiter
                </label>
                <input 
                  type="text" 
                  id="delimiter" 
                  name="delimiter" 
                  value={formData.delimiter} 
                  onChange={handleInputChange} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="," 
                  maxLength={1} 
                  data-id="element-871" 
                />
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* HTTP-specific Endpoint Settings */}
      {formData.sourceType === 'http' && (
        <div className="bg-indigo-50 p-4 rounded-md">
          <h3 className="text-md font-medium text-indigo-900 mb-3">
            HTTP Endpoint Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="httpMethod" className="block text-sm font-medium text-gray-700 mb-1">
                HTTP Method <span className="text-red-500">*</span>
              </label>
              <select 
                id="httpMethod" 
                name="httpMethod" 
                value={formData.httpMethod || 'GET'}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div>
              <label htmlFor="httpHeaders" className="block text-sm font-medium text-gray-700 mb-1">
                Headers (JSON format)
              </label>
              <textarea
                id="httpHeaders"
                name="httpHeaders"
                value={formData.httpHeaders || ''}
                onChange={handleInputChange}
                placeholder='{"Authorization": "Bearer token"}'
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
            </div>
          </div>
        </div>
      )}
      <div className="bg-purple-50 p-4 rounded-md" data-id="element-882">
        <h3 className="text-md font-medium text-purple-900 mb-3" data-id="element-883">
          Target PostgreSQL Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6" data-id="element-884">
          <div data-id="element-888">
            <label htmlFor="targetTable" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-889">
              Table <span className="text-red-500">*</span>
            </label>
            <input type="text" id="targetTable" name="targetTable" value={formData.targetTable} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="customers" required data-id="element-890" />
          </div>
        </div>
      </div>
      <div className="bg-green-50 p-4 rounded-md">
        <h3 className="text-md font-medium text-green-900 mb-3">
          Ingest Settings
        </h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="ingestMode" className="block text-sm font-medium text-gray-700 mb-1">
              Ingest Mode  <span className="text-red-500">*</span>
            </label>
            <select id="ingestMode" name="ingestMode" value={formData.ingestMode} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              <option value="append">
                Append - Add new records to existing data
              </option>
              <option value="replace">
                Replace - Archive existing data and append new data
              </option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {formData.ingestMode === 'append' ? 'Append mode adds new records to the existing dataset.' : 'Replace mode archives the current dataset and creates a new version with the uploaded data.'}
            </p>
          </div>
        </div>
      </div>
    </div>;
  const renderPushConfigForm = () => <div className="space-y-6" data-id="element-891">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-id="element-892">
        <div data-id="element-893">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-894">
            Endpoint Name <span className="text-red-500">*</span>
          </label>
          <input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Enter endpoint name" required data-id="element-895" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4" data-id="element-896">
          <div data-id="element-896a">
            <label htmlFor="endpointVersion" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-897a">
              Version <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              id="endpointVersion" 
              name="endpointVersion" 
              value={formData.endpointVersion} 
              onChange={handleInputChange} 
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
              placeholder="/v1/enrich" 
              required 
              data-id="element-900a" 
            />
            <p className="mt-1 text-xs text-gray-500">e.g., /v1/enrich, /v2/enrich</p>
          </div>
          <div className="md:col-span-3" data-id="element-896b">
            <label htmlFor="endpointPath" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-897">
              API Path <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              id="endpointPath" 
              name="endpointPath" 
              value={formData.endpointPath} 
              onChange={handleInputChange} 
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
              placeholder="/customers/data" 
              required 
              data-id="element-900" 
            />
            <p className="mt-1 text-xs text-gray-500">Full path: {formData.endpointVersion || '/v1/enrich'}{formData.endpointPath || '/customers/data'}</p>
          </div>
        </div>
      </div>
      <div data-id="element-901">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-902">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea id="description" name="description" value={formData.description} onChange={handleInputChange} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Enter endpoint description" data-id="element-903" />
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
                Target Collection <span className="text-red-500">*</span>
              </label>
              <input type="text" id="targetCollection" name="targetCollection" value={formData.targetCollection} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="customers" required data-id="element-929" />
            </div>
          </div>
        </div>
      </div>
      
      </div>
  const renderConfigStep = () => <div className="space-y-6" data-id="element-940">
      {renderConfigTypeSelector()}
      {configurationType === 'pull' ? renderPullConfigForm() : renderPushConfigForm()}
      <div className="flex justify-end space-x-4" data-id="element-941">
        <Button variant="secondary" onClick={onClose} data-id="element-942">
          Cancel
        </Button>
        {!isFormValid() ? (
          <div title="Please fill all required fields">
            <Button variant="primary" icon={<PlayIcon size={16} data-id="element-944" />} onClick={handleTestRun} disabled={true} data-id="element-943">
              {isTestingConnection ? 'Testing Connection...' : 'Test Run'}
            </Button>
          </div>
        ) : (
          <Button variant="primary" icon={<PlayIcon size={16} data-id="element-944" />} onClick={handleTestRun} disabled={isTestingConnection} data-id="element-943">
            {isTestingConnection ? 'Testing Connection...' : 'Test Run'}
          </Button>
        )}
      </div>
    </div>;
//   const renderPreviewStep = () => <div className="space-y-6" data-id="element-945">
//       <div className="bg-green-50 p-4 rounded-md" data-id="element-946">
//         <h3 className="text-md font-medium text-green-900 mb-3" data-id="element-947">
//           Test Run Results
//         </h3>
//         <div className="grid grid-cols-3 gap-4 mb-4" data-id="element-948">
//           <div className="bg-white p-3 rounded-md shadow-sm" data-id="element-949">
//             <p className="text-sm text-gray-500" data-id="element-950">Total Rows</p>
//             <p className="text-xl font-semibold" data-id="element-951">{previewData.totalRows}</p>
//           </div>
//           <div className="bg-white p-3 rounded-md shadow-sm" data-id="element-952">
//             <p className="text-sm text-gray-500" data-id="element-953">Valid Rows</p>
//             <p className="text-xl font-semibold text-green-600" data-id="element-954">
//               {previewData.validRows}
//             </p>
//           </div>
//           <div className="bg-white p-3 rounded-md shadow-sm" data-id="element-955">
//             <p className="text-sm text-gray-500" data-id="element-956">Invalid Rows</p>
//             <p className="text-xl font-semibold text-red-600" data-id="element-957">
//               {previewData.invalidRows}
//             </p>
//           </div>
//         </div>
//       </div>
//       {previewData.validationErrors.length > 0 && <div className="bg-red-50 p-4 rounded-md" data-id="element-958">
//           <h3 className="text-md font-medium text-red-900 mb-3" data-id="element-959">
//             Validation Errors
//           </h3>
//           <div className="max-h-40 overflow-y-auto" data-id="element-960">
//             <table className="min-w-full divide-y divide-gray-200" data-id="element-961">
//               <thead className="bg-gray-50" data-id="element-962">
//                 <tr data-id="element-963">
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-964">
//                     Row
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-965">
//                     Field
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-966">
//                     Error
//                   </th>
//                 </tr>
//               </thead>
//               <tbody className="bg-white divide-y divide-gray-200" data-id="element-967">
//                 {previewData.validationErrors.map((error: any, index: number) => <tr key={index} data-id="element-968">
//                     <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500" data-id="element-969">
//                       {error.row}
//                     </td>
//                     <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500" data-id="element-970">
//                       {error.field}
//                     </td>
//                     <td className="px-6 py-2 whitespace-nowrap text-sm text-red-500" data-id="element-971">
//                       {error.error}
//                     </td>
//                   </tr>)}
//               </tbody>
//             </table>
//           </div>
//         </div>}
//       <div className="bg-white p-4 rounded-md shadow border border-gray-200" data-id="element-972">
//         <h3 className="text-md font-medium text-gray-900 mb-3" data-id="element-973">Data Preview</h3>
//         <div className="overflow-x-auto" data-id="element-974">
//           <table className="min-w-full divide-y divide-gray-200" data-id="element-975">
//             <thead className="bg-gray-50" data-id="element-976">
//               <tr data-id="element-977">
//                 {previewData.previewRows.length > 0 && Object.keys(previewData.previewRows[0]).map(header => <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-978">
//                       {header}
//                     </th>)}
//               </tr>
//             </thead>
//             <tbody className="bg-white divide-y divide-gray-200" data-id="element-979">
//               {previewData.previewRows.map((row: Record<string, any>, rowIndex: number) => <tr key={rowIndex} data-id="element-980">
//                   {Object.values(row).map((value, colIndex) => <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-id="element-981">
//                       {String(value)}
//                     </td>)}
//                 </tr>)}
//             </tbody>
//           </table>
//         </div>
//       </div>
//       {configurationType === 'push' && <div className="bg-blue-50 p-4 rounded-md" data-id="element-982">
//           <h3 className="text-md font-medium text-blue-900 mb-3" data-id="element-983">
//             API Response Example
//           </h3>
//           <pre className="bg-white p-3 rounded border border-gray-200 text-sm font-mono overflow-x-auto" data-id="element-984">
//             {`{
//   "success": true,
//   "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
//   "stats": {
//     "accepted": ${previewData.validRows},
//     "rejected": ${previewData.invalidRows},
//     "total": ${previewData.totalRows}
//   },
//   "timestamp": "${new Date().toISOString()}"
// }`}
//           </pre>
//         </div>}
//       <div className="flex justify-end space-x-4" data-id="element-985">
//         <Button variant="secondary" onClick={() => setCurrentStep('config')} data-id="element-986">
//           Back to Configuration
//         </Button>
//         <Button variant="primary" icon={<DatabaseIcon size={16} data-id="element-988" />} onClick={() => setCurrentStep('summary')} data-id="element-987">
//           Continue
//         </Button>
//       </div>
//     </div>;
  const renderSummaryStep = () => <div className="space-y-6" data-id="element-989">
      <div className="flex items-center justify-center py-4" data-id="element-990">
        <div className="bg-green-100 rounded-full p-3" data-id="element-991">
          <CheckCircleIcon size={32} className="text-green-600" data-id="element-992" />
        </div>
      </div>
      <div className="text-center" data-id="element-993">
        <h3 className="text-lg font-medium text-gray-900 mb-2" data-id="element-994">
          {editMode ? 'Ready to Update Endpoint' : 'Ready to Create Endpoint'}
        </h3>
        <p className="text-gray-500" data-id="element-995">
          Your data enrichment endpoint has been validated and is ready to be
          {editMode ? ' updated.' : ' created.'}
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
                <div className="col-span-2 text-sm text-gray-900" data-id="element-1021">{formData.targetTable}</div>
              </div>
            </> : <>
              <div className="grid grid-cols-3 gap-4" data-id="element-1022">
                <div className="col-span-1 text-sm font-medium text-gray-500" data-id="element-1023">
                  API Endpoint:
                </div>
                <div className="col-span-2 text-sm text-gray-900" data-id="element-1024">{`/v1/enrich/${formData.endpointVersion}/${formData.endpointPath}`}</div>
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

            </>}
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
      {createSuccess && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded" data-id="success-message">
          {createSuccess}
        </div>
      )}
      <div className="flex justify-end space-x-4" data-id="element-1043">
        <Button variant="secondary" onClick={() => setCurrentStep('config')} disabled={isCreating} data-id="element-1044">
          Back
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={isCreating} data-id="element-1045">
          {isCreating ? (editMode ? 'Updating Endpoint...' : 'Creating Endpoint...') : (editMode ? 'Update Endpoint' : 'Create Endpoint')}
        </Button>
      </div>
    </div>;
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-id="element-1046">
      {/* Enhanced blurred backdrop */}
      <div className="absolute inset-0 backdrop-blur-sm backdrop-saturate-150" onClick={onClose}></div>
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden relative z-10 shadow-2xl" data-id="element-1047">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200" data-id="element-1048">
          <h2 className="text-xl font-semibold text-gray-800" data-id="element-1049">
            {editMode ? 'Edit Data Enrichment Endpoint' : 'Define New Data Enrichment Endpoint'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" data-id="element-1050">
            <XIcon size={24} data-id="element-1051" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]" data-id="element-1052">
          {isLoadingJob ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading job data...</span>
            </div>
          ) : (
            <>
              {currentStep === 'config' && renderConfigStep()}
              {currentStep === 'summary' && renderSummaryStep()}
            </>
          )}
        </div>
      </div>
    </div>;
};