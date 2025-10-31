import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Database, Globe, Settings, Save, Download } from 'lucide-react';
import type { DataEnrichmentJobResponse, JobStatus } from '../types';
import { Button } from '../../../shared/components/Button';
import { useAuth } from '../../auth/contexts/AuthContext';
import { isApprover, isExporter } from '../../../utils/roleUtils';
import { getJobTypeColor, getStatusColor as getCentralizedStatusColor, getStatusLabel } from '../../../shared/utils/statusColors';

interface JobDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: DataEnrichmentJobResponse | null;
  isLoading?: boolean;
  editMode?: boolean;
  onSave?: (updatedJob: Partial<DataEnrichmentJobResponse>) => Promise<void>;
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

const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  isOpen,
  onClose,
  job,
  isLoading = false,
  editMode = false,
  onSave,
  onSendForApproval,
  onApprove,
  onReject,
  onExport,
}) => {
  const { user } = useAuth();
  const userIsApprover = user?.claims ? isApprover(user.claims) : false;
  const userIsExporter = user?.claims ? isExporter(user.claims) : false;
  console.log('=== JOB DETAILS MODAL RENDER ===');
  console.log('isOpen:', isOpen);
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

  // Initialize edited job data when job changes or editMode is enabled
  useEffect(() => {
    if (job && editMode) {
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
  }, [job, editMode]);

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
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {editMode ? 'Edit' : 'View'} Data Enrichment Endpoint: {job?.endpoint_name || 'Loading...'}
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
                  <label className={`flex items-center ${editMode ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                    <input
                      type="radio"
                      name="configType"
                      value="pull"
                      checked={editMode 
                        ? (editedJob.type?.toLowerCase() || job.type?.toLowerCase() || getJobType(job)) === 'pull'
                        : (job.type?.toLowerCase() || getJobType(job)) === 'pull'
                      }
                      onChange={() => editMode && handleInputChange('type', 'pull')}
                      disabled={!editMode}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      ↓ Pull (SFTP/HTTSP)
                    </span>
                  </label>
                  <label className={`flex items-center ${editMode ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                    <input
                      type="radio"
                      name="configType"
                      value="push"
                      checked={editMode
                        ? (editedJob.type?.toLowerCase() || job.type?.toLowerCase() || getJobType(job)) === 'push'
                        : (job.type?.toLowerCase() || getJobType(job)) === 'push'
                      }
                      onChange={() => editMode && handleInputChange('type', 'push')}
                      disabled={!editMode}
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
                    value={editMode ? (editedJob.endpoint_name || '') : (job.endpoint_name || 'N/A')}
                    onChange={(e) => editMode && handleInputChange('endpoint_name', e.target.value)}
                    readOnly={!editMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      editMode ? 'bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' : 'bg-gray-50 text-gray-900'
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
                      value={editMode ? (editedJob.path || '') : (job.path || 'Path not set')}
                      onChange={(e) => editMode && handleInputChange('path', e.target.value)}
                      readOnly={!editMode}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                        editMode ? 'bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' : 'bg-gray-50 text-gray-900'
                      }`}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Source Type
                    </label>
                    <select
                      value={editMode ? (editedJob.source_type || '') : (job.source_type || '')}
                      onChange={(e) => editMode && handleInputChange('source_type', e.target.value)}
                      disabled={true} // Source type cannot be changed during editing
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
                    value={editMode ? (editedJob.version || '') : (job.version || 'v1')}
                    onChange={(e) => editMode && handleInputChange('version', e.target.value)}
                    readOnly={!editMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      editMode ? 'bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' : 'bg-gray-50 text-gray-900'
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
                  value={editMode ? (editedJob.description || '') : (job.description || 'No description provided')}
                  onChange={(e) => editMode && handleInputChange('description', e.target.value)}
                  readOnly={!editMode}
                  rows={3}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md resize-none ${
                    editMode ? 'bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' : 'bg-gray-50 text-gray-900'
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
                      value={editMode ? (editedJob.mode?.toLowerCase() || 'append') : (job.mode?.toLowerCase() || 'append')}
                      onChange={(e) => editMode && handleInputChange('mode', e.target.value)}
                      disabled={!editMode}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                        editMode ? 'bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' : 'bg-gray-50 text-gray-900'
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
                      value={editMode ? (editedJob.table_name || '') : (job.table_name || '')}
                      onChange={(e) => editMode && handleInputChange('table_name', e.target.value)}
                      readOnly={!editMode}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                        editMode ? 'bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' : 'bg-gray-50 text-gray-900'
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
                    {job.source_type && (
                      <div className="flex items-start space-x-3">
                        <Database size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-700 block">Source Type:</span>
                          <span className="text-sm text-gray-900 block">{job.source_type}</span>
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
              {getJobType(job) === 'pull' && job.connection && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                    <Globe size={16} className="mr-2" />
                    Connection Details ({job.source_type})
                  </h4>

                  {job.source_type === 'HTTP' && 'url' in job.connection && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          HTTP URL
                        </label>
                        <input
                          type="text"
                          value={job.connection.url}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                        />
                      </div>
                      {job.connection.headers && Object.keys(job.connection.headers).length > 0 && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Headers
                          </label>
                          <div className="bg-white border border-gray-300 rounded-md p-3">
                            <pre className="text-xs text-gray-900 whitespace-pre-wrap">
                              {JSON.stringify(job.connection.headers, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {job.source_type === 'SFTP' && 'host' in job.connection && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Host
                        </label>
                        <input
                          type="text"
                          value={job.connection.host}
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
                          value={job.connection.port?.toString() || 'N/A'}
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
                          value={job.connection.user_name || 'N/A'}
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
                          value={job.connection.auth_type || 'N/A'}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                        />
                      </div>
                    </div>
                  )}

                  {/* File Settings for SFTP */}
                  {job.source_type === 'SFTP' && job.file && (
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
            </div>
          )}
        </div>

        {/* Edit Mode Footer - Shows "Save" button when creating/editing */}
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

        {/* Send for Approval Footer - Show for editors when viewing job with status='in-progress' */}
        {job && !isLoading && !editMode && job.status === 'in-progress' && onSendForApproval && (
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

        {/* Action Buttons Footer - Only show for approvers when status is under-review */}
        {job && !isLoading && !editMode && userIsApprover && (onApprove || onReject) && job.status === 'under-review' && (
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
                onClick={() => {
                  const jobType = getJobType(job) === 'push' ? 'PUSH' : 'PULL';
                  onReject(job.id, jobType);
                  onClose();
                }}
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

        {/* Export Button Footer - Show for exporters when status is approved (ready to export) */}
        {job && !isLoading && !editMode && onExport && userIsExporter && job.status === 'approved' && (
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

        {/* Default Footer - Show when no other footer is displayed */}
        {job && !isLoading && !editMode && !userIsApprover && !userIsExporter && (
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
    </div>
  );
};

export default JobDetailsModal;
