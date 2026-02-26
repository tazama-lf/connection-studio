import {
  Backdrop,
  Box,
  Button as MuiButton,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { formatDateStructured , getJobType, getConnectionType } from '../../utils';
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
import { JobRejectionDialog } from '../../../../shared/components/JobRejectionDialog';
import {
  getStatusColor as getCentralizedStatusColor,
  getJobTypeColor,
} from '../../../../shared/utils/statusColors';
import { isApprover, isEditor, isExporter } from '../../../../utils/common/roleUtils';
import { useAuth } from '../../../auth/contexts/AuthContext';
import type { DataEnrichmentJobResponse , JobDetailsModalProps } from '../../types';
import {
  handleRejectionConfirm as handleRejection,
  handleSendForApprovalConfirm as handleSendApproval,
  handleInputChange as handleInput,
  handleSaveJob,
  handleExportConfirm as handleExport,
  handleApproveWithComment as handleApproveComment,
} from '../../handlers';


import ensurePromise from '../../../../utils/common/helper';
import { DATA_ENRICHMENT_JOB_STATUSES } from '../../constants';

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
  const [showExportConfirmDialog, setShowExportConfirmDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [showApprovalConfirmDialog, setShowApprovalConfirmDialog] =
    useState(false);
  const [showApproveConfirmDialog, setShowApproveConfirmDialog] =
    useState(false);

  const handleRejectionConfirm = (reason: string) => { handleRejection(reason, job, onReject, onClose); };

  const handleSendForApprovalConfirm = () => { handleSendApproval(job, onSendForApproval, onClose, setShowApprovalConfirmDialog); };
  
  const [editedJob, setEditedJob] = useState<
    Partial<DataEnrichmentJobResponse>
  >({});
  const [isSaving, setIsSaving] = useState(false);

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

  const handleInputChange = (field: keyof DataEnrichmentJobResponse, value: any) => 
    { handleInput(field, value, setEditedJob); };

  const handleSave = async () => { await handleSaveJob(job, editedJob, onSave, onClose, setIsSaving); };

  const getConfigTypeColor = (type: string | undefined) => getJobTypeColor(type);

  const handleExportConfirm = async () => { await handleExport(job, onExport, setShowExportConfirmDialog, setIsSaving); };

  const [approveComment, setApproveComment] = useState('');
  
  useEffect(() => {
    if (!showApproveConfirmDialog) setApproveComment('');
  }, [showApproveConfirmDialog]);

  const handleApproveWithComment = async () => {
    const asyncOnApprove = onApprove ? ensurePromise(onApprove) : undefined;
    await handleApproveComment(job, approveComment, asyncOnApprove, setShowApproveConfirmDialog, setIsSaving);
  };

  if (!isOpen) return null;

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
          <div
            className="flex justify-between items-center px-6 py-4 border-b border-gray-200"
            data-id="element-1048"
          >
            <Box
              sx={{ fontSize: '20px', fontWeight: 'bold', color: '#2b7fff' }}
            >
              {cloneMode ? 'Clone' : editMode ? 'Edit' : 'View'} Data Enrichment
              Endpoint
            </Box>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              data-id="element-1050"
            >
              <XIcon size={24} data-id="element-1051" />
            </button>
          </div>
          
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
                        Pull Configuration (SFTP/HTTPS)
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2  px-0 py-0 rounded">
                      Connector Name <span className="text-red-500">*</span>
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
                          : ' text-gray-900'
                      }`}
                      style={{
                        border: '1px solid silver',
                        borderRadius: '7px',
                        fontSize: '1.1rem',
                        fontWeight: 500,
                      }}
                    />
                  </div>

                  {getJobType(job) === 'push' ? (
                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2  px-0 py-0 rounded">
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
                            : ' text-gray-900'
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
                      <label className="block text-sm font-bold text-gray-800 mb-2  px-0 py-0 rounded">
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
                        disabled={true} 
                        className={'w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-medium h-[60px]  text-gray-900'}
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
                    <label className="block text-sm font-bold text-gray-800 mb-2  px-0 py-0 rounded">
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
                          : ' text-gray-900'
                      }`}
                      style={{
                        border: '1px solid silver',
                        borderRadius: '7px',
                        fontSize: '1.1rem',
                        fontWeight: 500,
                      }}
                    />
                  </div>

                  {getJobType(job) === 'pull' && job?.schedule_name && (
                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2  px-0 py-0 rounded">
                        Schedule Name
                      </label>
                      <input
                        type="text"
                        value={job?.schedule_name || 'N/A'}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-medium h-[60px]  text-gray-900"
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

                
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2  px-0 py-0 rounded">
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
                        : ' text-gray-900'
                    }`}
                    style={{
                      border: '1px solid silver',
                      borderRadius: '7px',
                      fontSize: '1.1rem',
                      fontWeight: 500,
                    }}
                  />
                </div>

                
                <div className="border border-gray-200 rounded-lg p-4">
                  <Box
                    sx={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#2b7fff',
                      marginBottom: '16px',
                    }}
                  >
                    Ingest Settings
                  </Box>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2  px-0 py-0 rounded">
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
                            : ' text-gray-900'
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
                      <label className="block text-sm font-bold text-gray-800 mb-2  px-0 py-0 rounded">
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
                            : ' text-gray-900'
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

                
                <div className="border border-gray-200 rounded-lg p-4">
                  <Box
                    sx={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#2b7fff',
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
                            <span className="text-sm font-bold text-gray-800 block  px-0 py-0 rounded-sm">
                              Source Type
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
                          <span className="text-sm font-bold text-gray-800 block  px-0 py-0 rounded-sm">
                            Configuration
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
                          <span className="text-sm font-bold text-gray-800 block  px-0 py-0 rounded-sm">
                            Status
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getCentralizedStatusColor(job.status || 'in-progress')}`}
                          >
                            <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
                            {job?.status || 'N/A'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <MessageSquare
                          size={18}
                          className="text-gray-400 mt-0.5 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold text-gray-800 block  px-0 py-0 rounded-sm">
                            Comments
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
                          <span className="text-sm font-bold text-gray-800 block  px-0 py-0 rounded-sm">
                            Created
                          </span>
                          <span className="text-sm text-gray-900 block break-words">
                            {formatDateStructured(job.created_at)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Clock
                          size={18}
                          className="text-gray-400 mt-0.5 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold text-gray-800 block  px-0 py-0 rounded-sm">
                            Updated
                          </span>
                          <span className="text-sm text-gray-900 block break-words">
                            {formatDateStructured(job.updated_at)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Hash
                          size={18}
                          className="text-gray-400 mt-0.5 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold text-gray-800 block  px-0 py-0 rounded-sm">
                            Job ID
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono bg-gray-100 text-gray-800 border border-gray-200 break-all">
                            {job.id}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                
                {(() => {
                  const jobType = getJobType(job);
                  const hasConnection = !!job.connection;
                  const shouldShow = jobType === 'pull' && hasConnection;
                  return shouldShow;
                })() && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <Box
                      sx={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: '#2b7fff',
                        marginBottom: '16px',
                      }}
                    >
                      Connection Details ({getConnectionType(job) || 'Unknown'})
                    </Box>

                    {(() => {
                      const connectionType = getConnectionType(job);
                      let connectionObj = job.connection;

                      
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
                          <label className="block text-sm font-bold text-gray-800 mb-2  px-0 py-0 rounded">
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
                            <label className="block text-sm font-bold text-gray-800 mb-2  px-0 py-0 rounded">
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
                          <label className="block text-sm font-bold text-gray-800 mb-2  px-0 py-0 rounded">
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
                          <label className="block text-sm font-bold text-gray-800 mb-2  px-0 py-0 rounded">
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
                          <label className="block text-sm font-bold text-gray-800 mb-2  px-0 py-0 rounded">
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
                          <label className="block text-sm font-bold text-gray-800 mb-2  px-0 py-0 rounded">
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

                    
                    {getConnectionType(job) === 'SFTP' && job.file && (
                      <div className="mt-4 pt-4 border-t border-blue-200">
                        <Box
                          sx={{
                            fontSize: '18px',
                            fontWeight: 'bold',
                            color: '#2b7fff',
                            marginBottom: '16px',
                          }}
                        >
                          File Settings
                        </Box>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-gray-800 mb-2  px-0 py-0 rounded">
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
                            <label className="block text-sm font-bold text-gray-800 mb-2  px-0 py-0 rounded">
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
                            <label className="block text-sm font-bold text-gray-800 mb-2  px-0 py-0 rounded">
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
                  variant="outlined"
                  sx={{ marginRight: '10px' }}
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
                  variant="outlined"
                  sx={{ marginRight: '10px' }}
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
            (job.status === DATA_ENRICHMENT_JOB_STATUSES.IN_PROGRESS ||
              job.status === DATA_ENRICHMENT_JOB_STATUSES.REJECTED) &&
            onSendForApproval && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <MuiButton
                  type="button"
                  variant="outlined"
                  sx={{ marginRight: '10px' }}
                  onClick={onClose}
                  startIcon={<XCircle size={16} />}
                >
                  Cancel
                </MuiButton>
                <MuiButton
                  type="button"
                  variant="contained"
                  sx={{ backgroundColor: '#2b7fff' }}
                  onClick={() => { setShowApprovalConfirmDialog(true); }}
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
            job.status === DATA_ENRICHMENT_JOB_STATUSES.UNDER_REVIEW && (
              <>
                <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                  <div>
                    <MuiButton
                      type="button"
                      variant="outlined"
                      sx={{ marginRight: '10px' }}
                      onClick={onClose}
                      startIcon={<XCircle size={16} />}
                    >
                      Close
                    </MuiButton>
                  </div>
                  <div className="flex space-x-3">
                    {onReject && (
                      <MuiButton
                        type="button"
                        variant="contained"
                        sx={{ marginRight: '10px', backgroundColor: '#ff474d' }}
                        onClick={() => { setShowRejectionDialog(true); }}
                        startIcon={<XCircle size={16} />}
                      >
                        Reject
                      </MuiButton>
                    )}
                    {onApprove && (
                      <MuiButton
                        type="button"
                        variant="contained"
                        sx={{ backgroundColor: '#33ad74' }}
                        onClick={() => { setShowApproveConfirmDialog(true); }}
                        startIcon={<Check size={16} />}
                      >
                        Approve
                      </MuiButton>
                    )}
                  </div>
                </div>
              </>
            )}
          {job &&
            !isLoading &&
            !editMode &&
            !cloneMode &&
            onExport &&
            userIsExporter &&
            job.status === DATA_ENRICHMENT_JOB_STATUSES.APPROVED && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 ">
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
                  onClick={() => { setShowExportConfirmDialog(true); }}
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
              (job.status === DATA_ENRICHMENT_JOB_STATUSES.IN_PROGRESS ||
                job.status === DATA_ENRICHMENT_JOB_STATUSES.REJECTED) &&
              onSendForApproval
            ) &&
            !(
              userIsApprover &&
              (onApprove || onReject) &&
              job.status === DATA_ENRICHMENT_JOB_STATUSES.UNDER_REVIEW
            ) &&
            !(
              onExport &&
              userIsExporter &&
              job.status === DATA_ENRICHMENT_JOB_STATUSES.APPROVED
            ) && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 ">
                <MuiButton type="button" variant="outlined" onClick={onClose}>
                  Cancel
                </MuiButton>
              </div>
            )}
        </div>
      </Backdrop>

      
      <Dialog
        open={showExportConfirmDialog}
        onClose={() => { setShowExportConfirmDialog(false); }}
        aria-labelledby="export-confirmation-dialog-title"
        aria-describedby="export-confirmation-dialog-description"
        sx={{
          '& .MuiPaper-root': {
            borderRadius: '12px',
            minWidth: 400,
          },
        }}
      >
        <Box
          sx={{
            color: '#3B3B3B',
            fontSize: '20px',
            fontWeight: 'bold',
            padding: '16px 20px',
            borderBottom: '1px solid #CECECE',
          }}
        >
          Export Confirmation Required!
        </Box>
        <DialogContent sx={{ padding: '20px 20px' }}>
          <DialogContentText
            id="export-confirmation-dialog-description"
            sx={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: '#374151',
              marginBottom: '16px',
            }}
          >
            Are you sure you want to export{' '}
            <Box
              component="span"
              sx={{
                fontWeight: 'bold',
                color: '#2B7FFF',
                backgroundColor: '#F0F7FF',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '15px',
              }}
            >
              "{job?.endpoint_name || 'this job'}"
            </Box>
            ?
          </DialogContentText>
          <Box
            sx={{
              backgroundColor: '#DCEEFF',
              border: '1px solid #DCEEFF',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
            }}
          >
            <DialogContentText
              sx={{
                fontSize: '16px',
                color: '#2B7FFF',
                margin: 0,
                fontWeight: '500',
              }}
            >
              ⚠️ Important: This will update the job status to EXPORTED.
            </DialogContentText>
          </Box>
        </DialogContent>
        <DialogActions sx={{ padding: '12px 20px 16px 20px' }}>
          <MuiButton
            onClick={() => { setShowExportConfirmDialog(false); }}
            variant="outlined"
            color="inherit"
            size="small"
            className="!pb-[6px] !pt-[5px]"
          >
            Cancel
          </MuiButton>
          <MuiButton
            onClick={handleExportConfirm}
            variant="contained"
            color="primary"
            size="small"
            sx={{ backgroundColor: '#2B7FFF' }}
            className="!pb-[6px] !pt-[5px]"
            autoFocus
            disabled={isSaving}
            startIcon={
              isSaving ? (
                <span className="w-4 h-4 flex items-center justify-center">
                  <svg
                    className="animate-spin"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="#fff"
                      strokeWidth="4"
                      fill="none"
                      opacity="0.2"
                    />
                    <path
                      d="M22 12a10 10 0 0 1-10 10"
                      stroke="#fff"
                      strokeWidth="4"
                      fill="none"
                    />
                  </svg>
                </span>
              ) : undefined
            }
          >
            {isSaving ? 'Exporting...' : 'Yes, Export Job'}
          </MuiButton>
        </DialogActions>
      </Dialog>

      
      <JobRejectionDialog
        isOpen={showRejectionDialog}
        onClose={() => { setShowRejectionDialog(false); }}
        onConfirm={handleRejectionConfirm}
        jobName={job?.endpoint_name || job?.id || 'Unknown Job'}
        jobType="Data Enrichment Job"
      />

      
      <Dialog
        open={showApprovalConfirmDialog}
        onClose={() => { setShowApprovalConfirmDialog(false); }}
        aria-labelledby="approval-confirmation-dialog-title"
        aria-describedby="approval-confirmation-dialog-description"
        sx={{
          '& .MuiPaper-root': {
            borderRadius: '12px',
            minWidth: 400,
          },
        }}
      >
        <Box
          sx={{
            color: '#3B3B3B',
            fontSize: '20px',
            fontWeight: 'bold',
            padding: '16px 20px',
            borderBottom: '1px solid #CECECE',
          }}
        >
          Export Confirmation Required!
        </Box>
        <DialogContent sx={{ padding: '20px 20px' }}>
          <DialogContentText
            id="approval-confirmation-dialog-description"
            sx={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: '#374151',
              marginBottom: '16px',
            }}
          >
            Are you sure you want to send{' '}
            <Box
              component="span"
              sx={{
                fontWeight: 'bold',
                color: '#2B7FFF',
                backgroundColor: '#F0F7FF',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '15px',
              }}
            >
              "{job?.endpoint_name || 'this job'}"
            </Box>{' '}
            for approval?
          </DialogContentText>
          <Box
            sx={{
              backgroundColor: '#DCEEFF',
              border: '1px solid #DCEEFF',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
            }}
          >
            <DialogContentText
              sx={{
                fontSize: '16px',
                color: '#2B7FFF',
                margin: 0,
                fontWeight: '500',
              }}
            >
              ⚠️ Important: Once sent, the job will be reviewed by an approver
              and you won't be able to make changes until it's either approved
              or rejected.
            </DialogContentText>
          </Box>
        </DialogContent>
        <DialogActions sx={{ padding: '12px 20px 16px 20px' }}>
          <MuiButton
            onClick={() => { setShowApprovalConfirmDialog(false); }}
            variant="outlined"
            color="inherit"
            size="small"
            className="!pb-[6px] !pt-[5px]"
          >
            Cancel
          </MuiButton>
          <MuiButton
            onClick={handleSendForApprovalConfirm}
            variant="contained"
            color="primary"
            size="small"
            sx={{ backgroundColor: '#2B7FFF' }}
            className="!pb-[6px] !pt-[5px]"
            autoFocus
          >
            Yes, Send for Approval
          </MuiButton>
        </DialogActions>
      </Dialog>

      
      <Dialog
        open={showApproveConfirmDialog}
        onClose={() => { setShowApproveConfirmDialog(false); }}
        aria-labelledby="approve-confirmation-dialog-title"
        aria-describedby="approve-confirmation-dialog-description"
        sx={{
          '& .MuiPaper-root': {
            borderRadius: '12px',
            minWidth: 400,
          },
        }}
      >
        <Box
          sx={{
            color: '#3B3B3B',
            fontSize: '20px',
            fontWeight: 'bold',
            padding: '16px 20px',
            borderBottom: '1px solid #CECECE',
          }}
        >
          Approval Confirmation Required!
        </Box>
        <DialogContent sx={{ padding: '20px 20px' }}>
          <DialogContentText
            id="approve-confirmation-dialog-description"
            sx={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: '#374151',
              marginBottom: '16px',
            }}
          >
            Are you sure you want to approve{' '}
            <Box
              component="span"
              sx={{
                fontWeight: 'bold',
                color: '#2B7FFF',
                backgroundColor: '#DCEEFF',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '15px',
              }}
            >
              "{job?.endpoint_name || 'this job'}"
            </Box>
            ?
          </DialogContentText>
          <Box
            sx={{
              backgroundColor: '#DCEEFF',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
            }}
          >
            <DialogContentText
              sx={{
                fontSize: '16px',
                color: '#2B7FFF',
                margin: 0,
                fontWeight: '500',
              }}
            >
              ⚠️ Once approved, this job will be sent to the exporter for
              further processing.
            </DialogContentText>
          </Box>
          <Box sx={{ mt: 2 }}>
            <label
              htmlFor="approve-comment"
              style={{
                fontWeight: 500,
                color: '#374151',
                display: 'block',
                marginBottom: 4,
              }}
            >
              Comment (optional)
            </label>
            <textarea
              id="approve-comment"
              value={approveComment}
              onChange={(e) => { setApproveComment(e.target.value); }}
              rows={3}
              style={{
                width: '100%',
                borderRadius: 6,
                border: '1px solid #d1d5db',
                padding: 8,
                fontSize: 15,
                resize: 'vertical',
              }}
              placeholder="Add a comment (optional)"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ padding: '12px 20px 16px 20px' }}>
          <MuiButton
            onClick={() => { setShowApproveConfirmDialog(false); }}
            variant="outlined"
            color="inherit"
            size="small"
            className="!pb-[6px] !pt-[5px]"
          >
            Cancel
          </MuiButton>
          <MuiButton
            onClick={handleApproveWithComment}
            variant="contained"
            color="success"
            size="small"
            sx={{ backgroundColor: '#2B7FFF' }}
            className="!pb-[6px] !pt-[5px]"
            autoFocus
            disabled={isSaving}
            startIcon={
              isSaving ? (
                <span className="w-4 h-4 flex items-center justify-center">
                  <svg
                    className="animate-spin"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="#fff"
                      strokeWidth="4"
                      fill="none"
                      opacity="0.2"
                    />
                    <path
                      d="M22 12a10 10 0 0 1-10 10"
                      stroke="#fff"
                      strokeWidth="4"
                      fill="none"
                    />
                  </svg>
                </span>
              ) : undefined
            }
          >
            {isSaving ? 'Approving...' : 'Yes, Approve Job'}
          </MuiButton>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default JobDetailsModal;
