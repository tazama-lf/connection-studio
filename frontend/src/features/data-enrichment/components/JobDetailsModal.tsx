import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Database, Globe, Settings, Download, Copy } from 'lucide-react';
import type { DataEnrichmentJobResponse } from '../types';
import { Button } from '../../../shared/components/Button';
import { useAuth } from '../../auth/contexts/AuthContext';
import { isApprover, isExporter, isEditor } from '../../../utils/roleUtils';
import { getJobTypeColor, getStatusColor as getCentralizedStatusColor, getStatusLabel } from '../../../shared/utils/statusColors';
import { JobRejectionDialog } from '../../../shared/components/JobRejectionDialog';

interface JobDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: DataEnrichmentJobResponse | null;
  isLoading?: boolean;
  editMode?: boolean;
  cloneMode?: boolean;
  onSave?: (updatedJob: Partial<DataEnrichmentJobResponse>) => Promise<void>;
  onClone?: (job: DataEnrichmentJobResponse) => Promise<void>;
  onSendForApproval?: (jobId: string, jobType: 'PULL' | 'PUSH') => void;
  onApprove?: (jobId: string, jobType: 'PULL' | 'PUSH') => void;
  onReject?: (jobId: string, jobType: 'PULL' | 'PUSH') => void;
  onExport?: (jobId: string, jobType: 'PULL' | 'PUSH') => Promise<void>;
}

// Helper function to determine job type
const getJobType = (job: DataEnrichmentJobResponse): 'push' | 'pull' => {
  if (job.type?.toLowerCase() === 'push' || job.type?.toLowerCase() === 'pull') {
    return job.type.toLowerCase() as 'push' | 'pull';
  }
  // Fallback: if job has path but no source_type, it's PUSH; otherwise it's PULL
  return (job.path && !job.source_type) ? 'push' : 'pull';
};

// Helper function to determine connection type from connection object
const getConnectionType = (job: DataEnrichmentJobResponse): 'HTTP' | 'SFTP' | null => {
  console.log('🔍 getConnectionType called for job:', job.endpoint_name);
  console.log('🔍 job.source_type:', job.source_type);
  console.log('🔍 job.connection:', job.connection);
  console.log('🔍 job.connection type:', typeof job.connection);
  console.log('🔍 job.connection keys:', job.connection ? Object.keys(job.connection) : 'none');
  console.log('🔍 Full job object keys:', Object.keys(job));
  
  // First check explicit source_type
  if (job.source_type) {
    console.log('🔍 Using explicit source_type:', job.source_type);
    return job.source_type as 'HTTP' | 'SFTP';
  }
  
  // Auto-detect from connection object structure
  if (job.connection && typeof job.connection === 'object') {
    // Handle case where connection might be a string (JSON string)
    let connectionObj = job.connection;
    if (typeof job.connection === 'string') {
      try {
        connectionObj = JSON.parse(job.connection);
        console.log('🔍 Parsed connection string:', connectionObj);
      } catch (e) {
        console.log('🔍 Failed to parse connection string:', e);
        return null;
      }
    }
    
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
  
  console.log('🔍 Could not determine connection type, returning null');
  return null;
};

const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  isOpen,
  onClose,
  job,
  isLoading = false,
  editMode = false,
  cloneMode = false,
  onSave,
  onClone,
  onSendForApproval,
  onApprove,
  onReject,
  onExport,
}) => {
  const { user } = useAuth();
  const userIsApprover = user?.claims ? isApprover(user.claims) : false;
  const userIsExporter = user?.claims ? isExporter(user.claims) : false;
  const userIsEditor = user?.claims ? isEditor(user.claims) : false;
  
  // State for rejection dialog
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);

  // Handle rejection with reason
  const handleRejectionConfirm = (_reason: string) => {
    if (onReject && job) {
      const jobType = getJobType(job) === 'push' ? 'PUSH' : 'PULL';
      // TODO: Update onReject to accept reason when backend is implemented
      onReject(job.id, jobType);
      onClose();
    }
  };
  console.log('=== JOB DETAILS MODAL RENDER ===');
  console.log('isOpen:', isOpen);
  console.log('🔍 JobDetailsModal received props:', {
    editMode,
    cloneMode,
    job: job ? {
      id: job.id,
      type: job.type,
      source_type: job.source_type,
      connection: job.connection,
      connectionType: typeof job.connection,
      connectionKeys: job.connection ? (typeof job.connection === 'string' ? 'STRING' : Object.keys(job.connection)) : 'none',
      hasConnection: !!job.connection,
      allJobKeys: Object.keys(job)
    } : 'null'
  });

  // Track job prop changes
  useEffect(() => {
    console.log('🔄 JobDetailsModal job prop changed:', {
      isOpen,
      cloneMode,
      editMode,
      jobExists: !!job,
      jobId: job?.id,
      timestamp: new Date().toISOString()
    });
  }, [job, isOpen, cloneMode, editMode]);
  console.log('editMode:', editMode);
  console.log('isLoading:', isLoading);
  console.log('job:', job);
  console.log('job type:', typeof job);
  console.log('job id:', job?.id);
  console.log('userIsExporter:', userIsExporter);
  console.log('userIsApprover:', userIsApprover);
  console.log('onExport available:', !!onExport);
  
  // State for edit mode
  const [editedJob, setEditedJob] = useState<Partial<DataEnrichmentJobResponse>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize edited job data when job changes or editMode/cloneMode is enabled
  useEffect(() => {
    if (job && (editMode || cloneMode)) {
      const jobType = getJobType(job);
      const baseData = {
        endpoint_name: job.endpoint_name,
        description: job.description,
        version: job.version,
        table_name: job.table_name,
        mode: job.mode,
        path: job.path,
        type: job.type || jobType,
      };

      if (jobType === 'push') {
        setEditedJob(baseData);
      } else {
        setEditedJob({
          ...baseData,
          source_type: job.source_type,
          schedule_id: job.schedule_id,
          connection: job.connection,
          file: job.file,
        });
      }
    }
  }, [job, editMode, cloneMode]);

  const handleInputChange = (field: keyof DataEnrichmentJobResponse, value: any) => {
    setEditedJob(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!onSave || !job) return;
    
    try {
      setIsSaving(true);
      // Filter out schedule_id for push jobs since they don't use schedules
      const jobType = getJobType(job);
      const dataToSave = { ...editedJob };
      
      // Remove type field - we don't allow changing job type
      delete dataToSave.type;
      
      // Note: table_name is intentionally excluded from this update
      // The parent component will handle versioning if needed
      delete dataToSave.table_name;
      
      if (jobType === 'push') {
        delete dataToSave.schedule_id;
        delete dataToSave.source_type;
        delete dataToSave.connection;
        delete dataToSave.file;
      }
      
      await onSave(dataToSave);
      onClose();
    } catch (error) {
      console.error('Failed to save job:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  if (!isOpen) {
    console.log('Modal not open, returning null');
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

  const getConfigTypeColor = (type: string | undefined) => {
    return getJobTypeColor(type);
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
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {cloneMode ? 'Clone' : editMode ? 'Edit' : 'View'} Data Enrichment Endpoint: {job?.endpoint_name || 'Loading...'}
            </h3>
         
          </div>
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
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading job details...</span>
            </div>
          ) : job ? (
            <div className="space-y-6">


              {/* Configuration Type */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Configuration Type</h4>
                <div className="flex space-x-4">
                  <label className={`flex items-center ${(editMode && !cloneMode) ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                    <input
                      type="radio"
                      name="configType"
                      value="pull"
                      checked={editMode 
                        ? (editedJob.type?.toLowerCase() || job.type?.toLowerCase() || getJobType(job)) === 'pull'
                        : (job.type?.toLowerCase() || getJobType(job)) === 'pull'
                      }
                      onChange={() => editMode && !cloneMode && handleInputChange('type', 'pull')}
                      disabled={!editMode || cloneMode}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      ↓ Pull (SFTP/HTTSP)
                    </span>
                  </label>
                  <label className={`flex items-center ${(editMode && !cloneMode) ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                    <input
                      type="radio"
                      name="configType"
                      value="push"
                      checked={editMode
                        ? (editedJob.type?.toLowerCase() || job.type?.toLowerCase() || getJobType(job)) === 'push'
                        : (job.type?.toLowerCase() || getJobType(job)) === 'push'
                      }
                      onChange={() => editMode && !cloneMode && handleInputChange('type', 'push')}
                      disabled={!editMode || cloneMode}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      ↑ Push (REST API)
                    </span>
                  </label>
                </div>
                {((editMode ? (editedJob.type || job.type) : job.type)?.toLowerCase() === 'push') && (
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
                  <input
                    type="text"
                    value={editMode ? (editedJob.endpoint_name || '') : cloneMode ? (editedJob.endpoint_name || job.endpoint_name || '') : (job.endpoint_name || 'N/A')}
                    onChange={(e) => (editMode || (cloneMode && job && getJobType(job) === 'pull')) && handleInputChange('endpoint_name', e.target.value)}
                    readOnly={!editMode && !(cloneMode && job && getJobType(job) === 'pull')}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      (editMode || (cloneMode && job && getJobType(job) === 'pull')) ? 'bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' : 'bg-gray-50 text-gray-900'
                    }`}
                  />
                </div>

                {/* Determine job type using helper function */}
                {getJobType(job) === 'push' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Path
                    </label>
                    <input
                      type="text"
                      value={editMode ? (editedJob.path || '') : cloneMode ? (job.path || 'Path not set') : (job.path || 'Path not set')}
                      onChange={(e) => editMode && !cloneMode && handleInputChange('path', e.target.value)}
                      readOnly={!editMode || cloneMode}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                        (editMode && !cloneMode) ? 'bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' : 'bg-gray-50 text-gray-900'
                      }`}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Source Type
                    </label>
                    <select
                      value={editMode ? (editedJob.source_type || '') : cloneMode ? (job.source_type || '') : (job.source_type || '')}
                      onChange={(e) => editMode && !cloneMode && handleInputChange('source_type', e.target.value)}
                      disabled={true} // Source type cannot be changed during editing or cloning
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900`}
                    >
                      <option value="">Select source type</option>
                      <option value="HTTP">HTTP</option>
                      <option value="SFTP">SFTP</option>
                    </select>
                    {editMode && (
                      <p className="mt-1 text-xs text-gray-500">
                        Source type cannot be changed after creation
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Version
                  </label>
                  <input
                    type="text"
                    value={editMode ? (editedJob.version || '') : cloneMode ? (editedJob.version || job.version || 'v1') : (job.version || 'v1')}
                    onChange={(e) => (editMode || (cloneMode && job && getJobType(job) === 'pull')) && handleInputChange('version', e.target.value)}
                    readOnly={!editMode && !(cloneMode && job && getJobType(job) === 'pull')}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      (editMode || (cloneMode && job && getJobType(job) === 'pull')) ? 'bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' : 'bg-gray-50 text-gray-900'
                    }`}
                  />
                </div>

                {getJobType(job) === 'pull' && job.schedule_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Schedule ID
                    </label>
                    <input
                      type="text"
                      value={job.schedule_id}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                    />
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editMode ? (editedJob.description || '') : cloneMode ? (job.description || 'No description provided') : (job.description || 'No description provided')}
                  onChange={(e) => editMode && !cloneMode && handleInputChange('description', e.target.value)}
                  readOnly={!editMode || cloneMode}
                  rows={3}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md resize-none ${
                    (editMode && !cloneMode) ? 'bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' : 'bg-gray-50 text-gray-900'
                  }`}
                />
              </div>

              {/* Ingest Settings */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
                  <Settings size={16} className="mr-2" />
                  Ingest Settings
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ingest Mode
                    </label>
                    <select
                      value={editMode ? (editedJob.mode?.toLowerCase() || 'append') : cloneMode ? (job.mode?.toLowerCase() || 'append') : (job.mode?.toLowerCase() || 'append')}
                      onChange={(e) => editMode && !cloneMode && handleInputChange('mode', e.target.value)}
                      disabled={!editMode || cloneMode}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                        (editMode && !cloneMode) ? 'bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' : 'bg-gray-50 text-gray-900'
                      }`}
                    >
                      <option value="append">Append - Add new records to existing data</option>
                      <option value="replace">Replace - Replace all existing data</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      {(editMode ? editedJob.mode : job.mode) === 'append' && 'Append mode adds new records to the existing dataset.'}
                      {(editMode ? editedJob.mode : job.mode) === 'replace' && 'Replace mode replaces all existing data with new data.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Target Collection
                    </label>
                    <input
                      type="text"
                      value={editMode ? (editedJob.table_name || '') : cloneMode ? (job.table_name || '') : (job.table_name || '')}
                      onChange={(e) => editMode && !cloneMode && handleInputChange('table_name', e.target.value)}
                      readOnly={!editMode || cloneMode}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                        (editMode && !cloneMode) ? 'bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' : 'bg-gray-50 text-gray-900'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Technical Details */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Technical Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    {(() => {
                      const jobType = getJobType(job);
                      const isPull = jobType === 'pull';
                      const sourceType = getConnectionType(job);
                      console.log('🔍 Source Type display logic:', {
                        jobType,
                        isPull,
                        sourceType,
                        cloneMode,
                        jobKeys: Object.keys(job)
                      });
                      return isPull;
                    })() && (
                      <div className="flex items-start space-x-3">
                        <Database size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-700 block">Source Type:</span>
                          <span className="text-sm text-gray-900 block">
                            {(() => {
                              const sourceType = getConnectionType(job);
                              console.log('🔍 Rendering source type:', sourceType, 'for job:', job.endpoint_name);
                              return sourceType || 'Unknown';
                            })()}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start space-x-3">
                      <Globe size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-700 block">Configuration:</span>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getConfigTypeColor(getJobType(job))}`}>
                          {getJobType(job).toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Settings size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-700 block">Status:</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCentralizedStatusColor(job.status || 'in-progress')}`}>
                          <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
                          {getStatusLabel(job.status || 'in-progress')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <Calendar size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-700 block">Created:</span>
                        <span className="text-sm text-gray-900 block break-words">{formatDate(job.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Clock size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-700 block">Updated:</span>
                        <span className="text-sm text-gray-900 block break-words">{formatDate(job.updated_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Database size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-700 block">Job ID:</span>
                        <span className="text-xs text-gray-900 font-mono block break-all">{job.id}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Connection Details for PULL Jobs */}
              {(() => {
                const jobType = getJobType(job);
                const hasConnection = !!job.connection;
                const shouldShow = jobType === 'pull' && hasConnection;
                console.log('🔍 Connection Details rendering logic:', {
                  jobType,
                  hasConnection,
                  shouldShow,
                  connectionKeys: job.connection ? Object.keys(job.connection) : 'none',
                  cloneMode,
                  jobEndpoint: job.endpoint_name,
                  fullConnectionObject: job.connection
                });
                return shouldShow;
              })() && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                    <Globe size={16} className="mr-2" />
                    Connection Details ({getConnectionType(job) || 'Unknown'})
                  </h4>

                  {(() => {
                    const connectionType = getConnectionType(job);
                    let connectionObj = job.connection;
                    
                    // Handle case where connection might be a string
                    if (typeof job.connection === 'string') {
                      try {
                        connectionObj = JSON.parse(job.connection);
                      } catch (e) {
                        console.log('🔍 Failed to parse connection string for HTTP display:', e);
                        return null;
                      }
                    }
                    
                    return connectionType === 'HTTP' && connectionObj && typeof connectionObj === 'object' && 'url' in connectionObj;
                  })() && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          HTTP URL
                        </label>
                        <input
                          type="text"
                          value={(() => {
                            let connectionObj = job.connection;
                            if (typeof job.connection === 'string') {
                              try {
                                connectionObj = JSON.parse(job.connection);
                              } catch (e) {
                                return 'Error parsing connection';
                              }
                            }
                            return (connectionObj as any)?.url || 'N/A';
                          })()}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                        />
                      </div>
                      {(() => {
                        let connectionObj = job.connection;
                        if (typeof job.connection === 'string') {
                          try {
                            connectionObj = JSON.parse(job.connection);
                          } catch (e) {
                            return null;
                          }
                        }
                        return (connectionObj as any)?.headers && Object.keys((connectionObj as any).headers).length > 0;
                      })() && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Headers
                          </label>
                          <div className="bg-white border border-gray-300 rounded-md p-3">
                            <pre className="text-xs text-gray-900 whitespace-pre-wrap">
                              {(() => {
                                let connectionObj = job.connection;
                                if (typeof job.connection === 'string') {
                                  try {
                                    connectionObj = JSON.parse(job.connection);
                                  } catch (e) {
                                    return 'Error parsing headers';
                                  }
                                }
                                return JSON.stringify((connectionObj as any)?.headers, null, 2);
                              })()}
                            </pre>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {(() => {
                    const connectionType = getConnectionType(job);
                    let connectionObj = job.connection;
                    
                    // Handle case where connection might be a string
                    if (typeof job.connection === 'string') {
                      try {
                        connectionObj = JSON.parse(job.connection);
                      } catch (e) {
                        console.log('🔍 Failed to parse connection string for SFTP display:', e);
                        return null;
                      }
                    }
                    
                    return connectionType === 'SFTP' && connectionObj && typeof connectionObj === 'object' && 'host' in connectionObj;
                  })() && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Host
                        </label>
                        <input
                          type="text"
                          value={(() => {
                            let connectionObj = job.connection;
                            if (typeof job.connection === 'string') {
                              try {
                                connectionObj = JSON.parse(job.connection);
                              } catch (e) {
                                return 'Error parsing connection';
                              }
                            }
                            return (connectionObj as any)?.host || 'N/A';
                          })()}
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
                          value={(() => {
                            let connectionObj = job.connection;
                            if (typeof job.connection === 'string') {
                              try {
                                connectionObj = JSON.parse(job.connection);
                              } catch (e) {
                                return 'Error parsing connection';
                              }
                            }
                            return (connectionObj as any)?.port?.toString() || 'N/A';
                          })()}
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
                          value={(() => {
                            let connectionObj = job.connection;
                            if (typeof job.connection === 'string') {
                              try {
                                connectionObj = JSON.parse(job.connection);
                              } catch (e) {
                                return 'Error parsing connection';
                              }
                            }
                            return (connectionObj as any)?.user_name || 'N/A';
                          })()}
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
                          value={(() => {
                            let connectionObj = job.connection;
                            if (typeof job.connection === 'string') {
                              try {
                                connectionObj = JSON.parse(job.connection);
                              } catch (e) {
                                return 'Error parsing connection';
                              }
                            }
                            return (connectionObj as any)?.auth_type || 'N/A';
                          })()}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                        />
                      </div>
                    </div>
                  )}

                  {/* File Settings for SFTP */}
                  {getConnectionType(job) === 'SFTP' && job.file && (
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
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Job details not found</p>
              <p className="text-xs text-gray-400 mt-2">
                Debug: job is {job === null ? 'null' : job === undefined ? 'undefined' : 'defined'}, 
                cloneMode: {cloneMode ? 'true' : 'false'}
              </p>
            </div>
          )}
        </div>

        {editMode && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex justify-between items-center">
              <Button
                onClick={onClose}
                variant="secondary"
                size="md"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                variant="primary"
                size="md"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        )}

        {cloneMode && onClone && job && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex justify-between items-center">
              <Button
                onClick={onClose}
                variant="secondary"
                size="md"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!job || !onClone) return;
                  
                  const cloneData = {
                    ...job,
                    endpoint_name: editedJob.endpoint_name || job.endpoint_name,
                    version: editedJob.version || job.version
                  };
                  
                  console.log('🚀 Clone button clicked with data:', cloneData);
                  onClone(cloneData);
                }}
                variant="primary"
                size="md"
                className="flex items-center space-x-2"
              >
                <Copy className="w-4 h-4" />
                <span>Create Clone</span>
              </Button>
            </div>
          </div>
        )}

        {job && !isLoading && !editMode && !cloneMode && userIsEditor && job.status === 'in-progress' && onSendForApproval && ( 
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const jobType = getJobType(job) === 'push' ? 'PUSH' : 'PULL';
                onSendForApproval(job.id, jobType);
                onClose();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Send for Approval
            </Button>
          </div>
        )}

        {job && !isLoading && !editMode && !cloneMode && userIsApprover && (onApprove || onReject) && job.status === 'under-review' && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={onClose}
            >
              Close
            </Button>
            {onReject && (
              <Button
                variant="danger"
                onClick={() => setShowRejectionDialog(true)}
              >
                Reject
              </Button>
            )}
            {onApprove && (
              <Button
                variant="primary"
                onClick={() => {
                  const jobType = getJobType(job) === 'push' ? 'PUSH' : 'PULL';
                  onApprove(job.id, jobType);
                  onClose();
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Approve
              </Button>
            )}
          </div>
        )}

       {job && !isLoading && !editMode && !cloneMode && onExport && userIsExporter && job.status === 'approved' && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 bg-gray-50">
            <Button
              variant="secondary"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                const jobType = getJobType(job) === 'push' ? 'PUSH' : 'PULL';
                await onExport(job.id, jobType);
              }}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </Button>
          </div>
        )}

        {job && !isLoading && !editMode && !cloneMode && 
         !(userIsEditor && job.status === 'in-progress' && onSendForApproval) &&
         !(userIsApprover && (onApprove || onReject) && job.status === 'under-review') &&
         !(onExport && userIsExporter && job.status === 'approved') && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 bg-gray-50">
            <Button
              variant="secondary"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        )}
      </div>

      {/* Rejection Dialog */}
      <JobRejectionDialog
        isOpen={showRejectionDialog}
        onClose={() => setShowRejectionDialog(false)}
        onConfirm={handleRejectionConfirm}
        jobName={job?.endpoint_name || job?.id || 'Unknown Job'}
        jobType="Data Enrichment Job"
      />
    </div>
  );
};

export default JobDetailsModal;
