import { Backdrop, Box, Button as MuiButton } from '@mui/material';
import {
  Calendar,
  Check,
  CheckCircle,
  Clock,
  Copy,
  Database,
  Download,
  Download as DownloadIcon,
  Globe,
  Hash,
  MessageSquare,
  Save,
  Send,
  Upload as UploadIcon,
  XCircle,
  X as XIcon,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { JobRejectionDialog } from '../../../shared/components/JobRejectionDialog';
import {
  getStatusColor as getCentralizedStatusColor,
  getJobTypeColor,
  getStatusLabel,
} from '../../../shared/utils/statusColors';
import { isApprover, isEditor, isExporter } from '../../../utils/roleUtils';
import { useAuth } from '../../auth/contexts/AuthContext';
import type { DataEnrichmentJobResponse } from '../types';

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
  onReject?: (jobId: string, jobType: 'PULL' | 'PUSH', reason: string) => void;
  onExport?: (jobId: string, jobType: 'PULL' | 'PUSH') => Promise<void>;
}

// Helper function to determine job type
const getJobType = (job: DataEnrichmentJobResponse): 'push' | 'pull' => {
  if (
    job.type?.toLowerCase() === 'push' ||
    job.type?.toLowerCase() === 'pull'
  ) {
    return job.type.toLowerCase() as 'push' | 'pull';
  }
  // Fallback: if job has path but no source_type, it's PUSH; otherwise it's PULL
  return job.path && !job.source_type ? 'push' : 'pull';
};

// Helper function to determine connection type from connection object
const getConnectionType = (
  job: DataEnrichmentJobResponse,
): 'HTTP' | 'SFTP' | null => {
  // First check explicit source_type
  if (job.source_type) {
    return job.source_type as 'HTTP' | 'SFTP';
  }

  // Auto-detect from connection object structure
  if (job.connection && typeof job.connection === 'object') {
    // Handle case where connection might be a string (JSON string)
    let connectionObj = job.connection;
    if (typeof job.connection === 'string') {
      try {
        connectionObj = JSON.parse(job.connection);
      } catch (e) {
        return null;
      }
    }

    if (connectionObj && typeof connectionObj === 'object') {
      if ('host' in connectionObj && connectionObj.host) {
        return 'SFTP';
      } else if ('url' in connectionObj && connectionObj.url) {
        return 'HTTP';
      }
    }
  }

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
  const handleRejectionConfirm = (reason: string) => {
    if (onReject && job) {
      const jobType = getJobType(job) === 'push' ? 'PUSH' : 'PULL';
      onReject(job.id, jobType, reason);
      onClose();
    }
  };

  // State for edit mode
  const [editedJob, setEditedJob] = useState<
    Partial<DataEnrichmentJobResponse>
  >({});
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

  const handleInputChange = (
    field: keyof DataEnrichmentJobResponse,
    value: any,
  ) => {
    setEditedJob((prev) => ({
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
      <Backdrop
        sx={(theme) => ({
          zIndex: theme.zIndex.drawer + 1,
          overflow: 'hidden',
        })}
        open={true}
      >
        <div className="bg-white rounded-lg shadow-2xl relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col">
          {/* Header with close button */}
          <div
            className="flex justify-between items-center px-6 py-4 border-b border-gray-200"
            data-id="element-1048"
          >
            <Box
              sx={{ fontSize: '20px', fontWeight: 'bold', color: '#2b7fff' }}
            >
              {cloneMode ? 'Clone' : editMode ? 'Edit' : 'View'} Data Enrichment
              Endpoint
              <Box
                sx={{ fontSize: '14px', fontWeight: 'bold', color: '#3b3b3b' }}
              >
                {job?.endpoint_name || 'Loading...'}
              </Box>
            </Box>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              data-id="element-1050"
            >
              <XIcon size={24} data-id="element-1051" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">
                  Loading job details...
                </span>
              </div>
            ) : job ? (
              <div className="space-y-6">
                {/* Configuration Type */}
                <Box>
                  <Box
                    sx={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#2b7fff',
                      marginBottom: '16px',
                    }}
                  >
                    {(() => {
                      const configurationType = editMode
                        ? editedJob.type?.toLowerCase() ||
                          job.type?.toLowerCase() ||
                          getJobType(job)
                        : job.type?.toLowerCase() || getJobType(job);
                      return configurationType;
                    })() === 'pull' ? (
                      <div className="flex items-center">
                        <DownloadIcon
                          size={20}
                          className="mr-2 text-blue-500"
                        />
                        Pull Configuration (SFTP/HTTP)
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <UploadIcon
                          size={20}
                          className="mr-2 text-purple-500"
                        />
                        Push Configuration (REST API)
                      </div>
                    )}
                  </Box>
                  <p className="text-sm text-gray-600 ml-7">
                    {(() => {
                      const configurationType = editMode
                        ? editedJob.type?.toLowerCase() ||
                          job.type?.toLowerCase() ||
                          getJobType(job)
                        : job.type?.toLowerCase() || getJobType(job);
                      return configurationType;
                    })() === 'pull'
                      ? 'Configure data fetching from external sources'
                      : 'Configure REST API endpoint for data ingestion'}
                  </p>
                </Box>

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2 bg-gray-50 px-0 py-0 rounded">
                      Endpoint Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={
                        editMode
                          ? editedJob.endpoint_name || ''
                          : cloneMode
                            ? editedJob.endpoint_name || job.endpoint_name || ''
                            : job.endpoint_name || 'N/A'
                      }
                      onChange={(e) =>
                        (editMode ||
                          (cloneMode && job && getJobType(job) === 'pull')) &&
                        handleInputChange('endpoint_name', e.target.value)
                      }
                      readOnly={
                        !editMode &&
                        !(cloneMode && job && getJobType(job) === 'pull')
                      }
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-medium h-[60px] ${
                        editMode ||
                        (cloneMode && job && getJobType(job) === 'pull')
                          ? 'bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:bg-white'
                          : 'bg-gray-50 text-gray-900'
                      }`}
                      style={{
                        border: '1px solid silver',
                        borderRadius: '7px',
                        fontSize: '1.1rem',
                        fontWeight: 500,
                      }}
                    />
                  </div>

                  {/* Determine job type using helper function */}
                  {getJobType(job) === 'push' ? (
                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2 bg-gray-50 px-0 py-0 rounded">
                        API Path
                      </label>
                      <input
                        type="text"
                        value={
                          editMode
                            ? editedJob.path || ''
                            : cloneMode
                              ? job.path || 'Path not set'
                              : job.path || 'Path not set'
                        }
                        onChange={(e) =>
                          editMode &&
                          !cloneMode &&
                          handleInputChange('path', e.target.value)
                        }
                        readOnly={!editMode || cloneMode}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-medium h-[60px] ${
                          editMode && !cloneMode
                            ? 'bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:bg-white'
                            : 'bg-gray-50 text-gray-900'
                        }`}
                        style={{
                          border: '1px solid silver',
                          borderRadius: '7px',
                          fontSize: '1.1rem',
                          fontWeight: 500,
                        }}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2 bg-gray-50 px-0 py-0 rounded">
                        Source Type
                      </label>
                      <select
                        value={
                          editMode
                            ? editedJob.source_type || ''
                            : cloneMode
                              ? job.source_type || ''
                              : job.source_type || ''
                        }
                        onChange={(e) =>
                          editMode &&
                          !cloneMode &&
                          handleInputChange('source_type', e.target.value)
                        }
                        disabled={true} // Source type cannot be changed during editing or cloning
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-medium h-[60px] bg-gray-50 text-gray-900`}
                        style={{
                          border: '1px solid silver',
                          borderRadius: '7px',
                          fontSize: '1.1rem',
                          fontWeight: 500,
                        }}
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
                    <label className="block text-sm font-bold text-gray-800 mb-2 bg-gray-50 px-0 py-0 rounded">
                      Version
                    </label>
                    <input
                      type="text"
                      value={
                        editMode
                          ? editedJob.version || ''
                          : cloneMode
                            ? editedJob.version || job.version || 'v1'
                            : job.version || 'v1'
                      }
                      onChange={(e) =>
                        (editMode ||
                          (cloneMode && job && getJobType(job) === 'pull')) &&
                        handleInputChange('version', e.target.value)
                      }
                      readOnly={
                        !editMode &&
                        !(cloneMode && job && getJobType(job) === 'pull')
                      }
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-medium h-[60px] ${
                        editMode ||
                        (cloneMode && job && getJobType(job) === 'pull')
                          ? 'bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:bg-white'
                          : 'bg-gray-50 text-gray-900'
                      }`}
                      style={{
                        border: '1px solid silver',
                        borderRadius: '7px',
                        fontSize: '1.1rem',
                        fontWeight: 500,
                      }}
                    />
                  </div>

                  {getJobType(job) === 'pull' && job.schedule_id && (
                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2 bg-gray-50 px-0 py-0 rounded">
                        Schedule ID
                      </label>
                      <input
                        type="text"
                        value={job.schedule_id}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-medium h-[60px] bg-gray-50 text-gray-900"
                        style={{
                          border: '1px solid silver',
                          borderRadius: '7px',
                          fontSize: '1.1rem',
                          fontWeight: 500,
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2 bg-gray-50 px-0 py-0 rounded">
                    Description
                  </label>
                  <textarea
                    value={
                      editMode
                        ? editedJob.description || ''
                        : cloneMode
                          ? job.description || 'No description provided'
                          : job.description || 'No description provided'
                    }
                    onChange={(e) =>
                      editMode &&
                      !cloneMode &&
                      handleInputChange('description', e.target.value)
                    }
                    readOnly={!editMode || cloneMode}
                    rows={3}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg resize-none text-lg font-medium ${
                      editMode && !cloneMode
                        ? 'bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:bg-white'
                        : 'bg-gray-50 text-gray-900'
                    }`}
                    style={{
                      border: '1px solid silver',
                      borderRadius: '7px',
                      fontSize: '1.1rem',
                      fontWeight: 500,
                    }}
                  />
                </div>

                {/* Ingest Settings */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <Box
                    sx={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#3b3b3b',
                      marginBottom: '16px',
                    }}
                  >
                    Ingest Settings
                  </Box>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2 bg-gray-50 px-0 py-0 rounded">
                        Ingest Mode
                      </label>
                      <select
                        value={
                          editMode
                            ? editedJob.mode?.toLowerCase() || 'append'
                            : cloneMode
                              ? job.mode?.toLowerCase() || 'append'
                              : job.mode?.toLowerCase() || 'append'
                        }
                        onChange={(e) =>
                          editMode &&
                          !cloneMode &&
                          handleInputChange('mode', e.target.value)
                        }
                        disabled={!editMode || cloneMode}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-medium h-[60px] ${
                          editMode && !cloneMode
                            ? 'bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:bg-white'
                            : 'bg-gray-50 text-gray-900'
                        }`}
                        style={{
                          border: '1px solid silver',
                          borderRadius: '7px',
                          fontSize: '1.1rem',
                          fontWeight: 500,
                        }}
                      >
                        <option value="append">
                          Append - Add new records to existing data
                        </option>
                        <option value="replace">
                          Replace - Replace all existing data
                        </option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        {(editMode ? editedJob.mode : job.mode) === 'append' &&
                          'Append mode adds new records to the existing dataset.'}
                        {(editMode ? editedJob.mode : job.mode) === 'replace' &&
                          'Replace mode replaces all existing data with new data.'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2 bg-gray-50 px-0 py-0 rounded">
                        Target Collection
                      </label>
                      <input
                        type="text"
                        value={
                          editMode
                            ? editedJob.table_name || ''
                            : cloneMode
                              ? job.table_name || ''
                              : job.table_name || ''
                        }
                        onChange={(e) =>
                          editMode &&
                          !cloneMode &&
                          handleInputChange('table_name', e.target.value)
                        }
                        readOnly={!editMode || cloneMode}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-medium h-[60px] ${
                          editMode && !cloneMode
                            ? 'bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:bg-white'
                            : 'bg-gray-50 text-gray-900'
                        }`}
                        style={{
                          border: '1px solid silver',
                          borderRadius: '7px',
                          fontSize: '1.1rem',
                          fontWeight: 500,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Technical Details */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <Box
                    sx={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#3b3b3b',
                      marginBottom: '16px',
                    }}
                  >
                    Technical Details
                  </Box>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      {(() => {
                        const jobType = getJobType(job);
                        const isPull = jobType === 'pull';
                        return isPull;
                      })() && (
                        <div className="flex items-start space-x-3">
                          <Database
                            size={18}
                            className="text-gray-400 mt-0.5 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-bold text-gray-800 block bg-blue-50 px-0 py-0 rounded-sm">
                              Source Type:
                            </span>
                            <span className="text-sm text-gray-900 block">
                              {(() => {
                                const sourceType = getConnectionType(job);
                                return sourceType || 'Unknown';
                              })()}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start space-x-3">
                        <Globe
                          size={18}
                          className="text-gray-400 mt-0.5 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold text-gray-800 block bg-blue-50 px-0 py-0 rounded-sm">
                            Configuration:
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getConfigTypeColor(getJobType(job))}`}
                          >
                            {getJobType(job).toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <CheckCircle
                          size={18}
                          className="text-gray-400 mt-0.5 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold text-gray-800 block bg-blue-50 px-0 py-0 rounded-sm">
                            Status:
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getCentralizedStatusColor(job.status || 'in-progress')}`}
                          >
                            <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
                            {getStatusLabel(job.status || 'in-progress')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <MessageSquare
                          size={18}
                          className="text-gray-400 mt-0.5 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold text-gray-800 block bg-blue-50 px-0 py-0 rounded-sm">
                            Comments:
                          </span>
                          <span className="text-sm text-gray-900 block break-words">
                            {job?.comments || 'No comments available'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <Calendar
                          size={18}
                          className="text-gray-400 mt-0.5 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold text-gray-800 block bg-blue-50 px-0 py-0 rounded-sm">
                            Created:
                          </span>
                          <span className="text-sm text-gray-900 block break-words">
                            {formatDate(job.created_at)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Clock
                          size={18}
                          className="text-gray-400 mt-0.5 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold text-gray-800 block bg-blue-50 px-0 py-0 rounded-sm">
                            Updated:
                          </span>
                          <span className="text-sm text-gray-900 block break-words">
                            {formatDate(job.updated_at)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Hash
                          size={18}
                          className="text-gray-400 mt-0.5 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold text-gray-800 block bg-blue-50 px-0 py-0 rounded-sm">
                            Job ID:
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono bg-gray-100 text-gray-800 border border-gray-200 break-all">
                            {job.id}
                          </span>
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
                          return null;
                        }
                      }

                      return (
                        connectionType === 'HTTP' &&
                        connectionObj &&
                        typeof connectionObj === 'object' &&
                        'url' in connectionObj
                      );
                    })() && (
                      <>
                        <div>
                          <label className="block text-sm font-bold text-gray-800 mb-2 bg-gray-50 px-0 py-0 rounded">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-medium h-[60px] bg-white text-gray-900"
                            style={{
                              border: '1px solid silver',
                              borderRadius: '7px',
                              fontSize: '1.1rem',
                              fontWeight: 500,
                            }}
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
                          return (
                            (connectionObj as any)?.headers &&
                            Object.keys((connectionObj as any).headers).length >
                              0
                          );
                        })() && (
                          <div className="mt-3">
                            <label className="block text-sm font-bold text-gray-800 mb-2 bg-gray-50 px-0 py-0 rounded">
                              Headers
                            </label>
                            <div className="bg-white border border-gray-300 rounded-md p-3">
                              <pre className="text-xs text-gray-900 whitespace-pre-wrap">
                                {(() => {
                                  let connectionObj = job.connection;
                                  if (typeof job.connection === 'string') {
                                    try {
                                      connectionObj = JSON.parse(
                                        job.connection,
                                      );
                                    } catch (e) {
                                      return 'Error parsing headers';
                                    }
                                  }
                                  return JSON.stringify(
                                    (connectionObj as any)?.headers,
                                    null,
                                    2,
                                  );
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
                          return null;
                        }
                      }

                      return (
                        connectionType === 'SFTP' &&
                        connectionObj &&
                        typeof connectionObj === 'object' &&
                        'host' in connectionObj
                      );
                    })() && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-800 mb-2 bg-gray-50 px-0 py-0 rounded">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-medium h-[60px] bg-white text-gray-900"
                            style={{
                              border: '1px solid silver',
                              borderRadius: '7px',
                              fontSize: '1.1rem',
                              fontWeight: 500,
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-800 mb-2 bg-gray-50 px-0 py-0 rounded">
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
                              return (
                                (connectionObj as any)?.port?.toString() ||
                                'N/A'
                              );
                            })()}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-medium h-[60px] bg-white text-gray-900"
                            style={{
                              border: '1px solid silver',
                              borderRadius: '7px',
                              fontSize: '1.1rem',
                              fontWeight: 500,
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-800 mb-2 bg-gray-50 px-0 py-0 rounded">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-medium h-[60px] bg-white text-gray-900"
                            style={{
                              border: '1px solid silver',
                              borderRadius: '7px',
                              fontSize: '1.1rem',
                              fontWeight: 500,
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-800 mb-2 bg-gray-50 px-0 py-0 rounded">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-medium h-[60px] bg-white text-gray-900"
                            style={{
                              border: '1px solid silver',
                              borderRadius: '7px',
                              fontSize: '1.1rem',
                              fontWeight: 500,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* File Settings for SFTP */}
                    {getConnectionType(job) === 'SFTP' && job.file && (
                      <div className="mt-4 pt-4 border-t border-blue-200">
                        <h5 className="text-sm font-medium text-gray-900 mb-3">
                          File Settings
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-gray-800 mb-2 bg-gray-50 px-0 py-0 rounded">
                              File Path
                            </label>
                            <input
                              type="text"
                              value={job.file.path || 'N/A'}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-medium h-[60px] bg-white text-gray-900"
                              style={{
                                border: '1px solid silver',
                                borderRadius: '7px',
                                fontSize: '1.1rem',
                                fontWeight: 500,
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-800 mb-2 bg-gray-50 px-0 py-0 rounded">
                              File Type
                            </label>
                            <input
                              type="text"
                              value={job.file.file_type || 'N/A'}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-medium h-[60px] bg-white text-gray-900"
                              style={{
                                border: '1px solid silver',
                                borderRadius: '7px',
                                fontSize: '1.1rem',
                                fontWeight: 500,
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-800 mb-2 bg-gray-50 px-0 py-0 rounded">
                              Delimiter
                            </label>
                            <input
                              type="text"
                              value={job.file.delimiter || 'N/A'}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-medium h-[60px] bg-white text-gray-900"
                              style={{
                                border: '1px solid silver',
                                borderRadius: '7px',
                                fontSize: '1.1rem',
                                fontWeight: 500,
                              }}
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
                  Debug: job is{' '}
                  {job === null
                    ? 'null'
                    : job === undefined
                      ? 'undefined'
                      : 'defined'}
                  , cloneMode: {cloneMode ? 'true' : 'false'}
                </p>
              </div>
            )}
          </div>

          {editMode && (
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
              <div className="flex justify-between items-center">
                <MuiButton
                  type="button"
                  variant="contained"
                  sx={{ marginRight: '10px', backgroundColor: '#6b7280' }}
                  onClick={onClose}
                  startIcon={<XCircle size={16} />}
                >
                  Cancel
                </MuiButton>
                <MuiButton
                  type="button"
                  variant="contained"
                  sx={{ backgroundColor: '#2b7fff' }}
                  onClick={handleSave}
                  disabled={isSaving}
                  startIcon={<Save size={16} />}
                >
                  {isSaving ? 'Updating...' : 'Update'}
                </MuiButton>
              </div>
            </div>
          )}

          {cloneMode && onClone && job && (
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
              <div className="flex justify-between items-center">
                <MuiButton
                  type="button"
                  variant="contained"
                  sx={{ marginRight: '10px', backgroundColor: '#6b7280' }}
                  onClick={onClose}
                  startIcon={<XCircle size={16} />}
                >
                  Cancel
                </MuiButton>
                <MuiButton
                  type="button"
                  variant="contained"
                  sx={{ backgroundColor: '#2b7fff' }}
                  onClick={() => {
                    if (!job || !onClone) return;

                    const cloneData = {
                      ...job,
                      endpoint_name:
                        editedJob.endpoint_name || job.endpoint_name,
                      version: editedJob.version || job.version,
                    };

                    onClone(cloneData);
                  }}
                  startIcon={<Copy size={16} />}
                >
                  Create Clone
                </MuiButton>
              </div>
            </div>
          )}

          {job &&
            !isLoading &&
            !editMode &&
            !cloneMode &&
            userIsEditor &&
            (job.status === 'STATUS_01_IN_PROGRESS' ||
              job.status === 'STATUS_05_REJECTED') &&
            onSendForApproval && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <MuiButton
                  type="button"
                  variant="contained"
                  sx={{ marginRight: '10px', backgroundColor: '#6b7280' }}
                  onClick={onClose}
                  startIcon={<XCircle size={16} />}
                >
                  Cancel
                </MuiButton>
                <MuiButton
                  type="button"
                  variant="contained"
                  sx={{ backgroundColor: '#2b7fff' }}
                  onClick={() => {
                    const jobType =
                      getJobType(job) === 'push' ? 'PUSH' : 'PULL';
                    onSendForApproval(job.id, jobType);
                    onClose();
                  }}
                  startIcon={<Send size={16} />}
                >
                  Send for Approval
                </MuiButton>
              </div>
            )}

          {job &&
            !isLoading &&
            !editMode &&
            !cloneMode &&
            userIsApprover &&
            (onApprove || onReject) &&
            job.status === 'STATUS_03_UNDER_REVIEW' && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <MuiButton
                  type="button"
                  variant="contained"
                  sx={{ marginRight: '10px', backgroundColor: '#6b7280' }}
                  onClick={onClose}
                  startIcon={<XCircle size={16} />}
                >
                  Close
                </MuiButton>
                {onReject && (
                  <MuiButton
                    type="button"
                    variant="contained"
                    sx={{ marginRight: '10px', backgroundColor: '#dc2626' }}
                    onClick={() => setShowRejectionDialog(true)}
                    startIcon={<XCircle size={16} />}
                  >
                    Reject
                  </MuiButton>
                )}
                {onApprove && (
                  <MuiButton
                    type="button"
                    variant="contained"
                    sx={{ backgroundColor: '#16a34a' }}
                    onClick={() => {
                      const jobType =
                        getJobType(job) === 'push' ? 'PUSH' : 'PULL';
                      onApprove(job.id, jobType);
                      onClose();
                    }}
                    startIcon={<Check size={16} />}
                  >
                    Approve
                  </MuiButton>
                )}
              </div>
            )}

          {job &&
            !isLoading &&
            !editMode &&
            !cloneMode &&
            onExport &&
            userIsExporter &&
            job.status === 'STATUS_04_APPROVED' && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 bg-gray-50">
                <MuiButton
                  type="button"
                  variant="contained"
                  sx={{ marginRight: '10px', backgroundColor: '#6b7280' }}
                  onClick={onClose}
                  startIcon={<XCircle size={16} />}
                >
                  Close
                </MuiButton>
                <MuiButton
                  type="button"
                  variant="contained"
                  sx={{ backgroundColor: '#2b7fff' }}
                  onClick={async () => {
                    const jobType =
                      getJobType(job) === 'push' ? 'PUSH' : 'PULL';
                    await onExport(job.id, jobType);
                  }}
                  startIcon={<Download size={16} />}
                >
                  Export
                </MuiButton>
              </div>
            )}

          {job &&
            !isLoading &&
            !editMode &&
            !cloneMode &&
            !(
              userIsEditor &&
              (job.status === 'STATUS_01_IN_PROGRESS' ||
                job.status === 'STATUS_05_REJECTED') &&
              onSendForApproval
            ) &&
            !(
              userIsApprover &&
              (onApprove || onReject) &&
              job.status === 'STATUS_03_UNDER_REVIEW'
            ) &&
            !(
              onExport &&
              userIsExporter &&
              job.status === 'STATUS_04_APPROVED'
            ) && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 bg-gray-50">
                <MuiButton
                  type="button"
                  variant="contained"
                  sx={{ backgroundColor: '#6b7280' }}
                  onClick={onClose}
                >
                  Cancel
                </MuiButton>
              </div>
            )}
        </div>
      </Backdrop>

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
