import React from 'react';
import { X, Calendar, Clock, Database, Globe, Settings } from 'lucide-react';
import type { DataEnrichmentJobResponse, JobStatus } from '../types';

interface JobDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: DataEnrichmentJobResponse | null;
  isLoading?: boolean;
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
}) => {
  if (!isOpen) return null;

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

  const getStatusColor = (status: JobStatus | null | undefined) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'in-progress':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'approved':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusDisplay = (status: JobStatus | null | undefined) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'PENDING';
      case 'in-progress':
        return 'INPROGRESS';
      case 'rejected':
        return 'REJECTED';
      case 'approved':
        return 'APPROVED';
      default:
        return status?.toUpperCase() || 'N/A';
    }
  };

  const getConfigTypeColor = (type: string | undefined) => {
    return type?.toLowerCase() === 'push'
      ? 'bg-blue-100 text-blue-800 border-blue-200'
      : 'bg-purple-100 text-purple-800 border-purple-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Enhanced blurred background overlay without black background */}
      <div
        className="fixed inset-0 backdrop-blur-sm backdrop-saturate-150 transition-opacity"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="bg-white rounded-lg shadow-2xl relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            View Data Enrichment Endpoint: {job?.endpoint_name || 'Loading...'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <X size={24} />
          </button>
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
                  <label className="flex items-center cursor-not-allowed">
                    <input
                      type="radio"
                      name="configType"
                      checked={getJobType(job) === 'pull'}
                      readOnly
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
                      checked={job.type?.toLowerCase() === 'push'}
                      readOnly
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      ↑ Push (REST API)
                    </span>
                  </label>
                </div>
                {job.type?.toLowerCase() === 'push' && (
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
                    value={job.endpoint_name || 'N/A'}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
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
                      value={job.source_type || 'N/A'}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Version
                  </label>
                  <input
                    type="text"
                    value={job.version || 'v1'}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
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
                  value={job.description || 'No description provided'}
                  readOnly
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 resize-none"
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
                      value={job.mode?.toLowerCase() || 'append'}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                    >
                      <option value="append">Append - Add new records to existing data</option>
                      <option value="replace">Replace - Replace all existing data</option>
                      <option value="update">Update - Update existing records</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      {job.mode === 'append' && 'Append mode adds new records to the existing dataset.'}
                      {job.mode === 'replace' && 'Replace mode replaces all existing data with new data.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Target Collection
                    </label>
                    <input
                      type="text"
                      value={job.table_name}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
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
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(job.status)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${job.status?.toLowerCase() === 'approved' ? 'bg-green-500' : job.status?.toLowerCase() === 'rejected' ? 'bg-red-500' : job.status?.toLowerCase() === 'in-progress' ? 'bg-gray-500' : 'bg-blue-500'}`}></span>
                          {getStatusDisplay(job.status)}
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
      </div>
    </div>
  );
};

export default JobDetailsModal;
