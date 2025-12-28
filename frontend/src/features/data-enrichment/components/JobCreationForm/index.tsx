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
} from '../../types';
import { Button } from '../../../../shared/components/Button';
import { dataEnrichmentJobApi as dataEnrichmentApi, scheduleApi } from '../../handlers';
import { DATA_ENRICHMENT_JOB_STATUSES } from '../../constants';

import type { JobFormProps } from '../../types';

export const JobCreationForm: React.FC<JobFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [configType] = useState<ConfigType>('Pull'); 
  const [sourceType, setSourceType] = useState<SourceType>('HTTP');
  const [endpointName, setEndpointName] = useState('');
  const [description, setDescription] = useState('');
  const [tableName, setTableName] = useState('');
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  const [version, setVersion] = useState('1.0.0');

  
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [availableSchedules, setAvailableSchedules] = useState<ScheduleResponse[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);

  
  useEffect(() => {
    const loadSchedules = async () => {
      try {
        setSchedulesLoading(true);
        setErrorMessage(null);
        const schedulesResp = await scheduleApi.getAll();
        const schedule_data: any[] = Array.isArray(schedulesResp)
          ? schedulesResp
          : schedulesResp?.data || schedulesResp?.results || schedulesResp?.items || [];
        
        const filteredSchedules = (schedule_data || []).filter((schedule: any) =>
          schedule?.status === DATA_ENRICHMENT_JOB_STATUSES.APPROVED || schedule?.status === DATA_ENRICHMENT_JOB_STATUSES.EXPORTED
        );
        setAvailableSchedules(filteredSchedules || []);
      } catch (error) {
        setErrorMessage('Unable to load available schedules. Please refresh the page or try again later.');
      } finally {
        setSchedulesLoading(false);
      }
    };

    loadSchedules();
  }, []);

  
  const [httpUrl, setHttpUrl] = useState('');
  const httpHeaders = {
    'content-type': 'application/json',
  };

  
  const [sftpHost, setSftpHost] = useState('');
  const [sftpPort, setSftpPort] = useState(22);
  const [sftpAuthType, setSftpAuthType] = useState<AuthType>('USERNAME_PASSWORD');
  const [sftpUsername, setSftpUsername] = useState('');
  const [sftpPassword, setSftpPassword] = useState('');
  const [sftpPrivateKey, setSftpPrivateKey] = useState('');

  
  const [filePath, setFilePath] = useState('');
  const [fileType, setFileType] = useState<FileType>('CSV');
  const [fileDelimiter, setFileDelimiter] = useState(',');
  const [fileHasHeader, setFileHasHeader] = useState(true);

  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  
  const getIterationText = (count: number) => {
    return count === 1 ? '1 iteration' : `${count} iterations`;
  };

  
  const validateFileFormat = () => {
    if (sourceType !== 'SFTP' || !filePath.trim()) {
      return { isValid: true, error: '' };
    }

    const fileName = filePath.trim();
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    
    if (!fileExtension) {
      return { isValid: false, error: 'Please specify a file with a valid extension (e.g., .csv, .tsv, .json)' };
    }

    
    const extensionFormatMap: { [key: string]: FileType[] } = {
      'csv': ['CSV'],
      'tsv': ['TSV'],
      'json': ['JSON'],
      'txt': ['CSV', 'TSV'] 
    };

    const allowedFormats = extensionFormatMap[fileExtension];
    
    if (!allowedFormats) {
      return { isValid: false, error: `Unsupported file extension: .${fileExtension}. Supported extensions: .csv, .tsv, .json` };
    }

    if (!allowedFormats.includes(fileType)) {
      const formatName = fileType === 'CSV' ? 'CSV' : fileType === 'TSV' ? 'TSV' : 'JSON';
      return { isValid: false, error: `File format mismatch: .${fileExtension} files must use ${allowedFormats.join(' or ')} format, not ${formatName}` };
    }

    return { isValid: true, error: '' };
  };

  
  const isFormValid = () => {
    
    if (!endpointName.trim() || !description.trim() || !tableName.trim() || !selectedScheduleId || !version.trim()) {
      return false;
    }

    
    if (sourceType === 'HTTP') {
      return httpUrl.trim() !== '';
    } else if (sourceType === 'SFTP') {
      
      if (!sftpHost.trim() || !sftpUsername.trim() || !filePath.trim()) {
        return false;
      }
      
      if (sftpAuthType === 'USERNAME_PASSWORD' && !sftpPassword.trim()) {
        return false;
      }
      
      if (sftpAuthType === 'PRIVATE_KEY' && !sftpPrivateKey.trim()) {
        return false;
      }

      
      const formatValidation = validateFileFormat();
      if (!formatValidation.isValid) {
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    
    if (!selectedScheduleId) {
      setErrorMessage('Please select a schedule before creating the job.');
      return;
    }

    
    if (sourceType === 'SFTP') {
      const formatValidation = validateFileFormat();
      if (!formatValidation.isValid) {
        setErrorMessage(formatValidation.error);
        return;
      }
    }
    
    try {
      
      const baseJobData = {
        config_type: configType,
        endpoint_name: endpointName,
        schedule_id: selectedScheduleId,
        source_type: sourceType,
        description,
        table_name: tableName,
        mode,
        version,
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
        };

        
        if (sftpAuthType === 'USERNAME_PASSWORD') {
          (sftpConnection as any).password = sftpPassword;
        } else {
          (sftpConnection as any).private_key = sftpPrivateKey;
        }

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
    } catch (error: any) {
      let errorMessage = 'Failed to create job';
      
      if (error?.response?.data) {
        errorMessage = error.response.data.message || 
                      error.response.data.error || 
                      (Array.isArray(error.response.data.message) 
                        ? error.response.data.message.join(', ') 
                        : JSON.stringify(error.response.data));
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setErrorMessage(errorMessage);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Create Data Enrichment Job</h2>
      
      
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{errorMessage}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mode <span className="text-red-500">*</span>
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'append' | 'replace')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="append">Append (Add new records)</option>
                <option value="replace">Replace (Overwrite existing)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Version <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 1.0.0"
              />
            </div>
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
                onChange={(e) => setSelectedScheduleId(e.target.value || null)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a schedule</option>
                {availableSchedules.map((schedule) => (
                  <option key={schedule.id} value={String(schedule.id)}>
                    {schedule.name} - {schedule.cron} ({getIterationText(schedule.iterations)})
                  </option>
                ))}
              </select>
            )}
            {availableSchedules.length === 0 && !schedulesLoading && !errorMessage && (
              <p className="text-sm text-amber-600 mt-1 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                No schedules available. Please create a schedule in CRON Job Management first.
              </p>
            )}
          </div>
        </div>

        
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
                  {sourceType === 'SFTP' && filePath.trim() && (() => {
                    const formatValidation = validateFileFormat();
                    return !formatValidation.isValid ? (
                      <p className="mt-1 text-sm text-red-600">{formatValidation.error}</p>
                    ) : null;
                  })()}
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
            title={!isFormValid() ? 'Please complete all required fields to create the job' : ''}
          >
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading || !isFormValid()}
            >
              {isLoading ? 'Creating Job...' : 'Create Job'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default JobCreationForm;
