import React, { useState, useEffect } from 'react';
import type {
  CreateDataEnrichmentJobRequest,
  ConfigType,
  SourceType,
  HttpConnection,
  SftpConnection,
  FileConfig,
  AuthType,
  FileType,
  ScheduleResponse,
} from '../types';
import { Button } from '../../../shared/components/Button';
import { dataEnrichmentApi } from '../services/dataEnrichmentApi';

interface JobFormProps {
  onSubmit: (jobData: CreateDataEnrichmentJobRequest) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const JobCreationForm: React.FC<JobFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [configType] = useState<ConfigType>('Pull'); // Based on your examples, seems to be always 'Pull'
  const [sourceType, setSourceType] = useState<SourceType>('HTTP');
  const [endpointName, setEndpointName] = useState('');
  const [description, setDescription] = useState('');
  const [tableName, setTableName] = useState('');

  // Schedule selection
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [availableSchedules, setAvailableSchedules] = useState<ScheduleResponse[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);

  // Load available schedules on component mount
  useEffect(() => {
    const loadSchedules = async () => {
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
  }, []);

  // HTTP specific fields
  const [httpUrl, setHttpUrl] = useState('');
  const httpHeaders = {
    'content-type': 'application/json',
  };

  // SFTP specific fields
  const [sftpHost, setSftpHost] = useState('');
  const [sftpPort, setSftpPort] = useState(22);
  const [sftpAuthType, setSftpAuthType] = useState<AuthType>('USERNAME_PASSWORD');
  const [sftpUsername, setSftpUsername] = useState('');
  const [sftpPassword, setSftpPassword] = useState('');
  const [sftpPrivateKey, setSftpPrivateKey] = useState('');

  // File specific fields
  const [filePath, setFilePath] = useState('');
  const [fileType, setFileType] = useState<FileType>('CSV');
  const [fileDelimiter, setFileDelimiter] = useState(',');
  const [fileHasHeader, setFileHasHeader] = useState(true);

  // Validation function to check if all required fields are filled
  const isFormValid = () => {
    // Basic required fields
    if (!endpointName.trim() || !description.trim() || !tableName.trim() || !selectedScheduleId) {
      return false;
    }

    // Source type specific validation
    if (sourceType === 'HTTP') {
      return httpUrl.trim() !== '';
    } else if (sourceType === 'SFTP') {
      // SFTP requires host, username, and either password or private key based on auth type
      if (!sftpHost.trim() || !sftpUsername.trim() || !filePath.trim()) {
        return false;
      }
      
      if (sftpAuthType === 'USERNAME_PASSWORD' && !sftpPassword.trim()) {
        return false;
      }
      
      if (sftpAuthType === 'PRIVATE_KEY' && !sftpPrivateKey.trim()) {
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedScheduleId) {
      alert('Please select a schedule first');
      return;
    }
    
    try {
      // Create job with the selected schedule_id
      const baseJobData = {
        config_type: configType,
        endpoint_name: endpointName,
        schedule_id: selectedScheduleId,
        source_type: sourceType,
        description,
        table_name: tableName,
      };

      if (sourceType === 'HTTP') {
        const httpConnection: HttpConnection = {
          url: httpUrl,
          headers: httpHeaders,
        };

        const jobData: CreateDataEnrichmentJobRequest = {
          ...baseJobData,
          source_type: 'HTTP',
          connection: httpConnection,
        } as CreateDataEnrichmentJobRequest;

        onSubmit(jobData);
      } else if (sourceType === 'SFTP') {
        const sftpConnection: SftpConnection = {
          host: sftpHost,
          port: sftpPort,
          auth_type: sftpAuthType,
          user_name: sftpUsername,
          ...(sftpAuthType === 'USERNAME_PASSWORD' ? { password: sftpPassword } : { private_key: sftpPrivateKey }),
        };

        const fileConfig: FileConfig = {
          path: filePath,
          file_type: fileType,
          delimiter: fileDelimiter,
        };

        const jobData: CreateDataEnrichmentJobRequest = {
          ...baseJobData,
          source_type: 'SFTP',
          connection: sftpConnection,
          file: fileConfig,
        } as CreateDataEnrichmentJobRequest;

        onSubmit(jobData);
      }
    } catch (error) {
      console.error('Failed to create job:', error);
      // You can add error handling here (show toast, alert, etc.)
      alert('Failed to create job. Please check your settings and try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Create Data Enrichment Job</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Job Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endpoint Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={endpointName}
                onChange={(e) => setEndpointName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Dummy"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Table Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., job_table_1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe what this job does..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Source Type <span className="text-red-500">*</span>
            </label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as SourceType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="HTTP">HTTP</option>
              <option value="SFTP">SFTP</option>
            </select>
          </div>
        </div>

        {/* Schedule Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Schedule Selection</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Schedule <span className="text-red-500">*</span>
            </label>
            {schedulesLoading ? (
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                Loading schedules...
              </div>
            ) : (
              <select
                value={selectedScheduleId || ''}
                onChange={(e) => setSelectedScheduleId(e.target.value ? parseInt(e.target.value) : null)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        </div>

        {/* HTTP Configuration */}
        {sourceType === 'HTTP' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">HTTP Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={httpUrl}
                  onChange={(e) => setHttpUrl(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="/v1/enrich/ACM102/customerdata"
                />
              </div>
            </div>


          </div>
        )}

        {/* SFTP Configuration */}
        {sourceType === 'SFTP' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">SFTP Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Host <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={sftpHost}
                  onChange={(e) => setSftpHost(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="sftp.example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Port <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={sftpPort}
                  onChange={(e) => setSftpPort(parseInt(e.target.value))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="22"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Authentication Type <span className="text-red-500">*</span>
              </label>
              <select
                value={sftpAuthType}
                onChange={(e) => setSftpAuthType(e.target.value as AuthType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="USERNAME_PASSWORD">Username & Password</option>
                <option value="PRIVATE_KEY">Private Key</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={sftpUsername}
                  onChange={(e) => setSftpUsername(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {sftpAuthType === 'USERNAME_PASSWORD' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={sftpPassword}
                    onChange={(e) => setSftpPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Private Key <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={sftpPrivateKey}
                    onChange={(e) => setSftpPrivateKey(e.target.value)}
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="-----BEGIN PRIVATE KEY-----"
                  />
                </div>
              )}
            </div>

            {/* File Configuration */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-md font-semibold">File Configuration</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    File Path <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="/path/to/file.csv"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    File Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value as FileType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CSV">CSV</option>
                    <option value="JSON">JSON</option>
                    <option value="TSV">TSV</option>
                  </select>
                </div>
              </div>

              {fileType === 'CSV' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delimiter
                    </label>
                    <input
                      type="text"
                      value={fileDelimiter}
                      onChange={(e) => setFileDelimiter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder=","
                    />
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={fileHasHeader}
                        onChange={(e) => setFileHasHeader(e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Has Header Row</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <div 
            className="relative"
            title={!isFormValid() ? 'Please fill all required fields' : ''}
          >
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading || !isFormValid()}
            >
              {isLoading ? 'Creating...' : 'Create Job'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default JobCreationForm;
