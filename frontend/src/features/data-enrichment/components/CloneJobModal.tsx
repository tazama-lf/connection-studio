import React, { useState, useEffect } from 'react';
import { X, Copy } from 'lucide-react';
import { Button } from '../../../shared/components/Button';
import type { DataEnrichmentJobResponse } from '../types';
import { dataEnrichmentApi } from '../services/dataEnrichmentApi';
import { useToast } from '../../../shared/providers/ToastProvider';


interface CloneJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: DataEnrichmentJobResponse | null;
  onSuccess?: () => void;
}

// Helper function to determine job type
const getJobType = (job: DataEnrichmentJobResponse): 'push' | 'pull' => {
  if (job.type?.toLowerCase() === 'push' || job.type?.toLowerCase() === 'pull') {
    return job.type.toLowerCase() as 'push' | 'pull';
  }
  // Fallback: if job has path but no source_type, it's PUSH; otherwise it's PULL
  return (job.path && !job.source_type) ? 'push' : 'pull';
};

// Helper function to determine source type consistently
const determineSourceType = (job: DataEnrichmentJobResponse): 'HTTP' | 'SFTP' => {
  // First check if source_type is explicitly set
  if (job.source_type) {
    console.log('🔍 Using explicit source_type:', job.source_type);
    return job.source_type as 'HTTP' | 'SFTP';
  }
  
  // Auto-detect from connection object
  if (job.connection) {
    let connectionObj = job.connection;
    
    // If connection is a string, try to parse it
    if (typeof job.connection === 'string') {
      try {
        connectionObj = JSON.parse(job.connection);
        console.log('🔍 Parsed connection string for source type detection:', connectionObj);
      } catch (e) {
        console.error('❌ Failed to parse connection string for source type detection:', e);
        return 'HTTP'; // Default fallback
      }
    }
    
    // Check parsed or direct object
    if (connectionObj && typeof connectionObj === 'object') {
      if ('host' in connectionObj && connectionObj.host) {
        console.log('🔍 Auto-detected SFTP from connection.host:', connectionObj.host);
        return 'SFTP';
      } else if ('url' in connectionObj && connectionObj.url) {
        console.log('🔍 Auto-detected HTTP from connection.url:', connectionObj.url);
        return 'HTTP';
      }
    }
  }
  
  // Default fallback
  console.log('🔍 Defaulting to HTTP - no clear indicators');
  return 'HTTP';
};

export const CloneJobModal: React.FC<CloneJobModalProps> = ({
  isOpen,
  onClose,
  job,
  onSuccess
}) => {
  const [newVersion, setNewVersion] = useState('');
  const [newEndpointName, setNewEndpointName] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const { showSuccess, showError } = useToast();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen && job) {
      // Initialize with suggested values
      const currentVersion = job.version || '1';
      const versionNumber = parseInt(currentVersion);
      const nextVersion = isNaN(versionNumber) ? '2' : (versionNumber + 1).toString();
      setNewVersion(nextVersion);
      setNewEndpointName(job.endpoint_name || '');
    } else {
      setNewVersion('');
      setNewEndpointName('');
    }
  }, [isOpen, job]);

  const handleClone = async () => {
    if (!job || !newVersion.trim()) {
      showError('Version is required');
      return;
    }

    // For pull jobs, endpoint name is required
    if (job.type === 'pull' && !newEndpointName.trim()) {
      showError('Endpoint name is required for pull jobs');
      return;
    }

    setIsCloning(true);
    try {
      let result;
      
      if (job.type === 'pull') {
        // Clone pull job with version and endpoint name
        // Need to provide required fields for CreatePullJobDto
        // Determine source_type for pull jobs using consistent logic
        const sourceType = determineSourceType(job);
        console.log('🔍 Final determined source_type for cloning:', sourceType);

        // Handle connection data - create default if missing
        let connectionData = job.connection;
        if (!connectionData) {
          console.log('No connection data found, creating default based on source type...');
          if (sourceType === 'SFTP') {
            connectionData = {
              host: '',
              port: 22,
              user_name: '',
              auth_type: 'USERNAME_PASSWORD' as const,
              password: ''
            };
            showError('This pull job is missing connection information. Please check the original job and ensure it has proper SFTP connection details.');
            setIsCloning(false);
            return;
          } else {
            connectionData = {
              url: '',
              headers: {}
            };
            showError('This pull job is missing connection information. Please check the original job and ensure it has proper HTTP connection details.');
            setIsCloning(false);
            return;
          }
        }

        // Handle schedule_id - either use existing or get available schedules
        let scheduleId = job.schedule_id;
        
        if (!scheduleId) {
          console.log('No schedule_id found on job, attempting to get available schedules...');
          showSuccess('Finding or creating schedule for cloned job...'); // Give user feedback
          try {
            // Try to get available approved schedules
            const schedules = await dataEnrichmentApi.getAllSchedules();
            const approvedSchedules = schedules.filter((schedule: any) => 
              schedule.status === 'approved' || schedule.status === 'exported' || schedule.status === 'deployed'
            );
            
            if (approvedSchedules.length > 0) {
              // Use the first available approved schedule
              scheduleId = approvedSchedules[0].id;
              console.log('Using first available approved schedule:', scheduleId);
            } else {
              // Create a default schedule for this job
              console.log('No approved schedules found, creating a default schedule...');
              const defaultSchedule = await dataEnrichmentApi.createSchedule({
                name: `Schedule for ${newEndpointName} (Cloned)`,
                cron: '0 */6 * * *', // Every 6 hours as default
                iterations: -1, // Infinite iterations
                status: 'approved' // Auto-approve for cloned jobs
              });
              
              if (defaultSchedule.success) {
                // Note: We need to get the created schedule ID - this might need adjustment based on API response
                const createdSchedules = await dataEnrichmentApi.getAllSchedules();
                const newSchedule = createdSchedules.find((s: any) => s.name === `Schedule for ${newEndpointName} (Cloned)`);
                scheduleId = newSchedule?.id;
                console.log('Created new schedule with ID:', scheduleId);
              }
            }
          } catch (scheduleError) {
            console.error('Failed to handle schedule:', scheduleError);
            showError('Failed to create or find a schedule for the cloned job. Please try again.');
            setIsCloning(false);
            return;
          }
        }

        if (!scheduleId) {
          showError('Could not determine a valid schedule for the cloned job. Please contact support.');
          setIsCloning(false);
          return;
        }

        const pullJobData = {
          endpoint_name: newEndpointName.trim(),
          version: newVersion.trim(),
          schedule_id: scheduleId, // Required field - either from original job or newly created/found
          source_type: sourceType as 'HTTP' | 'SFTP', // Required field - determined or defaulted
          description: job.description ? `${job.description}` : 'Cloned job',
          connection: connectionData, // Required field - validated connection data
          table_name: job.table_name || '', // Required field
          mode: job.mode || 'append' as 'append' | 'replace',
          ...(job.file && { file: job.file }) // Optional for SFTP jobs
        };

        console.log('🔄 Cloning pull job with data:', JSON.stringify(pullJobData, null, 2));
        console.log('🔄 Original job schedule_id:', job.schedule_id);
        console.log('🔄 Using schedule_id:', scheduleId);
        console.log('🔄 Original job source_type:', job.source_type);
        console.log('🔄 Using source_type:', sourceType);
        console.log('🔄 Original connection object:', job.connection);
        console.log('🔄 Using connection data:', connectionData);
        console.log('🔄 Connection has host:', connectionData && 'host' in connectionData);
        console.log('🔄 Connection has url:', connectionData && 'url' in connectionData);
        result = await dataEnrichmentApi.createPullJob(pullJobData);
        
      } else {
        // Clone push job with only version
        // Need to provide required fields for CreatePushJobDto
        const pushJobData = {
          endpoint_name: job.endpoint_name,
          version: newVersion.trim(),
          path: job.path || '', // Required field for push jobs
          description: job.description ? `${job.description}` : 'Cloned job',
          table_name: job.table_name || '', // Required field
          mode: job.mode || 'append' as 'append' | 'replace'
        };

        console.log('🔄 Cloning push job with data:', pushJobData);
        result = await dataEnrichmentApi.createPushJob(pushJobData);
      }
      
      // result is DataEnrichmentJobResponse, not a success wrapper
      if (result && result.id) {
        showSuccess(`${job.type === 'pull' ? 'Pull' : 'Push'} job cloned successfully as version ${newVersion}`);
        onSuccess?.();
        onClose();
      } else {
        showError('Failed to clone job - no ID returned');
      }
    } catch (error) {
      console.error('❌ Clone failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to clone job';
      showError(errorMessage);
    } finally {
      setIsCloning(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Enhanced blurred background overlay without black background */}
      <div
        className="fixed inset-0 backdrop-blur-sm backdrop-saturate-150 transition-opacity"
      />

      {/* Modal panel */}
      <div className="bg-white rounded-lg shadow-2xl relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Clone Data Enrichment Endpoint: {job?.endpoint_name || 'Loading...'}
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {job ? (
            <div className="space-y-6">


              {/* Configuration Type */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Configuration Type</h4>
                <div className="flex space-x-4">
                  <label className="flex items-center cursor-not-allowed">
                    <input
                      type="radio"
                      name="configType"
                      value="pull"
                      checked={getJobType(job) === 'pull'}
                      disabled
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      ↓ Pull (SFTP/HTTP)
                    </span>
                  </label>
                  <label className="flex items-center cursor-not-allowed">
                    <input
                      type="radio"
                      name="configType"
                      value="push"
                      checked={getJobType(job) === 'push'}
                      disabled
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      ↑ Push (REST API)
                    </span>
                  </label>
                </div>
                {getJobType(job) === 'push' && (
                  <p className="mt-2 text-sm text-gray-500">
                    Push configuration creates a REST API endpoint where external systems can send data to your system.
                  </p>
                )}
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Endpoint Name <span className="text-red-500">*</span>
                  </label>
                  {getJobType(job) === 'pull' ? (
                    <input
                      type="text"
                      value={newEndpointName}
                      onChange={(e) => setNewEndpointName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isCloning}
                    />
                  ) : (
                    <input
                      type="text"
                      value={job.endpoint_name || 'N/A'}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                    />
                  )}
                  {getJobType(job) === 'pull' && (
                    <p className="mt-1 text-xs text-gray-500">
                      Enter a new endpoint name for the cloned pull job
                    </p>
                  )}
                </div>

                {getJobType(job) === 'push' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Path
                    </label>
                    <input
                      type="text"
                      value={job.path || 'Path not set'}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Source Type
                    </label>
                    <input
                      type="text"
                      value={(() => {
                        const finalSourceType = job.source_type || determineSourceType(job);
                        console.log('🔍 Display source type determination:', {
                          jobSourceType: job.source_type,
                          hasConnection: !!job.connection,
                          hasHost: job.connection && 'host' in job.connection && !!job.connection.host,
                          hasUrl: job.connection && 'url' in job.connection && !!job.connection.url,
                          finalSourceType
                        });
                        return finalSourceType;
                      })()}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                    />
                    {!job.source_type && job.connection && (
                      <p className="mt-1 text-xs text-amber-600">
                        Source type auto-detected from connection settings
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Version <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isCloning}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter a new version for the cloned job
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Table Name
                  </label>
                  <input
                    type="text"
                    value={job.table_name || 'N/A'}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mode
                  </label>
                  <select
                    value={job.mode || 'append'}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                  >
                    <option value="append">Append</option>
                    <option value="replace">Replace</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <input
                    type="text"
                    value="in-progress"
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-blue-50 text-blue-800 font-medium"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={job.description ? `${job.description}` : 'Cloned job'}
                  readOnly
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                />
              </div>

              {/* Connection Details for PULL Jobs - Same as View Modal */}
              {getJobType(job) === 'pull' && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                    Connection Details ({(() => {
                      return job.source_type || determineSourceType(job);
                    })()}) (Read-Only)
                  </h4>

                  {/* Debug Connection Data */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                    <p className="text-xs font-mono text-gray-800">
                      <strong>Debug Connection:</strong><br/>
                      Type: {typeof job.connection}<br/>
                      Has connection: {job.connection ? 'YES' : 'NO'}<br/>
                      {job.connection && (
                        <>
                          Keys: {Object.keys(job.connection).join(', ')}<br/>
                          Raw: {JSON.stringify(job.connection, null, 2)}
                        </>
                      )}
                    </p>
                  </div>

                  {job.connection ? (
                    <>
                      {/* Parse connection if it's a string */}
                      {(() => {
                        let connectionObj = job.connection;
                        
                        // If connection is a string, try to parse it
                        if (typeof job.connection === 'string') {
                          try {
                            connectionObj = JSON.parse(job.connection);
                            console.log('📋 Parsed connection string:', connectionObj);
                          } catch (e) {
                            console.error('❌ Failed to parse connection string:', e);
                            return (
                              <div className="bg-red-50 p-3 rounded border border-red-200">
                                <p className="text-sm text-red-800">
                                  ⚠️ Connection data is a string but cannot be parsed as JSON.
                                </p>
                                <pre className="text-xs mt-2 text-gray-600">{job.connection}</pre>
                              </div>
                            );
                          }
                        }

                        return (
                          <>
                            {/* HTTP Connection Details */}
                            {connectionObj && typeof connectionObj === 'object' && 'url' in connectionObj && connectionObj.url && (
                              <>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    HTTP URL
                                  </label>
                                  <input
                                    type="text"
                                    value={connectionObj.url || 'N/A'}
                                    readOnly
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                                  />
                                </div>
                                {connectionObj.headers && Object.keys(connectionObj.headers).length > 0 && (
                                  <div className="mt-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Headers
                                    </label>
                                    <div className="bg-white border border-gray-300 rounded-md p-3">
                                      <pre className="text-xs text-gray-900 whitespace-pre-wrap">
                                        {JSON.stringify(connectionObj.headers, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}

                            {/* SFTP Connection Details */}
                            {connectionObj && typeof connectionObj === 'object' && 'host' in connectionObj && connectionObj.host && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Host
                                  </label>
                                  <input
                                    type="text"
                                    value={connectionObj.host || 'N/A'}
                                    readOnly
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Port
                                  </label>
                                  <input
                                    type="text"
                                    value={connectionObj.port?.toString() || 'N/A'}
                                    readOnly
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Username
                                  </label>
                                  <input
                                    type="text"
                                    value={connectionObj.user_name || 'N/A'}
                                    readOnly
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Auth Type
                                  </label>
                                  <input
                                    type="text"
                                    value={connectionObj.auth_type || 'N/A'}
                                    readOnly
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                                  />
                                </div>
                              </div>
                            )}

                            {/* File Settings for SFTP */}
                            {connectionObj && typeof connectionObj === 'object' && 'host' in connectionObj && connectionObj.host && job.file && (
                              <div className="mt-4 pt-4 border-t border-blue-200">
                                <h5 className="text-sm font-medium text-gray-900 mb-3">File Settings</h5>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      File Path
                                    </label>
                                    <input
                                      type="text"
                                      value={job.file.path || 'N/A'}
                                      readOnly
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      File Type
                                    </label>
                                    <input
                                      type="text"
                                      value={job.file.file_type || 'N/A'}
                                      readOnly
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Delimiter
                                    </label>
                                    <input
                                      type="text"
                                      value={job.file.delimiter || 'N/A'}
                                      readOnly
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    <div className="bg-red-50 p-3 rounded border border-red-200">
                      <p className="text-sm text-red-800">
                        ⚠️ No connection information available for this job. This may cause cloning to fail.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Schedule and Source Type Information */}
              {getJobType(job) === 'pull' && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Pull Job Configuration (Read-Only)</h4>
                  <div className="space-y-3">
                    {/* Source Type Info */}
                    <div className="bg-amber-50 p-4 rounded-md">
                      <div className="text-sm text-amber-800">
                        <p className="font-medium mb-2">🔗 Source Type & Connection Configuration</p>
                        
                        {/* Source Type Detection */}
                        <div className="mb-3">
                          {job.source_type ? (
                            <p>Source type: <strong>{job.source_type}</strong> (explicitly set)</p>
                          ) : (
                            <div>
                              <p>Source type will be auto-detected from connection:</p>
                              <ul className="list-disc list-inside mt-1 ml-2 text-xs">
                                {job.connection && 'host' in job.connection && job.connection.host && (
                                  <li>✅ SFTP detected (host: {job.connection.host})</li>
                                )}
                                {job.connection && 'url' in job.connection && job.connection.url && (
                                  <li>✅ HTTP detected (URL: {job.connection.url})</li>
                                )}
                                {(!job.connection) && (
                                  <li>❌ No connection data found</li>
                                )}
                                {(job.connection && 
                                  !('host' in job.connection && job.connection.host) && 
                                  !('url' in job.connection && job.connection.url)
                                ) && (
                                  <li>⚠️ Connection exists but missing host/url - will default to HTTP</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Connection Status */}
                        <div>
                          <p className="font-medium">Connection Status:</p>
                          {job.connection ? (
                            <p className="text-xs">✅ Connection data available</p>
                          ) : (
                            <p className="text-xs text-red-700">❌ No connection data - this may cause cloning to fail</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Schedule Info */}
                    <div className="bg-blue-50 p-4 rounded-md">
                      <div className="text-sm text-blue-800">
                        {job.schedule_id ? (
                          <>
                            <p className="font-medium mb-2">📅 Existing Schedule</p>
                            <p>The cloned job will use the same schedule as the original job.</p>
                            <p className="mt-2 text-xs">Schedule ID: {job.schedule_id}</p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium mb-2">📅 Schedule Handling</p>
                            <p>This job doesn't have a direct schedule association. When cloning:</p>
                            <ul className="list-disc list-inside mt-2 ml-2 space-y-1">
                              <li>We'll first try to use an existing approved schedule</li>
                              <li>If none available, we'll create a default schedule (every 6 hours)</li>
                              <li>The new schedule will be automatically approved</li>
                            </ul>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Metadata (Read-Only)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Original Job ID
                    </label>
                    <input
                      type="text"
                      value={job.id}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Original Version
                    </label>
                    <input
                      type="text"
                      value={job.version || 'v1'}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Created Date
                    </label>
                    <input
                      type="text"
                      value={formatDate(job.created_at)}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Updated
                    </label>
                    <input
                      type="text"
                      value={formatDate(job.updated_at)}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Clone Information */}
              <div>
                <div className="bg-blue-50 p-4 rounded-md">
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-2">📋 Clone Information</p>
                    <p>All configuration settings above will be copied to the new job. Only the highlighted fields (Version{getJobType(job) === 'pull' ? ' and Endpoint Name' : ''}) can be modified.</p>
                    <ul className="list-disc list-inside mt-2 ml-2 space-y-1">
                      <li>The cloned job will start with "in-progress" status</li>
                      <li>It will require separate approval workflow</li>
                      {getJobType(job) === 'pull' && (
                        <li>Schedule will be automatically handled (existing or new default schedule)</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading job details...</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button
            onClick={onClose}
            variant="secondary"
            disabled={isCloning}
          >
            Cancel
          </Button>
          <Button
            onClick={handleClone}
            variant="primary"
            disabled={isCloning || !newVersion.trim() || (job ? getJobType(job) === 'pull' && !newEndpointName.trim() : false)}
          >
            {isCloning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Cloning...
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Clone {job && getJobType(job) === 'pull' ? 'Pull Job' : 'Push Job'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CloneJobModal;